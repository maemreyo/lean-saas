// CREATED: 2025-07-01 - Email automation and campaign processing edge function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ================================================
// TYPES & INTERFACES
// ================================================

interface EmailAutomationTask {
  type: 'send_campaign' | 'process_drip' | 'trigger_sequence' | 'track_engagement' | 'cleanup_bounces'
  organizationId: string
  data?: Record<string, any>
  priority: 'low' | 'medium' | 'high'
  scheduledAt?: string
}

interface SendCampaignData {
  campaignId: string
  recipientEmails?: string[]
  sendImmediately?: boolean
  testMode?: boolean
}

interface DripSequenceData {
  sequenceId: string
  subscriberId: string
  triggerEvent: string
  delayHours?: number
}

interface EngagementTrackingData {
  campaignId: string
  email: string
  eventType: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed'
  eventData?: Record<string, any>
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlContent: string
  textContent: string
  variables: string[]
}

// ================================================
// SUPABASE CLIENT
// ================================================

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ================================================
// EMAIL SENDING UTILITIES
// ================================================

async function sendEmail(to: string, subject: string, html: string, text?: string) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'noreply@yourdomain.com', // Configure this
        to: [to],
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      })
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.error('Resend API error:', result)
      return { success: false, error: result.message || 'Failed to send email' }
    }

    return { success: true, data: result }
  } catch (error) {
    console.error('Email sending error:', error)
    return { success: false, error: error.message }
  }
}

async function renderEmailTemplate(template: EmailTemplate, variables: Record<string, any>) {
  let html = template.htmlContent
  let text = template.textContent
  let subject = template.subject

  // Replace variables in content
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    html = html.replace(new RegExp(placeholder, 'g'), String(value))
    text = text.replace(new RegExp(placeholder, 'g'), String(value))
    subject = subject.replace(new RegExp(placeholder, 'g'), String(value))
  }

  return { html, text, subject }
}

// ================================================
// CAMPAIGN SENDING
// ================================================

