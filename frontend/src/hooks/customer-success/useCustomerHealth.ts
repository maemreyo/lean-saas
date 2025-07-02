// Customer Health Score Monitoring and Churn Prevention Hook

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { 
  CustomerHealth,
  HealthStatus,
  HealthScoreComponents,
  ChurnRiskAssessment,
  CalculateHealthScoreRequest,
  HealthScoreResponse
} from '@/shared/types/customer-success'
import {
  calculateHealthScore,
  getHealthScore,
  getHealthAnalytics,
  DEFAULT_SCORE_WEIGHTS,
  HEALTH_SCORE_THRESHOLDS
} from '@/lib/customer-success/health-scoring'

interface UseCustomerHealthOptions {
  userId?: string
  organizationId?: string
  autoCalculate?: boolean
  refreshInterval?: number // in milliseconds
  onHealthChange?: (health: CustomerHealth) => void
  onRiskAlert?: (riskAssessment: ChurnRiskAssessment) => void
  onError?: (error: string) => void
}

interface UseCustomerHealthReturn {
  // Health data
  health: CustomerHealth | null
  scoreBreakdown: HealthScoreComponents | null
  riskAssessment: ChurnRiskAssessment | null
  recommendations: string[]
  historicalScores: Array<{ date: string; score: number; status: HealthStatus }> | null
  
  // Status indicators
  isLoading: boolean
  isCalculating: boolean
  error: string | null
  lastUpdated: string | null
  
  // Actions
  calculate: (customWeights?: Partial<HealthScoreComponents>) => Promise<boolean>
  refresh: () => Promise<void>
  
  // Health insights
  getHealthTrend: () => 'improving' | 'declining' | 'stable' | 'unknown'
  getScoreChange: () => number
  isHealthy: () => boolean
  isAtRisk: () => boolean
  isCritical: () => boolean
  requiresIntervention: () => boolean
  
  // Score utilities
  getScoreColor: (score: number) => string
  getStatusColor: (status: HealthStatus) => string
  getScoreDescription: (score: number) => string
  
  // Analytics (for admin users)
  analytics: {
    health_distribution: Record<HealthStatus, number>
    average_health_score: number
    churn_risk_distribution: Record<string, number>
    trending_users: Array<{ user_id: string; trend: string; score_change: number }>
    intervention_required_count: number
    total_users: number
  } | null
}

