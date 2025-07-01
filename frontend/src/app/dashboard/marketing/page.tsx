// CREATED: 2025-07-01 - Main marketing dashboard page

'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { 
  RefreshCw, 
  TrendingUp, 
  Users, 
  Eye, 
  MousePointer, 
  Mail, 
  Share2,
  Target,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  Plus,
  Download,
  ExternalLink
} from 'lucide-react'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { useGrowthAnalytics } from '@/hooks/marketing/useGrowthAnalytics'
import { useLandingPages } from '@/hooks/marketing/useLandingPages'
import { useABTesting } from '@/hooks/marketing/useABTesting'
import { useLeadCapture } from '@/hooks/marketing/useLeadCapture'
import { useEmailCampaigns } from '@/hooks/marketing/useEmailCampaigns'
import { useReferrals } from '@/hooks/marketing/useReferrals'
import { GrowthAnalytics } from '@/components/marketing/GrowthAnalytics'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ================================================
// MAIN MARKETING DASHBOARD COMPONENT
// ================================================

export default function MarketingDashboard() {
  const { organization } = useCurrentOrganization()
  const [refreshing, setRefreshing] = useState(false)
  const [timeframe, setTimeframe] = useState('30d')

  // Marketing data hooks
  const { 
    analytics, 
    loading: analyticsLoading, 
    error: analyticsError,
    fetchAnalytics 
  } = useGrowthAnalytics(organization?.id || '')

  const { 
    landingPages, 
    loading: pagesLoading,
    fetchLandingPages 
  } = useLandingPages(organization?.id || '')

  const { 
    abTests, 
    loading: testsLoading,
    fetchABTests 
  } = useABTesting(organization?.id || '')

  const { 
    leads, 
    analytics: leadAnalytics,
    loading: leadsLoading,
    fetchLeads 
  } = useLeadCapture(organization?.id || '')

  const { 
    campaigns, 
    programStats,
    loading: campaignsLoading,
    fetchCampaigns 
  } = useEmailCampaigns(organization?.id || '')

  const { 
    referralCodes, 
    loading: referralsLoading,
    fetchReferrals 
  } = useReferrals(organization?.id || '')

  // Loading and error states
  const isLoading = analyticsLoading || pagesLoading || testsLoading || leadsLoading || campaignsLoading || referralsLoading
  const hasError = analyticsError

  // Handle refresh all data
  const handleRefreshAll = async () => {
    if (!organization?.id) return
    
    setRefreshing(true)
    try {
      await Promise.all([
        fetchAnalytics?.(),
        fetchLandingPages?.(),
        fetchABTests?.(),
        fetchLeads?.(),
        fetchCampaigns?.(),
        fetchReferrals?.()
      ])
    } finally {
      setRefreshing(false)
    }
  }

  // Auto-refresh on organization change
  useEffect(() => {
    if (organization?.id) {
      handleRefreshAll()
    }
  }, [organization?.id])

  // Calculate key metrics
  const keyMetrics = React.useMemo(() => {
    const publishedPages = landingPages?.filter(page => page.published).length || 0
    const activeTests = abTests?.filter(test => test.status === 'running').length || 0
    const recentLeads = leads?.length || 0
    const activeCampaigns = campaigns?.filter(campaign => campaign.status === 'sending' || campaign.status === 'scheduled').length || 0
    
    // Calculate growth rates (mock for now - replace with actual analytics data)
    return {
      pageViews: {
        current: analytics?.overview?.total_page_views || 0,
        growth: analytics?.trends?.page_views_change || 0
      },
      leads: {
        current: recentLeads,
        growth: leadAnalytics?.monthly_growth || 0
      },
      conversionRate: {
        current: analytics?.overview?.overall_conversion_rate || 0,
        growth: analytics?.trends?.conversion_rate_change || 0
      },
      activeTests: {
        current: activeTests,
        growth: 0 // Tests don't have growth rate
      },
      publishedPages: {
        current: publishedPages,
        growth: 0 // Pages don't have growth rate
      },
      emailDelivered: {
        current: programStats?.total_delivered || 0,
        growth: 0
      }
    }
  }, [analytics, landingPages, abTests, leads, campaigns, leadAnalytics, programStats])

  // Calculate alerts and notifications
  const alerts = React.useMemo(() => {
    const alertList = []
    
    // Low conversion rate alert
    if (keyMetrics.conversionRate.current < 2) {
      alertList.push({
        type: 'warning',
        message: 'Conversion rate below 2% - consider optimization',
        action: 'View Analytics'
      })
    }

    // No active tests alert
    if (keyMetrics.activeTests.current === 0 && keyMetrics.publishedPages.current > 0) {
      alertList.push({
        type: 'info',
        message: 'No active A/B tests running',
        action: 'Start Test'
      })
    }

    // Low email engagement
    const openRate = programStats?.overall_open_rate || 0
    if (openRate < 20 && programStats?.total_sent > 100) {
      alertList.push({
        type: 'warning',
        message: `Email open rate at ${openRate.toFixed(1)}% - below industry average`,
        action: 'Optimize Campaigns'
      })
    }

    return alertList
  }, [keyMetrics, programStats])

  const hasUrgent = alerts.some(alert => alert.type === 'urgent')
  const hasWarnings = alerts.some(alert => alert.type === 'warning')

  // Loading state
  if (isLoading && !analytics) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          {/* Header skeleton */}
          <div className="flex justify-between items-start">
            <div>
              <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-96 bg-gray-200 rounded"></div>
            </div>
            <div className="h-10 w-24 bg-gray-200 rounded"></div>
          </div>
          
          {/* Metrics cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-6 border rounded-lg">
                <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 w-16 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 w-24 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          
          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Error state
  if (hasError) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Failed to Load Marketing Data
                </h3>
                <p className="text-gray-600 mb-4">{analyticsError}</p>
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
              Marketing & Growth
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Track your marketing performance and grow your customer base
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            {/* Alert badges */}
            {hasUrgent && (
              <Badge variant="destructive">
                {alerts.filter(a => a.type === 'urgent').length} Urgent
              </Badge>
            )}
            {hasWarnings && !hasUrgent && (
              <Badge variant="secondary" className="text-orange-700 bg-orange-100">
                {alerts.filter(a => a.type === 'warning').length} Warning{alerts.filter(a => a.type === 'warning').length !== 1 ? 's' : ''}
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

            <Button asChild size="sm">
              <Link href="/dashboard/marketing/landing-pages">
                <Plus className="h-4 w-4 mr-1" />
                New Campaign
              </Link>
            </Button>
          </div>
        </div>

        {/* Alert Banner */}
        {alerts.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-orange-800">
                      {alerts.length} Marketing Alert{alerts.length !== 1 ? 's' : ''}
                    </h4>
                    <p className="text-xs text-orange-700">
                      {alerts[0].message}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-orange-700 border-orange-300">
                  View All Alerts
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Page Views */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Page Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {keyMetrics.pageViews.current.toLocaleString()}
              </div>
              <div className={cn(
                "text-xs flex items-center",
                keyMetrics.pageViews.growth >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {keyMetrics.pageViews.growth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                )}
                {Math.abs(keyMetrics.pageViews.growth).toFixed(1)}% from last month
              </div>
            </CardContent>
          </Card>

          {/* Leads */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {keyMetrics.leads.current.toLocaleString()}
              </div>
              <div className={cn(
                "text-xs flex items-center",
                keyMetrics.leads.growth >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {keyMetrics.leads.growth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                )}
                {Math.abs(keyMetrics.leads.growth).toFixed(1)}% from last month
              </div>
            </CardContent>
          </Card>

          {/* Conversion Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {keyMetrics.conversionRate.current.toFixed(1)}%
              </div>
              <div className={cn(
                "text-xs flex items-center",
                keyMetrics.conversionRate.growth >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {keyMetrics.conversionRate.growth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                )}
                {Math.abs(keyMetrics.conversionRate.growth).toFixed(1)}% from last month
              </div>
            </CardContent>
          </Card>

          {/* Active A/B Tests */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tests</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {keyMetrics.activeTests.current}
              </div>
              <p className="text-xs text-muted-foreground">
                Running experiments
              </p>
            </CardContent>
          </Card>

          {/* Published Pages */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Pages</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {keyMetrics.publishedPages.current}
              </div>
              <p className="text-xs text-muted-foreground">
                Published landing pages
              </p>
            </CardContent>
          </Card>

          {/* Email Delivered */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {keyMetrics.emailDelivered.current.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="tests">A/B Tests</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Activity</CardTitle>
                      <CardDescription>Latest marketing activities and events</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/marketing/analytics">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics?.recent_activity?.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {activity.metric_type === 'page_view' && <Eye className="h-4 w-4 text-blue-500" />}
                        {activity.metric_type === 'lead_captured' && <Users className="h-4 w-4 text-green-500" />}
                        {activity.metric_type === 'email_campaign_sent' && <Mail className="h-4 w-4 text-purple-500" />}
                        {activity.metric_type === 'ab_test_created' && <BarChart3 className="h-4 w-4 text-orange-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.display_name || activity.metric_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {activity.time_ago || 'Recently'}
                        </p>
                      </div>
                      <div className="text-sm text-gray-900 font-medium">
                        {activity.metric_value}
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8">
                      <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-gray-500">No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Performing Content */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Top Performers</CardTitle>
                      <CardDescription>Best performing content and campaigns</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/marketing/landing-pages">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {landingPages?.slice(0, 5).map((page, index) => (
                    <div key={page.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {page.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {page.view_count || 0} views • {((page.conversion_count || 0) / Math.max(page.view_count || 1, 1) * 100).toFixed(1)}% conversion
                        </p>
                      </div>
                      <Badge variant={index < 3 ? 'default' : 'secondary'}>
                        #{index + 1}
                      </Badge>
                    </div>
                  )) || (
                    <div className="text-center py-8">
                      <TrendingUp className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-gray-500">No published content yet</p>
                      <Button className="mt-2" size="sm" asChild>
                        <Link href="/dashboard/marketing/landing-pages">
                          Create Landing Page
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common marketing tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2" asChild>
                    <Link href="/dashboard/marketing/landing-pages">
                      <Zap className="h-6 w-6 text-blue-500" />
                      <span className="text-sm font-medium">Create Landing Page</span>
                    </Link>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2" asChild>
                    <Link href="/dashboard/marketing/ab-tests">
                      <BarChart3 className="h-6 w-6 text-green-500" />
                      <span className="text-sm font-medium">Start A/B Test</span>
                    </Link>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2" asChild>
                    <Link href="/dashboard/marketing/email">
                      <Mail className="h-6 w-6 text-purple-500" />
                      <span className="text-sm font-medium">Send Campaign</span>
                    </Link>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2" asChild>
                    <Link href="/dashboard/marketing/leads">
                      <Download className="h-6 w-6 text-orange-500" />
                      <span className="text-sm font-medium">Export Leads</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {/* Performance content - integrate GrowthAnalytics component */}
            <GrowthAnalytics organizationId={organization?.id || ''} />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            {/* Campaigns overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Email Campaigns</CardTitle>
                  <CardDescription>Recent email marketing campaigns</CardDescription>
                </CardHeader>
                <CardContent>
                  {campaigns?.slice(0, 5).map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-sm">{campaign.name}</p>
                        <p className="text-sm text-gray-500">{campaign.recipient_count || 0} recipients</p>
                      </div>
                      <Badge variant={
                        campaign.status === 'sent' ? 'default' :
                        campaign.status === 'sending' ? 'secondary' :
                        'outline'
                      }>
                        {campaign.status}
                      </Badge>
                    </div>
                  )) || (
                    <p className="text-center text-gray-500 py-4">No campaigns yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Landing Pages</CardTitle>
                  <CardDescription>Published landing pages performance</CardDescription>
                </CardHeader>
                <CardContent>
                  {landingPages?.filter(page => page.published).slice(0, 5).map((page) => (
                    <div key={page.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-sm">{page.title}</p>
                        <p className="text-sm text-gray-500">{page.view_count || 0} views</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{((page.conversion_count || 0) / Math.max(page.view_count || 1, 1) * 100).toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">conversion</p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-center text-gray-500 py-4">No published pages yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tests" className="space-y-6">
            {/* A/B Tests overview */}
            <Card>
              <CardHeader>
                <CardTitle>A/B Tests</CardTitle>
                <CardDescription>Current and recent experiments</CardDescription>
              </CardHeader>
              <CardContent>
                {abTests?.slice(0, 5).map((test) => (
                  <div key={test.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{test.name}</p>
                      <p className="text-sm text-gray-500">{test.description || 'No description'}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        test.status === 'running' ? 'default' :
                        test.status === 'completed' ? 'secondary' :
                        'outline'
                      }>
                        {test.status}
                      </Badge>
                      {test.statistical_significance && (
                        <p className="text-xs text-gray-500 mt-1">
                          {(test.statistical_significance * 100).toFixed(1)}% significance
                        </p>
                      )}
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8">
                    <BarChart3 className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-gray-500">No A/B tests created yet</p>
                    <Button className="mt-2" size="sm" asChild>
                      <Link href="/dashboard/marketing/ab-tests">
                        Create A/B Test
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Detailed analytics - could integrate more specific analytics components */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Organic</span>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Direct</span>
                      <span className="text-sm font-medium">30%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Referral</span>
                      <span className="text-sm font-medium">15%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Social</span>
                      <span className="text-sm font-medium">10%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conversion Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Visitors</span>
                      <span className="text-sm font-medium">1,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Signups</span>
                      <span className="text-sm font-medium">50</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Trials</span>
                      <span className="text-sm font-medium">25</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Customers</span>
                      <span className="text-sm font-medium">10</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Goals Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Monthly Leads</span>
                        <span>75/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Conversion Rate</span>
                        <span>2.1/3.0%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '70%' }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}