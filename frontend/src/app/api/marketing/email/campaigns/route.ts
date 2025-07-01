// CREATED: 2025-07-01 - Email campaigns management API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAuthClient } from '@/lib/auth/auth-utils'
import { emailCampaignUtils } from '@/lib/marketing/email-automation'
import { emailCampaignSchemas } from '@/shared/schemas/marketing'
import type { CreateEmailCampaignRequest } from '@/shared/types/marketing'

// ================================================
// GET /api/marketing/email/campaigns
// List email campaigns
// ================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const organizationId = searchParams.get('organization_id')
    const status = searchParams.get('status')
    const campaignType = searchParams.get('campaign_type')
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

    // Fetch email campaigns
    const { data: campaigns, count, error } = await emailCampaignUtils.list(organizationId, {
      status,
      campaign_type: campaignType,
      limit,
      offset
    })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch email campaigns' },
        { status: 500 }
      )
    }

    let response: any = {
      data: campaigns || [],
      count: count || 0,
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    }

    // Include detailed stats if requested
    if (includeStats && campaigns && campaigns.length > 0) {
      const campaignIds = campaigns.map(c => c.id)
      
      // Get recipient stats
      const { data: recipientStats } = await supabase
        .from('email_campaign_recipients')
        .select('campaign_id, status')
        .in('campaign_id', campaignIds)

      // Group stats by campaign
      const statsMap = {}
      recipientStats?.forEach(recipient => {
        const campaignId = recipient.campaign_id
        if (!statsMap[campaignId]) {
          statsMap[campaignId] = {
            total_recipients: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            unsubscribed: 0,
            delivery_rate: 0,
            open_rate: 0,
            click_rate: 0,
            click_to_open_rate: 0,
            bounce_rate: 0,
            unsubscribe_rate: 0
          }
        }

        const stats = statsMap[campaignId]
        stats.total_recipients++

        switch (recipient.status) {
          case 'delivered':
            stats.delivered++
            break
          case 'opened':
            stats.delivered++
            stats.opened++
            break
          case 'clicked':
            stats.delivered++
            stats.opened++
            stats.clicked++
            break
          case 'bounced':
            stats.bounced++
            break
          case 'unsubscribed':
            stats.unsubscribed++
            break
        }
      })

      // Calculate rates for each campaign
      Object.keys(statsMap).forEach(campaignId => {
        const stats = statsMap[campaignId]
        if (stats.total_recipients > 0) {
          stats.delivery_rate = (stats.delivered / stats.total_recipients) * 100
          stats.bounce_rate = (stats.bounced / stats.total_recipients) * 100
          stats.unsubscribe_rate = (stats.unsubscribed / stats.total_recipients) * 100
        }
        if (stats.delivered > 0) {
          stats.open_rate = (stats.opened / stats.delivered) * 100
          stats.click_rate = (stats.clicked / stats.delivered) * 100
        }
        if (stats.opened > 0) {
          stats.click_to_open_rate = (stats.clicked / stats.opened) * 100
        }
      })

      // Add stats to campaigns
      response.data = response.data.map(campaign => ({
        ...campaign,
        stats: statsMap[campaign.id] || {
          total_recipients: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0,
          delivery_rate: 0,
          open_rate: 0,
          click_rate: 0,
          click_to_open_rate: 0,
          bounce_rate: 0,
          unsubscribe_rate: 0
        }
      }))

      // Overall program stats
      const overallStats = Object.values(statsMap).reduce((acc: any, stats: any) => ({
        total_campaigns: (campaigns || []).length,
        total_recipients: acc.total_recipients + stats.total_recipients,
        total_delivered: acc.total_delivered + stats.delivered,
        total_opened: acc.total_opened + stats.opened,
        total_clicked: acc.total_clicked + stats.clicked,
        total_bounced: acc.total_bounced + stats.bounced,
        total_unsubscribed: acc.total_unsubscribed + stats.unsubscribed
      }), {
        total_campaigns: 0,
        total_recipients: 0,
        total_delivered: 0,
        total_opened: 0,
        total_clicked: 0,
        total_bounced: 0,
        total_unsubscribed: 0
      })

      // Calculate overall rates
      if (overallStats.total_recipients > 0) {
        overallStats.overall_delivery_rate = (overallStats.total_delivered / overallStats.total_recipients) * 100
        overallStats.overall_bounce_rate = (overallStats.total_bounced / overallStats.total_recipients) * 100
      }
      if (overallStats.total_delivered > 0) {
        overallStats.overall_open_rate = (overallStats.total_opened / overallStats.total_delivered) * 100
        overallStats.overall_click_rate = (overallStats.total_clicked / overallStats.total_delivered) * 100
      }

      response.program_stats = overallStats
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Email campaigns GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// POST /api/marketing/email/campaigns
// Create new email campaign
// ================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = emailCampaignSchemas.createEmailCampaign.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const data: CreateEmailCampaignRequest = validationResult.data

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

    // Validate email content for spam indicators
    const spamCheck = validateEmailContent(data.content, data.subject)
    if (spamCheck.risk_level === 'high') {
      return NextResponse.json(
        { 
          error: 'Email content may be flagged as spam',
          warnings: spamCheck.warnings,
          suggestions: spamCheck.suggestions
        },
        { status: 400 }
      )
    }

    // Create email campaign
    const { data: campaign, error: createError } = await emailCampaignUtils.create({
      ...data,
      created_by: user.id
    })

    if (createError) {
      console.error('Failed to create email campaign:', createError)
      return NextResponse.json(
        { error: 'Failed to create email campaign' },
        { status: 500 }
      )
    }

    // Track creation for analytics
    try {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id: data.organization_id,
          metric_type: 'email_campaign_created',
          metric_value: 1,
          dimensions: {
            campaign_id: campaign?.id,
            campaign_type: data.campaign_type,
            has_schedule: !!data.scheduled_at,
            user_id: user.id,
            spam_risk: spamCheck.risk_level
          }
        })
    } catch (metricsError) {
      console.warn('Failed to track email campaign creation metrics:', metricsError)
    }

    return NextResponse.json({
      data: campaign,
      spam_check: spamCheck,
      message: 'Email campaign created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Email campaign POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// PUT /api/marketing/email/campaigns
// Bulk update email campaigns
// ================================================

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { campaign_ids, updates, organization_id } = body

    if (!Array.isArray(campaign_ids) || campaign_ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid campaign IDs array' },
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

    // Get campaigns to verify they exist and belong to organization
    const { data: campaigns } = await supabase
      .from('email_campaigns')
      .select('id, name, status')
      .in('id', campaign_ids)
      .eq('organization_id', organization_id)

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json(
        { error: 'No email campaigns found' },
        { status: 404 }
      )
    }

    // Check for status transition validity
    if (updates.status) {
      const invalidTransitions = campaigns.filter(campaign => {
        return !isValidStatusTransition(campaign.status, updates.status)
      })

      if (invalidTransitions.length > 0) {
        return NextResponse.json(
          { 
            error: 'Invalid status transitions detected',
            invalid_campaigns: invalidTransitions.map(c => ({ id: c.id, name: c.name, current_status: c.status }))
          },
          { status: 400 }
        )
      }
    }

    // Batch update
    const updatePromises = campaigns.map(campaign =>
      emailCampaignUtils.update(campaign.id, updates)
    )

    const results = await Promise.allSettled(updatePromises)
    
    const successful = results
      .map((result, index) => ({
        id: campaigns[index].id,
        name: campaigns[index].name,
        success: result.status === 'fulfilled' && !result.value.error,
        data: result.status === 'fulfilled' ? result.value.data : null,
        error: result.status === 'rejected' || result.value.error ? 
          (result.status === 'rejected' ? result.reason : result.value.error?.message) : null
      }))

    return NextResponse.json({
      results: successful,
      summary: {
        total_attempted: campaigns.length,
        successful: successful.filter(r => r.success).length,
        failed: successful.filter(r => !r.success).length
      },
      message: 'Bulk campaign update completed'
    })

  } catch (error) {
    console.error('Email campaigns bulk PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// DELETE /api/marketing/email/campaigns
// Delete email campaigns
// ================================================

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { campaign_ids, organization_id } = body

    if (!Array.isArray(campaign_ids) || campaign_ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid campaign IDs array' },
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

    // Get campaigns to verify they exist
    const { data: campaigns } = await supabase
      .from('email_campaigns')
      .select('id, name, status, recipient_count')
      .in('id', campaign_ids)
      .eq('organization_id', organization_id)

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json(
        { error: 'No email campaigns found' },
        { status: 404 }
      )
    }

    // Cannot delete campaigns that are currently sending
    const sendingCampaigns = campaigns.filter(campaign => campaign.status === 'sending')
    if (sendingCampaigns.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete campaigns that are currently sending',
          sending_campaigns: sendingCampaigns.map(c => ({ id: c.id, name: c.name }))
        },
        { status: 400 }
      )
    }

    // Delete campaigns
    const deletePromises = campaigns.map(campaign => emailCampaignUtils.delete(campaign.id))
    const results = await Promise.allSettled(deletePromises)
    
    const successful = results
      .map((result, index) => ({
        id: campaigns[index].id,
        name: campaigns[index].name,
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
            metric_type: 'email_campaigns_deleted',
            metric_value: successfulCount,
            dimensions: {
              total_attempted: campaigns.length,
              user_id: user.id
            }
          })
      }
    } catch (metricsError) {
      console.warn('Failed to track email campaign deletion metrics:', metricsError)
    }

    return NextResponse.json({
      results: successful,
      summary: {
        total_attempted: campaigns.length,
        successful: successful.filter(r => r.success).length,
        failed: successful.filter(r => !r.success).length
      },
      message: 'Email campaign deletion completed'
    })

  } catch (error) {
    console.error('Email campaigns DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

function validateEmailContent(content: string, subject: string) {
  const validation = {
    risk_level: 'low' as 'low' | 'medium' | 'high',
    warnings: [] as string[],
    suggestions: [] as string[]
  }

  // Check for spam trigger words
  const spamWords = [
    'free', 'urgent', 'act now', 'limited time', 'click here',
    'buy now', 'order now', 'discount', 'save money', 'cheap',
    'winner', 'congratulations', 'selected', 'earn money'
  ]

  const contentLower = (content + ' ' + subject).toLowerCase()
  const foundSpamWords = spamWords.filter(word => contentLower.includes(word))

  if (foundSpamWords.length > 3) {
    validation.risk_level = 'high'
    validation.warnings.push(`Contains ${foundSpamWords.length} potential spam trigger words`)
  } else if (foundSpamWords.length > 1) {
    validation.risk_level = 'medium'
    validation.warnings.push(`Contains ${foundSpamWords.length} potential spam trigger words`)
  }

  // Check for excessive capitalization
  const capsRatio = (subject.match(/[A-Z]/g) || []).length / subject.length
  if (capsRatio > 0.5) {
    validation.risk_level = validation.risk_level === 'high' ? 'high' : 'medium'
    validation.warnings.push('Subject line has excessive capitalization')
  }

  // Check for excessive exclamation marks
  const exclamationCount = (subject.match(/!/g) || []).length
  if (exclamationCount > 2) {
    validation.warnings.push('Too many exclamation marks in subject')
  }

  // Generate suggestions
  if (validation.warnings.length > 0) {
    validation.suggestions.push('Consider revising language to be more professional')
    validation.suggestions.push('Test with spam checker tools before sending')
    validation.suggestions.push('Ensure proper sender authentication (SPF, DKIM)')
  }

  return validation
}

function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const transitions = {
    'draft': ['scheduled', 'sending'],
    'scheduled': ['draft', 'sending', 'paused'],
    'sending': ['sent', 'paused'],
    'sent': [], // Cannot transition from sent
    'paused': ['sending', 'draft']
  }

  return transitions[currentStatus]?.includes(newStatus) || false
}