export function useCustomerHealth(options: UseCustomerHealthOptions = {}): UseCustomerHealthReturn {
  const { user } = useAuth()
  const {
    userId: targetUserId,
    organizationId,
    autoCalculate = true,
    refreshInterval = 0, // Default: no auto-refresh
    onHealthChange,
    onRiskAlert,
    onError
  } = options

  // Use target user ID or current user ID
  const effectiveUserId = targetUserId || user?.id

  // State
  const [health, setHealth] = useState<CustomerHealth | null>(null)
  const [scoreBreakdown, setScoreBreakdown] = useState<HealthScoreComponents | null>(null)
  const [riskAssessment, setRiskAssessment] = useState<ChurnRiskAssessment | null>(null)
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [historicalScores, setHistoricalScores] = useState<UseCustomerHealthReturn['historicalScores']>(null)
  const [analytics, setAnalytics] = useState<UseCustomerHealthReturn['analytics']>(null)
  
  const [isLoading, setIsLoading] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  // Error handler
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    onError?.(errorMessage)
    console.error('Customer health error:', errorMessage)
  }, [onError])

  // Calculate health score
  const calculate = useCallback(async (customWeights?: Partial<HealthScoreComponents>): Promise<boolean> => {
    if (!effectiveUserId) {
      handleError('User ID not available')
      return false
    }

    try {
      setIsCalculating(true)
      setError(null)

      const request: CalculateHealthScoreRequest = {
        user_id: effectiveUserId,
        organization_id: organizationId,
        calculation_method: 'standard',
        custom_weights: customWeights
      }

      const result = await calculateHealthScore(request)
      
      if (result.success && result.data) {
        setHealth(result.data)
        setLastUpdated(new Date().toISOString())
        onHealthChange?.(result.data)
        
        // Refresh to get complete data including breakdown
        await fetchHealthData(true)
        
        return true
      } else {
        handleError(result.error || 'Failed to calculate health score')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to calculate health score')
      return false
    } finally {
      setIsCalculating(false)
    }
  }, [effectiveUserId, organizationId, onHealthChange, handleError])

  // Fetch health data
  const fetchHealthData = useCallback(async (includeHistory = false) => {
    if (!effectiveUserId) return

    try {
      setIsLoading(true)
      setError(null)

      const healthData = await getHealthScore(effectiveUserId, organizationId, includeHistory)
      
      if (healthData) {
        setHealth(healthData.customer_health)
        setScoreBreakdown(healthData.score_breakdown)
        setRiskAssessment(healthData.risk_assessment)
        setRecommendations(healthData.recommendations)
        setHistoricalScores(healthData.historical_scores || null)
        setLastUpdated(healthData.customer_health.calculated_at)
        
        // Trigger risk alert if high risk
        if (healthData.risk_assessment.probability_percentage > 70) {
          onRiskAlert?.(healthData.risk_assessment)
        }
      } else if (autoCalculate) {
        // Auto-calculate if no health data exists
        await calculate()
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to fetch health data')
    } finally {
      setIsLoading(false)
    }
  }, [effectiveUserId, organizationId, autoCalculate, calculate, onRiskAlert, handleError])

  // Load analytics for admin users
  const loadAnalytics = useCallback(async () => {
    try {
      const analyticsData = await getHealthAnalytics(organizationId)
      setAnalytics(analyticsData)
    } catch (err) {
      console.error('Failed to load health analytics:', err)
    }
  }, [organizationId])

  // Refresh data
  const refresh = useCallback(async () => {
    await fetchHealthData(true)
    
    // Load analytics for admin users
    if (user?.role === 'admin' || user?.role === 'owner') {
      await loadAnalytics()
    }
  }, [fetchHealthData, loadAnalytics, user?.role])

  // Health insights
  const getHealthTrend = useCallback((): 'improving' | 'declining' | 'stable' | 'unknown' => {
    if (!health?.score_trend) return 'unknown'
    return health.score_trend as 'improving' | 'declining' | 'stable'
  }, [health])

  const getScoreChange = useCallback((): number => {
    if (!health?.health_score || !health?.previous_score) return 0
    return health.health_score - health.previous_score
  }, [health])

  const isHealthy = useCallback((): boolean => {
    return health?.health_status === 'healthy'
  }, [health])

  const isAtRisk = useCallback((): boolean => {
    return health?.health_status === 'at_risk'
  }, [health])

  const isCritical = useCallback((): boolean => {
    return health?.health_status === 'critical' || health?.health_status === 'churned'
  }, [health])

  const requiresIntervention = useCallback((): boolean => {
    return health?.intervention_required === true
  }, [health])

  // Score utilities
  const getScoreColor = useCallback((score: number): string => {
    if (score >= HEALTH_SCORE_THRESHOLDS.healthy.min) return '#10B981' // green
    if (score >= HEALTH_SCORE_THRESHOLDS.at_risk.min) return '#F59E0B' // yellow
    if (score >= HEALTH_SCORE_THRESHOLDS.critical.min) return '#EF4444' // red
    return '#7F1D1D' // dark red
  }, [])

  const getStatusColor = useCallback((status: HealthStatus): string => {
    const colors = {
      healthy: '#10B981',
      at_risk: '#F59E0B',
      critical: '#EF4444',
      churned: '#7F1D1D',
      recovering: '#3B82F6'
    }
    return colors[status] || '#6B7280'
  }, [])

  const getScoreDescription = useCallback((score: number): string => {
    if (score >= HEALTH_SCORE_THRESHOLDS.healthy.min) return 'Excellent health'
    if (score >= HEALTH_SCORE_THRESHOLDS.at_risk.min) return 'Good health with some concerns'
    if (score >= HEALTH_SCORE_THRESHOLDS.critical.min) return 'Poor health, needs attention'
    return 'Critical health, immediate action required'
  }, [])

  // Derived values
  const healthScore = health?.health_score || 0
  const healthStatus = health?.health_status || 'healthy'
  const churnRisk = riskAssessment?.probability_percentage || 0

  // Effects
  useEffect(() => {
    if (effectiveUserId) {
      fetchHealthData(true)
    }
  }, [effectiveUserId, fetchHealthData])

  // Auto-refresh effect
  useEffect(() => {
    if (refreshInterval > 0 && effectiveUserId) {
      const interval = setInterval(() => {
        fetchHealthData(false) // Don't include history on auto-refresh
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [refreshInterval, effectiveUserId, fetchHealthData])

  // Load analytics for admin users
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'owner') {
      loadAnalytics()
    }
  }, [user?.role, loadAnalytics])

  return {
    // Health data
    health,
    scoreBreakdown,
    riskAssessment,
    recommendations,
    historicalScores,
    
    // Status indicators
    isLoading,
    isCalculating,
    error,
    lastUpdated,
    
    // Actions
    calculate,
    refresh,
    
    // Health insights
    getHealthTrend,
    getScoreChange,
    isHealthy,
    isAtRisk,
    isCritical,
    requiresIntervention,
    
    // Score utilities
    getScoreColor,
    getStatusColor,
    getScoreDescription,
    
    // Analytics
    analytics
  }
}

// Hook for health monitoring dashboard (admin use)
export function useHealthDashboard(organizationId?: string, timeRange = '30d') {
  const [analytics, setAnalytics] = useState<UseCustomerHealthReturn['analytics']>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const analyticsData = await getHealthAnalytics(organizationId, timeRange)
      setAnalytics(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [organizationId, timeRange])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Computed metrics
  const healthMetrics = useMemo(() => {
    if (!analytics) return null

    const totalUsers = analytics.total_users
    const healthyUsers = analytics.health_distribution.healthy || 0
    const atRiskUsers = analytics.health_distribution.at_risk || 0
    const criticalUsers = analytics.health_distribution.critical || 0
    const churnedUsers = analytics.health_distribution.churned || 0

    return {
      totalUsers,
      healthyPercentage: totalUsers > 0 ? (healthyUsers / totalUsers) * 100 : 0,
      atRiskPercentage: totalUsers > 0 ? (atRiskUsers / totalUsers) * 100 : 0,
      criticalPercentage: totalUsers > 0 ? (criticalUsers / totalUsers) * 100 : 0,
      churnedPercentage: totalUsers > 0 ? (churnedUsers / totalUsers) * 100 : 0,
      interventionRate: totalUsers > 0 ? (analytics.intervention_required_count / totalUsers) * 100 : 0
    }
  }, [analytics])

  return {
    analytics,
    healthMetrics,
    isLoading,
    error,
    refresh: loadDashboard
  }
}

// Hook for churn risk alerts
export function useChurnRiskAlerts(organizationId?: string) {
  const [alerts, setAlerts] = useState<Array<{
    user_id: string
    user_email?: string
    risk_score: number
    risk_factors: string[]
    recommended_interventions: string[]
    created_at: string
  }>>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadAlerts = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // In a real implementation, this would fetch users with high churn risk
      // For now, we'll simulate with empty array
      setAlerts([])
    } catch (err) {
      console.error('Failed to load churn risk alerts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [organizationId])

  const dismissAlert = useCallback((userId: string) => {
    setAlerts(prev => prev.filter(alert => alert.user_id !== userId))
  }, [])

  const acknowledgeAlert = useCallback(async (userId: string, intervention: string) => {
    // In a real implementation, this would record the intervention
    dismissAlert(userId)
    return true
  }, [dismissAlert])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  return {
    alerts,
    isLoading,
    dismissAlert,
    acknowledgeAlert,
    refresh: loadAlerts
  }
}