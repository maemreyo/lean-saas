// UPDATED: 2025-06-30 - Enhanced Stripe utilities for usage-based billing and metered billing

import { stripe } from './server'
import type { 
  UsageEvent, 
  InvoiceItem, 
  AdvancedPlanConfig,
  UsageEventType,
  QuotaType 
} from '@/shared/types/billing'

// Metered billing configuration
export const METERED_PRICING = {
  api_call: 0.001, // $0.001 per API call
  storage_used: 0.1, // $0.10 per GB
  email_sent: 0.001, // $0.001 per email
  export_generated: 0.05, // $0.05 per export
  backup_created: 0.1, // $0.10 per backup
  custom_domain: 5.0, // $5.00 per domain per month
  advanced_feature: 0.01 // $0.01 per advanced feature usage
} as const

// Usage record management
export const usageRecordUtils = {
  /**
   * Create usage record in Stripe for metered billing
   */
  async createUsageRecord(
    subscriptionItemId: string,
    quantity: number,
    timestamp?: number,
    action: 'increment' | 'set' = 'increment'
  ): Promise<any> {
    try {
      return await stripe.subscriptionItems.createUsageRecord(
        subscriptionItemId,
        {
          quantity,
          timestamp: timestamp || Math.floor(Date.now() / 1000),
          action
        }
      )
    } catch (error) {
      console.error('Failed to create usage record:', error)
      throw new Error(`Usage record creation failed: ${error}`)
    }
  },

  /**
   * Get usage record summaries for a subscription item
   */
  async getUsageRecordSummaries(
    subscriptionItemId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      const params: any = {}
      
      if (startDate) {
        params.starting_after = Math.floor(startDate.getTime() / 1000)
      }
      if (endDate) {
        params.ending_before = Math.floor(endDate.getTime() / 1000)
      }

      return await stripe.subscriptionItems.listUsageRecordSummaries(
        subscriptionItemId,
        params
      )
    } catch (error) {
      console.error('Failed to get usage record summaries:', error)
      throw new Error(`Usage summaries retrieval failed: ${error}`)
    }
  },

  /**
   * Batch create usage records for multiple usage events
   */
  async batchCreateUsageRecords(
    usageEvents: Array<{
      subscriptionItemId: string
      quantity: number
      timestamp?: number
    }>
  ): Promise<Array<{ success: boolean; error?: string }>> {
    const results = await Promise.allSettled(
      usageEvents.map(event =>
        this.createUsageRecord(
          event.subscriptionItemId,
          event.quantity,
          event.timestamp
        )
      )
    )

    return results.map(result => ({
      success: result.status === 'fulfilled',
      error: result.status === 'rejected' ? result.reason?.message : undefined
    }))
  }
}

