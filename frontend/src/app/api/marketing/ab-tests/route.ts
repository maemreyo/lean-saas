// CREATED: 2025-07-01 - A/B tests main API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAuthClient } from '@/lib/auth/auth-utils'
import { abTestUtils } from '@/lib/marketing/ab-testing'
import { abTestSchemas } from '@/shared/schemas/marketing'
import type { CreateABTestRequest, ABTest } from '@/shared/types/marketing'

// ================================================
// GET /api/marketing/ab-tests
// List A/B tests for organization
// ================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const organizationId = searchParams.get('organization_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')

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

    // Fetch A/B tests
    const { data: abTests, count, error } = await abTestUtils.list(organizationId, {
      status,
      limit,
      offset,
      search
    })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch A/B tests' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: abTests || [],
      count: count || 0,
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    })

  } catch (error) {
    console.error('A/B tests GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// POST /api/marketing/ab-tests
// Create new A/B test
// ================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = abTestSchemas.createABTest.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const data: CreateABTestRequest = validationResult.data

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

    // Create A/B test
    const { data: abTest, error: createError } = await abTestUtils.create({
      ...data,
      created_by: user.id
    })

    if (createError) {
      console.error('Failed to create A/B test:', createError)
      return NextResponse.json(
        { error: 'Failed to create A/B test' },
        { status: 500 }
      )
    }

    // Track creation event for analytics
    try {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id: data.organization_id,
          metric_type: 'ab_test_created',
          metric_value: 1,
          dimensions: {
            test_id: abTest?.id,
            target_metric: data.target_metric,
            variants_count: data.variants.length,
            user_id: user.id
          }
        })
    } catch (metricsError) {
      console.warn('Failed to track A/B test creation metrics:', metricsError)
    }

    return NextResponse.json({
      data: abTest,
      message: 'A/B test created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('A/B test POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// DELETE /api/marketing/ab-tests
// Batch delete A/B tests
// ================================================

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { test_ids, organization_id } = body

    if (!Array.isArray(test_ids) || test_ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid test IDs array' },
        { status: 400 }
      )
    }

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has admin access
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for batch deletion' },
        { status: 403 }
      )
    }

    // Get tests to verify they exist and belong to organization
    const { data: tests } = await supabase
      .from('ab_tests')
      .select('id, name, status')
      .in('id', test_ids)
      .eq('organization_id', organization_id)

    if (!tests || tests.length === 0) {
      return NextResponse.json(
        { error: 'No tests found' },
        { status: 404 }
      )
    }

    // Check if any tests are currently running
    const runningTests = tests.filter(test => test.status === 'running')
    if (runningTests.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete running A/B tests',
          running_tests: runningTests.map(t => ({ id: t.id, name: t.name }))
        },
        { status: 400 }
      )
    }

    // Delete tests
    const deletePromises = tests.map(test => abTestUtils.delete(test.id))
    const results = await Promise.allSettled(deletePromises)
    
    const successful = results
      .map((result, index) => ({
        id: tests[index].id,
        name: tests[index].name,
        success: result.status === 'fulfilled' && result.value.success,
        error: result.status === 'rejected' || !result.value.success ? 
          (result.status === 'rejected' ? result.reason : 'Deletion failed') : null
      }))

    // Track batch deletion
    try {
      const successfulCount = successful.filter(r => r.success).length
      if (successfulCount > 0) {
        await supabase
          .from('growth_metrics')
          .insert({
            organization_id,
            metric_type: 'ab_tests_deleted',
            metric_value: successfulCount,
            dimensions: {
              total_attempted: tests.length,
              user_id: user.id
            }
          })
      }
    } catch (metricsError) {
      console.warn('Failed to track A/B test deletion metrics:', metricsError)
    }

    return NextResponse.json({
      results: successful,
      summary: {
        total_attempted: tests.length,
        successful: successful.filter(r => r.success).length,
        failed: successful.filter(r => !r.success).length
      },
      message: 'Batch deletion completed'
    })

  } catch (error) {
    console.error('A/B tests batch DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}