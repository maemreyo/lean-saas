// Feedback Collection and Analysis Hook

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { 
  UserFeedback, 
  FeedbackType,
  SubmitFeedbackRequest
} from '@/shared/types/customer-success'
import {
  submitFeedback,
  getFeedbackAnalytics,
  getRecentFeedback,
  markFeedbackProcessed,
  completeFeedbackFollowUp,
  getFeedbackByContext,
  getNPSCategory,
  getCSATCategory
} from '@/lib/customer-success/feedback'

interface UseFeedbackOptions {
  organizationId?: string
  autoLoad?: boolean
  context?: {
    featureName?: string
    pageUrl?: string
    userSegment?: string
  }
  onSubmit?: (feedback: UserFeedback) => void
  onError?: (error: string) => void
}

interface FeedbackAnalytics {
  total_feedback: number
  nps_score: number | null
  csat_average: number | null
  satisfaction_distribution: Record<string, number>
  sentiment_distribution: Record<string, number>
  feedback_by_type: Record<FeedbackType, number>
  trending_topics: Array<{ topic: string; count: number; sentiment: string }>
  response_rate: number
}

interface UseFeedbackReturn {
  // Feedback submission
  submit: (request: Omit<SubmitFeedbackRequest, 'user_id' | 'organization_id'>) => Promise<boolean>
  isSubmitting: boolean
  submitError: string | null
  
  // Recent feedback
  recentFeedback: UserFeedback[]
  isLoadingRecent: boolean
  
  // Analytics
  analytics: FeedbackAnalytics | null
  isLoadingAnalytics: boolean
  analyticsError: string | null
  
  // Context-specific feedback
  contextFeedback: {
    feedback: UserFeedback[]
    average_rating: number
    sentiment_summary: Record<string, number>
    common_issues: string[]
  } | null
  
  // Feedback management (for admin users)
  markAsProcessed: (feedbackId: string, notes?: string) => Promise<boolean>
  completeFollowUp: (feedbackId: string, notes: string) => Promise<boolean>
  
  // Utilities
  refresh: () => Promise<void>
  getNPSCategory: (score: number) => 'promoter' | 'passive' | 'detractor'
  getCSATCategory: (score: number) => 'poor' | 'fair' | 'good' | 'excellent'
  
  // Quick feedback helpers
  submitNPS: (score: number, comment?: string) => Promise<boolean>
  submitCSAT: (score: number, comment?: string) => Promise<boolean>
  submitRating: (rating: number, comment?: string) => Promise<boolean>
  submitBugReport: (title: string, description: string) => Promise<boolean>
  submitFeatureRequest: (title: string, description: string) => Promise<boolean>
}

