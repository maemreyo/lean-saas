// UPDATED: 2025-06-30 - Created quota reset API endpoint

import { createAuthClient } from '@/lib/auth/server'
import { quotaResetSchema } from '@/shared/schemas/billing'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createAuthClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request
    const body = await request.json()
    const validation = quotaResetSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { quotaTypes, organizationId, resetPeriod } = validation.data

    // Check organization access
    if (organizationId) {
      const { data: membership, error: memberError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single()

      if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    // Build query
    let query = supabase
      .from('usage_quotas')
      .update({ 
        current_usage: 0,
        last_reset: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq(organizationId ? 'organization_id' : 'user_id', organizationId || user.id)

    // Add quota type filter if specified
    if (quotaTypes && quotaTypes.length > 0) {
      query = query.in('quota_type', quotaTypes)
    }

    // Add reset period filter if specified
    if (resetPeriod) {
      query = query.eq('reset_period', resetPeriod)
    }

    const { data: updatedQuotas, error: resetError } = await query.select()

    if (resetError) {
      console.error('Failed to reset quotas:', resetError)
      return NextResponse.json(
        { error: 'Failed to reset quotas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      resetCount: updatedQuotas?.length || 0
    })

  } catch (error) {
    console.error('Reset quotas error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}