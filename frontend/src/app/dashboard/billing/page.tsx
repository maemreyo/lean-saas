// UPDATED: 2025-06-30 - Enhanced billing page with advanced usage tracking and metered billing

'use client'

import { useState } from 'react'
import { useEnhancedSubscription } from '@/hooks/billing/useEnhancedSubscription'
import { useUsageTracking } from '@/hooks/billing/useUsageTracking'
import { useBillingAlerts } from '@/hooks/billing/useBillingAlerts'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { UsageDashboard } from '@/components/billing/UsageDashboard'
import { BillingAlerts } from '@/components/billing/BillingAlerts'
import { QuotaUsage } from '@/components/billing/QuotaUsage'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  DollarSign,
  FileText,
  Settings,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/shared/utils'
import { ROUTES } from '@/shared/constants'

export default function EnhancedBillingPage() {
  const [refreshing, setRefreshing] = useState(false)

  // Enhanced subscription data
  const {
    subscription,
    loading: subscriptionLoading,
    error: subscriptionError,
    nextInvoice,
    invoiceItems,
    paymentFailures,
    status,
    monthlyUsageCost,
    createCheckoutSession,
    createPortalSession,
    retryFailedPayment,
    refreshData: refreshSubscription
  } = useEnhancedSubscription()

  // Usage tracking data
  const {
    usageAnalytics,
    quotas,
    loading: usageLoading,
    refreshData: refreshUsage
  } = useUsageTracking()

  // Billing alerts
  const {
    alerts,
    urgentCount,
    warningCount,
    hasUrgent,
    hasPaymentIssues,
    loading: alertsLoading
  } = useBillingAlerts()

  const loading = subscriptionLoading || usageLoading || alertsLoading

  // Handle refresh all data
  const handleRefreshAll = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refreshSubscription(),
        refreshUsage()
      ])
    } finally {
      setRefreshing(false)
    }
  }

  // Handle payment retry
  const handleRetryPayment = async (paymentFailureId: string) => {
    try {
      await retryFailedPayment(paymentFailureId)
    } catch (error) {
      console.error('Failed to retry payment:', error)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (subscriptionError) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Failed to Load Billing Data
                </h3>
                <p className="text-gray-600 mb-4">{subscriptionError}</p>
                <Button onClick={handleRefreshAll}>Try Again</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Billing & Usage
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your subscription, usage, and billing settings
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            {/* Alert badges */}
            {hasUrgent && (
              <Badge variant="destructive">
                {urgentCount} Urgent Alert{urgentCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && !hasUrgent && (
              <Badge variant="secondary" className="text-orange-700 bg-orange-100">
                {warningCount} Warning{warningCount !== 1 ? 's' : ''}
              </Badge>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefreshAll}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Alert Banner for Payment Issues */}
        {hasPaymentIssues && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">
                      Payment Issues Detected
                    </h4>
                    <p className="text-xs text-red-700">
                      {paymentFailures.length} failed payment{paymentFailures.length !== 1 ? 's' : ''} require attention
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {paymentFailures.slice(0, 1).map((failure) => (
                    <Button
                      key={failure.id}
                      size="sm"
                      onClick={() => handleRetryPayment(failure.id)}
                    >
                      Retry Payment
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" asChild>
                    <a href={ROUTES.SETTINGS_BILLING}>
                      Update Payment Method
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Current Subscription */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscription?.status === 'active' ? 'Active' : subscription?.status || 'No Plan'}
              </div>
              <p className="text-xs text-muted-foreground">
                {subscription?.current_period_end && (
                  <>Renews {formatDate(subscription.current_period_end)}</>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Monthly Usage Cost */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usage This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(monthlyUsageCost / 100)}
              </div>
              <p className="text-xs text-muted-foreground">
                Metered usage charges
              </p>
            </CardContent>
          </Card>

          {/* Next Invoice */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Invoice</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {nextInvoice ? formatCurrency(nextInvoice.amount / 100) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {nextInvoice?.date && formatDate(nextInvoice.date)}
              </p>
            </CardContent>
          </Card>

          {/* Active Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {urgentCount + warningCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {urgentCount > 0 ? `${urgentCount} urgent` : `${warningCount} warnings`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="usage">Usage Details</TabsTrigger>
            <TabsTrigger value="quotas">Quotas</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Subscription Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Current Subscription</CardTitle>
                      <CardDescription>Manage your plan and billing</CardDescription>
                    </div>
                    <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
                      {subscription?.status || 'No subscription'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subscription ? (
                    <>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Status</span>
                          <p className="font-medium capitalize">{subscription.status}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Current Period</span>
                          <p className="font-medium">
                            {formatDate(subscription.current_period_end)}
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button onClick={createPortalSession} className="flex-1">
                          <Settings className="h-4 w-4 mr-1" />
                          Manage Subscription
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        No Active Subscription
                      </h4>
                      <p className="text-gray-600 mb-4">
                        Choose a plan to get started with premium features
                      </p>
                      <Button asChild>
                        <a href={ROUTES.PRICING}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Plans
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Usage Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Usage Summary</CardTitle>
                  <CardDescription>Current month usage overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {usageAnalytics?.usageByType && Object.entries(usageAnalytics.usageByType).slice(0, 4).map(([type, usage]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {type.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-gray-600">
                          {usage.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    
                    <div className="pt-2 border-t">
                      <Button variant="outline" size="sm" className="w-full">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        View Detailed Usage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="usage">
            <UsageDashboard />
          </TabsContent>

          <TabsContent value="quotas">
            <QuotaUsage showUpgradePrompts={true} />
          </TabsContent>

          <TabsContent value="alerts">
            <BillingAlerts showDismissed={false} />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Your billing history and invoice details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoiceItems.length > 0 ? (
                    invoiceItems.slice(0, 10).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(item.created_at)} • {item.quantity} × {formatCurrency(item.unit_price / 100)}
                          </p>
                        </div>
                        <span className="font-medium">
                          {formatCurrency(item.amount / 100)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Invoices Yet</h3>
                      <p className="text-gray-600">Your invoice history will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}