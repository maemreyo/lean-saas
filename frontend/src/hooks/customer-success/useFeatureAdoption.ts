// Feature Adoption Tracking and Analytics Hook

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { 
  FeatureAdoption,
  AdoptionStatus,
  TrackFeatureUsageRequest,
  UpdateAdoptionStatusRequest,
  FeatureUsageAnalytics,
  FeatureAdoptionResponse
} from '@/shared/types/customer-success'
import {
  trackFeatureUsage,
  getUserFeatureAdoption,
  getFeatureUsageAnalytics,
  updateAdoptionStatus,
  getFeatureAdoptionFunnel,
  calculateFeatureStickiness,
  FEATURE_CATEGORIES,
  ADOPTION_THRESHOLDS,
  FEATURE_RECOMMENDATIONS
} from '@/lib/customer-success/feature-adoption'

interface UseFeatureAdoptionOptions {
  userId?: string
  organizationId?: string
  featureNames?: string[]
  autoTrack?: boolean
  onAdoptionChange?: (featureName: string, status: AdoptionStatus) => void
  onMilestone?: (featureName: string, milestone: string) => void
  onError?: (error: string) => void
}

interface UseFeatureAdoptionReturn {
  // Adoption data
  adoptions: FeatureAdoption[]
  adoptionSummary: {
    total_features: number
    adopted_features: number
    adoption_rate: number
    power_user_features: number
  } | null
  recommendedFeatures: string[]
  
  // Loading states
  isLoading: boolean
  isTracking: boolean
  error: string | null
  
  // Tracking actions
  track: (featureName: string, options?: {
    sessionDuration?: number
    depthScore?: number
    metadata?: Record<string, any>
  }) => Promise<boolean>
  updateStatus: (featureName: string, status: AdoptionStatus) => Promise<boolean>
  
  // Analytics
  analytics: FeatureUsageAnalytics[]
  getAdoptionRate: (featureName: string) => number
  getUsageFrequency: (featureName: string) => number
  getAdoptionStatus: (featureName: string) => AdoptionStatus
  isFeatureAdopted: (featureName: string) => boolean
  isPowerUser: (featureName: string) => boolean
  
  // Feature insights
  getFeatureCategory: (featureName: string) => string | null
  getRecommendationsFor: (featureName: string) => string[]
  getNextMilestone: (featureName: string) => string | null
  getUsageStreak: (featureName: string) => number
  
  // Utilities
  refresh: () => Promise<void>
  getFeatureStats: (featureName: string) => FeatureAdoption | null
  getCategoryStats: (category: string) => {
    total: number
    adopted: number
    rate: number
  }
}

