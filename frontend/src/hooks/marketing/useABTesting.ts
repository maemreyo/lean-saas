// A/B Testing React Hook for Marketing & Growth Module
// Following patterns from billing module hooks

import { useState, useEffect, useCallback } from 'react'
import { 
  ABTest, 
  ABTestSession,
  ABTestResults,
  CreateABTestRequest, 
  UpdateABTestRequest
} from '@/types/marketing'
import { abTestUtils } from '@/lib/marketing/ab-testing'
import { useToast } from '@/hooks/ui/use-toast'

// ================================================
// A/B TESTS MANAGEMENT HOOK
// ================================================

export function useABTests(organizationId: string) {
  const [abTests, setABTests] = useState<ABTest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0
  })
  const { toast } = useToast()

  // Fetch A/B tests
  const fetchABTests = useCallback(async (options?: {
    status?: string
    limit?: number
    offset?: number
  }) => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      const { data, count, error } = await abTestUtils.list(organizationId, {
        status: options?.status,
        limit: options?.limit || pagination.limit,
        offset: options?.offset || pagination.offset
      })

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch A/B tests',
          variant: 'destructive'
        })
        return
      }

      setABTests(data || [])
      setPagination(prev => ({
        ...prev,
        total: count || 0,
        limit: options?.limit || prev.limit,
        offset: options?.offset || prev.offset
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [organizationId, pagination.limit, pagination.offset, toast])

  // Create A/B test
  const createABTest = useCallback(async (data: CreateABTestRequest) => {
    setLoading(true)
    setError(null)

    try {
      const { data: abTest, error } = await abTestUtils.create(data)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to create A/B test',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Add to local state
      if (abTest) {
        setABTests(prev => [abTest, ...prev])
        toast({
          title: 'Success',
          description: 'A/B test created successfully'
        })
      }

      return { success: true, data: abTest }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Update A/B test
  const updateABTest = useCallback(async (
    id: string, 
    data: UpdateABTestRequest
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { data: updatedTest, error } = await abTestUtils.update(id, data)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to update A/B test',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Update local state
      if (updatedTest) {
        setABTests(prev => 
          prev.map(test => test.id === id ? updatedTest : test)
        )
        toast({
          title: 'Success',
          description: 'A/B test updated successfully'
        })
      }

      return { success: true, data: updatedTest }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Start A/B test
  const startABTest = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const { data: startedTest, error } = await abTestUtils.start(id)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to start A/B test',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Update local state
      if (startedTest) {
        setABTests(prev => 
          prev.map(test => test.id === id ? startedTest : test)
        )
        toast({
          title: 'Success',
          description: 'A/B test started successfully'
        })
      }

      return { success: true, data: startedTest }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Stop A/B test
  const stopABTest = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const { data: stoppedTest, error } = await abTestUtils.stop(id)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to stop A/B test',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Update local state
      if (stoppedTest) {
        setABTests(prev => 
          prev.map(test => test.id === id ? stoppedTest : test)
        )
        toast({
          title: 'Success',
          description: 'A/B test stopped successfully'
        })
      }

      return { success: true, data: stoppedTest }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Delete A/B test
  const deleteABTest = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const { success, error } = await abTestUtils.delete(id)

      if (!success || error) {
        setError(error?.message || 'Failed to delete A/B test')
        toast({
          title: 'Error',
          description: 'Failed to delete A/B test',
          variant: 'destructive'
        })
        return { success: false }
      }

      // Remove from local state
      setABTests(prev => prev.filter(test => test.id !== id))
      toast({
        title: 'Success',
        description: 'A/B test deleted successfully'
      })

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Pagination handlers
  const nextPage = useCallback(() => {
    const newOffset = pagination.offset + pagination.limit
    if (newOffset < pagination.total) {
      fetchABTests({ offset: newOffset })
    }
  }, [pagination, fetchABTests])

  const prevPage = useCallback(() => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit)
    fetchABTests({ offset: newOffset })
  }, [pagination, fetchABTests])

  const goToPage = useCallback((page: number) => {
    const newOffset = (page - 1) * pagination.limit
    fetchABTests({ offset: newOffset })
  }, [pagination.limit, fetchABTests])

  // Auto-fetch on mount
  useEffect(() => {
    if (organizationId) {
      fetchABTests()
    }
  }, []) // Only run on mount

  return {
    // Data
    abTests,
    loading,
    error,
    pagination,
    
    // Actions
    fetchABTests,
    createABTest,
    updateABTest,
    startABTest,
    stopABTest,
    deleteABTest,
    
    // Pagination
    nextPage,
    prevPage,
    goToPage,
    
    // Computed values
    hasNextPage: pagination.offset + pagination.limit < pagination.total,
    hasPrevPage: pagination.offset > 0,
    currentPage: Math.floor(pagination.offset / pagination.limit) + 1,
    totalPages: Math.ceil(pagination.total / pagination.limit)
  }
}

// ================================================
// SINGLE A/B TEST HOOK
// ================================================

export function useABTest(id: string | null) {
  const [abTest, setABTest] = useState<ABTest | null>(null)
  const [results, setResults] = useState<ABTestResults | null>(null)
  const [sessions, setSessions] = useState<ABTestSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch A/B test
  const fetchABTest = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await abTestUtils.get(id)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch A/B test',
          variant: 'destructive'
        })
        return
      }

      setABTest(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  // Fetch A/B test results
  const fetchResults = useCallback(async () => {
    if (!id) return

    try {
      const { data, error } = await abTestUtils.calculateResults(id)

      if (error) {
        console.warn('Failed to fetch A/B test results:', error.message)
        return
      }

      setResults(data)
    } catch (err) {
      console.warn('Failed to fetch A/B test results:', err)
    }
  }, [id])

  // Fetch A/B test sessions
  const fetchSessions = useCallback(async (options?: {
    variantId?: string
    converted?: boolean
    limit?: number
  }) => {
    if (!id) return

    try {
      const { data, error } = await abTestUtils.getSessions(id, options)

      if (error) {
        console.warn('Failed to fetch A/B test sessions:', error.message)
        return
      }

      setSessions(data || [])
    } catch (err) {
      console.warn('Failed to fetch A/B test sessions:', err)
    }
  }, [id])

  // Track session (assign variant)
  const trackSession = useCallback(async (sessionId: string, userId?: string) => {
    if (!id) return null

    try {
      const { data, error } = await abTestUtils.trackSession(id, sessionId, userId)

      if (error) {
        console.warn('Failed to track A/B test session:', error.message)
        return null
      }

      return data
    } catch (err) {
      console.warn('Failed to track A/B test session:', err)
      return null
    }
  }, [id])

  // Track conversion
  const trackConversion = useCallback(async (
    sessionId: string,
    conversionEvent?: string,
    conversionValue?: number
  ) => {
    if (!id) return

    try {
      const { success, error } = await abTestUtils.trackConversion(
        id, 
        sessionId, 
        conversionEvent, 
        conversionValue
      )

      if (!success || error) {
        console.warn('Failed to track A/B test conversion:', error?.message)
        return
      }

      // Refresh results after conversion
      fetchResults()
    } catch (err) {
      console.warn('Failed to track A/B test conversion:', err)
    }
  }, [id, fetchResults])

  // Auto-fetch on mount and id change
  useEffect(() => {
    if (id) {
      fetchABTest()
      fetchResults()
      fetchSessions()
    }
  }, [id]) // Only depend on id

  return {
    // Data
    abTest,
    results,
    sessions,
    loading,
    error,
    
    // Actions
    fetchABTest,
    fetchResults,
    fetchSessions,
    trackSession,
    trackConversion,
    
    // Helpers
    refetch: fetchABTest,
    refreshResults: fetchResults
  }
}

// ================================================
// A/B TEST PARTICIPANT HOOK (for public use)
// ================================================

export function useABTestParticipant(testId: string | null, sessionId: string) {
  const [variant, setVariant] = useState<{ variant_id: string; session: ABTestSession } | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasTrackedConversion, setHasTrackedConversion] = useState(false)

  // Join A/B test and get assigned variant
  const joinTest = useCallback(async (userId?: string) => {
    if (!testId || !sessionId) return

    setLoading(true)

    try {
      const { data, error } = await abTestUtils.trackSession(testId, sessionId, userId)

      if (error) {
        console.warn('Failed to join A/B test:', error.message)
        return
      }

      setVariant(data)
    } catch (err) {
      console.warn('Failed to join A/B test:', err)
    } finally {
      setLoading(false)
    }
  }, [testId, sessionId])

  // Track conversion for this participant
  const convert = useCallback(async (
    conversionEvent?: string,
    conversionValue?: number
  ) => {
    if (!testId || !sessionId || hasTrackedConversion) return

    try {
      const { success, error } = await abTestUtils.trackConversion(
        testId, 
        sessionId, 
        conversionEvent, 
        conversionValue
      )

      if (success && !error) {
        setHasTrackedConversion(true)
      }
    } catch (err) {
      console.warn('Failed to track conversion:', err)
    }
  }, [testId, sessionId, hasTrackedConversion])

  // Auto-join test on mount
  useEffect(() => {
    if (testId && sessionId) {
      joinTest()
    }
  }, [testId, sessionId]) // Only depend on testId and sessionId

  return {
    // Data
    variant,
    loading,
    hasTrackedConversion,
    
    // Actions
    joinTest,
    convert,
    
    // Computed values
    variantId: variant?.variant_id || null,
    isInTest: !!variant
  }
}

// ================================================
// A/B TEST ANALYTICS HOOK
// ================================================

export function useABTestAnalytics(organizationId: string) {
  const [analytics, setAnalytics] = useState<{
    total_tests: number
    running_tests: number
    completed_tests: number
    avg_improvement: number
    recent_tests: ABTest[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch A/B test analytics
  const fetchAnalytics = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      // Get all tests
      const { data: allTests } = await abTestUtils.list(organizationId, { limit: 1000 })
      
      if (!allTests) {
        setAnalytics({
          total_tests: 0,
          running_tests: 0,
          completed_tests: 0,
          avg_improvement: 0,
          recent_tests: []
        })
        return
      }

      const totalTests = allTests.length
      const runningTests = allTests.filter(test => test.status === 'running').length
      const completedTests = allTests.filter(test => test.status === 'completed').length
      
      // Calculate average improvement from completed tests with winners
      const testsWithWinners = allTests.filter(test => 
        test.status === 'completed' && test.results && (test.results as any).winner
      )
      
      const avgImprovement = testsWithWinners.length > 0
        ? testsWithWinners.reduce((sum, test) => {
            const results = test.results as any
            return sum + (results.winner?.improvement || 0)
          }, 0) / testsWithWinners.length
        : 0

      const recentTests = allTests
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

      setAnalytics({
        total_tests: totalTests,
        running_tests: runningTests,
        completed_tests: completedTests,
        avg_improvement: avgImprovement,
        recent_tests: recentTests
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  // Auto-fetch on mount
  useEffect(() => {
    if (organizationId) {
      fetchAnalytics()
    }
  }, [organizationId]) // Only depend on organizationId

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics
  }
}