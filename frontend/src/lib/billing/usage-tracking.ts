// UPDATED: 2025-06-30 - Created usage tracking utilities for metered billing

import { createClient } from '@/lib/supabase/client'
import type { 
  UsageEvent, 
  UsageQuota, 
  BillingAlert,
  UsageEventType,
  QuotaType,
  UsageTrackingRequest,
  UsageTrackingResponse,
  QuotaCheckRequest,
  QuotaCheckResponse
} from '@/shared/types/billing'

// Usage tracking client utilities
export const usageTracker = {
  /**
   * Track a usage event
   */
  async trackUsage(request: UsageTrackingRequest): Promise<UsageTrackingResponse> {
    try {
      const response = await fetch('/api/billing/usage/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to track usage')
      }

      return await response.json()
    } catch (error) {
      console.error('Usage tracking failed:', error)
      throw error
    }
  },

  /**
   * Check quota before performing action
   */
  async checkQuota(request: QuotaCheckRequest): Promise<QuotaCheckResponse> {
    try {
      const response = await fetch('/api/billing/usage/check-quota', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to check quota')
      }

      return await response.json()
    } catch (error) {
      console.error('Quota check failed:', error)
      throw error
    }
  },

  /**
   * Batch track multiple usage events
   */
  async batchTrackUsage(events: UsageTrackingRequest[]): Promise<Array<UsageTrackingResponse>> {
    try {
      const response = await fetch('/api/billing/usage/batch-track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to batch track usage')
      }

      return await response.json()
    } catch (error) {
      console.error('Batch usage tracking failed:', error)
      throw error
    }
  },

  /**
   * Get usage analytics for time period
   */
  async getUsageAnalytics(params: {
    timeRange?: '7d' | '30d' | '90d' | '1y'
    eventType?: UsageEventType
    organizationId?: string
  } = {}) {
    try {
      const searchParams = new URLSearchParams()
      if (params.timeRange) searchParams.set('timeRange', params.timeRange)
      if (params.eventType) searchParams.set('eventType', params.eventType)
      if (params.organizationId) searchParams.set('organizationId', params.organizationId)

      const response = await fetch(`/api/billing/usage/analytics?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get usage analytics')
      }

      return await response.json()
    } catch (error) {
      console.error('Usage analytics failed:', error)
      throw error
    }
  }
}

// Quota management utilities
export const quotaManager = {
  /**
   * Get current quotas for user/organization
   */
  async getQuotas(organizationId?: string): Promise<UsageQuota[]> {
    try {
      const searchParams = new URLSearchParams()
      if (organizationId) searchParams.set('organizationId', organizationId)

      const response = await fetch(`/api/billing/quotas?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get quotas')
      }

      return await response.json()
    } catch (error) {
      console.error('Get quotas failed:', error)
      throw error
    }
  },

  /**
   * Update quota limits (admin only)
   */
  async updateQuotaLimits(
    quotaType: QuotaType,
    limitValue: number,
    organizationId?: string
  ): Promise<UsageQuota> {
    try {
      const response = await fetch('/api/billing/quotas/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quotaType,
          limitValue,
          organizationId
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update quota')
      }

      return await response.json()
    } catch (error) {
      console.error('Update quota failed:', error)
      throw error
    }
  },

  /**
   * Reset quotas (for new billing period)
   */
  async resetQuotas(
    quotaTypes?: QuotaType[],
    organizationId?: string
  ): Promise<{ success: boolean; resetCount: number }> {
    try {
      const response = await fetch('/api/billing/quotas/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quotaTypes,
          organizationId
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to reset quotas')
      }

      return await response.json()
    } catch (error) {
      console.error('Reset quotas failed:', error)
      throw error
    }
  }
}