export function useFeatureAdoption(options: UseFeatureAdoptionOptions = {}): UseFeatureAdoptionReturn {
  const { user } = useAuth()
  const {
    userId: targetUserId,
    organizationId,
    featureNames,
    autoTrack = true,
    onAdoptionChange,
    onMilestone,
    onError
  } = options

  // Use target user ID or current user ID
  const effectiveUserId = targetUserId || user?.id

  // State
  const [adoptions, setAdoptions] = useState<FeatureAdoption[]>([])
  const [adoptionSummary, setAdoptionSummary] = useState<UseFeatureAdoptionReturn['adoptionSummary']>(null)
  const [recommendedFeatures, setRecommendedFeatures] = useState<string[]>([])
  const [analytics, setAnalytics] = useState<FeatureUsageAnalytics[]>([])
  
  const [isLoading, setIsLoading] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Error handler
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    onError?.(errorMessage)
    console.error('Feature adoption error:', errorMessage)
  }, [onError])

  // Track feature usage
  const track = useCallback(async (
    featureName: string,
    options: {
      sessionDuration?: number
      depthScore?: number
      metadata?: Record<string, any>
    } = {}
  ): Promise<boolean> => {
    if (!effectiveUserId) {
      handleError('User ID not available')
      return false
    }

    try {
      setIsTracking(true)
      setError(null)

      const request: TrackFeatureUsageRequest = {
        user_id: effectiveUserId,
        organization_id: organizationId,
        feature_name: featureName,
        feature_category: getFeatureCategoryForName(featureName),
        session_duration: options.sessionDuration || 0,
        depth_score: options.depthScore || 0,
        metadata: options.metadata || {}
      }

      const result = await trackFeatureUsage(request)
      
      if (result.success && result.data) {
        // Update local adoption data
        setAdoptions(prev => {
          const existing = prev.find(a => a.feature_name === featureName)
          if (existing) {
            return prev.map(a => a.feature_name === featureName ? result.data! : a)
          } else {
            return [...prev, result.data!]
          }
        })

        // Trigger callbacks
        if (result.adoption_status) {
          onAdoptionChange?.(featureName, result.adoption_status)
        }

        return true
      } else {
        handleError(result.error || 'Failed to track feature usage')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to track feature usage')
      return false
    } finally {
      setIsTracking(false)
    }
  }, [effectiveUserId, organizationId, onAdoptionChange, handleError])

  // Update adoption status
  const updateStatus = useCallback(async (
    featureName: string, 
    status: AdoptionStatus
  ): Promise<boolean> => {
    if (!effectiveUserId) {
      handleError('User ID not available')
      return false
    }

    try {
      setIsTracking(true)
      setError(null)

      const request: UpdateAdoptionStatusRequest = {
        user_id: effectiveUserId,
        feature_name: featureName,
        adoption_status: status
      }

      const result = await updateAdoptionStatus(request)
      
      if (result.success && result.data) {
        // Update local adoption data
        setAdoptions(prev => prev.map(a => 
          a.feature_name === featureName ? result.data! : a
        ))

        onAdoptionChange?.(featureName, status)
        return true
      } else {
        handleError(result.error || 'Failed to update adoption status')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to update adoption status')
      return false
    } finally {
      setIsTracking(false)
    }
  }, [effectiveUserId, onAdoptionChange, handleError])

  // Load adoption data
  const loadAdoptionData = useCallback(async () => {
    if (!effectiveUserId) return

    try {
      setIsLoading(true)
      setError(null)

      const adoptionData = await getUserFeatureAdoption(
        effectiveUserId,
        organizationId,
        featureNames
      )

      setAdoptions(adoptionData.feature_adoption)
      setAdoptionSummary(adoptionData.adoption_summary)
      setRecommendedFeatures(adoptionData.recommended_features)
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to load adoption data')
    } finally {
      setIsLoading(false)
    }
  }, [effectiveUserId, organizationId, featureNames, handleError])

  // Load analytics (for admin users)
  const loadAnalytics = useCallback(async () => {
    try {
      const analyticsData = await getFeatureUsageAnalytics(organizationId)
      setAnalytics(analyticsData)
    } catch (err) {
      console.error('Failed to load feature analytics:', err)
    }
  }, [organizationId])

  // Analytics helpers
  const getAdoptionRate = useCallback((featureName: string): number => {
    const adoption = adoptions.find(a => a.feature_name === featureName)
    const analytic = analytics.find(a => a.feature_name === featureName)
    return analytic?.adoption_rate || 0
  }, [adoptions, analytics])

  const getUsageFrequency = useCallback((featureName: string): number => {
    const adoption = adoptions.find(a => a.feature_name === featureName)
    return adoption?.usage_frequency || 0
  }, [adoptions])

  const getAdoptionStatus = useCallback((featureName: string): AdoptionStatus => {
    const adoption = adoptions.find(a => a.feature_name === featureName)
    return adoption?.adoption_status || 'not_adopted'
  }, [adoptions])

  const isFeatureAdopted = useCallback((featureName: string): boolean => {
    const status = getAdoptionStatus(featureName)
    return ['active', 'power_user'].includes(status)
  }, [getAdoptionStatus])

  const isPowerUser = useCallback((featureName: string): boolean => {
    const status = getAdoptionStatus(featureName)
    return status === 'power_user'
  }, [getAdoptionStatus])

  // Feature insights
  const getFeatureCategory = useCallback((featureName: string): string | null => {
    return getFeatureCategoryForName(featureName)
  }, [])

  const getRecommendationsFor = useCallback((featureName: string): string[] => {
    return FEATURE_RECOMMENDATIONS[featureName] || []
  }, [])

  const getNextMilestone = useCallback((featureName: string): string | null => {
    const adoption = adoptions.find(a => a.feature_name === featureName)
    if (!adoption) return 'First use'

    const status = adoption.adoption_status
    const usageCount = adoption.total_usage_count

    if (status === 'not_adopted') return 'First use'
    if (status === 'exploring' && usageCount < ADOPTION_THRESHOLDS.active.min_usage_count) {
      return `Use ${ADOPTION_THRESHOLDS.active.min_usage_count - usageCount} more times to become active`
    }
    if (status === 'active' && usageCount < ADOPTION_THRESHOLDS.power_user.min_usage_count) {
      return `Use ${ADOPTION_THRESHOLDS.power_user.min_usage_count - usageCount} more times to become power user`
    }
    if (status === 'power_user') return 'Mastery achieved!'

    return null
  }, [adoptions])

  const getUsageStreak = useCallback((featureName: string): number => {
    const adoption = adoptions.find(a => a.feature_name === featureName)
    if (!adoption || !adoption.last_used_at) return 0

    // Simplified streak calculation
    const lastUsed = new Date(adoption.last_used_at)
    const daysSinceLastUse = Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24))
    
    // If used within last 2 days, consider it part of streak
    return daysSinceLastUse <= 2 ? Math.floor(adoption.usage_frequency * 7) : 0
  }, [adoptions])

  // Utilities
  const refresh = useCallback(async () => {
    await Promise.all([
      loadAdoptionData(),
      loadAnalytics()
    ])
  }, [loadAdoptionData, loadAnalytics])

  const getFeatureStats = useCallback((featureName: string): FeatureAdoption | null => {
    return adoptions.find(a => a.feature_name === featureName) || null
  }, [adoptions])

  const getCategoryStats = useCallback((category: string) => {
    const categoryFeatures = Object.entries(FEATURE_CATEGORIES)
      .find(([key]) => key === category)?.[1]?.features || []
    
    const total = categoryFeatures.length
    const adopted = categoryFeatures.filter(feature => isFeatureAdopted(feature)).length
    const rate = total > 0 ? (adopted / total) * 100 : 0

    return { total, adopted, rate }
  }, [isFeatureAdopted])

  // Effects
  useEffect(() => {
    if (effectiveUserId) {
      loadAdoptionData()
    }
  }, [effectiveUserId, loadAdoptionData])

  useEffect(() => {
    // Load analytics for admin users
    if (user?.role === 'admin' || user?.role === 'owner') {
      loadAnalytics()
    }
  }, [user?.role, loadAnalytics])

  // Auto-track page/feature usage if enabled
  useEffect(() => {
    if (!autoTrack || !effectiveUserId) return

    // In a real implementation, this would track current page/feature automatically
    // For now, we'll just set up the tracking capability
    const handlePageChange = () => {
      const currentPath = window.location.pathname
      const featureName = pathToFeatureName(currentPath)
      
      if (featureName) {
        track(featureName, {
          sessionDuration: Math.floor(Math.random() * 300 + 60), // 1-5 minutes
          depthScore: Math.floor(Math.random() * 50 + 25) // 25-75%
        })
      }
    }

    // Track on mount and when URL changes
    handlePageChange()
    
    // Listen for navigation changes (simplified)
    window.addEventListener('popstate', handlePageChange)
    
    return () => {
      window.removeEventListener('popstate', handlePageChange)
    }
  }, [autoTrack, effectiveUserId, track])

  return {
    // Adoption data
    adoptions,
    adoptionSummary,
    recommendedFeatures,
    
    // Loading states
    isLoading,
    isTracking,
    error,
    
    // Tracking actions
    track,
    updateStatus,
    
    // Analytics
    analytics,
    getAdoptionRate,
    getUsageFrequency,
    getAdoptionStatus,
    isFeatureAdopted,
    isPowerUser,
    
    // Feature insights
    getFeatureCategory,
    getRecommendationsFor,
    getNextMilestone,
    getUsageStreak,
    
    // Utilities
    refresh,
    getFeatureStats,
    getCategoryStats
  }
}

