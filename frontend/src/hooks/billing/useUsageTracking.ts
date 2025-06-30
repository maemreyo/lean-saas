// UPDATED: 2025-06-30 - Created advanced usage tracking hook for metered billing

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { usageTracker, quotaManager } from '@/lib/billing/usage-tracking'
import type { 
  UsageAnalytics, 
  UsageQuota, 
  BillingAlert,
  UsageEventType,
  QuotaType,
  UsageTrackingRequest 
} from '@/shared/types/billing'

interface UseUsageTrackingOptions {
  organizationId?: string
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
}

export function useUsageTracking(options: UseUsageTrackingOptions = {}) {
  const { user } = useAuth()
  const { organizationId, autoRefresh = true, refreshInterval = 60000 } = options

  // State management
  const [usageAnalytics, setUsageAnalytics] = useState<UsageAnalytics | null>(null)
  const [quotas, setQuotas] = useState<UsageQuota[]>([])
  const [alerts, setAlerts] = useState<BillingAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch usage analytics
  const fetchUsageAnalytics = useCallback(async (timeRange: '7d' | '30d' | '90d' | '1y' = '30d') => {
    if (!user) return

    try {
      const analytics = await usageTracker.getUsageAnalytics({
        timeRange,
        organizationId
      })
      setUsageAnalytics(analytics)
    } catch (err) {
      console.error('Failed to fetch usage analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch usage analytics')
    }
  }, [user, organizationId])

  // Fetch quotas
  const fetchQuotas = useCallback(async () => {
    if (!user) return

    try {
      const quotasData = await quotaManager.getQuotas(organizationId)
      setQuotas(quotasData)
    } catch (err) {
      console.error('Failed to fetch quotas:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch quotas')
    }
  }, [user, organizationId])

  // Track usage event
  const trackUsage = useCallback(async (request: UsageTrackingRequest) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      const response = await usageTracker.trackUsage({
        ...request,
        organizationId: request.organizationId || organizationId
      })

      // Update local state with new quota status
      if (response.quotaStatus) {
        setQuotas(prev => prev.map(quota => 
          quota.quota_type === request.eventType 
            ? { ...quota, current_usage: response.quotaStatus.current }
            : quota
        ))
      }

      // Add new alerts if any
      if (response.alerts && response.alerts.length > 0) {
        setAlerts(prev => [...response.alerts, ...prev])
      }

      return response
    } catch (err) {
      console.error('Failed to track usage:', err)
      throw err
    }
  }, [user, organizationId])

  // Check quota before action
  const checkQuota = useCallback(async (
    quotaType: QuotaType, 
    requestedAmount: number = 1
  ) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      return await quotaManager.checkQuota({
        quotaType,
        requestedAmount,
        organizationId
      })
    } catch (err) {
      console.error('Failed to check quota:', err)
      throw err
    }
  }, [user, organizationId])

  // Get quota by type
  const getQuotaByType = useCallback((quotaType: QuotaType): UsageQuota | null => {
    return quotas.find(quota => quota.quota_type === quotaType) || null
  }, [quotas])

  // Calculate quota utilization
  const getQuotaUtilization = useCallback((quotaType: QuotaType): number => {
    const quota = getQuotaByType(quotaType)
    if (!quota || quota.limit_value === -1) return 0
    if (quota.limit_value === 0) return 100
    return Math.min(100, (quota.current_usage / quota.limit_value) * 100)
  }, [getQuotaByType])

  // Check if quota needs warning
  const needsQuotaWarning = useCallback((
    quotaType: QuotaType, 
    threshold: number = 80
  ): boolean => {
    const utilization = getQuotaUtilization(quotaType)
    return utilization >= threshold
  }, [getQuotaUtilization])

  // Get remaining quota
  const getRemainingQuota = useCallback((quotaType: QuotaType): number => {
    const quota = getQuotaByType(quotaType)
    if (!quota || quota.limit_value === -1) return Infinity
    return Math.max(0, quota.limit_value - quota.current_usage)
  }, [getQuotaByType])

  // Initial data fetch
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        await Promise.all([
          fetchUsageAnalytics(),
          fetchQuotas()
        ])
      } catch (err) {
        console.error('Failed to load billing data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load billing data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, fetchUsageAnalytics, fetchQuotas])

  // Auto-refresh data
  useEffect(() => {
    if (!autoRefresh || !user) return

    const interval = setInterval(() => {
      fetchUsageAnalytics()
      fetchQuotas()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, user, fetchUsageAnalytics, fetchQuotas])

  return {
    // Data
    usageAnalytics,
    quotas,
    alerts,
    loading,
    error,

    // Actions
    trackUsage,
    checkQuota,
    refreshData: () => Promise.all([fetchUsageAnalytics(), fetchQuotas()]),

    // Helpers
    getQuotaByType,
    getQuotaUtilization,
    needsQuotaWarning,
    getRemainingQuota,

    // Convenience methods
    canPerformAction: async (quotaType: QuotaType, amount = 1) => {
      const result = await checkQuota(quotaType, amount)
      return result.allowed
    },
    
    formatQuotaDisplay: (quotaType: QuotaType) => {
      const quota = getQuotaByType(quotaType)
      if (!quota) return 'N/A'
      if (quota.limit_value === -1) {
        return `${quota.current_usage.toLocaleString()} / Unlimited`
      }
      return `${quota.current_usage.toLocaleString()} / ${quota.limit_value.toLocaleString()}`
    }
  }
}