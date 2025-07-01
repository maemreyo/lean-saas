// CREATED: 2025-07-01 - Landing page individual operations API

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createAuthClient } from '@/lib/auth/server'
import { landingPageSchemas } from '@/shared/schemas/marketing'
import { landingPageUtils } from '@/lib/marketing/landing-pages'
import type { UpdateLandingPageRequest } from '@/shared/types/marketing'

// ================================================
// GET /api/marketing/landing-pages/[id]
// Get single landing page
// ================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    const { id } = params

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid landing page ID' },
        { status: 400 }
      )
    }

    // Get landing page with organization info
    const { data: landingPage, error } = await supabase
      .from('landing_pages')
      .select(`
        *,
        organization:organizations(name),
        creator:profiles!landing_pages_created_by_fkey(email, full_name)
      `)
      .eq('id', id)
      .single()

    if (error || !landingPage) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      )
    }

    // Verify user has access to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', landingPage.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get related A/B tests if any
    const { data: abTests } = await supabase
      .from('ab_tests')
      .select('id, name, status, variants')
      .eq('page_id', id)
      .eq('page_type', 'landing_page')

    // Get analytics data (last 30 days)
    const { data: analytics } = await supabase
      .rpc('get_landing_page_analytics', {
        page_id: id,
        days: 30
      })

    return NextResponse.json({
      data: {
        ...landingPage,
        ab_tests: abTests || [],
        analytics: analytics || {
          views: 0,
          conversions: 0,
          conversion_rate: 0,
          bounce_rate: 0
        }
      }
    })

  } catch (error) {
    console.error('Landing page GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// PUT /api/marketing/landing-pages/[id]
// Update landing page
// ================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    const { id } = params

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid landing page ID' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = landingPageSchemas.updateLandingPage.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const updateData: UpdateLandingPageRequest = validationResult.data

    // Get current landing page
    const { data: currentPage, error: fetchError } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentPage) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      )
    }

    // Verify user has access to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', currentPage.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if user can edit (admin/owner or creator)
    const canEdit = membership.role === 'admin' || 
                   membership.role === 'owner' || 
                   currentPage.created_by === user.id

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Insufficient permissions to edit this landing page' },
        { status: 403 }
      )
    }

    // Check slug uniqueness if slug is being changed
    if (updateData.slug && updateData.slug !== currentPage.slug) {
      const { data: existingPage } = await supabase
        .from('landing_pages')
        .select('id')
        .eq('organization_id', currentPage.organization_id)
        .eq('slug', updateData.slug)
        .neq('id', id)
        .single()

      if (existingPage) {
        return NextResponse.json(
          { error: 'Landing page with this slug already exists' },
          { status: 409 }
        )
      }
    }

    // Update landing page using utility function
    const { data: updatedPage, error } = await landingPageUtils.update(id, {
      ...updateData,
      updated_by: user.id
    })

    if (error) {
      console.error('Update landing page error:', error)
      return NextResponse.json(
        { error: 'Failed to update landing page' },
        { status: 500 }
      )
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        organization_id: currentPage.organization_id,
        user_id: user.id,
        action: 'landing_page.updated',
        resource_type: 'landing_page',
        resource_id: id,
        metadata: {
          title: updatedPage.title,
          slug: updatedPage.slug,
          changes: Object.keys(updateData)
        }
      })

    return NextResponse.json({
      data: updatedPage,
      message: 'Landing page updated successfully'
    })

  } catch (error) {
    console.error('Landing page PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// DELETE /api/marketing/landing-pages/[id]
// Delete landing page
// ================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    const { id } = params

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid landing page ID' },
        { status: 400 }
      )
    }

    // Get current landing page
    const { data: currentPage, error: fetchError } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentPage) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      )
    }

    // Verify user has access to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', currentPage.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if user can delete (admin/owner or creator)
    const canDelete = membership.role === 'admin' || 
                     membership.role === 'owner' || 
                     currentPage.created_by === user.id

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this landing page' },
        { status: 403 }
      )
    }

    // Check for active A/B tests
    const { data: activeTests } = await supabase
      .from('ab_tests')
      .select('id, name')
      .eq('page_id', id)
      .eq('page_type', 'landing_page')
      .eq('status', 'running')

    if (activeTests && activeTests.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete landing page with active A/B tests',
          details: `Active tests: ${activeTests.map(t => t.name).join(', ')}`
        },
        { status: 409 }
      )
    }

    // Soft delete - update status instead of hard delete
    const { error } = await supabase
      .from('landing_pages')
      .update({ 
        deleted_at: new Date().toISOString(),
        published: false,
        updated_by: user.id
      })
      .eq('id', id)

    if (error) {
      console.error('Delete landing page error:', error)
      return NextResponse.json(
        { error: 'Failed to delete landing page' },
        { status: 500 }
      )
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        organization_id: currentPage.organization_id,
        user_id: user.id,
        action: 'landing_page.deleted',
        resource_type: 'landing_page',
        resource_id: id,
        metadata: {
          title: currentPage.title,
          slug: currentPage.slug
        }
      })

    return NextResponse.json({
      message: 'Landing page deleted successfully'
    })

  } catch (error) {
    console.error('Landing page DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}