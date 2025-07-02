import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { customerSuccessSchemas } from '@/shared/schemas/customer-success'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const organizationId = searchParams.get('organization_id')
    const includeBreakdown = searchParams.get('include_breakdown')
    const includeHistory = searchParams.get('include_history')

    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Build query for customer health
    let query = supabase
      .from('customer_health')
      .select('*')

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      // Default to current user if no user_id specified
      query = query.eq('user_id', user.id)
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    // Order by most recent
    query = query.order('updated_at', { ascending: false })

    const { data: healthData, error } = await query

    if (error) {
      console.error('Error fetching health scores:', error)
      return NextResponse.json(
        { error: 'Failed to fetch health scores' }, 
        { status: 500 }
      )
    }

    // Get current health record or create if doesn't exist
    let currentHealth = healthData?.[0]
    if (!currentHealth) {
      currentHealth = await createInitialHealthRecord(user.id, organizationId, supabase)
    }

    const response: any = {
      success: true,
      data: currentHealth
    }

    // Include detailed breakdown if requested
    if (includeBreakdown === 'true') {
      response.breakdown = await calculateHealthBreakdown(currentHealth, user.id, supabase)
    }

    // Include historical data if requested
    if (includeHistory === 'true') {
      response.history = await getHealthHistory(user.id, organizationId, supabase)
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Health score API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request body
    const validation = customerSuccessSchemas.calculateHealthScoreRequest.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        }, 
        { status: 400 }
      )
    }

    const { user_id, organization_id, force_recalculate, custom_weights } = validation.data
    const targetUserId = user_id || user.id
    const supabase = createClient()

    // Calculate health score
    const healthScore = await calculateHealthScore(
      targetUserId, 
      organization_id, 
      custom_weights,
      supabase
    )

    if (!healthScore) {
      return NextResponse.json(
        { error: 'Failed to calculate health score' }, 
        { status: 500 }
      )
    }

    // Update or create health record
    const { data: updatedHealth, error } = await supabase
      .from('customer_health')
      .upsert({
        user_id: targetUserId,
        organization_id,
        ...healthScore,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating health score:', error)
      return NextResponse.json(
        { error: 'Failed to update health score' }, 
        { status: 500 }
      )
    }

    // Log calculation event
    await logHealthCalculationEvent(targetUserId, healthScore, supabase)

    return NextResponse.json({
      success: true,
      data: updatedHealth,
      calculation: healthScore.calculation_details,
      message: 'Health score calculated successfully'
    })

  } catch (error) {
    console.error('Health score calculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to create initial health record
async function createInitialHealthRecord(userId: string, organizationId: string | null, supabase: any) {
  try {
    const healthScore = await calculateHealthScore(userId, organizationId, null, supabase)
    
    if (!healthScore) {
      // Return default health record
      return {
        user_id: userId,
        organization_id: organizationId,
        health_score: 50,
        engagement_score: 50,
        satisfaction_score: 50,
        churn_risk: 0.5,
        status: 'at_risk',
        last_activity_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }

    const { data: newHealth } = await supabase
      .from('customer_health')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        ...healthScore,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    return newHealth
  } catch (error) {
    console.error('Error creating initial health record:', error)
    return null
  }
}

// Helper function to calculate health score
async function calculateHealthScore(
  userId: string, 
  organizationId: string | null, 
  customWeights: any,
  supabase: any
) {
  try {
    // Default weights for health score calculation
    const weights = {
      engagement: customWeights?.engagement || 0.3,
      satisfaction: customWeights?.satisfaction || 0.25,
      support_usage: customWeights?.support_usage || 0.15,
      feature_adoption: customWeights?.feature_adoption || 0.2,
      billing_health: customWeights?.billing_health || 0.1
    }

    // Gather data for calculation
    const data = await gatherHealthData(userId, organizationId, supabase)

    // Calculate individual component scores
    const engagementScore = calculateEngagementScore(data.engagement)
    const satisfactionScore = calculateSatisfactionScore(data.satisfaction)
    const supportScore = calculateSupportScore(data.support)
    const adoptionScore = calculateAdoptionScore(data.adoption)
    const billingScore = calculateBillingScore(data.billing)

    // Calculate weighted health score
    const healthScore = Math.round(
      engagementScore * weights.engagement +
      satisfactionScore * weights.satisfaction +
      supportScore * weights.support_usage +
      adoptionScore * weights.feature_adoption +
      billingScore * weights.billing_health
    )

    // Calculate churn risk based on health score and other factors
    const churnRisk = calculateChurnRisk(healthScore, data)

    // Determine health status
    const status = getHealthStatus(healthScore, churnRisk)

    return {
      health_score: Math.max(0, Math.min(100, healthScore)),
      engagement_score: engagementScore,
      satisfaction_score: satisfactionScore,
      churn_risk: Math.max(0, Math.min(1, churnRisk)),
      status,
      last_activity_date: data.engagement.last_activity || new Date().toISOString(),
      calculation_details: {
        components: {
          engagement: engagementScore,
          satisfaction: satisfactionScore,
          support: supportScore,
          adoption: adoptionScore,
          billing: billingScore
        },
        weights,
        data_points: Object.keys(data).length,
        calculated_at: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('Error calculating health score:', error)
    return null
  }
}

// Helper function to gather health calculation data
async function gatherHealthData(userId: string, organizationId: string | null, supabase: any) {
  const data: any = {
    engagement: {},
    satisfaction: {},
    support: {},
    adoption: {},
    billing: {}
  }

  try {
    // Get user sessions for engagement metrics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('created_at, session_data')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)

    data.engagement = {
      session_count: sessions?.length || 0,
      last_activity: sessions?.[0]?.created_at,
      activity_days: calculateActivityDays(sessions || [])
    }

    // Get feedback for satisfaction metrics
    const { data: feedback } = await supabase
      .from('user_feedback')
      .select('rating, feedback_type, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)

    data.satisfaction = {
      average_rating: calculateAverageRating(feedback || []),
      feedback_count: feedback?.length || 0,
      recent_nps: getRecentNPS(feedback || [])
    }

    // Get support metrics
    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('status, priority, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)

    data.support = {
      ticket_count: tickets?.length || 0,
      open_tickets: tickets?.filter(t => ['open', 'in_progress'].includes(t.status)).length || 0,
      high_priority_tickets: tickets?.filter(t => ['high', 'urgent', 'critical'].includes(t.priority)).length || 0
    }

    // Get feature adoption metrics
    const { data: adoption } = await supabase
      .from('feature_adoption')
      .select('adoption_status, adoption_score, usage_count')
      .eq('user_id', userId)

    data.adoption = {
      active_features: adoption?.filter(a => a.adoption_status === 'active').length || 0,
      average_adoption_score: calculateAverageAdoptionScore(adoption || []),
      total_usage: adoption?.reduce((sum, a) => sum + (a.usage_count || 0), 0) || 0
    }

    // Get onboarding completion status
    const { data: onboarding } = await supabase
      .from('user_onboarding')
      .select('status, completion_percentage')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .limit(1)

    data.onboarding_completed = onboarding && onboarding.length > 0

    return data

  } catch (error) {
    console.error('Error gathering health data:', error)
    return data
  }
}

// Component score calculation functions
function calculateEngagementScore(engagement: any): number {
  const { session_count, activity_days } = engagement
  
  // Score based on session count and active days
  let score = 0
  
  if (session_count >= 20) score += 40
  else if (session_count >= 10) score += 30
  else if (session_count >= 5) score += 20
  else if (session_count >= 1) score += 10
  
  if (activity_days >= 20) score += 30
  else if (activity_days >= 15) score += 25
  else if (activity_days >= 10) score += 20
  else if (activity_days >= 5) score += 15
  else if (activity_days >= 1) score += 10

  // Recent activity bonus
  const lastActivity = engagement.last_activity
  if (lastActivity) {
    const daysSinceActivity = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceActivity <= 1) score += 30
    else if (daysSinceActivity <= 3) score += 20
    else if (daysSinceActivity <= 7) score += 10
  }

  return Math.min(100, score)
}

function calculateSatisfactionScore(satisfaction: any): number {
  const { average_rating, recent_nps, feedback_count } = satisfaction
  
  let score = 50 // Default neutral score
  
  if (average_rating !== null && average_rating !== undefined) {
    score = average_rating * 20 // Convert 1-5 scale to 0-100
  }
  
  if (recent_nps !== null && recent_nps !== undefined) {
    // NPS is 0-10, convert to 0-100 and average with rating
    const npsScore = recent_nps * 10
    score = average_rating ? (score + npsScore) / 2 : npsScore
  }
  
  // Bonus for providing feedback
  if (feedback_count > 0) {
    score += Math.min(10, feedback_count * 2)
  }
  
  return Math.min(100, Math.max(0, score))
}

function calculateSupportScore(support: any): number {
  const { ticket_count, open_tickets, high_priority_tickets } = support
  
  let score = 100 // Start with perfect score
  
  // Deduct points for support tickets
  score -= ticket_count * 5
  score -= open_tickets * 10
  score -= high_priority_tickets * 15
  
  return Math.min(100, Math.max(0, score))
}

function calculateAdoptionScore(adoption: any): number {
  const { active_features, average_adoption_score } = adoption
  
  let score = 0
  
  // Points for active features
  score += Math.min(50, active_features * 10)
  
  // Use average adoption score if available
  if (average_adoption_score) {
    score = (score + average_adoption_score) / 2
  }
  
  return Math.min(100, score)
}

function calculateBillingScore(billing: any): number {
  // For now, return a default score
  // In production, integrate with billing data
  return 80
}

function calculateChurnRisk(healthScore: number, data: any): number {
  let risk = (100 - healthScore) / 100
  
  // Additional risk factors
  if (data.support.open_tickets > 2) risk += 0.1
  if (data.support.high_priority_tickets > 0) risk += 0.2
  if (data.satisfaction.average_rating < 3) risk += 0.3
  if (data.engagement.session_count === 0) risk += 0.4
  
  return Math.min(1, risk)
}

function getHealthStatus(healthScore: number, churnRisk: number): string {
  if (churnRisk > 0.8) return 'critical'
  if (churnRisk > 0.6) return 'at_risk'
  if (healthScore >= 80) return 'healthy'
  if (healthScore >= 60) return 'at_risk'
  return 'critical'
}

// Utility functions
function calculateActivityDays(sessions: any[]): number {
  const uniqueDays = new Set(
    sessions.map(s => new Date(s.created_at).toDateString())
  )
  return uniqueDays.size
}

function calculateAverageRating(feedback: any[]): number | null {
  const ratings = feedback.filter(f => f.rating !== null).map(f => f.rating)
  return ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null
}

function getRecentNPS(feedback: any[]): number | null {
  const npsData = feedback
    .filter(f => f.feedback_type === 'nps' && f.rating !== null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  
  return npsData.length > 0 ? npsData[0].rating : null
}

function calculateAverageAdoptionScore(adoption: any[]): number | null {
  const scores = adoption.filter(a => a.adoption_score !== null).map(a => a.adoption_score)
  return scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null
}

// Additional helper functions
async function calculateHealthBreakdown(health: any, userId: string, supabase: any) {
  // Return detailed breakdown of health score components
  return {
    overall_score: health.health_score,
    status: health.status,
    risk_level: health.churn_risk,
    components: health.calculation_details?.components || {},
    recommendations: generateHealthRecommendations(health),
    last_updated: health.updated_at
  }
}

async function getHealthHistory(userId: string, organizationId: string | null, supabase: any) {
  try {
    let query = supabase
      .from('customer_health')
      .select('health_score, engagement_score, satisfaction_score, churn_risk, status, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(30) // Last 30 records

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data } = await query
    return data || []
  } catch (error) {
    console.error('Error fetching health history:', error)
    return []
  }
}

function generateHealthRecommendations(health: any) {
  const recommendations = []
  
  if (health.health_score < 60) {
    recommendations.push('Consider reaching out to understand user concerns')
  }
  
  if (health.engagement_score < 50) {
    recommendations.push('Encourage more platform engagement through feature tours')
  }
  
  if (health.satisfaction_score < 60) {
    recommendations.push('Collect feedback to identify improvement areas')
  }
  
  if (health.churn_risk > 0.6) {
    recommendations.push('High churn risk - immediate intervention recommended')
  }
  
  return recommendations
}

async function logHealthCalculationEvent(userId: string, healthData: any, supabase: any) {
  try {
    await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: 'health_score_calculated',
          health_score: healthData.health_score,
          churn_risk: healthData.churn_risk,
          status: healthData.status,
          calculation_components: Object.keys(healthData.calculation_details?.components || {}),
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging health calculation event:', error)
  }
}