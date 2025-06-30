// SEO React Hook for Marketing & Growth Module
// Following patterns from billing module hooks

import { useState, useEffect, useCallback } from 'react'
import { 
  SEOMetadata, 
  UpdateSEOMetadataRequest,
  SEOConfig,
  PageType
} from '@/types/marketing'
import { seoUtils } from '@/lib/marketing/seo'
import { useToast } from '@/hooks/ui/use-toast'

// ================================================
// SEO METADATA MANAGEMENT HOOK
// ================================================

export function useSEOMetadata(organizationId: string) {
  const [seoMetadata, setSeoMetadata] = useState<SEOMetadata[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completeness, setCompleteness] = useState<{
    total_pages: number
    pages_with_seo: number
    completion_rate: number
    missing_seo: Array<{
      page_type: string
      page_id: string
      missing_fields: string[]
    }>
  } | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0
  })
  const { toast } = useToast()

  // Fetch SEO metadata
  const fetchSEOMetadata = useCallback(async (options?: {
    pageType?: PageType
    limit?: number
    offset?: number
  }) => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      const { data, count, error } = await seoUtils.list(organizationId, {
        pageType: options?.pageType,
        limit: options?.limit || pagination.limit,
        offset: options?.offset || pagination.offset
      })

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch SEO metadata',
          variant: 'destructive'
        })
        return
      }

      setSeoMetadata(data || [])
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

  // Update SEO metadata
  const updateSEOMetadata = useCallback(async (data: UpdateSEOMetadataRequest) => {
    setLoading(true)
    setError(null)

    try {
      const { data: updatedMetadata, error } = await seoUtils.update(data)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to update SEO metadata',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Update local state
      if (updatedMetadata) {
        setSeoMetadata(prev => {
          const existing = prev.find(meta => 
            meta.page_type === data.page_type && 
            meta.page_id === data.page_id &&
            meta.organization_id === data.organization_id
          )
          
          if (existing) {
            return prev.map(meta => 
              meta.id === existing.id ? updatedMetadata : meta
            )
          } else {
            return [updatedMetadata, ...prev]
          }
        })

        toast({
          title: 'Success',
          description: 'SEO metadata updated successfully'
        })
      }

      return { success: true, data: updatedMetadata }
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

  // Delete SEO metadata
  const deleteSEOMetadata = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const { success, error } = await seoUtils.delete(id)

      if (!success || error) {
        setError(error?.message || 'Failed to delete SEO metadata')
        toast({
          title: 'Error',
          description: 'Failed to delete SEO metadata',
          variant: 'destructive'
        })
        return { success: false }
      }

      // Remove from local state
      setSeoMetadata(prev => prev.filter(meta => meta.id !== id))
      toast({
        title: 'Success',
        description: 'SEO metadata deleted successfully'
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

  // Check SEO completeness
  const checkCompleteness = useCallback(async () => {
    if (!organizationId) return

    try {
      const { data, error } = await seoUtils.checkCompleteness(organizationId)

      if (error) {
        console.warn('Failed to check SEO completeness:', error.message)
        return
      }

      setCompleteness(data)
    } catch (err) {
      console.warn('Failed to check SEO completeness:', err)
    }
  }, [organizationId])

  // Bulk update SEO metadata
  const bulkUpdateSEO = useCallback(async (
    updates: Array<{
      pageType: PageType
      pageId: string
      seoData: Partial<SEOConfig>
    }>
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await seoUtils.bulkUpdate(
        updates.map(update => ({
          organizationId,
          pageType: update.pageType,
          pageId: update.pageId,
          seoData: update.seoData
        }))
      )

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to bulk update SEO metadata',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Refresh the list
      fetchSEOMetadata()

      toast({
        title: 'Success',
        description: `Updated ${data?.updated || 0} items. ${data?.failed || 0} failed.`
      })

      return { success: true, data }
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
  }, [organizationId, fetchSEOMetadata, toast])

  // Pagination handlers
  const nextPage = useCallback(() => {
    const newOffset = pagination.offset + pagination.limit
    if (newOffset < pagination.total) {
      fetchSEOMetadata({ offset: newOffset })
    }
  }, [pagination, fetchSEOMetadata])

  const prevPage = useCallback(() => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit)
    fetchSEOMetadata({ offset: newOffset })
  }, [pagination, fetchSEOMetadata])

  // Auto-fetch on mount
  useEffect(() => {
    if (organizationId) {
      fetchSEOMetadata()
      checkCompleteness()
    }
  }, []) // Only run on mount

  return {
    // Data
    seoMetadata,
    loading,
    error,
    completeness,
    pagination,
    
    // Actions
    fetchSEOMetadata,
    updateSEOMetadata,
    deleteSEOMetadata,
    checkCompleteness,
    bulkUpdateSEO,
    
    // Pagination
    nextPage,
    prevPage,
    
    // Computed values
    hasNextPage: pagination.offset + pagination.limit < pagination.total,
    hasPrevPage: pagination.offset > 0,
    currentPage: Math.floor(pagination.offset / pagination.limit) + 1,
    totalPages: Math.ceil(pagination.total / pagination.limit)
  }
}

// ================================================
// SINGLE PAGE SEO HOOK
// ================================================

export function usePageSEO(
  organizationId: string,
  pageType: PageType,
  pageId: string
) {
  const [seoMetadata, setSeoMetadata] = useState<SEOMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<{
    score: number
    issues: string[]
    recommendations: string[]
  } | null>(null)
  const { toast } = useToast()

  // Fetch SEO metadata for specific page
  const fetchPageSEO = useCallback(async () => {
    if (!organizationId || !pageType || !pageId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await seoUtils.get(organizationId, pageType, pageId)

      if (error && !error.message.includes('not found')) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch SEO metadata',
          variant: 'destructive'
        })
        return
      }

      setSeoMetadata(data)
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
  }, [organizationId, pageType, pageId, toast])

  // Update SEO metadata for this page
  const updatePageSEO = useCallback(async (seoData: Partial<SEOConfig>) => {
    if (!organizationId || !pageType || !pageId) return { success: false, data: null }

    setLoading(true)
    setError(null)

    try {
      const { data: updatedMetadata, error } = await seoUtils.update({
        organization_id: organizationId,
        page_type: pageType,
        page_id: pageId,
        ...seoData
      })

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to update SEO metadata',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      setSeoMetadata(updatedMetadata)
      toast({
        title: 'Success',
        description: 'SEO metadata updated successfully'
      })

      return { success: true, data: updatedMetadata }
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
  }, [organizationId, pageType, pageId, toast])

  // Analyze SEO health
  const analyzeContent = useCallback((
    title?: string,
    description?: string,
    content?: string,
    keywords?: string[]
  ) => {
    const result = seoUtils.analyze(title, description, content, keywords)
    setAnalysis(result)
    return result
  }, [])

  // Generate structured data
  const generateStructuredData = useCallback((data: {
    title: string
    description?: string
    url?: string
    imageUrl?: string
    organizationName?: string
    datePublished?: string
    dateModified?: string
    author?: string
    price?: number
    currency?: string
    availability?: string
  }) => {
    return seoUtils.generateStructuredData(pageType, data)
  }, [pageType])

  // Auto-fetch on mount and params change
  useEffect(() => {
    if (organizationId && pageType && pageId) {
      fetchPageSEO()
    }
  }, [organizationId, pageType, pageId]) // Depend on all params

  return {
    // Data
    seoMetadata,
    loading,
    error,
    analysis,
    
    // Actions
    fetchPageSEO,
    updatePageSEO,
    analyzeContent,
    generateStructuredData,
    
    // Helpers
    refetch: fetchPageSEO,
    hasMetadata: !!seoMetadata
  }
}

// ================================================
// SEO TOOLS HOOK
// ================================================

export function useSEOTools(organizationId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sitemapEntries, setSitemapEntries] = useState<Array<{
    url: string
    lastmod: string
    changefreq: string
    priority: string
  }> | null>(null)
  const { toast } = useToast()

  // Generate sitemap entries
  const generateSitemap = useCallback(async (baseUrl: string) => {
    if (!organizationId) return { success: false, data: null }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await seoUtils.generateSitemapEntries(organizationId, baseUrl)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to generate sitemap',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      setSitemapEntries(data)
      return { success: true, data }
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

  // Generate robots.txt
  const generateRobotsTxt = useCallback((
    baseUrl: string,
    disallowPaths: string[] = []
  ) => {
    return seoUtils.generateRobotsTxt(baseUrl, disallowPaths)
  }, [])

  // Download sitemap XML
  const downloadSitemap = useCallback((baseUrl: string) => {
    if (!sitemapEntries) return

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map(entry => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`

    const blob = new Blob([xmlContent], { type: 'application/xml' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sitemap.xml'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast({
      title: 'Success',
      description: 'Sitemap downloaded successfully'
    })
  }, [sitemapEntries, toast])

  // Download robots.txt
  const downloadRobotsTxt = useCallback((
    baseUrl: string,
    disallowPaths: string[] = []
  ) => {
    const robotsContent = generateRobotsTxt(baseUrl, disallowPaths)
    
    const blob = new Blob([robotsContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'robots.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast({
      title: 'Success',
      description: 'Robots.txt downloaded successfully'
    })
  }, [generateRobotsTxt, toast])

  return {
    // Data
    loading,
    error,
    sitemapEntries,
    
    // Actions
    generateSitemap,
    generateRobotsTxt,
    downloadSitemap,
    downloadRobotsTxt
  }
}

// ================================================
// SEO ANALYTICS HOOK
// ================================================

export function useSEOAnalytics(organizationId: string) {
  const [analytics, setAnalytics] = useState<{
    total_pages: number
    pages_with_seo: number
    completion_rate: number
    avg_title_length: number
    avg_description_length: number
    pages_missing_titles: number
    pages_missing_descriptions: number
    pages_missing_keywords: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch SEO analytics
  const fetchAnalytics = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      // Get all SEO metadata
      const { data: allMetadata } = await seoUtils.list(organizationId, { limit: 1000 })
      
      if (!allMetadata) {
        setAnalytics({
          total_pages: 0,
          pages_with_seo: 0,
          completion_rate: 0,
          avg_title_length: 0,
          avg_description_length: 0,
          pages_missing_titles: 0,
          pages_missing_descriptions: 0,
          pages_missing_keywords: 0
        })
        return
      }

      const totalPages = allMetadata.length
      const pagesWithTitles = allMetadata.filter(meta => meta.title).length
      const pagesWithDescriptions = allMetadata.filter(meta => meta.description).length
      const pagesWithKeywords = allMetadata.filter(meta => meta.keywords && meta.keywords.length > 0).length

      const avgTitleLength = allMetadata
        .filter(meta => meta.title)
        .reduce((sum, meta) => sum + (meta.title?.length || 0), 0) / pagesWithTitles || 0

      const avgDescriptionLength = allMetadata
        .filter(meta => meta.description)
        .reduce((sum, meta) => sum + (meta.description?.length || 0), 0) / pagesWithDescriptions || 0

      const completionRate = totalPages > 0 
        ? ((pagesWithTitles + pagesWithDescriptions + pagesWithKeywords) / (totalPages * 3)) * 100 
        : 0

      setAnalytics({
        total_pages: totalPages,
        pages_with_seo: Math.min(pagesWithTitles, pagesWithDescriptions, pagesWithKeywords),
        completion_rate: completionRate,
        avg_title_length: avgTitleLength,
        avg_description_length: avgDescriptionLength,
        pages_missing_titles: totalPages - pagesWithTitles,
        pages_missing_descriptions: totalPages - pagesWithDescriptions,
        pages_missing_keywords: totalPages - pagesWithKeywords
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