// CREATED: 2025-07-01 - Growth analytics component for marketing module

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useGrowthAnalytics } from '@/hooks/marketing/useGrowthAnalytics'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Progress } from '@/components/ui/Progress'
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
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ================================================
// TYPES & INTERFACES
// ================================================

interface GrowthAnalyticsProps {
  organizationId: string
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  showInsights?: boolean
  showFunnel?: boolean
  className?: string
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: {
    value: number
    direction: 'up' | 'down' | 'stable'
    period: string
  }
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  format?: 'number' | 'currency' | 'percentage'
}

interface FunnelStepProps {
  step: {
    name: string
    visitors: number
    conversions: number
    rate: number
  }
  index: number
  total: number
}

interface InsightCardProps {
  insight: {
    type: 'warning' | 'critical' | 'info' | 'success'
    metric: string
    message: string
    recommendation?: string
    priority: 'high' | 'medium' | 'low'
  }
}

// ================================================
// METRIC CARD COMPONENT
// ================================================

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = 'blue',
  format = 'number'
}: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200'
  }

  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'currency':
        return `$${val.toLocaleString()}`
      case 'percentage':
        return `${val.toFixed(1)}%`
      default:
        return val.toLocaleString()
    }
  }

  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.direction === 'up') return <ArrowUp className="h-3 w-3" />
    if (trend.direction === 'down') return <ArrowDown className="h-3 w-3" />
    return <Minus className="h-3 w-3" />
  }

  const getTrendColor = () => {
    if (!trend) return ''
    if (trend.direction === 'up') return 'text-green-600'
    if (trend.direction === 'down') return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("p-2 rounded-lg border", colorClasses[color])}>
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-medium text-gray-900">{title}</h3>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">
              {formatValue(value)}
            </div>
            {subtitle && (
              <div className="text-sm text-gray-600">{subtitle}</div>
            )}
          </div>
        </div>

        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full bg-gray-50",
            getTrendColor()
          )}>
            {getTrendIcon()}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ================================================
// FUNNEL STEP COMPONENT
// ================================================

