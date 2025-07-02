// Onboarding State Management and Progress Tracking Hook

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { 
  UserOnboarding, 
  OnboardingFlowConfig, 
  OnboardingStep,
  OnboardingStatus,
  OnboardingStatusResponse,
  StartOnboardingRequest,
  UpdateOnboardingProgressRequest,
  CompleteOnboardingRequest
} from '@/shared/types/customer-success'
import {
  startOnboarding,
  getOnboardingStatus,
  updateOnboardingProgress,
  completeOnboarding,
  skipOnboarding,
  getOnboardingAnalytics,
  getOnboardingFunnel,
  validateStepCompletion
} from '@/lib/customer-success/onboarding'

interface UseOnboardingOptions {
  flowName?: string
  organizationId?: string
  autoStart?: boolean
  onComplete?: (onboarding: UserOnboarding) => void
  onStepChange?: (step: number, data: any) => void
  onError?: (error: string) => void
}

interface UseOnboardingReturn {
  // State
  onboarding: UserOnboarding | null
  flowConfig: OnboardingFlowConfig | null
  currentStep: OnboardingStep | null
  isLoading: boolean
  error: string | null
  
  // Progress data
  completionPercentage: number
  completedSteps: number[]
  skippedSteps: number[]
  estimatedTimeRemaining: number
  
  // Actions
  start: () => Promise<boolean>
  updateStep: (step: number, stepData?: Record<string, any>, completed?: boolean, skipped?: boolean) => Promise<boolean>
  complete: (completionData?: Record<string, any>, feedback?: string) => Promise<boolean>
  skip: (reason?: string) => Promise<boolean>
  refresh: () => Promise<void>
  
  // Step helpers
  goToStep: (step: number) => void
  nextStep: () => Promise<boolean>
  previousStep: () => void
  canProceed: (step: number, stepData: Record<string, any>) => boolean
  
  // Analytics (for admin users)
  analytics: {
    completionRate: number
    averageCompletionTime: number
    stepCompletionRates: Record<number, number>
    dropOffPoints: Array<{ step: number; drop_off_rate: number }>
    totalUsers: number
    completedUsers: number
  } | null
  
  // Utils
  isStepCompleted: (step: number) => boolean
  isStepSkipped: (step: number) => boolean
  isStepCurrent: (step: number) => boolean
  getStepStatus: (step: number) => 'completed' | 'current' | 'skipped' | 'upcoming'
}

