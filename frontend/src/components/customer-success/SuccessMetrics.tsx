'use client'

import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Heart, 
  Target,
  Clock,
  Star,
  DollarSign,
  Activity,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Eye,
  ThumbsUp,
  MessageSquare,
  Zap,
  Award,
  LineChart,
  PieChart
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

interface SuccessMetricsProps {
  userId?: string
  organizationId?: string
  timeRange?: '7d' | '30d' | '90d' | '1y'
  className?: string
}

interface MetricCardProps {
  title: string
  value: string | number
  previousValue?: string | number
  trend?: 'up' | 'down' | 'stable'
  trendPercentage?: number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  target?: number
  format?: 'number' | 'percentage' | 'currency' | 'time'
  size?: 'sm' | 'md' | 'lg'
}

interface KPIDashboardProps {
  timeRange: string
  onTimeRangeChange: (range: string) => void
}

interface ChartCardProps {
  title: string
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  previousValue,
  trend, 
  trendPercentage, 
  icon, 
  color, 
  target,
  format = 'number',
  size = 'md'
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50'
  }

  const formatValue = (val: string | number) => {
    switch (format) {
      case 'percentage':
        return `${val}%`
      case 'currency':
        return `$${typeof val === 'number' ? val.toLocaleString() : val}`
      case 'time':
        return `${val}m`
      default:
        return typeof val === 'number' ? val.toLocaleString() : val
    }
  }

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <div className={`bg-white rounded-lg border ${sizeClasses[size]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend && trendPercentage !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
             trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
            {trend !== 'stable' && `${Math.abs(trendPercentage)}%`}
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatValue(value)}</h3>
        <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
        
        {previousValue && (
          <p className="text-xs text-gray-500">
            Previous: {formatValue(previousValue)}
          </p>
        )}
        
        {target && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">Target Progress</span>
              <span className="text-xs font-medium">{Math.round((Number(value) / target) * 100)}%</span>
            </div>
            <Progress value={(Number(value) / target) * 100} className="w-full h-2" />
          </div>
        )}
      </div>
    </div>
  )
}

const ChartCard: React.FC<ChartCardProps> = ({ title, description, children, actions }) => {
  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex gap-2">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

const KPIDashboard: React.FC<KPIDashboardProps> = ({ timeRange, onTimeRangeChange }) => {
  // Mock data - in real implementation, this would come from API
  const kpis = {
    customerSatisfaction: { value: 4.2, previous: 4.0, target: 4.5, trend: 'up' as const, change: 5 },
    npsScore: { value: 32, previous: 28, target: 40, trend: 'up' as const, change: 14 },
    retentionRate: { value: 94, previous: 91, target: 95, trend: 'up' as const, change: 3 },
    churnRate: { value: 6, previous: 9, target: 5, trend: 'down' as const, change: 33 },
    ltv: { value: 2850, previous: 2650, target: 3000, trend: 'up' as const, change: 8 },
    timeToValue: { value: 14, previous: 18, target: 10, trend: 'down' as const, change: 22 },
    supportTickets: { value: 142, previous: 168, target: 120, trend: 'down' as const, change: 15 },
    featureAdoption: { value: 67, previous: 62, target: 75, trend: 'up' as const, change: 8 }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Customer Satisfaction"
        value={kpis.customerSatisfaction.value}
        previousValue={kpis.customerSatisfaction.previous}
        trend={kpis.customerSatisfaction.trend}
        trendPercentage={kpis.customerSatisfaction.change}
        icon={<Star className="w-6 h-6" />}
        color="yellow"
        target={kpis.customerSatisfaction.target}
        format="number"
      />
      
      <MetricCard
        title="Net Promoter Score"
        value={kpis.npsScore.value}
        previousValue={kpis.npsScore.previous}
        trend={kpis.npsScore.trend}
        trendPercentage={kpis.npsScore.change}
        icon={<ThumbsUp className="w-6 h-6" />}
        color="green"
        target={kpis.npsScore.target}
        format="number"
      />
      
      <MetricCard
        title="Customer Retention"
        value={kpis.retentionRate.value}
        previousValue={kpis.retentionRate.previous}
        trend={kpis.retentionRate.trend}
        trendPercentage={kpis.retentionRate.change}
        icon={<Heart className="w-6 h-6" />}
        color="green"
        target={kpis.retentionRate.target}
        format="percentage"
      />
      
      <MetricCard
        title="Churn Rate"
        value={kpis.churnRate.value}
        previousValue={kpis.churnRate.previous}
        trend={kpis.churnRate.trend}
        trendPercentage={kpis.churnRate.change}
        icon={<TrendingDown className="w-6 h-6" />}
        color="red"
        target={kpis.churnRate.target}
        format="percentage"
      />
      
      <MetricCard
        title="Customer LTV"
        value={kpis.ltv.value}
        previousValue={kpis.ltv.previous}
        trend={kpis.ltv.trend}
        trendPercentage={kpis.ltv.change}
        icon={<DollarSign className="w-6 h-6" />}
        color="blue"
        target={kpis.ltv.target}
        format="currency"
      />
      
      <MetricCard
        title="Time to Value"
        value={kpis.timeToValue.value}
        previousValue={kpis.timeToValue.previous}
        trend={kpis.timeToValue.trend}
        trendPercentage={kpis.timeToValue.change}
        icon={<Clock className="w-6 h-6" />}
        color="purple"
        target={kpis.timeToValue.target}
        format="time"
      />
      
      <MetricCard
        title="Support Tickets"
        value={kpis.supportTickets.value}
        previousValue={kpis.supportTickets.previous}
        trend={kpis.supportTickets.trend}
        trendPercentage={kpis.supportTickets.change}
        icon={<MessageSquare className="w-6 h-6" />}
        color="blue"
        target={kpis.supportTickets.target}
        format="number"
      />
      
      <MetricCard
        title="Feature Adoption"
        value={kpis.featureAdoption.value}
        previousValue={kpis.featureAdoption.previous}
        trend={kpis.featureAdoption.trend}
        trendPercentage={kpis.featureAdoption.change}
        icon={<Zap className="w-6 h-6" />}
        color="green"
        target={kpis.featureAdoption.target}
        format="percentage"
      />
    </div>
  )
}

export const SuccessMetrics: React.FC<SuccessMetricsProps> = ({
  userId,
  organizationId,
  timeRange = '30d',
  className = ''
}) => {
  const [selectedTab, setSelectedTab] = useState('overview')
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)
  const [isLoading, setIsLoading] = useState(false)

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ]

  const handleRefresh = async () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }

  const handleExport = () => {
    console.log('Exporting metrics...')
    // Implement export functionality
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Success Metrics</h2>
          <p className="text-gray-600">Track customer success KPIs and satisfaction scores</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="adoption">Adoption</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Dashboard */}
          <KPIDashboard timeRange={selectedTimeRange} onTimeRangeChange={setSelectedTimeRange} />
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard 
              title="Customer Health Trends" 
              description="Overall customer health score over time"
              actions={
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
              }
            >
              <div className="h-64 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <LineChart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Health trend chart will be displayed here</p>
                </div>
              </div>
            </ChartCard>
            
            <ChartCard 
              title="Satisfaction Distribution" 
              description="Distribution of customer satisfaction scores"
              actions={
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
              }
            >
              <div className="h-64 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <PieChart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Satisfaction distribution chart will be displayed here</p>
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Success Highlights */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Success Highlights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Customer Champion</h4>
                <p className="text-sm text-gray-600">95% customer satisfaction this month</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Target Achieved</h4>
                <p className="text-sm text-gray-600">Exceeded retention goals by 12%</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Growth Leader</h4>
                <p className="text-sm text-gray-600">22% increase in feature adoption</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="satisfaction" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Overall CSAT"
              value="4.2"
              trend="up"
              trendPercentage={5}
              icon={<Star className="w-6 h-6" />}
              color="yellow"
              target={4.5}
            />
            <MetricCard
              title="NPS Score"
              value="32"
              trend="up"
              trendPercentage={14}
              icon={<ThumbsUp className="w-6 h-6" />}
              color="green"
              target={40}
            />
            <MetricCard
              title="Response Rate"
              value="78"
              trend="up"
              trendPercentage={8}
              icon={<MessageSquare className="w-6 h-6" />}
              color="blue"
              format="percentage"
            />
          </div>

          <ChartCard title="Satisfaction Trends" description="Customer satisfaction over time">
            <div className="h-80 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Satisfaction trends chart will be implemented here</p>
              </div>
            </div>
          </ChartCard>

          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Feedback</h3>
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < 5 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <span className="text-sm font-medium">5.0</span>
                  </div>
                  <span className="text-xs text-gray-500">2 hours ago</span>
                </div>
                <p className="text-sm text-gray-700">"Excellent customer service and very intuitive interface. Highly recommended!"</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <span className="text-sm font-medium">4.0</span>
                  </div>
                  <span className="text-xs text-gray-500">1 day ago</span>
                </div>
                <p className="text-sm text-gray-700">"Great platform overall. Would love to see more advanced reporting features."</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="retention" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Retention Rate"
              value="94"
              trend="up"
              trendPercentage={3}
              icon={<Heart className="w-6 h-6" />}
              color="green"
              format="percentage"
              target={95}
            />
            <MetricCard
              title="Churn Rate"
              value="6"
              trend="down"
              trendPercentage={33}
              icon={<TrendingDown className="w-6 h-6" />}
              color="red"
              format="percentage"
              target={5}
            />
            <MetricCard
              title="Customer LTV"
              value="2850"
              trend="up"
              trendPercentage={8}
              icon={<DollarSign className="w-6 h-6" />}
              color="blue"
              format="currency"
              target={3000}
            />
            <MetricCard
              title="Expansion Revenue"
              value="24"
              trend="up"
              trendPercentage={12}
              icon={<TrendingUp className="w-6 h-6" />}
              color="purple"
              format="percentage"
            />
          </div>

          <ChartCard title="Retention Cohort Analysis" description="Customer retention by signup cohort">
            <div className="h-80 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Cohort analysis chart will be implemented here</p>
              </div>
            </div>
          </ChartCard>
        </TabsContent>

        <TabsContent value="adoption" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Feature Adoption"
              value="67"
              trend="up"
              trendPercentage={8}
              icon={<Zap className="w-6 h-6" />}
              color="green"
              format="percentage"
              target={75}
            />
            <MetricCard
              title="Time to Value"
              value="14"
              trend="down"
              trendPercentage={22}
              icon={<Clock className="w-6 h-6" />}
              color="purple"
              format="time"
              target={10}
            />
            <MetricCard
              title="Active Users"
              value="1247"
              trend="up"
              trendPercentage={15}
              icon={<Users className="w-6 h-6" />}
              color="blue"
              target={1500}
            />
          </div>

          <ChartCard title="Feature Adoption Funnel" description="User progression through feature adoption">
            <div className="h-80 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Adoption funnel chart will be implemented here</p>
              </div>
            </div>
          </ChartCard>
        </TabsContent>

        <TabsContent value="support" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Support Tickets"
              value="142"
              trend="down"
              trendPercentage={15}
              icon={<MessageSquare className="w-6 h-6" />}
              color="blue"
              target={120}
            />
            <MetricCard
              title="Resolution Time"
              value="4.2"
              trend="down"
              trendPercentage={18}
              icon={<Clock className="w-6 h-6" />}
              color="green"
              format="time"
              target={3}
            />
            <MetricCard
              title="First Response"
              value="1.8"
              trend="down"
              trendPercentage={12}
              icon={<Activity className="w-6 h-6" />}
              color="purple"
              format="time"
              target={1}
            />
            <MetricCard
              title="Resolution Rate"
              value="96"
              trend="up"
              trendPercentage={2}
              icon={<Target className="w-6 h-6" />}
              color="green"
              format="percentage"
              target={98}
            />
          </div>

          <ChartCard title="Support Metrics Trends" description="Support performance over time">
            <div className="h-80 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Support metrics chart will be implemented here</p>
              </div>
            </div>
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}