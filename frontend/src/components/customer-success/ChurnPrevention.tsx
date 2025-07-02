'use client'

import React, { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  TrendingDown, 
  Users, 
  Mail, 
  Phone, 
  Gift,
  Target,
  Clock,
  CheckCircle,
  X,
  Bell,
  Calendar,
  MessageSquare,
  Heart,
  Zap,
  DollarSign,
  Activity,
  ArrowRight,
  Play,
  Pause,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useCustomerHealth } from '@/hooks/customer-success/useCustomerHealth'
import { CustomerHealth, HealthStatus } from '@/shared/types/customer-success'

interface ChurnPreventionProps {
  userId?: string
  organizationId?: string
  className?: string
}

interface AtRiskCustomerProps {
  customer: CustomerHealth
  onTakeAction: (customerId: string, action: string) => void
  onDismiss: (customerId: string) => void
}

interface InterventionCardProps {
  intervention: {
    id: string
    title: string
    description: string
    type: 'email' | 'discount' | 'call' | 'feature' | 'support'
    impact: 'low' | 'medium' | 'high'
    effort: 'low' | 'medium' | 'high'
    successRate: number
  }
  onExecute: (interventionId: string) => void
  isExecuting?: boolean
}

interface ChurnInsightProps {
  title: string
  value: string | number
  trend: 'up' | 'down' | 'stable'
  trendValue?: number
  icon: React.ReactNode
  color: 'red' | 'yellow' | 'green' | 'blue'
  description?: string
}