export function useOnboarding(options: UseOnboardingOptions = {}): UseOnboardingReturn {
  const { user } = useAuth()
  const {
    flowName = 'default',
    organizationId,
    autoStart = false,
    onComplete,
    onStepChange,
    onError
  } = options

  // State
  const [onboarding, setOnboarding] = useState<UserOnboarding | null>(null)
  const [flowConfig, setFlowConfig] = useState<OnboardingFlowConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<UseOnboardingReturn['analytics']>(null)

  // Derived state
  const currentStep = useMemo(() => {
    if (!flowConfig || !onboarding) return null
    return flowConfig.steps.find(step => step.step === onboarding.current_step) || null
  }, [flowConfig, onboarding])

  const completionPercentage = onboarding?.completion_percentage || 0
  const completedSteps = onboarding?.completed_steps || []
  const skippedSteps = onboarding?.skipped_steps || []
  
  const estimatedTimeRemaining = useMemo(() => {
    if (!flowConfig || !onboarding) return 0
    return flowConfig.steps
      .filter(step => step.step >= onboarding.current_step)
      .reduce((total, step) => total + (step.estimated_time || 0), 0)
  }, [flowConfig, onboarding])

  // Error handler
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    onError?.(errorMessage)
    console.error('Onboarding error:', errorMessage)
  }, [onError])

  // Fetch onboarding status
  const fetchOnboardingStatus = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const status = await getOnboardingStatus(user.id, flowName)
      
      if (status) {
        setOnboarding(status.user_onboarding)
        setFlowConfig(status.flow_config)
        
        // Trigger step change callback
        onStepChange?.(status.user_onboarding.current_step, status.user_onboarding.step_data)
      } else if (autoStart) {
        // Auto-start if no existing onboarding found
        await startOnboardingFlow()
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to fetch onboarding status')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, flowName, autoStart, onStepChange, handleError])

  // Start onboarding flow
  const startOnboardingFlow = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      handleError('User not authenticated')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      const request: StartOnboardingRequest = {
        user_id: user.id,
        organization_id: organizationId,
        flow_name: flowName,
        metadata: {
          started_from: 'react_hook',
          auto_started: autoStart
        }
      }

      const result = await startOnboarding(request)
      
      if (result.success && result.data) {
        setOnboarding(result.data)
        await fetchOnboardingStatus() // Refresh to get flow config
        return true
      } else {
        handleError(result.error || 'Failed to start onboarding')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to start onboarding')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, organizationId, flowName, autoStart, handleError, fetchOnboardingStatus])

  // Update step progress
  const updateStep = useCallback(async (
    step: number, 
    stepData: Record<string, any> = {}, 
    completed = false, 
    skipped = false
  ): Promise<boolean> => {
    if (!user?.id) {
      handleError('User not authenticated')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      const request: UpdateOnboardingProgressRequest = {
        user_id: user.id,
        step,
        step_data: {
          ...stepData,
          timestamp: new Date().toISOString(),
          completed_at: completed ? new Date().toISOString() : undefined,
          skipped_at: skipped ? new Date().toISOString() : undefined
        },
        completed,
        skipped
      }

      const result = await updateOnboardingProgress(request)
      
      if (result.success && result.data) {
        setOnboarding(result.data)
        onStepChange?.(result.data.current_step, result.data.step_data)
        return true
      } else {
        handleError(result.error || 'Failed to update step progress')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to update step progress')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, onStepChange, handleError])

  // Complete onboarding
  const complete = useCallback(async (
    completionData: Record<string, any> = {},
    feedback?: string
  ): Promise<boolean> => {
    if (!user?.id) {
      handleError('User not authenticated')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      const request: CompleteOnboardingRequest = {
        user_id: user.id,
        completion_data: {
          ...completionData,
          completed_from: 'react_hook',
          completion_timestamp: new Date().toISOString()
        },
        feedback
      }

      const result = await completeOnboarding(request)
      
      if (result.success && result.data) {
        setOnboarding(result.data)
        onComplete?.(result.data)
        return true
      } else {
        handleError(result.error || 'Failed to complete onboarding')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to complete onboarding')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, onComplete, handleError])

  // Skip onboarding
  const skip = useCallback(async (reason?: string): Promise<boolean> => {
    if (!user?.id) {
      handleError('User not authenticated')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      const result = await skipOnboarding(user.id, flowName, reason)
      
      if (result.success && result.data) {
        setOnboarding(result.data)
        return true
      } else {
        handleError(result.error || 'Failed to skip onboarding')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to skip onboarding')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, flowName, handleError])

  // Navigation helpers
  const goToStep = useCallback((step: number) => {
    if (!onboarding || !flowConfig) return
    
    // Validate step number
    if (step < 1 || step > flowConfig.total_steps) return
    
    // Update current step (without marking as completed)
    updateStep(step, {}, false, false)
  }, [onboarding, flowConfig, updateStep])

  const nextStep = useCallback(async (): Promise<boolean> => {
    if (!onboarding || !currentStep) return false
    
    const nextStepNumber = onboarding.current_step + 1
    
    // Mark current step as completed and move to next
    return await updateStep(onboarding.current_step, {}, true, false)
  }, [onboarding, currentStep, updateStep])

  const previousStep = useCallback(() => {
    if (!onboarding) return
    
    const prevStepNumber = Math.max(1, onboarding.current_step - 1)
    goToStep(prevStepNumber)
  }, [onboarding, goToStep])

  // Step validation
  const canProceed = useCallback((step: number, stepData: Record<string, any>): boolean => {
    if (!flowConfig) return false
    
    const stepConfig = flowConfig.steps.find(s => s.step === step)
    if (!stepConfig) return false

    // If step is not required, can always proceed
    if (!stepConfig.required) return true

    // Validate completion criteria if defined
    if (stepConfig.completion_criteria) {
      const validation = validateStepCompletion(stepConfig, stepData)
      return validation.isValid
    }

    return true
  }, [flowConfig])

  // Step status helpers
  const isStepCompleted = useCallback((step: number): boolean => {
    return completedSteps.includes(step)
  }, [completedSteps])

  const isStepSkipped = useCallback((step: number): boolean => {
    return skippedSteps.includes(step)
  }, [skippedSteps])

  const isStepCurrent = useCallback((step: number): boolean => {
    return onboarding?.current_step === step
  }, [onboarding])

  const getStepStatus = useCallback((step: number): 'completed' | 'current' | 'skipped' | 'upcoming' => {
    if (isStepCompleted(step)) return 'completed'
    if (isStepSkipped(step)) return 'skipped'
    if (isStepCurrent(step)) return 'current'
    return 'upcoming'
  }, [isStepCompleted, isStepSkipped, isStepCurrent])

  // Refresh data
  const refresh = useCallback(async () => {
    await fetchOnboardingStatus()
  }, [fetchOnboardingStatus])

  // Load analytics for admin users
  const loadAnalytics = useCallback(async () => {
    if (!organizationId) return

    try {
      const analyticsData = await getOnboardingAnalytics(organizationId, flowName)
      setAnalytics(analyticsData)
    } catch (err) {
      console.error('Failed to load onboarding analytics:', err)
    }
  }, [organizationId, flowName])

  // Effects
  useEffect(() => {
    if (user?.id) {
      fetchOnboardingStatus()
    }
  }, [user?.id, flowName, fetchOnboardingStatus])

  useEffect(() => {
    // Load analytics for admin users
    if (user?.role === 'admin' || user?.role === 'owner') {
      loadAnalytics()
    }
  }, [user?.role, loadAnalytics])

  // Auto-save step data periodically
  useEffect(() => {
    if (!onboarding || onboarding.status === 'completed') return

    const interval = setInterval(() => {
      if (onboarding.current_step && currentStep) {
        // Auto-save current step data
        updateStep(onboarding.current_step, {
          auto_saved_at: new Date().toISOString(),
          time_on_step: Date.now() - new Date(onboarding.last_activity_at).getTime()
        }, false, false)
      }
    }, 30000) // Auto-save every 30 seconds

    return () => clearInterval(interval)
  }, [onboarding, currentStep, updateStep])

  return {
    // State
    onboarding,
    flowConfig,
    currentStep,
    isLoading,
    error,
    
    // Progress data
    completionPercentage,
    completedSteps,
    skippedSteps,
    estimatedTimeRemaining,
    
    // Actions
    start: startOnboardingFlow,
    updateStep,
    complete,
    skip,
    refresh,
    
    // Step helpers
    goToStep,
    nextStep,
    previousStep,
    canProceed,
    
    // Analytics
    analytics,
    
    // Utils
    isStepCompleted,
    isStepSkipped,
    isStepCurrent,
    getStepStatus
  }
}

// Hook for onboarding analytics (admin/manager use)
export function useOnboardingAnalytics(organizationId?: string, flowName = 'default', timeRange = '30d') {
  const [analytics, setAnalytics] = useState<UseOnboardingReturn['analytics']>(null)
  const [funnel, setFunnel] = useState<Array<{
    step: number
    title: string
    users_reached: number
    users_completed: number
    completion_rate: number
    avg_time_spent: number
  }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [analyticsData, funnelData] = await Promise.all([
        getOnboardingAnalytics(organizationId, flowName, timeRange),
        getOnboardingFunnel(organizationId, flowName)
      ])

      setAnalytics(analyticsData)
      setFunnel(funnelData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [organizationId, flowName, timeRange])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  return {
    analytics,
    funnel,
    isLoading,
    error,
    refresh: loadAnalytics
  }
}