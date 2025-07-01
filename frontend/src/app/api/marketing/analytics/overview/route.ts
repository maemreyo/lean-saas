// CREATED: 2025-07-01 - Marketing analytics overview API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAuthClient } from '@/lib/auth/auth-utils'
import { analyticsUtils } from '@/lib/marketing/analytics'

// ================================================
// GET /api/marketing/analytics/overview
// Get comprehensive marketing analytics overview
// ================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const organizationId = searchParams.get('organization_id')
    const timeframe = searchParams.get('timeframe') || '30d'
    const includeGoals = searchParams.get('include_goals') === 'true'
    const includePredictions = searchParams.get('include_predictions') === 'true'

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to organization
    const supabase = await createAuthClient()
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess) {
      return NextResponse.json(
        { error: 'Access denied to organization' },
        { status: 403 }
      )
    }

    // Calculate date ranges for current and comparison periods
    const dateRanges = calculateDateRanges(timeframe)

    // Get comprehensive marketing overview data
    const [
      overviewMetrics,
      channelPerformance,
      contentPerformance,
      recentActivity,
      topPerformers
    ] = await Promise.all([
      getOverviewMetrics(supabase, organizationId, dateRanges),
      getChannelPerformance(supabase, organizationId, dateRanges),
      getContentPerformance(supabase, organizationId, dateRanges),
      getRecentActivity(supabase, organizationId),
      getTopPerformers(supabase, organizationId, dateRanges.current)
    ])

    // Get goals and predictions if requested
    let goals = null
    let predictions = null

    if (includeGoals) {
      goals = await getMarketingGoals(supabase, organizationId)
    }

    if (includePredictions) {
      predictions = await generatePredictions(overviewMetrics, dateRanges)
    }

    // Generate insights and recommendations
    const insights = generateOverviewInsights(
      overviewMetrics,
      channelPerformance,
      contentPerformance,
      goals
    )

    return NextResponse.json({
      timeframe,
      date_range: dateRanges.current,
      comparison_range: dateRanges.comparison,
      overview: overviewMetrics,
      channel_performance: channelPerformance,
      content_performance: contentPerformance,
      recent_activity: recentActivity,
      top_performers: topPerformers,
      goals,
      predictions,
      insights,
      summary: {
        total_metrics_tracked: calculateTotalMetrics(overviewMetrics),
        data_quality_score: calculateDataQualityScore(overviewMetrics),
        last_updated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Analytics overview GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// POST /api/marketing/analytics/overview
// Set marketing goals and targets
// ================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { organization_id, goals, timeframe = 'monthly' } = body

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin', 'editor'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Validate goals structure
    const validationResult = validateGoals(goals)
    if (!validationResult.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid goals structure',
          details: validationResult.errors
        },
        { status: 400 }
      )
    }

    // Save goals configuration
    const { data: existingGoals } = await supabase
      .from('seo_metadata')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('page_type', 'analytics_config')
      .eq('page_id', 'marketing_goals')
      .single()

    const goalsConfig = {
      goals,
      timeframe,
      set_by: user.id,
      set_at: new Date().toISOString()
    }

    let result
    if (existingGoals) {
      result = await supabase
        .from('seo_metadata')
        .update({
          seo_config: { goals_config: goalsConfig },
          updated_at: new Date().toISOString()
        })
        .eq('id', existingGoals.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('seo_metadata')
        .insert({
          organization_id,
          page_type: 'analytics_config',
          page_id: 'marketing_goals',
          seo_config: { goals_config: goalsConfig }
        })
        .select()
        .single()
    }

    if (result.error) {
      return NextResponse.json(
        { error: 'Failed to save marketing goals' },
        { status: 500 }
      )
    }

    // Track goals setting
    try {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id,
          metric_type: 'marketing_goals_set',
          metric_value: Object.keys(goals).length,
          dimensions: {
            timeframe,
            goals_count: Object.keys(goals).length,
            user_id: user.id
          }
        })
    } catch (metricsError) {
      console.warn('Failed to track goal setting:', metricsError)
    }

    return NextResponse.json({
      data: result.data,
      goals_config: goalsConfig,
      validation: validationResult,
      message: 'Marketing goals set successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Marketing goals POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

function calculateDateRanges(timeframe: string) {
  const now = new Date()
  let startDate: Date
  let comparisonStart: Date

  switch (timeframe) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      comparisonStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      comparisonStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      comparisonStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      comparisonStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  }

  return {
    current: {
      start: startDate.toISOString(),
      end: now.toISOString()
    },
    comparison: {
      start: comparisonStart.toISOString(),
      end: startDate.toISOString()
    }
  }
}

async function getOverviewMetrics(supabase: any, organizationId: string, dateRanges: any) {
  // Get key marketing metrics for current and comparison periods
  const metricTypes = [
    'page_view',
    'lead_captured', 
    'referral_conversion',
    'email_campaign_sent',
    'ab_test_created',
    'social_share',
    'subscription',
    'trial_started'
  ]

  const [currentMetrics, comparisonMetrics] = await Promise.all([
    getMetricsForPeriod(supabase, organizationId, dateRanges.current, metricTypes),
    getMetricsForPeriod(supabase, organizationId, dateRanges.comparison, metricTypes)
  ])

  // Calculate growth rates
  const overview = {}
  metricTypes.forEach(metricType => {
    const current = currentMetrics[metricType] || { count: 0, value: 0 }
    const comparison = comparisonMetrics[metricType] || { count: 0, value: 0 }

    const growthRate = comparison.count > 0 
      ? ((current.count - comparison.count) / comparison.count) * 100 
      : current.count > 0 ? 100 : 0

    overview[metricType] = {
      current: current.count,
      previous: comparison.count,
      growth_rate: growthRate,
      trend: growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'flat',
      total_value: current.value
    }
  })

  // Calculate derived metrics
  overview['conversion_rate'] = {
    current: overview['page_view']?.current > 0 
      ? (overview['lead_captured']?.current / overview['page_view']?.current) * 100 
      : 0,
    previous: overview['page_view']?.previous > 0 
      ? (overview['lead_captured']?.previous / overview['page_view']?.previous) * 100 
      : 0
  }

  overview['conversion_rate'].growth_rate = overview['conversion_rate'].previous > 0
    ? ((overview['conversion_rate'].current - overview['conversion_rate'].previous) / overview['conversion_rate'].previous) * 100
    : 0

  return overview
}

async function getMetricsForPeriod(supabase: any, organizationId: string, dateRange: any, metricTypes: string[]) {
  const metrics = {}

  for (const metricType of metricTypes) {
    const { data, error } = await supabase
      .from('growth_metrics')
      .select('metric_value')
      .eq('organization_id', organizationId)
      .eq('metric_type', metricType)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)

    if (!error && data) {
      metrics[metricType] = {
        count: data.length,
        value: data.reduce((sum, item) => sum + (item.metric_value || 0), 0)
      }
    } else {
      metrics[metricType] = { count: 0, value: 0 }
    }
  }

  return metrics
}

