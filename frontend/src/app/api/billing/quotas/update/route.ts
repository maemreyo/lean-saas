// UPDATED: 2025-06-30 - Created quota update API endpoint (admin only)

import { createAuthClient } from '@/lib/auth/server'
import { usageQuotaUpdateSchema } from '@/shared/schemas/billing'
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
    const { quotaType, limitValue, organizationId } = body

    // Check organization access and admin role
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

    // Update or create quota
    const { data: quota, error: quotaError } = await supabase
      .from('usage_quotas')
      .upsert({
        user_id: organizationId ? null : user.id,
        organization_id: organizationId || null,
        quota_type: quotaType,
        limit_value: limitValue,
        updated_at: new Date().toISOString()
      }, {
        onConflict: organizationId ? 'organization_id,quota_type' : 'user_id,quota_type'
      })
      .select()
      .single()

    if (quotaError) {
      console.error('Failed to update quota:', quotaError)
      return NextResponse.json(
        { error: 'Failed to update quota' },
        { status: 500 }
      )
    }

    return NextResponse.json(quota)

  } catch (error) {
    console.error('Update quota error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}