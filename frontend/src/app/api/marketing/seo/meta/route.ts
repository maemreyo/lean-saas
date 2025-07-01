// CREATED: 2025-07-01 - SEO metadata management API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAuthClient } from '@/lib/auth/auth-utils'
import { seoUtils } from '@/lib/marketing/seo'
import { seoSchemas } from '@/shared/schemas/marketing'
import type { UpdateSEOMetadataRequest } from '@/shared/types/marketing'

// ================================================
// GET /api/marketing/seo/meta
// Get SEO metadata for pages
// ================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const organizationId = searchParams.get('organization_id')
    const pageType = searchParams.get('page_type')
    const pageId = searchParams.get('page_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to organization
    const supabase = await createAuthClient()
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess) {
      return NextResponse.json(
        { error: 'Access denied to organization' },
        { status: 403 }
      )
    }

    // Build query
    let query = supabase
      .from('seo_metadata')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (pageType) {
      query = query.eq('page_type', pageType)
    }

    if (pageId) {
      query = query.eq('page_id', pageId)
    }

    const { data: seoMetadata, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch SEO metadata' },
        { status: 500 }
      )
    }

    // Get SEO performance insights
    const insights = await generateSEOInsights(supabase, organizationId, seoMetadata || [])

    return NextResponse.json({
      data: seoMetadata || [],
      count: count || 0,
      insights,
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    })

  } catch (error) {
    console.error('SEO metadata GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// POST /api/marketing/seo/meta
// Create or update SEO metadata
// ================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = seoSchemas.updateSEOMetadata.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const data: UpdateSEOMetadataRequest = validationResult.data

    // Verify user has access to organization
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', data.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin', 'editor'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Check if SEO metadata already exists for this page
    const { data: existing } = await supabase
      .from('seo_metadata')
      .select('id')
      .eq('organization_id', data.organization_id)
      .eq('page_type', data.page_type)
      .eq('page_id', data.page_id)
      .single()

    let result
    if (existing) {
      // Update existing metadata
      result = await seoUtils.updateMetadata(existing.id, data.seo_config)
    } else {
      // Create new metadata
      result = await seoUtils.createMetadata({
        organization_id: data.organization_id,
        page_type: data.page_type,
        page_id: data.page_id,
        seo_config: data.seo_config
      })
    }

    if (result.error) {
      console.error('Failed to save SEO metadata:', result.error)
      return NextResponse.json(
        { error: 'Failed to save SEO metadata' },
        { status: 500 }
      )
    }

    // Validate SEO configuration
    const validation = validateSEOConfig(data.seo_config)

    // Track SEO update for analytics
    try {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id: data.organization_id,
          metric_type: 'seo_metadata_updated',
          metric_value: 1,
          dimensions: {
            page_type: data.page_type,
            page_id: data.page_id,
            has_title: !!data.seo_config.title,
            has_description: !!data.seo_config.description,
            has_keywords: !!(data.seo_config.keywords && data.seo_config.keywords.length > 0),
            has_og_data: !!data.seo_config.open_graph,
            validation_score: validation.score,
            user_id: user.id
          }
        })
    } catch (metricsError) {
      console.warn('Failed to track SEO metadata update metrics:', metricsError)
    }

    return NextResponse.json({
      data: result.data,
      validation,
      message: existing ? 'SEO metadata updated successfully' : 'SEO metadata created successfully'
    }, { status: existing ? 200 : 201 })

  } catch (error) {
    console.error('SEO metadata POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// PUT /api/marketing/seo/meta
// Bulk update SEO metadata
// ================================================

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { updates, organization_id } = body

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Invalid updates array' },
        { status: 400 }
      )
    }

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin', 'editor'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Process each update
    const results = []
    for (const update of updates) {
      try {
        const validationResult = seoSchemas.updateSEOMetadata.safeParse({
          ...update,
          organization_id
        })

        if (!validationResult.success) {
          results.push({
            page_type: update.page_type,
            page_id: update.page_id,
            success: false,
            error: 'Invalid data'
          })
          continue
        }

        const data = validationResult.data

        // Check if metadata exists
        const { data: existing } = await supabase
          .from('seo_metadata')
          .select('id')
          .eq('organization_id', organization_id)
          .eq('page_type', data.page_type)
          .eq('page_id', data.page_id)
          .single()

        let result
        if (existing) {
          result = await seoUtils.updateMetadata(existing.id, data.seo_config)
        } else {
          result = await seoUtils.createMetadata({
            organization_id,
            page_type: data.page_type,
            page_id: data.page_id,
            seo_config: data.seo_config
          })
        }

        results.push({
          page_type: data.page_type,
          page_id: data.page_id,
          success: !result.error,
          data: result.data,
          error: result.error?.message
        })

      } catch (err) {
        results.push({
          page_type: update.page_type,
          page_id: update.page_id,
          success: false,
          error: 'Processing failed'
        })
      }
    }

    return NextResponse.json({
      results,
      summary: {
        total_attempted: updates.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      },
      message: 'Bulk SEO metadata update completed'
    })

  } catch (error) {
    console.error('SEO metadata bulk PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// DELETE /api/marketing/seo/meta
// Delete SEO metadata
// ================================================

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { metadata_ids, organization_id } = body

    if (!Array.isArray(metadata_ids) || metadata_ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid metadata IDs array' },
        { status: 400 }
      )
    }

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has admin access for deletion
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for deletion' },
        { status: 403 }
      )
    }

    // Get metadata to verify they exist
    const { data: metadata } = await supabase
      .from('seo_metadata')
      .select('id, page_type, page_id')
      .in('id', metadata_ids)
      .eq('organization_id', organization_id)

    if (!metadata || metadata.length === 0) {
      return NextResponse.json(
        { error: 'No SEO metadata found' },
        { status: 404 }
      )
    }

    // Delete metadata
    const deletePromises = metadata.map(item => seoUtils.deleteMetadata(item.id))
    const results = await Promise.allSettled(deletePromises)
    
    const successful = results
      .map((result, index) => ({
        id: metadata[index].id,
        page_type: metadata[index].page_type,
        page_id: metadata[index].page_id,
        success: result.status === 'fulfilled' && result.value.success,
        error: result.status === 'rejected' || !result.value.success ? 
          (result.status === 'rejected' ? result.reason : 'Deletion failed') : null
      }))

    return NextResponse.json({
      results: successful,
      summary: {
        total_attempted: metadata.length,
        successful: successful.filter(r => r.success).length,
        failed: successful.filter(r => !r.success).length
      },
      message: 'SEO metadata deletion completed'
    })

  } catch (error) {
    console.error('SEO metadata DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

async function generateSEOInsights(supabase: any, organizationId: string, metadata: any[]) {
  const insights = {
    total_pages: metadata.length,
    pages_with_meta_description: 0,
    pages_with_keywords: 0,
    pages_with_og_data: 0,
    average_title_length: 0,
    average_description_length: 0,
    issues: [] as string[]
  }

  let totalTitleLength = 0
  let totalDescLength = 0
  let titlesCount = 0
  let descriptionsCount = 0

  metadata.forEach(item => {
    const config = item.seo_config

    if (config.description) {
      insights.pages_with_meta_description++
      totalDescLength += config.description.length
      descriptionsCount++
    }

    if (config.keywords && config.keywords.length > 0) {
      insights.pages_with_keywords++
    }

    if (config.open_graph) {
      insights.pages_with_og_data++
    }

    if (config.title) {
      totalTitleLength += config.title.length
      titlesCount++
    }
  })

  insights.average_title_length = titlesCount > 0 ? Math.round(totalTitleLength / titlesCount) : 0
  insights.average_description_length = descriptionsCount > 0 ? Math.round(totalDescLength / descriptionsCount) : 0

  // Generate issues
  if (insights.pages_with_meta_description / insights.total_pages < 0.8) {
    insights.issues.push('Less than 80% of pages have meta descriptions')
  }

  if (insights.average_title_length > 60) {
    insights.issues.push('Average title length exceeds recommended 60 characters')
  }

  if (insights.average_description_length > 160) {
    insights.issues.push('Average description length exceeds recommended 160 characters')
  }

  if (insights.pages_with_og_data / insights.total_pages < 0.5) {
    insights.issues.push('Less than 50% of pages have Open Graph data')
  }

  return insights
}

function validateSEOConfig(config: any) {
  const validation = {
    score: 100,
    issues: [] as string[],
    warnings: [] as string[]
  }

  // Title validation
  if (!config.title) {
    validation.issues.push('Missing title tag')
    validation.score -= 20
  } else {
    if (config.title.length > 60) {
      validation.warnings.push('Title is longer than 60 characters')
      validation.score -= 5
    }
    if (config.title.length < 30) {
      validation.warnings.push('Title is shorter than 30 characters')
      validation.score -= 5
    }
  }

  // Description validation
  if (!config.description) {
    validation.issues.push('Missing meta description')
    validation.score -= 15
  } else {
    if (config.description.length > 160) {
      validation.warnings.push('Description is longer than 160 characters')
      validation.score -= 5
    }
    if (config.description.length < 120) {
      validation.warnings.push('Description is shorter than 120 characters')
      validation.score -= 3
    }
  }

  // Keywords validation
  if (!config.keywords || config.keywords.length === 0) {
    validation.warnings.push('No keywords specified')
    validation.score -= 5
  } else if (config.keywords.length > 10) {
    validation.warnings.push('Too many keywords (recommended: 3-5)')
    validation.score -= 3
  }

  // Open Graph validation
  if (!config.open_graph) {
    validation.warnings.push('Missing Open Graph data')
    validation.score -= 10
  } else {
    if (!config.open_graph.title) {
      validation.warnings.push('Missing Open Graph title')
      validation.score -= 3
    }
    if (!config.open_graph.description) {
      validation.warnings.push('Missing Open Graph description')
      validation.score -= 3
    }
    if (!config.open_graph.image) {
      validation.warnings.push('Missing Open Graph image')
      validation.score -= 5
    }
  }

  return validation
}