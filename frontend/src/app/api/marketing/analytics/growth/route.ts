// CREATED: 2025-07-01 - Growth analytics API endpoint for marketing metrics

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAuthClient } from '@/lib/auth/auth-utils'
import { analyticsUtils } from '@/lib/marketing/analytics'

// ================================================
// GET /api/marketing/analytics/growth
// Get comprehensive growth analytics
// ================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const organizationId = searchParams.get('organization_id')
    const timeframe = searchParams.get('timeframe') || '30d' // 7d, 30d, 90d, 1y
    const metrics = searchParams.get('metrics')?.split(',') || ['all']
    const groupBy = searchParams.get('group_by') || 'day' // day, week, month
    const compareWith = searchParams.get('compare_with') // previous_period, same_period_last_year

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

    // Calculate date ranges
    const dateRanges = calculateDateRanges(timeframe, compareWith)

    // Get growth metrics data
    const growthData = await getGrowthMetrics(supabase, organizationId, {
      startDate: dateRanges.current.start,
      endDate: dateRanges.current.end,
      metrics,
      groupBy
    })

    let comparisonData = null
    if (compareWith && dateRanges.comparison) {
      comparisonData = await getGrowthMetrics(supabase, organizationId, {
        startDate: dateRanges.comparison.start,
        endDate: dateRanges.comparison.end,
        metrics,
        groupBy
      })
    }

    // Calculate growth rates and trends
    const analytics = calculateGrowthAnalytics(growthData, comparisonData, groupBy)

    // Get additional insights
    const insights = await generateGrowthInsights(supabase, organizationId, timeframe, analytics)

    return NextResponse.json({
      timeframe,
      date_range: dateRanges.current,
      comparison_range: dateRanges.comparison,
      metrics: analytics,
      insights,
      summary: {
        total_data_points: growthData.length,
        has_comparison: !!comparisonData,
        growth_trends: analytics.trends
      }
    })

  } catch (error) {
    console.error('Growth analytics GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// POST /api/marketing/analytics/growth
// Track custom growth events
// ================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { organization_id, events } = body

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Events array is required' },
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

    // Validate and process events
    const validEvents = events
      .filter(event => event.metric_type && typeof event.metric_value === 'number')
      .map(event => ({
        organization_id,
        metric_type: event.metric_type,
        metric_value: event.metric_value,
        dimensions: event.dimensions || {},
        created_at: event.timestamp || new Date().toISOString()
      }))

    if (validEvents.length === 0) {
      return NextResponse.json(
        { error: 'No valid events to track' },
        { status: 400 }
      )
    }

    // Insert growth metrics
    const { data: insertedEvents, error: insertError } = await supabase
      .from('growth_metrics')
      .insert(validEvents)
      .select()

    if (insertError) {
      console.error('Failed to insert growth events:', insertError)
      return NextResponse.json(
        { error: 'Failed to track growth events' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Growth events tracked successfully',
      events_tracked: insertedEvents?.length || 0,
      events: insertedEvents
    }, { status: 201 })

  } catch (error) {
    console.error('Growth analytics POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// PUT /api/marketing/analytics/growth
// Update growth analytics configuration
// ================================================

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { organization_id, config } = body

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has admin access
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Update analytics configuration
    const { data: existingConfig } = await supabase
      .from('seo_metadata')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('page_type', 'analytics_config')
      .eq('page_id', 'growth')
      .single()

    let result
    if (existingConfig) {
      result = await supabase
        .from('seo_metadata')
        .update({
          seo_config: { analytics_config: config },
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('seo_metadata')
        .insert({
          organization_id,
          page_type: 'analytics_config',
          page_id: 'growth',
          seo_config: { analytics_config: config }
        })
        .select()
        .single()
    }

    if (result.error) {
      return NextResponse.json(
        { error: 'Failed to update analytics configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: result.data,
      message: 'Growth analytics configuration updated successfully'
    })

  } catch (error) {
    console.error('Growth analytics config PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

function calculateDateRanges(timeframe: string, compareWith?: string) {
  const now = new Date()
  const ranges: any = { current: {} }

  // Calculate current period
  switch (timeframe) {
    case '7d':
      ranges.current.start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      ranges.current.end = now.toISOString()
      break
    case '30d':
      ranges.current.start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ranges.current.end = now.toISOString()
      break
    case '90d':
      ranges.current.start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
      ranges.current.end = now.toISOString()
      break
    case '1y':
      ranges.current.start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()
      ranges.current.end = now.toISOString()
      break
    default:
      ranges.current.start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ranges.current.end = now.toISOString()
  }

  // Calculate comparison period if requested
  if (compareWith === 'previous_period') {
    const currentStart = new Date(ranges.current.start)
    const currentEnd = new Date(ranges.current.end)
    const periodLength = currentEnd.getTime() - currentStart.getTime()

    ranges.comparison = {
      start: new Date(currentStart.getTime() - periodLength).toISOString(),
      end: currentStart.toISOString()
    }
  } else if (compareWith === 'same_period_last_year') {
    const currentStart = new Date(ranges.current.start)
    const currentEnd = new Date(ranges.current.end)

    ranges.comparison = {
      start: new Date(currentStart.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date(currentEnd.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  return ranges
}

async function getGrowthMetrics(supabase: any, organizationId: string, options: any) {
  const { startDate, endDate, metrics, groupBy } = options

  // Build base query
  let query = supabase
    .from('growth_metrics')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true })

  // Filter by specific metrics if not 'all'
  if (!metrics.includes('all')) {
    query = query.in('metric_type', metrics)
  }

  const { data: rawMetrics, error } = await query

  if (error) {
    throw error
  }

  // Group data by time period
  const groupedData = groupMetricsByTime(rawMetrics || [], groupBy)
  
  return groupedData
}

function groupMetricsByTime(metrics: any[], groupBy: string) {
  const grouped = {}

  metrics.forEach(metric => {
    const date = new Date(metric.created_at)
    let key: string

    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0]
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      default:
        key = date.toISOString().split('T')[0]
    }

    if (!grouped[key]) {
      grouped[key] = {
        date: key,
        metrics: {}
      }
    }

    const metricType = metric.metric_type
    if (!grouped[key].metrics[metricType]) {
      grouped[key].metrics[metricType] = {
        count: 0,
        total_value: 0,
        average_value: 0
      }
    }

    grouped[key].metrics[metricType].count++
    grouped[key].metrics[metricType].total_value += metric.metric_value || 0
    grouped[key].metrics[metricType].average_value = 
      grouped[key].metrics[metricType].total_value / grouped[key].metrics[metricType].count
  })

  return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date))
}

function calculateGrowthAnalytics(currentData: any[], comparisonData?: any[], groupBy?: string) {
  const analytics = {
    current_period: {
      total_metrics: {},
      time_series: currentData
    },
    comparison_period: comparisonData ? {
      total_metrics: {},
      time_series: comparisonData
    } : null,
    growth_rates: {},
    trends: {}
  }

  // Calculate totals for current period
  currentData.forEach(dataPoint => {
    Object.keys(dataPoint.metrics).forEach(metricType => {
      if (!analytics.current_period.total_metrics[metricType]) {
        analytics.current_period.total_metrics[metricType] = {
          count: 0,
          total_value: 0,
          average_value: 0
        }
      }

      const metric = dataPoint.metrics[metricType]
      analytics.current_period.total_metrics[metricType].count += metric.count
      analytics.current_period.total_metrics[metricType].total_value += metric.total_value
    })
  })

  // Calculate averages
  Object.keys(analytics.current_period.total_metrics).forEach(metricType => {
    const metric = analytics.current_period.total_metrics[metricType]
    metric.average_value = metric.count > 0 ? metric.total_value / metric.count : 0
  })

  // Calculate comparison metrics and growth rates
  if (comparisonData) {
    analytics.comparison_period!.total_metrics = {}
    
    comparisonData.forEach(dataPoint => {
      Object.keys(dataPoint.metrics).forEach(metricType => {
        if (!analytics.comparison_period!.total_metrics[metricType]) {
          analytics.comparison_period!.total_metrics[metricType] = {
            count: 0,
            total_value: 0,
            average_value: 0
          }
        }

        const metric = dataPoint.metrics[metricType]
        analytics.comparison_period!.total_metrics[metricType].count += metric.count
        analytics.comparison_period!.total_metrics[metricType].total_value += metric.total_value
      })
    })

    // Calculate growth rates
    Object.keys(analytics.current_period.total_metrics).forEach(metricType => {
      const current = analytics.current_period.total_metrics[metricType]
      const comparison = analytics.comparison_period!.total_metrics[metricType]

      if (comparison && comparison.total_value > 0) {
        analytics.growth_rates[metricType] = {
          count_growth: ((current.count - comparison.count) / comparison.count) * 100,
          value_growth: ((current.total_value - comparison.total_value) / comparison.total_value) * 100
        }
      }
    })
  }

  // Calculate trends
  Object.keys(analytics.current_period.total_metrics).forEach(metricType => {
    const timeSeriesData = currentData
      .map(d => d.metrics[metricType]?.total_value || 0)
      .filter(v => v > 0)

    if (timeSeriesData.length >= 2) {
      const trend = calculateTrend(timeSeriesData)
      analytics.trends[metricType] = {
        direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat',
        slope: trend,
        confidence: Math.min(timeSeriesData.length / 10, 1) // Simple confidence based on data points
      }
    }
  })

  return analytics
}

function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0
  
  const n = values.length
  const sumX = values.reduce((sum, _, i) => sum + i, 0)
  const sumY = values.reduce((sum, val) => sum + val, 0)
  const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0)
  const sumXX = values.reduce((sum, _, i) => sum + (i * i), 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  return slope
}

async function generateGrowthInsights(supabase: any, organizationId: string, timeframe: string, analytics: any) {
  const insights = {
    key_findings: [] as string[],
    recommendations: [] as string[],
    alerts: [] as string[]
  }

  // Analyze growth rates
  Object.keys(analytics.growth_rates || {}).forEach(metricType => {
    const growth = analytics.growth_rates[metricType]
    
    if (growth.value_growth > 50) {
      insights.key_findings.push(`${metricType} shows strong growth of ${growth.value_growth.toFixed(1)}%`)
    } else if (growth.value_growth < -20) {
      insights.alerts.push(`${metricType} declined by ${Math.abs(growth.value_growth).toFixed(1)}%`)
    }
  })

  // Analyze trends
  Object.keys(analytics.trends || {}).forEach(metricType => {
    const trend = analytics.trends[metricType]
    
    if (trend.direction === 'up' && trend.confidence > 0.7) {
      insights.key_findings.push(`${metricType} shows a strong upward trend`)
    } else if (trend.direction === 'down' && trend.confidence > 0.7) {
      insights.alerts.push(`${metricType} is trending downward`)
    }
  })

  // Generate recommendations
  const totalMetrics = analytics.current_period.total_metrics

  if (totalMetrics.lead_captured && totalMetrics.lead_captured.count < 10) {
    insights.recommendations.push('Consider increasing lead generation efforts')
  }

  if (totalMetrics.page_view && totalMetrics.referral_conversion) {
    const conversionRate = (totalMetrics.referral_conversion.count / totalMetrics.page_view.count) * 100
    if (conversionRate < 2) {
      insights.recommendations.push('Focus on improving conversion rate optimization')
    }
  }

  return insights
}