// Invoice management utilities
export const invoiceUtils = {
  /**
   * Create invoice item for one-time charges
   */
  async createInvoiceItem(
    customerId: string,
    amount: number, // in cents
    description: string,
    metadata?: Record<string, string>
  ): Promise<any> {
    try {
      return await stripe.invoiceItems.create({
        customer: customerId,
        amount,
        currency: 'usd',
        description,
        metadata
      })
    } catch (error) {
      console.error('Failed to create invoice item:', error)
      throw new Error(`Invoice item creation failed: ${error}`)
    }
  },

  /**
   * Create and finalize invoice for immediate payment
   */
  async createAndFinalizeInvoice(
    customerId: string,
    options?: {
      description?: string
      metadata?: Record<string, string>
      autoAdvance?: boolean
      collectionMethod?: 'charge_automatically' | 'send_invoice'
    }
  ): Promise<any> {
    try {
      const invoice = await stripe.invoices.create({
        customer: customerId,
        description: options?.description,
        metadata: options?.metadata,
        auto_advance: options?.autoAdvance ?? true,
        collection_method: options?.collectionMethod ?? 'charge_automatically'
      })

      if (options?.autoAdvance !== false) {
        return await stripe.invoices.finalizeInvoice(invoice.id)
      }

      return invoice
    } catch (error) {
      console.error('Failed to create and finalize invoice:', error)
      throw new Error(`Invoice creation failed: ${error}`)
    }
  },

  /**
   * Get invoice with line items
   */
  async getInvoiceWithLineItems(invoiceId: string): Promise<any> {
    try {
      return await stripe.invoices.retrieve(invoiceId, {
        expand: ['lines.data.price', 'lines.data.price.product']
      })
    } catch (error) {
      console.error('Failed to get invoice:', error)
      throw new Error(`Invoice retrieval failed: ${error}`)
    }
  },

  /**
   * List invoices for customer with pagination
   */
  async listCustomerInvoices(
    customerId: string,
    options?: {
      limit?: number
      startingAfter?: string
      endingBefore?: string
      status?: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
    }
  ): Promise<any> {
    try {
      return await stripe.invoices.list({
        customer: customerId,
        limit: options?.limit ?? 10,
        starting_after: options?.startingAfter,
        ending_before: options?.endingBefore,
        status: options?.status,
        expand: ['data.lines.data.price']
      })
    } catch (error) {
      console.error('Failed to list invoices:', error)
      throw new Error(`Invoice listing failed: ${error}`)
    }
  }
}

// Subscription management for metered billing
export const meteringUtils = {
  /**
   * Create metered subscription with usage-based pricing
   */
  async createMeteredSubscription(
    customerId: string,
    priceId: string,
    usagePriceIds: string[], // For metered components
    options?: {
      trialPeriodDays?: number
      metadata?: Record<string, string>
    }
  ): Promise<any> {
    try {
      const lineItems = [
        { price: priceId }, // Base subscription price
        ...usagePriceIds.map(priceId => ({ price: priceId })) // Metered prices
      ]

      return await stripe.subscriptions.create({
        customer: customerId,
        items: lineItems,
        trial_period_days: options?.trialPeriodDays,
        metadata: options?.metadata,
        expand: ['latest_invoice.payment_intent']
      })
    } catch (error) {
      console.error('Failed to create metered subscription:', error)
      throw new Error(`Metered subscription creation failed: ${error}`)
    }
  },

  /**
   * Update subscription with metered usage
   */
  async updateSubscriptionMetering(
    subscriptionId: string,
    usageUpdates: Array<{
      subscriptionItemId: string
      quantity: number
      eventType: UsageEventType
    }>
  ): Promise<any> {
    try {
      const results = await Promise.allSettled(
        usageUpdates.map(update =>
          usageRecordUtils.createUsageRecord(
            update.subscriptionItemId,
            update.quantity
          )
        )
      )

      return {
        subscriptionId,
        usageRecords: results.map((result, index) => ({
          eventType: usageUpdates[index].eventType,
          quantity: usageUpdates[index].quantity,
          success: result.status === 'fulfilled',
          error: result.status === 'rejected' ? result.reason?.message : undefined
        }))
      }
    } catch (error) {
      console.error('Failed to update subscription metering:', error)
      throw new Error(`Subscription metering update failed: ${error}`)
    }
  },

  /**
   * Get subscription items for metered billing
   */
  async getSubscriptionItems(subscriptionId: string): Promise<any> {
    try {
      return await stripe.subscriptionItems.list({
        subscription: subscriptionId,
        expand: ['data.price']
      })
    } catch (error) {
      console.error('Failed to get subscription items:', error)
      throw new Error(`Subscription items retrieval failed: ${error}`)
    }
  }
}