// Hook for feature adoption analytics (admin use)
export function useFeatureAnalytics(
  organizationId?: string,
  timeRange = '30d',
  featureCategory?: string
) {
  const [analytics, setAnalytics] = useState<FeatureUsageAnalytics[]>([])
  const [funnelData, setFunnelData] = useState<Array<{
    stage: string
    user_count: number
    conversion_rate: number
    avg_time_to_stage: number
  }>>([])
  const [stickinessData, setStickinessData] = useState<{
    daily_active_users: number
    monthly_active_users: number
    stickiness_ratio: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [analyticsData, ...funnelResults] = await Promise.all([
        getFeatureUsageAnalytics(organizationId, timeRange, featureCategory),
        // Load funnel data for top features
        ...analytics.slice(0, 3).map(feature => 
          getFeatureAdoptionFunnel(feature.feature_name, organizationId, timeRange)
        )
      ])

      setAnalytics(analyticsData)
      
      // Combine funnel data
      const combinedFunnel = funnelResults.flat()
      setFunnelData(combinedFunnel)

      // Load stickiness for most popular feature
      if (analyticsData.length > 0) {
        const topFeature = analyticsData[0]
        const stickiness = await calculateFeatureStickiness(topFeature.feature_name, organizationId)
        setStickinessData(stickiness)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [organizationId, timeRange, featureCategory, analytics])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  return {
    analytics,
    funnelData,
    stickinessData,
    isLoading,
    error,
    refresh: loadAnalytics
  }
}

// Hook for tracking specific feature usage
export function useFeatureTracker(featureName: string, options: {
  autoTrack?: boolean
  trackDepth?: boolean
  organizationId?: string
} = {}) {
  const { track, getFeatureStats, isFeatureAdopted, getAdoptionStatus } = useFeatureAdoption(options)
  const [sessionStart] = useState(Date.now())
  const [interactions, setInteractions] = useState(0)

  const trackUsage = useCallback(async (customOptions?: {
    sessionDuration?: number
    depthScore?: number
    metadata?: Record<string, any>
  }) => {
    const sessionDuration = customOptions?.sessionDuration || Math.floor((Date.now() - sessionStart) / 1000)
    const depthScore = customOptions?.depthScore || Math.min(interactions * 10, 100)

    return await track(featureName, {
      sessionDuration,
      depthScore,
      ...customOptions
    })
  }, [track, featureName, sessionStart, interactions])

  const recordInteraction = useCallback(() => {
    setInteractions(prev => prev + 1)
  }, [])

  // Auto-track on unmount if enabled
  useEffect(() => {
    if (!options.autoTrack) return

    return () => {
      if (interactions > 0) {
        trackUsage()
      }
    }
  }, [options.autoTrack, interactions, trackUsage])

  const featureStats = getFeatureStats(featureName)
  const isAdopted = isFeatureAdopted(featureName)
  const adoptionStatus = getAdoptionStatus(featureName)

  return {
    featureStats,
    isAdopted,
    adoptionStatus,
    interactions,
    trackUsage,
    recordInteraction
  }
}

// Helper functions
function getFeatureCategoryForName(featureName: string): string | null {
  for (const [categoryKey, category] of Object.entries(FEATURE_CATEGORIES)) {
    if (category.features.includes(featureName)) {
      return categoryKey
    }
  }
  return null
}

function pathToFeatureName(path: string): string | null {
  // Map URL paths to feature names
  const pathMappings: Record<string, string> = {
    '/dashboard': 'dashboard_view',
    '/projects/new': 'project_creation',
    '/team': 'team_management',
    '/analytics': 'usage_analytics',
    '/settings': 'basic_settings',
    '/billing': 'billing_management'
  }

  return pathMappings[path] || null
}