export function useFeedback(options: UseFeedbackOptions = {}): UseFeedbackReturn {
  const { user } = useAuth()
  const {
    organizationId,
    autoLoad = true,
    context,
    onSubmit,
    onError
  } = options

  // State
  const [recentFeedback, setRecentFeedback] = useState<UserFeedback[]>([])
  const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null)
  const [contextFeedback, setContextFeedback] = useState<UseFeedbackReturn['contextFeedback']>(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLoadingRecent, setIsLoadingRecent] = useState(false)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)

  // Error handler
  const handleError = useCallback((errorMessage: string) => {
    setSubmitError(errorMessage)
    onError?.(errorMessage)
    console.error('Feedback error:', errorMessage)
  }, [onError])

  // Submit feedback
  const submit = useCallback(async (
    feedbackData: Omit<SubmitFeedbackRequest, 'user_id' | 'organization_id'>
  ): Promise<boolean> => {
    if (!user?.id) {
      handleError('User not authenticated')
      return false
    }

    try {
      setIsSubmitting(true)
      setSubmitError(null)

      const request: SubmitFeedbackRequest = {
        user_id: user.id,
        organization_id: organizationId,
        ...feedbackData,
        context: {
          ...context,
          ...feedbackData.context
        }
      }

      const result = await submitFeedback(request)
      
      if (result.success && result.data) {
        onSubmit?.(result.data)
        
        // Refresh recent feedback
        await loadRecentFeedback()
        
        return true
      } else {
        handleError(result.error || 'Failed to submit feedback')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to submit feedback')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [user?.id, organizationId, context, onSubmit, handleError])

  // Quick feedback submission helpers
  const submitNPS = useCallback(async (score: number, comment?: string): Promise<boolean> => {
    return await submit({
      feedback_type: 'nps',
      nps_score: score,
      content: comment
    })
  }, [submit])

  const submitCSAT = useCallback(async (score: number, comment?: string): Promise<boolean> => {
    return await submit({
      feedback_type: 'csat',
      csat_score: score,
      content: comment
    })
  }, [submit])

  const submitRating = useCallback(async (rating: number, comment?: string): Promise<boolean> => {
    return await submit({
      feedback_type: 'rating',
      rating,
      content: comment
    })
  }, [submit])

  const submitBugReport = useCallback(async (title: string, description: string): Promise<boolean> => {
    return await submit({
      feedback_type: 'bug_report',
      title,
      content: description
    })
  }, [submit])

  const submitFeatureRequest = useCallback(async (title: string, description: string): Promise<boolean> => {
    return await submit({
      feedback_type: 'feature_request',
      title,
      content: description
    })
  }, [submit])

  // Load recent feedback
  const loadRecentFeedback = useCallback(async () => {
    try {
      setIsLoadingRecent(true)
      
      const feedback = await getRecentFeedback(organizationId, 10)
      setRecentFeedback(feedback)
    } catch (err) {
      console.error('Failed to load recent feedback:', err)
    } finally {
      setIsLoadingRecent(false)
    }
  }, [organizationId])

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoadingAnalytics(true)
      setAnalyticsError(null)
      
      const analyticsData = await getFeedbackAnalytics(organizationId, user?.id)
      setAnalytics(analyticsData)
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoadingAnalytics(false)
    }
  }, [organizationId, user?.id])

  // Load context-specific feedback
  const loadContextFeedback = useCallback(async () => {
    if (!context) return

    try {
      const contextData = await getFeedbackByContext(context, organizationId)
      setContextFeedback(contextData)
    } catch (err) {
      console.error('Failed to load context feedback:', err)
    }
  }, [context, organizationId])

  // Mark feedback as processed (admin function)
  const markAsProcessed = useCallback(async (feedbackId: string, notes?: string): Promise<boolean> => {
    try {
      const result = await markFeedbackProcessed(feedbackId, notes)
      
      if (result.success) {
        // Refresh feedback data
        await loadRecentFeedback()
        return true
      } else {
        handleError(result.error || 'Failed to mark feedback as processed')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to mark feedback as processed')
      return false
    }
  }, [handleError, loadRecentFeedback])

  // Complete follow-up (admin function)
  const completeFollowUp = useCallback(async (feedbackId: string, notes: string): Promise<boolean> => {
    try {
      const result = await completeFeedbackFollowUp(feedbackId, notes)
      
      if (result.success) {
        // Refresh feedback data
        await loadRecentFeedback()
        return true
      } else {
        handleError(result.error || 'Failed to complete follow-up')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to complete follow-up')
      return false
    }
  }, [handleError, loadRecentFeedback])

  // Refresh all data
  const refresh = useCallback(async () => {
    await Promise.all([
      loadRecentFeedback(),
      loadAnalytics(),
      loadContextFeedback()
    ])
  }, [loadRecentFeedback, loadAnalytics, loadContextFeedback])

  // Effects
  useEffect(() => {
    if (autoLoad) {
      loadRecentFeedback()
      loadAnalytics()
    }
  }, [autoLoad, loadRecentFeedback, loadAnalytics])

  useEffect(() => {
    if (context) {
      loadContextFeedback()
    }
  }, [context, loadContextFeedback])

  return {
    // Feedback submission
    submit,
    isSubmitting,
    submitError,
    
    // Recent feedback
    recentFeedback,
    isLoadingRecent,
    
    // Analytics
    analytics,
    isLoadingAnalytics,
    analyticsError,
    
    // Context-specific feedback
    contextFeedback,
    
    // Feedback management
    markAsProcessed,
    completeFollowUp,
    
    // Utilities
    refresh,
    getNPSCategory,
    getCSATCategory,
    
    // Quick feedback helpers
    submitNPS,
    submitCSAT,
    submitRating,
    submitBugReport,
    submitFeatureRequest
  }
}

// Hook for feedback widget/form
export function useFeedbackWidget(
  feedbackType: FeedbackType,
  context?: {
    featureName?: string
    pageUrl?: string
  }
) {
  const { submit, isSubmitting, submitError } = useFeedback({ context })
  const [isVisible, setIsVisible] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const showWidget = useCallback(() => {
    setIsVisible(true)
  }, [])

  const hideWidget = useCallback(() => {
    setIsVisible(false)
  }, [])

  const submitAndHide = useCallback(async (feedbackData: any): Promise<boolean> => {
    const success = await submit({
      feedback_type: feedbackType,
      ...feedbackData
    })
    
    if (success) {
      setHasSubmitted(true)
      setIsVisible(false)
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setHasSubmitted(false), 3000)
    }
    
    return success
  }, [submit, feedbackType])

  return {
    isVisible,
    hasSubmitted,
    isSubmitting,
    submitError,
    showWidget,
    hideWidget,
    submit: submitAndHide
  }
}

// Hook for NPS survey
export function useNPSSurvey(options: { 
  autoShow?: boolean
  delay?: number
  organizationId?: string 
} = {}) {
  const { submitNPS, isSubmitting } = useFeedback(options)
  const [isVisible, setIsVisible] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [selectedScore, setSelectedScore] = useState<number | null>(null)

  const { autoShow = false, delay = 5000 } = options

  const showSurvey = useCallback(() => {
    setIsVisible(true)
  }, [])

  const hideSurvey = useCallback(() => {
    setIsVisible(false)
  }, [])

  const selectScore = useCallback((score: number) => {
    setSelectedScore(score)
  }, [])

  const submitScore = useCallback(async (comment?: string): Promise<boolean> => {
    if (selectedScore === null) return false
    
    const success = await submitNPS(selectedScore, comment)
    
    if (success) {
      setHasSubmitted(true)
      setIsVisible(false)
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setHasSubmitted(false), 3000)
    }
    
    return success
  }, [selectedScore, submitNPS])

  const getNPSCategoryForScore = useCallback((score: number) => {
    return getNPSCategory(score)
  }, [])

  // Auto-show survey with delay
  useEffect(() => {
    if (autoShow && !hasSubmitted) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, delay)
      
      return () => clearTimeout(timer)
    }
  }, [autoShow, delay, hasSubmitted])

  return {
    isVisible,
    hasSubmitted,
    isSubmitting,
    selectedScore,
    showSurvey,
    hideSurvey,
    selectScore,
    submitScore,
    getNPSCategory: getNPSCategoryForScore
  }
}

// Hook for feedback analytics (admin use)
export function useFeedbackAnalytics(
  organizationId?: string,
  timeRange = '30d',
  feedbackType?: FeedbackType
) {
  const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const analyticsData = await getFeedbackAnalytics(
        organizationId,
        undefined, // userId - for org-wide analytics
        timeRange,
        feedbackType
      )
      setAnalytics(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [organizationId, timeRange, feedbackType])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const refreshAnalytics = useCallback(async () => {
    await loadAnalytics()
  }, [loadAnalytics])

  return {
    analytics,
    isLoading,
    error,
    refresh: refreshAnalytics
  }
}