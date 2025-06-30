// UPDATED: 2025-06-30 - Created Stripe webhook handler for billing events

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

interface StripeEvent {
  id: string
  object: 'event'
  type: string
  data: {
    object: any
  }
  created: number
  livemode: boolean
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')

async function verifyStripeSignature(body: string, signature: string): Promise<boolean> {
  if (!STRIPE_WEBHOOK_SECRET || !signature) {
    console.warn('Missing webhook secret or signature')
    return false
  }

  try {
    // In a real implementation, you would verify the signature using Stripe's method
    // For now, we'll just check if the signature exists
    return signature.startsWith('t=')
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}

async function handleSubscriptionEvent(event: StripeEvent) {
  const subscription = event.data.object
  
  console.log(`Handling subscription event: ${event.type}`)
  
  try {
    // Find the customer in our database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer)
      .single()

    if (profileError || !profile) {
      console.error('Customer not found:', subscription.customer)
      return
    }

    // Handle different subscription events
    switch (event.type) {
      case 'customer.subscription.created':
        await createSubscriptionRecord(subscription, profile.id)
        break
        
      case 'customer.subscription.updated':
        await updateSubscriptionRecord(subscription, profile.id)
        break
        
      case 'customer.subscription.deleted':
        await cancelSubscriptionRecord(subscription, profile.id)
        break
        
      case 'invoice.payment_succeeded':
        await handleSuccessfulPayment(subscription, event.data.object)
        break
        
      case 'invoice.payment_failed':
        await handleFailedPayment(subscription, event.data.object, profile.id)
        break
    }
    
  } catch (error) {
    console.error(`Error handling ${event.type}:`, error)
    throw error
  }
}

async function createSubscriptionRecord(subscription: any, userId: string) {
  console.log('Creating subscription record:', subscription.id)
  
  const { error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0]?.price?.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end
    })

  if (error) {
    console.error('Failed to create subscription:', error)
    throw error
  }

  // Initialize default quotas for the user
  await initializeUserQuotas(userId)
}

async function updateSubscriptionRecord(subscription: any, userId: string) {
  console.log('Updating subscription record:', subscription.id)
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      stripe_price_id: subscription.items.data[0]?.price?.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Failed to update subscription:', error)
    throw error
  }

  // Update user quotas based on new plan
  await updateUserQuotas(userId, subscription.items.data[0]?.price?.id)
}

async function cancelSubscriptionRecord(subscription: any, userId: string) {
  console.log('Canceling subscription record:', subscription.id)
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Failed to cancel subscription:', error)
    throw error
  }

  // Create subscription expired alert
  await createSubscriptionAlert(userId, 'subscription_expired', {
    subscription_id: subscription.id,
    canceled_at: new Date().toISOString()
  })
}

async function handleSuccessfulPayment(subscription: any, invoice: any) {
  console.log('Handling successful payment for invoice:', invoice.id)
  
  try {
    // Mark any payment failures as resolved
    const { error } = await supabase
      .from('payment_failures')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_invoice_id', invoice.id)
      .eq('resolved', false)

    if (error) {
      console.error('Failed to resolve payment failures:', error)
    }

    // Store invoice line items
    await storeInvoiceLineItems(invoice)

  } catch (error) {
    console.error('Error handling successful payment:', error)
  }
}

