// Growth Analytics React Hook for Marketing & Growth Module
// Following patterns from billing module hooks

import { useState, useEffect, useCallback } from 'react'
import { 
  GrowthMetric,
  GrowthExperiment,
  GrowthAnalytics,
  ConversionFunnel,
  MarketingOverview,
  MarketingDashboardData,
  TrackGrowthMetricRequest,
  CreateGrowthExperimentRequest,
  UpdateGrowthExperimentRequest,
  GrowthMetricType
} from '@/types/marketing'
import { growthAnalyticsUtils } from '@/lib/marketing/analytics'
import { useToast } from '@/hooks/ui/use-toast'

// ================================================
// GROWTH METRICS TRACKING HOOK
// ================================================

export function useGrowthMetrics(organizationId: string) {
  const [metrics, setMetrics] = useState<GrowthMetric[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch growth metrics
  const fetchMetrics = useCallback(async (options?: {
    metricTypes?: GrowthMetricType[]
    startDate?: string
    endDate?: string
    period?: 'day' | 'week' | 'month'
    limit?: number
  }) => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await growthAnalyticsUtils.getMetrics(organizationId, options)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch growth metrics',
          variant: 'destructive'
        })
        return
      }

      setMetrics(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [organizationId, toast])

  // Track growth metric
  const trackMetric = useCallback(async (data: TrackGrowthMetricRequest) => {
    setError(null)

    try {
      const { success, error } = await growthAnalyticsUtils.trackMetric(data)

      if (!success || error) {
        setError(error?.message || 'Failed to track growth metric')
        return { success: false }
      }

      // Add to local state if it's for current organization
      if (data.organization_id === organizationId) {
        const newMetric: GrowthMetric = {
          id: crypto.randomUUID(),
          organization_id: data.organization_id,
          metric_type: data.metric_type,
          metric_value: data.metric_value,
          dimensions: data.dimensions || {},
          date_recorded: data.date_recorded || new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        }
        setMetrics(prev => [newMetric, ...prev])
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false }
    }
  }, [organizationId])

  // Bulk track metrics
  const bulkTrackMetrics = useCallback(async (metricsList: TrackGrowthMetricRequest[]) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await growthAnalyticsUtils.bulkTrackMetrics(metricsList)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to bulk track metrics',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      toast({
        title: 'Success',
        description: `Tracked ${data?.tracked || 0} metrics. ${data?.failed || 0} failed.`
      })

      // Refresh metrics
      fetchMetrics()

      return { success: true, data }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [fetchMetrics, toast])

  // Auto-fetch on mount
  useEffect(() => {
    if (organizationId) {
      fetchMetrics()
    }
  }, []) // Only run on mount

  return {
    // Data
    metrics,
    loading,
    error,
    
    // Actions
    fetchMetrics,
    trackMetric,
    bulkTrackMetrics,
    
    // Helpers
    refetch: fetchMetrics
  }
}

// ================================================
// GROWTH EXPERIMENTS HOOK
// ================================================

