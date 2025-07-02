import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { getUser } from '@/lib/auth/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')
    const riskLevel = searchParams.get('risk_level') // 'high', 'medium', 'low'
    const includeRecommendations = searchParams.get('include_recommendations')
    const limit = searchParams.get('limit')

    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Build query for at-risk customers
    let query = supabase
      .from('customer_health')
      .select('*')

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    // Filter by risk level
    if (riskLevel === 'high') {
      query = query.gte('churn_risk', 0.7)
    } else if (riskLevel === 'medium') {
      query = query.gte('churn_risk', 0.4).lt('churn_risk', 0.7)
    } else if (riskLevel === 'low') {
      query = query.lt('churn_risk', 0.4)
    } else {
      // Default to at-risk customers (risk >= 0.6)
      query = query.gte('churn_risk', 0.6)
    }

    // Apply limit
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    // Order by highest risk first
    query = query.order('churn_risk', { ascending: false })

    const { data: riskCustomers, error } = await query

    if (error) {
      console.error('Error fetching risk customers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch risk data' }, 
        { status: 500 }
      )
    }

    // Calculate risk analytics
    const riskAnalytics = await calculateRiskAnalytics(organizationId, supabase)

    // Generate recommendations if requested
    let recommendations = null
    if (includeRecommendations === 'true' && riskCustomers) {
      recommendations = await generateRiskRecommendations(riskCustomers, supabase)
    }

    return NextResponse.json({
      success: true,
      data: {
        risk_customers: riskCustomers,
        total_at_risk: riskCustomers?.length || 0,
        analytics: riskAnalytics,
        recommendations
      }
    })

  } catch (error) {
    console.error('Health risks API error:', error)
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
    const { organization_id, risk_threshold, analysis_type, custom_criteria } = body

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' }, 
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Perform risk analysis based on type
    let analysisResults
    switch (analysis_type) {
      case 'churn_prediction':
        analysisResults = await performChurnPredictionAnalysis(organization_id, risk_threshold || 0.6, supabase)
        break
      case 'engagement_decline':
        analysisResults = await performEngagementDeclineAnalysis(organization_id, supabase)
        break
      case 'satisfaction_drop':
        analysisResults = await performSatisfactionDropAnalysis(organization_id, supabase)
        break
      case 'support_intensive':
        analysisResults = await performSupportIntensiveAnalysis(organization_id, supabase)
        break
      case 'custom':
        analysisResults = await performCustomRiskAnalysis(organization_id, custom_criteria, supabase)
        break
      default:
        analysisResults = await performComprehensiveRiskAnalysis(organization_id, risk_threshold || 0.6, supabase)
    }

    // Log analysis event
    await logRiskAnalysisEvent(user.id, {
      organization_id,
      analysis_type: analysis_type || 'comprehensive',
      risk_threshold,
      results_count: analysisResults.at_risk_customers?.length || 0
    }, supabase)

    return NextResponse.json({
      success: true,
      data: analysisResults,
      message: 'Risk analysis completed successfully'
    })

  } catch (error) {
    console.error('Risk analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to calculate risk analytics
async function calculateRiskAnalytics(organizationId: string | null, supabase: any) {
  try {
    let healthQuery = supabase
      .from('customer_health')
      .select('churn_risk, health_score, status, updated_at')

    if (organizationId) {
      healthQuery = healthQuery.eq('organization_id', organizationId)
    }

    const { data: healthData } = await healthQuery

    if (!healthData || healthData.length === 0) {
      return null
    }

    // Calculate risk distribution
    const totalCustomers = healthData.length
    const highRisk = healthData.filter(h => h.churn_risk >= 0.7).length
    const mediumRisk = healthData.filter(h => h.churn_risk >= 0.4 && h.churn_risk < 0.7).length
    const lowRisk = healthData.filter(h => h.churn_risk < 0.4).length

    // Calculate average metrics
    const avgChurnRisk = healthData.reduce((sum, h) => sum + h.churn_risk, 0) / totalCustomers
    const avgHealthScore = healthData.reduce((sum, h) => sum + h.health_score, 0) / totalCustomers

    // Status distribution
    const statusDistribution = healthData.reduce((acc, h) => {
      acc[h.status] = (acc[h.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Trend analysis (compare recent vs older data)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentData = healthData.filter(h => new Date(h.updated_at) > thirtyDaysAgo)
    const olderData = healthData.filter(h => new Date(h.updated_at) <= thirtyDaysAgo)

    let trend = 'stable'
    if (recentData.length > 0 && olderData.length > 0) {
      const recentAvgRisk = recentData.reduce((sum, h) => sum + h.churn_risk, 0) / recentData.length
      const olderAvgRisk = olderData.reduce((sum, h) => sum + h.churn_risk, 0) / olderData.length
      
      if (recentAvgRisk > olderAvgRisk + 0.1) trend = 'increasing'
      else if (recentAvgRisk < olderAvgRisk - 0.1) trend = 'decreasing'
    }

    return {
      total_customers: totalCustomers,
      risk_distribution: {
        high_risk: highRisk,
        medium_risk: mediumRisk,
        low_risk: lowRisk,
        high_risk_percentage: Math.round((highRisk / totalCustomers) * 100),
        medium_risk_percentage: Math.round((mediumRisk / totalCustomers) * 100),
        low_risk_percentage: Math.round((lowRisk / totalCustomers) * 100)
      },
      averages: {
        churn_risk: Math.round(avgChurnRisk * 100) / 100,
        health_score: Math.round(avgHealthScore)
      },
      status_distribution: statusDistribution,
      trend: {
        direction: trend,
        recent_count: recentData.length,
        older_count: olderData.length
      }
    }

  } catch (error) {
    console.error('Error calculating risk analytics:', error)
    return null
  }
}

// Risk analysis functions
async function performChurnPredictionAnalysis(organizationId: string, riskThreshold: number, supabase: any) {
  try {
    const { data: atRiskCustomers } = await supabase
      .from('customer_health')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('churn_risk', riskThreshold)
      .order('churn_risk', { ascending: false })

    const predictions = atRiskCustomers?.map(customer => ({
      ...customer,
      predicted_churn_date: predictChurnDate(customer),
      confidence: calculatePredictionConfidence(customer),
      risk_factors: identifyRiskFactors(customer)
    })) || []

    return {
      analysis_type: 'churn_prediction',
      at_risk_customers: predictions,
      total_predicted_churns: predictions.length,
      high_confidence_predictions: predictions.filter(p => p.confidence > 0.8).length,
      average_confidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
    }

  } catch (error) {
    console.error('Error in churn prediction analysis:', error)
    return { error: 'Failed to perform churn prediction analysis' }
  }
}

async function performEngagementDeclineAnalysis(organizationId: string, supabase: any) {
  try {
    // Get customers with declining engagement
    const { data: healthData } = await supabase
      .from('customer_health')
      .select('user_id, engagement_score, updated_at')
      .eq('organization_id', organizationId)
      .lt('engagement_score', 50)
      .order('engagement_score', { ascending: true })

    const engagementAnalysis = await Promise.all(
      (healthData || []).slice(0, 20).map(async (customer) => {
        const trend = await calculateEngagementTrend(customer.user_id, supabase)
        return {
          ...customer,
          engagement_trend: trend,
          decline_severity: getDeclineSeverity(customer.engagement_score, trend)
        }
      })
    )

    return {
      analysis_type: 'engagement_decline',
      declining_customers: engagementAnalysis,
      severe_declines: engagementAnalysis.filter(c => c.decline_severity === 'severe').length,
      moderate_declines: engagementAnalysis.filter(c => c.decline_severity === 'moderate').length
    }

  } catch (error) {
    console.error('Error in engagement decline analysis:', error)
    return { error: 'Failed to perform engagement decline analysis' }
  }
}

async function performSatisfactionDropAnalysis(organizationId: string, supabase: any) {
  try {
    // Get recent negative feedback
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: negativeFeedback } = await supabase
      .from('user_feedback')
      .select('user_id, rating, feedback_type, created_at, comment')
      .eq('organization_id', organizationId)
      .lt('rating', 3)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })

    const satisfactionAnalysis = negativeFeedback?.reduce((acc, feedback) => {
      if (!acc[feedback.user_id]) {
        acc[feedback.user_id] = {
          user_id: feedback.user_id,
          negative_feedback_count: 0,
          lowest_rating: 5,
          feedback_types: [],
          latest_feedback_date: feedback.created_at
        }
      }
      
      acc[feedback.user_id].negative_feedback_count++
      acc[feedback.user_id].lowest_rating = Math.min(acc[feedback.user_id].lowest_rating, feedback.rating)
      if (!acc[feedback.user_id].feedback_types.includes(feedback.feedback_type)) {
        acc[feedback.user_id].feedback_types.push(feedback.feedback_type)
      }
      
      return acc
    }, {} as Record<string, any>) || {}

    const customersWithSatisfactionDrop = Object.values(satisfactionAnalysis)

    return {
      analysis_type: 'satisfaction_drop',
      customers_with_satisfaction_issues: customersWithSatisfactionDrop,
      total_negative_feedback: negativeFeedback?.length || 0,
      customers_with_multiple_issues: customersWithSatisfactionDrop.filter(c => c.negative_feedback_count > 1).length
    }

  } catch (error) {
    console.error('Error in satisfaction drop analysis:', error)
    return { error: 'Failed to perform satisfaction drop analysis' }
  }
}

async function performSupportIntensiveAnalysis(organizationId: string, supabase: any) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: supportTickets } = await supabase
      .from('support_tickets')
      .select('user_id, status, priority, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', thirtyDaysAgo)

    const supportAnalysis = supportTickets?.reduce((acc, ticket) => {
      if (!acc[ticket.user_id]) {
        acc[ticket.user_id] = {
          user_id: ticket.user_id,
          ticket_count: 0,
          open_tickets: 0,
          high_priority_tickets: 0,
          recent_ticket_date: ticket.created_at
        }
      }
      
      acc[ticket.user_id].ticket_count++
      if (['open', 'in_progress'].includes(ticket.status)) {
        acc[ticket.user_id].open_tickets++
      }
      if (['high', 'urgent', 'critical'].includes(ticket.priority)) {
        acc[ticket.user_id].high_priority_tickets++
      }
      
      return acc
    }, {} as Record<string, any>) || {}

    const supportIntensiveCustomers = Object.values(supportAnalysis)
      .filter(customer => customer.ticket_count >= 3 || customer.high_priority_tickets >= 1)

    return {
      analysis_type: 'support_intensive',
      support_intensive_customers: supportIntensiveCustomers,
      high_volume_customers: supportIntensiveCustomers.filter(c => c.ticket_count >= 5).length,
      high_priority_customers: supportIntensiveCustomers.filter(c => c.high_priority_tickets >= 1).length
    }

  } catch (error) {
    console.error('Error in support intensive analysis:', error)
    return { error: 'Failed to perform support intensive analysis' }
  }
}

