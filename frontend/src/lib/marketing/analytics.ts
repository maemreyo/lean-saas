// Growth Analytics utilities for Marketing & Growth Module
// Following patterns from billing module utilities

import { supabase } from '@/lib/supabase'
import { 
  GrowthMetric, 
  GrowthMetricInsert,
  GrowthExperiment,
  GrowthExperimentInsert,
  GrowthAnalytics,
  ConversionFunnel,
  MarketingOverview,
  MarketingDashboardData,
  TrackGrowthMetricRequest,
  CreateGrowthExperimentRequest,
  UpdateGrowthExperimentRequest,
  GrowthMetricType
} from '@/types/marketing'
import { 
  trackGrowthMetricSchema,
  createGrowthExperimentSchema,
  updateGrowthExperimentSchema,
  marketingAnalyticsQuerySchema 
} from '@/schemas/marketing'
import { createError, handleSupabaseError } from '@/lib/utils'

// ================================================
// GROWTH METRICS TRACKING
// ================================================

/**
 * Track a growth metric
 */
export const trackGrowthMetric = async (
  data: TrackGrowthMetricRequest
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Validate input data
    const validation = trackGrowthMetricSchema.safeParse(data)
    if (!validation.success) {
      return { 
        success: false, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Insert growth metric
    const { error } = await supabase
      .from('growth_metrics')
      .insert({
        organization_id: data.organization_id,
        metric_type: data.metric_type,
        metric_value: data.metric_value,
        dimensions: data.dimensions || {},
        date_recorded: data.date_recorded || new Date().toISOString().split('T')[0]
      })

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to track growth metric', error) 
    }
  }
}

/**
 * Bulk track growth metrics
 */
export const bulkTrackGrowthMetrics = async (
  metrics: TrackGrowthMetricRequest[]
): Promise<{ 
  data: { tracked: number; failed: number; errors: string[] } | null; 
  error: Error | null 
}> => {
  try {
    const results = {
      tracked: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const metric of metrics) {
      const { success, error } = await trackGrowthMetric(metric)
      if (success) {
        results.tracked++
      } else {
        results.failed++
        results.errors.push(error?.message || 'Unknown error')
      }
    }

    return { data: results, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to bulk track growth metrics', error) 
    }
  }
}

/**
 * Get growth metrics for organization
 */
export const getGrowthMetrics = async (
  organizationId: string,
  options: {
    metricTypes?: GrowthMetricType[]
    startDate?: string
    endDate?: string
    period?: 'day' | 'week' | 'month'
    limit?: number
  } = {}
): Promise<{ 
  data: GrowthMetric[] | null; 
  error: Error | null 
}> => {
  try {
    let query = supabase
      .from('growth_metrics')
      .select('*')
      .eq('organization_id', organizationId)

    // Apply filters
    if (options.metricTypes && options.metricTypes.length > 0) {
      query = query.in('metric_type', options.metricTypes)
    }

    if (options.startDate) {
      query = query.gte('date_recorded', options.startDate)
    }

    if (options.endDate) {
      query = query.lte('date_recorded', options.endDate)
    } else if (options.period) {
      const endDate = new Date()
      const startDate = new Date()
      
      switch (options.period) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1)
          break
        case 'week':
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1)
          break
      }
      
      query = query.gte('date_recorded', startDate.toISOString().split('T')[0])
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit)
    }

    // Order by date
    query = query.order('date_recorded', { ascending: false })

    const { data: metrics, error } = await query

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: metrics, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get growth metrics', error) 
    }
  }
}

// ================================================
// GROWTH EXPERIMENTS
// ================================================

/**
 * Create a growth experiment
 */
