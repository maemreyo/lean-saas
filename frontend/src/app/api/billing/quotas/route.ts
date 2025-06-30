// UPDATED: 2025-06-30 - Created quota management API endpoints

import { createAuthClient } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createAuthClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    // Check organization access if specified
    if (organizationId) {
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

    // Fetch quotas
    const { data: quotas, error: quotasError } = await supabase
      .from('usage_quotas')
      .select('*')
      .eq(organizationId ? 'organization_id' : 'user_id', organizationId || user.id)
      .order('quota_type')

    if (quotasError) {
      console.error('Failed to fetch quotas:', quotasError)
      return NextResponse.json(
        { error: 'Failed to fetch quotas' },
        { status: 500 }
      )
    }

    return NextResponse.json(quotas || [])

  } catch (error) {
    console.error('Get quotas error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}