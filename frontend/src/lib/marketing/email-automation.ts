// Email Automation utilities for Marketing & Growth Module
// Following patterns from billing module utilities

import { supabase } from '@/lib/supabase'
import { 
  EmailCampaign, 
  EmailCampaignInsert, 
  EmailCampaignUpdate,
  EmailCampaignRecipient,
  CreateEmailCampaignRequest,
  UpdateEmailCampaignRequest,
  SendEmailCampaignRequest,
  EmailCampaignSettings,
  EmailCampaignAnalytics
} from '@/types/marketing'
import { 
  createEmailCampaignSchema,
  updateEmailCampaignSchema,
  sendEmailCampaignSchema 
} from '@/schemas/marketing'
import { createError, handleSupabaseError } from '@/lib/utils'

// ================================================
// EMAIL CAMPAIGN MANAGEMENT
// ================================================

/**
 * Create a new email campaign
 */
export const createEmailCampaign = async (
  data: CreateEmailCampaignRequest
): Promise<{ data: EmailCampaign | null; error: Error | null }> => {
  try {
    // Validate input data
    const validation = createEmailCampaignSchema.safeParse(data)
    if (!validation.success) {
      return { 
        data: null, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Create email campaign
    const { data: emailCampaign, error } = await supabase
      .from('email_campaigns')
      .insert({
        organization_id: data.organization_id,
        name: data.name,
        subject: data.subject,
        content: data.content,
        campaign_type: data.campaign_type,
        scheduled_at: data.scheduled_at,
        settings: data.settings || {},
        status: 'draft',
        recipient_count: 0,
        delivered_count: 0,
        opened_count: 0,
        clicked_count: 0,
        bounced_count: 0,
        unsubscribed_count: 0
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: emailCampaign, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to create email campaign', error) 
    }
  }
}

/**
 * Update an email campaign
 */
export const updateEmailCampaign = async (
  id: string,
  data: UpdateEmailCampaignRequest
): Promise<{ data: EmailCampaign | null; error: Error | null }> => {
  try {
    // Validate input data
    const validation = updateEmailCampaignSchema.safeParse(data)
    if (!validation.success) {
      return { 
        data: null, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Update email campaign
    const { data: emailCampaign, error } = await supabase
      .from('email_campaigns')
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

    return { data: emailCampaign, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to update email campaign', error) 
    }
  }
}

/**
 * Delete an email campaign
 */
export const deleteEmailCampaign = async (
  id: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Only allow deletion of draft campaigns
    const { data: campaign } = await supabase
      .from('email_campaigns')
      .select('status')
      .eq('id', id)
      .single()

    if (campaign && campaign.status !== 'draft') {
      return { 
        success: false, 
        error: createError('Can only delete draft campaigns') 
      }
    }

    const { error } = await supabase
      .from('email_campaigns')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to delete email campaign', error) 
    }
  }
}

/**
 * Get email campaign by ID
 */
export const getEmailCampaign = async (
  id: string
): Promise<{ data: EmailCampaign | null; error: Error | null }> => {
  try {
    const { data: emailCampaign, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: emailCampaign, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get email campaign', error) 
    }
  }
}

/**
 * List email campaigns for an organization
 */
export const listEmailCampaigns = async (
  organizationId: string,
  options: {
    campaignType?: string
    status?: string
    limit?: number
    offset?: number
  } = {}
): Promise<{ 
  data: EmailCampaign[] | null; 
  count: number | null;
  error: Error | null 
}> => {
  try {
    let query = supabase
      .from('email_campaigns')
      .select('*, count', { count: 'exact' })
      .eq('organization_id', organizationId)

    // Apply filters
    if (options.campaignType) {
      query = query.eq('campaign_type', options.campaignType)
    }
    if (options.status) {
      query = query.eq('status', options.status)
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

    const { data: emailCampaigns, error, count } = await query

    if (error) {
      return { data: null, count: null, error: handleSupabaseError(error) }
    }

    return { data: emailCampaigns, count, error: null }
  } catch (error) {
    return { 
      data: null, 
      count: null,
      error: createError('Failed to list email campaigns', error) 
    }
  }
}

// ================================================
// CAMPAIGN SENDING
// ================================================

/**
 * Send an email campaign
 */
export const sendEmailCampaign = async (
  data: SendEmailCampaignRequest
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Validate input data
    const validation = sendEmailCampaignSchema.safeParse(data)
    if (!validation.success) {
      return { 
        success: false, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await getEmailCampaign(data.campaign_id)
    if (campaignError || !campaign) {
      return { success: false, error: campaignError || createError('Campaign not found') }
    }

    // Check if campaign can be sent
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return { 
        success: false, 
        error: createError('Campaign cannot be sent in current status') 
      }
    }

    // Get recipients
    let recipients: string[] = []
    
    if (data.recipient_emails && data.recipient_emails.length > 0) {
      recipients = data.recipient_emails
    } else {
      // Get all subscribed leads for the organization
      const { data: leads } = await supabase
        .from('lead_captures')
        .select('email')
        .eq('organization_id', campaign.organization_id)
        .eq('subscribed', true)

      recipients = leads?.map(lead => lead.email) || []
    }

    if (recipients.length === 0) {
      return { 
        success: false, 
        error: createError('No recipients found') 
      }
    }

    // Update campaign status
    const { error: updateError } = await supabase
      .from('email_campaigns')
      .update({
        status: data.send_immediately ? 'sending' : 'scheduled',
        recipient_count: recipients.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.campaign_id)

    if (updateError) {
      return { success: false, error: handleSupabaseError(updateError) }
    }

    // Create recipient records
    const recipientRecords = recipients.map(email => ({
      campaign_id: data.campaign_id,
      email,
      status: 'pending' as const
    }))

    const { error: recipientError } = await supabase
      .from('email_campaign_recipients')
      .insert(recipientRecords)

    if (recipientError) {
      return { success: false, error: handleSupabaseError(recipientError) }
    }

    // If sending immediately, trigger email processing
    if (data.send_immediately) {
      try {
        // Call edge function to process emails
        await supabase.functions.invoke('email-automation', {
          body: {
            action: 'send_campaign',
            campaign_id: data.campaign_id
          }
        })
      } catch (error) {
        console.warn('Failed to trigger email processing:', error)
      }
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to send email campaign', error) 
    }
  }
}

/**
 * Schedule an email campaign
 */
export const scheduleEmailCampaign = async (
  campaignId: string,
  scheduledAt: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('email_campaigns')
      .update({
        status: 'scheduled',
        scheduled_at: scheduledAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('status', 'draft') // Only allow scheduling from draft

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to schedule email campaign', error) 
    }
  }
}

/**
 * Pause a sending campaign
 */
export const pauseEmailCampaign = async (
  campaignId: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('email_campaigns')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .in('status', ['sending', 'scheduled'])

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to pause email campaign', error) 
    }
  }
}

// ================================================
// RECIPIENT MANAGEMENT
// ================================================

/**
 * Track email delivery
 */
export const trackEmailDelivery = async (
  campaignId: string,
  email: string,
  status: 'delivered' | 'bounced',
  metadata?: Record<string, any>
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const updateData: any = {
      status,
      metadata: metadata || {}
    }

    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    } else if (status === 'bounced') {
      updateData.bounced_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('email_campaign_recipients')
      .update(updateData)
      .eq('campaign_id', campaignId)
      .eq('email', email)

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    // Update campaign counters
    const counterField = status === 'delivered' ? 'delivered_count' : 'bounced_count'
    await supabase
      .from('email_campaigns')
      .update({
        [counterField]: supabase.sql`${counterField} + 1`
      })
      .eq('id', campaignId)

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to track email delivery', error) 
    }
  }
}

/**
 * Track email open
 */
export const trackEmailOpen = async (
  campaignId: string,
  email: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Check if already opened to avoid double counting
    const { data: recipient } = await supabase
      .from('email_campaign_recipients')
      .select('status')
      .eq('campaign_id', campaignId)
      .eq('email', email)
      .single()

    if (!recipient || recipient.status === 'opened') {
      return { success: true, error: null }
    }

    const { error } = await supabase
      .from('email_campaign_recipients')
      .update({
        status: 'opened',
        opened_at: new Date().toISOString(),
        metadata: metadata || {}
      })
      .eq('campaign_id', campaignId)
      .eq('email', email)

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    // Update campaign counter
    await supabase
      .from('email_campaigns')
      .update({
        opened_count: supabase.sql`opened_count + 1`
      })
      .eq('id', campaignId)

    // Track growth metric
    const { data: campaign } = await getEmailCampaign(campaignId)
    if (campaign) {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id: campaign.organization_id,
          metric_type: 'email_open',
          metric_value: 1,
          dimensions: {
            campaign_id: campaignId,
            campaign_type: campaign.campaign_type
          }
        })
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to track email open', error) 
    }
  }
}