function FunnelStep({ step, index, total }: FunnelStepProps) {
  const width = (step.conversions / step.visitors) * 100
  const isLast = index === total - 1

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
            {index + 1}
          </div>
          <span className="font-medium text-gray-900">{step.name}</span>
        </div>
        <div className="text-sm text-gray-600">
          {step.rate.toFixed(1)}% conversion
        </div>
      </div>
      
      <div className="bg-gray-200 rounded-full h-8 mb-4 relative overflow-hidden">
        <div 
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
          style={{ width: `${width}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-3 text-sm">
          <span className="text-white font-medium">
            {step.conversions.toLocaleString()}
          </span>
          <span className="text-gray-700">
            {step.visitors.toLocaleString()}
          </span>
        </div>
      </div>

      {!isLast && (
        <div className="flex justify-center mb-4">
          <ArrowDown className="h-5 w-5 text-gray-400" />
        </div>
      )}
    </div>
  )
}

// ================================================
// INSIGHT CARD COMPONENT
// ================================================

function InsightCard({ insight }: InsightCardProps) {
  const typeConfig = {
    warning: {
      icon: AlertTriangle,
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      iconColor: 'text-yellow-600'
    },
    critical: {
      icon: AlertTriangle,
      color: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-600'
    },
    info: {
      icon: Info,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      iconColor: 'text-blue-600'
    },
    success: {
      icon: CheckCircle,
      color: 'bg-green-50 border-green-200 text-green-800',
      iconColor: 'text-green-600'
    }
  }

  const config = typeConfig[insight.type]
  const Icon = config.icon

  return (
    <div className={cn("border rounded-lg p-4", config.color)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5", config.iconColor)} />
        <div className="flex-1">
          <div className="font-medium mb-1">{insight.metric}</div>
          <div className="text-sm mb-2">{insight.message}</div>
          {insight.recommendation && (
            <div className="text-sm font-medium">
              💡 {insight.recommendation}
            </div>
          )}
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            insight.priority === 'high' ? 'border-red-300 text-red-700' :
            insight.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
            'border-gray-300 text-gray-700'
          )}
        >
          {insight.priority}
        </Badge>
      </div>
    </div>
  )
}

// ================================================
// MAIN COMPONENT
// ================================================

export function GrowthAnalytics({
  organizationId,
  period = 'month',
  showInsights = true,
  showFunnel = true,
  className
}: GrowthAnalyticsProps) {
  // Hooks
  const { 
    overview,
    analytics,
    funnel,
    insights,
    loading,
    error,
    fetchDashboardData,
    generateReport
  } = useGrowthAnalytics(organizationId)

  // State
  const [activePeriod, setActivePeriod] = useState(period)
  const [activeTab, setActiveTab] = useState('overview')
  const [generatingReport, setGeneratingReport] = useState(false)

  // Fetch data when period changes
  useEffect(() => {
    if (organizationId) {
      fetchDashboardData()
    }
  }, [organizationId, activePeriod, fetchDashboardData])

  // Generate and download report
  const handleGenerateReport = useCallback(async () => {
    setGeneratingReport(true)
    try {
      const { success, data } = await generateReport(activePeriod)
      if (success && data) {
        // Create download link
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `growth-analytics-${activePeriod}-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Failed to generate report:', err)
    } finally {
      setGeneratingReport(false)
    }
  }, [activePeriod, generateReport])

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading growth analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Error loading growth analytics:</span>
          <span>{error}</span>
        </div>
        <Button
          onClick={() => fetchDashboardData()}
          variant="outline"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("bg-white rounded-lg shadow-sm border border-gray-200", className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Growth Analytics</h1>
            <p className="text-gray-600 mt-1">
              Track your growth metrics and conversion performance
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <select
              value={activePeriod}
              onChange={(e) => setActivePeriod(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="day">Last 24 hours</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="quarter">Last 3 months</option>
              <option value="year">Last 12 months</option>
            </select>

            <Button
              onClick={handleGenerateReport}
              variant="outline"
              disabled={generatingReport}
            >
              {generatingReport ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="funnel">
              <Target className="h-4 w-4 mr-2" />
              Funnel
            </TabsTrigger>
            <TabsTrigger value="trends">
              <LineChart className="h-4 w-4 mr-2" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="insights">
              <Zap className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Visitors"
                  value={overview?.total_visitors || 0}
                  subtitle="Unique page views"
                  icon={Eye}
                  color="blue"
                  trend={{ 
                    value: 12, 
                    direction: 'up', 
                    period: activePeriod 
                  }}
                />
                
                <MetricCard
                  title="Conversions"
                  value={overview?.total_conversions || 0}
                  subtitle={`${((overview?.total_conversions || 0) / Math.max(overview?.total_visitors || 1, 1) * 100).toFixed(1)}% rate`}
                  icon={Target}
                  color="green"
                  trend={{ 
                    value: 8, 
                    direction: 'up', 
                    period: activePeriod 
                  }}
                />
                
                <MetricCard
                  title="Revenue"
                  value={overview?.total_revenue || 0}
                  subtitle="Total earned"
                  icon={DollarSign}
                  color="purple"
                  format="currency"
                  trend={{ 
                    value: 15, 
                    direction: 'up', 
                    period: activePeriod 
                  }}
                />
                
                <MetricCard
                  title="New Signups"
                  value={overview?.new_signups || 0}
                  subtitle="User registrations"
                  icon={UserPlus}
                  color="orange"
                  trend={{ 
                    value: 5, 
                    direction: 'down', 
                    period: activePeriod 
                  }}
                />
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  title="Referral Rate"
                  value={overview?.referral_rate || 0}
                  subtitle="Users who refer others"
                  icon={Repeat}
                  color="blue"
                  format="percentage"
                />
                
                <MetricCard
                  title="Customer LTV"
                  value={overview?.avg_ltv || 0}
                  subtitle="Lifetime value"
                  icon={TrendingUp}
                  color="green"
                  format="currency"
                />
                
                <MetricCard
                  title="Churn Rate"
                  value={overview?.churn_rate || 0}
                  subtitle="Monthly churn"
                  icon={TrendingDown}
                  color="red"
                  format="percentage"
                />
              </div>

              {/* Quick Actions */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-auto p-4 flex-col">
                    <Target className="h-6 w-6 mb-2 text-blue-600" />
                    <span className="font-medium">Optimize Funnel</span>
                    <span className="text-sm text-gray-600">Improve conversion rates</span>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex-col">
                    <Users className="h-6 w-6 mb-2 text-green-600" />
                    <span className="font-medium">Boost Referrals</span>
                    <span className="text-sm text-gray-600">Increase viral growth</span>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex-col">
                    <Activity className="h-6 w-6 mb-2 text-purple-600" />
                    <span className="font-medium">A/B Test</span>
                    <span className="text-sm text-gray-600">Test new variants</span>
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Funnel Tab */}
          <TabsContent value="funnel" className="mt-6">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Conversion Funnel
                </h3>
                <p className="text-gray-600">
                  Track user journey from visitor to customer
                </p>
              </div>

              {funnel && funnel.steps && funnel.steps.length > 0 ? (
                <div className="max-w-2xl mx-auto">
                  {funnel.steps.map((step, index) => (
                    <FunnelStep
                      key={index}
                      step={step}
                      index={index}
                      total={funnel.steps.length}
                    />
                  ))}
                  
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        Overall Conversion Rate
                      </span>
                      <span className="text-2xl font-bold text-blue-600">
                        {funnel.overall_conversion_rate.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No funnel data available</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="mt-6">
            <div className="text-center py-12">
              <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Trend charts coming soon...</p>
              <p className="text-sm text-gray-500 mt-2">
                Integration with charting library in progress
              </p>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="mt-6">
            <div className="space-y-6">
              {insights && insights.alerts && insights.alerts.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">🚨 Alerts</h3>
                  <div className="space-y-3">
                    {insights.alerts.map((alert, index) => (
                      <InsightCard
                        key={index}
                        insight={{
                          type: alert.type as any,
                          metric: alert.metric,
                          message: alert.message,
                          priority: 'high'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {insights && insights.opportunities && insights.opportunities.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">💡 Opportunities</h3>
                  <div className="space-y-3">
                    {insights.opportunities.map((opportunity, index) => (
                      <InsightCard
                        key={index}
                        insight={{
                          type: 'info',
                          metric: opportunity.area,
                          message: opportunity.description,
                          recommendation: opportunity.recommendation,
                          priority: opportunity.impact as any
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {insights && insights.trends && insights.trends.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">📈 Trends</h3>
                  <div className="space-y-3">
                    {insights.trends.map((trend, index) => (
                      <InsightCard
                        key={index}
                        insight={{
                          type: trend.trend === 'up' ? 'success' : trend.trend === 'down' ? 'warning' : 'info',
                          metric: trend.metric,
                          message: trend.insight,
                          priority: 'medium'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {(!insights || 
                (!insights.alerts?.length && !insights.opportunities?.length && !insights.trends?.length)) && (
                <div className="text-center py-12">
                  <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No insights available yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    More data needed to generate insights
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}