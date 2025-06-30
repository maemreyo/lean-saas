// UPDATED: 2025-06-30 - Created billing alerts component for usage warnings and notifications

'use client'

import { useState } from 'react'
import { useBillingAlerts } from '@/hooks/billing/useBillingAlerts'
import { Button } from '@/components/ui/Button'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  CreditCard,
  TrendingUp,
  Shield,
  X,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/shared/constants'
import type { BillingAlert, AlertType } from '@/shared/types/billing'

interface BillingAlertsProps {
  organizationId?: string
  showDismissed?: boolean
  maxAlerts?: number
  compact?: boolean
  className?: string
}

export function BillingAlerts({ 
  organizationId, 
  showDismissed = false,
  maxAlerts = 10,
  compact = false,
  className 
}: BillingAlertsProps) {
  const [dismissing, setDismissing] = useState<string | null>(null)
  const [acknowledging, setAcknowledging] = useState<string | null>(null)

  const {
    alerts,
    loading,
    error,
    acknowledgeAlert,
    dismissAlert,
    acknowledgeAllAlerts,
    getAlertSeverity,
    getAlertColor,
    formatAlertMessage,
    getSuggestedAction,
    hasAlerts,
    hasUnacknowledged,
    urgentCount,
    warningCount
  } = useBillingAlerts({ 
    organizationId,
    includeAcknowledged: showDismissed 
  })

  // Handle acknowledge alert
  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging(alertId)
    try {
      await acknowledgeAlert(alertId)
    } catch (err) {
      console.error('Failed to acknowledge alert:', err)
    } finally {
      setAcknowledging(null)
    }
  }

  // Handle dismiss alert
  const handleDismiss = async (alertId: string) => {
    setDismissing(alertId)
    try {
      await dismissAlert(alertId)
    } catch (err) {
      console.error('Failed to dismiss alert:', err)
    } finally {
      setDismissing(null)
    }
  }

  // Handle acknowledge all
  const handleAcknowledgeAll = async () => {
    try {
      await acknowledgeAllAlerts()
    } catch (err) {
      console.error('Failed to acknowledge all alerts:', err)
    }
  }

  // Get alert icon
  const getAlertIcon = (alert: BillingAlert) => {
    switch (alert.alert_type) {
      case 'payment_failed':
        return <CreditCard className="h-5 w-5" />
      case 'quota_exceeded':
        return <XCircle className="h-5 w-5" />
      case 'quota_warning':
        return <AlertTriangle className="h-5 w-5" />
      case 'subscription_expired':
        return <Shield className="h-5 w-5" />
      case 'trial_ending':
        return <Clock className="h-5 w-5" />
      case 'feature_limit_reached':
        return <TrendingUp className="h-5 w-5" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  // Get alert action button
  const getAlertAction = (alert: BillingAlert) => {
    switch (alert.alert_type) {
      case 'payment_failed':
        return (
          <Button size="sm" asChild>
            <a href={ROUTES.SETTINGS_BILLING} className="inline-flex items-center">
              Update Payment
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        )
      case 'quota_exceeded':
      case 'feature_limit_reached':
        return (
          <Button size="sm" asChild>
            <a href={ROUTES.PRICING} className="inline-flex items-center">
              Upgrade Plan
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        )
      case 'subscription_expired':
        return (
          <Button size="sm" asChild>
            <a href={ROUTES.BILLING} className="inline-flex items-center">
              Renew Subscription
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        )
      case 'trial_ending':
        return (
          <Button size="sm" asChild>
            <a href={ROUTES.PRICING} className="inline-flex items-center">
              Choose Plan
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        )
      default:
        return null
    }
  }

  // Get alert styling
  const getAlertStyling = (alert: BillingAlert) => {
    const severity = getAlertSeverity(alert)
    const color = getAlertColor(alert)
    
    const baseClasses = "relative p-4 rounded-lg border"
    
    switch (severity) {
      case 'critical':
        return `${baseClasses} bg-red-50 border-red-200 text-red-800`
      case 'high':
        return `${baseClasses} bg-orange-50 border-orange-200 text-orange-800`
      case 'medium':
        return `${baseClasses} bg-yellow-50 border-yellow-200 text-yellow-800`
      case 'low':
      default:
        return `${baseClasses} bg-blue-50 border-blue-200 text-blue-800`
    }
  }

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse p-4 bg-gray-100 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-gray-300 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("p-4 bg-red-50 border border-red-200 rounded-lg", className)}>
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-sm text-red-800">Failed to load alerts: {error}</span>
        </div>
      </div>
    )
  }

  if (!hasAlerts) {
    return (
      <div className={cn("p-6 text-center", className)}>
        <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
        <p className="text-gray-600">No billing alerts at this time.</p>
      </div>
    )
  }

  const displayAlerts = alerts.slice(0, maxAlerts)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with summary */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Billing Alerts</h3>
            <p className="text-sm text-gray-600">
              {urgentCount > 0 && (
                <span className="text-red-600 font-medium">
                  {urgentCount} urgent
                </span>
              )}
              {urgentCount > 0 && warningCount > 0 && <span>, </span>}
              {warningCount > 0 && (
                <span className="text-orange-600 font-medium">
                  {warningCount} warning{warningCount !== 1 ? 's' : ''}
                </span>
              )}
              {urgentCount === 0 && warningCount === 0 && (
                <span>{alerts.length} alert{alerts.length !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          {hasUnacknowledged && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAcknowledgeAll}
            >
              Acknowledge All
            </Button>
          )}
        </div>
      )}

      {/* Alerts list */}
      <div className="space-y-3">
        {displayAlerts.map((alert) => {
          const severity = getAlertSeverity(alert)
          const isUrgent = severity === 'critical' || severity === 'high'
          
          return (
            <div 
              key={alert.id} 
              className={cn(
                getAlertStyling(alert),
                alert.acknowledged && "opacity-75",
                compact && "p-3"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Alert icon */}
                  <div className={cn(
                    "flex-shrink-0 mt-0.5",
                    severity === 'critical' && "text-red-600",
                    severity === 'high' && "text-orange-600", 
                    severity === 'medium' && "text-yellow-600",
                    severity === 'low' && "text-blue-600"
                  )}>
                    {getAlertIcon(alert)}
                  </div>

                  {/* Alert content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={cn(
                        "text-sm font-medium capitalize",
                        compact && "text-xs"
                      )}>
                        {alert.alert_type.replace('_', ' ')}
                      </h4>
                      {isUrgent && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Urgent
                        </span>
                      )}
                      {alert.acknowledged && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Acknowledged
                        </span>
                      )}
                    </div>

                    <p className={cn(
                      "text-sm mb-2",
                      compact && "text-xs"
                    )}>
                      {formatAlertMessage(alert)}
                    </p>

                    {!compact && (
                      <p className="text-xs text-gray-600 mb-3">
                        Suggested action: {getSuggestedAction(alert)}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2">
                      {getAlertAction(alert)}
                      
                      {!alert.acknowledged && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={acknowledging === alert.id}
                        >
                          {acknowledging === alert.id ? 'Acknowledging...' : 'Acknowledge'}
                        </Button>
                      )}
                    </div>

                    {/* Timestamp */}
                    <p className={cn(
                      "text-xs text-gray-500 mt-2",
                      compact && "text-xs"
                    )}>
                      {new Date(alert.triggered_at).toLocaleString()}
                      {alert.acknowledged_at && (
                        <span className="ml-2">
                          • Acknowledged {new Date(alert.acknowledged_at).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Dismiss button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 ml-2"
                  onClick={() => handleDismiss(alert.id)}
                  disabled={dismissing === alert.id}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Show more button */}
      {alerts.length > maxAlerts && (
        <div className="text-center pt-4">
          <Button variant="outline" size="sm">
            Show {alerts.length - maxAlerts} More Alert{alerts.length - maxAlerts !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  )
}