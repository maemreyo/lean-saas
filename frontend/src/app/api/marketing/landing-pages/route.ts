// CREATED: 2025-07-01 - Landing pages CRUD API endpoints

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createAuthClient } from '@/lib/auth/server'
import { landingPageSchemas } from '@/shared/schemas/marketing'
import { landingPageUtils } from '@/lib/marketing/landing-pages'
import type { CreateLandingPageRequest } from '@/shared/types/marketing'

// ================================================
// GET /api/marketing/landing-pages
// List landing pages for organization
// ================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const published = searchParams.get('published')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate required parameters
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to organization' },
        { status: 403 }
      )
    }

    // Query landing pages
    let query = supabase
      .from('landing_pages')
      .select('*, organization:organizations(name)', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (published !== null) {
      query = query.eq('published', published === 'true')
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: landingPages, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch landing pages' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: landingPages || [],
      count: count || 0,
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    })

  } catch (error) {
    console.error('Landing pages GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// POST /api/marketing/landing-pages
// Create new landing page
// ================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = landingPageSchemas.createLandingPage.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const data: CreateLandingPageRequest = validationResult.data

    // Verify user has access to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', data.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to organization' },
        { status: 403 }
      )
    }

    // Check if slug is unique within organization
    const { data: existingPage } = await supabase
      .from('landing_pages')
      .select('id')
      .eq('organization_id', data.organization_id)
      .eq('slug', data.slug)
      .single()

    if (existingPage) {
      return NextResponse.json(
        { error: 'Landing page with this slug already exists' },
        { status: 409 }
      )
    }

    // Create landing page using utility function
    const { data: landingPage, error } = await landingPageUtils.create({
      ...data,
      created_by: user.id
    })

    if (error) {
      console.error('Create landing page error:', error)
      return NextResponse.json(
        { error: 'Failed to create landing page' },
        { status: 500 }
      )
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        organization_id: data.organization_id,
        user_id: user.id,
        action: 'landing_page.created',
        resource_type: 'landing_page',
        resource_id: landingPage.id,
        metadata: {
          title: landingPage.title,
          slug: landingPage.slug
        }
      })

    return NextResponse.json({
      data: landingPage,
      message: 'Landing page created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Landing pages POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}