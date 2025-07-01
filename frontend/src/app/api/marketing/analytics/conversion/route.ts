// CREATED: 2025-07-01 - Conversion funnel analytics API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAuthClient } from '@/lib/auth/auth-utils'
import { analyticsUtils } from '@/lib/marketing/analytics'

// ================================================
// GET /api/marketing/analytics/conversion
// Get conversion funnel analytics
// ================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const organizationId = searchParams.get('organization_id')
    const timeframe = searchParams.get('timeframe') || '30d'
    const funnelType = searchParams.get('funnel_type') || 'default' // default, custom, landing_page
    const landingPageId = searchParams.get('landing_page_id')
    const source = searchParams.get('source')
    const includeSegments = searchParams.get('include_segments') === 'true'

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

    // Calculate date range
    const dateRange = calculateDateRange(timeframe)

    // Get conversion funnel data based on type
    let funnelData
    switch (funnelType) {
      case 'landing_page':
        funnelData = await getLandingPageFunnel(supabase, organizationId, {
          ...dateRange,
          landingPageId,
          source
        })
        break
      case 'custom':
        funnelData = await getCustomFunnel(supabase, organizationId, dateRange)
        break
      default:
        funnelData = await getDefaultFunnel(supabase, organizationId, {
          ...dateRange,
          source
        })
    }

    // Calculate conversion rates and drop-off points
    const analytics = calculateConversionAnalytics(funnelData)

    // Get segment analysis if requested
    let segmentAnalysis = null
    if (includeSegments) {
      segmentAnalysis = await getSegmentAnalysis(supabase, organizationId, dateRange)
    }

    // Get conversion insights and recommendations
    const insights = generateConversionInsights(analytics, segmentAnalysis)

    return NextResponse.json({
      timeframe,
      date_range: dateRange,
      funnel_type: funnelType,
      funnel_data: funnelData,
      analytics,
      segment_analysis: segmentAnalysis,
      insights,
      summary: {
        total_visitors: analytics.total_visitors || 0,
        total_conversions: analytics.total_conversions || 0,
        overall_conversion_rate: analytics.overall_conversion_rate || 0,
        biggest_drop_off: analytics.biggest_drop_off
      }
    })

  } catch (error) {
    console.error('Conversion analytics GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// POST /api/marketing/analytics/conversion
// Track conversion events in real-time
// ================================================

export async function POST(request: NextRequest) {
  try {
    // Note: This can be a public endpoint for tracking conversion events
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { 
      organization_id, 
      events, 
      session_id, 
      user_id, 
      metadata = {} 
    } = body

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

    // Verify organization exists
    const { data: organization } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organization_id)
      .single()

    if (!organization) {
      return NextResponse.json(
        { error: 'Invalid organization' },
        { status: 400 }
      )
    }

    // Process and validate conversion events
    const conversionEvents = events.map(event => ({
      organization_id,
      metric_type: `conversion_${event.step}`,
      metric_value: 1,
      dimensions: {
        session_id: session_id || generateSessionId(),
        user_id,
        step: event.step,
        step_name: event.step_name,
        funnel_type: event.funnel_type || 'default',
        source: event.source,
        landing_page_id: event.landing_page_id,
        timestamp: event.timestamp || new Date().toISOString(),
        ...metadata,
        ...event.metadata
      },
      created_at: event.timestamp || new Date().toISOString()
    }))

    // Insert conversion tracking events
    const { data: insertedEvents, error: insertError } = await supabase
      .from('growth_metrics')
      .insert(conversionEvents)
      .select()

    if (insertError) {
      console.error('Failed to track conversion events:', insertError)
      return NextResponse.json(
        { error: 'Failed to track conversion events' },
        { status: 500 }
      )
    }

    // Update conversion counts on related entities
    for (const event of events) {
      try {
        if (event.landing_page_id && event.step === 'conversion') {
          // Update landing page conversion count
          await supabase.rpc('increment_landing_page_conversion', {
            page_id: event.landing_page_id
          })
        }

        if (event.step === 'email_signup') {
          // Track as lead capture
          await supabase
            .from('growth_metrics')
            .insert({
              organization_id,
              metric_type: 'lead_captured',
              metric_value: 1,
              dimensions: {
                session_id: session_id || generateSessionId(),
                source: event.source,
                conversion_tracking: true
              }
            })
        }
      } catch (updateError) {
        console.warn('Failed to update related conversion metrics:', updateError)
      }
    }

    return NextResponse.json({
      message: 'Conversion events tracked successfully',
      events_tracked: insertedEvents?.length || 0,
      session_id: session_id || conversionEvents[0]?.dimensions.session_id
    }, { status: 201 })

  } catch (error) {
    console.error('Conversion tracking POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// PUT /api/marketing/analytics/conversion
// Update conversion funnel configuration
// ================================================

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { organization_id, funnel_config } = body

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

    // Validate funnel configuration
    const validationResult = validateFunnelConfig(funnel_config)
    if (!validationResult.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid funnel configuration',
          details: validationResult.errors
        },
        { status: 400 }
      )
    }

    // Update funnel configuration
    const { data: existingConfig } = await supabase
      .from('seo_metadata')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('page_type', 'analytics_config')
      .eq('page_id', 'conversion_funnel')
      .single()

    let result
    if (existingConfig) {
      result = await supabase
        .from('seo_metadata')
        .update({
          seo_config: { funnel_config },
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
          page_id: 'conversion_funnel',
          seo_config: { funnel_config }
        })
        .select()
        .single()
    }

    if (result.error) {
      return NextResponse.json(
        { error: 'Failed to update funnel configuration' },
        { status: 500 }
      )
    }

    // Track configuration change
    try {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id,
          metric_type: 'funnel_config_updated',
          metric_value: 1,
          dimensions: {
            steps_count: funnel_config.steps?.length || 0,
            user_id: user.id
          }
        })
    } catch (metricsError) {
      console.warn('Failed to track funnel configuration update:', metricsError)
    }

    return NextResponse.json({
      data: result.data,
      validation: validationResult,
      message: 'Conversion funnel configuration updated successfully'
    })

  } catch (error) {
    console.error('Conversion funnel config PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

function calculateDateRange(timeframe: string) {
  const now = new Date()
  let startDate: string

  switch (timeframe) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      break
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      break
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
      break
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }

  return {
    start: startDate,
    end: now.toISOString()
  }
}

async function getDefaultFunnel(supabase: any, organizationId: string, options: any) {
  const { start, end, source } = options

  // Define default funnel steps
  const steps = [
    { name: 'Visitors', metric: 'page_view' },
    { name: 'Page Views', metric: 'page_view' },
    { name: 'Email Signups', metric: 'lead_captured' },
    { name: 'Trial Starts', metric: 'trial_started' },
    { name: 'Conversions', metric: 'subscription' }
  ]

  const funnelData = []

  for (const step of steps) {
    let query = supabase
      .from('growth_metrics')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('metric_type', step.metric)
      .gte('created_at', start)
      .lte('created_at', end)

    if (source) {
      query = query.eq('dimensions->>source', source)
    }

    const { count, error } = await query

    if (error) {
      console.warn(`Failed to fetch ${step.metric} data:`, error)
    }

    funnelData.push({
      step_name: step.name,
      metric_type: step.metric,
      count: count || 0
    })
  }

  return funnelData
}

async function getLandingPageFunnel(supabase: any, organizationId: string, options: any) {
  const { start, end, landingPageId, source } = options

  // Landing page specific funnel
  const steps = [
    { name: 'Page Views', metric: 'page_view' },
    { name: 'Form Interactions', metric: 'form_interaction' },
    { name: 'Email Submissions', metric: 'lead_captured' },
    { name: 'Conversions', metric: 'conversion' }
  ]

  const funnelData = []

  for (const step of steps) {
    let query = supabase
      .from('growth_metrics')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('metric_type', step.metric)
      .gte('created_at', start)
      .lte('created_at', end)

    if (landingPageId) {
      query = query.eq('dimensions->>landing_page_id', landingPageId)
    }

    if (source) {
      query = query.eq('dimensions->>source', source)
    }

    const { count, error } = await query

    if (error) {
      console.warn(`Failed to fetch ${step.metric} data:`, error)
    }

    funnelData.push({
      step_name: step.name,
      metric_type: step.metric,
      count: count || 0
    })
  }

  return funnelData
}

async function getCustomFunnel(supabase: any, organizationId: string, dateRange: any) {
  // Get custom funnel configuration
  const { data: config } = await supabase
    .from('seo_metadata')
    .select('seo_config')
    .eq('organization_id', organizationId)
    .eq('page_type', 'analytics_config')
    .eq('page_id', 'conversion_funnel')
    .single()

  const funnelConfig = config?.seo_config?.funnel_config
  
  if (!funnelConfig || !funnelConfig.steps) {
    // Fallback to default if no custom config
    return getDefaultFunnel(supabase, organizationId, dateRange)
  }

  const funnelData = []

  for (const step of funnelConfig.steps) {
    const { count, error } = await supabase
      .from('growth_metrics')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('metric_type', step.metric_type)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)

    if (error) {
      console.warn(`Failed to fetch ${step.metric_type} data:`, error)
    }

    funnelData.push({
      step_name: step.name,
      metric_type: step.metric_type,
      count: count || 0,
      expected_conversion_rate: step.expected_conversion_rate
    })
  }

  return funnelData
}

