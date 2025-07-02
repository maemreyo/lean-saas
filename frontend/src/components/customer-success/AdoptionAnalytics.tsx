'use client'

import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Users, 
  Target, 
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  Download,
  Eye,
  MousePointer,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useFeatureAdoption } from '@/hooks/customer-success/useFeatureAdoption'
import { FeatureAdoption, AdoptionStatus } from '@/shared/types/customer-success'

interface AdoptionAnalyticsProps {
  userId?: string
  organizationId?: string
  timeRange?: '7d' | '30d' | '90d' | '1y'
  className?: string
}

interface FeatureMetricCardProps {
  title: string
  value: number | string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'red'
  subtitle?: string
}

interface FeatureAdoptionCardProps {
  feature: FeatureAdoption
  onClick?: () => void
}

interface AdoptionFunnelProps {
  funnelData: {
    stage: string
    users: number
    percentage: number
    color: string
  }[]
}

const FeatureMetricCard: React.FC<FeatureMetricCardProps> = ({
  title,
  value,
  trend,
  trendValue,
  icon,
  color,
  subtitle
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    red: 'text-red-600 bg-red-50 border-red-200'
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend && trendValue !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
             trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
            {trend !== 'stable' && `${trendValue}%`}
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  )
}

const FeatureAdoptionCard: React.FC<FeatureAdoptionCardProps> = ({ feature, onClick }) => {
  const getStatusColor = (status: AdoptionStatus) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'exploring': return 'bg-blue-100 text-blue-800'
      case 'not_adopted': return 'bg-gray-100 text-gray-800'
      case 'power_user': return 'bg-purple-100 text-purple-800'
      case 'churned': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getUsageColor = (usageCount: number) => {
    if (usageCount >= 50) return 'text-green-600'
    if (usageCount >= 20) return 'text-blue-600'
    if (usageCount >= 5) return 'text-yellow-600'
    return 'text-gray-600'
  }

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{feature.feature_name}</h4>
          <p className="text-sm text-gray-600">
            Last used: {feature.last_used_at ? new Date(feature.last_used_at).toLocaleDateString() : 'Never'}
          </p>
        </div>
        <Badge className={getStatusColor(feature.status)}>
          {feature.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Usage Count</span>
            <span className={`text-sm font-medium ${getUsageColor(feature.usage_count)}`}>
              {feature.usage_count}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Adoption Score</span>
            <span className="text-sm font-medium text-gray-900">
              {Math.round(feature.adoption_score)}%
            </span>
          </div>
          <Progress value={feature.adoption_score} className="w-full h-2" />
        </div>

        {feature.metadata && (
          <div className="text-xs text-gray-500">
            <div className="flex items-center gap-4">
              {feature.metadata.time_spent && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.round(feature.metadata.time_spent / 60)}m
                </span>
              )}
              {feature.metadata.actions_taken && (
                <span className="flex items-center gap-1">
                  <MousePointer className="w-3 h-3" />
                  {feature.metadata.actions_taken} actions
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const AdoptionFunnel: React.FC<AdoptionFunnelProps> = ({ funnelData }) => {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-6">Feature Adoption Funnel</h3>
      
      <div className="space-y-4">
        {funnelData.map((stage, index) => (
          <div key={stage.stage} className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{stage.users} users</span>
                <span className="text-sm font-medium text-gray-900">{stage.percentage}%</span>
              </div>
            </div>
            
            <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
              <div 
                className="h-full transition-all duration-500 rounded-lg"
                style={{ 
                  width: `${stage.percentage}%`,
                  backgroundColor: stage.color
                }}
              />
            </div>
            
            {index < funnelData.length - 1 && (
              <div className="flex justify-center my-2">
                <TrendingDown className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export const AdoptionAnalytics: React.FC<AdoptionAnalyticsProps> = ({
  userId,
  organizationId,
  timeRange = '30d',
  className = ''
}) => {
  const [selectedTab, setSelectedTab] = useState('overview')
  const [selectedFeature, setSelectedFeature] = useState<FeatureAdoption | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const {
    adoptionData,
    adoptionMetrics,
    featureRecommendations,
    isLoading,
    error,
    trackFeatureUsage,
    updateAdoptionStatus,
    refreshAdoption
  } = useFeatureAdoption(userId, organizationId)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshAdoption()
    setRefreshing(false)
  }

  useEffect(() => {
    // Auto-refresh every 10 minutes
    const interval = setInterval(() => {
      refreshAdoption()
    }, 10 * 60 * 1000)

    return () => clearInterval(interval)
  }, [refreshAdoption])

  // Mock funnel data - in real implementation, this would come from adoption metrics
  const funnelData = [
    { stage: 'Feature Discovered', users: 1000, percentage: 100, color: '#3B82F6' },
    { stage: 'First Use', users: 750, percentage: 75, color: '#10B981' },
    { stage: 'Regular Use', users: 450, percentage: 45, color: '#F59E0B' },
    { stage: 'Power User', users: 200, percentage: 20, color: '#8B5CF6' }
  ]

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
          <h3 className="font-semibold text-red-800">Adoption Analytics Error</h3>
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
          <h2 className="text-2xl font-bold text-gray-900">Feature Adoption Analytics</h2>
          <p className="text-gray-600">Track feature usage and adoption patterns</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FeatureMetricCard
          title="Total Features"
          value={adoptionMetrics?.total_features || 0}
          icon={<Target className="w-6 h-6" />}
          color="blue"
          subtitle="Available features"
        />
        <FeatureMetricCard
          title="Adopted Features"
          value={adoptionMetrics?.adopted_features || 0}
          trend="up"
          trendValue={12}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
          subtitle="Actively used"
        />
        <FeatureMetricCard
          title="Average Adoption"
          value={`${Math.round(adoptionMetrics?.average_adoption_rate || 0)}%`}
          trend="up"
          trendValue={8}
          icon={<BarChart3 className="w-6 h-6" />}
          color="yellow"
          subtitle="Overall adoption rate"
        />
        <FeatureMetricCard
          title="Power Users"
          value={adoptionMetrics?.power_users || 0}
          trend="stable"
          icon={<Zap className="w-6 h-6" />}
          color="red"
          subtitle="Heavy feature users"
        />
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Feature Details</TabsTrigger>
          <TabsTrigger value="funnel">Adoption Funnel</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Adoption Overview */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Adoption Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Users</span>
                  <span className="font-medium">{adoptionMetrics?.active_users || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Feature Explorers</span>
                  <span className="font-medium">{adoptionMetrics?.exploring_users || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Non-Adopters</span>
                  <span className="font-medium">{adoptionMetrics?.non_adopters || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Churned Features</span>
                  <span className="font-medium text-red-600">{adoptionMetrics?.churned_features || 0}</span>
                </div>
              </div>
            </div>

            {/* Top Adopted Features */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Top Adopted Features</h3>
              <div className="space-y-3">
                {adoptionData?.slice(0, 5).map((feature, index) => (
                  <div key={feature.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium">{feature.feature_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{Math.round(feature.adoption_score)}%</div>
                      <div className="text-xs text-gray-500">{feature.usage_count} uses</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adoptionData?.map((feature) => (
              <FeatureAdoptionCard
                key={feature.id}
                feature={feature}
                onClick={() => setSelectedFeature(feature)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <AdoptionFunnel funnelData={funnelData} />
          
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Funnel Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">75%</div>
                <div className="text-sm text-gray-600">Try Features</div>
                <div className="text-xs text-gray-500">Discovery to first use</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-2">60%</div>
                <div className="text-sm text-gray-600">Become Regular</div>
                <div className="text-xs text-gray-500">First use to regular</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-2">44%</div>
                <div className="text-sm text-gray-600">Power Users</div>
                <div className="text-xs text-gray-500">Regular to power user</div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Feature Recommendations</h3>
            {featureRecommendations && featureRecommendations.length > 0 ? (
              <div className="space-y-4">
                {featureRecommendations.map((rec, index) => (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-800 mb-1">{rec.title}</h4>
                        <p className="text-blue-700 text-sm mb-3">{rec.description}</p>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            {rec.category}
                          </Badge>
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            Impact: {rec.impact}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="font-medium text-gray-900 mb-2">No Recommendations</h4>
                <p className="text-gray-600">Your feature adoption is optimized!</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Feature Detail Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{selectedFeature.feature_name}</h3>
                <Button variant="ghost" onClick={() => setSelectedFeature(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Usage Statistics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Uses:</span>
                        <span className="font-medium">{selectedFeature.usage_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Adoption Score:</span>
                        <span className="font-medium">{Math.round(selectedFeature.adoption_score)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Used:</span>
                        <span className="font-medium">
                          {selectedFeature.last_used_at ? new Date(selectedFeature.last_used_at).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                    <Badge className={getStatusColor(selectedFeature.status)}>
                      {selectedFeature.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                {selectedFeature.metadata && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Additional Data</h4>
                    <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-x-auto">
                      {JSON.stringify(selectedFeature.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}