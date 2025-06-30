// Landing Pages utilities for Marketing & Growth Module
// Following patterns from billing module utilities

import { supabase } from '@/lib/supabase'
import { 
  LandingPage, 
  LandingPageInsert, 
  LandingPageUpdate,
  LandingPageConfig,
  SEOConfig,
  CreateLandingPageRequest,
  UpdateLandingPageRequest,
  PublishLandingPageRequest
} from '@/types/marketing'
import { 
  createLandingPageSchema,
  updateLandingPageSchema,
  publishLandingPageSchema 
} from '@/schemas/marketing'
import { createError, handleSupabaseError } from '@/lib/utils'

// ================================================
// LANDING PAGE MANAGEMENT
// ================================================

/**
 * Create a new landing page
 */
export const createLandingPage = async (
  data: CreateLandingPageRequest
): Promise<{ data: LandingPage | null; error: Error | null }> => {
  try {
    // Validate input data
    const validation = createLandingPageSchema.safeParse(data)
    if (!validation.success) {
      return { 
        data: null, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Check if slug is already taken
    const { data: existingPage } = await supabase
      .from('landing_pages')
      .select('id')
      .eq('slug', data.slug)
      .single()

    if (existingPage) {
      return { 
        data: null, 
        error: createError('Slug already exists', { slug: 'This slug is already taken' }) 
      }
    }

    // Generate SEO metadata if not provided
    const seoMeta: SEOConfig = {
      title: data.seo_meta?.title || `${data.title} | ${data.organization_id}`,
      description: data.seo_meta?.description || data.description,
      keywords: data.seo_meta?.keywords || [],
      og_title: data.seo_meta?.og_title || data.title,
      og_description: data.seo_meta?.og_description || data.description,
      og_type: 'website',
      twitter_card: 'summary_large_image',
      meta_robots: 'index,follow',
      ...data.seo_meta
    }

    // Create landing page
    const { data: landingPage, error } = await supabase
      .from('landing_pages')
      .insert({
        organization_id: data.organization_id,
        slug: data.slug,
        title: data.title,
        description: data.description,
        config: data.config,
        seo_meta: seoMeta,
        published: false,
        view_count: 0,
        conversion_count: 0
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: landingPage, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to create landing page', error) 
    }
  }
}

/**
 * Update a landing page
 */
export const updateLandingPage = async (
  id: string,
  data: UpdateLandingPageRequest
): Promise<{ data: LandingPage | null; error: Error | null }> => {
  try {
    // Validate input data
    const validation = updateLandingPageSchema.safeParse(data)
    if (!validation.success) {
      return { 
        data: null, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Update landing page
    const { data: landingPage, error } = await supabase
      .from('landing_pages')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: landingPage, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to update landing page', error) 
    }
  }
}

/**
 * Publish or unpublish a landing page
 */
export const publishLandingPage = async (
  id: string,
  data: PublishLandingPageRequest
): Promise<{ data: LandingPage | null; error: Error | null }> => {
  try {
    // Validate input data
    const validation = publishLandingPageSchema.safeParse(data)
    if (!validation.success) {
      return { 
        data: null, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    const updateData: any = {
      published: data.published,
      updated_at: new Date().toISOString()
    }

    if (data.published && data.published_at) {
      updateData.published_at = data.published_at
    } else if (data.published) {
      updateData.published_at = new Date().toISOString()
    } else {
      updateData.published_at = null
    }

    // Update landing page
    const { data: landingPage, error } = await supabase
      .from('landing_pages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: landingPage, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to publish landing page', error) 
    }
  }
}

/**
 * Delete a landing page
 */
export const deleteLandingPage = async (
  id: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('landing_pages')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to delete landing page', error) 
    }
  }
}

/**
 * Get landing page by ID
 */
export const getLandingPage = async (
  id: string
): Promise<{ data: LandingPage | null; error: Error | null }> => {
  try {
    const { data: landingPage, error } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: landingPage, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get landing page', error) 
    }
  }
}

/**
 * Get landing page by slug
 */
export const getLandingPageBySlug = async (
  slug: string
): Promise<{ data: LandingPage | null; error: Error | null }> => {
  try {
    const { data: landingPage, error } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: landingPage, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get landing page', error) 
    }
  }
}

/**
 * List landing pages for an organization
 */
export const listLandingPages = async (
  organizationId: string,
  options: {
    published?: boolean
    limit?: number
    offset?: number
    search?: string
  } = {}
): Promise<{ 
  data: LandingPage[] | null; 
  count: number | null;
  error: Error | null 
}> => {
  try {
    let query = supabase
      .from('landing_pages')
      .select('*, count', { count: 'exact' })
      .eq('organization_id', organizationId)

    // Apply filters
    if (options.published !== undefined) {
      query = query.eq('published', options.published)
    }

    if (options.search) {
      query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`)
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

    const { data: landingPages, error, count } = await query

    if (error) {
      return { data: null, count: null, error: handleSupabaseError(error) }
    }

    return { data: landingPages, count, error: null }
  } catch (error) {
    return { 
      data: null, 
      count: null,
      error: createError('Failed to list landing pages', error) 
    }
  }
}

// ================================================
// ANALYTICS & TRACKING
// ================================================

/**
 * Track page view for a landing page
 */
export const trackPageView = async (
  landingPageId: string,
  sessionId?: string,
  userId?: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Increment view count
    const { error: updateError } = await supabase
      .from('landing_pages')
      .update({
        view_count: supabase.sql`view_count + 1`
      })
      .eq('id', landingPageId)

    if (updateError) {
      return { success: false, error: handleSupabaseError(updateError) }
    }

    // Track growth metric
    const { error: metricError } = await supabase
      .from('growth_metrics')
      .insert({
        organization_id: (await getLandingPage(landingPageId)).data?.organization_id,
        metric_type: 'page_view',
        metric_value: 1,
        dimensions: {
          landing_page_id: landingPageId,
          session_id: sessionId,
          user_id: userId
        }
      })

    if (metricError) {
      console.warn('Failed to track growth metric:', metricError)
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to track page view', error) 
    }
  }
}

/**
 * Track conversion for a landing page
 */
export const trackConversion = async (
  landingPageId: string,
  conversionType: string = 'signup',
  conversionValue?: number,
  sessionId?: string,
  userId?: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Increment conversion count
    const { error: updateError } = await supabase
      .from('landing_pages')
      .update({
        conversion_count: supabase.sql`conversion_count + 1`
      })
      .eq('id', landingPageId)

    if (updateError) {
      return { success: false, error: handleSupabaseError(updateError) }
    }

    // Track growth metric
    const { error: metricError } = await supabase
      .from('growth_metrics')
      .insert({
        organization_id: (await getLandingPage(landingPageId)).data?.organization_id,
        metric_type: 'conversion',
        metric_value: conversionValue || 1,
        dimensions: {
          landing_page_id: landingPageId,
          conversion_type: conversionType,
          session_id: sessionId,
          user_id: userId
        }
      })

    if (metricError) {
      console.warn('Failed to track growth metric:', metricError)
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to track conversion', error) 
    }
  }
}

/**
 * Get landing page analytics
 */
export const getLandingPageAnalytics = async (
  landingPageId: string,
  period: 'day' | 'week' | 'month' = 'month'
): Promise<{ 
  data: {
    views: number
    conversions: number
    conversion_rate: number
    trends: {
      views_change: number
      conversions_change: number
    }
  } | null; 
  error: Error | null 
}> => {
  try {
    // Get current period metrics
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1)
        break
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1)
        break
    }

    const { data: currentMetrics, error: currentError } = await supabase
      .from('growth_metrics')
      .select('metric_type, metric_value')
      .eq('dimensions->landing_page_id', landingPageId)
      .gte('date_recorded', startDate.toISOString().split('T')[0])
      .lte('date_recorded', endDate.toISOString().split('T')[0])

    if (currentError) {
      return { data: null, error: handleSupabaseError(currentError) }
    }

    // Calculate current metrics
    const views = currentMetrics
      ?.filter(m => m.metric_type === 'page_view')
      .reduce((sum, m) => sum + m.metric_value, 0) || 0
    
    const conversions = currentMetrics
      ?.filter(m => m.metric_type === 'conversion')
      .reduce((sum, m) => sum + m.metric_value, 0) || 0

    const conversion_rate = views > 0 ? (conversions / views) * 100 : 0

    // Get previous period for trends
    const prevEndDate = new Date(startDate)
    const prevStartDate = new Date(startDate)
    
    switch (period) {
      case 'day':
        prevStartDate.setDate(prevStartDate.getDate() - 1)
        break
      case 'week':
        prevStartDate.setDate(prevStartDate.getDate() - 7)
        break
      case 'month':
        prevStartDate.setMonth(prevStartDate.getMonth() - 1)
        break
    }

    const { data: prevMetrics } = await supabase
      .from('growth_metrics')
      .select('metric_type, metric_value')
      .eq('dimensions->landing_page_id', landingPageId)
      .gte('date_recorded', prevStartDate.toISOString().split('T')[0])
      .lt('date_recorded', prevEndDate.toISOString().split('T')[0])

    const prevViews = prevMetrics
      ?.filter(m => m.metric_type === 'page_view')
      .reduce((sum, m) => sum + m.metric_value, 0) || 0
    
    const prevConversions = prevMetrics
      ?.filter(m => m.metric_type === 'conversion')
      .reduce((sum, m) => sum + m.metric_value, 0) || 0

    // Calculate trends
    const views_change = prevViews > 0 ? ((views - prevViews) / prevViews) * 100 : 0
    const conversions_change = prevConversions > 0 ? ((conversions - prevConversions) / prevConversions) * 100 : 0

    return {
      data: {
        views,
        conversions,
        conversion_rate,
        trends: {
          views_change,
          conversions_change
        }
      },
      error: null
    }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get landing page analytics', error) 
    }
  }
}

// ================================================
// TEMPLATE HELPERS
// ================================================

/**
 * Generate landing page from template
 */
export const createFromTemplate = async (
  organizationId: string,
  templateName: string,
  customData: {
    slug: string
    title: string
    description?: string
  }
): Promise<{ data: LandingPage | null; error: Error | null }> => {
  try {
    // Define built-in templates
    const templates: Record<string, LandingPageConfig> = {
      'saas-homepage': {
        hero: {
          headline: 'The Ultimate SaaS Solution for Modern Teams',
          subheadline: 'Boost your team productivity with our comprehensive SaaS platform. Get started in minutes, scale to millions.',
          cta_text: 'Start Free Trial'
        },
        features: [
          {
            title: 'Real-time Collaboration',
            description: 'Work together seamlessly across teams and time zones'
          },
          {
            title: 'Advanced Analytics',
            description: 'Get insights that drive better business decisions'
          },
          {
            title: 'Enterprise Security',
            description: 'Bank-level security with SOC2 compliance'
          }
        ],
        pricing: {
          plans: [
            {
              name: 'Starter',
              price: 29,
              features: ['5 Users', '10 Projects', 'Basic Support']
            },
            {
              name: 'Pro',
              price: 99,
              features: ['25 Users', 'Unlimited Projects', 'Priority Support'],
              highlighted: true
            },
            {
              name: 'Enterprise',
              price: 299,
              features: ['Unlimited Users', 'Advanced Features', 'Dedicated Support']
            }
          ]
        }
      },
      'lead-magnet': {
        hero: {
          headline: 'Get Your Free Guide',
          subheadline: 'Download our comprehensive guide and learn the strategies used by successful companies.',
          cta_text: 'Download Free Guide'
        },
        form_fields: ['email', 'name', 'company'],
        benefits: [
          '50+ proven strategies',
          'Real case studies',
          'Ready-to-use templates',
          'Bonus resources included'
        ]
      }
    }

    const templateConfig = templates[templateName]
    if (!templateConfig) {
      return { 
        data: null, 
        error: createError('Template not found', { template: 'Invalid template name' }) 
      }
    }

    // Create landing page from template
    return await createLandingPage({
      organization_id: organizationId,
      slug: customData.slug,
      title: customData.title,
      description: customData.description,
      config: templateConfig
    })
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to create from template', error) 
    }
  }
}

/**
 * Duplicate a landing page
 */
export const duplicateLandingPage = async (
  id: string,
  newSlug: string,
  newTitle?: string
): Promise<{ data: LandingPage | null; error: Error | null }> => {
  try {
    // Get original landing page
    const { data: originalPage, error: getError } = await getLandingPage(id)
    if (getError || !originalPage) {
      return { data: null, error: getError || createError('Landing page not found') }
    }

    // Create duplicate
    return await createLandingPage({
      organization_id: originalPage.organization_id,
      slug: newSlug,
      title: newTitle || `${originalPage.title} (Copy)`,
      description: originalPage.description,
      config: originalPage.config as LandingPageConfig,
      seo_meta: originalPage.seo_meta as SEOConfig
    })
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to duplicate landing page', error) 
    }
  }
}

// Export all utilities
export const landingPageUtils = {
  create: createLandingPage,
  update: updateLandingPage,
  publish: publishLandingPage,
  delete: deleteLandingPage,
  get: getLandingPage,
  getBySlug: getLandingPageBySlug,
  list: listLandingPages,
  trackPageView,
  trackConversion,
  getAnalytics: getLandingPageAnalytics,
  createFromTemplate,
  duplicate: duplicateLandingPage
}