export const createGrowthExperiment = async (
  data: CreateGrowthExperimentRequest
): Promise<{ data: GrowthExperiment | null; error: Error | null }> => {
  try {
    // Validate input data
    const validation = createGrowthExperimentSchema.safeParse(data)
    if (!validation.success) {
      return { 
        data: null, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Create growth experiment
    const { data: experiment, error } = await supabase
      .from('growth_experiments')
      .insert({
        organization_id: data.organization_id,
        name: data.name,
        description: data.description,
        hypothesis: data.hypothesis,
        experiment_type: data.experiment_type,
        success_criteria: data.success_criteria,
        baseline_metrics: data.baseline_metrics || {},
        status: 'planning'
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: experiment, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to create growth experiment', error) 
    }
  }
}

/**
 * Update a growth experiment
 */
export const updateGrowthExperiment = async (
  id: string,
  data: UpdateGrowthExperimentRequest
): Promise<{ data: GrowthExperiment | null; error: Error | null }> => {
  try {
    // Validate input data
    const validation = updateGrowthExperimentSchema.safeParse(data)
    if (!validation.success) {
      return { 
        data: null, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Update growth experiment
    const { data: experiment, error } = await supabase
      .from('growth_experiments')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: experiment, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to update growth experiment', error) 
    }
  }
}

/**
 * Start a growth experiment
 */
export const startGrowthExperiment = async (
  id: string
): Promise<{ data: GrowthExperiment | null; error: Error | null }> => {
  try {
    const { data: experiment, error } = await supabase
      .from('growth_experiments')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'planning')
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: experiment, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to start growth experiment', error) 
    }
  }
}

/**
 * Complete a growth experiment
 */
export const completeGrowthExperiment = async (
  id: string,
  results: Record<string, any>,
  learnings?: string
): Promise<{ data: GrowthExperiment | null; error: Error | null }> => {
  try {
    const { data: experiment, error } = await supabase
      .from('growth_experiments')
      .update({
        status: 'analyzing',
        ended_at: new Date().toISOString(),
        results,
        learnings,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'running')
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: experiment, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to complete growth experiment', error) 
    }
  }
}

/**
 * List growth experiments
 */
export const listGrowthExperiments = async (
  organizationId: string,
  options: {
    status?: string
    experimentType?: string
    limit?: number
    offset?: number
  } = {}
): Promise<{ 
  data: GrowthExperiment[] | null; 
  count: number | null;
  error: Error | null 
}> => {
  try {
    let query = supabase
      .from('growth_experiments')
      .select('*, count', { count: 'exact' })
      .eq('organization_id', organizationId)

    // Apply filters
    if (options.status) {
      query = query.eq('status', options.status)
    }
    if (options.experimentType) {
      query = query.eq('experiment_type', options.experimentType)
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit)
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    // Order by creation date
    query = query.order('created_at', { ascending: false })

    const { data: experiments, error, count } = await query

    if (error) {
      return { data: null, count: null, error: handleSupabaseError(error) }
    }

    return { data: experiments, count, error: null }
  } catch (error) {
    return { 
      data: null, 
      count: null,
      error: createError('Failed to list growth experiments', error) 
    }
  }
}

// ================================================
// ANALYTICS & DASHBOARDS
// ================================================

/**
 * Get marketing overview
 */
export const getMarketingOverview = async (
  organizationId: string
): Promise<{ data: MarketingOverview | null; error: Error | null }> => {
  try {
    const { data: overview, error } = await supabase
      .from('marketing_overview')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: overview, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get marketing overview', error) 
    }
  }
}

/**
 * Get growth analytics
 */
export const getGrowthAnalytics = async (
  organizationId: string,
  period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<{ data: GrowthAnalytics | null; error: Error | null }> => {
  try {
    // Calculate date ranges
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1)
        break
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1)
        break
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3)
        break
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
    }

    // Get metrics for current period
    const { data: currentMetrics } = await getGrowthMetrics(organizationId, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    })

    // Calculate aggregated metrics
    const metricTotals = {
      page_views: 0,
      unique_visitors: 0,
      signups: 0,
      conversions: 0,
      referrals: 0,
      social_shares: 0,
      email_subscribers: 0
    }

    currentMetrics?.forEach(metric => {
      if (metric.metric_type in metricTotals) {
        metricTotals[metric.metric_type as keyof typeof metricTotals] += metric.metric_value
      }
    })

    const conversionRate = metricTotals.page_views > 0 
      ? (metricTotals.conversions / metricTotals.page_views) * 100 
      : 0

    // Calculate trends (previous period comparison)
    const prevEndDate = new Date(startDate)
    const prevStartDate = new Date(startDate)
    
    switch (period) {
      case 'day':
        prevStartDate.setDate(prevStartDate.getDate() - 1)
        break
      case 'week':
        prevStartDate.setDate(prevStartDate.getDate() - 7)
        break
      case 'month':
        prevStartDate.setMonth(prevStartDate.getMonth() - 1)
        break
      case 'quarter':
        prevStartDate.setMonth(prevStartDate.getMonth() - 3)
        break
      case 'year':
        prevStartDate.setFullYear(prevStartDate.getFullYear() - 1)
        break
    }

    const { data: prevMetrics } = await getGrowthMetrics(organizationId, {
      startDate: prevStartDate.toISOString().split('T')[0],
      endDate: prevEndDate.toISOString().split('T')[0]
    })

    const prevTotals = {
      page_views: 0,
      signups: 0,
      conversions: 0
    }

    prevMetrics?.forEach(metric => {
      if (metric.metric_type in prevTotals) {
        prevTotals[metric.metric_type as keyof typeof prevTotals] += metric.metric_value
      }
    })

    const prevConversionRate = prevTotals.page_views > 0 
      ? (prevTotals.conversions / prevTotals.page_views) * 100 
      : 0

    const trends = {
      page_views_change: prevTotals.page_views > 0 
        ? ((metricTotals.page_views - prevTotals.page_views) / prevTotals.page_views) * 100 
        : 0,
      signups_change: prevTotals.signups > 0 
        ? ((metricTotals.signups - prevTotals.signups) / prevTotals.signups) * 100 
        : 0,
      conversion_rate_change: prevConversionRate > 0 
        ? ((conversionRate - prevConversionRate) / prevConversionRate) * 100 
        : 0
    }

    const analytics: GrowthAnalytics = {
      organization_id: organizationId,
      period,
      metrics: {
        page_views: metricTotals.page_views,
        unique_visitors: metricTotals.unique_visitors,
        signups: metricTotals.signups,
        conversions: metricTotals.conversions,
        conversion_rate: conversionRate,
        referrals: metricTotals.referrals,
        social_shares: metricTotals.social_shares,
        email_subscribers: metricTotals.email_subscribers
      },
      trends
    }

    return { data: analytics, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get growth analytics', error) 
    }
  }
}

