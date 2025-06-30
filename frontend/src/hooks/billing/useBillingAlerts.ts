// UPDATED: 2025-06-30 - Created billing alerts hook for usage warnings and notifications

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { alertManager } from '@/lib/billing/usage-tracking'
import type { BillingAlert, AlertType } from '@/shared/types/billing'

interface UseBillingAlertsOptions {
  organizationId?: string
  autoRefresh?: boolean
  refreshInterval?: number
  includeAcknowledged?: boolean
}

export function useBillingAlerts(options: UseBillingAlertsOptions = {}) {
  const { user } = useAuth()
  const { 
    organizationId, 
    autoRefresh = true, 
    refreshInterval = 30000,
    includeAcknowledged = false 
  } = options

  // State management
  const [alerts, setAlerts] = useState<BillingAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const alertsData = await alertManager.getAlerts({
        organizationId,
        acknowledged: includeAcknowledged ? undefined : false,
        limit: 50
      })
      setAlerts(alertsData)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch billing alerts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts')
    } finally {
      setLoading(false)
    }
  }, [user, organizationId, includeAcknowledged])

  // Acknowledge alert
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      const updatedAlert = await alertManager.acknowledgeAlert(alertId)
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? updatedAlert : alert
      ))
      return updatedAlert
    } catch (err) {
      console.error('Failed to acknowledge alert:', err)
      throw err
    }
  }, [])

  // Dismiss alert
  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      await alertManager.dismissAlert(alertId)
      setAlerts(prev => prev.filter(alert => alert.id !== alertId))
    } catch (err) {
      console.error('Failed to dismiss alert:', err)
      throw err
    }
  }, [])

  // Acknowledge all alerts
  const acknowledgeAllAlerts = useCallback(async () => {
    const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged)
    
    try {
      await Promise.all(
        unacknowledgedAlerts.map(alert => acknowledgeAlert(alert.id))
      )
    } catch (err) {
      console.error('Failed to acknowledge all alerts:', err)
      throw err
    }
  }, [alerts, acknowledgeAlert])

  // Get alerts by type
  const getAlertsByType = useCallback((alertType: AlertType) => {
    return alerts.filter(alert => alert.alert_type === alertType)
  }, [alerts])

  // Get unacknowledged alerts
  const getUnacknowledgedAlerts = useCallback(() => {
    return alerts.filter(alert => !alert.acknowledged)
  }, [alerts])

  // Get urgent alerts (quota exceeded, payment failed)
  const getUrgentAlerts = useCallback(() => {
    const urgentTypes: AlertType[] = ['quota_exceeded', 'payment_failed', 'subscription_expired']
    return alerts.filter(alert => 
      urgentTypes.includes(alert.alert_type) && !alert.acknowledged
    )
  }, [alerts])

  // Get warning alerts (quota warnings, trial ending)
  const getWarningAlerts = useCallback(() => {
    const warningTypes: AlertType[] = ['quota_warning', 'trial_ending', 'feature_limit_reached']
    return alerts.filter(alert => 
      warningTypes.includes(alert.alert_type) && !alert.acknowledged
    )
  }, [alerts])

  // Check if has urgent alerts
  const hasUrgentAlerts = useCallback(() => {
    return getUrgentAlerts().length > 0
  }, [getUrgentAlerts])

  // Get alert severity
  const getAlertSeverity = useCallback((alert: BillingAlert): 'low' | 'medium' | 'high' | 'critical' => {
    switch (alert.alert_type) {
      case 'payment_failed':
      case 'subscription_expired':
        return 'critical'
      case 'quota_exceeded':
        return 'high'
      case 'quota_warning':
        return alert.threshold_percentage && alert.threshold_percentage >= 90 ? 'high' : 'medium'
      case 'trial_ending':
        return 'medium'
      case 'feature_limit_reached':
        return 'medium'
      default:
        return 'low'
    }
  }, [])

  // Get alert color theme
  const getAlertColor = useCallback((alert: BillingAlert) => {
    const severity = getAlertSeverity(alert)
    switch (severity) {
      case 'critical':
        return 'red'
      case 'high':
        return 'orange'
      case 'medium':
        return 'yellow'
      case 'low':
      default:
        return 'blue'
    }
  }, [getAlertSeverity])

  // Format alert message
  const formatAlertMessage = useCallback((alert: BillingAlert): string => {
    switch (alert.alert_type) {
      case 'quota_warning':
        return `You've used ${alert.threshold_percentage}% of your ${alert.quota_type} quota (${alert.current_usage?.toLocaleString()} / ${alert.limit_value?.toLocaleString()})`
      
      case 'quota_exceeded':
        return `You've exceeded your ${alert.quota_type} quota (${alert.current_usage?.toLocaleString()} / ${alert.limit_value?.toLocaleString()})`
      
      case 'payment_failed':
        return 'Your payment failed. Please update your payment method to continue using the service.'
      
      case 'subscription_expired':
        return 'Your subscription has expired. Please renew to continue using premium features.'
      
      case 'trial_ending':
        return 'Your trial period is ending soon. Upgrade to continue using the service.'
      
      case 'feature_limit_reached':
        return `You've reached the limit for ${alert.quota_type}. Upgrade your plan to continue.`
      
      default:
        return 'You have a billing notification.'
    }
  }, [])

  // Get suggested action for alert
  const getSuggestedAction = useCallback((alert: BillingAlert): string => {
    switch (alert.alert_type) {
      case 'quota_warning':
        return 'Consider upgrading your plan or monitoring usage'
      
      case 'quota_exceeded':
        return 'Upgrade your plan to continue using this feature'
      
      case 'payment_failed':
        return 'Update your payment method in billing settings'
      
      case 'subscription_expired':
        return 'Renew your subscription to restore access'
      
      case 'trial_ending':
        return 'Choose a plan to continue after trial'
      
      case 'feature_limit_reached':
        return 'Upgrade to a higher plan for more capacity'
      
      default:
        return 'Review your billing settings'
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchAlerts()
    } else {
      setLoading(false)
    }
  }, [user, fetchAlerts])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !user) return

    const interval = setInterval(fetchAlerts, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, user, fetchAlerts])

  return {
    // Data
    alerts,
    loading,
    error,

    // Counts
    totalAlerts: alerts.length,
    unacknowledgedCount: getUnacknowledgedAlerts().length,
    urgentCount: getUrgentAlerts().length,
    warningCount: getWarningAlerts().length,

    // Actions
    acknowledgeAlert,
    dismissAlert,
    acknowledgeAllAlerts,
    refreshAlerts: fetchAlerts,

    // Getters
    getAlertsByType,
    getUnacknowledgedAlerts,
    getUrgentAlerts,
    getWarningAlerts,

    // Helpers
    hasUrgentAlerts,
    getAlertSeverity,
    getAlertColor,
    formatAlertMessage,
    getSuggestedAction,

    // Convenience flags
    hasAlerts: alerts.length > 0,
    hasUnacknowledged: getUnacknowledgedAlerts().length > 0,
    hasUrgent: hasUrgentAlerts(),
    hasPaymentIssues: getAlertsByType('payment_failed').length > 0,
    hasQuotaIssues: [...getAlertsByType('quota_warning'), ...getAlertsByType('quota_exceeded')].length > 0
  }
}