async function getChannelPerformance(supabase: any, organizationId: string, dateRanges: any) {
  // Get performance by traffic source/channel
  const { data: channelData } = await supabase
    .from('growth_metrics')
    .select('dimensions, metric_type, metric_value')
    .eq('organization_id', organizationId)
    .gte('created_at', dateRanges.current.start)
    .lte('created_at', dateRanges.current.end)
    .in('metric_type', ['page_view', 'lead_captured', 'subscription'])

  const channels = {}

  channelData?.forEach(item => {
    const source = item.dimensions?.source || 'direct'
    if (!channels[source]) {
      channels[source] = {
        name: source,
        page_views: 0,
        leads: 0,
        conversions: 0,
        conversion_rate: 0,
        value: 0
      }
    }

    switch (item.metric_type) {
      case 'page_view':
        channels[source].page_views += 1
        break
      case 'lead_captured':
        channels[source].leads += 1
        break
      case 'subscription':
        channels[source].conversions += 1
        channels[source].value += item.metric_value || 0
        break
    }
  })

  // Calculate conversion rates
  Object.values(channels).forEach((channel: any) => {
    channel.conversion_rate = channel.page_views > 0 
      ? (channel.leads / channel.page_views) * 100 
      : 0
  })

  return Object.values(channels).sort((a: any, b: any) => b.page_views - a.page_views)
}