async function processSendCampaign(organizationId: string, data: SendCampaignData) {
  console.log(`Processing email campaign: ${data.campaignId}`)
  
  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', data.campaignId)
      .eq('organization_id', organizationId)
      .single()

    if (campaignError || !campaign) {
      return { success: false, error: 'Campaign not found' }
    }

    // Check if campaign is ready to send
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return { success: false, error: 'Campaign is not in sendable state' }
    }

    // Get recipients
    let recipients = []
    if (data.recipientEmails && data.recipientEmails.length > 0) {
      // Use provided email list
      recipients = data.recipientEmails.map(email => ({ email, name: null }))
    } else {
      // Get all active subscribers
      const { data: leads, error: leadsError } = await supabase
        .from('lead_captures')
        .select('email, name')
        .eq('organization_id', organizationId)
        .eq('subscribed', true)

      if (leadsError) {
        console.error('Error fetching recipients:', leadsError)
        return { success: false, error: leadsError.message }
      }

      recipients = leads || []
    }

    if (recipients.length === 0) {
      return { success: false, error: 'No recipients found' }
    }

    // Update campaign status
    await supabase
      .from('email_campaigns')
      .update({ 
        status: 'sending', 
        sent_at: new Date().toISOString(),
        recipient_count: recipients.length
      })
      .eq('id', data.campaignId)

    // Process recipients in batches
    const batchSize = 50
    let totalSent = 0
    let totalFailed = 0

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (recipient) => {
          try {
            // Personalize content
            const variables = {
              recipientName: recipient.name || 'Valued Customer',
              recipientEmail: recipient.email,
              unsubscribeUrl: `${supabaseUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}&campaign=${data.campaignId}`,
              organizationName: 'Your Company' // Get from organization table
            }

            // Render email with variables
            let html = campaign.content
            let subject = campaign.subject
            
            for (const [key, value] of Object.entries(variables)) {
              const placeholder = `{{${key}}}`
              html = html.replace(new RegExp(placeholder, 'g'), String(value))
              subject = subject.replace(new RegExp(placeholder, 'g'), String(value))
            }

            // Send email
            const result = await sendEmail(recipient.email, subject, html)

            // Track recipient
            const recipientRecord = {
              campaign_id: data.campaignId,
              email: recipient.email,
              status: result.success ? 'delivered' : 'failed',
              delivered_at: result.success ? new Date().toISOString() : null,
              error_message: result.success ? null : result.error,
              metadata: { resend_id: result.data?.id }
            }

            await supabase
              .from('email_campaign_recipients')
              .insert(recipientRecord)

            if (result.success) {
              totalSent++
            } else {
              totalFailed++
              console.error(`Failed to send to ${recipient.email}:`, result.error)
            }

          } catch (error) {
            totalFailed++
            console.error(`Error processing recipient ${recipient.email}:`, error)
          }
        })
      )

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Update campaign with final status
    const finalStatus = totalFailed === 0 ? 'sent' : totalSent > 0 ? 'partially_sent' : 'failed'
    await supabase
      .from('email_campaigns')
      .update({ 
        status: finalStatus,
        delivered_count: totalSent,
        failed_count: totalFailed
      })
      .eq('id', data.campaignId)

    console.log(`Campaign ${data.campaignId} processed: ${totalSent} sent, ${totalFailed} failed`)
    return { 
      success: true, 
      data: { 
        campaignId: data.campaignId,
        totalRecipients: recipients.length,
        totalSent,
        totalFailed,
        finalStatus
      }
    }

  } catch (error) {
    console.error('Campaign sending error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// DRIP SEQUENCES
// ================================================

async function processDripSequence(organizationId: string, data: DripSequenceData) {
  console.log(`Processing drip sequence: ${data.sequenceId} for subscriber: ${data.subscriberId}`)
  
  try {
    // Get drip sequence details
    const { data: sequence, error: sequenceError } = await supabase
      .from('drip_sequences')
      .select('*')
      .eq('id', data.sequenceId)
      .eq('organization_id', organizationId)
      .single()

    if (sequenceError || !sequence) {
      return { success: false, error: 'Drip sequence not found' }
    }

    // Get subscriber details
    const { data: subscriber, error: subscriberError } = await supabase
      .from('lead_captures')
      .select('*')
      .eq('id', data.subscriberId)
      .eq('organization_id', organizationId)
      .single()

    if (subscriberError || !subscriber || !subscriber.subscribed) {
      return { success: false, error: 'Subscriber not found or unsubscribed' }
    }

    // Get next email in sequence
    const { data: sequenceEmails, error: emailsError } = await supabase
      .from('drip_sequence_emails')
      .select('*')
      .eq('sequence_id', data.sequenceId)
      .order('step_number', { ascending: true })

    if (emailsError) {
      return { success: false, error: emailsError.message }
    }

    // Find the next email to send
    const { data: sentEmails } = await supabase
      .from('drip_sequence_sends')
      .select('step_number')
      .eq('sequence_id', data.sequenceId)
      .eq('subscriber_id', data.subscriberId)

    const sentSteps = new Set(sentEmails?.map(s => s.step_number) || [])
    const nextEmail = sequenceEmails?.find(email => !sentSteps.has(email.step_number))

    if (!nextEmail) {
      console.log(`No more emails in sequence ${data.sequenceId} for subscriber ${data.subscriberId}`)
      return { success: true, data: { message: 'Sequence completed' } }
    }

    // Check if it's time to send (if there's a delay)
    if (data.delayHours && data.delayHours > 0) {
      const lastSent = sentEmails?.reduce((latest, email) => {
        return !latest || email.created_at > latest ? email.created_at : latest
      }, null)

      if (lastSent) {
        const hoursSinceLastSent = (new Date().getTime() - new Date(lastSent).getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastSent < data.delayHours) {
          return { success: true, data: { message: 'Waiting for delay period' } }
        }
      }
    }

    // Personalize and send email
    const variables = {
      recipientName: subscriber.name || 'Valued Customer',
      recipientEmail: subscriber.email,
      unsubscribeUrl: `${supabaseUrl}/unsubscribe?email=${encodeURIComponent(subscriber.email)}&sequence=${data.sequenceId}`,
      organizationName: 'Your Company'
    }

    let html = nextEmail.content
    let subject = nextEmail.subject
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`
      html = html.replace(new RegExp(placeholder, 'g'), String(value))
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value))
    }

    // Send the email
    const result = await sendEmail(subscriber.email, subject, html)

    // Record the send
    await supabase
      .from('drip_sequence_sends')
      .insert({
        sequence_id: data.sequenceId,
        subscriber_id: data.subscriberId,
        email_id: nextEmail.id,
        step_number: nextEmail.step_number,
        status: result.success ? 'sent' : 'failed',
        sent_at: result.success ? new Date().toISOString() : null,
        error_message: result.success ? null : result.error
      })

    console.log(`Drip email ${nextEmail.step_number} ${result.success ? 'sent' : 'failed'} to ${subscriber.email}`)
    return { 
      success: true, 
      data: { 
        sequenceId: data.sequenceId,
        subscriberId: data.subscriberId,
        stepNumber: nextEmail.step_number,
        emailSent: result.success,
        error: result.success ? null : result.error
      }
    }

  } catch (error) {
    console.error('Drip sequence error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// ENGAGEMENT TRACKING
// ================================================

async function processEngagementTracking(organizationId: string, data: EngagementTrackingData) {
  console.log(`Processing engagement tracking: ${data.eventType} for ${data.email}`)
  
  try {
    // Update campaign recipient record
    const updateData: any = {}
    
    switch (data.eventType) {
      case 'delivered':
        updateData.status = 'delivered'
        updateData.delivered_at = new Date().toISOString()
        break
      case 'opened':
        updateData.opened_at = new Date().toISOString()
        break
      case 'clicked':
        updateData.clicked_at = new Date().toISOString()
        updateData.click_data = data.eventData
        break
      case 'bounced':
        updateData.status = 'bounced'
        updateData.bounced_at = new Date().toISOString()
        updateData.bounce_reason = data.eventData?.reason
        break
      case 'unsubscribed':
        updateData.unsubscribed_at = new Date().toISOString()
        // Also update the lead record
        await supabase
          .from('lead_captures')
          .update({ subscribed: false, unsubscribed_at: new Date().toISOString() })
          .eq('email', data.email)
          .eq('organization_id', organizationId)
        break
    }

    // Update campaign recipient
    await supabase
      .from('email_campaign_recipients')
      .update(updateData)
      .eq('campaign_id', data.campaignId)
      .eq('email', data.email)

    // Update campaign aggregate counts
    if (data.eventType === 'opened') {
      await supabase.rpc('increment_campaign_opens', { 
        campaign_id: data.campaignId 
      })
    } else if (data.eventType === 'clicked') {
      await supabase.rpc('increment_campaign_clicks', { 
        campaign_id: data.campaignId 
      })
    } else if (data.eventType === 'bounced') {
      await supabase.rpc('increment_campaign_bounces', { 
        campaign_id: data.campaignId 
      })
    } else if (data.eventType === 'unsubscribed') {
      await supabase.rpc('increment_campaign_unsubscribes', { 
        campaign_id: data.campaignId 
      })
    }

    console.log(`Engagement tracking processed: ${data.eventType} for ${data.email}`)
    return { 
      success: true, 
      data: { 
        eventType: data.eventType,
        email: data.email,
        campaignId: data.campaignId,
        processed: true
      }
    }

  } catch (error) {
    console.error('Engagement tracking error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// BOUNCE CLEANUP
// ================================================

async function processBouncesCleanup(organizationId: string) {
  console.log(`Processing bounces cleanup for org: ${organizationId}`)
  
  try {
    // Get all bounced emails
    const { data: bouncedEmails, error: bounceError } = await supabase
      .from('email_campaign_recipients')
      .select('email, bounce_reason, bounced_at')
      .eq('status', 'bounced')
      .order('bounced_at', { ascending: false })

    if (bounceError) {
      return { success: false, error: bounceError.message }
    }

    // Group by email and check bounce patterns
    const emailBounces = {}
    bouncedEmails?.forEach(bounce => {
      if (!emailBounces[bounce.email]) {
        emailBounces[bounce.email] = []
      }
      emailBounces[bounce.email].push(bounce)
    })

    let suppressedCount = 0
    const suppressionList = []

    // Suppress emails with multiple hard bounces or specific patterns
    for (const [email, bounces] of Object.entries(emailBounces)) {
      const hardBounces = bounces.filter(b => 
        b.bounce_reason?.includes('permanent') || 
        b.bounce_reason?.includes('invalid') ||
        b.bounce_reason?.includes('rejected')
      )

      if (hardBounces.length >= 1 || bounces.length >= 3) {
        // Add to suppression list
        suppressionList.push({
          email,
          reason: hardBounces.length > 0 ? 'hard_bounce' : 'multiple_bounces',
          bounces_count: bounces.length,
          last_bounce: bounces[0].bounced_at,
          organization_id: organizationId
        })

        // Unsubscribe the lead
        await supabase
          .from('lead_captures')
          .update({ 
            subscribed: false, 
            unsubscribed_at: new Date().toISOString(),
            unsubscribe_reason: 'email_bounce'
          })
          .eq('email', email)
          .eq('organization_id', organizationId)

        suppressedCount++
      }
    }

    // Store suppression list
    if (suppressionList.length > 0) {
      await supabase
        .from('email_suppressions')
        .upsert(suppressionList, { onConflict: 'email,organization_id' })
    }

    console.log(`Bounces cleanup completed: ${suppressedCount} emails suppressed`)
    return { 
      success: true, 
      data: { 
        totalBounces: bouncedEmails?.length || 0,
        emailsProcessed: Object.keys(emailBounces).length,
        emailsSuppressed: suppressedCount
      }
    }

  } catch (error) {
    console.error('Bounces cleanup error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// SCHEDULED CAMPAIGNS PROCESSOR
// ================================================

async function processScheduledCampaigns() {
  console.log('Processing scheduled campaigns...')
  
  try {
    const now = new Date().toISOString()
    
    // Get campaigns scheduled to send now
    const { data: scheduledCampaigns, error: campaignsError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)

    if (campaignsError) {
      return { success: false, error: campaignsError.message }
    }

    let processedCount = 0
    const results = []

    for (const campaign of scheduledCampaigns || []) {
      try {
        const result = await processSendCampaign(campaign.organization_id, {
          campaignId: campaign.id,
          sendImmediately: true
        })
        
        results.push({
          campaignId: campaign.id,
          success: result.success,
          error: result.success ? null : result.error
        })
        
        if (result.success) {
          processedCount++
        }
      } catch (error) {
        console.error(`Error processing scheduled campaign ${campaign.id}:`, error)
        results.push({
          campaignId: campaign.id,
          success: false,
          error: error.message
        })
      }
    }

    console.log(`Processed ${processedCount} scheduled campaigns`)
    return { 
      success: true, 
      data: { 
        campaignsChecked: scheduledCampaigns?.length || 0,
        campaignsProcessed: processedCount,
        results
      }
    }

  } catch (error) {
    console.error('Scheduled campaigns processing error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// MAIN HANDLER
// ================================================

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { task }: { task: EmailAutomationTask } = await req.json()

    console.log(`Processing email automation task: ${task.type} for org: ${task.organizationId}`)

    let result
    switch (task.type) {
      case 'send_campaign':
        result = await processSendCampaign(task.organizationId, task.data as SendCampaignData)
        break
      case 'process_drip':
        result = await processDripSequence(task.organizationId, task.data as DripSequenceData)
        break
      case 'track_engagement':
        result = await processEngagementTracking(task.organizationId, task.data as EngagementTrackingData)
        break
      case 'cleanup_bounces':
        result = await processBouncesCleanup(task.organizationId)
        break
      case 'trigger_sequence':
        // Handle automated sequence triggers
        result = await processScheduledCampaigns()
        break
      default:
        return new Response(
          JSON.stringify({ error: `Unknown task type: ${task.type}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Email automation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})