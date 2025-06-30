// UPDATED: 2025-06-30 - Created usage tracking API endpoint for metered billing

import { createAuthClient } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { usageTrackingRequestSchema } from '@/shared/schemas/billing'
import { advancedStripeUtils } from '@/lib/stripe/advanced'
import { NextRequest, NextResponse } from 'next/server'
import type { UsageTrackingRequest, UsageTrackingResponse } from '@/shared/types/billing'

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
    const validation = usageTrackingRequestSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { eventType, quantity, metadata, organizationId } = validation.data

    // Get user context
    const contextId = organizationId || user.id
    const isOrganization = !!organizationId

    // Check if user has access to organization
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

    // Get current billing period
    const now = new Date()
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Create usage event
    const { data: usageEvent, error: usageError } = await supabase
      .from('usage_events')
      .insert({
        user_id: isOrganization ? null : user.id,
        organization_id: isOrganization ? organizationId : null,
        event_type: eventType,
        quantity,
        metadata,
        billing_period_start: billingPeriodStart.toISOString(),
        billing_period_end: billingPeriodEnd.toISOString(),
        processed: false
      })
      .select()
      .single()

    if (usageError) {
      console.error('Failed to create usage event:', usageError)
      return NextResponse.json(
        { error: 'Failed to track usage' },
        { status: 500 }
      )
    }

    // Update quota usage
    const quotaType = mapEventTypeToQuotaType(eventType)
    if (quotaType) {
      const { data: quota, error: quotaError } = await supabase
        .from('usage_quotas')
        .select('*')
        .eq(isOrganization ? 'organization_id' : 'user_id', contextId)
        .eq('quota_type', quotaType)
        .single()

      if (quota) {
        const newUsage = quota.current_usage + quantity
        
        // Update quota usage
        await supabase
          .from('usage_quotas')
          .update({ 
            current_usage: newUsage,
            updated_at: new Date().toISOString()
          })
          .eq('id', quota.id)

        // Check for quota alerts
        const utilizationPercentage = quota.limit_value === -1 
          ? 0 
          : (newUsage / quota.limit_value) * 100

        // Create alerts if needed
        if (utilizationPercentage >= 100 && quota.limit_value !== -1) {
          // Quota exceeded alert
          await createBillingAlert({
            user_id: isOrganization ? null : user.id,
            organization_id: isOrganization ? organizationId : null,
            alert_type: 'quota_exceeded',
            quota_type: quotaType,
            current_usage: newUsage,
            limit_value: quota.limit_value,
            metadata: { event_type: eventType }
          })
        } else if (utilizationPercentage >= 80 && quota.limit_value !== -1) {
          // Check if we haven't already sent a warning for this threshold
          const { data: existingAlert } = await supabase
            .from('billing_alerts')
            .select('id')
            .eq(isOrganization ? 'organization_id' : 'user_id', contextId)
            .eq('alert_type', 'quota_warning')
            .eq('quota_type', quotaType)
            .gte('threshold_percentage', 80)
            .order('triggered_at', { ascending: false })
            .limit(1)
            .single()

          if (!existingAlert) {
            await createBillingAlert({
              user_id: isOrganization ? null : user.id,
              organization_id: isOrganization ? organizationId : null,
              alert_type: 'quota_warning',
              quota_type: quotaType,
              threshold_percentage: Math.floor(utilizationPercentage),
              current_usage: newUsage,
              limit_value: quota.limit_value,
              metadata: { event_type: eventType }
            })
          }
        }

        // Get updated quota status
        const quotaStatus = {
          current: newUsage,
          limit: quota.limit_value,
          remaining: quota.limit_value === -1 ? Infinity : Math.max(0, quota.limit_value - newUsage),
          percentage: utilizationPercentage
        }

        // Get any new alerts
        const { data: alerts } = await supabase
          .from('billing_alerts')
          .select('*')
          .eq(isOrganization ? 'organization_id' : 'user_id', contextId)
          .eq('acknowledged', false)
          .order('triggered_at', { ascending: false })
          .limit(5)

        const response: UsageTrackingResponse = {
          success: true,
          usageEvent,
          quotaStatus,
          alerts: alerts || []
        }

        return NextResponse.json(response)
      }
    }

    // If no quota tracking, just return the usage event
    const response: UsageTrackingResponse = {
      success: true,
      usageEvent,
      quotaStatus: {
        current: quantity,
        limit: -1,
        remaining: Infinity,
        percentage: 0
      },
      alerts: []
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Usage tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to map event types to quota types
function mapEventTypeToQuotaType(eventType: string): string | null {
  const mapping: Record<string, string> = {
    'api_call': 'api_calls',
    'storage_used': 'storage_gb',
    'project_created': 'projects',
    'user_invited': 'team_members',
    'email_sent': 'email_sends',
    'export_generated': 'exports',
    'backup_created': 'backups',
    'custom_domain': 'custom_domains'
  }
  return mapping[eventType] || null
}

// Helper function to create billing alerts
async function createBillingAlert(alertData: any) {
  const supabase = createClient()
  
  try {
    await supabase
      .from('billing_alerts')
      .insert(alertData)
  } catch (error) {
    console.error('Failed to create billing alert:', error)
  }
}