async function performComprehensiveRiskAnalysis(organizationId: string, riskThreshold: number, supabase: any) {
  try {
    const [churnAnalysis, engagementAnalysis, satisfactionAnalysis, supportAnalysis] = await Promise.all([
      performChurnPredictionAnalysis(organizationId, riskThreshold, supabase),
      performEngagementDeclineAnalysis(organizationId, supabase),
      performSatisfactionDropAnalysis(organizationId, supabase),
      performSupportIntensiveAnalysis(organizationId, supabase)
    ])

    return {
      analysis_type: 'comprehensive',
      churn_prediction: churnAnalysis,
      engagement_decline: engagementAnalysis,
      satisfaction_drop: satisfactionAnalysis,
      support_intensive: supportAnalysis,
      summary: {
        total_at_risk_customers: churnAnalysis.at_risk_customers?.length || 0,
        declining_engagement: engagementAnalysis.declining_customers?.length || 0,
        satisfaction_issues: satisfactionAnalysis.customers_with_satisfaction_issues?.length || 0,
        support_intensive: supportAnalysis.support_intensive_customers?.length || 0
      }
    }

  } catch (error) {
    console.error('Error in comprehensive risk analysis:', error)
    return { error: 'Failed to perform comprehensive risk analysis' }
  }
}

