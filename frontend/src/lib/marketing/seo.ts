// SEO utilities for Marketing & Growth Module
// Following patterns from billing module utilities

import { supabase } from '@/lib/supabase'
import { 
  SEOMetadata, 
  SEOMetadataInsert, 
  SEOMetadataUpdate,
  UpdateSEOMetadataRequest,
  SEOConfig,
  PageType
} from '@/types/marketing'
import { 
  updateSEOMetadataSchema 
} from '@/schemas/marketing'
import { createError, handleSupabaseError } from '@/lib/utils'

// ================================================
// SEO METADATA MANAGEMENT
// ================================================

/**
 * Update or create SEO metadata for a page
 */
export const updateSEOMetadata = async (
  data: UpdateSEOMetadataRequest
): Promise<{ data: SEOMetadata | null; error: Error | null }> => {
  try {
    // Validate input data
    const validation = updateSEOMetadataSchema.safeParse(data)
    if (!validation.success) {
      return { 
        data: null, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Check if SEO metadata already exists
    const { data: existingMeta } = await supabase
      .from('seo_metadata')
      .select('id')
      .eq('organization_id', data.organization_id)
      .eq('page_type', data.page_type)
      .eq('page_id', data.page_id)
      .single()

    const seoData = {
      organization_id: data.organization_id,
      page_type: data.page_type,
      page_id: data.page_id,
      title: data.title,
      description: data.description,
      keywords: data.keywords || [],
      canonical_url: data.canonical_url,
      og_title: data.og_title || data.title,
      og_description: data.og_description || data.description,
      og_image: data.og_image,
      og_type: 'website',
      twitter_card: 'summary_large_image',
      twitter_title: data.twitter_title || data.title,
      twitter_description: data.twitter_description || data.description,
      twitter_image: data.twitter_image || data.og_image,
      structured_data: data.structured_data || {},
      meta_robots: 'index,follow',
      updated_at: new Date().toISOString()
    }

    let seoMetadata
    let error

    if (existingMeta) {
      // Update existing metadata
      ({ data: seoMetadata, error } = await supabase
        .from('seo_metadata')
        .update(seoData)
        .eq('id', existingMeta.id)
        .select()
        .single())
    } else {
      // Create new metadata
      ({ data: seoMetadata, error } = await supabase
        .from('seo_metadata')
        .insert(seoData)
        .select()
        .single())
    }

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: seoMetadata, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to update SEO metadata', error) 
    }
  }
}

/**
 * Get SEO metadata for a page
 */
export const getSEOMetadata = async (
  organizationId: string,
  pageType: PageType,
  pageId: string
): Promise<{ data: SEOMetadata | null; error: Error | null }> => {
  try {
    const { data: seoMetadata, error } = await supabase
      .from('seo_metadata')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('page_type', pageType)
      .eq('page_id', pageId)
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: seoMetadata, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get SEO metadata', error) 
    }
  }
}

/**
 * List all SEO metadata for an organization
 */
export const listSEOMetadata = async (
  organizationId: string,
  options: {
    pageType?: PageType
    limit?: number
    offset?: number
  } = {}
): Promise<{ 
  data: SEOMetadata[] | null; 
  count: number | null;
  error: Error | null 
}> => {
  try {
    let query = supabase
      .from('seo_metadata')
      .select('*, count', { count: 'exact' })
      .eq('organization_id', organizationId)

    // Apply filters
    if (options.pageType) {
      query = query.eq('page_type', options.pageType)
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit)
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    // Order by creation date
    query = query.order('created_at', { ascending: false })

    const { data: seoMetadata, error, count } = await query

    if (error) {
      return { data: null, count: null, error: handleSupabaseError(error) }
    }

    return { data: seoMetadata, count, error: null }
  } catch (error) {
    return { 
      data: null, 
      count: null,
      error: createError('Failed to list SEO metadata', error) 
    }
  }
}

/**
 * Delete SEO metadata
 */
export const deleteSEOMetadata = async (
  id: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('seo_metadata')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to delete SEO metadata', error) 
    }
  }
}

// ================================================
// SEO ANALYSIS & OPTIMIZATION
// ================================================

/**
 * Analyze SEO health of content
 */
