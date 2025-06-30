// UPDATED: 2025-06-30 - Created alert acknowledgment API endpoint

import { createAuthClient } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    // Authenticate user
    const supabase = await createAuthClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { alertId } = params

    // Verify user has access to this alert
    const { data: alert, error: alertError } = await supabase
      .from('billing_alerts')
      .select('*')
      .eq('id', alertId)
      .single()

    if (alertError || !alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    // Check if user has access to the alert
    const hasAccess = alert.user_id === user.id || 
      (alert.organization_id && await checkOrganizationAccess(supabase, user.id, alert.organization_id))

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update alert to acknowledged
    const { data: updatedAlert, error: updateError } = await supabase
      .from('billing_alerts')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to acknowledge alert:', updateError)
      return NextResponse.json(
        { error: 'Failed to acknowledge alert' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedAlert)

  } catch (error) {
    console.error('Acknowledge alert error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}