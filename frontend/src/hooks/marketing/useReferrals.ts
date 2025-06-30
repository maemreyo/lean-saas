// Referrals React Hook for Marketing & Growth Module
// Following patterns from billing module hooks

import { useState, useEffect, useCallback } from 'react'
import { 
  ReferralCode, 
  ReferralConversion,
  ReferralAnalytics,
  CreateReferralCodeRequest, 
  UpdateReferralCodeRequest,
  TrackReferralRequest
} from '@/types/marketing'
import { referralUtils } from '@/lib/marketing/referrals'
import { useToast } from '@/hooks/ui/use-toast'

// ================================================
// REFERRAL CODES MANAGEMENT HOOK
// ================================================

export function useReferralCodes(options: {
  organizationId?: string
  userId?: string
}) {
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0
  })
  const { toast } = useToast()

  // Fetch referral codes
  const fetchReferralCodes = useCallback(async (fetchOptions?: {
    active?: boolean
    limit?: number
    offset?: number
  }) => {
    setLoading(true)
    setError(null)

    try {
      const { data, count, error } = await referralUtils.list({
        organizationId: options.organizationId,
        userId: options.userId,
        active: fetchOptions?.active,
        limit: fetchOptions?.limit || pagination.limit,
        offset: fetchOptions?.offset || pagination.offset
      })

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch referral codes',
          variant: 'destructive'
        })
        return
      }

      setReferralCodes(data || [])
      setPagination(prev => ({
        ...prev,
        total: count || 0,
        limit: fetchOptions?.limit || prev.limit,
        offset: fetchOptions?.offset || prev.offset
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [options.organizationId, options.userId, pagination.limit, pagination.offset, toast])

  // Create referral code
  const createReferralCode = useCallback(async (data: CreateReferralCodeRequest) => {
    setLoading(true)
    setError(null)

    try {
      const { data: referralCode, error } = await referralUtils.create(data)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to create referral code',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Add to local state
      if (referralCode) {
        setReferralCodes(prev => [referralCode, ...prev])
        toast({
          title: 'Success',
          description: 'Referral code created successfully'
        })
      }

      return { success: true, data: referralCode }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Update referral code
  const updateReferralCode = useCallback(async (
    id: string, 
    data: UpdateReferralCodeRequest
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { data: updatedCode, error } = await referralUtils.update(id, data)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to update referral code',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Update local state
      if (updatedCode) {
        setReferralCodes(prev => 
          prev.map(code => code.id === id ? updatedCode : code)
        )
        toast({
          title: 'Success',
          description: 'Referral code updated successfully'
        })
      }

      return { success: true, data: updatedCode }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Deactivate referral code
  const deactivateReferralCode = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const { data: deactivatedCode, error } = await referralUtils.deactivate(id)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to deactivate referral code',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Update local state
      if (deactivatedCode) {
        setReferralCodes(prev => 
          prev.map(code => code.id === id ? deactivatedCode : code)
        )
        toast({
          title: 'Success',
          description: 'Referral code deactivated successfully'
        })
      }

      return { success: true, data: deactivatedCode }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Delete referral code
  const deleteReferralCode = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const { success, error } = await referralUtils.delete(id)

      if (!success || error) {
        setError(error?.message || 'Failed to delete referral code')
        toast({
          title: 'Error',
          description: 'Failed to delete referral code',
          variant: 'destructive'
        })
        return { success: false }
      }

      // Remove from local state
      setReferralCodes(prev => prev.filter(code => code.id !== id))
      toast({
        title: 'Success',
        description: 'Referral code deleted successfully'
      })

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Generate referral link
  const generateReferralLink = useCallback((
    baseUrl: string,
    referralCode: string,
    path: string = '/'
  ) => {
    return referralUtils.generateLink(baseUrl, referralCode, path)
  }, [])

  // Pagination handlers
  const nextPage = useCallback(() => {
    const newOffset = pagination.offset + pagination.limit
    if (newOffset < pagination.total) {
      fetchReferralCodes({ offset: newOffset })
    }
  }, [pagination, fetchReferralCodes])

  const prevPage = useCallback(() => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit)
    fetchReferralCodes({ offset: newOffset })
  }, [pagination, fetchReferralCodes])

  // Auto-fetch on mount
  useEffect(() => {
    if (options.organizationId || options.userId) {
      fetchReferralCodes()
    }
  }, []) // Only run on mount

  return {
    // Data
    referralCodes,
    loading,
    error,
    pagination,
    
    // Actions
    fetchReferralCodes,
    createReferralCode,
    updateReferralCode,
    deactivateReferralCode,
    deleteReferralCode,
    generateReferralLink,
    
    // Pagination
    nextPage,
    prevPage,
    
    // Computed values
    hasNextPage: pagination.offset + pagination.limit < pagination.total,
    hasPrevPage: pagination.offset > 0,
    currentPage: Math.floor(pagination.offset / pagination.limit) + 1,
    totalPages: Math.ceil(pagination.total / pagination.limit)
  }
}

// ================================================
// SINGLE REFERRAL CODE HOOK
// ================================================

export function useReferralCode(id: string | null) {
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch referral code
  const fetchReferralCode = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await referralUtils.get(id)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch referral code',
          variant: 'destructive'
        })
        return
      }

      setReferralCode(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  // Auto-fetch on mount and id change
  useEffect(() => {
    if (id) {
      fetchReferralCode()
    }
  }, [id]) // Only depend on id

  return {
    referralCode,
    loading,
    error,
    refetch: fetchReferralCode
  }
}

// ================================================
// REFERRAL TRACKING HOOK
// ================================================

export function useReferralTracking() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Track referral
  const trackReferral = useCallback(async (data: TrackReferralRequest) => {
    setLoading(true)
    setError(null)

    try {
      const { data: conversion, error } = await referralUtils.track(data)

      if (error) {
        setError(error.message)
        console.warn('Failed to track referral:', error.message)
        return { success: false, data: null }
      }

      return { success: true, data: conversion }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.warn('Failed to track referral:', message)
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [])

  // Validate referral code
  const validateReferralCode = useCallback(async (code: string) => {
    setLoading(true)
    setError(null)

    try {
      const { data: referralCode, error } = await referralUtils.getByCode(code)

      if (error) {
        setError(error.message)
        return { valid: false, referralCode: null, error: error.message }
      }

      return { valid: true, referralCode, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { valid: false, referralCode: null, error: message }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    trackReferral,
    validateReferralCode
  }
}

// ================================================
// REFERRAL CONVERSIONS HOOK
// ================================================

export function useReferralConversions(options: {
  referralCodeId?: string
  referrerUserId?: string
  organizationId?: string
}) {
  const [conversions, setConversions] = useState<ReferralConversion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0
  })

  // Fetch conversions
  const fetchConversions = useCallback(async (fetchOptions?: {
    conversionType?: string
    commissionPaid?: boolean
    limit?: number
    offset?: number
  }) => {
    setLoading(true)
    setError(null)

    try {
      const { data, count, error } = await referralUtils.getConversions({
        referralCodeId: options.referralCodeId,
        referrerUserId: options.referrerUserId,
        organizationId: options.organizationId,
        conversionType: fetchOptions?.conversionType,
        commissionPaid: fetchOptions?.commissionPaid,
        limit: fetchOptions?.limit || pagination.limit,
        offset: fetchOptions?.offset || pagination.offset
      })

      if (error) {
        setError(error.message)
        return
      }

      setConversions(data || [])
      setPagination(prev => ({
        ...prev,
        total: count || 0,
        limit: fetchOptions?.limit || prev.limit,
        offset: fetchOptions?.offset || prev.offset
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [options, pagination.limit, pagination.offset])

  // Mark commission as paid
  const markCommissionPaid = useCallback(async (conversionId: string) => {
    setLoading(true)
    setError(null)

    try {
      const { data: updatedConversion, error } = await referralUtils.markCommissionPaid(conversionId)

      if (error) {
        setError(error.message)
        return { success: false, data: null }
      }

      // Update local state
      if (updatedConversion) {
        setConversions(prev => 
          prev.map(conv => conv.id === conversionId ? updatedConversion : conv)
        )
      }

      return { success: true, data: updatedConversion }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [])

  // Pagination handlers
  const nextPage = useCallback(() => {
    const newOffset = pagination.offset + pagination.limit
    if (newOffset < pagination.total) {
      fetchConversions({ offset: newOffset })
    }
  }, [pagination, fetchConversions])

  const prevPage = useCallback(() => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit)
    fetchConversions({ offset: newOffset })
  }, [pagination, fetchConversions])

  // Auto-fetch on mount
  useEffect(() => {
    if (options.referralCodeId || options.referrerUserId || options.organizationId) {
      fetchConversions()
    }
  }, []) // Only run on mount

  return {
    // Data
    conversions,
    loading,
    error,
    pagination,
    
    // Actions
    fetchConversions,
    markCommissionPaid,
    
    // Pagination
    nextPage,
    prevPage,
    
    // Computed values
    hasNextPage: pagination.offset + pagination.limit < pagination.total,
    hasPrevPage: pagination.offset > 0,
    currentPage: Math.floor(pagination.offset / pagination.limit) + 1,
    totalPages: Math.ceil(pagination.total / pagination.limit)
  }
}

// ================================================
// REFERRAL ANALYTICS HOOK
// ================================================

export function useReferralAnalytics(organizationId: string) {
  const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null)
  const [userStats, setUserStats] = useState<{
    total_referrals: number
    successful_conversions: number
    conversion_rate: number
    total_commission_earned: number
    pending_commission: number
    referral_codes: ReferralCode[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch organization analytics
  const fetchAnalytics = useCallback(async (period: 'day' | 'week' | 'month' = 'month') => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await referralUtils.getAnalytics(organizationId, period)

      if (error) {
        setError(error.message)
        return
      }

      setAnalytics(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  // Fetch user stats
  const fetchUserStats = useCallback(async (
    userId: string, 
    period: 'day' | 'week' | 'month' = 'month'
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await referralUtils.getUserStats(userId, period)

      if (error) {
        setError(error.message)
        return
      }

      setUserStats(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-fetch organization analytics on mount
  useEffect(() => {
    if (organizationId) {
      fetchAnalytics()
    }
  }, [organizationId]) // Only depend on organizationId

  return {
    // Data
    analytics,
    userStats,
    loading,
    error,
    
    // Actions
    fetchAnalytics,
    fetchUserStats,
    
    // Helpers
    refetch: fetchAnalytics
  }
}

// ================================================
// REFERRAL URL HOOK (for public pages)
// ================================================

export function useReferralUrl() {
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [isValidCode, setIsValidCode] = useState(false)
  const [hasTracked, setHasTracked] = useState(false)

  // Extract referral code from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const refCode = urlParams.get('ref')
      
      if (refCode) {
        setReferralCode(refCode)
        
        // Store in session storage for later tracking
        sessionStorage.setItem('referral_code', refCode)
      } else {
        // Check session storage for existing referral code
        const storedCode = sessionStorage.getItem('referral_code')
        if (storedCode) {
          setReferralCode(storedCode)
        }
      }
    }
  }, [])

  // Validate referral code
  useEffect(() => {
    if (referralCode) {
      const validateCode = async () => {
        try {
          const { data, error } = await referralUtils.getByCode(referralCode)
          setIsValidCode(!error && !!data)
        } catch {
          setIsValidCode(false)
        }
      }
      
      validateCode()
    }
  }, [referralCode])

  // Track referral conversion
  const trackConversion = useCallback(async (
    conversionType: 'signup' | 'trial' | 'subscription' | 'purchase',
    referredEmail?: string,
    conversionValue?: number,
    metadata?: Record<string, any>
  ) => {
    if (!referralCode || hasTracked) return { success: false }

    try {
      const { success, error } = await referralUtils.track({
        referral_code: referralCode,
        referred_email: referredEmail,
        conversion_type: conversionType,
        conversion_value: conversionValue,
        metadata: metadata
      })

      if (success) {
        setHasTracked(true)
        // Clear from session storage after successful tracking
        sessionStorage.removeItem('referral_code')
      }

      return { success, error }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }, [referralCode, hasTracked])

  return {
    referralCode,
    isValidCode,
    hasTracked,
    trackConversion
  }
}