function calculateConversionAnalytics(funnelData: any[]) {
  if (!funnelData || funnelData.length === 0) {
    return {
      steps: [],
      conversion_rates: [],
      drop_offs: [],
      total_visitors: 0,
      total_conversions: 0,
      overall_conversion_rate: 0,
      biggest_drop_off: null
    }
  }

  const steps = funnelData.map((step, index) => {
    const currentCount = step.count
    const previousCount = index > 0 ? funnelData[index - 1].count : currentCount
    
    const conversionRate = previousCount > 0 ? (currentCount / previousCount) * 100 : 0
    const dropOffRate = previousCount > 0 ? ((previousCount - currentCount) / previousCount) * 100 : 0
    const dropOffCount = previousCount - currentCount

    return {
      ...step,
      conversion_rate: conversionRate,
      drop_off_rate: dropOffRate,
      drop_off_count: dropOffCount,
      cumulative_conversion_rate: funnelData[0].count > 0 ? (currentCount / funnelData[0].count) * 100 : 0
    }
  })

  // Find biggest drop-off step
  const dropOffs = steps.slice(1).map((step, index) => ({
    step_index: index + 1,
    step_name: step.step_name,
    drop_off_count: step.drop_off_count,
    drop_off_rate: step.drop_off_rate
  }))

  const biggestDropOff = dropOffs.reduce((max, current) => 
    current.drop_off_count > max.drop_off_count ? current : max
  , dropOffs[0] || null)

  return {
    steps,
    conversion_rates: steps.map(s => s.conversion_rate),
    drop_offs: dropOffs,
    total_visitors: funnelData[0]?.count || 0,
    total_conversions: funnelData[funnelData.length - 1]?.count || 0,
    overall_conversion_rate: funnelData[0]?.count > 0 
      ? ((funnelData[funnelData.length - 1]?.count || 0) / funnelData[0].count) * 100 
      : 0,
    biggest_drop_off: biggestDropOff
  }
}

