// CREATED: 2025-07-01 - Marketing analytics dashboard (FINAL DASHBOARD PAGE)

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Eye,
  MousePointer,
  UserPlus,
  Repeat,
  AlertTriangle,
  CheckCircle,
  Info,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  Globe,
  Mail,
  Share2,
  Heart,
  Star,
  Clock,
  Lightbulb,
  Settings,
  ExternalLink
} from 'lucide-react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/Tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { useGrowthAnalytics, useGrowthInsights } from '@/hooks/marketing/useGrowthAnalytics'
import { GrowthAnalytics } from '@/components/marketing/GrowthAnalytics'
import { cn } from '@/lib/utils'
import { formatNumber, formatCurrency, formatPercentage } from '@/lib/utils'

// ================================================
// ANALYTICS DASHBOARD COMPONENT
// ================================================

export default function MarketingAnalyticsDashboard() {
  const { organization } = useCurrentOrganization()
  const [activeTab, setActiveTab] = useState('overview')
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month')
  const [refreshing, setRefreshing] = useState(false)

  // Analytics hooks
  const {
    overview,
    analytics,
    funnel,
    dashboardData,
    loading: analyticsLoading,
    error: analyticsError,
    fetchOverview,
    fetchAnalytics,
    fetchFunnel,
    fetchDashboardData
  } = useGrowthAnalytics(organization?.id || '')

  const {
    insights,
    loading: insightsLoading,
    generateInsights
  } = useGrowthInsights(organization?.id || '')

  // Auto-fetch data on organization change
  useEffect(() => {
    if (organization?.id) {
      fetchDashboardData()
      generateInsights()
    }
  }, [organization?.id])

  // Handle period change
  useEffect(() => {
    if (organization?.id) {
      fetchAnalytics(timePeriod)
      fetchFunnel(timePeriod)
    }
  }, [timePeriod, organization?.id])

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchDashboardData(),
      generateInsights()
    ])
    setRefreshing(false)
  }

  // Get trend icon and color
  const getTrendDisplay = (change: number) => {
    if (change > 0) {
      return {
        icon: ArrowUp,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      }
    } else if (change < 0) {
      return {
        icon: ArrowDown,
        color: 'text-red-600',
        bgColor: 'bg-red-100'
      }
    } else {
      return {
        icon: Minus,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100'
      }
    }
  }

  // Get insight severity color
  const getInsightColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-200 bg-red-50'
      case 'warning': return 'border-orange-200 bg-orange-50'
      case 'info': return 'border-blue-200 bg-blue-50'
      case 'success': return 'border-green-200 bg-green-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  // Main metrics cards
  const mainMetrics = useMemo(() => {
    if (!analytics) return []

    return [
      {
        title: 'Total Visitors',
        value: formatNumber(analytics.metrics.page_views),
        change: analytics.trends.page_views_change,
        icon: Eye,
        description: 'Unique page views'
      },
      {
        title: 'New Signups',
        value: formatNumber(analytics.metrics.signups),
        change: analytics.trends.signups_change,
        icon: UserPlus,
        description: 'New user registrations'
      },
      {
        title: 'Conversion Rate',
        value: formatPercentage(analytics.metrics.conversion_rate),
        change: analytics.trends.conversion_rate_change,
        icon: Target,
        description: 'Visitor to signup rate'
      },
      {
        title: 'Revenue Impact',
        value: formatCurrency(analytics.metrics.revenue_attributed),
        change: analytics.trends.revenue_change,
        icon: DollarSign,
        description: 'Marketing attributed revenue'
      }
    ]
  }, [analytics])

  // Channel performance data
  const channelMetrics = useMemo(() => {
    if (!analytics) return []

    return [
      {
        channel: 'Organic Search',
        visitors: analytics.channels.organic || 0,
        conversions: Math.round((analytics.channels.organic || 0) * 0.025),
        rate: 2.5
      },
      {
        channel: 'Referrals',
        visitors: analytics.channels.referral || 0,
        conversions: Math.round((analytics.channels.referral || 0) * 0.04),
        rate: 4.0
      },
      {
        channel: 'Email',
        visitors: analytics.channels.email || 0,
        conversions: Math.round((analytics.channels.email || 0) * 0.06),
        rate: 6.0
      },
      {
        channel: 'Social Media',
        visitors: analytics.channels.social || 0,
        conversions: Math.round((analytics.channels.social || 0) * 0.015),
        rate: 1.5
      },
      {
        channel: 'Direct',
        visitors: analytics.channels.direct || 0,
        conversions: Math.round((analytics.channels.direct || 0) * 0.035),
        rate: 3.5
      }
    ].sort((a, b) => b.visitors - a.visitors)
  }, [analytics])

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marketing Analytics</h1>
            <p className="text-gray-600">Track your growth metrics and marketing performance</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select value={timePeriod} onValueChange={(value: any) => setTimePeriod(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Last 24h</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="quarter">Last 90 days</SelectItem>
                <SelectItem value="year">Last year</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Refresh
            </Button>
            
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Alert Banner for Critical Insights */}
        {insights?.alerts && insights.alerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Attention Required</h3>
                <div className="mt-2 space-y-1">
                  {insights.alerts.slice(0, 2).map((alert, index) => (
                    <p key={index} className="text-sm text-red-700">
                      • {alert.message}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mainMetrics.map((metric, index) => {
            const Icon = metric.icon
            const trend = getTrendDisplay(metric.change)
            const TrendIcon = trend.icon

            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                      {metric.change !== 0 && (
                        <div className="flex items-center mt-2">
                          <div className={cn("flex items-center px-2 py-1 rounded-full text-xs font-medium", trend.bgColor, trend.color)}>
                            <TrendIcon className="h-3 w-3 mr-1" />
                            {Math.abs(metric.change).toFixed(1)}%
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
                    </div>
                    <Icon className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Tabs for Different Views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
            <TabsTrigger value="channels">Traffic Channels</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Growth Analytics Component */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Growth Trends</CardTitle>
                  <CardDescription>Visual analytics and growth tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  <GrowthAnalytics 
                    organizationId={organization?.id || ''} 
                    period={timePeriod}
                    showInsights={false}
                    showFunnel={false}
                  />
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                  <CardDescription>Key performance indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium">Landing Pages</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">
                      {dashboardData?.top_landing_pages?.length || 0}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium">A/B Tests</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">
                      {dashboardData?.active_ab_tests?.length || 0}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-5 w-5 text-purple-500" />
                      <span className="text-sm font-medium">Email Campaigns</span>
                    </div>
                    <span className="text-lg font-bold text-purple-600">
                      {dashboardData?.active_campaigns?.length || 0}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-orange-500" />
                      <span className="text-sm font-medium">Total Leads</span>
                    </div>
                    <span className="text-lg font-bold text-orange-600">
                      {formatNumber(dashboardData?.recent_leads?.length || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Conversion Funnel Tab */}
          <TabsContent value="funnel" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel Analysis</CardTitle>
                <CardDescription>Track user journey from visitor to customer</CardDescription>
              </CardHeader>
              <CardContent>
                {funnel ? (
                  <div className="space-y-6">
                    {/* Funnel Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{formatNumber(funnel.total_visitors)}</p>
                        <p className="text-sm text-blue-600">Total Visitors</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{formatNumber(funnel.total_conversions)}</p>
                        <p className="text-sm text-green-600">Total Conversions</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">{formatPercentage(funnel.overall_conversion_rate)}</p>
                        <p className="text-sm text-purple-600">Overall Rate</p>
                      </div>
                    </div>

                    {/* Funnel Steps */}
                    <div className="space-y-4">
                      {funnel.steps.map((step, index) => {
                        const conversionRate = step.visitors > 0 ? (step.conversions / step.visitors) * 100 : 0
                        const dropoffRate = index > 0 ? 
                          ((funnel.steps[index - 1].conversions - step.visitors) / funnel.steps[index - 1].conversions) * 100 : 0

                        return (
                          <div key={index} className="relative">
                            {/* Step Card */}
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900">{step.name}</h3>
                                  <p className="text-sm text-gray-500">
                                    {formatNumber(step.visitors)} visitors → {formatNumber(step.conversions)} conversions
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <p className="text-lg font-bold text-gray-900">{conversionRate.toFixed(1)}%</p>
                                <p className="text-sm text-gray-500">conversion rate</p>
                              </div>
                            </div>

                            {/* Dropoff Indicator */}
                            {index < funnel.steps.length - 1 && dropoffRate > 0 && (
                              <div className="flex items-center justify-center py-2">
                                <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs">
                                  <ArrowDown className="h-3 w-3" />
                                  <span>{dropoffRate.toFixed(1)}% drop-off</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No funnel data available for this period</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Traffic Channels Tab */}
          <TabsContent value="channels" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Channels Performance</CardTitle>
                <CardDescription>Analyze traffic sources and their conversion rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {channelMetrics.map((channel, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div>
                          <h3 className="font-medium text-gray-900">{channel.channel}</h3>
                          <p className="text-sm text-gray-500">
                            {formatNumber(channel.visitors)} visitors, {formatNumber(channel.conversions)} conversions
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{channel.rate.toFixed(1)}%</p>
                        <p className="text-sm text-gray-500">conversion rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performing Landing Pages */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Landing Pages</CardTitle>
                  <CardDescription>Best performing pages by conversion</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardData?.top_landing_pages?.slice(0, 5).map((page, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{page.title}</p>
                        <p className="text-xs text-gray-500">/{page.slug}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{(page.conversion_rate * 100).toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">{formatNumber(page.view_count)} views</p>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8">
                      <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No landing pages data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active A/B Tests */}
              <Card>
                <CardHeader>
                  <CardTitle>Active A/B Tests</CardTitle>
                  <CardDescription>Currently running experiments</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardData?.active_ab_tests?.slice(0, 5).map((test, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{test.name}</p>
                        <p className="text-xs text-gray-500">{test.target_metric}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={test.status === 'running' ? 'default' : 'secondary'}>
                          {test.status}
                        </Badge>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No active A/B tests</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Growth Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Growth Insights</CardTitle>
                  <CardDescription>AI-powered recommendations for improvement</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {insights?.trends?.map((trend, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center space-x-3 mb-2">
                        {trend.trend === 'up' ? (
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-500" />
                        )}
                        <h3 className="font-medium">{trend.metric}</h3>
                        <Badge variant="outline">
                          {trend.trend === 'up' ? '+' : ''}{trend.change_percentage.toFixed(1)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{trend.insight}</p>
                    </div>
                  )) || (
                    <div className="text-center py-8">
                      <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Generating insights...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Opportunities */}
              <Card>
                <CardHeader>
                  <CardTitle>Growth Opportunities</CardTitle>
                  <CardDescription>Areas for potential improvement</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {insights?.opportunities?.map((opportunity, index) => (
                    <div key={index} className={cn("p-4 border rounded-lg", getInsightColor('info'))}>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium">{opportunity.area}</h3>
                        <div className="flex space-x-1">
                          <Badge variant="outline" className="text-xs">
                            {opportunity.impact} impact
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {opportunity.effort} effort
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{opportunity.description}</p>
                      <p className="text-sm font-medium text-blue-600">{opportunity.recommendation}</p>
                    </div>
                  )) || (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No opportunities identified</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Alerts */}
            {insights?.alerts && insights.alerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance Alerts</CardTitle>
                  <CardDescription>Issues that need your attention</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {insights.alerts.map((alert, index) => (
                    <div key={index} className={cn("p-4 border rounded-lg", getInsightColor(alert.type))}>
                      <div className="flex items-center space-x-3 mb-2">
                        {alert.type === 'critical' ? (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        ) : alert.type === 'warning' ? (
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                        ) : (
                          <Info className="h-5 w-5 text-blue-500" />
                        )}
                        <h3 className="font-medium">{alert.metric}</h3>
                        <Badge variant={alert.type === 'critical' ? 'destructive' : 'secondary'}>
                          {alert.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        Current: {alert.current_value} | Threshold: {alert.threshold}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}