// Helper functions
function predictChurnDate(customer: any): string | null {
  if (customer.churn_risk < 0.5) return null
  
  // Simple prediction based on risk level
  const daysToChurn = Math.round((1 - customer.churn_risk) * 90) // 0-90 days
  const churnDate = new Date(Date.now() + daysToChurn * 24 * 60 * 60 * 1000)
  
  return churnDate.toISOString()
}

function calculatePredictionConfidence(customer: any): number {
  let confidence = customer.churn_risk
  
  // Adjust confidence based on data recency
  const daysSinceUpdate = (Date.now() - new Date(customer.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceUpdate > 7) confidence *= 0.8
  if (daysSinceUpdate > 30) confidence *= 0.6
  
  return Math.min(1, confidence)
}

function identifyRiskFactors(customer: any): string[] {
  const factors = []
  
  if (customer.health_score < 50) factors.push('Low health score')
  if (customer.engagement_score < 40) factors.push('Poor engagement')
  if (customer.satisfaction_score < 60) factors.push('Low satisfaction')
  if (customer.churn_risk > 0.8) factors.push('Very high churn risk')
  if (!customer.last_activity_date || 
      (Date.now() - new Date(customer.last_activity_date).getTime()) > 7 * 24 * 60 * 60 * 1000) {
    factors.push('Inactive for over a week')
  }
  
  return factors
}

async function calculateEngagementTrend(userId: string, supabase: any) {
  // Simplified trend calculation
  try {
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })

    if (!sessions || sessions.length < 2) return 'insufficient_data'

    const firstWeek = sessions.filter(s => 
      new Date(s.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length

    const secondWeek = sessions.filter(s => 
      new Date(s.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length

    if (secondWeek > firstWeek * 1.2) return 'increasing'
    if (secondWeek < firstWeek * 0.8) return 'decreasing'
    return 'stable'

  } catch (error) {
    return 'error'
  }
}

function getDeclineSeverity(engagementScore: number, trend: string): string {
  if (engagementScore < 20 && trend === 'decreasing') return 'severe'
  if (engagementScore < 40 && trend === 'decreasing') return 'moderate'
  if (engagementScore < 30) return 'moderate'
  return 'mild'
}

async function generateRiskRecommendations(riskCustomers: any[], supabase: any) {
  const recommendations = []

  if (riskCustomers.length === 0) {
    return ['No high-risk customers identified. Continue monitoring.']
  }

  const avgRisk = riskCustomers.reduce((sum, c) => sum + c.churn_risk, 0) / riskCustomers.length

  if (avgRisk > 0.8) {
    recommendations.push('Immediate intervention required for high-risk customers')
    recommendations.push('Consider personal outreach or success manager assignment')
  }

  if (riskCustomers.filter(c => c.engagement_score < 40).length > 0) {
    recommendations.push('Focus on engagement initiatives (feature tours, training)')
  }

  if (riskCustomers.filter(c => c.satisfaction_score < 50).length > 0) {
    recommendations.push('Conduct satisfaction surveys and address feedback')
  }

  recommendations.push('Set up automated health monitoring alerts')
  recommendations.push('Create personalized retention campaigns')

  return recommendations
}

async function logRiskAnalysisEvent(userId: string, analysisData: any, supabase: any) {
  try {
    await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: 'risk_analysis_performed',
          organization_id: analysisData.organization_id,
          analysis_type: analysisData.analysis_type,
          risk_threshold: analysisData.risk_threshold,
          results_count: analysisData.results_count,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging risk analysis event:', error)
  }
}