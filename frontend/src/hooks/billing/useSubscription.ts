// hooks/billing/useSubscription.ts
'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/auth/useAuth'
import { useEffect, useState } from 'react'

interface Subscription {
  id: string
  stripe_subscription_id: string
  stripe_price_id: string
  status: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
}

export function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    
    const fetchSubscription = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()
          
        if (error && error.code !== 'PGRST116') {
          setError(error.message)
        } else {
          setSubscription(data)
        }
      } catch (err) {
        setError('Failed to fetch subscription')
      } finally {
        setLoading(false)
      }
    }
    
    fetchSubscription()
  }, [user, supabase])
  
  const createCheckoutSession = async (priceId: string) => {
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      })
      
      const { url } = await response.json()
      
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      console.error('Error creating checkout session:', err)
      throw err
    }
  }
  
  const createPortalSession = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })
      
      const { url } = await response.json()
      
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      console.error('Error creating portal session:', err)
      throw err
    }
  }
  
  return {
    subscription,
    loading,
    error,
    createCheckoutSession,
    createPortalSession,
  }
}
