// Feature Tours State Management and Interaction Hook

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { 
  FeatureTour, 
  TourConfig, 
  TourStep,
  TourStatus,
  TourStatusResponse,
  StartTourRequest,
  UpdateTourProgressRequest,
  CompleteTourRequest
} from '@/shared/types/customer-success'
import {
  startTour,
  getTourStatus,
  updateTourProgress,
  completeTour,
  skipTour,
  pauseTour,
  resumeTour,
  getTourAnalytics,
  shouldOfferTour,
  getRecommendedTours
} from '@/lib/customer-success/feature-tours'

interface UseFeatureToursOptions {
  tourName?: string
  autoStart?: boolean
  onComplete?: (tour: FeatureTour, feedback?: any) => void
  onSkip?: (tour: FeatureTour) => void
  onStepChange?: (step: number, stepData: any) => void
  onError?: (error: string) => void
  userContext?: Record<string, any>
}

interface UseFeatureToursReturn {
  // Current tour state
  tour: FeatureTour | null
  tourConfig: TourConfig | null
  currentStep: TourStep | null
  isLoading: boolean
  error: string | null
  
  // Tour progress
  progressPercentage: number
  completedSteps: number[]
  currentStepIndex: number
  totalSteps: number
  
  // Tour actions
  start: (tourName: string) => Promise<boolean>
  next: (interactionData?: Record<string, any>) => Promise<boolean>
  previous: () => Promise<boolean>
  goToStep: (step: number) => Promise<boolean>
  complete: (feedback?: { score?: number; comment?: string }) => Promise<boolean>
  skip: (reason?: string) => Promise<boolean>
  pause: () => Promise<boolean>
  resume: () => Promise<boolean>
  
  // Tour management
  getRecommendations: () => Promise<string[]>
  shouldOffer: (tourName: string) => Promise<boolean>
  refresh: () => Promise<void>
  
  // Multi-tour management
  availableTours: string[]
  completedTours: string[]
  activeTour: FeatureTour | null
  
  // Analytics (for admin users)
  analytics: {
    total_tours: number
    completed_tours: number
    completion_rate: number
    average_completion_time: number
    average_rating: number
    step_completion_rates: Record<number, number>
    popular_tours: Array<{ tour_name: string; starts: number; completions: number }>
  } | null
}

