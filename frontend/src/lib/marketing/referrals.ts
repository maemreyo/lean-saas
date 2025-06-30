// Referrals utilities for Marketing & Growth Module
// Following patterns from billing module utilities

import { supabase } from '@/lib/supabase'
import { 
  ReferralCode, 
  ReferralCodeInsert, 
  ReferralCodeUpdate,
  ReferralConversion,
  CreateReferralCodeRequest,
  UpdateReferralCodeRequest,
  TrackReferralRequest,
  ReferralAnalytics
} from '@/types/marketing'
import { 
  createReferralCodeSchema,
  updateReferralCodeSchema,
  trackReferralSchema 
} from '@/schemas/marketing'
import { createError, handleSupabaseError } from '@/lib/utils'

// ================================================
// REFERRAL CODE MANAGEMENT
// ================================================

/**
 * Create a new referral code
 */
export const createReferralCode = async (
  data: CreateReferralCodeRequest
): Promise<{ data: ReferralCode | null; error: Error | null }> => {
  try {
    // Validate input data
    const validation = createReferralCodeSchema.safeParse(data)
    if (!validation.success) {
      return { 
        data: null, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Generate unique referral code
    const code = await generateUniqueReferralCode()

    // Create referral code
    const { data: referralCode, error } = await supabase
      .from('referral_codes')
      .insert({
        organization_id: data.organization_id,
        user_id: data.user_id,
        code,
        description: data.description,
        reward_type: data.reward_type,
        reward_value: data.reward_value,
        reward_description: data.reward_description,
        max_uses: data.max_uses,
        expires_at: data.expires_at,
        current_uses: 0,
        active: true
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: referralCode, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to create referral code', error) 
    }
  }
}

/**
 * Update a referral code
 */
export const updateReferralCode = async (
  id: string,
  data: UpdateReferralCodeRequest
): Promise<{ data: ReferralCode | null; error: Error | null }> => {
  try {
    // Validate input data
    const validation = updateReferralCodeSchema.safeParse(data)
    if (!validation.success) {
      return { 
        data: null, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Update referral code
    const { data: referralCode, error } = await supabase
      .from('referral_codes')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: referralCode, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to update referral code', error) 
    }
  }
}

/**
 * Deactivate a referral code
 */
export const deactivateReferralCode = async (
  id: string
): Promise<{ data: ReferralCode | null; error: Error | null }> => {
  try {
    const { data: referralCode, error } = await supabase
      .from('referral_codes')
      .update({
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: referralCode, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to deactivate referral code', error) 
    }
  }
}

/**
 * Delete a referral code
 */
export const deleteReferralCode = async (
  id: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('referral_codes')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to delete referral code', error) 
    }
  }
}

/**
 * Get referral code by ID
 */
export const getReferralCode = async (
  id: string
): Promise<{ data: ReferralCode | null; error: Error | null }> => {
  try {
    const { data: referralCode, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: referralCode, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get referral code', error) 
    }
  }
}

/**
 * Get referral code by code string
 */
export const getReferralCodeByCode = async (
  code: string
): Promise<{ data: ReferralCode | null; error: Error | null }> => {
  try {
    const { data: referralCode, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    // Check if code is expired
    if (referralCode.expires_at && new Date(referralCode.expires_at) < new Date()) {
      return { 
        data: null, 
        error: createError('Referral code has expired') 
      }
    }

    // Check if code has reached max uses
    if (referralCode.max_uses && referralCode.current_uses >= referralCode.max_uses) {
      return { 
        data: null, 
        error: createError('Referral code has reached maximum uses') 
      }
    }

    return { data: referralCode, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get referral code', error) 
    }
  }
}

/**
 * List referral codes for a user or organization
 */
export const listReferralCodes = async (
  options: {
    organizationId?: string
    userId?: string
    active?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<{ 
  data: ReferralCode[] | null; 
  count: number | null;
  error: Error | null 
}> => {
  try {
    let query = supabase
      .from('referral_codes')
      .select('*, count', { count: 'exact' })

    // Apply filters
    if (options.organizationId) {
      query = query.eq('organization_id', options.organizationId)
    }
    if (options.userId) {
      query = query.eq('user_id', options.userId)
    }
    if (options.active !== undefined) {
      query = query.eq('active', options.active)
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit)
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    // Order by creation date
    query = query.order('created_at', { ascending: false })

    const { data: referralCodes, error, count } = await query

    if (error) {
      return { data: null, count: null, error: handleSupabaseError(error) }
    }

    return { data: referralCodes, count, error: null }
  } catch (error) {
    return { 
      data: null, 
      count: null,
      error: createError('Failed to list referral codes', error) 
    }
  }
}

// ================================================
// REFERRAL TRACKING
// ================================================

/**
 * Track a referral conversion
 */
export const trackReferral = async (
  data: TrackReferralRequest
): Promise<{ data: ReferralConversion | null; error: Error | null }> => {
  try {
    // Validate input data
    const validation = trackReferralSchema.safeParse(data)
    if (!validation.success) {
      return { 
        data: null, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Get referral code
    const { data: referralCode, error: codeError } = await getReferralCodeByCode(data.referral_code)
    if (codeError || !referralCode) {
      return { data: null, error: codeError || createError('Invalid referral code') }
    }

    // Calculate commission amount
    let commissionAmount = 0
    if (referralCode.reward_type === 'commission' && data.conversion_value) {
      commissionAmount = (data.conversion_value * referralCode.reward_value) / 100
    } else if (referralCode.reward_type === 'credit') {
      commissionAmount = referralCode.reward_value
    }

    // Create referral conversion
    const { data: conversion, error } = await supabase
      .from('referral_conversions')
      .insert({
        referral_code_id: referralCode.id,
        referrer_user_id: referralCode.user_id,
        referred_email: data.referred_email,
        conversion_type: data.conversion_type,
        conversion_value: data.conversion_value || 0,
        commission_amount: commissionAmount,
        metadata: data.metadata || {}
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    // Update referral code usage count
    await supabase
      .from('referral_codes')
      .update({
        current_uses: supabase.sql`current_uses + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('id', referralCode.id)

    // Track growth metric
    await supabase
      .from('growth_metrics')
      .insert({
        organization_id: referralCode.organization_id,
        metric_type: 'referral',
        metric_value: 1,
        dimensions: {
          referral_code: referralCode.code,
          conversion_type: data.conversion_type,
          conversion_value: data.conversion_value,
          commission_amount: commissionAmount
        }
      })

    return { data: conversion, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to track referral', error) 
    }
  }
}

/**
 * Mark commission as paid
 */
export const markCommissionPaid = async (
  conversionId: string
): Promise<{ data: ReferralConversion | null; error: Error | null }> => {
  try {
    const { data: conversion, error } = await supabase
      .from('referral_conversions')
      .update({
        commission_paid: true,
        commission_paid_at: new Date().toISOString()
      })
      .eq('id', conversionId)
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: conversion, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to mark commission as paid', error) 
    }
  }
}

/**
 * Get referral conversions
 */
export const getReferralConversions = async (
  options: {
    referralCodeId?: string
    referrerUserId?: string
    organizationId?: string
    conversionType?: string
    commissionPaid?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<{ 
  data: ReferralConversion[] | null; 
  count: number | null;
  error: Error | null 
}> => {
  try {
    let query = supabase
      .from('referral_conversions')
      .select('*, referral_codes!inner(organization_id, code), count', { count: 'exact' })

    // Apply filters
    if (options.referralCodeId) {
      query = query.eq('referral_code_id', options.referralCodeId)
    }
    if (options.referrerUserId) {
      query = query.eq('referrer_user_id', options.referrerUserId)
    }
    if (options.organizationId) {
      query = query.eq('referral_codes.organization_id', options.organizationId)
    }
    if (options.conversionType) {
      query = query.eq('conversion_type', options.conversionType)
    }
    if (options.commissionPaid !== undefined) {
      query = query.eq('commission_paid', options.commissionPaid)
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit)
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    // Order by creation date
    query = query.order('created_at', { ascending: false })

    const { data: conversions, error, count } = await query

    if (error) {
      return { data: null, count: null, error: handleSupabaseError(error) }
    }

    return { data: conversions, count, error: null }
  } catch (error) {
    return { 
      data: null, 
      count: null,
      error: createError('Failed to get referral conversions', error) 
    }
  }
}

// ================================================
// ANALYTICS
// ================================================

/**
 * Get referral analytics
 */
export const getReferralAnalytics = async (
  organizationId: string,
  period: 'day' | 'week' | 'month' = 'month'
): Promise<{ data: ReferralAnalytics | null; error: Error | null }> => {
  try {
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1)
        break
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1)
        break
    }

    // Get total referrals in period
    const { count: totalReferrals } = await supabase
      .from('referral_conversions')
      .select('*, referral_codes!inner(organization_id)', { count: 'exact', head: true })
      .eq('referral_codes.organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Get successful conversions
    const { data: conversions } = await supabase
      .from('referral_conversions')
      .select('*, referral_codes!inner(organization_id)')
      .eq('referral_codes.organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const successfulConversions = conversions?.filter(c => 
      c.conversion_type === 'subscription' || c.conversion_type === 'purchase'
    ).length || 0

    const conversionRate = totalReferrals ? (successfulConversions / totalReferrals) * 100 : 0

    // Calculate commission amounts
    const totalCommissionOwed = conversions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0
    const totalCommissionPaid = conversions?.filter(c => c.commission_paid)
      .reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0

    // Get top referrers
    const referrerStats: Record<string, { count: number; conversions: number; commission: number }> = {}
    conversions?.forEach(conversion => {
      const userId = conversion.referrer_user_id
      if (!referrerStats[userId]) {
        referrerStats[userId] = { count: 0, conversions: 0, commission: 0 }
      }
      referrerStats[userId].count++
      if (conversion.conversion_type === 'subscription' || conversion.conversion_type === 'purchase') {
        referrerStats[userId].conversions++
      }
      referrerStats[userId].commission += conversion.commission_amount || 0
    })

    const topReferrers = Object.entries(referrerStats)
      .map(([userId, stats]) => ({
        user_id: userId,
        referral_count: stats.count,
        conversion_count: stats.conversions,
        commission_earned: stats.commission
      }))
      .sort((a, b) => b.conversion_count - a.conversion_count)
      .slice(0, 10)

    const analytics: ReferralAnalytics = {
      organization_id: organizationId,
      total_referrals: totalReferrals || 0,
      successful_conversions: successfulConversions,
      conversion_rate: conversionRate,
      total_commission_owed: totalCommissionOwed,
      total_commission_paid: totalCommissionPaid,
      top_referrers: topReferrers
    }

    return { data: analytics, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get referral analytics', error) 
    }
  }
}

/**
 * Get user's referral performance
 */
export const getUserReferralStats = async (
  userId: string,
  period: 'day' | 'week' | 'month' = 'month'
): Promise<{ 
  data: {
    total_referrals: number
    successful_conversions: number
    conversion_rate: number
    total_commission_earned: number
    pending_commission: number
    referral_codes: ReferralCode[]
  } | null; 
  error: Error | null 
}> => {
  try {
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1)
        break
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1)
        break
    }

    // Get user's referral conversions
    const { data: conversions } = await supabase
      .from('referral_conversions')
      .select('*')
      .eq('referrer_user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const totalReferrals = conversions?.length || 0
    const successfulConversions = conversions?.filter(c => 
      c.conversion_type === 'subscription' || c.conversion_type === 'purchase'
    ).length || 0
    const conversionRate = totalReferrals ? (successfulConversions / totalReferrals) * 100 : 0

    const totalCommissionEarned = conversions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0
    const pendingCommission = conversions?.filter(c => !c.commission_paid)
      .reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0

    // Get user's active referral codes
    const { data: referralCodes } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false })

    return {
      data: {
        total_referrals: totalReferrals,
        successful_conversions: successfulConversions,
        conversion_rate: conversionRate,
        total_commission_earned: totalCommissionEarned,
        pending_commission: pendingCommission,
        referral_codes: referralCodes || []
      },
      error: null
    }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get user referral stats', error) 
    }
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Generate a unique referral code
 */
const generateUniqueReferralCode = async (): Promise<string> => {
  let code: string
  let isUnique = false
  let attempts = 0
  const maxAttempts = 10

  while (!isUnique && attempts < maxAttempts) {
    // Generate 8-character alphanumeric code
    code = Math.random().toString(36).substring(2, 10).toUpperCase()
    
    // Check if code already exists
    const { data } = await supabase
      .from('referral_codes')
      .select('id')
      .eq('code', code)
      .single()

    if (!data) {
      isUnique = true
      return code
    }
    
    attempts++
  }

  // Fallback: use timestamp-based code
  return `REF${Date.now().toString(36).toUpperCase()}`
}

/**
 * Validate referral code format
 */
export const validateReferralCodeFormat = (code: string): boolean => {
  return /^[A-Z0-9]{6,12}$/.test(code)
}

/**
 * Generate referral link
 */
export const generateReferralLink = (
  baseUrl: string,
  referralCode: string,
  path: string = '/'
): string => {
  const url = new URL(path, baseUrl)
  url.searchParams.set('ref', referralCode)
  return url.toString()
}

// Export all utilities
export const referralUtils = {
  create: createReferralCode,
  update: updateReferralCode,
  deactivate: deactivateReferralCode,
  delete: deleteReferralCode,
  get: getReferralCode,
  getByCode: getReferralCodeByCode,
  list: listReferralCodes,
  track: trackReferral,
  markCommissionPaid,
  getConversions: getReferralConversions,
  getAnalytics: getReferralAnalytics,
  getUserStats: getUserReferralStats,
  validateFormat: validateReferralCodeFormat,
  generateLink: generateReferralLink
}