// Payment failure handling
export const paymentFailureUtils = {
  /**
   * Handle payment failure with retry logic
   */
  async handlePaymentFailure(
    subscriptionId: string,
    invoiceId: string,
    retryCount: number = 0
  ): Promise<{ retryScheduled: boolean; nextRetryAt?: Date }> {
    try {
      const maxRetries = 3
      const retryDelays = [1, 3, 7] // days

      if (retryCount >= maxRetries) {
        // Cancel subscription after max retries
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            payment_failed: 'true',
            failed_at: new Date().toISOString()
          }
        })

        return { retryScheduled: false }
      }

      // Schedule next retry
      const nextRetryAt = new Date()
      nextRetryAt.setDate(nextRetryAt.getDate() + retryDelays[retryCount])

      // Update invoice with retry information
      await stripe.invoices.update(invoiceId, {
        metadata: {
          retry_count: (retryCount + 1).toString(),
          next_retry_at: nextRetryAt.toISOString()
        }
      })

      return {
        retryScheduled: true,
        nextRetryAt
      }
    } catch (error) {
      console.error('Failed to handle payment failure:', error)
      throw new Error(`Payment failure handling failed: ${error}`)
    }
  },

  /**
   * Retry failed payment
   */
  async retryFailedPayment(invoiceId: string): Promise<any> {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId)
      
      if (invoice.status !== 'open') {
        throw new Error('Invoice is not in retryable state')
      }

      return await stripe.invoices.pay(invoiceId)
    } catch (error) {
      console.error('Failed to retry payment:', error)
      throw new Error(`Payment retry failed: ${error}`)
    }
  }
}

// Billing analytics utilities
export const billingAnalyticsUtils = {
  /**
   * Calculate usage-based costs
   */
  calculateUsageCosts(
    usageEvents: UsageEvent[],
    pricingConfig: Record<UsageEventType, number>
  ): {
    totalCost: number
    costByType: Record<UsageEventType, number>
    totalUsage: Record<UsageEventType, number>
  } {
    const costByType: Record<string, number> = {}
    const totalUsage: Record<string, number> = {}

    for (const event of usageEvents) {
      const eventType = event.event_type
      const quantity = event.quantity
      const unitPrice = event.unit_price ?? pricingConfig[eventType] ?? 0

      costByType[eventType] = (costByType[eventType] ?? 0) + (quantity * unitPrice)
      totalUsage[eventType] = (totalUsage[eventType] ?? 0) + quantity
    }

    const totalCost = Object.values(costByType).reduce((sum, cost) => sum + cost, 0)

    return {
      totalCost,
      costByType: costByType as Record<UsageEventType, number>,
      totalUsage: totalUsage as Record<UsageEventType, number>
    }
  },

  /**
   * Project usage costs for billing period
   */
  projectUsageCosts(
    currentUsage: Record<UsageEventType, number>,
    periodDays: number,
    elapsedDays: number,
    pricingConfig: Record<UsageEventType, number>
  ): {
    projectedUsage: Record<UsageEventType, number>
    projectedCosts: Record<UsageEventType, number>
    totalProjectedCost: number
  } {
    const projectedUsage: Record<string, number> = {}
    const projectedCosts: Record<string, number> = {}

    const projectionMultiplier = periodDays / elapsedDays

    for (const [eventType, usage] of Object.entries(currentUsage)) {
      const projected = Math.ceil(usage * projectionMultiplier)
      const cost = projected * (pricingConfig[eventType as UsageEventType] ?? 0)

      projectedUsage[eventType] = projected
      projectedCosts[eventType] = cost
    }

    const totalProjectedCost = Object.values(projectedCosts).reduce((sum, cost) => sum + cost, 0)

    return {
      projectedUsage: projectedUsage as Record<UsageEventType, number>,
      projectedCosts: projectedCosts as Record<UsageEventType, number>,
      totalProjectedCost
    }
  }
}

// Export all utilities
export const advancedStripeUtils = {
  usageRecord: usageRecordUtils,
  invoice: invoiceUtils,
  metering: meteringUtils,
  paymentFailure: paymentFailureUtils,
  analytics: billingAnalyticsUtils,
  METERED_PRICING
} as const