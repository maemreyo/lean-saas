// UPDATED: 2025-06-30 - Created billing alerts API endpoints

import { createAuthClient } from '@/lib/auth/server'
import { billingAlertsQuerySchema } from '@/shared/schemas/billing'
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
    const queryData = {
      alertType: searchParams.get('alertType') || undefined,
      acknowledged: searchParams.get('acknowledged') === 'true' ? true : 
                   searchParams.get('acknowledged') === 'false' ? false : undefined,
      organizationId: searchParams.get('organizationId') || undefined,
      limit: parseInt(searchParams.get('limit') || '10'),
      offset: parseInt(searchParams.get('offset') || '0')
    }

    const validation = billingAlertsQuerySchema.safeParse(queryData)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { alertType, acknowledged, organizationId, limit, offset } = validation.data

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

    // Build query
    let query = supabase
      .from('billing_alerts')
      .select('*')
      .eq(organizationId ? 'organization_id' : 'user_id', organizationId || user.id)

    // Add filters
    if (alertType) {
      query = query.eq('alert_type', alertType)
    }

    if (acknowledged !== undefined) {
      query = query.eq('acknowledged', acknowledged)
    }

    // Add pagination and ordering
    query = query
      .order('triggered_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: alerts, error: alertsError } = await query

    if (alertsError) {
      console.error('Failed to fetch alerts:', alertsError)
      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
        { status: 500 }
      )
    }

    return NextResponse.json(alerts || [])

  } catch (error) {
    console.error('Get alerts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}