// UPDATED: 2025-06-30 - Created usage dashboard component for metered billing

'use client'

import { useState } from 'react'
import { useUsageTracking } from '@/hooks/billing/useUsageTracking'
import { useBillingAlerts } from '@/hooks/billing/useBillingAlerts'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AlertTriangle, TrendingUp, Calendar, DollarSign, Activity, Users } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/shared/utils'
import type { QuotaType, UsageEventType } from '@/shared/types/billing'

interface UsageDashboardProps {
  organizationId?: string
  className?: string
}

export function UsageDashboard({ organizationId, className }: UsageDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  
  const {
    usageAnalytics,
    quotas,
    loading: usageLoading,
    error: usageError,
    getQuotaByType,
    getQuotaUtilization,
    formatQuotaDisplay,
    needsQuotaWarning,
    refreshData
  } = useUsageTracking({ organizationId })

  const {
    alerts,
    urgentCount,
    warningCount,
    loading: alertsLoading
  } = useBillingAlerts({ organizationId })

  const loading = usageLoading || alertsLoading

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (usageError) {
    return (
      <div className={`${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Usage Data</h3>
              <p className="text-gray-600 mb-4">{usageError}</p>
              <Button onClick={refreshData}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate key metrics
  const totalCost = usageAnalytics?.projectedCost || 0
  const currentPeriodUsage = usageAnalytics?.currentPeriodUsage || 0
  const previousPeriodUsage = usageAnalytics?.previousPeriodUsage || 0
  const usageGrowth = previousPeriodUsage > 0 
    ? ((currentPeriodUsage - previousPeriodUsage) / previousPeriodUsage) * 100 
    : 0

  // Get quota data for key metrics
  const apiCallsQuota = getQuotaByType('api_calls')
  const storageQuota = getQuotaByType('storage_gb')
  const projectsQuota = getQuotaByType('projects')
  const membersQuota = getQuotaByType('team_members')

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usage Dashboard</h2>
          <p className="mt-1 text-sm text-gray-600">
            Monitor your usage and billing across all features
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {(urgentCount > 0 || warningCount > 0) && (
            <Badge variant={urgentCount > 0 ? 'destructive' : 'secondary'}>
              {urgentCount + warningCount} Alert{urgentCount + warningCount !== 1 ? 's' : ''}
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshData}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Month Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCost / 100)}</div>
            <p className="text-xs text-muted-foreground">
              {usageGrowth >= 0 ? '+' : ''}{usageGrowth.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        {/* API Calls Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apiCallsQuota ? formatNumber(apiCallsQuota.current_usage) : '0'}
            </div>
            <div className="mt-2">
              <Progress 
                value={apiCallsQuota ? getQuotaUtilization('api_calls') : 0} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {apiCallsQuota ? formatQuotaDisplay('api_calls') : 'No quota set'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {storageQuota ? `${storageQuota.current_usage} GB` : '0 GB'}
            </div>
            <div className="mt-2">
              <Progress 
                value={storageQuota ? getQuotaUtilization('storage_gb') : 0} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {storageQuota ? formatQuotaDisplay('storage_gb') : 'No quota set'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {membersQuota ? formatNumber(membersQuota.current_usage) : '0'}
            </div>
            <div className="mt-2">
              <Progress 
                value={membersQuota ? getQuotaUtilization('team_members') : 0} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {membersQuota ? formatQuotaDisplay('team_members') : 'No quota set'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Usage Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quotas">Quotas</TabsTrigger>
          <TabsTrigger value="usage">Usage Details</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usage by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Usage by Type</CardTitle>
                <CardDescription>Current month breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usageAnalytics?.usageByType && Object.entries(usageAnalytics.usageByType).map(([type, usage]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {type.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatNumber(usage)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>Latest usage notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {alert.alert_type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-600">
                          {alert.quota_type && (
                            <>
                              {alert.quota_type.replace('_', ' ')}: {alert.current_usage?.toLocaleString()} / {alert.limit_value?.toLocaleString()}
                            </>
                          )}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {new Date(alert.triggered_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No recent alerts
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quotas" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quotas.map((quota) => {
              const utilization = getQuotaUtilization(quota.quota_type)
              const needsWarning = needsQuotaWarning(quota.quota_type)
              
              return (
                <Card key={quota.id} className={needsWarning ? 'border-orange-200 bg-orange-50' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg capitalize">
                        {quota.quota_type.replace('_', ' ')}
                      </CardTitle>
                      {needsWarning && (
                        <Badge variant="secondary" className="text-orange-700 bg-orange-100">
                          Warning
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Current Usage</span>
                          <span className="font-medium">
                            {formatQuotaDisplay(quota.quota_type)}
                          </span>
                        </div>
                        <Progress value={utilization} className="h-3" />
                        <p className="text-xs text-gray-600 mt-1">
                          {utilization.toFixed(1)}% of limit used
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Reset Period</span>
                          <p className="font-medium capitalize">{quota.reset_period}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Last Reset</span>
                          <p className="font-medium">
                            {new Date(quota.last_reset).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage Details</CardTitle>
              <CardDescription>Detailed breakdown of your usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Usage details table would go here */}
                <p className="text-sm text-gray-500 text-center py-8">
                  Detailed usage table coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Usage Trends</CardTitle>
                  <CardDescription>Track your usage over time</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                    <Button
                      key={range}
                      variant={timeRange === range ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange(range)}
                    >
                      {range}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center">
                <p className="text-sm text-gray-500">
                  Usage trend chart coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}