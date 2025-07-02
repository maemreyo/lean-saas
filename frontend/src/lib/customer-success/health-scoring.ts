// Customer Health Score Calculation and Churn Prediction

import { createClient } from '@/lib/supabase/client'
import { 
  CustomerHealth, 
  CustomerHealthInsert, 
  CustomerHealthUpdate,
  HealthStatus,
  HealthScoreComponents,
  HealthCalculationData,
  ChurnRiskAssessment,
  CalculateHealthScoreRequest,
  UpdateHealthScoreRequest,
  HealthScoreResponse
} from '@/shared/types/customer-success'
import { 
  createCustomerHealthSchema,
  updateCustomerHealthSchema,
  calculateHealthScoreRequestSchema,
  healthScoreComponentsSchema
} from '@/shared/schemas/customer-success'

// ================================================
// HEALTH SCORING CONFIGURATION
// ================================================

export const DEFAULT_SCORE_WEIGHTS: HealthScoreComponents = {
  usage_score: 30,      // 30% - How actively they use the platform
  engagement_score: 25, // 25% - Feature adoption and exploration
  satisfaction_score: 20, // 20% - NPS, CSAT, feedback ratings
  support_score: 15,    // 15% - Support interaction quality
  billing_score: 10     // 10% - Payment and billing health
}

export const HEALTH_SCORE_THRESHOLDS = {
  healthy: { min: 80, max: 100 },
  at_risk: { min: 60, max: 79 },
  critical: { min: 40, max: 59 },
  churned: { min: 0, max: 39 }
}

export const CHURN_RISK_FACTORS = {
  // Usage-based factors
  declining_login_frequency: { weight: 0.15, threshold: -50 }, // 50% decline
  low_session_duration: { weight: 0.10, threshold: 5 }, // < 5 minutes average
  feature_abandonment: { weight: 0.12, threshold: -30 }, // 30% decline in feature usage
  
  // Engagement factors
  low_feature_adoption: { weight: 0.08, threshold: 20 }, // < 20% adoption rate
  no_recent_activity: { weight: 0.15, threshold: 7 }, // No activity for 7+ days
  
  // Support factors
  high_ticket_count: { weight: 0.10, threshold: 3 }, // 3+ tickets in 30 days
  unresolved_critical_issues: { weight: 0.12, threshold: 1 },
  poor_support_satisfaction: { weight: 0.08, threshold: 3 }, // < 3/5 rating
  
  // Satisfaction factors
  negative_feedback: { weight: 0.15, threshold: -0.3 }, // Negative sentiment
  low_nps_score: { weight: 0.10, threshold: 6 }, // NPS ≤ 6 (detractor)
  declining_satisfaction: { weight: 0.08, threshold: -20 }, // 20% decline
  
  // Billing factors
  payment_issues: { weight: 0.12, threshold: 1 },
  underutilization: { weight: 0.05, threshold: 50 }, // Using < 50% of plan
  
  // Behavioral factors
  feature_exploration_decline: { weight: 0.08, threshold: -40 },
  reduced_collaboration: { weight: 0.06, threshold: -30 }
}

// ================================================
// CORE HEALTH SCORING FUNCTIONS
// ================================================

/**
 * Calculate comprehensive health score for a user
 */