/**
 * Get conversion funnel
 */
export const getConversionFunnel = async (
  organizationId: string,
  period: 'day' | 'week' | 'month' = 'month'
): Promise<{ data: ConversionFunnel | null; error: Error | null }> => {
  try {
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1)
        break
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1)
        break
    }

    // Get metrics for funnel steps
    const { data: metrics } = await getGrowthMetrics(organizationId, {
      metricTypes: ['page_view', 'signup', 'trial_start', 'subscription'],
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    })

    const funnelCounts = {
      page_view: 0,
      signup: 0,
      trial_start: 0,
      subscription: 0
    }

    metrics?.forEach(metric => {
      if (metric.metric_type in funnelCounts) {
        funnelCounts[metric.metric_type as keyof typeof funnelCounts] += metric.metric_value
      }
    })

    const steps = [
      {
        name: 'Page Views',
        count: funnelCounts.page_view,
        conversion_rate: 100,
        drop_off_rate: 0
      },
      {
        name: 'Signups',
        count: funnelCounts.signup,
        conversion_rate: funnelCounts.page_view > 0 ? (funnelCounts.signup / funnelCounts.page_view) * 100 : 0,
        drop_off_rate: funnelCounts.page_view > 0 ? ((funnelCounts.page_view - funnelCounts.signup) / funnelCounts.page_view) * 100 : 0
      },
      {
        name: 'Trial Starts',
        count: funnelCounts.trial_start,
        conversion_rate: funnelCounts.signup > 0 ? (funnelCounts.trial_start / funnelCounts.signup) * 100 : 0,
        drop_off_rate: funnelCounts.signup > 0 ? ((funnelCounts.signup - funnelCounts.trial_start) / funnelCounts.signup) * 100 : 0
      },
      {
        name: 'Subscriptions',
        count: funnelCounts.subscription,
        conversion_rate: funnelCounts.trial_start > 0 ? (funnelCounts.subscription / funnelCounts.trial_start) * 100 : 0,
        drop_off_rate: funnelCounts.trial_start > 0 ? ((funnelCounts.trial_start - funnelCounts.subscription) / funnelCounts.trial_start) * 100 : 0
      }
    ]

    const overallConversionRate = funnelCounts.page_view > 0 
      ? (funnelCounts.subscription / funnelCounts.page_view) * 100 
      : 0

    const funnel: ConversionFunnel = {
      organization_id: organizationId,
      steps,
      overall_conversion_rate: overallConversionRate
    }

    return { data: funnel, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get conversion funnel', error) 
    }
  }
}

/**
 * Get marketing dashboard data
 */