export function useGrowthExperiments(organizationId: string) {
  const [experiments, setExperiments] = useState<GrowthExperiment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0
  })
  const { toast } = useToast()

  // Fetch experiments
  const fetchExperiments = useCallback(async (options?: {
    status?: string
    experimentType?: string
    limit?: number
    offset?: number
  }) => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      const { data, count, error } = await growthAnalyticsUtils.listExperiments(organizationId, {
        status: options?.status,
        experimentType: options?.experimentType,
        limit: options?.limit || pagination.limit,
        offset: options?.offset || pagination.offset
      })

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch growth experiments',
          variant: 'destructive'
        })
        return
      }

      setExperiments(data || [])
      setPagination(prev => ({
        ...prev,
        total: count || 0,
        limit: options?.limit || prev.limit,
        offset: options?.offset || prev.offset
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [organizationId, pagination.limit, pagination.offset, toast])

  // Create experiment
  const createExperiment = useCallback(async (data: CreateGrowthExperimentRequest) => {
    setLoading(true)
    setError(null)

    try {
      const { data: experiment, error } = await growthAnalyticsUtils.createExperiment(data)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to create growth experiment',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Add to local state
      if (experiment) {
        setExperiments(prev => [experiment, ...prev])
        toast({
          title: 'Success',
          description: 'Growth experiment created successfully'
        })
      }

      return { success: true, data: experiment }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Update experiment
  const updateExperiment = useCallback(async (
    id: string, 
    data: UpdateGrowthExperimentRequest
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { data: updatedExperiment, error } = await growthAnalyticsUtils.updateExperiment(id, data)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to update growth experiment',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Update local state
      if (updatedExperiment) {
        setExperiments(prev => 
          prev.map(exp => exp.id === id ? updatedExperiment : exp)
        )
        toast({
          title: 'Success',
          description: 'Growth experiment updated successfully'
        })
      }

      return { success: true, data: updatedExperiment }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Start experiment
  const startExperiment = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const { data: startedExperiment, error } = await growthAnalyticsUtils.startExperiment(id)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to start growth experiment',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Update local state
      if (startedExperiment) {
        setExperiments(prev => 
          prev.map(exp => exp.id === id ? startedExperiment : exp)
        )
        toast({
          title: 'Success',
          description: 'Growth experiment started successfully'
        })
      }

      return { success: true, data: startedExperiment }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Complete experiment
  const completeExperiment = useCallback(async (
    id: string,
    results: Record<string, any>,
    learnings?: string
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { data: completedExperiment, error } = await growthAnalyticsUtils.completeExperiment(
        id, 
        results, 
        learnings
      )

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to complete growth experiment',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Update local state
      if (completedExperiment) {
        setExperiments(prev => 
          prev.map(exp => exp.id === id ? completedExperiment : exp)
        )
        toast({
          title: 'Success',
          description: 'Growth experiment completed successfully'
        })
      }

      return { success: true, data: completedExperiment }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Auto-fetch on mount
  useEffect(() => {
    if (organizationId) {
      fetchExperiments()
    }
  }, []) // Only run on mount

  return {
    // Data
    experiments,
    loading,
    error,
    pagination,
    
    // Actions
    fetchExperiments,
    createExperiment,
    updateExperiment,
    startExperiment,
    completeExperiment,
    
    // Computed values
    hasNextPage: pagination.offset + pagination.limit < pagination.total,
    hasPrevPage: pagination.offset > 0,
    currentPage: Math.floor(pagination.offset / pagination.limit) + 1,
    totalPages: Math.ceil(pagination.total / pagination.limit)
  }
}

// ================================================
// GROWTH ANALYTICS DASHBOARD HOOK
// ================================================

export function useGrowthAnalytics(organizationId: string) {
  const [overview, setOverview] = useState<MarketingOverview | null>(null)
  const [analytics, setAnalytics] = useState<GrowthAnalytics | null>(null)
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null)
  const [dashboardData, setDashboardData] = useState<MarketingDashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch marketing overview
  const fetchOverview = useCallback(async () => {
    if (!organizationId) return

    try {
      const { data, error } = await growthAnalyticsUtils.getOverview(organizationId)

      if (error) {
        console.warn('Failed to fetch marketing overview:', error.message)
        return
      }

      setOverview(data)
    } catch (err) {
      console.warn('Failed to fetch marketing overview:', err)
    }
  }, [organizationId])

  // Fetch growth analytics
  const fetchAnalytics = useCallback(async (
    period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month'
  ) => {
    if (!organizationId) return

    try {
      const { data, error } = await growthAnalyticsUtils.getAnalytics(organizationId, period)

      if (error) {
        console.warn('Failed to fetch growth analytics:', error.message)
        return
      }

      setAnalytics(data)
    } catch (err) {
      console.warn('Failed to fetch growth analytics:', err)
    }
  }, [organizationId])

  // Fetch conversion funnel
  const fetchFunnel = useCallback(async (
    period: 'day' | 'week' | 'month' = 'month'
  ) => {
    if (!organizationId) return

    try {
      const { data, error } = await growthAnalyticsUtils.getFunnel(organizationId, period)

      if (error) {
        console.warn('Failed to fetch conversion funnel:', error.message)
        return
      }

      setFunnel(data)
    } catch (err) {
      console.warn('Failed to fetch conversion funnel:', err)
    }
  }, [organizationId])

  // Fetch complete dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await growthAnalyticsUtils.getDashboardData(organizationId)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch dashboard data',
          variant: 'destructive'
        })
        return
      }

      setDashboardData(data)

      // Also set individual pieces
      if (data) {
        setOverview(data.overview)
        setAnalytics(data.growth_analytics)
        setFunnel(data.conversion_funnel)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [organizationId, toast])

  // Generate growth report
  const generateReport = useCallback(async (
    startDate: string,
    endDate: string
  ) => {
    if (!organizationId) return { success: false, data: null }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await growthAnalyticsUtils.generateReport(
        organizationId, 
        startDate, 
        endDate
      )

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to generate growth report',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      toast({
        title: 'Success',
        description: 'Growth report generated successfully'
      })

      return { success: true, data }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [organizationId, toast])

  // Auto-fetch on mount
  useEffect(() => {
    if (organizationId) {
      fetchDashboardData()
    }
  }, [organizationId]) // Only depend on organizationId

  return {
    // Data
    overview,
    analytics,
    funnel,
    dashboardData,
    loading,
    error,
    
    // Actions
    fetchOverview,
    fetchAnalytics,
    fetchFunnel,
    fetchDashboardData,
    generateReport,
    
    // Helpers
    refetch: fetchDashboardData,
    refreshAnalytics: () => fetchAnalytics(),
    refreshFunnel: () => fetchFunnel()
  }
}

// ================================================
// GROWTH INSIGHTS HOOK
// ================================================

export function useGrowthInsights(organizationId: string) {
  const [insights, setInsights] = useState<{
    trends: {
      metric: string
      trend: 'up' | 'down' | 'stable'
      change_percentage: number
      insight: string
    }[]
    opportunities: {
      area: string
      impact: 'high' | 'medium' | 'low'
      effort: 'high' | 'medium' | 'low'
      description: string
      recommendation: string
    }[]
    alerts: {
      type: 'warning' | 'critical' | 'info'
      metric: string
      current_value: number
      threshold: number
      message: string
    }[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate insights from analytics data
  const generateInsights = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      // Get recent analytics data
      const { data: analytics } = await growthAnalyticsUtils.getAnalytics(organizationId, 'month')
      const { data: funnel } = await growthAnalyticsUtils.getFunnel(organizationId, 'month')

      if (!analytics || !funnel) {
        setInsights({
          trends: [],
          opportunities: [],
          alerts: []
        })
        return
      }

      // Analyze trends
      const trends = []
      if (analytics.trends.page_views_change !== 0) {
        trends.push({
          metric: 'Page Views',
          trend: analytics.trends.page_views_change > 0 ? 'up' as const : 'down' as const,
          change_percentage: Math.abs(analytics.trends.page_views_change),
          insight: analytics.trends.page_views_change > 0 
            ? 'Traffic is growing - good momentum!' 
            : 'Traffic is declining - consider SEO optimization'
        })
      }

      if (analytics.trends.signups_change !== 0) {
        trends.push({
          metric: 'Signups',
          trend: analytics.trends.signups_change > 0 ? 'up' as const : 'down' as const,
          change_percentage: Math.abs(analytics.trends.signups_change),
          insight: analytics.trends.signups_change > 0 
            ? 'Signup growth is strong!' 
            : 'Signup rate is dropping - review your value proposition'
        })
      }

      // Identify opportunities
      const opportunities = []
      if (analytics.metrics.conversion_rate < 2) {
        opportunities.push({
          area: 'Conversion Optimization',
          impact: 'high' as const,
          effort: 'medium' as const,
          description: 'Your conversion rate is below industry average (2%)',
          recommendation: 'A/B test your landing pages and optimize call-to-action buttons'
        })
      }

      if (analytics.metrics.referrals < analytics.metrics.signups * 0.1) {
        opportunities.push({
          area: 'Referral Program',
          impact: 'medium' as const,
          effort: 'low' as const,
          description: 'Low referral rate indicates untapped viral potential',
          recommendation: 'Implement or improve your referral program with better incentives'
        })
      }

      // Generate alerts
      const alerts = []
      if (analytics.metrics.conversion_rate < 1) {
        alerts.push({
          type: 'critical' as const,
          metric: 'Conversion Rate',
          current_value: analytics.metrics.conversion_rate,
          threshold: 1,
          message: 'Conversion rate is critically low - immediate attention needed'
        })
      }

      if (funnel.overall_conversion_rate < 0.5) {
        alerts.push({
          type: 'warning' as const,
          metric: 'Funnel Conversion',
          current_value: funnel.overall_conversion_rate,
          threshold: 0.5,
          message: 'Overall funnel conversion is below benchmark'
        })
      }

      setInsights({
        trends,
        opportunities,
        alerts
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  // Auto-generate insights on mount
  useEffect(() => {
    if (organizationId) {
      generateInsights()
    }
  }, [organizationId]) // Only depend on organizationId

  return {
    insights,
    loading,
    error,
    generateInsights,
    refetch: generateInsights
  }
}