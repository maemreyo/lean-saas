// CREATED: 2025-07-01 - Landing page publish API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAuthClient } from '@/lib/auth/auth-utils'
import { landingPageUtils } from '@/lib/marketing/landing-pages'
import { landingPageSchemas } from '@/shared/schemas/marketing'
import type { PublishLandingPageRequest } from '@/shared/types/marketing'

// ================================================
// PUT /api/marketing/landing-pages/publish
// Publish/unpublish landing page
// ================================================

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = landingPageSchemas.publishLandingPage.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { landing_page_id, published, published_at }: PublishLandingPageRequest & { 
      landing_page_id: string 
    } = validationResult.data

    // Verify user has access to landing page
    const { data: landingPage, error: getError } = await landingPageUtils.get(landing_page_id)
    
    if (getError || !landingPage) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      )
    }

    // Check organization access
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', landingPage.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin', 'editor'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Publish/unpublish landing page
    const { data: updatedPage, error: updateError } = await landingPageUtils.publish(
      landing_page_id,
      published,
      published_at
    )

    if (updateError) {
      console.error('Failed to publish landing page:', updateError)
      return NextResponse.json(
        { error: 'Failed to update publication status' },
        { status: 500 }
      )
    }

    // Track publishing event for analytics
    if (published && updatedPage) {
      try {
        await supabase
          .from('growth_metrics')
          .insert({
            organization_id: landingPage.organization_id,
            metric_type: 'page_published',
            metric_value: 1,
            dimensions: {
              landing_page_id: landing_page_id,
              page_slug: landingPage.slug,
              user_id: user.id
            }
          })
      } catch (metricsError) {
        // Non-critical error - don't fail the request
        console.warn('Failed to track publishing metrics:', metricsError)
      }
    }

    return NextResponse.json({
      data: updatedPage,
      message: published ? 'Landing page published successfully' : 'Landing page unpublished successfully'
    })

  } catch (error) {
    console.error('Landing page publish error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// POST /api/marketing/landing-pages/publish
// Batch publish/unpublish multiple landing pages
// ================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    // Parse and validate request body
    const body = await request.json()
    const { landing_page_ids, published } = body

    if (!Array.isArray(landing_page_ids) || landing_page_ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid landing page IDs array' },
        { status: 400 }
      )
    }

    if (typeof published !== 'boolean') {
      return NextResponse.json(
        { error: 'Published status must be boolean' },
        { status: 400 }
      )
    }

    // Get all landing pages
    const { data: landingPages, error: getError } = await supabase
      .from('landing_pages')
      .select('id, organization_id, slug')
      .in('id', landing_page_ids)

    if (getError) {
      return NextResponse.json(
        { error: 'Failed to fetch landing pages' },
        { status: 500 }
      )
    }

    if (!landingPages || landingPages.length === 0) {
      return NextResponse.json(
        { error: 'No landing pages found' },
        { status: 404 }
      )
    }

    // Check permissions for all organizations
    const organizationIds = [...new Set(landingPages.map(page => page.organization_id))]
    
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .in('organization_id', organizationIds)
      .eq('user_id', user.id)

    const allowedOrgs = new Set(
      orgAccess
        ?.filter(access => ['owner', 'admin', 'editor'].includes(access.role))
        .map(access => access.organization_id) || []
    )

    // Filter pages user has access to
    const allowedPages = landingPages.filter(page => 
      allowedOrgs.has(page.organization_id)
    )

    if (allowedPages.length === 0) {
      return NextResponse.json(
        { error: 'Insufficient permissions for any landing pages' },
        { status: 403 }
      )
    }

    // Batch update
    const updatePromises = allowedPages.map(page =>
      landingPageUtils.publish(page.id, published)
    )

    const results = await Promise.allSettled(updatePromises)
    
    const successful = results
      .map((result, index) => ({
        id: allowedPages[index].id,
        success: result.status === 'fulfilled' && !result.value.error,
        data: result.status === 'fulfilled' ? result.value.data : null,
        error: result.status === 'rejected' || result.value.error ? 
          (result.status === 'rejected' ? result.reason : result.value.error?.message) : null
      }))

    // Track batch publishing for analytics
    try {
      const successfulCount = successful.filter(r => r.success).length
      if (successfulCount > 0) {
        await supabase
          .from('growth_metrics')
          .insert({
            organization_id: allowedPages[0].organization_id, // Use first org for tracking
            metric_type: published ? 'batch_pages_published' : 'batch_pages_unpublished',
            metric_value: successfulCount,
            dimensions: {
              total_attempted: allowedPages.length,
              user_id: user.id
            }
          })
      }
    } catch (metricsError) {
      console.warn('Failed to track batch publishing metrics:', metricsError)
    }

    return NextResponse.json({
      results: successful,
      summary: {
        total_attempted: allowedPages.length,
        successful: successful.filter(r => r.success).length,
        failed: successful.filter(r => !r.success).length
      },
      message: `Batch ${published ? 'publish' : 'unpublish'} completed`
    })

  } catch (error) {
    console.error('Batch landing page publish error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}