async function getContentPerformance(supabase: any, organizationId: string, dateRanges: any) {
  // Get landing page performance
  const { data: landingPages } = await supabase
    .from('landing_pages')
    .select(`
      id,
      title,
      slug,
      view_count,
      conversion_count,
      published_at
    `)
    .eq('organization_id', organizationId)
    .eq('published', true)
    .order('view_count', { ascending: false })
    .limit(10)

  // Get email campaign performance
  const { data: emailCampaigns } = await supabase
    .from('email_campaigns')
    .select(`
      id,
      name,
      recipient_count,
      delivered_count,
      opened_count,
      clicked_count,
      sent_at
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'sent')
    .gte('sent_at', dateRanges.current.start)
    .order('opened_count', { ascending: false })
    .limit(10)

  return {
    landing_pages: landingPages?.map(page => ({
      ...page,
      conversion_rate: page.view_count > 0 ? (page.conversion_count / page.view_count) * 100 : 0
    })) || [],
    email_campaigns: emailCampaigns?.map(campaign => ({
      ...campaign,
      open_rate: campaign.delivered_count > 0 ? (campaign.opened_count / campaign.delivered_count) * 100 : 0,
      click_rate: campaign.delivered_count > 0 ? (campaign.clicked_count / campaign.delivered_count) * 100 : 0
    })) || []
  }
}

async function getRecentActivity(supabase: any, organizationId: string) {
  const { data: recentActivity } = await supabase
    .from('growth_metrics')
    .select('metric_type, metric_value, dimensions, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(20)

  return recentActivity?.map(activity => ({
    ...activity,
    display_name: formatActivityName(activity.metric_type, activity.dimensions),
    time_ago: calculateTimeAgo(activity.created_at)
  })) || []
}

async function getTopPerformers(supabase: any, organizationId: string, dateRange: any) {
  // Get top performing content and campaigns
  const [topReferrers, topLandingPages, topCampaigns] = await Promise.all([
    getTopReferrers(supabase, organizationId, dateRange),
    getTopLandingPagesByConversions(supabase, organizationId),
    getTopEmailCampaigns(supabase, organizationId, dateRange)
  ])

  return {
    referrers: topReferrers,
    landing_pages: topLandingPages,
    email_campaigns: topCampaigns
  }
}

async function getTopReferrers(supabase: any, organizationId: string, dateRange: any) {
  const { data: referrers } = await supabase
    .from('referral_conversions')
    .select(`
      referrer_user_id,
      conversion_value,
      referral_codes!inner(code, user_id)
    `)
    .eq('referral_codes.organization_id', organizationId)
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)

  const referrerStats = {}
  referrers?.forEach(conversion => {
    const userId = conversion.referrer_user_id
    if (!referrerStats[userId]) {
      referrerStats[userId] = {
        user_id: userId,
        referral_code: conversion.referral_codes.code,
        conversions: 0,
        total_value: 0
      }
    }
    referrerStats[userId].conversions += 1
    referrerStats[userId].total_value += conversion.conversion_value || 0
  })

  return Object.values(referrerStats)
    .sort((a: any, b: any) => b.conversions - a.conversions)
    .slice(0, 5)
}

async function getTopLandingPagesByConversions(supabase: any, organizationId: string) {
  const { data: pages } = await supabase
    .from('landing_pages')
    .select('id, title, slug, conversion_count, view_count')
    .eq('organization_id', organizationId)
    .eq('published', true)
    .order('conversion_count', { ascending: false })
    .limit(5)

  return pages?.map(page => ({
    ...page,
    conversion_rate: page.view_count > 0 ? (page.conversion_count / page.view_count) * 100 : 0
  })) || []
}

async function getTopEmailCampaigns(supabase: any, organizationId: string, dateRange: any) {
  const { data: campaigns } = await supabase
    .from('email_campaigns')
    .select('id, name, opened_count, delivered_count, clicked_count')
    .eq('organization_id', organizationId)
    .gte('sent_at', dateRange.start)
    .order('opened_count', { ascending: false })
    .limit(5)

  return campaigns?.map(campaign => ({
    ...campaign,
    open_rate: campaign.delivered_count > 0 ? (campaign.opened_count / campaign.delivered_count) * 100 : 0
  })) || []
}

async function getMarketingGoals(supabase: any, organizationId: string) {
  const { data: goalsConfig } = await supabase
    .from('seo_metadata')
    .select('seo_config')
    .eq('organization_id', organizationId)
    .eq('page_type', 'analytics_config')
    .eq('page_id', 'marketing_goals')
    .single()

  return goalsConfig?.seo_config?.goals_config || null
}

async function generatePredictions(overviewMetrics: any, dateRanges: any) {
  // Simple trend-based predictions
  const predictions = {}

  Object.keys(overviewMetrics).forEach(metric => {
    const data = overviewMetrics[metric]
    if (data.growth_rate !== undefined) {
      // Project next period based on current growth rate
      const predicted = data.current * (1 + (data.growth_rate / 100))
      predictions[metric] = {
        predicted_value: Math.round(predicted),
        confidence: data.growth_rate !== 0 ? 'medium' : 'low',
        based_on: 'growth_trend'
      }
    }
  })

  return predictions
}

function generateOverviewInsights(overviewMetrics: any, channelPerformance: any, contentPerformance: any, goals: any) {
  const insights = {
    key_findings: [] as string[],
    recommendations: [] as string[],
    alerts: [] as string[],
    goal_progress: [] as string[]
  }

  // Analyze overall performance
  const totalLeads = overviewMetrics.lead_captured?.current || 0
  const leadGrowth = overviewMetrics.lead_captured?.growth_rate || 0

  if (leadGrowth > 25) {
    insights.key_findings.push(`Strong lead generation growth of ${leadGrowth.toFixed(1)}%`)
  } else if (leadGrowth < -10) {
    insights.alerts.push(`Lead generation declined by ${Math.abs(leadGrowth).toFixed(1)}%`)
  }

  // Channel performance insights
  if (channelPerformance.length > 0) {
    const topChannel = channelPerformance[0]
    insights.key_findings.push(`Top performing channel: ${topChannel.name} (${topChannel.page_views} page views)`)
    
    if (topChannel.conversion_rate < 2) {
      insights.recommendations.push(`Optimize ${topChannel.name} channel - conversion rate below 2%`)
    }
  }

  // Content performance insights
  if (contentPerformance.landing_pages.length > 0) {
    const topPage = contentPerformance.landing_pages[0]
    if (topPage.conversion_rate > 5) {
      insights.key_findings.push(`High-performing landing page: ${topPage.title} (${topPage.conversion_rate.toFixed(1)}% conversion rate)`)
    }
  }

  // Goal progress analysis
  if (goals?.goals_config?.goals) {
    Object.entries(goals.goals_config.goals).forEach(([metric, target]: [string, any]) => {
      const current = overviewMetrics[metric]?.current || 0
      const progress = target > 0 ? (current / target) * 100 : 0
      
      if (progress >= 100) {
        insights.goal_progress.push(`✅ ${metric} goal achieved (${progress.toFixed(1)}%)`)
      } else if (progress >= 75) {
        insights.goal_progress.push(`🟡 ${metric} at ${progress.toFixed(1)}% of goal`)
      } else {
        insights.goal_progress.push(`🔴 ${metric} needs attention (${progress.toFixed(1)}% of goal)`)
      }
    })
  }

  return insights
}

function calculateTotalMetrics(overviewMetrics: any) {
  return Object.values(overviewMetrics).reduce((total: number, metric: any) => {
    return total + (metric.current || 0)
  }, 0)
}

function calculateDataQualityScore(overviewMetrics: any) {
  const metricsWithData = Object.values(overviewMetrics).filter((metric: any) => metric.current > 0).length
  const totalMetrics = Object.keys(overviewMetrics).length
  return totalMetrics > 0 ? (metricsWithData / totalMetrics) * 100 : 0
}

function formatActivityName(metricType: string, dimensions: any) {
  const formatMap = {
    'page_view': 'Page viewed',
    'lead_captured': 'Lead captured',
    'referral_conversion': 'Referral conversion',
    'email_campaign_sent': 'Email campaign sent',
    'ab_test_created': 'A/B test created'
  }

  let name = formatMap[metricType] || metricType.replace(/_/g, ' ')
  
  if (dimensions?.landing_page_id) {
    name += ` (Landing page: ${dimensions.landing_page_id})`
  }
  
  return name
}

function calculateTimeAgo(timestamp: string) {
  const now = new Date()
  const time = new Date(timestamp)
  const diffMs = now.getTime() - time.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

function validateGoals(goals: any) {
  const validation = {
    valid: true,
    errors: [] as string[]
  }

  if (!goals || typeof goals !== 'object') {
    validation.valid = false
    validation.errors.push('Goals must be an object')
    return validation
  }

  const validMetrics = [
    'page_view', 'lead_captured', 'referral_conversion', 
    'email_campaign_sent', 'subscription', 'trial_started'
  ]

  Object.entries(goals).forEach(([metric, target]: [string, any]) => {
    if (!validMetrics.includes(metric)) {
      validation.errors.push(`Invalid metric: ${metric}`)
    }
    if (typeof target !== 'number' || target <= 0) {
      validation.errors.push(`Target for ${metric} must be a positive number`)
    }
  })

  if (validation.errors.length > 0) {
    validation.valid = false
  }

  return validation
}