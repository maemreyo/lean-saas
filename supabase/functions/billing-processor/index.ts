// UPDATED: 2025-06-30 - Created billing processor edge function for usage aggregation and metering

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

interface ProcessBillingRequest {
  action: 'process_usage' | 'aggregate_monthly' | 'check_quotas' | 'send_alerts'
  period?: {
    start: string
    end: string
  }
  organizationId?: string
  userId?: string
}

interface UsageAggregation {
  eventType: string
  totalQuantity: number
  totalCost: number
  eventCount: number
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Stripe configuration
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const METERED_PRICING = {
  api_call: 0.001, // $0.001 per API call
  storage_used: 0.1, // $0.10 per GB per month
  email_sent: 0.001, // $0.001 per email
  export_generated: 0.05, // $0.05 per export
  backup_created: 0.1, // $0.10 per backup
  custom_domain: 5.0, // $5.00 per domain per month
  advanced_feature: 0.01 // $0.01 per advanced feature usage
}

async function processUsageEvents(period?: { start: string; end: string }) {
  console.log('Processing usage events for billing...')
  
  try {
    // Get unprocessed usage events
    let query = supabase
      .from('usage_events')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })

    if (period) {
      query = query
        .gte('created_at', period.start)
        .lte('created_at', period.end)
    }

    const { data: events, error } = await query

    if (error) {
      throw new Error(`Failed to fetch usage events: ${error.message}`)
    }

    console.log(`Found ${events?.length || 0} unprocessed events`)

    if (!events || events.length === 0) {
      return { processed: 0, skipped: 0 }
    }

    let processed = 0
    let skipped = 0

    // Process events in batches
    const batchSize = 100
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize)
      
      for (const event of batch) {
        try {
          // Calculate cost for the event
          const unitPrice = event.unit_price || METERED_PRICING[event.event_type as keyof typeof METERED_PRICING] || 0
          const totalCost = event.quantity * unitPrice

          // Create invoice item if there's a cost and subscription exists
          if (totalCost > 0) {
            await createInvoiceItemForEvent(event, totalCost)
          }

          // Mark event as processed
          await supabase
            .from('usage_events')
            .update({ 
              processed: true,
              unit_price: unitPrice // Store the calculated unit price
            })
            .eq('id', event.id)

          processed++
        } catch (eventError) {
          console.error(`Failed to process event ${event.id}:`, eventError)
          skipped++
        }
      }
    }

    console.log(`Processed ${processed} events, skipped ${skipped}`)
    return { processed, skipped }

  } catch (error) {
    console.error('Error processing usage events:', error)
    throw error
  }
}

async function createInvoiceItemForEvent(event: any, totalCost: number) {
  try {
    // Get subscription for the user/organization
    const contextId = event.organization_id || event.user_id
    const isOrganization = !!event.organization_id

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq(isOrganization ? 'organization_id' : 'user_id', contextId)
      .eq('status', 'active')
      .single()

    if (subError || !subscription) {
      console.log(`No active subscription found for ${isOrganization ? 'org' : 'user'} ${contextId}`)
      return
    }

    // Get customer information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', isOrganization ? subscription.user_id : contextId)
      .single()

    if (profileError || !profile?.stripe_customer_id) {
      console.log(`No Stripe customer found for subscription ${subscription.id}`)
      return
    }

    // Create Stripe invoice item
    if (STRIPE_SECRET_KEY) {
      const stripeResponse = await fetch('https://api.stripe.com/v1/invoiceitems', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          customer: profile.stripe_customer_id,
          amount: Math.round(totalCost * 100).toString(), // Convert to cents
          currency: 'usd',
          description: `${event.event_type.replace('_', ' ')} usage - ${event.quantity} units`,
          'metadata[usage_event_id]': event.id,
          'metadata[event_type]': event.event_type,
          'metadata[quantity]': event.quantity.toString()
        })
      })

      if (!stripeResponse.ok) {
        const error = await stripeResponse.text()
        throw new Error(`Stripe API error: ${error}`)
      }

      const invoiceItem = await stripeResponse.json()

      // Store invoice item in database
      await supabase
        .from('invoice_items')
        .insert({
          subscription_id: subscription.id,
          stripe_invoice_item_id: invoiceItem.id,
          description: `${event.event_type.replace('_', ' ')} usage`,
          amount: Math.round(totalCost * 100),
          quantity: event.quantity,
          unit_price: Math.round((totalCost / event.quantity) * 100),
          period_start: event.billing_period_start || event.created_at,
          period_end: event.billing_period_end || event.created_at,
          usage_type: event.event_type,
          metadata: event.metadata || {}
        })
    }

  } catch (error) {
    console.error('Failed to create invoice item:', error)
    throw error
  }
}

