// CREATED: 2025-07-01 - Growth tracking and analytics processing edge function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ================================================
// TYPES & INTERFACES
// ================================================

interface GrowthTrackingTask {
  type: 'track_event' | 'aggregate_metrics' | 'calculate_cohorts' | 'generate_insights' | 'process_funnel'
  organizationId: string
  data?: Record<string, any>
  priority: 'low' | 'medium' | 'high'
  scheduledAt?: string
}

interface TrackEventData {
  userId?: string
  sessionId?: string
  eventType: string
  eventData: Record<string, any>
  source: string
  timestamp?: string
  metadata?: Record<string, any>
}

interface MetricsAggregationData {
  period: 'daily' | 'weekly' | 'monthly'
  startDate: string
  endDate: string
  metrics?: string[]
}

interface CohortAnalysisData {
  period: 'weekly' | 'monthly'
  startDate: string
  endDate: string
  conversionEvents: string[]
}

interface FunnelAnalysisData {
  funnelSteps: string[]
  period: 'daily' | 'weekly' | 'monthly'
  startDate: string
  endDate: string
}

// ================================================
// SUPABASE CLIENT
// ================================================

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ================================================
// EVENT TRACKING
// ================================================

async function processTrackEvent(organizationId: string, data: TrackEventData) {
  console.log(`Tracking event: ${data.eventType} for org: ${organizationId}`)
  
  try {
    // Validate and enrich event data
    const enrichedEvent = {
      organization_id: organizationId,
      user_id: data.userId,
      session_id: data.sessionId || crypto.randomUUID(),
      event_type: data.eventType,
      event_data: data.eventData,
      source: data.source,
      timestamp: data.timestamp || new Date().toISOString(),
      metadata: {
        ...data.metadata,
        processed_at: new Date().toISOString(),
        user_agent: data.metadata?.userAgent,
        ip_address: data.metadata?.ipAddress,
        referrer: data.metadata?.referrer
      }
    }

    // Store raw event
    const { error: eventError } = await supabase
      .from('growth_events')
      .insert(enrichedEvent)

    if (eventError) {
      console.error('Error storing event:', eventError)
      return { success: false, error: eventError.message }
    }

    // Process specific event types for immediate insights
    await processEventMetrics(organizationId, enrichedEvent)

    // Update user journey if user is identified
    if (data.userId) {
      await updateUserJourney(organizationId, data.userId, enrichedEvent)
    }

    // Update session analytics
    if (data.sessionId) {
      await updateSessionAnalytics(organizationId, data.sessionId, enrichedEvent)
    }

    console.log(`Successfully tracked event: ${data.eventType}`)
    return { 
      success: true, 
      data: { 
        eventId: enrichedEvent.session_id,
        eventType: data.eventType,
        timestamp: enrichedEvent.timestamp
      }
    }

  } catch (error) {
    console.error('Event tracking error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// METRICS AGGREGATION
// ================================================

async function processMetricsAggregation(organizationId: string, data: MetricsAggregationData) {
  console.log(`Aggregating metrics for org: ${organizationId}, period: ${data.period}`)
  
  try {
    // Get raw events for the period
    const { data: events, error: eventsError } = await supabase
      .from('growth_events')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('timestamp', data.startDate)
      .lte('timestamp', data.endDate)
      .order('timestamp', { ascending: true })

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      return { success: false, error: eventsError.message }
    }

    // Aggregate events by period
    const aggregatedMetrics = aggregateEventsByPeriod(events || [], data.period)

    // Calculate key metrics
    const keyMetrics = calculateKeyMetrics(aggregatedMetrics)

    // Calculate trends
    const trends = calculateMetricTrends(aggregatedMetrics)

    // Store aggregated metrics
    for (const periodData of aggregatedMetrics) {
      const { error: insertError } = await supabase
        .from('aggregated_metrics')
        .upsert({
          organization_id: organizationId,
          period_type: data.period,
          period_start: periodData.periodStart,
          period_end: periodData.periodEnd,
          metrics: periodData.metrics,
          key_metrics: keyMetrics[periodData.period] || {},
          processed_at: new Date().toISOString()
        }, { onConflict: 'organization_id,period_type,period_start' })

      if (insertError) {
        console.error('Error storing aggregated metrics:', insertError)
      }
    }

    // Store trends
    await supabase
      .from('metric_trends')
      .upsert({
        organization_id: organizationId,
        period_type: data.period,
        trends,
        calculated_at: new Date().toISOString()
      }, { onConflict: 'organization_id,period_type' })

    console.log(`Successfully aggregated ${aggregatedMetrics.length} periods of metrics`)
    return { 
      success: true, 
      data: { 
        periodsProcessed: aggregatedMetrics.length,
        eventsProcessed: events?.length || 0,
        keyMetrics: keyMetrics,
        trends: trends.length
      }
    }

  } catch (error) {
    console.error('Metrics aggregation error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// COHORT ANALYSIS
// ================================================

async function processCohortAnalysis(organizationId: string, data: CohortAnalysisData) {
  console.log(`Processing cohort analysis for org: ${organizationId}`)
  
  try {
    // Get user signup events (cohort formation)
    const { data: signups, error: signupsError } = await supabase
      .from('growth_events')
      .select('user_id, timestamp')
      .eq('organization_id', organizationId)
      .eq('event_type', 'user_signup')
      .gte('timestamp', data.startDate)
      .lte('timestamp', data.endDate)
      .order('timestamp', { ascending: true })

    if (signupsError) {
      return { success: false, error: signupsError.message }
    }

    // Get conversion events
    const { data: conversions, error: conversionsError } = await supabase
      .from('growth_events')
      .select('user_id, event_type, timestamp')
      .eq('organization_id', organizationId)
      .in('event_type', data.conversionEvents)
      .gte('timestamp', data.startDate)
      .order('timestamp', { ascending: true })

    if (conversionsError) {
      return { success: false, error: conversionsError.message }
    }

    // Group users into cohorts by signup period
    const cohorts = groupUsersByCohort(signups || [], data.period)

    // Calculate retention and conversion rates for each cohort
    const cohortAnalysis = []
    
    for (const [cohortPeriod, cohortUsers] of Object.entries(cohorts)) {
      const cohortSize = cohortUsers.length
      const cohortStartDate = new Date(cohortPeriod)
      
      // Calculate retention for different periods (1 week, 1 month, 3 months, etc.)
      const retentionPeriods = [7, 30, 90, 180, 365] // days
      const retention = {}
      
      for (const days of retentionPeriods) {
        const cutoffDate = new Date(cohortStartDate.getTime() + days * 24 * 60 * 60 * 1000)
        const activeUsers = cohortUsers.filter(user => {
          return conversions?.some(conv => 
            conv.user_id === user.user_id && 
            new Date(conv.timestamp) <= cutoffDate
          )
        })
        retention[`day_${days}`] = {
          retained_users: activeUsers.length,
          retention_rate: cohortSize > 0 ? activeUsers.length / cohortSize : 0
        }
      }

      // Calculate conversion rates by event type
      const conversionRates = {}
      for (const eventType of data.conversionEvents) {
        const convertedUsers = cohortUsers.filter(user => {
          return conversions?.some(conv => 
            conv.user_id === user.user_id && 
            conv.event_type === eventType
          )
        })
        conversionRates[eventType] = {
          converted_users: convertedUsers.length,
          conversion_rate: cohortSize > 0 ? convertedUsers.length / cohortSize : 0
        }
      }

      cohortAnalysis.push({
        cohort_period: cohortPeriod,
        cohort_size: cohortSize,
        retention,
        conversion_rates: conversionRates
      })
    }

    // Store cohort analysis
    await supabase
      .from('cohort_analyses')
      .upsert({
        organization_id: organizationId,
        analysis_period: data.period,
        start_date: data.startDate,
        end_date: data.endDate,
        cohorts: cohortAnalysis,
        conversion_events: data.conversionEvents,
        calculated_at: new Date().toISOString()
      }, { onConflict: 'organization_id,analysis_period,start_date' })

    console.log(`Successfully analyzed ${cohortAnalysis.length} cohorts`)
    return { 
      success: true, 
      data: { 
        cohortsAnalyzed: cohortAnalysis.length,
        totalUsers: signups?.length || 0,
        totalConversions: conversions?.length || 0,
        analysis: cohortAnalysis
      }
    }

  } catch (error) {
    console.error('Cohort analysis error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// FUNNEL ANALYSIS
// ================================================

async function processFunnelAnalysis(organizationId: string, data: FunnelAnalysisData) {
  console.log(`Processing funnel analysis for org: ${organizationId}`)
  
  try {
    // Get events for funnel steps
    const { data: events, error: eventsError } = await supabase
      .from('growth_events')
      .select('user_id, session_id, event_type, timestamp')
      .eq('organization_id', organizationId)
      .in('event_type', data.funnelSteps)
      .gte('timestamp', data.startDate)
      .lte('timestamp', data.endDate)
      .order('timestamp', { ascending: true })

    if (eventsError) {
      return { success: false, error: eventsError.message }
    }

    // Group events by user sessions
    const sessionFunnels = {}
    
    events?.forEach(event => {
      const sessionKey = event.session_id || event.user_id
      if (!sessionKey) return

      if (!sessionFunnels[sessionKey]) {
        sessionFunnels[sessionKey] = []
      }
      
      sessionFunnels[sessionKey].push(event)
    })

    // Analyze funnel progression
    const funnelStats = {
      total_sessions: Object.keys(sessionFunnels).length,
      steps: data.funnelSteps.map((step, index) => {
        const sessionsAtStep = Object.values(sessionFunnels).filter(session => 
          session.some(event => event.event_type === step)
        ).length

        const conversionFromPrevious = index > 0 ? 
          Object.values(sessionFunnels).filter(session => {
            const hasCurrentStep = session.some(event => event.event_type === step)
            const hasPreviousStep = session.some(event => event.event_type === data.funnelSteps[index - 1])
            return hasCurrentStep && hasPreviousStep
          }).length : sessionsAtStep

        return {
          step_name: step,
          step_number: index + 1,
          sessions_reached: sessionsAtStep,
          conversion_rate: Object.keys(sessionFunnels).length > 0 ? 
            sessionsAtStep / Object.keys(sessionFunnels).length : 0,
          conversion_from_previous: index > 0 ? conversionFromPrevious : sessionsAtStep,
          dropoff_rate: index > 0 ? 
            1 - (conversionFromPrevious / Math.max(1, Object.values(sessionFunnels).filter(session => 
              session.some(event => event.event_type === data.funnelSteps[index - 1])
            ).length)) : 0
        }
      })
    }

    // Calculate overall funnel metrics
    const firstStep = funnelStats.steps[0]
    const lastStep = funnelStats.steps[funnelStats.steps.length - 1]
    
    const overallConversionRate = firstStep ? lastStep.sessions_reached / firstStep.sessions_reached : 0
    
    // Identify biggest dropoff points
    const dropoffPoints = funnelStats.steps
      .filter(step => step.dropoff_rate > 0.3) // More than 30% dropoff
      .sort((a, b) => b.dropoff_rate - a.dropoff_rate)

    // Store funnel analysis
    await supabase
      .from('funnel_analyses')
      .upsert({
        organization_id: organizationId,
        funnel_steps: data.funnelSteps,
        period_type: data.period,
        start_date: data.startDate,
        end_date: data.endDate,
        funnel_stats: funnelStats,
        overall_conversion_rate: overallConversionRate,
        dropoff_points: dropoffPoints,
        calculated_at: new Date().toISOString()
      }, { onConflict: 'organization_id,start_date,end_date' })

    console.log(`Successfully analyzed funnel with ${data.funnelSteps.length} steps`)
    return { 
      success: true, 
      data: { 
        stepsAnalyzed: data.funnelSteps.length,
        totalSessions: funnelStats.total_sessions,
        overallConversionRate,
        majorDropoffPoints: dropoffPoints.length,
        funnelStats
      }
    }

  } catch (error) {
    console.error('Funnel analysis error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// INSIGHTS GENERATION
// ================================================

async function processInsightsGeneration(organizationId: string) {
  console.log(`Generating insights for org: ${organizationId}`)
  
  try {
    // Get recent metrics
    const { data: recentMetrics, error: metricsError } = await supabase
      .from('aggregated_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .order('period_start', { ascending: false })
      .limit(30) // Last 30 periods

    if (metricsError) {
      return { success: false, error: metricsError.message }
    }

    // Get recent trends
    const { data: trends, error: trendsError } = await supabase
      .from('metric_trends')
      .select('*')
      .eq('organization_id', organizationId)
      .order('calculated_at', { ascending: false })
      .limit(1)

    if (trendsError) {
      return { success: false, error: trendsError.message }
    }

    // Generate insights
    const insights = {
      performance_insights: generatePerformanceInsights(recentMetrics || []),
      trend_insights: generateTrendInsights(trends?.[0]?.trends || []),
      opportunity_insights: generateOpportunityInsights(recentMetrics || []),
      alert_insights: generateAlertInsights(recentMetrics || []),
      recommendations: generateRecommendations(recentMetrics || [], trends?.[0]?.trends || [])
    }

    // Store insights
    await supabase
      .from('growth_insights')
      .upsert({
        organization_id: organizationId,
        insights,
        confidence_score: calculateInsightConfidence(insights),
        generated_at: new Date().toISOString()
      }, { onConflict: 'organization_id' })

    console.log(`Successfully generated ${Object.keys(insights).length} insight categories`)
    return { 
      success: true, 
      data: { 
        insightCategories: Object.keys(insights).length,
        performanceInsights: insights.performance_insights.length,
        trendInsights: insights.trend_insights.length,
        opportunities: insights.opportunity_insights.length,
        alerts: insights.alert_insights.length,
        recommendations: insights.recommendations.length
      }
    }

  } catch (error) {
    console.error('Insights generation error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

async function processEventMetrics(organizationId: string, event: any) {
  // Convert events to metrics
  const metricType = eventTypeToMetric(event.event_type)
  if (!metricType) return

  const today = new Date().toISOString().split('T')[0]

  // Update or insert metric for today
  await supabase
    .from('growth_metrics')
    .upsert({
      organization_id: organizationId,
      metric_type: metricType,
      metric_value: 1,
      dimensions: {
        source: event.source,
        event_type: event.event_type
      },
      date_recorded: today
    }, { 
      onConflict: 'organization_id,metric_type,date_recorded',
      ignoreDuplicates: false
    })
}

async function updateUserJourney(organizationId: string, userId: string, event: any) {
  // Update user journey tracking
  await supabase
    .from('user_journeys')
    .upsert({
      organization_id: organizationId,
      user_id: userId,
      latest_event: event.event_type,
      latest_event_at: event.timestamp,
      total_events: 1, // This would be incremented in a real implementation
      journey_stage: determineJourneyStage(event.event_type),
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'organization_id,user_id',
      ignoreDuplicates: false
    })
}

async function updateSessionAnalytics(organizationId: string, sessionId: string, event: any) {
  // Update session analytics
  await supabase
    .from('session_analytics')
    .upsert({
      organization_id: organizationId,
      session_id: sessionId,
      latest_event: event.event_type,
      latest_event_at: event.timestamp,
      event_count: 1, // This would be incremented
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'organization_id,session_id',
      ignoreDuplicates: false
    })
}

function aggregateEventsByPeriod(events: any[], period: string) {
  const grouped = events.reduce((acc, event) => {
    const date = new Date(event.timestamp)
    let key: string
    
    switch (period) {
      case 'daily':
        key = date.toISOString().split('T')[0]
        break
      case 'weekly':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      default:
        key = date.toISOString().split('T')[0]
    }

    if (!acc[key]) {
      acc[key] = {
        period: key,
        periodStart: key,
        periodEnd: key,
        metrics: {},
        events: []
      }
    }

    const metricType = eventTypeToMetric(event.event_type)
    if (metricType) {
      if (!acc[key].metrics[metricType]) {
        acc[key].metrics[metricType] = 0
      }
      acc[key].metrics[metricType]++
    }

    acc[key].events.push(event)
    return acc
  }, {})

  return Object.values(grouped)
}

function calculateKeyMetrics(aggregatedData: any[]) {
  const keyMetrics = {}
  
  aggregatedData.forEach(period => {
    const metrics = period.metrics
    keyMetrics[period.period] = {
      total_events: period.events.length,
      unique_users: new Set(period.events.map(e => e.user_id).filter(Boolean)).size,
      page_views: metrics.page_views || 0,
      signups: metrics.signups || 0,
      conversions: metrics.conversions || 0,
      conversion_rate: metrics.page_views > 0 ? (metrics.conversions || 0) / metrics.page_views : 0
    }
  })

  return keyMetrics
}

function calculateMetricTrends(aggregatedData: any[]) {
  if (aggregatedData.length < 2) return []

  const trends = []
  const sortedData = aggregatedData.sort((a, b) => a.period.localeCompare(b.period))
  
  for (let i = 1; i < sortedData.length; i++) {
    const current = sortedData[i]
    const previous = sortedData[i - 1]
    
    for (const metricType in current.metrics) {
      const currentValue = current.metrics[metricType]
      const previousValue = previous.metrics[metricType] || 0
      
      if (previousValue > 0) {
        const change = ((currentValue - previousValue) / previousValue) * 100
        trends.push({
          metric_type: metricType,
          period: current.period,
          change_percentage: change,
          direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
        })
      }
    }
  }

  return trends
}

function groupUsersByCohort(signups: any[], period: string) {
  const cohorts = {}
  
  signups.forEach(signup => {
    const date = new Date(signup.timestamp)
    let cohortKey: string
    
    switch (period) {
      case 'weekly':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        cohortKey = weekStart.toISOString().split('T')[0]
        break
      case 'monthly':
        cohortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      default:
        cohortKey = date.toISOString().split('T')[0]
    }

    if (!cohorts[cohortKey]) {
      cohorts[cohortKey] = []
    }
    cohorts[cohortKey].push(signup)
  })

  return cohorts
}

function eventTypeToMetric(eventType: string): string | null {
  const eventToMetricMap = {
    'page_view': 'page_views',
    'user_signup': 'signups',
    'subscription_created': 'conversions',
    'purchase_completed': 'purchases',
    'email_opened': 'email_opens',
    'email_clicked': 'email_clicks',
    'referral_completed': 'referrals'
  }
  
  return eventToMetricMap[eventType] || null
}

function determineJourneyStage(eventType: string): string {
  const stageMap = {
    'page_view': 'awareness',
    'signup_started': 'interest',
    'user_signup': 'consideration',
    'trial_started': 'trial',
    'subscription_created': 'customer',
    'purchase_completed': 'customer',
    'referral_completed': 'advocate'
  }
  
  return stageMap[eventType] || 'unknown'
}

function generatePerformanceInsights(metrics: any[]) {
  // Generate performance insights based on metrics
  const insights = []
  
  if (metrics.length > 0) {
    const latest = metrics[0]
    const keyMetrics = latest.key_metrics || {}
    
    if (keyMetrics.conversion_rate > 0.05) {
      insights.push({
        type: 'success',
        message: 'Conversion rate is performing well above industry average',
        metric: 'conversion_rate',
        value: keyMetrics.conversion_rate
      })
    }
    
    if (keyMetrics.signups > 100) {
      insights.push({
        type: 'growth',
        message: 'Strong signup growth indicates healthy funnel performance',
        metric: 'signups',
        value: keyMetrics.signups
      })
    }
  }
  
  return insights
}

function generateTrendInsights(trends: any[]) {
  return trends.filter(trend => Math.abs(trend.change_percentage) > 20).map(trend => ({
    type: 'trend',
    message: `${trend.metric_type} ${trend.direction === 'up' ? 'increased' : 'decreased'} by ${Math.abs(trend.change_percentage).toFixed(1)}%`,
    metric: trend.metric_type,
    change: trend.change_percentage,
    direction: trend.direction
  }))
}

function generateOpportunityInsights(metrics: any[]) {
  const opportunities = []
  
  if (metrics.length > 0) {
    const latest = metrics[0]
    const keyMetrics = latest.key_metrics || {}
    
    if (keyMetrics.conversion_rate < 0.02) {
      opportunities.push({
        type: 'optimization',
        area: 'conversion_rate',
        message: 'Conversion rate is below industry average - consider optimizing landing pages',
        potential_impact: 'high',
        effort_required: 'medium'
      })
    }
  }
  
  return opportunities
}

function generateAlertInsights(metrics: any[]) {
  const alerts = []
  
  if (metrics.length > 1) {
    const latest = metrics[0]
    const previous = metrics[1]
    
    const latestSignups = latest.key_metrics?.signups || 0
    const previousSignups = previous.key_metrics?.signups || 0
    
    if (previousSignups > 0 && latestSignups < previousSignups * 0.5) {
      alerts.push({
        type: 'critical',
        message: 'Signups dropped significantly from previous period',
        metric: 'signups',
        severity: 'high'
      })
    }
  }
  
  return alerts
}

function generateRecommendations(metrics: any[], trends: any[]) {
  const recommendations = []
  
  // Add specific recommendations based on performance and trends
  const declinngTrends = trends.filter(t => t.direction === 'down' && Math.abs(t.change_percentage) > 15)
  
  declinngTrends.forEach(trend => {
    switch (trend.metric_type) {
      case 'page_views':
        recommendations.push({
          category: 'traffic',
          title: 'Improve SEO and content marketing',
          description: 'Page views are declining. Consider optimizing content for search engines and increasing content marketing efforts.',
          priority: 'high',
          estimated_impact: '25% traffic increase'
        })
        break
      case 'signups':
        recommendations.push({
          category: 'conversion',
          title: 'Optimize signup funnel',
          description: 'Signup rate is dropping. A/B test landing pages, simplify signup process, and improve value proposition.',
          priority: 'critical',
          estimated_impact: '40% signup increase'
        })
        break
    }
  })
  
  return recommendations
}

function calculateInsightConfidence(insights: any): number {
  // Calculate confidence score based on available data
  let totalInsights = 0
  let weightedScore = 0
  
  Object.values(insights).forEach((categoryInsights: any) => {
    if (Array.isArray(categoryInsights)) {
      totalInsights += categoryInsights.length
      weightedScore += categoryInsights.length * 0.8 // Base confidence
    }
  })
  
  return Math.min(100, Math.max(0, weightedScore / Math.max(1, totalInsights) * 100))
}

// ================================================
// MAIN HANDLER
// ================================================

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { task }: { task: GrowthTrackingTask } = await req.json()

    console.log(`Processing growth tracking task: ${task.type} for org: ${task.organizationId}`)

    let result
    switch (task.type) {
      case 'track_event':
        result = await processTrackEvent(task.organizationId, task.data as TrackEventData)
        break
      case 'aggregate_metrics':
        result = await processMetricsAggregation(task.organizationId, task.data as MetricsAggregationData)
        break
      case 'calculate_cohorts':
        result = await processCohortAnalysis(task.organizationId, task.data as CohortAnalysisData)
        break
      case 'process_funnel':
        result = await processFunnelAnalysis(task.organizationId, task.data as FunnelAnalysisData)
        break
      case 'generate_insights':
        result = await processInsightsGeneration(task.organizationId)
        break
      default:
        return new Response(
          JSON.stringify({ error: `Unknown task type: ${task.type}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Growth tracking error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})