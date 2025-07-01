// CREATED: 2025-07-01 - Individual A/B test API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAuthClient } from '@/lib/auth/auth-utils'
import { abTestUtils } from '@/lib/marketing/ab-testing'
import { abTestSchemas } from '@/shared/schemas/marketing'
import type { UpdateABTestRequest } from '@/shared/types/marketing'

interface RouteParams {
  params: {
    id: string
  }
}

// ================================================
// GET /api/marketing/ab-tests/[id]
// Get specific A/B test
// ================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Test ID is required' },
        { status: 400 }
      )
    }

    // Get A/B test
    const { data: abTest, error } = await abTestUtils.get(id)

    if (error) {
      console.error('Failed to fetch A/B test:', error)
      return NextResponse.json(
        { error: 'Failed to fetch A/B test' },
        { status: 500 }
      )
    }

    if (!abTest) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      )
    }

    // Verify user has access to organization
    const supabase = await createAuthClient()
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', abTest.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess) {
      return NextResponse.json(
        { error: 'Access denied to this A/B test' },
        { status: 403 }
      )
    }

    // Get test sessions count and basic stats
    const { data: sessionStats } = await supabase
      .from('ab_test_sessions')
      .select('variant_id, converted')
      .eq('ab_test_id', id)

    let variantStats = {}
    if (sessionStats) {
      variantStats = sessionStats.reduce((acc, session) => {
        const variantId = session.variant_id
        if (!acc[variantId]) {
          acc[variantId] = { sessions: 0, conversions: 0, conversion_rate: 0 }
        }
        acc[variantId].sessions++
        if (session.converted) {
          acc[variantId].conversions++
        }
        acc[variantId].conversion_rate = acc[variantId].sessions > 0 
          ? (acc[variantId].conversions / acc[variantId].sessions) * 100 
          : 0
        return acc
      }, {} as Record<string, any>)
    }

    return NextResponse.json({
      data: {
        ...abTest,
        variant_stats: variantStats,
        total_sessions: sessionStats?.length || 0
      }
    })

  } catch (error) {
    console.error('A/B test GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// PUT /api/marketing/ab-tests/[id]
// Update A/B test
// ================================================

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { id } = params
    const supabase = await createAuthClient()

    if (!id) {
      return NextResponse.json(
        { error: 'Test ID is required' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = abTestSchemas.updateABTest.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const data: UpdateABTestRequest = validationResult.data

    // Get existing test to verify permissions
    const { data: existingTest, error: getError } = await abTestUtils.get(id)
    
    if (getError || !existingTest) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      )
    }

    // Verify user has access to organization
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', existingTest.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin', 'editor'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Validate status transitions
    if (data.status && existingTest.status) {
      const validTransitions = {
        'draft': ['running', 'archived'],
        'running': ['paused', 'completed'],
        'paused': ['running', 'completed'],
        'completed': [], // Cannot change from completed
        'archived': [] // Cannot change from archived
      }

      const currentStatus = existingTest.status as keyof typeof validTransitions
      const newStatus = data.status

      if (!validTransitions[currentStatus].includes(newStatus)) {
        return NextResponse.json(
          { 
            error: `Cannot change status from ${currentStatus} to ${newStatus}`,
            valid_transitions: validTransitions[currentStatus]
          },
          { status: 400 }
        )
      }

      // Set timestamps for status changes
      if (newStatus === 'running' && currentStatus === 'draft') {
        data.started_at = new Date().toISOString()
      } else if (newStatus === 'completed') {
        data.ended_at = new Date().toISOString()
      }
    }

    // Update A/B test
    const { data: updatedTest, error: updateError } = await abTestUtils.update(id, data)

    if (updateError) {
      console.error('Failed to update A/B test:', updateError)
      return NextResponse.json(
        { error: 'Failed to update A/B test' },
        { status: 500 }
      )
    }

    // Track status changes for analytics
    if (data.status && data.status !== existingTest.status) {
      try {
        await supabase
          .from('growth_metrics')
          .insert({
            organization_id: existingTest.organization_id,
            metric_type: 'ab_test_status_changed',
            metric_value: 1,
            dimensions: {
              test_id: id,
              from_status: existingTest.status,
              to_status: data.status,
              user_id: user.id
            }
          })
      } catch (metricsError) {
        console.warn('Failed to track A/B test status change metrics:', metricsError)
      }
    }

    return NextResponse.json({
      data: updatedTest,
      message: 'A/B test updated successfully'
    })

  } catch (error) {
    console.error('A/B test PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// DELETE /api/marketing/ab-tests/[id]
// Delete A/B test
// ================================================

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { id } = params
    const supabase = await createAuthClient()

    if (!id) {
      return NextResponse.json(
        { error: 'Test ID is required' },
        { status: 400 }
      )
    }

    // Get existing test to verify permissions
    const { data: existingTest, error: getError } = await abTestUtils.get(id)
    
    if (getError || !existingTest) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      )
    }

    // Verify user has admin access
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', existingTest.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for deletion' },
        { status: 403 }
      )
    }

    // Cannot delete running tests
    if (existingTest.status === 'running') {
      return NextResponse.json(
        { error: 'Cannot delete running A/B test. Stop the test first.' },
        { status: 400 }
      )
    }

    // Delete A/B test
    const { success, error: deleteError } = await abTestUtils.delete(id)

    if (!success || deleteError) {
      console.error('Failed to delete A/B test:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete A/B test' },
        { status: 500 }
      )
    }

    // Track deletion for analytics
    try {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id: existingTest.organization_id,
          metric_type: 'ab_test_deleted',
          metric_value: 1,
          dimensions: {
            test_id: id,
            test_name: existingTest.name,
            test_status: existingTest.status,
            user_id: user.id
          }
        })
    } catch (metricsError) {
      console.warn('Failed to track A/B test deletion metrics:', metricsError)
    }

    return NextResponse.json({
      message: 'A/B test deleted successfully'
    })

  } catch (error) {
    console.error('A/B test DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}