export async function calculateHealthScore(request: CalculateHealthScoreRequest): Promise<{
  success: boolean
  data?: CustomerHealth
  error?: string
}> {
  try {
    // Validate request
    const validation = calculateHealthScoreRequestSchema.safeParse(request)
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const { 
      user_id, 
      organization_id, 
      calculation_method = 'standard',
      custom_weights 
    } = validation.data

    const supabase = createClient()

    // Gather user data for health calculation
    const calculationData = await gatherHealthCalculationData(user_id, organization_id)
    
    // Calculate component scores
    const weights = custom_weights || DEFAULT_SCORE_WEIGHTS
    const components = await calculateScoreComponents(calculationData, weights)
    
    // Calculate overall health score
    const healthScore = Math.round(
      (components.usage_score * weights.usage_score / 100) +
      (components.engagement_score * weights.engagement_score / 100) +
      (components.satisfaction_score * weights.satisfaction_score / 100) +
      (components.support_score * weights.support_score / 100) +
      (components.billing_score * weights.billing_score / 100)
    )

    // Determine health status
    const healthStatus = determineHealthStatus(healthScore)
    
    // Calculate churn risk
    const churnRisk = await calculateChurnRisk(calculationData, components, healthScore)
    
    // Get previous health score for trend analysis
    const { data: previousHealth } = await supabase
      .from('customer_health')
      .select('health_score')
      .eq('user_id', user_id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single()

    const previousScore = previousHealth?.health_score
    const scoreTrend = previousScore 
      ? (healthScore > previousScore ? 'improving' : 
         healthScore < previousScore ? 'declining' : 'stable')
      : 'stable'

    // Create or update health record
    const healthData: CustomerHealthInsert = {
      user_id,
      organization_id,
      health_score: healthScore,
      health_status: healthStatus,
      previous_score: previousScore,
      score_trend: scoreTrend,
      usage_score: components.usage_score,
      engagement_score: components.engagement_score,
      satisfaction_score: components.satisfaction_score,
      support_score: components.support_score,
      billing_score: components.billing_score,
      churn_risk_score: churnRisk.risk_score,
      churn_probability_percentage: churnRisk.probability_percentage,
      days_to_predicted_churn: churnRisk.days_to_predicted_churn,
      login_frequency: calculationData.login_frequency,
      feature_adoption_rate: calculationData.feature_adoption_rate,
      support_ticket_count: calculationData.support_tickets_count,
      nps_score: calculationData.nps_score,
      intervention_required: churnRisk.probability_percentage > 70,
      intervention_type: churnRisk.recommended_interventions[0],
      calculated_at: new Date().toISOString(),
      data_sources: {
        calculation_method,
        weights_used: weights,
        data_points: Object.keys(calculationData).length,
        confidence: churnRisk.confidence_level
      },
      calculation_method
    }

    const { data, error } = await supabase
      .from('customer_health')
      .insert(healthData)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`
      }
    }

    return {
      success: true,
      data
    }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get current health score and assessment for a user
 */
export async function getHealthScore(
  userId: string,
  organizationId?: string,
  includeHistory = false
): Promise<HealthScoreResponse | null> {
  try {
    const supabase = createClient()

    let query = supabase
      .from('customer_health')
      .select('*')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(1)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data: healthData, error } = await query.single()

    if (error || !healthData) {
      return null
    }

    // Build score breakdown
    const scoreBreakdown: HealthScoreComponents = {
      usage_score: healthData.usage_score,
      engagement_score: healthData.engagement_score,
      satisfaction_score: healthData.satisfaction_score,
      support_score: healthData.support_score,
      billing_score: healthData.billing_score
    }

    // Build risk assessment
    const riskAssessment: ChurnRiskAssessment = {
      risk_score: healthData.churn_risk_score,
      probability_percentage: healthData.churn_probability_percentage,
      days_to_predicted_churn: healthData.days_to_predicted_churn,
      risk_factors: await identifyRiskFactors(userId),
      recommended_interventions: await getRecommendedInterventions(healthData),
      confidence_level: healthData.data_sources?.confidence || 0.8
    }

    // Get historical scores if requested
    let historicalScores: Array<{ date: string; score: number; status: HealthStatus }> = []
    
    if (includeHistory) {
      const { data: history } = await supabase
        .from('customer_health')
        .select('calculated_at, health_score, health_status')
        .eq('user_id', userId)
        .order('calculated_at', { ascending: false })
        .limit(30) // Last 30 calculations

      if (history) {
        historicalScores = history.map(h => ({
          date: h.calculated_at,
          score: h.health_score,
          status: h.health_status as HealthStatus
        }))
      }
    }

    return {
      customer_health: healthData,
      score_breakdown: scoreBreakdown,
      risk_assessment: riskAssessment,
      recommendations: riskAssessment.recommended_interventions,
      historical_scores: historicalScores
    }
  } catch (error) {
    console.error('Error getting health score:', error)
    return null
  }
}

/**
 * Get health analytics for organization
 */
export async function getHealthAnalytics(
  organizationId?: string,
  timeRange = '30d'
): Promise<{
  health_distribution: Record<HealthStatus, number>
  average_health_score: number
  churn_risk_distribution: Record<string, number>
  trending_users: Array<{ user_id: string; trend: string; score_change: number }>
  intervention_required_count: number
  total_users: number
}> {
  try {
    const supabase = createClient()
    
    // Get latest health scores for all users
    let query = supabase
      .from('customer_health')
      .select('*')
      .order('calculated_at', { ascending: false })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    // Calculate date range
    const daysBack = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    query = query.gte('calculated_at', startDate.toISOString())

    const { data, error } = await query

    if (error || !data) {
      throw new Error(`Failed to fetch health analytics: ${error?.message}`)
    }

    // Get latest score per user
    const latestScores = data.reduce((acc, health) => {
      if (!acc[health.user_id] || health.calculated_at > acc[health.user_id].calculated_at) {
        acc[health.user_id] = health
      }
      return acc
    }, {} as Record<string, CustomerHealth>)

    const healthScores = Object.values(latestScores)
    const totalUsers = healthScores.length

    // Health distribution
    const healthDistribution = healthScores.reduce((acc, health) => {
      acc[health.health_status] = (acc[health.health_status] || 0) + 1
      return acc
    }, {} as Record<HealthStatus, number>)

    // Average health score
    const averageHealthScore = totalUsers > 0
      ? Math.round(healthScores.reduce((sum, h) => sum + h.health_score, 0) / totalUsers)
      : 0

    // Churn risk distribution
    const churnRiskDistribution = {
      low: healthScores.filter(h => h.churn_probability_percentage < 30).length,
      medium: healthScores.filter(h => h.churn_probability_percentage >= 30 && h.churn_probability_percentage < 70).length,
      high: healthScores.filter(h => h.churn_probability_percentage >= 70).length
    }

    // Trending users (significant score changes)
    const trendingUsers = healthScores
      .filter(h => h.previous_score !== null && h.previous_score !== undefined)
      .map(h => ({
        user_id: h.user_id,
        trend: h.score_trend || 'stable',
        score_change: h.health_score - (h.previous_score || 0)
      }))
      .filter(u => Math.abs(u.score_change) >= 10) // Significant changes only
      .sort((a, b) => Math.abs(b.score_change) - Math.abs(a.score_change))
      .slice(0, 10)

    // Intervention required count
    const interventionRequiredCount = healthScores.filter(h => h.intervention_required).length

    return {
      health_distribution: healthDistribution,
      average_health_score: averageHealthScore,
      churn_risk_distribution: churnRiskDistribution,
      trending_users: trendingUsers,
      intervention_required_count: interventionRequiredCount,
      total_users: totalUsers
    }
  } catch (error) {
    console.error('Error calculating health analytics:', error)
    return {
      health_distribution: {} as Record<HealthStatus, number>,
      average_health_score: 0,
      churn_risk_distribution: { low: 0, medium: 0, high: 0 },
      trending_users: [],
      intervention_required_count: 0,
      total_users: 0
    }
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Gather all data needed for health score calculation
 */
async function gatherHealthCalculationData(
  userId: string,
  organizationId?: string
): Promise<HealthCalculationData> {
  const supabase = createClient()
  
  // Get user sessions data (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    { data: sessions },
    { data: feedback },
    { data: tickets },
    { data: adoption },
    { data: billing }
  ] = await Promise.all([
    // User sessions
    supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('started_at', thirtyDaysAgo.toISOString()),
    
    // User feedback
    supabase
      .from('user_feedback')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString()),
    
    // Support tickets
    supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString()),
    
    // Feature adoption
    supabase
      .from('feature_adoption')
      .select('*')
      .eq('user_id', userId),
    
    // Billing info (if available)
    supabase
      .from('usage_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
  ])

  // Calculate metrics
  const loginFrequency = sessions?.length || 0 / 30 // Logins per day
  const avgSessionDuration = sessions?.length 
    ? sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length
    : 0

  const featureAdoptionRate = adoption?.length 
    ? adoption.filter(a => a.adoption_status === 'active' || a.adoption_status === 'power_user').length / adoption.length
    : 0

  const supportTicketsCount = tickets?.length || 0
  const paymentIssuesCount = 0 // Would get from billing system

  const npsScore = feedback?.find(f => f.nps_score !== null)?.nps_score
  const csatAverage = feedback?.filter(f => f.csat_score !== null)
    .reduce((sum, f, _, arr) => sum + f.csat_score! / arr.length, 0) || null

  const daysSinceLastLogin = sessions?.length ? 0 : 30 // Simplified
  const usageVsPlanRatio = 0.7 // Would calculate from actual usage vs plan limits

  return {
    login_frequency: loginFrequency,
    feature_adoption_rate: featureAdoptionRate,
    session_duration_avg: avgSessionDuration,
    support_tickets_count: supportTicketsCount,
    payment_issues_count: paymentIssuesCount,
    nps_score: npsScore,
    csat_average: csatAverage,
    days_since_last_login: daysSinceLastLogin,
    usage_vs_plan_ratio: usageVsPlanRatio
  }
}

/**
 * Calculate individual score components
 */
async function calculateScoreComponents(
  data: HealthCalculationData,
  weights: HealthScoreComponents
): Promise<HealthScoreComponents> {
  // Usage Score (0-100)
  let usageScore = 0
  usageScore += Math.min(data.login_frequency * 10, 40) // Up to 40 points for login frequency
  usageScore += Math.min(data.session_duration_avg / 60, 30) // Up to 30 points for session duration
  usageScore += Math.min(data.usage_vs_plan_ratio * 30, 30) // Up to 30 points for plan utilization

  // Engagement Score (0-100)
  let engagementScore = 0
  engagementScore += data.feature_adoption_rate * 60 // Up to 60 points for feature adoption
  engagementScore += Math.max(0, 40 - data.days_since_last_login * 2) // Up to 40 points for recency

  // Satisfaction Score (0-100)
  let satisfactionScore = 50 // Start neutral
  if (data.nps_score !== null && data.nps_score !== undefined) {
    satisfactionScore += (data.nps_score - 5) * 8 // -40 to +40 based on NPS
  }
  if (data.csat_average !== null && data.csat_average !== undefined) {
    satisfactionScore += (data.csat_average - 3) * 10 // -20 to +20 based on CSAT
  }

  // Support Score (0-100)
  let supportScore = 100 // Start perfect
  supportScore -= data.support_tickets_count * 15 // Deduct for tickets
  supportScore = Math.max(0, supportScore)

  // Billing Score (0-100)
  let billingScore = 100 // Start perfect
  billingScore -= data.payment_issues_count * 25 // Deduct for payment issues
  billingScore = Math.max(0, billingScore)

  return {
    usage_score: Math.min(100, Math.max(0, usageScore)),
    engagement_score: Math.min(100, Math.max(0, engagementScore)),
    satisfaction_score: Math.min(100, Math.max(0, satisfactionScore)),
    support_score: Math.min(100, Math.max(0, supportScore)),
    billing_score: Math.min(100, Math.max(0, billingScore))
  }
}

/**
 * Calculate churn risk assessment
 */
async function calculateChurnRisk(
  data: HealthCalculationData,
  components: HealthScoreComponents,
  healthScore: number
): Promise<ChurnRiskAssessment> {
  let riskScore = 0
  const riskFactors: string[] = []
  const interventions: string[] = []

  // Analyze each risk factor
  if (data.login_frequency < 0.5) {
    riskScore += 0.15
    riskFactors.push('Low login frequency')
    interventions.push('Send engagement email campaign')
  }

  if (data.feature_adoption_rate < 0.3) {
    riskScore += 0.12
    riskFactors.push('Low feature adoption')
    interventions.push('Offer personalized feature tour')
  }

  if (data.support_tickets_count > 2) {
    riskScore += 0.10
    riskFactors.push('High support ticket volume')
    interventions.push('Priority support outreach')
  }

  if (data.nps_score !== null && data.nps_score <= 6) {
    riskScore += 0.15
    riskFactors.push('Low NPS score (detractor)')
    interventions.push('Schedule customer success call')
  }

  if (data.payment_issues_count > 0) {
    riskScore += 0.12
    riskFactors.push('Payment issues')
    interventions.push('Billing support contact')
  }

  if (data.days_since_last_login > 7) {
    riskScore += 0.20
    riskFactors.push('No recent activity')
    interventions.push('Re-engagement campaign')
  }

  // Cap risk score at 1.0
  riskScore = Math.min(1.0, riskScore)
  
  const probabilityPercentage = Math.round(riskScore * 100)
  
  // Estimate days to churn based on risk score
  let daysToChurn: number | undefined
  if (riskScore > 0.7) {
    daysToChurn = 30 // High risk - likely to churn soon
  } else if (riskScore > 0.4) {
    daysToChurn = 90 // Medium risk
  } else if (riskScore > 0.2) {
    daysToChurn = 180 // Low-medium risk
  }

  // Confidence level based on data completeness
  const dataCompleteness = [
    data.login_frequency,
    data.feature_adoption_rate,
    data.nps_score !== null ? 1 : 0,
    data.support_tickets_count,
    data.usage_vs_plan_ratio
  ].filter(Boolean).length / 5

  const confidenceLevel = dataCompleteness * 0.8 + 0.2 // 0.2 to 1.0

  return {
    risk_score: Math.round(riskScore * 100) / 100,
    probability_percentage: probabilityPercentage,
    days_to_predicted_churn: daysToChurn,
    risk_factors: riskFactors,
    recommended_interventions: interventions.slice(0, 3), // Top 3 interventions
    confidence_level: Math.round(confidenceLevel * 100) / 100
  }
}

/**
 * Determine health status from score
 */
function determineHealthStatus(healthScore: number): HealthStatus {
  if (healthScore >= HEALTH_SCORE_THRESHOLDS.healthy.min) return 'healthy'
  if (healthScore >= HEALTH_SCORE_THRESHOLDS.at_risk.min) return 'at_risk'
  if (healthScore >= HEALTH_SCORE_THRESHOLDS.critical.min) return 'critical'
  return 'churned'
}

/**
 * Identify specific risk factors for a user
 */
async function identifyRiskFactors(userId: string): Promise<string[]> {
  // This would analyze user data against risk factor thresholds
  // For now, return a placeholder
  return ['Low recent activity', 'Declining feature usage']
}

/**
 * Get recommended interventions based on health data
 */
async function getRecommendedInterventions(health: CustomerHealth): Promise<string[]> {
  const interventions: string[] = []

  if (health.usage_score < 50) {
    interventions.push('Send re-engagement email with tips')
  }

  if (health.engagement_score < 50) {
    interventions.push('Offer personalized product tour')
  }

  if (health.satisfaction_score < 50) {
    interventions.push('Schedule customer feedback call')
  }

  if (health.support_score < 50) {
    interventions.push('Priority support assignment')
  }

  if (health.billing_score < 50) {
    interventions.push('Billing team outreach')
  }

  return interventions.slice(0, 3) // Top 3 interventions
}