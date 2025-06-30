// UPDATED: 2025-06-30 - Created alert deletion API endpoint

import { createAuthClient } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
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

    // Delete alert
    const { error: deleteError } = await supabase
      .from('billing_alerts')
      .delete()
      .eq('id', alertId)

    if (deleteError) {
      console.error('Failed to delete alert:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete alert' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete alert error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to check organization access
async function checkOrganizationAccess(supabase: any, userId: string, organizationId: string): Promise<boolean> {
  try {
    const { data: membership, error } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single()

    return !error && membership
  } catch {
    return false
  }
}