/**
 * Track email click
 */
export const trackEmailClick = async (
  campaignId: string,
  email: string,
  url: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('email_campaign_recipients')
      .update({
        status: 'clicked',
        clicked_at: new Date().toISOString(),
        metadata: { ...metadata, clicked_url: url }
      })
      .eq('campaign_id', campaignId)
      .eq('email', email)

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    // Update campaign counter
    await supabase
      .from('email_campaigns')
      .update({
        clicked_count: supabase.sql`clicked_count + 1`
      })
      .eq('id', campaignId)

    // Track growth metric
    const { data: campaign } = await getEmailCampaign(campaignId)
    if (campaign) {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id: campaign.organization_id,
          metric_type: 'email_click',
          metric_value: 1,
          dimensions: {
            campaign_id: campaignId,
            campaign_type: campaign.campaign_type,
            clicked_url: url
          }
        })
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to track email click', error) 
    }
  }
}

/**
 * Track email unsubscribe
 */
export const trackEmailUnsubscribe = async (
  campaignId: string,
  email: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('email_campaign_recipients')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString()
      })
      .eq('campaign_id', campaignId)
      .eq('email', email)

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    // Update campaign counter
    await supabase
      .from('email_campaigns')
      .update({
        unsubscribed_count: supabase.sql`unsubscribed_count + 1`
      })
      .eq('id', campaignId)

    // Also unsubscribe from lead captures
    const { data: campaign } = await getEmailCampaign(campaignId)
    if (campaign) {
      await supabase
        .from('lead_captures')
        .update({
          subscribed: false,
          unsubscribed_at: new Date().toISOString()
        })
        .eq('organization_id', campaign.organization_id)
        .eq('email', email)
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to track email unsubscribe', error) 
    }
  }
}

