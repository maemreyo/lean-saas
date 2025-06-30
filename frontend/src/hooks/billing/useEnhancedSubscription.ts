// UPDATED: 2025-06-30 - Enhanced subscription hook with advanced billing features

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { useSubscription } from './useSubscription'
import { createClient } from '@/lib/supabase/client'
import type { 
  Subscription,
  InvoiceItem,
  PaymentFailure,
  BillingDashboardData,
  AdvancedPlanConfig
} from '@/shared/types/billing'

interface UseEnhancedSubscriptionOptions {
  organizationId?: string
  includeInvoiceItems?: boolean
  includePaymentFailures?: boolean
}

export function useEnhancedSubscription(options: UseEnhancedSubscriptionOptions = {}) {
  const { user } = useAuth()
  const { organizationId, includeInvoiceItems = true, includePaymentFailures = true } = options
  
  // Use existing subscription hook as base
  const {
    subscription: baseSubscription,
    loading: baseLoading,
    error: baseError,
    createCheckoutSession,
    createPortalSession
  } = useSubscription()

  // Additional state for enhanced features
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
  const [paymentFailures, setPaymentFailures] = useState<PaymentFailure[]>([])
  const [nextInvoice, setNextInvoice] = useState<any>(null)
  const [dashboardData, setDashboardData] = useState<BillingDashboardData | null>(null)
  const [enhancedLoading, setEnhancedLoading] = useState(false)
  const [enhancedError, setEnhancedError] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch invoice items
  const fetchInvoiceItems = useCallback(async () => {
    if (!user || !baseSubscription) return

    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('subscription_id', baseSubscription.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setInvoiceItems(data || [])
    } catch (err) {
      console.error('Failed to fetch invoice items:', err)
      setEnhancedError(err instanceof Error ? err.message : 'Failed to fetch invoice items')
    }
  }, [user, baseSubscription, supabase])

  // Fetch payment failures
  const fetchPaymentFailures = useCallback(async () => {
    if (!user || !baseSubscription) return

    try {
      const { data, error } = await supabase
        .from('payment_failures')
        .select('*')
        .eq('subscription_id', baseSubscription.id)
        .eq('resolved', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPaymentFailures(data || [])
    } catch (err) {
      console.error('Failed to fetch payment failures:', err)
      setEnhancedError(err instanceof Error ? err.message : 'Failed to fetch payment failures')
    }
  }, [user, baseSubscription, supabase])

  // Fetch next invoice preview
  const fetchNextInvoice = useCallback(async () => {
    if (!user || !baseSubscription) return

    try {
      const response = await fetch('/api/billing/invoice/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: baseSubscription.stripe_subscription_id
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch invoice preview')
      
      const invoiceData = await response.json()
      setNextInvoice(invoiceData)
    } catch (err) {
      console.error('Failed to fetch next invoice:', err)
      setEnhancedError(err instanceof Error ? err.message : 'Failed to fetch next invoice')
    }
  }, [user, baseSubscription])

  // Create metered subscription
  const createMeteredSubscription = useCallback(async (
    priceId: string,
    usagePriceIds: string[] = [],
    options?: {
      trialPeriodDays?: number
      metadata?: Record<string, string>
    }
  ) => {
    try {
      const response = await fetch('/api/billing/subscription/create-metered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          usagePriceIds,
          organizationId,
          ...options
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create metered subscription')
      }

      const result = await response.json()
      
      // Redirect to checkout if needed
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      }

      return result
    } catch (err) {
      console.error('Failed to create metered subscription:', err)
      throw err
    }
  }, [organizationId])

  // Update subscription with usage-based pricing
  const updateToMeteredBilling = useCallback(async (
    usagePriceIds: string[]
  ) => {
    try {
      const response = await fetch('/api/billing/subscription/update-metered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: baseSubscription?.stripe_subscription_id,
          usagePriceIds
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update to metered billing')
      }

      return await response.json()
    } catch (err) {
      console.error('Failed to update to metered billing:', err)
      throw err
    }
  }, [baseSubscription])

  // Create one-time invoice item
  const createInvoiceItem = useCallback(async (
    description: string,
    amount: number, // in cents
    metadata?: Record<string, string>
  ) => {
    try {
      const response = await fetch('/api/billing/invoice/create-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: baseSubscription?.id,
          description,
          amount,
          metadata
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create invoice item')
      }

      const newItem = await response.json()
      setInvoiceItems(prev => [newItem, ...prev])
      
      return newItem
    } catch (err) {
      console.error('Failed to create invoice item:', err)
      throw err
    }
  }, [baseSubscription])

  // Retry failed payment
  const retryFailedPayment = useCallback(async (paymentFailureId: string) => {
    try {
      const response = await fetch('/api/billing/payment/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentFailureId
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to retry payment')
      }

      const result = await response.json()
      
      // Update payment failures list
      if (result.success) {
        setPaymentFailures(prev => 
          prev.filter(failure => failure.id !== paymentFailureId)
        )
      }

      return result
    } catch (err) {
      console.error('Failed to retry payment:', err)
      throw err
    }
  }, [])

  // Get subscription status info
  const getSubscriptionStatus = useCallback(() => {
    if (!baseSubscription) return null

    const isActive = baseSubscription.status === 'active'
    const isPastDue = baseSubscription.status === 'past_due'
    const isCanceled = baseSubscription.status === 'canceled'
    const isTrialing = baseSubscription.status === 'trialing'
    const willCancelAtPeriodEnd = baseSubscription.cancel_at_period_end

    return {
      isActive,
      isPastDue,
      isCanceled,
      isTrialing,
      willCancelAtPeriodEnd,
      hasPaymentIssues: paymentFailures.length > 0,
      daysUntilRenewal: baseSubscription.current_period_end 
        ? Math.ceil((new Date(baseSubscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null
    }
  }, [baseSubscription, paymentFailures])

  // Calculate total monthly cost including usage
  const calculateMonthlyUsageCost = useCallback(() => {
    if (!invoiceItems.length) return 0

    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    return invoiceItems
      .filter(item => new Date(item.created_at) >= currentMonth)
      .reduce((total, item) => total + item.amount, 0)
  }, [invoiceItems])

  // Load enhanced data
  const loadEnhancedData = useCallback(async () => {
    if (!user || !baseSubscription) return

    setEnhancedLoading(true)
    setEnhancedError(null)

    try {
      const promises = []

      if (includeInvoiceItems) {
        promises.push(fetchInvoiceItems())
      }

      if (includePaymentFailures) {
        promises.push(fetchPaymentFailures())
      }

      promises.push(fetchNextInvoice())

      await Promise.all(promises)
    } catch (err) {
      console.error('Failed to load enhanced billing data:', err)
      setEnhancedError(err instanceof Error ? err.message : 'Failed to load billing data')
    } finally {
      setEnhancedLoading(false)
    }
  }, [
    user, 
    baseSubscription, 
    includeInvoiceItems, 
    includePaymentFailures,
    fetchInvoiceItems,
    fetchPaymentFailures,
    fetchNextInvoice
  ])

  // Load data when subscription is available
  useEffect(() => {
    if (baseSubscription && user) {
      loadEnhancedData()
    }
  }, [baseSubscription, user, loadEnhancedData])

  // Calculate dashboard data
  useEffect(() => {
    if (baseSubscription && user) {
      const status = getSubscriptionStatus()
      const monthlyUsageCost = calculateMonthlyUsageCost()

      setDashboardData({
        currentSubscription: baseSubscription,
        nextInvoice: nextInvoice ? {
          amount: nextInvoice.amount_due || 0,
          date: nextInvoice.period_end ? new Date(nextInvoice.period_end * 1000).toISOString() : '',
          items: invoiceItems.slice(0, 10) // Latest 10 items
        } : null,
        usageAnalytics: {
          totalUsage: monthlyUsageCost,
          usageByType: {},
          usageTrend: [],
          projectedCost: monthlyUsageCost,
          currentPeriodUsage: monthlyUsageCost,
          previousPeriodUsage: 0,
          quotaUtilization: {}
        },
        activeAlerts: [],
        paymentFailures,
        quotas: []
      })
    }
  }, [baseSubscription, user, nextInvoice, invoiceItems, paymentFailures, getSubscriptionStatus, calculateMonthlyUsageCost])

  return {
    // Base subscription data
    subscription: baseSubscription,
    loading: baseLoading || enhancedLoading,
    error: baseError || enhancedError,

    // Enhanced data
    invoiceItems,
    paymentFailures,
    nextInvoice,
    dashboardData,

    // Base actions
    createCheckoutSession,
    createPortalSession,

    // Enhanced actions
    createMeteredSubscription,
    updateToMeteredBilling,
    createInvoiceItem,
    retryFailedPayment,
    refreshData: loadEnhancedData,

    // Status helpers
    status: getSubscriptionStatus(),
    monthlyUsageCost: calculateMonthlyUsageCost(),
    
    // Convenience flags
    hasActiveSubscription: baseSubscription?.status === 'active',
    hasPaymentIssues: paymentFailures.length > 0,
    willCancelAtPeriodEnd: baseSubscription?.cancel_at_period_end || false,
    isTrialing: baseSubscription?.status === 'trialing',
    needsAttention: (baseSubscription?.status === 'past_due') || paymentFailures.length > 0
  }
}