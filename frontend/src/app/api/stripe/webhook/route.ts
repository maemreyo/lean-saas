// UPDATED: 2025-06-30 - Enhanced Stripe webhook handler with advanced billing events

import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

// Webhook event types we handle
const HANDLED_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated', 
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.finalized',
  'customer.created',
  'customer.updated',
  'payment_method.attached'
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')

    if (!signature) {
      console.error('No Stripe signature found')
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log(`Received Stripe webhook: ${event.type}`)

    // Only process events we care about
    if (!HANDLED_EVENTS.includes(event.type)) {
      console.log(`Ignoring unhandled event type: ${event.type}`)
      return NextResponse.json({ received: true })
    }

    // Process the event
    await processWebhookEvent(event)

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function processWebhookEvent(event: any) {
  const supabase = createClient()
  
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object, supabase)
        break
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, supabase)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, supabase)
        break
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object, supabase)
        break
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object, supabase)
        break
        
      case 'invoice.finalized':
        await handleInvoiceFinalized(event.data.object, supabase)
        break
        
      case 'customer.created':
        await handleCustomerCreated(event.data.object, supabase)
        break
        
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object, supabase)
        break
        
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object, supabase)
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error(`Error processing ${event.type}:`, error)
    throw error
  }
}

async function handleSubscriptionCreated(subscription: any, supabase: any) {
  console.log('Processing subscription created:', subscription.id)
  
  try {
    // Find the customer in our database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, plan_type')
      .eq('stripe_customer_id', subscription.customer)
      .single()

    if (profileError || !profile) {
      console.error('Customer not found for subscription:', subscription.customer)
      return
    }

    // Create subscription record
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: profile.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: subscription.items.data[0]?.price?.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false
      })

    if (subscriptionError) {
      console.error('Failed to create subscription record:', subscriptionError)
      throw subscriptionError
    }

    // Update user's plan type based on subscription
    const planType = mapPriceIdToPlanType(subscription.items.data[0]?.price?.id)
    if (planType && planType !== profile.plan_type) {
      await supabase
        .from('profiles')
        .update({ plan_type: planType })
        .eq('id', profile.id)
    }

    // Initialize or update user quotas
    await initializeUserQuotas(profile.id, planType, supabase)

    console.log(`Subscription created successfully for user ${profile.id}`)

  } catch (error) {
    console.error('Error handling subscription created:', error)
    throw error
  }
}