export const analyzeSEOHealth = (
  title?: string,
  description?: string,
  content?: string,
  keywords?: string[]
): {
  score: number
  issues: string[]
  recommendations: string[]
} => {
  const issues: string[] = []
  const recommendations: string[] = []
  let score = 100

  // Title analysis
  if (!title) {
    issues.push('Missing title tag')
    score -= 20
  } else {
    if (title.length < 30) {
      issues.push('Title too short (under 30 characters)')
      recommendations.push('Expand title to 30-60 characters for better SEO')
      score -= 10
    } else if (title.length > 60) {
      issues.push('Title too long (over 60 characters)')
      recommendations.push('Shorten title to under 60 characters to prevent truncation')
      score -= 10
    }
  }

  // Description analysis
  if (!description) {
    issues.push('Missing meta description')
    score -= 15
  } else {
    if (description.length < 120) {
      issues.push('Meta description too short (under 120 characters)')
      recommendations.push('Expand description to 120-160 characters')
      score -= 10
    } else if (description.length > 160) {
      issues.push('Meta description too long (over 160 characters)')
      recommendations.push('Shorten description to under 160 characters')
      score -= 10
    }
  }

  // Keywords analysis
  if (!keywords || keywords.length === 0) {
    issues.push('No keywords specified')
    recommendations.push('Add relevant keywords for better targeting')
    score -= 10
  } else if (keywords.length > 10) {
    issues.push('Too many keywords (keyword stuffing)')
    recommendations.push('Focus on 3-5 primary keywords')
    score -= 15
  }

  // Content analysis
  if (content) {
    const wordCount = content.split(/\s+/).length
    if (wordCount < 300) {
      issues.push('Content too short (under 300 words)')
      recommendations.push('Add more valuable content (aim for 300+ words)')
      score -= 10
    }

    // Check keyword density if keywords provided
    if (keywords && keywords.length > 0) {
      const contentLower = content.toLowerCase()
      keywords.forEach(keyword => {
        const keywordCount = (contentLower.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length
        const density = (keywordCount / wordCount) * 100
        
        if (density > 3) {
          issues.push(`Keyword "${keyword}" density too high (${density.toFixed(1)}%)`)
          recommendations.push(`Reduce usage of "${keyword}" to maintain natural flow`)
          score -= 5
        } else if (density === 0) {
          issues.push(`Keyword "${keyword}" not found in content`)
          recommendations.push(`Include "${keyword}" naturally in your content`)
          score -= 5
        }
      })
    }
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score)

  return {
    score,
    issues,
    recommendations
  }
}

/**
 * Generate structured data for different page types
 */
export const generateStructuredData = (
  pageType: PageType,
  data: {
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
  }
): Record<string, any> => {
  const baseData = {
    '@context': 'https://schema.org',
    name: data.title,
    description: data.description,
    url: data.url,
    image: data.imageUrl
  }

  switch (pageType) {
    case 'landing_page':
      return {
        ...baseData,
        '@type': 'WebPage',
        publisher: {
          '@type': 'Organization',
          name: data.organizationName
        }
      }

    case 'blog_post':
      return {
        ...baseData,
        '@type': 'Article',
        headline: data.title,
        datePublished: data.datePublished,
        dateModified: data.dateModified || data.datePublished,
        author: {
          '@type': 'Person',
          name: data.author || data.organizationName
        },
        publisher: {
          '@type': 'Organization',
          name: data.organizationName
        }
      }

    case 'product':
      return {
        ...baseData,
        '@type': 'Product',
        offers: {
          '@type': 'Offer',
          price: data.price,
          priceCurrency: data.currency || 'USD',
          availability: `https://schema.org/${data.availability || 'InStock'}`
        },
        brand: {
          '@type': 'Brand',
          name: data.organizationName
        }
      }

    case 'pricing':
      return {
        ...baseData,
        '@type': 'Service',
        provider: {
          '@type': 'Organization',
          name: data.organizationName
        },
        offers: {
          '@type': 'Offer',
          price: data.price,
          priceCurrency: data.currency || 'USD'
        }
      }

    case 'about':
      return {
        ...baseData,
        '@type': 'AboutPage',
        mainEntity: {
          '@type': 'Organization',
          name: data.organizationName,
          description: data.description
        }
      }

    case 'contact':
      return {
        ...baseData,
        '@type': 'ContactPage',
        mainEntity: {
          '@type': 'Organization',
          name: data.organizationName
        }
      }

    default:
      return baseData
  }
}

/**
 * Generate sitemap entries for organization
 */
export const generateSitemapEntries = async (
  organizationId: string,
  baseUrl: string
): Promise<{ 
  data: Array<{
    url: string
    lastmod: string
    changefreq: string
    priority: string
  }> | null; 
  error: Error | null 
}> => {
  try {
    const entries: Array<{
      url: string
      lastmod: string
      changefreq: string
      priority: string
    }> = []

    // Get published landing pages
    const { data: landingPages } = await supabase
      .from('landing_pages')
      .select('slug, updated_at, published_at')
      .eq('organization_id', organizationId)
      .eq('published', true)

    landingPages?.forEach(page => {
      entries.push({
        url: `${baseUrl}/${page.slug}`,
        lastmod: page.updated_at || page.published_at,
        changefreq: 'weekly',
        priority: '0.8'
      })
    })

    // Get SEO metadata for other pages
    const { data: seoPages } = await supabase
      .from('seo_metadata')
      .select('page_type, page_id, updated_at')
      .eq('organization_id', organizationId)

    seoPages?.forEach(page => {
      let url = baseUrl
      let priority = '0.5'
      let changefreq = 'monthly'

      switch (page.page_type) {
        case 'pricing':
          url = `${baseUrl}/pricing`
          priority = '0.9'
          changefreq = 'weekly'
          break
        case 'about':
          url = `${baseUrl}/about`
          priority = '0.6'
          break
        case 'contact':
          url = `${baseUrl}/contact`
          priority = '0.6'
          break
        case 'blog_post':
          url = `${baseUrl}/blog/${page.page_id}`
          priority = '0.7'
          changefreq = 'monthly'
          break
        default:
          url = `${baseUrl}/${page.page_id}`
      }

      entries.push({
        url,
        lastmod: page.updated_at,
        changefreq,
        priority
      })
    })

    // Sort by priority
    entries.sort((a, b) => parseFloat(b.priority) - parseFloat(a.priority))

    return { data: entries, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to generate sitemap entries', error) 
    }
  }
}

/**
 * Generate robots.txt content
 */
export const generateRobotsTxt = (
  baseUrl: string,
  disallowPaths: string[] = []
): string => {
  const defaultDisallows = [
    '/api/',
    '/admin/',
    '/dashboard/',
    '/_next/',
    '/auth/'
  ]

  const allDisallows = [...defaultDisallows, ...disallowPaths]

  let robotsTxt = 'User-agent: *\n'
  
  allDisallows.forEach(path => {
    robotsTxt += `Disallow: ${path}\n`
  })

  robotsTxt += '\n'
  robotsTxt += `Sitemap: ${baseUrl}/sitemap.xml\n`

  return robotsTxt
}

/**
 * Check SEO metadata completeness
 */
export const checkSEOCompleteness = async (
  organizationId: string
): Promise<{ 
  data: {
    total_pages: number
    pages_with_seo: number
    completion_rate: number
    missing_seo: Array<{
      page_type: string
      page_id: string
      missing_fields: string[]
    }>
  } | null; 
  error: Error | null 
}> => {
  try {
    // Get all landing pages
    const { data: landingPages } = await supabase
      .from('landing_pages')
      .select('id, slug, seo_meta')
      .eq('organization_id', organizationId)
      .eq('published', true)

    // Get SEO metadata
    const { data: seoMetadata } = await supabase
      .from('seo_metadata')
      .select('*')
      .eq('organization_id', organizationId)

    const totalPages = landingPages?.length || 0
    let pagesWithSEO = 0
    const missingSEO: Array<{
      page_type: string
      page_id: string
      missing_fields: string[]
    }> = []

    // Check landing pages
    landingPages?.forEach(page => {
      const seoMeta = page.seo_meta as SEOConfig
      const missingFields: string[] = []

      if (!seoMeta?.title) missingFields.push('title')
      if (!seoMeta?.description) missingFields.push('description')
      if (!seoMeta?.keywords || seoMeta.keywords.length === 0) missingFields.push('keywords')
      if (!seoMeta?.og_image) missingFields.push('og_image')

      if (missingFields.length === 0) {
        pagesWithSEO++
      } else {
        missingSEO.push({
          page_type: 'landing_page',
          page_id: page.slug,
          missing_fields: missingFields
        })
      }
    })

    const completionRate = totalPages > 0 ? (pagesWithSEO / totalPages) * 100 : 0

    return {
      data: {
        total_pages: totalPages,
        pages_with_seo: pagesWithSEO,
        completion_rate: completionRate,
        missing_seo: missingSEO
      },
      error: null
    }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to check SEO completeness', error) 
    }
  }
}