// ================================================
// ANALYTICS
// ================================================

/**
 * Get email campaign analytics
 */
export const getEmailCampaignAnalytics = async (
  campaignId: string
): Promise<{ data: EmailCampaignAnalytics | null; error: Error | null }> => {
  try {
    const { data: campaign, error: campaignError } = await getEmailCampaign(campaignId)
    if (campaignError || !campaign) {
      return { data: null, error: campaignError || createError('Campaign not found') }
    }

    const sentCount = campaign.recipient_count || 0
    const deliveredCount = campaign.delivered_count || 0
    const openedCount = campaign.opened_count || 0
    const clickedCount = campaign.clicked_count || 0
    const bouncedCount = campaign.bounced_count || 0
    const unsubscribedCount = campaign.unsubscribed_count || 0

    const deliveryRate = sentCount > 0 ? (deliveredCount / sentCount) * 100 : 0
    const openRate = deliveredCount > 0 ? (openedCount / deliveredCount) * 100 : 0
    const clickRate = deliveredCount > 0 ? (clickedCount / deliveredCount) * 100 : 0
    const clickToOpenRate = openedCount > 0 ? (clickedCount / openedCount) * 100 : 0
    const bounceRate = sentCount > 0 ? (bouncedCount / sentCount) * 100 : 0
    const unsubscribeRate = deliveredCount > 0 ? (unsubscribedCount / deliveredCount) * 100 : 0

    const analytics: EmailCampaignAnalytics = {
      campaign_id: campaignId,
      sent_count: sentCount,
      delivered_count: deliveredCount,
      opened_count: openedCount,
      clicked_count: clickedCount,
      bounced_count: bouncedCount,
      unsubscribed_count: unsubscribedCount,
      delivery_rate: deliveryRate,
      open_rate: openRate,
      click_rate: clickRate,
      click_to_open_rate: clickToOpenRate,
      bounce_rate: bounceRate,
      unsubscribe_rate: unsubscribeRate
    }

    return { data: analytics, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get email campaign analytics', error) 
    }
  }
}

/**
 * Get organization email analytics
 */
