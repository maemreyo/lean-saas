// CREATED: 2025-07-01 - Lead capture API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAuthClient } from '@/lib/auth/auth-utils'
import { leadCaptureUtils } from '@/lib/marketing/lead-capture'
import { leadCaptureSchemas } from '@/shared/schemas/marketing'
import type { CreateLeadCaptureRequest } from '@/shared/types/marketing'

// ================================================
// GET /api/marketing/leads
// List leads for organization
// ================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const organizationId = searchParams.get('organization_id')
    const source = searchParams.get('source')
    const landingPageId = searchParams.get('landing_page_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')
    const subscribed = searchParams.get('subscribed')

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

    // Fetch leads
    const { data: leads, count, error } = await leadCaptureUtils.list(organizationId, {
      source,
      landing_page_id: landingPageId,
      start_date: startDate,
      end_date: endDate,
      limit,
      offset,
      search,
      subscribed: subscribed ? subscribed === 'true' : undefined
    })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      )
    }

    // Get aggregated stats
    const { data: stats } = await supabase
      .from('lead_captures')
      .select(`
        source,
        created_at,
        subscribed
      `)
      .eq('organization_id', organizationId)

    let analytics = {
      total_leads: count || 0,
      subscribed_leads: 0,
      sources: {} as Record<string, number>,
      monthly_growth: 0,
      conversion_rate: 0
    }

    if (stats) {
      analytics.subscribed_leads = stats.filter(lead => lead.subscribed).length
      
      // Group by source
      analytics.sources = stats.reduce((acc, lead) => {
        const source = lead.source || 'unknown'
        acc[source] = (acc[source] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Calculate monthly growth (last 30 days vs previous 30 days)
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

      const recentLeads = stats.filter(lead => new Date(lead.created_at) >= thirtyDaysAgo).length
      const previousLeads = stats.filter(lead => {
        const date = new Date(lead.created_at)
        return date >= sixtyDaysAgo && date < thirtyDaysAgo
      }).length

      if (previousLeads > 0) {
        analytics.monthly_growth = ((recentLeads - previousLeads) / previousLeads) * 100
      }

      // Subscription rate as conversion rate
      analytics.conversion_rate = stats.length > 0 ? (analytics.subscribed_leads / stats.length) * 100 : 0
    }

    return NextResponse.json({
      data: leads || [],
      count: count || 0,
      analytics,
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    })

  } catch (error) {
    console.error('Leads GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// POST /api/marketing/leads
// Create new lead capture (public endpoint for forms)
// ================================================

export async function POST(request: NextRequest) {
  try {
    // Note: This endpoint doesn't require auth as it's used by public forms
    const supabase = await createAuthClient()
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = leadCaptureSchemas.createLeadCapture.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const data: CreateLeadCaptureRequest = validationResult.data

    // Verify organization exists
    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', data.organization_id)
      .single()

    if (!organization) {
      return NextResponse.json(
        { error: 'Invalid organization' },
        { status: 400 }
      )
    }

    // Check for duplicate email in this organization
    const { data: existingLead } = await supabase
      .from('lead_captures')
      .select('id, email')
      .eq('organization_id', data.organization_id)
      .eq('email', data.email.toLowerCase())
      .single()

    if (existingLead) {
      // Update existing lead instead of creating duplicate
      const { data: updatedLead, error: updateError } = await leadCaptureUtils.update(existingLead.id, {
        name: data.name,
        source: data.source,
        landing_page_id: data.landing_page_id,
        utm_source: data.utm_parameters?.utm_source,
        utm_medium: data.utm_parameters?.utm_medium,
        utm_campaign: data.utm_parameters?.utm_campaign,
        utm_content: data.utm_parameters?.utm_content,
        utm_term: data.utm_parameters?.utm_term,
        metadata: data.metadata,
        subscribed: true, // Re-subscribe if they submit again
        updated_at: new Date().toISOString()
      })

      if (updateError) {
        console.error('Failed to update existing lead:', updateError)
        return NextResponse.json(
          { error: 'Failed to process lead' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: updatedLead,
        message: 'Lead updated successfully',
        duplicate: true
      }, { status: 200 })
    }

    // Create new lead
    const { data: lead, error: createError } = await leadCaptureUtils.create({
      ...data,
      email: data.email.toLowerCase(),
      utm_source: data.utm_parameters?.utm_source,
      utm_medium: data.utm_parameters?.utm_medium,
      utm_campaign: data.utm_parameters?.utm_campaign,
      utm_content: data.utm_parameters?.utm_content,
      utm_term: data.utm_parameters?.utm_term
    })

    if (createError) {
      console.error('Failed to create lead:', createError)
      return NextResponse.json(
        { error: 'Failed to capture lead' },
        { status: 500 }
      )
    }

    // Track lead capture for analytics
    try {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id: data.organization_id,
          metric_type: 'lead_captured',
          metric_value: 1,
          dimensions: {
            lead_id: lead?.id,
            source: data.source,
            landing_page_id: data.landing_page_id,
            utm_source: data.utm_parameters?.utm_source,
            utm_medium: data.utm_parameters?.utm_medium,
            utm_campaign: data.utm_parameters?.utm_campaign
          }
        })
    } catch (metricsError) {
      console.warn('Failed to track lead capture metrics:', metricsError)
    }

    // If landing page ID provided, track conversion
    if (data.landing_page_id) {
      try {
        const { data: landingPage } = await supabase
          .from('landing_pages')
          .select('conversion_count')
          .eq('id', data.landing_page_id)
          .single()

        if (landingPage) {
          await supabase
            .from('landing_pages')
            .update({ 
              conversion_count: (landingPage.conversion_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', data.landing_page_id)
        }
      } catch (conversionError) {
        console.warn('Failed to track landing page conversion:', conversionError)
      }
    }

    return NextResponse.json({
      data: lead,
      message: 'Lead captured successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Lead capture POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// PUT /api/marketing/leads
// Batch update leads (mark as contacted, change status, etc.)
// ================================================

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { lead_ids, updates, organization_id } = body

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid lead IDs array' },
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

    // Get leads to verify they exist and belong to organization
    const { data: leads } = await supabase
      .from('lead_captures')
      .select('id, email')
      .in('id', lead_ids)
      .eq('organization_id', organization_id)

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads found' },
        { status: 404 }
      )
    }

    // Batch update
    const updatePromises = leads.map(lead =>
      leadCaptureUtils.update(lead.id, updates)
    )

    const results = await Promise.allSettled(updatePromises)
    
    const successful = results
      .map((result, index) => ({
        id: leads[index].id,
        email: leads[index].email,
        success: result.status === 'fulfilled' && !result.value.error,
        data: result.status === 'fulfilled' ? result.value.data : null,
        error: result.status === 'rejected' || result.value.error ? 
          (result.status === 'rejected' ? result.reason : result.value.error?.message) : null
      }))

    return NextResponse.json({
      results: successful,
      summary: {
        total_attempted: leads.length,
        successful: successful.filter(r => r.success).length,
        failed: successful.filter(r => !r.success).length
      },
      message: 'Batch update completed'
    })

  } catch (error) {
    console.error('Leads batch PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// DELETE /api/marketing/leads
// Batch delete leads (GDPR compliance)
// ================================================

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { lead_ids, organization_id, reason } = body

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid lead IDs array' },
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

    // Get leads to verify they exist
    const { data: leads } = await supabase
      .from('lead_captures')
      .select('id, email')
      .in('id', lead_ids)
      .eq('organization_id', organization_id)

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads found' },
        { status: 404 }
      )
    }

    // Log deletion for audit trail (GDPR compliance)
    try {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id,
          metric_type: 'leads_deleted',
          metric_value: leads.length,
          dimensions: {
            deleted_by: user.id,
            reason: reason || 'batch_deletion',
            lead_emails: leads.map(l => l.email)
          }
        })
    } catch (auditError) {
      console.warn('Failed to log lead deletion audit:', auditError)
    }

    // Delete leads
    const deletePromises = leads.map(lead => leadCaptureUtils.delete(lead.id))
    const results = await Promise.allSettled(deletePromises)
    
    const successful = results
      .map((result, index) => ({
        id: leads[index].id,
        email: leads[index].email,
        success: result.status === 'fulfilled' && result.value.success,
        error: result.status === 'rejected' || !result.value.success ? 
          (result.status === 'rejected' ? result.reason : 'Deletion failed') : null
      }))

    return NextResponse.json({
      results: successful,
      summary: {
        total_attempted: leads.length,
        successful: successful.filter(r => r.success).length,
        failed: successful.filter(r => !r.success).length
      },
      message: 'Batch deletion completed'
    })

  } catch (error) {
    console.error('Leads batch DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}