async function aggregateMonthlyUsage(period: { start: string; end: string }) {
  console.log('Aggregating monthly usage data...')
  
  try {
    const { data: events, error } = await supabase
      .from('usage_events')
      .select('*')
      .gte('created_at', period.start)
      .lte('created_at', period.end)
      .eq('processed', true)

    if (error) {
      throw new Error(`Failed to fetch usage events: ${error.message}`)
    }

    // Group by user/organization and event type
    const aggregations: Record<string, Record<string, UsageAggregation>> = {}

    for (const event of events || []) {
      const contextKey = event.organization_id || event.user_id
      const eventType = event.event_type

      if (!aggregations[contextKey]) {
        aggregations[contextKey] = {}
      }

      if (!aggregations[contextKey][eventType]) {
        aggregations[contextKey][eventType] = {
          eventType,
          totalQuantity: 0,
          totalCost: 0,
          eventCount: 0
        }
      }

      const agg = aggregations[contextKey][eventType]
      agg.totalQuantity += event.quantity
      agg.totalCost += (event.unit_price || 0) * event.quantity
      agg.eventCount += 1
    }

    console.log(`Aggregated usage for ${Object.keys(aggregations).length} contexts`)
    return aggregations

  } catch (error) {
    console.error('Error aggregating monthly usage:', error)
    throw error
  }
}

async function checkQuotaLimits() {
  console.log('Checking quota limits and generating alerts...')
  
  try {
    const { data: quotas, error } = await supabase
      .from('usage_quotas')
      .select('*')
      .neq('limit_value', -1) // Skip unlimited quotas

    if (error) {
      throw new Error(`Failed to fetch quotas: ${error.message}`)
    }

    let alertsCreated = 0

    for (const quota of quotas || []) {
      const utilizationPercentage = (quota.current_usage / quota.limit_value) * 100

      // Check for quota exceeded (100%+)
      if (utilizationPercentage >= 100) {
        const alertCreated = await createQuotaAlert(quota, 'quota_exceeded', 100)
        if (alertCreated) alertsCreated++
      }
      // Check for quota warning (80%+)
      else if (utilizationPercentage >= 80) {
        const alertCreated = await createQuotaAlert(quota, 'quota_warning', Math.floor(utilizationPercentage))
        if (alertCreated) alertsCreated++
      }
    }

    console.log(`Created ${alertsCreated} quota alerts`)
    return { alertsCreated }

  } catch (error) {
    console.error('Error checking quota limits:', error)
    throw error
  }
}

async function createQuotaAlert(quota: any, alertType: string, thresholdPercentage: number) {
  try {
    // Check if we already have a recent alert for this quota
    const { data: existingAlert, error: alertError } = await supabase
      .from('billing_alerts')
      .select('id')
      .eq(quota.user_id ? 'user_id' : 'organization_id', quota.user_id || quota.organization_id)
      .eq('alert_type', alertType)
      .eq('quota_type', quota.quota_type)
      .gte('triggered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Within last 24 hours
      .single()

    if (!alertError && existingAlert) {
      console.log(`Alert already exists for ${quota.quota_type} ${alertType}`)
      return false
    }

    // Create new alert
    const { error: insertError } = await supabase
      .from('billing_alerts')
      .insert({
        user_id: quota.user_id,
        organization_id: quota.organization_id,
        alert_type: alertType,
        quota_type: quota.quota_type,
        threshold_percentage: thresholdPercentage,
        current_usage: quota.current_usage,
        limit_value: quota.limit_value,
        metadata: {
          utilization_percentage: thresholdPercentage,
          quota_id: quota.id
        }
      })

    if (insertError) {
      console.error('Failed to create alert:', insertError)
      return false
    }

    console.log(`Created ${alertType} alert for ${quota.quota_type}`)
    return true

  } catch (error) {
    console.error('Error creating quota alert:', error)
    return false
  }
}

async function sendBillingAlerts() {
  console.log('Sending billing alert notifications...')
  
  try {
    // Get unacknowledged urgent alerts
    const { data: alerts, error } = await supabase
      .from('billing_alerts')
      .select(`
        *,
        profiles!billing_alerts_user_id_fkey(email, full_name),
        organizations!billing_alerts_organization_id_fkey(name)
      `)
      .eq('acknowledged', false)
      .in('alert_type', ['quota_exceeded', 'payment_failed', 'subscription_expired'])
      .order('triggered_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch alerts: ${error.message}`)
    }

    let emailsSent = 0

    for (const alert of alerts || []) {
      try {
        await sendAlertEmail(alert)
        emailsSent++
      } catch (emailError) {
        console.error(`Failed to send alert email for ${alert.id}:`, emailError)
      }
    }

    console.log(`Sent ${emailsSent} alert emails`)
    return { emailsSent }

  } catch (error) {
    console.error('Error sending billing alerts:', error)
    throw error
  }
}

async function sendAlertEmail(alert: any) {
  // This would integrate with your email service (Resend, etc.)
  // For now, just log the alert
  console.log(`Would send email alert: ${alert.alert_type} for ${alert.quota_type}`)
  
  // Example integration with Resend or other email service:
  /*
  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'billing@yourdomain.com',
      to: alert.profiles?.email || 'admin@yourdomain.com',
      subject: `Billing Alert: ${alert.alert_type.replace('_', ' ')}`,
      html: generateAlertEmailHtml(alert)
    })
  })
  */
}

// Main handler
serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const body: ProcessBillingRequest = await req.json()
    const { action, period, organizationId, userId } = body

    let result: any

    switch (action) {
      case 'process_usage':
        result = await processUsageEvents(period)
        break
        
      case 'aggregate_monthly':
        if (!period) {
          throw new Error('Period is required for monthly aggregation')
        }
        result = await aggregateMonthlyUsage(period)
        break
        
      case 'check_quotas':
        result = await checkQuotaLimits()
        break
        
      case 'send_alerts':
        result = await sendBillingAlerts()
        break
        
      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        result,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Billing processor error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})