// Alert management utilities
export const alertManager = {
  /**
   * Get billing alerts
   */
  async getAlerts(params: {
    alertType?: string
    acknowledged?: boolean
    organizationId?: string
    limit?: number
  } = {}): Promise<BillingAlert[]> {
    try {
      const searchParams = new URLSearchParams()
      if (params.alertType) searchParams.set('alertType', params.alertType)
      if (params.acknowledged !== undefined) searchParams.set('acknowledged', params.acknowledged.toString())
      if (params.organizationId) searchParams.set('organizationId', params.organizationId)
      if (params.limit) searchParams.set('limit', params.limit.toString())

      const response = await fetch(`/api/billing/alerts?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get alerts')
      }

      return await response.json()
    } catch (error) {
      console.error('Get alerts failed:', error)
      throw error
    }
  },

  /**
   * Acknowledge billing alert
   */
  async acknowledgeAlert(alertId: string): Promise<BillingAlert> {
    try {
      const response = await fetch(`/api/billing/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to acknowledge alert')
      }

      return await response.json()
    } catch (error) {
      console.error('Acknowledge alert failed:', error)
      throw error
    }
  },

  /**
   * Dismiss billing alert
   */
  async dismissAlert(alertId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`/api/billing/alerts/${alertId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to dismiss alert')
      }

      return await response.json()
    } catch (error) {
      console.error('Dismiss alert failed:', error)
      throw error
    }
  }
}

// Helper functions for client-side usage tracking
export const usageHelpers = {
  /**
   * Track API call usage
   */
  async trackApiCall(endpoint: string, organizationId?: string): Promise<void> {
    await usageTracker.trackUsage({
      eventType: 'api_call',
      quantity: 1,
      metadata: { endpoint },
      organizationId
    })
  },

  /**
   * Track storage usage (in MB)
   */
  async trackStorageUsage(sizeInMB: number, organizationId?: string): Promise<void> {
    await usageTracker.trackUsage({
      eventType: 'storage_used',
      quantity: Math.ceil(sizeInMB / 1024), // Convert to GB
      metadata: { originalSizeMB: sizeInMB },
      organizationId
    })
  },

  /**
   * Track project creation
   */
  async trackProjectCreation(projectId: string, organizationId?: string): Promise<void> {
    await usageTracker.trackUsage({
      eventType: 'project_created',
      quantity: 1,
      metadata: { projectId },
      organizationId
    })
  },

  /**
   * Track email sending
   */
  async trackEmailSent(emailType: string, recipientCount: number, organizationId?: string): Promise<void> {
    await usageTracker.trackUsage({
      eventType: 'email_sent',
      quantity: recipientCount,
      metadata: { emailType },
      organizationId
    })
  },

  /**
   * Track export generation
   */
  async trackExportGeneration(exportType: string, recordCount: number, organizationId?: string): Promise<void> {
    await usageTracker.trackUsage({
      eventType: 'export_generated',
      quantity: 1,
      metadata: { exportType, recordCount },
      organizationId
    })
  },

  /**
   * Check if action is allowed within quota
   */
  async canPerformAction(
    quotaType: QuotaType,
    requestedAmount: number = 1,
    organizationId?: string
  ): Promise<boolean> {
    try {
      const result = await quotaManager.checkQuota({
        quotaType,
        requestedAmount,
        organizationId
      })
      return result.allowed
    } catch (error) {
      console.error('Failed to check action permission:', error)
      return false // Fail closed
    }
  },

  /**
   * Get quota utilization percentage
   */
  getQuotaUtilization(quota: UsageQuota): number {
    if (quota.limit_value === -1) return 0 // Unlimited
    if (quota.limit_value === 0) return 100 // No quota
    return Math.min(100, (quota.current_usage / quota.limit_value) * 100)
  },

  /**
   * Check if quota needs warning
   */
  needsQuotaWarning(quota: UsageQuota, warningThreshold: number = 80): boolean {
    const utilization = this.getQuotaUtilization(quota)
    return utilization >= warningThreshold
  },

  /**
   * Format quota display
   */
  formatQuotaDisplay(quota: UsageQuota): string {
    if (quota.limit_value === -1) {
      return `${quota.current_usage.toLocaleString()} / Unlimited`
    }
    return `${quota.current_usage.toLocaleString()} / ${quota.limit_value.toLocaleString()}`
  },

  /**
   * Calculate remaining quota
   */
  getRemainingQuota(quota: UsageQuota): number {
    if (quota.limit_value === -1) return Infinity
    return Math.max(0, quota.limit_value - quota.current_usage)
  }
}

// Export all utilities
export const billingUtils = {
  usageTracker,
  quotaManager,
  alertManager,
  helpers: usageHelpers
} as const