export const getOrganizationEmailAnalytics = async (
  organizationId: string,
  period: 'day' | 'week' | 'month' = 'month'
): Promise<{ 
  data: {
    total_campaigns: number
    total_emails_sent: number
    average_open_rate: number
    average_click_rate: number
    average_unsubscribe_rate: number
    recent_campaigns: EmailCampaign[]
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

    // Get campaigns in period
    const { data: campaigns } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })

    const totalCampaigns = campaigns?.length || 0
    const totalEmailsSent = campaigns?.reduce((sum, c) => sum + (c.recipient_count || 0), 0) || 0

    // Calculate averages
    const sentCampaigns = campaigns?.filter(c => c.status === 'sent') || []
    const avgOpenRate = sentCampaigns.length > 0 
      ? sentCampaigns.reduce((sum, c) => {
          const rate = c.delivered_count > 0 ? (c.opened_count / c.delivered_count) * 100 : 0
          return sum + rate
        }, 0) / sentCampaigns.length
      : 0

    const avgClickRate = sentCampaigns.length > 0 
      ? sentCampaigns.reduce((sum, c) => {
          const rate = c.delivered_count > 0 ? (c.clicked_count / c.delivered_count) * 100 : 0
          return sum + rate
        }, 0) / sentCampaigns.length
      : 0

    const avgUnsubscribeRate = sentCampaigns.length > 0 
      ? sentCampaigns.reduce((sum, c) => {
          const rate = c.delivered_count > 0 ? (c.unsubscribed_count / c.delivered_count) * 100 : 0
          return sum + rate
        }, 0) / sentCampaigns.length
      : 0

    return {
      data: {
        total_campaigns: totalCampaigns,
        total_emails_sent: totalEmailsSent,
        average_open_rate: avgOpenRate,
        average_click_rate: avgClickRate,
        average_unsubscribe_rate: avgUnsubscribeRate,
        recent_campaigns: campaigns?.slice(0, 5) || []
      },
      error: null
    }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get organization email analytics', error) 
    }
  }
}

// ================================================
// TEMPLATES
// ================================================

/**
 * Get email template by type
 */
export const getEmailTemplate = (
  type: 'welcome' | 'newsletter' | 'promotional' | 'drip',
  data: {
    recipientName?: string
    organizationName: string
    unsubscribeUrl: string
    [key: string]: any
  }
): { subject: string; content: string } => {
  const templates = {
    welcome: {
      subject: `Welcome to ${data.organizationName}! 🎉`,
      content: `
        <h1>Welcome to ${data.organizationName}!</h1>
        <p>Hi ${data.recipientName || 'there'},</p>
        <p>We're thrilled to have you on board! Here's what you can expect:</p>
        <ul>
          <li>Quick setup in under 5 minutes</li>
          <li>Free onboarding support</li>
          <li>24/7 customer support</li>
        </ul>
        <a href="${data.onboardingUrl || '#'}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Get Started</a>
        <p>Best regards,<br>The ${data.organizationName} Team</p>
        <p><a href="${data.unsubscribeUrl}">Unsubscribe</a></p>
      `
    },
    newsletter: {
      subject: `${data.organizationName} Newsletter - ${data.subject || 'Latest Updates'}`,
      content: `
        <h1>${data.subject || 'Latest Updates'}</h1>
        <p>Hi ${data.recipientName || 'there'},</p>
        <p>${data.content || 'Here are the latest updates from our team.'}</p>
        <p>Best regards,<br>The ${data.organizationName} Team</p>
        <p><a href="${data.unsubscribeUrl}">Unsubscribe</a></p>
      `
    },
    promotional: {
      subject: `${data.subject || 'Special Offer'} - Limited Time!`,
      content: `
        <h1>${data.subject || 'Special Offer'}</h1>
        <p>Hi ${data.recipientName || 'there'},</p>
        <p>${data.content || 'We have a special offer just for you!'}</p>
        <a href="${data.ctaUrl || '#'}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">${data.ctaText || 'Claim Offer'}</a>
        <p>Best regards,<br>The ${data.organizationName} Team</p>
        <p><a href="${data.unsubscribeUrl}">Unsubscribe</a></p>
      `
    },
    drip: {
      subject: `${data.subject || 'Quick tip'} from ${data.organizationName}`,
      content: `
        <h1>${data.subject || 'Quick Tip'}</h1>
        <p>Hi ${data.recipientName || 'there'},</p>
        <p>${data.content || 'Here\'s a quick tip to help you get the most out of our service.'}</p>
        <p>Best regards,<br>The ${data.organizationName} Team</p>
        <p><a href="${data.unsubscribeUrl}">Unsubscribe</a></p>
      `
    }
  }

  return templates[type] || templates.newsletter
}

// Export all utilities
export const emailAutomationUtils = {
  create: createEmailCampaign,
  update: updateEmailCampaign,
  delete: deleteEmailCampaign,
  get: getEmailCampaign,
  list: listEmailCampaigns,
  send: sendEmailCampaign,
  schedule: scheduleEmailCampaign,
  pause: pauseEmailCampaign,
  trackDelivery: trackEmailDelivery,
  trackOpen: trackEmailOpen,
  trackClick: trackEmailClick,
  trackUnsubscribe: trackEmailUnsubscribe,
  getAnalytics: getEmailCampaignAnalytics,
  getOrgAnalytics: getOrganizationEmailAnalytics,
  getTemplate: getEmailTemplate
}