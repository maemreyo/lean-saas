'use client'

import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Heart, 
  Activity,
  Users,
  Target,
  Clock,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useCustomerHealth } from '@/hooks/customer-success/useCustomerHealth'
import { CustomerHealth, HealthStatus } from '@/shared/types/customer-success'

interface HealthDashboardProps {
  userId?: string
  organizationId?: string
  className?: string
}

interface HealthScoreCardProps {
  health: CustomerHealth
  onClick?: () => void
}

interface HealthMetricProps {
  title: string
  value: number
  trend: 'up' | 'down' | 'stable'
  trendValue: number
  icon: React.ReactNode
  color: 'green' | 'yellow' | 'red' | 'blue'
}

const HealthScoreCard: React.FC<HealthScoreCardProps> = ({ health, onClick }) => {
  const getStatusColor = (status: HealthStatus) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200'
      case 'at_risk': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'churned': return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'recovering': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div 
      className={`bg-white rounded-lg border-2 p-6 cursor-pointer hover:shadow-lg transition-shadow ${getStatusColor(health.status)}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Heart className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">Customer Health</h3>
            <p className="text-sm opacity-75">Last updated: {new Date(health.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
        <Badge variant={health.status === 'healthy' ? 'success' : health.status === 'critical' ? 'destructive' : 'warning'}>
          {health.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Health Score</span>
          <span className={`text-2xl font-bold ${getScoreColor(health.health_score)}`}>
            {health.health_score}
          </span>
        </div>
        <Progress value={health.health_score} className="w-full" />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Churn Risk:</span>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${health.churn_risk >= 0.7 ? 'text-red-600' : health.churn_risk >= 0.4 ? 'text-yellow-600' : 'text-green-600'}`}>
              {Math.round(health.churn_risk * 100)}%
            </span>
            {health.churn_risk >= 0.7 && <AlertTriangle className="w-4 h-4 text-red-500" />}
          </div>
        </div>
        <div>
          <span className="text-gray-600">Engagement:</span>
          <span className="font-medium block">{Math.round(health.engagement_score)}%</span>
        </div>
      </div>
    </div>
  )
}

const HealthMetric: React.FC<HealthMetricProps> = ({ 
  title, 
  value, 
  trend, 
  trendValue, 
  icon, 
  color 
}) => {
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-600 bg-red-50',
    blue: 'text-blue-600 bg-blue-50'
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-600">{title}</h4>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">{value}</span>
            {trend !== 'stable' && (
              <div className={`flex items-center gap-1 text-sm ${
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {trendValue}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const HealthDashboard: React.FC<HealthDashboardProps> = ({
  userId,
  organizationId,
  className = ''
}) => {
  const {
    healthData,
    healthMetrics,
    churnRiskUsers,
    isLoading,
    error,
    refreshHealth,
    calculateHealthScore
  } = useCustomerHealth(userId, organizationId)

  const [selectedTab, setSelectedTab] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshHealth()
    setRefreshing(false)
  }

  useEffect(() => {
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      refreshHealth()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [refreshHealth])

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-red-800">Health Dashboard Error</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <Button variant="outline" onClick={handleRefresh}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Health Dashboard</h2>
          <p className="text-gray-600">Monitor customer health and identify churn risk</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => calculateHealthScore()}>
            Recalculate Scores
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <HealthMetric
          title="Healthy Customers"
          value={healthMetrics?.healthy_count || 0}
          trend="up"
          trendValue={12}
          icon={<Heart className="w-5 h-5" />}
          color="green"
        />
        <HealthMetric
          title="At Risk"
          value={healthMetrics?.at_risk_count || 0}
          trend="down"
          trendValue={5}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="yellow"
        />
        <HealthMetric
          title="Critical"
          value={healthMetrics?.critical_count || 0}
          trend="stable"
          trendValue={0}
          icon={<Activity className="w-5 h-5" />}
          color="red"
        />
        <HealthMetric
          title="Average Score"
          value={Math.round(healthMetrics?.average_score || 0)}
          trend="up"
          trendValue={8}
          icon={<Target className="w-5 h-5" />}
          color="blue"
        />
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="individual">Individual Health</TabsTrigger>
          <TabsTrigger value="churn-risk">Churn Risk</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Health Score Distribution */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Health Score Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-green-50 flex items-center justify-center">
                  <Heart className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">{healthMetrics?.healthy_count || 0}</div>
                <div className="text-sm text-gray-600">Healthy (80-100)</div>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-yellow-50 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                </div>
                <div className="text-2xl font-bold text-yellow-600">{healthMetrics?.at_risk_count || 0}</div>
                <div className="text-sm text-gray-600">At Risk (50-79)</div>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-red-600">{healthMetrics?.critical_count || 0}</div>
                <div className="text-sm text-gray-600">Critical (0-49)</div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="individual" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {healthData?.map((health) => (
              <HealthScoreCard
                key={health.id}
                health={health}
                onClick={() => {
                  // Navigate to individual customer health details
                  console.log('Navigate to customer health details:', health.user_id)
                }}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="churn-risk" className="space-y-6">
          <div className="bg-white rounded-lg border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">High Churn Risk Customers</h3>
              <p className="text-gray-600">Customers who need immediate attention</p>
            </div>
            <div className="p-6">
              {churnRiskUsers && churnRiskUsers.length > 0 ? (
                <div className="space-y-4">
                  {churnRiskUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">User {user.user_id}</h4>
                          <p className="text-sm text-gray-600">
                            Churn Risk: {Math.round(user.churn_risk * 100)}% | 
                            Health Score: {user.health_score}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                        <Button size="sm">
                          Take Action
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Heart className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h4 className="font-medium text-gray-900 mb-2">No High-Risk Customers</h4>
                  <p className="text-gray-600">All customers are currently in good health!</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Health Trends</h3>
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4" />
              <p>Health trends chart will be implemented here</p>
              <p className="text-sm">Shows health score changes over time</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}