async function handleFailedPayment(subscription: any, invoice: any, userId: string) {
  console.log('Handling failed payment for invoice:', invoice.id)
  
  try {
    // Get subscription record
    const { data: subRecord, error: subError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (subError || !subRecord) {
      console.error('Subscription record not found')
      return
    }

    // Create payment failure record
    const { error: failureError } = await supabase
      .from('payment_failures')
      .insert({
        subscription_id: subRecord.id,
        stripe_invoice_id: invoice.id,
        failure_reason: invoice.last_payment_error?.message || 'Payment failed',
        retry_count: invoice.attempt_count || 1,
        next_retry_at: invoice.next_payment_attempt 
          ? new Date(invoice.next_payment_attempt * 1000).toISOString()
          : null
      })

    if (failureError) {
      console.error('Failed to create payment failure record:', failureError)
    }

    // Create payment failed alert
    await createSubscriptionAlert(userId, 'payment_failed', {
      invoice_id: invoice.id,
      amount_due: invoice.amount_due,
      attempt_count: invoice.attempt_count
    })

  } catch (error) {
    console.error('Error handling failed payment:', error)
  }
}

async function storeInvoiceLineItems(invoice: any) {
  try {
    // Get subscription record
    const { data: subRecord, error: subError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', invoice.subscription)
      .single()

    if (subError || !subRecord) {
      console.error('Subscription record not found for invoice items')
      return
    }

    // Process each line item
    for (const lineItem of invoice.lines.data) {
      const { error: itemError } = await supabase
        .from('invoice_items')
        .insert({
          subscription_id: subRecord.id,
          stripe_invoice_item_id: lineItem.id,
          description: lineItem.description || 'Subscription charge',
          amount: lineItem.amount,
          quantity: lineItem.quantity || 1,
          unit_price: lineItem.amount / (lineItem.quantity || 1),
          period_start: new Date(lineItem.period.start * 1000).toISOString(),
          period_end: new Date(lineItem.period.end * 1000).toISOString(),
          metadata: lineItem.metadata || {}
        })

      if (itemError) {
        console.error('Failed to store invoice line item:', itemError)
      }
    }

  } catch (error) {
    console.error('Error storing invoice line items:', error)
  }
}

async function initializeUserQuotas(userId: string) {
  console.log('Initializing default quotas for user:', userId)
  
  const defaultQuotas = [
    { quota_type: 'api_calls', limit_value: 10000 },
    { quota_type: 'storage_gb', limit_value: 5 },
    { quota_type: 'projects', limit_value: 10 },
    { quota_type: 'team_members', limit_value: 5 },
    { quota_type: 'email_sends', limit_value: 1000 },
    { quota_type: 'exports', limit_value: 50 },
    { quota_type: 'backups', limit_value: 10 },
    { quota_type: 'custom_domains', limit_value: 1 }
  ]

  for (const quota of defaultQuotas) {
    const { error } = await supabase
      .from('usage_quotas')
      .upsert({
        user_id: userId,
        ...quota,
        current_usage: 0,
        reset_period: 'monthly'
      }, {
        onConflict: 'user_id,quota_type'
      })

    if (error) {
      console.error(`Failed to initialize quota ${quota.quota_type}:`, error)
    }
  }
}

async function updateUserQuotas(userId: string, priceId: string) {
  console.log('Updating user quotas based on price:', priceId)
  
  // Map price IDs to quota limits (this would be configured based on your plans)
  const quotaUpdates = getPlanQuotaLimits(priceId)
  
  for (const [quotaType, limitValue] of Object.entries(quotaUpdates)) {
    const { error } = await supabase
      .from('usage_quotas')
      .update({
        limit_value: limitValue,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('quota_type', quotaType)

    if (error) {
      console.error(`Failed to update quota ${quotaType}:`, error)
    }
  }
}

function getPlanQuotaLimits(priceId: string): Record<string, number> {
  // This would map your Stripe price IDs to quota limits
  // Example mapping:
  const planLimits: Record<string, Record<string, number>> = {
    'price_1234567890': { // Free plan
      api_calls: 1000,
      storage_gb: 1,
      projects: 3,
      team_members: 1,
      email_sends: 100,
      exports: 5,
      backups: 1,
      custom_domains: 0
    },
    'price_0987654321': { // Pro plan
      api_calls: 50000,
      storage_gb: 100,
      projects: -1, // unlimited
      team_members: 10,
      email_sends: 10000,
      exports: 100,
      backups: 50,
      custom_domains: 5
    }
    // Add more plans as needed
  }

  return planLimits[priceId] || {}
}

async function createSubscriptionAlert(userId: string, alertType: string, metadata: any) {
  try {
    const { error } = await supabase
      .from('billing_alerts')
      .insert({
        user_id: userId,
        alert_type: alertType,
        metadata
      })

    if (error) {
      console.error('Failed to create subscription alert:', error)
    }
  } catch (error) {
    console.error('Error creating subscription alert:', error)
  }
}

// Main handler
serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    // Verify webhook signature
    if (!await verifyStripeSignature(body, signature || '')) {
      console.error('Invalid webhook signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const event: StripeEvent = JSON.parse(body)
    
    console.log(`Received Stripe webhook: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        await handleSubscriptionEvent(event)
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Webhook processing failed',
        message: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})