async function handleSubscriptionUpdated(subscription: any, supabase: any) {
  console.log('Processing subscription updated:', subscription.id)
  
  try {
    // Update subscription record
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        stripe_price_id: subscription.items.data[0]?.price?.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    if (updateError) {
      console.error('Failed to update subscription:', updateError)
      throw updateError
    }

    // Get user and update plan type
    const { data: subscriptionRecord, error: fetchError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (!fetchError && subscriptionRecord) {
      const planType = mapPriceIdToPlanType(subscription.items.data[0]?.price?.id)
      if (planType) {
        await supabase
          .from('profiles')
          .update({ plan_type: planType })
          .eq('id', subscriptionRecord.user_id)

        // Update user quotas for new plan
        await updateUserQuotasForPlan(subscriptionRecord.user_id, planType, supabase)
      }
    }

    console.log(`Subscription updated successfully: ${subscription.id}`)

  } catch (error) {
    console.error('Error handling subscription updated:', error)
    throw error
  }
}

async function handleSubscriptionDeleted(subscription: any, supabase: any) {
  console.log('Processing subscription deleted:', subscription.id)
  
  try {
    // Update subscription status to canceled
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    if (updateError) {
      console.error('Failed to update canceled subscription:', updateError)
    }

    // Get user and downgrade to free plan
    const { data: subscriptionRecord, error: fetchError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (!fetchError && subscriptionRecord) {
      // Downgrade to free plan
      await supabase
        .from('profiles')
        .update({ plan_type: 'free' })
        .eq('id', subscriptionRecord.user_id)

      // Update quotas to free plan limits
      await updateUserQuotasForPlan(subscriptionRecord.user_id, 'free', supabase)

      // Create subscription expired alert
      await createBillingAlert(subscriptionRecord.user_id, 'subscription_expired', {
        subscription_id: subscription.id,
        canceled_at: new Date().toISOString()
      }, supabase)
    }

    console.log(`Subscription canceled successfully: ${subscription.id}`)

  } catch (error) {
    console.error('Error handling subscription deleted:', error)
    throw error
  }
}

async function handlePaymentSucceeded(invoice: any, supabase: any) {
  console.log('Processing payment succeeded:', invoice.id)
  
  try {
    // Mark any payment failures as resolved
    if (invoice.subscription) {
      const { data: subscriptionRecord } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('stripe_subscription_id', invoice.subscription)
        .single()

      if (subscriptionRecord) {
        await supabase
          .from('payment_failures')
          .update({
            resolved: true,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('subscription_id', subscriptionRecord.id)
          .eq('resolved', false)
      }
    }

    // Store invoice line items for usage billing
    await storeInvoiceLineItems(invoice, supabase)

    console.log(`Payment succeeded processed: ${invoice.id}`)

  } catch (error) {
    console.error('Error handling payment succeeded:', error)
    throw error
  }
}

async function handlePaymentFailed(invoice: any, supabase: any) {
  console.log('Processing payment failed:', invoice.id)
  
  try {
    if (!invoice.subscription) {
      console.log('Payment failure for non-subscription invoice, skipping')
      return
    }

    // Get subscription record
    const { data: subscriptionRecord, error: subError } = await supabase
      .from('subscriptions')
      .select('id, user_id')
      .eq('stripe_subscription_id', invoice.subscription)
      .single()

    if (subError || !subscriptionRecord) {
      console.error('Subscription not found for failed payment')
      return
    }

    // Create payment failure record
    await supabase
      .from('payment_failures')
      .insert({
        subscription_id: subscriptionRecord.id,
        stripe_invoice_id: invoice.id,
        failure_reason: invoice.last_payment_error?.message || 'Payment failed',
        retry_count: invoice.attempt_count || 1,
        next_retry_at: invoice.next_payment_attempt 
          ? new Date(invoice.next_payment_attempt * 1000).toISOString()
          : null
      })

    // Create payment failed alert
    await createBillingAlert(subscriptionRecord.user_id, 'payment_failed', {
      invoice_id: invoice.id,
      amount_due: invoice.amount_due,
      attempt_count: invoice.attempt_count || 1,
      failure_reason: invoice.last_payment_error?.message
    }, supabase)

    console.log(`Payment failure processed: ${invoice.id}`)

  } catch (error) {
    console.error('Error handling payment failed:', error)
    throw error
  }
}

async function handleInvoiceFinalized(invoice: any, supabase: any) {
  console.log('Processing invoice finalized:', invoice.id)
  
  try {
    // Store invoice details if needed
    await storeInvoiceLineItems(invoice, supabase)

    console.log(`Invoice finalized processed: ${invoice.id}`)

  } catch (error) {
    console.error('Error handling invoice finalized:', error)
    throw error
  }
}

async function handleCustomerCreated(customer: any, supabase: any) {
  console.log('Processing customer created:', customer.id)
  
  try {
    // Update user profile with Stripe customer ID if email matches
    if (customer.email) {
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('email', customer.email)
    }

    console.log(`Customer created processed: ${customer.id}`)

  } catch (error) {
    console.error('Error handling customer created:', error)
    throw error
  }
}

async function handleCustomerUpdated(customer: any, supabase: any) {
  console.log('Processing customer updated:', customer.id)
  
  try {
    // Update customer information in profiles if needed
    const updates: any = {}
    
    if (customer.name) {
      updates.full_name = customer.name
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('profiles')
        .update(updates)
        .eq('stripe_customer_id', customer.id)
    }

    console.log(`Customer updated processed: ${customer.id}`)

  } catch (error) {
    console.error('Error handling customer updated:', error)
    throw error
  }
}

async function handlePaymentMethodAttached(paymentMethod: any, supabase: any) {
  console.log('Processing payment method attached:', paymentMethod.id)
  
  try {
    // Could store payment method details if needed
    // For now, just log it
    console.log(`Payment method attached: ${paymentMethod.id} to customer ${paymentMethod.customer}`)

  } catch (error) {
    console.error('Error handling payment method attached:', error)
    throw error
  }
}

// Helper functions

function mapPriceIdToPlanType(priceId: string): string | null {
  // Map your Stripe price IDs to plan types
  const priceMapping: Record<string, string> = {
    // Add your actual Stripe price IDs here
    'price_free': 'free',
    'price_pro_monthly': 'pro',
    'price_pro_yearly': 'pro',
    'price_enterprise_monthly': 'enterprise',
    'price_enterprise_yearly': 'enterprise'
  }

  return priceMapping[priceId] || null
}

async function initializeUserQuotas(userId: string, planType: string, supabase: any) {
  const quotaLimits = getPlanQuotaLimits(planType)
  
  for (const [quotaType, limitValue] of Object.entries(quotaLimits)) {
    await supabase
      .from('usage_quotas')
      .upsert({
        user_id: userId,
        quota_type: quotaType,
        limit_value: limitValue,
        current_usage: 0,
        reset_period: 'monthly'
      }, {
        onConflict: 'user_id,quota_type'
      })
  }
}

async function updateUserQuotasForPlan(userId: string, planType: string, supabase: any) {
  const quotaLimits = getPlanQuotaLimits(planType)
  
  for (const [quotaType, limitValue] of Object.entries(quotaLimits)) {
    await supabase
      .from('usage_quotas')
      .update({
        limit_value: limitValue,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('quota_type', quotaType)
  }
}

function getPlanQuotaLimits(planType: string): Record<string, number> {
  const planLimits: Record<string, Record<string, number>> = {
    free: {
      api_calls: 1000,
      storage_gb: 1,
      projects: 3,
      team_members: 1,
      email_sends: 100,
      exports: 5,
      backups: 1,
      custom_domains: 0
    },
    pro: {
      api_calls: 50000,
      storage_gb: 100,
      projects: -1, // unlimited
      team_members: 10,
      email_sends: 10000,
      exports: 100,
      backups: 50,
      custom_domains: 5
    },
    enterprise: {
      api_calls: -1, // unlimited
      storage_gb: 1000,
      projects: -1, // unlimited
      team_members: 50,
      email_sends: 100000,
      exports: -1, // unlimited
      backups: -1, // unlimited
      custom_domains: 10
    }
  }

  return planLimits[planType] || planLimits.free
}

async function storeInvoiceLineItems(invoice: any, supabase: any) {
  if (!invoice.subscription) return

  // Get subscription record
  const { data: subscriptionRecord, error: subError } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', invoice.subscription)
    .single()

  if (subError || !subscriptionRecord) {
    console.error('Subscription not found for invoice items')
    return
  }

  // Process each line item
  for (const lineItem of invoice.lines.data) {
    try {
      await supabase
        .from('invoice_items')
        .upsert({
          subscription_id: subscriptionRecord.id,
          stripe_invoice_item_id: lineItem.id,
          description: lineItem.description || 'Subscription charge',
          amount: lineItem.amount,
          quantity: lineItem.quantity || 1,
          unit_price: lineItem.amount / (lineItem.quantity || 1),
          period_start: new Date(lineItem.period.start * 1000).toISOString(),
          period_end: new Date(lineItem.period.end * 1000).toISOString(),
          metadata: lineItem.metadata || {}
        }, {
          onConflict: 'stripe_invoice_item_id'
        })
    } catch (error) {
      console.error('Failed to store invoice line item:', error)
    }
  }
}

async function createBillingAlert(userId: string, alertType: string, metadata: any, supabase: any) {
  try {
    await supabase
      .from('billing_alerts')
      .insert({
        user_id: userId,
        alert_type: alertType,
        metadata
      })
  } catch (error) {
    console.error('Failed to create billing alert:', error)
  }
}