// ================================================
// BULK OPERATIONS
// ================================================

/**
 * Bulk update SEO metadata
 */
export const bulkUpdateSEO = async (
  updates: Array<{
    organizationId: string
    pageType: PageType
    pageId: string
    seoData: Partial<SEOConfig>
  }>
): Promise<{ 
  data: { updated: number; failed: number; errors: string[] } | null; 
  error: Error | null 
}> => {
  try {
    const results = {
      updated: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const update of updates) {
      try {
        const { error } = await updateSEOMetadata({
          organization_id: update.organizationId,
          page_type: update.pageType,
          page_id: update.pageId,
          ...update.seoData
        })

        if (error) {
          results.failed++
          results.errors.push(`${update.pageType}/${update.pageId}: ${error.message}`)
        } else {
          results.updated++
        }
      } catch (error) {
        results.failed++
        results.errors.push(`${update.pageType}/${update.pageId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return { data: results, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to bulk update SEO', error) 
    }
  }
}

// Export all utilities
export const seoUtils = {
  update: updateSEOMetadata,
  get: getSEOMetadata,
  list: listSEOMetadata,
  delete: deleteSEOMetadata,
  analyze: analyzeSEOHealth,
  generateStructuredData,
  generateSitemapEntries,
  generateRobotsTxt,
  checkCompleteness: checkSEOCompleteness,
  bulkUpdate: bulkUpdateSEO
}