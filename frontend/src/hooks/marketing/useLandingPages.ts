// Landing Pages React Hook for Marketing & Growth Module
// Following patterns from billing module hooks

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  LandingPage, 
  CreateLandingPageRequest, 
  UpdateLandingPageRequest,
  PublishLandingPageRequest 
} from '@/types/marketing'
import { landingPageUtils } from '@/lib/marketing/landing-pages'
import { useToast } from '@/hooks/ui/use-toast'

// ================================================
// LANDING PAGE MANAGEMENT HOOK
// ================================================

export function useLandingPages(organizationId: string) {
  const [landingPages, setLandingPages] = useState<LandingPage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0
  })
  const { toast } = useToast()

  // Fetch landing pages
  const fetchLandingPages = useCallback(async (options?: {
    published?: boolean
    search?: string
    limit?: number
    offset?: number
  }) => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      const { data, count, error } = await landingPageUtils.list(organizationId, {
        published: options?.published,
        search: options?.search,
        limit: options?.limit || pagination.limit,
        offset: options?.offset || pagination.offset
      })

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch landing pages',
          variant: 'destructive'
        })
        return
      }

      setLandingPages(data || [])
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

  // Create landing page
  const createLandingPage = useCallback(async (data: CreateLandingPageRequest) => {
    setLoading(true)
    setError(null)

    try {
      const { data: landingPage, error } = await landingPageUtils.create(data)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to create landing page',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Add to local state
      if (landingPage) {
        setLandingPages(prev => [landingPage, ...prev])
        toast({
          title: 'Success',
          description: 'Landing page created successfully'
        })
      }

      return { success: true, data: landingPage }
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

  // Update landing page
  const updateLandingPage = useCallback(async (
    id: string, 
    data: UpdateLandingPageRequest
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { data: updatedPage, error } = await landingPageUtils.update(id, data)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to update landing page',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Update local state
      if (updatedPage) {
        setLandingPages(prev => 
          prev.map(page => page.id === id ? updatedPage : page)
        )
        toast({
          title: 'Success',
          description: 'Landing page updated successfully'
        })
      }

      return { success: true, data: updatedPage }
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

  // Publish landing page
  const publishLandingPage = useCallback(async (
    id: string, 
    data: PublishLandingPageRequest
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { data: publishedPage, error } = await landingPageUtils.publish(id, data)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to publish landing page',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Update local state
      if (publishedPage) {
        setLandingPages(prev => 
          prev.map(page => page.id === id ? publishedPage : page)
        )
        toast({
          title: 'Success',
          description: data.published ? 'Landing page published successfully' : 'Landing page unpublished successfully'
        })
      }

      return { success: true, data: publishedPage }
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

  // Delete landing page
  const deleteLandingPage = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const { success, error } = await landingPageUtils.delete(id)

      if (!success || error) {
        setError(error?.message || 'Failed to delete landing page')
        toast({
          title: 'Error',
          description: 'Failed to delete landing page',
          variant: 'destructive'
        })
        return { success: false }
      }

      // Remove from local state
      setLandingPages(prev => prev.filter(page => page.id !== id))
      toast({
        title: 'Success',
        description: 'Landing page deleted successfully'
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

  // Duplicate landing page
  const duplicateLandingPage = useCallback(async (
    id: string, 
    newSlug: string, 
    newTitle?: string
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { data: duplicatedPage, error } = await landingPageUtils.duplicate(id, newSlug, newTitle)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to duplicate landing page',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Add to local state
      if (duplicatedPage) {
        setLandingPages(prev => [duplicatedPage, ...prev])
        toast({
          title: 'Success',
          description: 'Landing page duplicated successfully'
        })
      }

      return { success: true, data: duplicatedPage }
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

  // Create from template
  const createFromTemplate = useCallback(async (
    templateName: string,
    customData: {
      slug: string
      title: string
      description?: string
    }
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { data: landingPage, error } = await landingPageUtils.createFromTemplate(
        organizationId,
        templateName,
        customData
      )

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to create landing page from template',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Add to local state
      if (landingPage) {
        setLandingPages(prev => [landingPage, ...prev])
        toast({
          title: 'Success',
          description: 'Landing page created from template successfully'
        })
      }

      return { success: true, data: landingPage }
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
  }, [organizationId, toast])

  // Pagination handlers
  const nextPage = useCallback(() => {
    const newOffset = pagination.offset + pagination.limit
    if (newOffset < pagination.total) {
      fetchLandingPages({ offset: newOffset })
    }
  }, [pagination, fetchLandingPages])

  const prevPage = useCallback(() => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit)
    fetchLandingPages({ offset: newOffset })
  }, [pagination, fetchLandingPages])

  const goToPage = useCallback((page: number) => {
    const newOffset = (page - 1) * pagination.limit
    fetchLandingPages({ offset: newOffset })
  }, [pagination.limit, fetchLandingPages])

  // Auto-fetch on mount
  useEffect(() => {
    if (organizationId) {
      fetchLandingPages()
    }
  }, []) // Only run on mount, fetchLandingPages will handle dependency changes

  return {
    // Data
    landingPages,
    loading,
    error,
    pagination,
    
    // Actions
    fetchLandingPages,
    createLandingPage,
    updateLandingPage,
    publishLandingPage,
    deleteLandingPage,
    duplicateLandingPage,
    createFromTemplate,
    
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
// SINGLE LANDING PAGE HOOK
// ================================================

export function useLandingPage(id: string | null) {
  const [landingPage, setLandingPage] = useState<LandingPage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<{
    views: number
    conversions: number
    conversion_rate: number
    trends: {
      views_change: number
      conversions_change: number
    }
  } | null>(null)
  const { toast } = useToast()

  // Fetch landing page
  const fetchLandingPage = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await landingPageUtils.get(id)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch landing page',
          variant: 'destructive'
        })
        return
      }

      setLandingPage(data)
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

  // Fetch analytics
  const fetchAnalytics = useCallback(async (period: 'day' | 'week' | 'month' = 'month') => {
    if (!id) return

    try {
      const { data, error } = await landingPageUtils.getAnalytics(id, period)

      if (error) {
        console.warn('Failed to fetch analytics:', error.message)
        return
      }

      setAnalytics(data)
    } catch (err) {
      console.warn('Failed to fetch analytics:', err)
    }
  }, [id])

  // Track page view
  const trackView = useCallback(async (sessionId?: string, userId?: string) => {
    if (!id) return

    try {
      await landingPageUtils.trackPageView(id, sessionId, userId)
    } catch (err) {
      console.warn('Failed to track page view:', err)
    }
  }, [id])

  // Track conversion
  const trackConversion = useCallback(async (
    conversionType: string = 'signup',
    conversionValue?: number,
    sessionId?: string,
    userId?: string
  ) => {
    if (!id) return

    try {
      await landingPageUtils.trackConversion(id, conversionType, conversionValue, sessionId, userId)
      
      // Refresh analytics after conversion
      fetchAnalytics()
    } catch (err) {
      console.warn('Failed to track conversion:', err)
    }
  }, [id, fetchAnalytics])

  // Auto-fetch on mount and id change
  useEffect(() => {
    if (id) {
      fetchLandingPage()
      fetchAnalytics()
    }
  }, [id]) // Only depend on id

  return {
    // Data
    landingPage,
    loading,
    error,
    analytics,
    
    // Actions
    fetchLandingPage,
    fetchAnalytics,
    trackView,
    trackConversion,
    
    // Helpers
    refetch: fetchLandingPage
  }
}

// ================================================
// LANDING PAGE BY SLUG HOOK
// ================================================

export function useLandingPageBySlug(slug: string | null) {
  const [landingPage, setLandingPage] = useState<LandingPage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch landing page by slug
  const fetchLandingPage = useCallback(async () => {
    if (!slug) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await landingPageUtils.getBySlug(slug)

      if (error) {
        setError(error.message)
        return
      }

      setLandingPage(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [slug])

  // Auto-fetch on mount and slug change
  useEffect(() => {
    if (slug) {
      fetchLandingPage()
    }
  }, [slug]) // Only depend on slug

  return {
    landingPage,
    loading,
    error,
    refetch: fetchLandingPage
  }
}