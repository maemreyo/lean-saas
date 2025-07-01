// CREATED: 2025-07-01 - Referral tracking API endpoint for conversion tracking

import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/auth/auth-utils'
import { referralUtils } from '@/lib/marketing/referrals'
import { referralSchemas } from '@/shared/schemas/marketing'
import type { TrackReferralRequest } from '@/shared/types/marketing'

// ================================================
// POST /api/marketing/referrals/track
// Track referral conversion (public endpoint)
// ================================================

export async function POST(request: NextRequest) {
  try {
    // Note: This is a public endpoint for tracking referrals from external sources
    const supabase = await createAuthClient()
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = referralSchemas.trackReferral.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const data: TrackReferralRequest = validationResult.data

    // Get referral code details
    const { data: referralCode, error: codeError } = await referralUtils.getByCode(data.referral_code)
    
    if (codeError || !referralCode) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 404 }
      )
    }

    // Check if referral code is active
    if (!referralCode.active) {
      return NextResponse.json(
        { error: 'Referral code is inactive' },
        { status: 400 }
      )
    }

    // Check if referral code has expired
    if (referralCode.expires_at && new Date(referralCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Referral code has expired' },
        { status: 400 }
      )
    }

    // Check usage limit
    if (referralCode.max_uses && referralCode.current_uses >= referralCode.max_uses) {
      return NextResponse.json(
        { error: 'Referral code usage limit exceeded' },
        { status: 400 }
      )
    }

    // Calculate commission based on referral code settings
    let commissionAmount = 0
    if (data.conversion_value && referralCode.reward_type === 'commission') {
      commissionAmount = data.conversion_value * (referralCode.reward_value / 100)
    } else if (referralCode.reward_type === 'credit') {
      commissionAmount = referralCode.reward_value
    }

    // Check for duplicate conversions (same email + referral code)
    if (data.referred_email) {
      const { data: existingConversion } = await supabase
        .from('referral_conversions')
        .select('id')
        .eq('referral_code_id', referralCode.id)
        .eq('referred_email', data.referred_email.toLowerCase())
        .eq('conversion_type', data.conversion_type)
        .single()

      if (existingConversion) {
        return NextResponse.json(
          { error: 'Conversion already tracked for this email and referral code' },
          { status: 400 }
        )
      }
    }

    // Track the conversion
    const { data: conversion, error: conversionError } = await referralUtils.trackConversion({
      referral_code_id: referralCode.id,
      referrer_user_id: referralCode.user_id,
      referred_email: data.referred_email?.toLowerCase(),
      conversion_type: data.conversion_type,
      conversion_value: data.conversion_value,
      commission_amount: commissionAmount,
      metadata: data.metadata
    })

    if (conversionError) {
      console.error('Failed to track referral conversion:', conversionError)
      return NextResponse.json(
        { error: 'Failed to track conversion' },
        { status: 500 }
      )
    }

    // Update referral code usage count
    await supabase
      .from('referral_codes')
      .update({ 
        current_uses: (referralCode.current_uses || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', referralCode.id)

    // Track metrics for analytics
    try {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id: referralCode.organization_id,
          metric_type: 'referral_conversion',
          metric_value: data.conversion_value || 1,
          dimensions: {
            referral_code_id: referralCode.id,
            referral_code: referralCode.code,
            referrer_user_id: referralCode.user_id,
            conversion_type: data.conversion_type,
            commission_amount: commissionAmount,
            source: 'api_tracking'
          }
        })
    } catch (metricsError) {
      console.warn('Failed to track referral conversion metrics:', metricsError)
    }

    // Return success response with reward details
    return NextResponse.json({
      data: conversion,
      referral_info: {
        code: referralCode.code,
        reward_type: referralCode.reward_type,
        reward_value: referralCode.reward_value,
        reward_description: referralCode.reward_description,
        commission_amount: commissionAmount
      },
      message: 'Referral conversion tracked successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Referral tracking POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// GET /api/marketing/referrals/track
// Get referral code validation and details (public endpoint)
// ================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const referralCode = searchParams.get('code')

    if (!referralCode) {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      )
    }

    const supabase = await createAuthClient()

    // Get referral code details
    const { data: code, error } = await referralUtils.getByCode(referralCode)
    
    if (error || !code) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 404 }
      )
    }

    // Check if code is valid for use
    const isValid = code.active && 
      (!code.expires_at || new Date(code.expires_at) > new Date()) &&
      (!code.max_uses || code.current_uses < code.max_uses)

    // Get referrer information (without sensitive data)
    const { data: referrer } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', code.user_id)
      .single()

    // Get organization information
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', code.organization_id)
      .single()

    // Calculate remaining uses
    const remainingUses = code.max_uses ? code.max_uses - (code.current_uses || 0) : null

    return NextResponse.json({
      data: {
        code: code.code,
        description: code.description,
        reward_type: code.reward_type,
        reward_value: code.reward_value,
        reward_description: code.reward_description,
        expires_at: code.expires_at,
        remaining_uses: remainingUses,
        is_valid: isValid,
        referrer_name: referrer?.full_name || 'Anonymous',
        organization_name: organization?.name || 'Unknown'
      },
      validation: {
        is_active: code.active,
        is_expired: code.expires_at ? new Date(code.expires_at) <= new Date() : false,
        usage_exceeded: code.max_uses ? (code.current_uses || 0) >= code.max_uses : false,
        can_use: isValid
      }
    })

  } catch (error) {
    console.error('Referral validation GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// PUT /api/marketing/referrals/track
// Update conversion status (mark as paid, etc.)
// ================================================

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { conversion_id, updates, organization_id } = body

    if (!conversion_id) {
      return NextResponse.json(
        { error: 'Conversion ID is required' },
        { status: 400 }
      )
    }

    // Get conversion details
    const { data: conversion, error: getError } = await supabase
      .from('referral_conversions')
      .select(`
        *,
        referral_codes!inner(organization_id, user_id, code)
      `)
      .eq('id', conversion_id)
      .single()

    if (getError || !conversion) {
      return NextResponse.json(
        { error: 'Conversion not found' },
        { status: 404 }
      )
    }

    // Verify organization access if provided
    if (organization_id && conversion.referral_codes.organization_id !== organization_id) {
      return NextResponse.json(
        { error: 'Conversion does not belong to this organization' },
        { status: 403 }
      )
    }

    // Update conversion
    const allowedUpdates = ['commission_paid', 'commission_paid_at', 'metadata']
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key]
        return obj
      }, {} as any)

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      )
    }

    // If marking as paid, set timestamp
    if (filteredUpdates.commission_paid === true && !filteredUpdates.commission_paid_at) {
      filteredUpdates.commission_paid_at = new Date().toISOString()
    }

    const { data: updatedConversion, error: updateError } = await supabase
      .from('referral_conversions')
      .update({
        ...filteredUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversion_id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update conversion:', updateError)
      return NextResponse.json(
        { error: 'Failed to update conversion' },
        { status: 500 }
      )
    }

    // Track payment event for analytics
    if (filteredUpdates.commission_paid === true) {
      try {
        await supabase
          .from('growth_metrics')
          .insert({
            organization_id: conversion.referral_codes.organization_id,
            metric_type: 'commission_paid',
            metric_value: conversion.commission_amount || 0,
            dimensions: {
              conversion_id,
              referral_code: conversion.referral_codes.code,
              referrer_user_id: conversion.referrer_user_id
            }
          })
      } catch (metricsError) {
        console.warn('Failed to track commission payment metrics:', metricsError)
      }
    }

    return NextResponse.json({
      data: updatedConversion,
      message: 'Conversion updated successfully'
    })

  } catch (error) {
    console.error('Referral conversion update PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}