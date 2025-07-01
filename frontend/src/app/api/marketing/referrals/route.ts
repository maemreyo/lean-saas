// CREATED: 2025-07-01 - Referral program API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAuthClient } from '@/lib/auth/auth-utils'
import { referralUtils } from '@/lib/marketing/referrals'
import { referralSchemas } from '@/shared/schemas/marketing'
import type { CreateReferralCodeRequest } from '@/shared/types/marketing'

// ================================================
// GET /api/marketing/referrals
// List referral codes and analytics
// ================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const organizationId = searchParams.get('organization_id')
    const userId = searchParams.get('user_id') // Optional - filter by specific user
    const active = searchParams.get('active')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeStats = searchParams.get('include_stats') === 'true'

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to organization
    const supabase = await createAuthClient()
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess) {
      return NextResponse.json(
        { error: 'Access denied to organization' },
        { status: 403 }
      )
    }

    // Fetch referral codes
    const { data: referralCodes, count, error } = await referralUtils.list(organizationId, {
      user_id: userId,
      active: active ? active === 'true' : undefined,
      limit,
      offset
    })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch referral codes' },
        { status: 500 }
      )
    }

    let response: any = {
      data: referralCodes || [],
      count: count || 0,
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    }

    // Include statistics if requested
    if (includeStats) {
      const { data: conversions } = await supabase
        .from('referral_conversions')
        .select(`
          referral_code_id,
          conversion_type,
          conversion_value,
          commission_amount,
          commission_paid,
          created_at
        `)
        .in('referral_code_id', (referralCodes || []).map(code => code.id))

      // Calculate stats for each referral code
      const statsMap = {}
      conversions?.forEach(conversion => {
        const codeId = conversion.referral_code_id
        if (!statsMap[codeId]) {
          statsMap[codeId] = {
            total_conversions: 0,
            total_value: 0,
            total_commission: 0,
            paid_commission: 0,
            conversion_types: {},
            recent_conversions: 0
          }
        }

        const stats = statsMap[codeId]
        stats.total_conversions++
        stats.total_value += conversion.conversion_value || 0
        stats.total_commission += conversion.commission_amount || 0
        
        if (conversion.commission_paid) {
          stats.paid_commission += conversion.commission_amount || 0
        }

        // Track conversion types
        const type = conversion.conversion_type
        stats.conversion_types[type] = (stats.conversion_types[type] || 0) + 1

        // Count recent conversions (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        if (new Date(conversion.created_at) >= thirtyDaysAgo) {
          stats.recent_conversions++
        }
      })

      // Add stats to referral codes
      response.data = response.data.map(code => ({
        ...code,
        stats: statsMap[code.id] || {
          total_conversions: 0,
          total_value: 0,
          total_commission: 0,
          paid_commission: 0,
          conversion_types: {},
          recent_conversions: 0
        }
      }))

      // Overall program stats
      const totalStats = Object.values(statsMap).reduce((acc: any, stats: any) => ({
        total_conversions: acc.total_conversions + stats.total_conversions,
        total_value: acc.total_value + stats.total_value,
        total_commission: acc.total_commission + stats.total_commission,
        paid_commission: acc.paid_commission + stats.paid_commission,
        recent_conversions: acc.recent_conversions + stats.recent_conversions
      }), {
        total_conversions: 0,
        total_value: 0,
        total_commission: 0,
        paid_commission: 0,
        recent_conversions: 0
      })

      response.program_stats = totalStats
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Referrals GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// POST /api/marketing/referrals
// Create new referral code
// ================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = referralSchemas.createReferralCode.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const data: CreateReferralCodeRequest = validationResult.data

    // Verify user has access to organization
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', data.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin', 'editor'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Generate unique referral code if not provided
    let referralCode = body.code
    if (!referralCode) {
      // Generate code from user name or random string
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const baseName = userProfile?.full_name?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'USER'
      referralCode = `${baseName}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    }

    // Check if code already exists
    const { data: existingCode } = await supabase
      .from('referral_codes')
      .select('id')
      .eq('code', referralCode)
      .single()

    if (existingCode) {
      return NextResponse.json(
        { error: 'Referral code already exists' },
        { status: 400 }
      )
    }

    // Create referral code
    const { data: newReferralCode, error: createError } = await referralUtils.create({
      ...data,
      user_id: user.id,
      code: referralCode
    })

    if (createError) {
      console.error('Failed to create referral code:', createError)
      return NextResponse.json(
        { error: 'Failed to create referral code' },
        { status: 500 }
      )
    }

    // Track creation for analytics
    try {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id: data.organization_id,
          metric_type: 'referral_code_created',
          metric_value: 1,
          dimensions: {
            referral_code_id: newReferralCode?.id,
            code: referralCode,
            reward_type: data.reward_type,
            reward_value: data.reward_value,
            user_id: user.id
          }
        })
    } catch (metricsError) {
      console.warn('Failed to track referral code creation metrics:', metricsError)
    }

    return NextResponse.json({
      data: newReferralCode,
      message: 'Referral code created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Referral POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// PUT /api/marketing/referrals
// Bulk update referral codes (activate/deactivate, update rewards)
// ================================================

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { referral_code_ids, updates, organization_id } = body

    if (!Array.isArray(referral_code_ids) || referral_code_ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid referral code IDs array' },
        { status: 400 }
      )
    }

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin', 'editor'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get referral codes to verify they exist and belong to organization
    const { data: referralCodes } = await supabase
      .from('referral_codes')
      .select('id, code, user_id')
      .in('id', referral_code_ids)
      .eq('organization_id', organization_id)

    if (!referralCodes || referralCodes.length === 0) {
      return NextResponse.json(
        { error: 'No referral codes found' },
        { status: 404 }
      )
    }

    // Check if user can update codes owned by others (admin/owner only)
    const hasOtherUserCodes = referralCodes.some(code => code.user_id !== user.id)
    if (hasOtherUserCodes && !['owner', 'admin'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Cannot update referral codes owned by other users' },
        { status: 403 }
      )
    }

    // Batch update
    const updatePromises = referralCodes.map(code =>
      referralUtils.update(code.id, updates)
    )

    const results = await Promise.allSettled(updatePromises)
    
    const successful = results
      .map((result, index) => ({
        id: referralCodes[index].id,
        code: referralCodes[index].code,
        success: result.status === 'fulfilled' && !result.value.error,
        data: result.status === 'fulfilled' ? result.value.data : null,
        error: result.status === 'rejected' || result.value.error ? 
          (result.status === 'rejected' ? result.reason : result.value.error?.message) : null
      }))

    // Track bulk update
    try {
      const successfulCount = successful.filter(r => r.success).length
      if (successfulCount > 0) {
        await supabase
          .from('growth_metrics')
          .insert({
            organization_id,
            metric_type: 'referral_codes_updated',
            metric_value: successfulCount,
            dimensions: {
              total_attempted: referralCodes.length,
              updates,
              user_id: user.id
            }
          })
      }
    } catch (metricsError) {
      console.warn('Failed to track referral code update metrics:', metricsError)
    }

    return NextResponse.json({
      results: successful,
      summary: {
        total_attempted: referralCodes.length,
        successful: successful.filter(r => r.success).length,
        failed: successful.filter(r => !r.success).length
      },
      message: 'Bulk update completed'
    })

  } catch (error) {
    console.error('Referrals batch PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// DELETE /api/marketing/referrals
// Delete referral codes
// ================================================

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { referral_code_ids, organization_id } = body

    if (!Array.isArray(referral_code_ids) || referral_code_ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid referral code IDs array' },
        { status: 400 }
      )
    }

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has admin access for deletion
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for deletion' },
        { status: 403 }
      )
    }

    // Get referral codes to verify they exist
    const { data: referralCodes } = await supabase
      .from('referral_codes')
      .select('id, code, current_uses')
      .in('id', referral_code_ids)
      .eq('organization_id', organization_id)

    if (!referralCodes || referralCodes.length === 0) {
      return NextResponse.json(
        { error: 'No referral codes found' },
        { status: 404 }
      )
    }

    // Check if any codes have active conversions
    const codesWithConversions = referralCodes.filter(code => (code.current_uses || 0) > 0)
    if (codesWithConversions.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete referral codes with existing conversions',
          codes_with_conversions: codesWithConversions.map(c => ({ id: c.id, code: c.code, uses: c.current_uses }))
        },
        { status: 400 }
      )
    }

    // Delete referral codes
    const deletePromises = referralCodes.map(code => referralUtils.delete(code.id))
    const results = await Promise.allSettled(deletePromises)
    
    const successful = results
      .map((result, index) => ({
        id: referralCodes[index].id,
        code: referralCodes[index].code,
        success: result.status === 'fulfilled' && result.value.success,
        error: result.status === 'rejected' || !result.value.success ? 
          (result.status === 'rejected' ? result.reason : 'Deletion failed') : null
      }))

    // Track deletion
    try {
      const successfulCount = successful.filter(r => r.success).length
      if (successfulCount > 0) {
        await supabase
          .from('growth_metrics')
          .insert({
            organization_id,
            metric_type: 'referral_codes_deleted',
            metric_value: successfulCount,
            dimensions: {
              total_attempted: referralCodes.length,
              user_id: user.id
            }
          })
      }
    } catch (metricsError) {
      console.warn('Failed to track referral code deletion metrics:', metricsError)
    }

    return NextResponse.json({
      results: successful,
      summary: {
        total_attempted: referralCodes.length,
        successful: successful.filter(r => r.success).length,
        failed: successful.filter(r => !r.success).length
      },
      message: 'Deletion completed'
    })

  } catch (error) {
    console.error('Referrals DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}