const AtRiskCustomer: React.FC<AtRiskCustomerProps> = ({ customer, onTakeAction, onDismiss }) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null)

  const getRiskLevel = (churnRisk: number) => {
    if (churnRisk >= 0.8) return { label: 'Critical', color: 'text-red-600 bg-red-100' }
    if (churnRisk >= 0.6) return { label: 'High', color: 'text-orange-600 bg-orange-100' }
    return { label: 'Medium', color: 'text-yellow-600 bg-yellow-100' }
  }

  const risk = getRiskLevel(customer.churn_risk)

  const quickActions = [
    { id: 'email', label: 'Send Email', icon: <Mail className="w-4 h-4" /> },
    { id: 'call', label: 'Schedule Call', icon: <Phone className="w-4 h-4" /> },
    { id: 'discount', label: 'Offer Discount', icon: <Gift className="w-4 h-4" /> },
    { id: 'support', label: 'Proactive Support', icon: <MessageSquare className="w-4 h-4" /> }
  ]

  return (
    <div className="bg-white border-2 border-red-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">User {customer.user_id.slice(-8)}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={risk.color}>{risk.label} Risk</Badge>
              <span className="text-sm text-gray-600">
                {Math.round(customer.churn_risk * 100)}% churn probability
              </span>
            </div>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" onClick={() => onDismiss(customer.user_id)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-600">Health Score:</span>
          <div className="font-medium">{customer.health_score}/100</div>
        </div>
        <div>
          <span className="text-gray-600">Engagement:</span>
          <div className="font-medium">{Math.round(customer.engagement_score)}%</div>
        </div>
        <div>
          <span className="text-gray-600">Last Active:</span>
          <div className="font-medium">
            {customer.last_activity_date ? new Date(customer.last_activity_date).toLocaleDateString() : 'Unknown'}
          </div>
        </div>
      </div>

      {/* Risk Indicators */}
      {customer.metadata?.risk_factors && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Risk Factors:</h5>
          <div className="flex flex-wrap gap-2">
            {customer.metadata.risk_factors.map((factor: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs text-red-600 border-red-300">
                {factor}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-gray-900">Quick Actions:</h5>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => onTakeAction(customer.user_id, action.id)}
              className="justify-start"
            >
              {action.icon}
              <span className="ml-2">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

const InterventionCard: React.FC<InterventionCardProps> = ({ intervention, onExecute, isExecuting }) => {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-5 h-5" />
      case 'discount': return <Gift className="w-5 h-5" />
      case 'call': return <Phone className="w-5 h-5" />
      case 'feature': return <Zap className="w-5 h-5" />
      case 'support': return <MessageSquare className="w-5 h-5" />
      default: return <Target className="w-5 h-5" />
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            {getTypeIcon(intervention.type)}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{intervention.title}</h4>
            <p className="text-sm text-gray-600">{intervention.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-600">Impact:</span>
          <Badge className={getImpactColor(intervention.impact)} size="sm">
            {intervention.impact}
          </Badge>
        </div>
        <div>
          <span className="text-gray-600">Effort:</span>
          <Badge className={getImpactColor(intervention.effort)} size="sm">
            {intervention.effort}
          </Badge>
        </div>
        <div>
          <span className="text-gray-600">Success Rate:</span>
          <div className="font-medium">{intervention.successRate}%</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">Predicted Success</span>
          <span className="text-xs font-medium">{intervention.successRate}%</span>
        </div>
        <Progress value={intervention.successRate} className="w-full h-2" />
      </div>

      <Button 
        onClick={() => onExecute(intervention.id)} 
        disabled={isExecuting}
        size="sm"
        className="w-full"
      >
        {isExecuting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Executing...
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Execute Intervention
          </>
        )}
      </Button>
    </div>
  )
}

const ChurnInsight: React.FC<ChurnInsightProps> = ({ 
  title, 
  value, 
  trend, 
  trendValue, 
  icon, 
  color, 
  description 
}) => {
  const colorClasses = {
    red: 'text-red-600 bg-red-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50'
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        {trendValue !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${
            trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-gray-600'
          }`}>
            {trend === 'up' ? <TrendingDown className="w-4 h-4 rotate-180" /> : 
             trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
            {trend !== 'stable' && `${trendValue}%`}
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
    </div>
  )
}

export const ChurnPrevention: React.FC<ChurnPreventionProps> = ({
  userId,
  organizationId,
  className = ''
}) => {
  const [selectedTab, setSelectedTab] = useState('at-risk')
  const [executingIntervention, setExecutingIntervention] = useState<string | null>(null)

  const {
    healthData,
    churnRiskUsers,
    isLoading,
    error,
    refreshHealth
  } = useCustomerHealth(userId, organizationId)

  // Mock interventions data
  const interventions = [
    {
      id: 'win-back-email',
      title: 'Win-Back Email Campaign',
      description: 'Personalized email highlighting unused features',
      type: 'email' as const,
      impact: 'medium' as const,
      effort: 'low' as const,
      successRate: 24
    },
    {
      id: 'retention-discount',
      title: 'Retention Discount',
      description: '20% discount on next billing cycle',
      type: 'discount' as const,
      impact: 'high' as const,
      effort: 'low' as const,
      successRate: 42
    },
    {
      id: 'success-manager-call',
      title: 'Success Manager Call',
      description: 'Personal call from customer success manager',
      type: 'call' as const,
      impact: 'high' as const,
      effort: 'high' as const,
      successRate: 67
    },
    {
      id: 'feature-training',
      title: 'Feature Training Session',
      description: 'One-on-one training on underutilized features',
      type: 'feature' as const,
      impact: 'medium' as const,
      effort: 'medium' as const,
      successRate: 38
    },
    {
      id: 'proactive-support',
      title: 'Proactive Support Outreach',
      description: 'Identify and resolve potential issues before they escalate',
      type: 'support' as const,
      impact: 'medium' as const,
      effort: 'medium' as const,
      successRate: 31
    }
  ]

  const handleTakeAction = async (customerId: string, action: string) => {
    console.log(`Taking action ${action} for customer ${customerId}`)
    // Implement action logic here
  }

  const handleDismissCustomer = async (customerId: string) => {
    console.log(`Dismissing customer ${customerId}`)
    // Implement dismiss logic here
  }

  const handleExecuteIntervention = async (interventionId: string) => {
    setExecutingIntervention(interventionId)
    
    // Simulate API call
    setTimeout(() => {
      setExecutingIntervention(null)
      console.log(`Executed intervention ${interventionId}`)
    }, 2000)
  }

  const churnMetrics = {
    totalAtRisk: churnRiskUsers?.length || 0,
    criticalRisk: churnRiskUsers?.filter(u => u.churn_risk >= 0.8).length || 0,
    avgChurnRisk: churnRiskUsers?.reduce((acc, u) => acc + u.churn_risk, 0) / (churnRiskUsers?.length || 1) * 100 || 0,
    preventedChurns: 8 // Mock data
  }

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
          <h3 className="font-semibold text-red-800">Churn Prevention Error</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <Button variant="outline" onClick={refreshHealth}>
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
          <h2 className="text-2xl font-bold text-gray-900">Churn Prevention</h2>
          <p className="text-gray-600">Identify at-risk customers and take proactive action</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Bell className="w-4 h-4 mr-2" />
            Setup Alerts
          </Button>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Configure Rules
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ChurnInsight
          title="At Risk Customers"
          value={churnMetrics.totalAtRisk}
          trend="down"
          trendValue={8}
          icon={<Users className="w-6 h-6" />}
          color="red"
          description="Customers with >60% churn risk"
        />
        <ChurnInsight
          title="Critical Risk"
          value={churnMetrics.criticalRisk}
          trend="stable"
          icon={<AlertTriangle className="w-6 h-6" />}
          color="red"
          description="Customers with >80% churn risk"
        />
        <ChurnInsight
          title="Avg Churn Risk"
          value={`${Math.round(churnMetrics.avgChurnRisk)}%`}
          trend="down"
          trendValue={5}
          icon={<TrendingDown className="w-6 h-6" />}
          color="yellow"
          description="Average risk across all customers"
        />
        <ChurnInsight
          title="Prevented Churns"
          value={churnMetrics.preventedChurns}
          trend="up"
          trendValue={12}
          icon={<Heart className="w-6 h-6" />}
          color="green"
          description="Successful interventions this month"
        />
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="at-risk">At-Risk Customers ({churnMetrics.totalAtRisk})</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
        </TabsList>

        <TabsContent value="at-risk" className="space-y-6">
          {churnRiskUsers && churnRiskUsers.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {churnRiskUsers.map((customer) => (
                <AtRiskCustomer
                  key={customer.id}
                  customer={customer}
                  onTakeAction={handleTakeAction}
                  onDismiss={handleDismissCustomer}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No High-Risk Customers</h3>
              <p className="text-gray-600">Great job! All customers are currently healthy.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="interventions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {interventions.map((intervention) => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                onExecute={handleExecuteIntervention}
                isExecuting={executingIntervention === intervention.id}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Churn Risk Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Risk Distribution</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Low Risk (0-39%)</span>
                    <span className="font-medium">156 customers</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Medium Risk (40-69%)</span>
                    <span className="font-medium">34 customers</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">High Risk (70-89%)</span>
                    <span className="font-medium">12 customers</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Critical Risk (90-100%)</span>
                    <span className="font-medium text-red-600">5 customers</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Top Risk Factors</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Low engagement</span>
                    <Badge variant="outline" className="text-red-600">67%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Support tickets</span>
                    <Badge variant="outline" className="text-orange-600">43%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Feature adoption</span>
                    <Badge variant="outline" className="text-yellow-600">38%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Billing issues</span>
                    <Badge variant="outline" className="text-blue-600">24%</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="playbooks" className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Churn Prevention Playbooks</h3>
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">High-Value Customer Recovery</h4>
                  <Badge className="bg-purple-100 text-purple-800">Premium</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Automated workflow for high-value customers showing churn signals
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Success Rate: 72%</span>
                  <span>Avg Recovery Time: 3 days</span>
                  <span>ROI: 340%</span>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Feature Adoption Boost</h4>
                  <Badge className="bg-blue-100 text-blue-800">Standard</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Increase engagement through guided feature discovery
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Success Rate: 45%</span>
                  <span>Avg Recovery Time: 7 days</span>
                  <span>ROI: 180%</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}