// UPDATED: 2025-06-30 - Created quota checking API endpoint

import { createAuthClient } from '@/lib/auth/server'
import { quotaCheckRequestSchema } from '@/shared/schemas/billing'
import { NextRequest, NextResponse } from 'next/server'
import type { QuotaCheckResponse } from '@/shared/types/billing'

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
    const validation = quotaCheckRequestSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { quotaType, requestedAmount, organizationId } = validation.data

    // Get user context
    const contextId = organizationId || user.id
    const isOrganization = !!organizationId

    // Check organization access
    if (isOrganization) {
      const { data: membership, error: memberError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single()

      if (memberError || !membership) {
        return NextResponse.json({ error: 'Access denied to organization' }, { status: 403 })
      }
    }

    // Get quota
    const { data: quota, error: quotaError } = await supabase
      .from('usage_quotas')
      .select('*')
      .eq(isOrganization ? 'organization_id' : 'user_id', contextId)
      .eq('quota_type', quotaType)
      .single()

    if (quotaError || !quota) {
      // No quota configured - assume unlimited for backwards compatibility
      const response: QuotaCheckResponse = {
        allowed: true,
        quota: {
          id: '',
          user_id: isOrganization ? null : user.id,
          organization_id: isOrganization ? organizationId : null,
          quota_type: quotaType,
          limit_value: -1,
          current_usage: 0,
          reset_period: 'monthly',
          last_reset: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        remaining: Infinity,
        wouldExceed: false,
        upgradeRequired: false
      }

      return NextResponse.json(response)
    }

    // Check if unlimited
    if (quota.limit_value === -1) {
      const response: QuotaCheckResponse = {
        allowed: true,
        quota,
        remaining: Infinity,
        wouldExceed: false,
        upgradeRequired: false
      }

      return NextResponse.json(response)
    }

    // Check if request would exceed quota
    const remaining = Math.max(0, quota.limit_value - quota.current_usage)
    const wouldExceed = requestedAmount > remaining
    const allowed = !wouldExceed

    // Get suggested plan if upgrade needed
    let suggestedPlan: string | undefined
    if (wouldExceed) {
      // This could be enhanced to suggest specific plans based on quota requirements
      suggestedPlan = 'pro' // Default suggestion
    }

    const response: QuotaCheckResponse = {
      allowed,
      quota,
      remaining,
      wouldExceed,
      upgradeRequired: wouldExceed,
      suggestedPlan
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Quota check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}