async function getSegmentAnalysis(supabase: any, organizationId: string, dateRange: any) {
  // Analyze conversions by different segments
  const segments = {
    by_source: {},
    by_device: {},
    by_landing_page: {},
    by_time_of_day: {}
  }

  // Get conversion events with dimensions for segmentation
  const { data: conversions } = await supabase
    .from('growth_metrics')
    .select('dimensions, created_at')
    .eq('organization_id', organizationId)
    .in('metric_type', ['lead_captured', 'subscription', 'conversion'])
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)

  if (conversions) {
    conversions.forEach(conversion => {
      const dims = conversion.dimensions || {}
      
      // Segment by source
      const source = dims.source || 'unknown'
      segments.by_source[source] = (segments.by_source[source] || 0) + 1

      // Segment by device (if available)
      const device = dims.device || 'unknown'
      segments.by_device[device] = (segments.by_device[device] || 0) + 1

      // Segment by landing page
      const landingPage = dims.landing_page_id || 'unknown'
      segments.by_landing_page[landingPage] = (segments.by_landing_page[landingPage] || 0) + 1

      // Segment by time of day
      const hour = new Date(conversion.created_at).getHours()
      const timeSegment = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
      segments.by_time_of_day[timeSegment] = (segments.by_time_of_day[timeSegment] || 0) + 1
    })
  }

  return segments
}

function generateConversionInsights(analytics: any, segmentAnalysis: any) {
  const insights = {
    key_findings: [] as string[],
    recommendations: [] as string[],
    optimization_opportunities: [] as string[]
  }

  // Analyze overall conversion rate
  if (analytics.overall_conversion_rate < 2) {
    insights.key_findings.push('Overall conversion rate is below industry average (2-3%)')
    insights.recommendations.push('Focus on conversion rate optimization')
  } else if (analytics.overall_conversion_rate > 5) {
    insights.key_findings.push('Excellent conversion rate performance')
  }

  // Analyze biggest drop-off
  if (analytics.biggest_drop_off && analytics.biggest_drop_off.drop_off_rate > 70) {
    insights.key_findings.push(`Significant drop-off at ${analytics.biggest_drop_off.step_name} (${analytics.biggest_drop_off.drop_off_rate.toFixed(1)}%)`)
    insights.optimization_opportunities.push(`Optimize the ${analytics.biggest_drop_off.step_name} step`)
  }

  // Analyze segments
  if (segmentAnalysis) {
    const topSource = Object.entries(segmentAnalysis.by_source)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]
    
    if (topSource) {
      insights.key_findings.push(`Top conversion source: ${topSource[0]} (${topSource[1]} conversions)`)
    }

    const timeSegments = Object.entries(segmentAnalysis.by_time_of_day)
      .sort(([,a], [,b]) => (b as number) - (a as number))
    
    if (timeSegments.length > 0) {
      insights.recommendations.push(`Peak conversion time: ${timeSegments[0][0]} - consider scheduling campaigns accordingly`)
    }
  }

  return insights
}

function validateFunnelConfig(config: any) {
  const validation = {
    valid: true,
    errors: [] as string[]
  }

  if (!config || typeof config !== 'object') {
    validation.valid = false
    validation.errors.push('Config must be an object')
    return validation
  }

  if (!Array.isArray(config.steps) || config.steps.length === 0) {
    validation.valid = false
    validation.errors.push('Steps array is required and must not be empty')
  } else {
    config.steps.forEach((step: any, index: number) => {
      if (!step.name || typeof step.name !== 'string') {
        validation.errors.push(`Step ${index + 1}: name is required`)
      }
      if (!step.metric_type || typeof step.metric_type !== 'string') {
        validation.errors.push(`Step ${index + 1}: metric_type is required`)
      }
    })
  }

  if (validation.errors.length > 0) {
    validation.valid = false
  }

  return validation
}

function generateSessionId(): string {
  return 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}