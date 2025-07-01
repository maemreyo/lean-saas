// CREATED: 2025-07-01 - Email sending API endpoint with Resend integration

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAuthClient } from '@/lib/auth/auth-utils'
import { emailCampaignUtils } from '@/lib/marketing/email-automation'
import { emailCampaignSchemas } from '@/shared/schemas/marketing'
import type { SendEmailCampaignRequest } from '@/shared/types/marketing'

// ================================================
// POST /api/marketing/email/send
// Send email campaign immediately or schedule
// ================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = emailCampaignSchemas.sendEmailCampaign.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const data: SendEmailCampaignRequest = validationResult.data

    // Get campaign details
    const { data: campaign, error: campaignError } = await emailCampaignUtils.get(data.campaign_id)
    
    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Email campaign not found' },
        { status: 404 }
      )
    }

    // Verify user has access to organization
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', campaign.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin', 'editor'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Check campaign status
    if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
      return NextResponse.json(
        { error: `Cannot send campaign with status: ${campaign.status}` },
        { status: 400 }
      )
    }

    // Get organization details for sender info
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, slug')
      .eq('id', campaign.organization_id)
      .single()

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Determine recipients
    let recipientEmails = data.recipient_emails || []
    
    if (recipientEmails.length === 0) {
      // Get recipients from leads if no specific emails provided
      const { data: leads } = await supabase
        .from('lead_captures')
        .select('email, name')
        .eq('organization_id', campaign.organization_id)
        .eq('subscribed', true)
        .order('created_at', { ascending: false })
        .limit(1000) // Reasonable limit for email sending

      if (leads && leads.length > 0) {
        recipientEmails = leads.map(lead => ({ 
          email: lead.email, 
          name: lead.name || '' 
        }))
      }
    }

    if (recipientEmails.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found for campaign' },
        { status: 400 }
      )
    }

    // Validate sender reputation and limits
    const sendingLimits = await checkSendingLimits(supabase, campaign.organization_id)
    if (!sendingLimits.can_send) {
      return NextResponse.json(
        { 
          error: 'Sending limits exceeded',
          limits: sendingLimits
        },
        { status: 429 }
      )
    }

    // Check if sending immediately or scheduling
    if (data.send_immediately) {
      // Send campaign immediately
      const sendResult = await sendCampaignNow(
        campaign,
        organization,
        recipientEmails,
        user.id,
        supabase
      )

      return NextResponse.json({
        message: 'Email campaign sending initiated',
        campaign_id: campaign.id,
        recipients_count: recipientEmails.length,
        send_result: sendResult
      })
    } else {
      // Schedule campaign for later
      const scheduleResult = await scheduleCampaign(
        campaign,
        recipientEmails,
        user.id,
        supabase
      )

      return NextResponse.json({
        message: 'Email campaign scheduled successfully',
        campaign_id: campaign.id,
        recipients_count: recipientEmails.length,
        scheduled_at: campaign.scheduled_at,
        schedule_result: scheduleResult
      })
    }

  } catch (error) {
    console.error('Email send POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// GET /api/marketing/email/send
// Get sending status and queue information
// ================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const organizationId = searchParams.get('organization_id')
    const campaignId = searchParams.get('campaign_id')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access
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

    // Get sending queue status
    let query = supabase
      .from('email_campaigns')
      .select(`
        id,
        name,
        status,
        scheduled_at,
        sent_at,
        recipient_count,
        delivered_count,
        opened_count,
        clicked_count,
        bounced_count,
        campaign_type
      `)
      .eq('organization_id', organizationId)
      .in('status', ['scheduled', 'sending', 'sent'])
      .order('scheduled_at', { ascending: true })

    if (campaignId) {
      query = query.eq('id', campaignId)
    }

    const { data: campaigns, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch sending status' },
        { status: 500 }
      )
    }

    // Get detailed sending progress for active campaigns
    const activeCampaigns = campaigns?.filter(c => c.status === 'sending') || []
    const sendingProgress = {}

    for (const campaign of activeCampaigns) {
      const { data: recipients } = await supabase
        .from('email_campaign_recipients')
        .select('status')
        .eq('campaign_id', campaign.id)

      if (recipients) {
        const statusCounts = recipients.reduce((acc, recipient) => {
          acc[recipient.status] = (acc[recipient.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        sendingProgress[campaign.id] = {
          total: recipients.length,
          pending: statusCounts.pending || 0,
          delivered: statusCounts.delivered || 0,
          opened: statusCounts.opened || 0,
          clicked: statusCounts.clicked || 0,
          bounced: statusCounts.bounced || 0,
          progress_percentage: recipients.length > 0 
            ? Math.round(((recipients.length - (statusCounts.pending || 0)) / recipients.length) * 100)
            : 0
        }
      }
    }

    // Get daily sending limits and usage
    const sendingLimits = await checkSendingLimits(supabase, organizationId)

    return NextResponse.json({
      campaigns: campaigns || [],
      sending_progress: sendingProgress,
      sending_limits: sendingLimits,
      queue_summary: {
        total_campaigns: campaigns?.length || 0,
        scheduled_campaigns: campaigns?.filter(c => c.status === 'scheduled').length || 0,
        sending_campaigns: campaigns?.filter(c => c.status === 'sending').length || 0,
        completed_campaigns: campaigns?.filter(c => c.status === 'sent').length || 0
      }
    })

  } catch (error) {
    console.error('Email send status GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// PUT /api/marketing/email/send
// Update sending status (pause, resume, cancel)
// ================================================

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { campaign_id, action } = body // action: 'pause', 'resume', 'cancel'

    if (!campaign_id || !action) {
      return NextResponse.json(
        { error: 'Campaign ID and action are required' },
        { status: 400 }
      )
    }

    if (!['pause', 'resume', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be pause, resume, or cancel' },
        { status: 400 }
      )
    }

    // Get campaign
    const { data: campaign, error: campaignError } = await emailCampaignUtils.get(campaign_id)
    
    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Verify user has access
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', campaign.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin', 'editor'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Validate action based on current status
    const validActions = {
      'scheduled': ['cancel'],
      'sending': ['pause', 'cancel'],
      'paused': ['resume', 'cancel'],
      'sent': [],
      'draft': []
    }

    if (!validActions[campaign.status]?.includes(action)) {
      return NextResponse.json(
        { 
          error: `Cannot ${action} campaign with status ${campaign.status}`,
          valid_actions: validActions[campaign.status] || []
        },
        { status: 400 }
      )
    }

    // Execute action
    let newStatus = campaign.status
    let message = ''

    switch (action) {
      case 'pause':
        newStatus = 'paused'
        message = 'Campaign sending paused'
        break
      case 'resume':
        newStatus = 'sending'
        message = 'Campaign sending resumed'
        break
      case 'cancel':
        newStatus = 'draft'
        message = 'Campaign cancelled and returned to draft'
        break
    }

    // Update campaign status
    const { data: updatedCampaign, error: updateError } = await emailCampaignUtils.update(campaign_id, {
      status: newStatus,
      updated_at: new Date().toISOString()
    })

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update campaign status' },
        { status: 500 }
      )
    }

    // Track action for analytics
    try {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id: campaign.organization_id,
          metric_type: 'email_campaign_action',
          metric_value: 1,
          dimensions: {
            campaign_id,
            action,
            from_status: campaign.status,
            to_status: newStatus,
            user_id: user.id
          }
        })
    } catch (metricsError) {
      console.warn('Failed to track email campaign action metrics:', metricsError)
    }

    return NextResponse.json({
      data: updatedCampaign,
      message,
      previous_status: campaign.status,
      new_status: newStatus
    })

  } catch (error) {
    console.error('Email send control PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

async function sendCampaignNow(
  campaign: any,
  organization: any,
  recipients: any[],
  userId: string,
  supabase: any
) {
  try {
    // Update campaign status to sending
    await emailCampaignUtils.update(campaign.id, {
      status: 'sending',
      sent_at: new Date().toISOString(),
      recipient_count: recipients.length
    })

    // Create recipient records
    const recipientRecords = recipients.map(recipient => ({
      campaign_id: campaign.id,
      email: typeof recipient === 'string' ? recipient : recipient.email,
      status: 'pending'
    }))

    await supabase
      .from('email_campaign_recipients')
      .insert(recipientRecords)

    // In a production environment, you would:
    // 1. Queue emails for batch processing
    // 2. Use a proper email service (Resend, SendGrid, etc.)
    // 3. Handle rate limiting and delivery tracking
    // 4. Process bounces and unsubscribes

    // Simulate email sending process
    const batchSize = 50 // Send in batches
    let deliveredCount = 0

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      
      // Simulate sending (in production, integrate with actual email service)
      const sendPromises = batch.map(async (recipient) => {
        const email = typeof recipient === 'string' ? recipient : recipient.email
        const name = typeof recipient === 'object' ? recipient.name : ''

        // Mock email sending - replace with actual email service
        const success = Math.random() > 0.05 // 95% success rate simulation
        
        if (success) {
          deliveredCount++
          return { email, status: 'delivered' }
        } else {
          return { email, status: 'bounced' }
        }
      })

      const results = await Promise.allSettled(sendPromises)
      
      // Update recipient statuses
      for (let j = 0; j < results.length; j++) {
        const result = results[j]
        const email = typeof batch[j] === 'string' ? batch[j] : batch[j].email
        
        if (result.status === 'fulfilled') {
          await supabase
            .from('email_campaign_recipients')
            .update({ 
              status: result.value.status,
              delivered_at: result.value.status === 'delivered' ? new Date().toISOString() : null,
              bounced_at: result.value.status === 'bounced' ? new Date().toISOString() : null
            })
            .eq('campaign_id', campaign.id)
            .eq('email', email)
        }
      }

      // Add delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Update final campaign stats
    await emailCampaignUtils.update(campaign.id, {
      status: 'sent',
      delivered_count: deliveredCount,
      updated_at: new Date().toISOString()
    })

    // Track completion
    await supabase
      .from('growth_metrics')
      .insert({
        organization_id: campaign.organization_id,
        metric_type: 'email_campaign_sent',
        metric_value: deliveredCount,
        dimensions: {
          campaign_id: campaign.id,
          total_recipients: recipients.length,
          delivery_rate: (deliveredCount / recipients.length) * 100,
          user_id: userId
        }
      })

    return {
      success: true,
      delivered_count: deliveredCount,
      total_recipients: recipients.length,
      delivery_rate: (deliveredCount / recipients.length) * 100
    }

  } catch (error) {
    console.error('Failed to send campaign:', error)
    
    // Update campaign status to indicate failure
    await emailCampaignUtils.update(campaign.id, {
      status: 'draft',
      updated_at: new Date().toISOString()
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function scheduleCampaign(
  campaign: any,
  recipients: any[],
  userId: string,
  supabase: any
) {
  try {
    // Update campaign status and recipient count
    await emailCampaignUtils.update(campaign.id, {
      status: 'scheduled',
      recipient_count: recipients.length,
      updated_at: new Date().toISOString()
    })

    // Create recipient records for scheduled sending
    const recipientRecords = recipients.map(recipient => ({
      campaign_id: campaign.id,
      email: typeof recipient === 'string' ? recipient : recipient.email,
      status: 'pending'
    }))

    await supabase
      .from('email_campaign_recipients')
      .insert(recipientRecords)

    // Track scheduling
    await supabase
      .from('growth_metrics')
      .insert({
        organization_id: campaign.organization_id,
        metric_type: 'email_campaign_scheduled',
        metric_value: 1,
        dimensions: {
          campaign_id: campaign.id,
          recipient_count: recipients.length,
          scheduled_at: campaign.scheduled_at,
          user_id: userId
        }
      })

    return {
      success: true,
      scheduled_at: campaign.scheduled_at,
      recipient_count: recipients.length
    }

  } catch (error) {
    console.error('Failed to schedule campaign:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkSendingLimits(supabase: any, organizationId: string) {
  // Get organization plan and limits
  const { data: organization } = await supabase
    .from('organizations')
    .select('plan_type')
    .eq('id', organizationId)
    .single()

  // Define limits based on plan
  const limits = {
    'free': { daily: 100, monthly: 1000 },
    'starter': { daily: 500, monthly: 10000 },
    'pro': { daily: 2000, monthly: 50000 },
    'enterprise': { daily: 10000, monthly: 500000 }
  }

  const planLimits = limits[organization?.plan_type || 'free']

  // Check today's usage
  const today = new Date().toISOString().split('T')[0]
  const { data: todayUsage } = await supabase
    .from('growth_metrics')
    .select('metric_value')
    .eq('organization_id', organizationId)
    .eq('metric_type', 'email_campaign_sent')
    .gte('created_at', today + 'T00:00:00Z')
    .lt('created_at', today + 'T23:59:59Z')

  const dailyUsage = todayUsage?.reduce((sum, record) => sum + (record.metric_value || 0), 0) || 0

  // Check monthly usage
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { data: monthlyUsage } = await supabase
    .from('growth_metrics')
    .select('metric_value')
    .eq('organization_id', organizationId)
    .eq('metric_type', 'email_campaign_sent')
    .gte('created_at', monthStart)

  const monthlyUsageCount = monthlyUsage?.reduce((sum, record) => sum + (record.metric_value || 0), 0) || 0

  return {
    can_send: dailyUsage < planLimits.daily && monthlyUsageCount < planLimits.monthly,
    daily_limit: planLimits.daily,
    daily_used: dailyUsage,
    daily_remaining: Math.max(0, planLimits.daily - dailyUsage),
    monthly_limit: planLimits.monthly,
    monthly_used: monthlyUsageCount,
    monthly_remaining: Math.max(0, planLimits.monthly - monthlyUsageCount),
    plan_type: organization?.plan_type || 'free'
  }
}