export function useFeatureTours(options: UseFeatureToursOptions = {}): UseFeatureToursReturn {
  const { user } = useAuth()
  const {
    tourName,
    autoStart = false,
    onComplete,
    onSkip,
    onStepChange,
    onError,
    userContext = {}
  } = options

  // State
  const [tour, setTour] = useState<FeatureTour | null>(null)
  const [tourConfig, setTourConfig] = useState<TourConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<UseFeatureToursReturn['analytics']>(null)
  const [availableTours, setAvailableTours] = useState<string[]>([])
  const [completedTours, setCompletedTours] = useState<string[]>([])

  // Derived state
  const currentStep = useMemo(() => {
    if (!tourConfig || !tour) return null
    return tourConfig.steps.find(step => step.step === tour.current_step) || null
  }, [tourConfig, tour])

  const progressPercentage = useMemo(() => {
    if (!tour || !tourConfig) return 0
    return Math.round(((tour.completed_steps?.length || 0) / tourConfig.total_steps) * 100)
  }, [tour, tourConfig])

  const completedSteps = tour?.completed_steps || []
  const currentStepIndex = tour?.current_step || 1
  const totalSteps = tourConfig?.total_steps || 0
  const activeTour = tour?.status === 'active' ? tour : null

  // Error handler
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    onError?.(errorMessage)
    console.error('Feature tour error:', errorMessage)
  }, [onError])

  // Fetch tour status
  const fetchTourStatus = useCallback(async (tourName: string) => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const status = await getTourStatus(user.id, tourName)
      
      if (status) {
        setTour(status.feature_tour)
        setTourConfig(status.tour_config)
        
        // Trigger step change callback
        onStepChange?.(status.feature_tour.current_step, status.feature_tour.interactions)
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to fetch tour status')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, onStepChange, handleError])

  // Start tour
  const startTourFlow = useCallback(async (tourName: string): Promise<boolean> => {
    if (!user?.id) {
      handleError('User not authenticated')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      const request: StartTourRequest = {
        tour_name: tourName,
        user_id: user.id,
        tour_version: '1.0'
      }

      const result = await startTour(request)
      
      if (result.success && result.data) {
        setTour(result.data)
        await fetchTourStatus(tourName) // Refresh to get tour config
        return true
      } else {
        handleError(result.error || 'Failed to start tour')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to start tour')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, handleError, fetchTourStatus])

  // Navigate to next step
  const nextStep = useCallback(async (interactionData: Record<string, any> = {}): Promise<boolean> => {
    if (!tour || !currentStep) {
      handleError('No active tour or step')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      const request: UpdateTourProgressRequest = {
        tour_id: tour.id,
        step: tour.current_step,
        interaction_data: {
          ...interactionData,
          step_completed_at: new Date().toISOString(),
          action_taken: 'next'
        },
        completed: true
      }

      const result = await updateTourProgress(request)
      
      if (result.success && result.data) {
        setTour(result.data)
        onStepChange?.(result.data.current_step, result.data.interactions)
        
        // Check if tour is completed
        if (result.data.status === 'completed') {
          onComplete?.(result.data)
        }
        
        return true
      } else {
        handleError(result.error || 'Failed to progress to next step')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to progress to next step')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [tour, currentStep, onStepChange, onComplete, handleError])

  // Navigate to previous step
  const previousStep = useCallback(async (): Promise<boolean> => {
    if (!tour || tour.current_step <= 1) return false

    return await goToStepNumber(tour.current_step - 1)
  }, [tour])

  // Go to specific step
  const goToStepNumber = useCallback(async (step: number): Promise<boolean> => {
    if (!tour || !tourConfig) {
      handleError('No active tour')
      return false
    }

    if (step < 1 || step > tourConfig.total_steps) {
      handleError('Invalid step number')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      const request: UpdateTourProgressRequest = {
        tour_id: tour.id,
        step: step,
        interaction_data: {
          navigated_from: tour.current_step,
          navigation_type: 'manual',
          timestamp: new Date().toISOString()
        },
        completed: false
      }

      const result = await updateTourProgress(request)
      
      if (result.success && result.data) {
        setTour(result.data)
        onStepChange?.(result.data.current_step, result.data.interactions)
        return true
      } else {
        handleError(result.error || 'Failed to navigate to step')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to navigate to step')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [tour, tourConfig, onStepChange, handleError])

  // Complete tour
  const completeTourFlow = useCallback(async (feedback?: { score?: number; comment?: string }): Promise<boolean> => {
    if (!tour) {
      handleError('No active tour')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      const request: CompleteTourRequest = {
        tour_id: tour.id,
        feedback_score: feedback?.score,
        feedback_comment: feedback?.comment
      }

      const result = await completeTour(request)
      
      if (result.success && result.data) {
        setTour(result.data)
        onComplete?.(result.data, feedback)
        
        // Add to completed tours
        setCompletedTours(prev => [...prev, result.data!.tour_name])
        
        return true
      } else {
        handleError(result.error || 'Failed to complete tour')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to complete tour')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [tour, onComplete, handleError])

  // Skip tour
  const skipTourFlow = useCallback(async (reason?: string): Promise<boolean> => {
    if (!tour) {
      handleError('No active tour')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      const result = await skipTour(tour.id, reason)
      
      if (result.success && result.data) {
        setTour(result.data)
        onSkip?.(result.data)
        return true
      } else {
        handleError(result.error || 'Failed to skip tour')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to skip tour')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [tour, onSkip, handleError])

  // Pause tour
  const pauseTourFlow = useCallback(async (): Promise<boolean> => {
    if (!tour) {
      handleError('No active tour')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      const result = await pauseTour(tour.id)
      
      if (result.success && result.data) {
        setTour(result.data)
        return true
      } else {
        handleError(result.error || 'Failed to pause tour')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to pause tour')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [tour, handleError])

  // Resume tour
  const resumeTourFlow = useCallback(async (): Promise<boolean> => {
    if (!tour) {
      handleError('No paused tour')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      const result = await resumeTour(tour.id)
      
      if (result.success && result.data) {
        setTour(result.data)
        return true
      } else {
        handleError(result.error || 'Failed to resume tour')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to resume tour')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [tour, handleError])

  // Get tour recommendations
  const getRecommendations = useCallback(async (): Promise<string[]> => {
    if (!user?.id) return []

    try {
      const recommendations = await getRecommendedTours(user.id, userContext)
      setAvailableTours(recommendations)
      return recommendations
    } catch (err) {
      console.error('Failed to get tour recommendations:', err)
      return []
    }
  }, [user?.id, userContext])

  // Check if tour should be offered
  const shouldOfferTourCheck = useCallback(async (tourName: string): Promise<boolean> => {
    if (!user?.id) return false

    try {
      return await shouldOfferTour(user.id, tourName, userContext)
    } catch (err) {
      console.error('Failed to check tour offer:', err)
      return false
    }
  }, [user?.id, userContext])

  // Refresh tour data
  const refresh = useCallback(async () => {
    if (tour?.tour_name) {
      await fetchTourStatus(tour.tour_name)
    }
    await getRecommendations()
  }, [tour?.tour_name, fetchTourStatus, getRecommendations])

  // Load analytics for admin users
  const loadAnalytics = useCallback(async () => {
    try {
      const analyticsData = await getTourAnalytics(undefined, tourName)
      setAnalytics(analyticsData)
    } catch (err) {
      console.error('Failed to load tour analytics:', err)
    }
  }, [tourName])

  // Effects
  useEffect(() => {
    if (user?.id && tourName) {
      fetchTourStatus(tourName)
    }
  }, [user?.id, tourName, fetchTourStatus])

  useEffect(() => {
    if (user?.id) {
      getRecommendations()
    }
  }, [user?.id, getRecommendations])

  useEffect(() => {
    // Auto-start tour if specified
    if (autoStart && tourName && user?.id && !tour) {
      startTourFlow(tourName)
    }
  }, [autoStart, tourName, user?.id, tour, startTourFlow])

  useEffect(() => {
    // Load analytics for admin users
    if (user?.role === 'admin' || user?.role === 'owner') {
      loadAnalytics()
    }
  }, [user?.role, loadAnalytics])

  // Auto-track step timing
  useEffect(() => {
    if (!tour || !currentStep || tour.status !== 'active') return

    const stepStartTime = Date.now()

    return () => {
      // Record time spent on step when component unmounts or step changes
      const timeSpent = Date.now() - stepStartTime
      
      if (timeSpent > 1000) { // Only track if spent more than 1 second
        updateTourProgress({
          tour_id: tour.id,
          step: tour.current_step,
          interaction_data: {
            time_spent_ms: timeSpent,
            auto_tracked: true
          },
          completed: false
        }).catch(console.error)
      }
    }
  }, [tour, currentStep])

  return {
    // Current tour state
    tour,
    tourConfig,
    currentStep,
    isLoading,
    error,
    
    // Tour progress
    progressPercentage,
    completedSteps,
    currentStepIndex,
    totalSteps,
    
    // Tour actions
    start: startTourFlow,
    next: nextStep,
    previous: previousStep,
    goToStep: goToStepNumber,
    complete: completeTourFlow,
    skip: skipTourFlow,
    pause: pauseTourFlow,
    resume: resumeTourFlow,
    
    // Tour management
    getRecommendations,
    shouldOffer: shouldOfferTourCheck,
    refresh,
    
    // Multi-tour management
    availableTours,
    completedTours,
    activeTour,
    
    // Analytics
    analytics
  }
}

// Hook for managing multiple tours
export function useMultipleTours(userContext: Record<string, any> = {}) {
  const { user } = useAuth()
  const [availableTours, setAvailableTours] = useState<string[]>([])
  const [activeTours, setActiveTours] = useState<FeatureTour[]>([])
  const [completedTours, setCompletedTours] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadTourData = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      
      const recommendations = await getRecommendedTours(user.id, userContext)
      setAvailableTours(recommendations)
      
      // Load any active tours
      // This would require a function to get all active tours for a user
      // For now, we'll leave it as an empty array
      setActiveTours([])
      
    } catch (err) {
      console.error('Failed to load tour data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, userContext])

  useEffect(() => {
    loadTourData()
  }, [loadTourData])

  return {
    availableTours,
    activeTours,
    completedTours,
    isLoading,
    refresh: loadTourData
  }
}

// Hook for tour analytics (admin use)
export function useTourAnalytics(organizationId?: string, tourName?: string, timeRange = '30d') {
  const [analytics, setAnalytics] = useState<UseFeatureToursReturn['analytics']>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const analyticsData = await getTourAnalytics(organizationId, tourName, timeRange)
      setAnalytics(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [organizationId, tourName, timeRange])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  return {
    analytics,
    isLoading,
    error,
    refresh: loadAnalytics
  }
}