export const getMarketingDashboardData = async (
  organizationId: string
): Promise<{ data: MarketingDashboardData | null; error: Error | null }> => {
  try {
    // Get all required data in parallel
    const [
      overviewResult,
      analyticsResult,
      funnelResult,
      leadsResult,
      campaignsResult,
      abTestsResult,
      landingPagesResult
    ] = await Promise.allSettled([
      getMarketingOverview(organizationId),
      getGrowthAnalytics(organizationId, 'month'),
      getConversionFunnel(organizationId, 'month'),
      supabase.from('lead_captures').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(10),
      supabase.from('email_campaigns').select('*').eq('organization_id', organizationId).eq('status', 'sending').limit(5),
      supabase.from('ab_tests').select('*').eq('organization_id', organizationId).eq('status', 'running').limit(5),
      supabase.from('landing_pages').select('*, (view_count::float / NULLIF(conversion_count::float, 0)) as conversion_rate').eq('organization_id', organizationId).eq('published', true).order('view_count', { ascending: false }).limit(5)
    ])

    // Extract data from settled promises
    const overview = overviewResult.status === 'fulfilled' ? overviewResult.value.data : null
    const analytics = analyticsResult.status === 'fulfilled' ? analyticsResult.value.data : null
    const funnel = funnelResult.status === 'fulfilled' ? funnelResult.value.data : null
    const leads = leadsResult.status === 'fulfilled' ? leadsResult.value.data : []
    const campaigns = campaignsResult.status === 'fulfilled' ? campaignsResult.value.data : []
    const abTests = abTestsResult.status === 'fulfilled' ? abTestsResult.value.data : []
    const landingPages = landingPagesResult.status === 'fulfilled' ? landingPagesResult.value.data : []

    // Handle missing data gracefully
    if (!overview || !analytics || !funnel) {
      return { 
        data: null, 
        error: createError('Failed to fetch some dashboard data') 
      }
    }

    const dashboardData: MarketingDashboardData = {
      overview,
      growth_analytics: analytics,
      conversion_funnel: funnel,
      recent_leads: leads || [],
      active_campaigns: campaigns || [],
      active_ab_tests: abTests || [],
      top_landing_pages: landingPages?.map(page => ({
        ...page,
        conversion_rate: page.view_count > 0 ? (page.conversion_count / page.view_count) * 100 : 0
      })) || []
    }

    return { data: dashboardData, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get marketing dashboard data', error) 
    }
  }
}

// ================================================
// REPORTING
// ================================================

/**
 * Generate growth report
 */
export const generateGrowthReport = async (
  organizationId: string,
  startDate: string,
  endDate: string
): Promise<{ 
  data: {
    summary: GrowthAnalytics
    detailed_metrics: GrowthMetric[]
    experiments: GrowthExperiment[]
    recommendations: string[]
  } | null; 
  error: Error | null 
}> => {
  try {
    // Get summary analytics
    const { data: summary } = await getGrowthAnalytics(organizationId, 'month')
    
    // Get detailed metrics
    const { data: detailedMetrics } = await getGrowthMetrics(organizationId, {
      startDate,
      endDate
    })

    // Get experiments
    const { data: experiments } = await listGrowthExperiments(organizationId, {
      status: 'completed'
    })

    // Generate recommendations based on data
    const recommendations: string[] = []
    
    if (summary) {
      if (summary.metrics.conversion_rate < 2) {
        recommendations.push('Conversion rate is below average (2%). Consider A/B testing your landing pages.')
      }
      if (summary.trends.page_views_change < 0) {
        recommendations.push('Page views are declining. Focus on SEO and content marketing.')
      }
      if (summary.metrics.referrals < summary.metrics.signups * 0.1) {
        recommendations.push('Low referral rate. Implement a referral program to drive viral growth.')
      }
      if (summary.metrics.email_subscribers < summary.metrics.signups * 0.5) {
        recommendations.push('Low email capture rate. Add more lead magnets and optimize forms.')
      }
    }

    const report = {
      summary: summary || {
        organization_id: organizationId,
        period: 'month' as const,
        metrics: {
          page_views: 0,
          unique_visitors: 0,
          signups: 0,
          conversions: 0,
          conversion_rate: 0,
          referrals: 0,
          social_shares: 0,
          email_subscribers: 0
        },
        trends: {
          page_views_change: 0,
          signups_change: 0,
          conversion_rate_change: 0
        }
      },
      detailed_metrics: detailedMetrics || [],
      experiments: experiments?.data || [],
      recommendations
    }

    return { data: report, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to generate growth report', error) 
    }
  }
}

// Export all utilities
export const growthAnalyticsUtils = {
  trackMetric: trackGrowthMetric,
  bulkTrackMetrics: bulkTrackGrowthMetrics,
  getMetrics: getGrowthMetrics,
  createExperiment: createGrowthExperiment,
  updateExperiment: updateGrowthExperiment,
  startExperiment: startGrowthExperiment,
  completeExperiment: completeGrowthExperiment,
  listExperiments: listGrowthExperiments,
  getOverview: getMarketingOverview,
  getAnalytics: getGrowthAnalytics,
  getFunnel: getConversionFunnel,
  getDashboardData: getMarketingDashboardData,
  generateReport: generateGrowthReport
}