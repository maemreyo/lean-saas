// UPDATED: 2025-06-30 - Created quota usage component for usage tracking and limits

'use client'

import { useState } from 'react'
import { useUsageTracking } from '@/hooks/billing/useUsageTracking'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  RotateCcw,
  ExternalLink,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/shared/constants'
import type { QuotaType, UsageQuota } from '@/shared/types/billing'

interface QuotaUsageProps {
  organizationId?: string
  quotaTypes?: QuotaType[]
  showUpgradePrompts?: boolean
  compact?: boolean
  className?: string
}

interface QuotaCardProps {
  quota: UsageQuota
  utilization: number
  needsWarning: boolean
  showUpgradePrompt: boolean
  compact: boolean
  onUpgrade?: () => void
}

function QuotaCard({ 
  quota, 
  utilization, 
  needsWarning, 
  showUpgradePrompt,
  compact,
  onUpgrade 
}: QuotaCardProps) {
  const isUnlimited = quota.limit_value === -1
  const isExceeded = utilization >= 100
  const isWarning = utilization >= 80 && !isExceeded
  const remaining = isUnlimited ? Infinity : Math.max(0, quota.limit_value - quota.current_usage)

  // Get progress color based on utilization
  const getProgressColor = () => {
    if (isExceeded) return 'bg-red-500'
    if (isWarning) return 'bg-orange-500'
    if (utilization >= 60) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // Get status badge
  const getStatusBadge = () => {
    if (isUnlimited) {
      return <Badge variant="outline" className="text-blue-600 border-blue-200">Unlimited</Badge>
    }
    if (isExceeded) {
      return <Badge variant="destructive">Exceeded</Badge>
    }
    if (isWarning) {
      return <Badge variant="secondary" className="text-orange-700 bg-orange-100">Warning</Badge>
    }
    return <Badge variant="secondary" className="text-green-700 bg-green-100">Good</Badge>
  }

  // Format quota display
  const formatQuotaName = (quotaType: QuotaType) => {
    const names: Record<QuotaType, string> = {
      api_calls: 'API Calls',
      storage_gb: 'Storage',
      projects: 'Projects', 
      team_members: 'Team Members',
      email_sends: 'Email Sends',
      exports: 'Exports',
      backups: 'Backups',
      custom_domains: 'Custom Domains'
    }
    return names[quotaType] || quotaType.replace('_', ' ')
  }

  const formatUsageValue = (value: number, quotaType: QuotaType) => {
    if (quotaType === 'storage_gb') {
      return `${value} GB`
    }
    return value.toLocaleString()
  }

  return (
    <div className={cn(
      "border rounded-lg p-4 bg-white",
      isExceeded && "border-red-200 bg-red-50",
      isWarning && "border-orange-200 bg-orange-50",
      compact && "p-3"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className={cn(
            "font-medium text-gray-900",
            compact ? "text-sm" : "text-base"
          )}>
            {formatQuotaName(quota.quota_type)}
          </h4>
          {!compact && (
            <p className="text-xs text-gray-600 capitalize">
              Resets {quota.reset_period}
            </p>
          )}
        </div>
        {getStatusBadge()}
      </div>

      {/* Usage display */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className={cn(
              "text-gray-600",
              compact ? "text-xs" : "text-sm"
            )}>
              Current Usage
            </span>
            <span className={cn(
              "font-medium",
              compact ? "text-sm" : "text-base",
              isExceeded && "text-red-600",
              isWarning && "text-orange-600"
            )}>
              {formatUsageValue(quota.current_usage, quota.quota_type)}
              {!isUnlimited && (
                <span className="text-gray-400">
                  {' / '}{formatUsageValue(quota.limit_value, quota.quota_type)}
                </span>
              )}
            </span>
          </div>

          {!isUnlimited && (
            <div className="space-y-1">
              <Progress 
                value={Math.min(100, utilization)} 
                className={cn(
                  "h-2",
                  compact && "h-1.5"
                )}
              />
              <div className="flex justify-between items-center">
                <span className={cn(
                  "text-gray-500",
                  compact ? "text-xs" : "text-sm"
                )}>
                  {utilization.toFixed(1)}% used
                </span>
                <span className={cn(
                  "text-gray-500",
                  compact ? "text-xs" : "text-sm"
                )}>
                  {remaining.toLocaleString()} remaining
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Reset information */}
        {!compact && (
          <div className="text-xs text-gray-500 flex items-center space-x-4">
            <span>
              Last reset: {new Date(quota.last_reset).toLocaleDateString()}
            </span>
            <span>•</span>
            <span className="capitalize">
              Next reset: {quota.reset_period}
            </span>
          </div>
        )}

        {/* Action buttons */}
        {(isExceeded || (isWarning && showUpgradePrompt)) && (
          <div className="flex items-center space-x-2 pt-2">
            {isExceeded && (
              <div className="flex items-center text-red-600 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Limit exceeded - upgrade required
              </div>
            )}
            
            {showUpgradePrompt && (
              <Button 
                size="sm" 
                onClick={onUpgrade}
                className="ml-auto"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Upgrade Plan
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function QuotaUsage({ 
  organizationId, 
  quotaTypes,
  showUpgradePrompts = true,
  compact = false,
  className 
}: QuotaUsageProps) {
  const [refreshing, setRefreshing] = useState(false)

  const {
    quotas,
    loading,
    error,
    getQuotaByType,
    getQuotaUtilization,
    needsQuotaWarning,
    refreshData
  } = useUsageTracking({ organizationId })

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshData()
    } finally {
      setRefreshing(false)
    }
  }

  // Handle upgrade
  const handleUpgrade = () => {
    window.location.href = ROUTES.PRICING
  }

  // Filter quotas if specific types requested
  const displayQuotas = quotaTypes 
    ? quotas.filter(quota => quotaTypes.includes(quota.quota_type))
    : quotas

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse border rounded-lg p-4 bg-gray-100">
            <div className="flex justify-between items-center mb-3">
              <div className="h-4 bg-gray-300 rounded w-1/3"></div>
              <div className="h-5 bg-gray-300 rounded w-16"></div>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-gray-300 rounded"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-300 rounded w-16"></div>
                <div className="h-3 bg-gray-300 rounded w-20"></div>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-sm text-red-800">Failed to load quota data: {error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (displayQuotas.length === 0) {
    return (
      <div className={cn("p-6 text-center border rounded-lg bg-gray-50", className)}>
        <Info className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <h3 className="text-sm font-medium text-gray-900 mb-1">No Quotas Found</h3>
        <p className="text-xs text-gray-600">
          {quotaTypes ? 'No quotas found for the specified types.' : 'No usage quotas have been configured.'}
        </p>
      </div>
    )
  }

  // Calculate summary stats
  const totalQuotas = displayQuotas.length
  const warningQuotas = displayQuotas.filter(quota => needsQuotaWarning(quota.quota_type)).length
  const exceededQuotas = displayQuotas.filter(quota => getQuotaUtilization(quota.quota_type) >= 100).length
  const healthyQuotas = totalQuotas - warningQuotas - exceededQuotas

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Usage Quotas</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                {healthyQuotas} healthy
              </span>
              {warningQuotas > 0 && (
                <span className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />
                  {warningQuotas} warning
                </span>
              )}
              {exceededQuotas > 0 && (
                <span className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                  {exceededQuotas} exceeded
                </span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RotateCcw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      )}

      {/* Quota cards */}
      <div className={cn(
        "grid gap-4",
        compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      )}>
        {displayQuotas.map((quota) => (
          <QuotaCard
            key={quota.id}
            quota={quota}
            utilization={getQuotaUtilization(quota.quota_type)}
            needsWarning={needsQuotaWarning(quota.quota_type)}
            showUpgradePrompt={showUpgradePrompts}
            compact={compact}
            onUpgrade={handleUpgrade}
          />
        ))}
      </div>

      {/* Action footer */}
      {(exceededQuotas > 0 || warningQuotas > 0) && showUpgradePrompts && !compact && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-orange-800">
                {exceededQuotas > 0 ? 'Quota Limits Exceeded' : 'Approaching Quota Limits'}
              </h4>
              <p className="text-xs text-orange-700 mt-1">
                {exceededQuotas > 0 
                  ? 'Some features may be restricted. Upgrade your plan to continue.'
                  : 'Consider upgrading your plan to avoid service interruptions.'
                }
              </p>
            </div>
            <Button onClick={handleUpgrade}>
              <TrendingUp className="h-4 w-4 mr-1" />
              Upgrade Plan
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}