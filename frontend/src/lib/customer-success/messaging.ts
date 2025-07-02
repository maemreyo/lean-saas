// In-App Messaging and Notification Delivery

import { createClient } from '@/lib/supabase/client'
import { 
  InAppMessage, 
  InAppMessageInsert, 
  InAppMessageUpdate,
  MessageType,
  SendMessageRequest,
  MessageInteractionRequest
} from '@/shared/types/customer-success'
import { 
  createInAppMessageSchema,
  updateInAppMessageSchema,
  sendMessageRequestSchema,
  messageInteractionRequestSchema
} from '@/shared/schemas/customer-success'

// ================================================
// MESSAGING CONFIGURATION
// ================================================

export const MESSAGE_TEMPLATES = {
  welcome_new_user: {
    type: 'notification' as MessageType,
    title: 'Welcome to {platform_name}!',
    content: 'We\'re excited to have you here. Let\'s get you started with a quick tour of the main features.',
    display_type: 'modal',
    display_position: 'center',
    cta_text: 'Start Tour',
    priority: 10,
    auto_dismiss: false,
    dismissible: true
  },
  
  feature_announcement: {
    type: 'feature_highlight' as MessageType,
    title: 'New Feature: {feature_name}',
    content: 'We\'ve just released {feature_name}! This new feature will help you {benefit_description}.',
    display_type: 'banner',
    display_position: 'top',
    cta_text: 'Learn More',
    priority: 7,
    auto_dismiss: true,
    dismiss_after: 10000 // 10 seconds
  },

  onboarding_tip: {
    type: 'tips' as MessageType,
    title: 'Pro Tip: {tip_title}',
    content: '{tip_content}',
    display_type: 'slide_in',
    display_position: 'bottom',
    cta_text: 'Got it',
    priority: 5,
    auto_dismiss: true,
    dismiss_after: 8000
  },

  support_followup: {
    type: 'support_followup' as MessageType,
    title: 'How was your support experience?',
    content: 'Your recent support ticket was resolved. We\'d love to hear your feedback to help us improve.',
    display_type: 'toast',
    display_position: 'bottom',
    cta_text: 'Leave Feedback',
    priority: 6,
    auto_dismiss: true,
    dismiss_after: 15000
  },

  survey_prompt: {
    type: 'survey_prompt' as MessageType,
    title: 'Help us improve',
    content: 'You\'ve been using our platform for a while now. Would you mind sharing your thoughts in a quick 2-minute survey?',
    display_type: 'modal',
    display_position: 'center',
    cta_text: 'Take Survey',
    priority: 4,
    auto_dismiss: false,
    dismissible: true
  },

  usage_milestone: {
    type: 'notification' as MessageType,
    title: 'Congratulations! 🎉',
    content: 'You\'ve just reached {milestone}! You\'re getting the most out of our platform.',
    display_type: 'toast',
    display_position: 'top',
    cta_text: 'Keep Going',
    priority: 8,
    auto_dismiss: true,
    dismiss_after: 12000
  },

  inactivity_reengagement: {
    type: 'notification' as MessageType,
    title: 'We miss you!',
    content: 'It\'s been a while since your last visit. Check out what\'s new and pick up where you left off.',
    display_type: 'banner',
    display_position: 'top',
    cta_text: 'See What\'s New',
    priority: 6,
    auto_dismiss: false,
    dismissible: true
  },

  plan_upgrade_suggestion: {
    type: 'notification' as MessageType,
    title: 'You\'re growing fast!',
    content: 'You\'re approaching your plan limits. Consider upgrading to unlock more features and higher limits.',
    display_type: 'banner',
    display_position: 'top',
    cta_text: 'View Plans',
    priority: 9,
    auto_dismiss: false,
    dismissible: true
  }
}

export const USER_SEGMENTS = {
  new_users: {
    name: 'New Users',
    description: 'Users who signed up in the last 7 days',
    criteria: {
      days_since_signup: { max: 7 },
      onboarding_completed: false
    }
  },
  
  active_users: {
    name: 'Active Users',
    description: 'Users who have logged in within the last 30 days',
    criteria: {
      days_since_last_login: { max: 30 },
      session_count: { min: 3 }
    }
  },

  power_users: {
    name: 'Power Users',
    description: 'Users with high feature adoption and usage',
    criteria: {
      feature_adoption_rate: { min: 0.6 },
      weekly_sessions: { min: 5 }
    }
  },

  at_risk_users: {
    name: 'At Risk Users',
    description: 'Users showing signs of potential churn',
    criteria: {
      days_since_last_login: { min: 14, max: 60 },
      health_score: { max: 60 }
    }
  },

  trial_users: {
    name: 'Trial Users',
    description: 'Users currently on trial plans',
    criteria: {
      subscription_status: 'trial',
      trial_days_remaining: { min: 1 }
    }
  },

  paying_customers: {
    name: 'Paying Customers',
    description: 'Users with active paid subscriptions',
    criteria: {
      subscription_status: 'active',
      plan_type: { not: 'free' }
    }
  }
}

export const MESSAGE_TRIGGERS = {
  user_signup: {
    event: 'user_signup',
    delay: 0, // Immediate
    template: 'welcome_new_user'
  },
  
  onboarding_step_completed: {
    event: 'onboarding_step_completed',
    delay: 5000, // 5 seconds
    template: 'onboarding_tip'
  },

  feature_first_use: {
    event: 'feature_first_use',
    delay: 2000, // 2 seconds
    template: 'feature_announcement'
  },

  support_ticket_resolved: {
    event: 'support_ticket_resolved',
    delay: 3600000, // 1 hour
    template: 'support_followup'
  },

  usage_milestone: {
    event: 'usage_milestone',
    delay: 1000, // 1 second
    template: 'usage_milestone'
  },

  inactivity_detected: {
    event: 'inactivity_detected',
    delay: 0,
    template: 'inactivity_reengagement'
  },

  approaching_limits: {
    event: 'approaching_limits',
    delay: 0,
    template: 'plan_upgrade_suggestion'
  }
}

// ================================================
// CORE MESSAGING FUNCTIONS
// ================================================

/**
 * Send in-app message to users
 */
export async function sendInAppMessage(request: SendMessageRequest): Promise<{
  success: boolean
  data?: InAppMessage
  targeted_users?: number
  error?: string
}> {
  try {
    // Validate request
    const validation = sendMessageRequestSchema.safeParse(request)
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const { 
      organization_id, 
      title, 
      content, 
      message_type, 
      target_user_ids, 
      target_user_segments = [], 
      display_settings = {},
      schedule_at, 
      expires_at, 
      cta_text, 
      cta_url 
    } = validation.data

    const supabase = createClient()

    // Calculate targeted users
    let targetedUsers = 0
    if (target_user_ids && target_user_ids.length > 0) {
      targetedUsers = target_user_ids.length
    } else if (target_user_segments.length > 0) {
      targetedUsers = await calculateSegmentUsers(target_user_segments, organization_id)
    } else {
      // All organization users
      targetedUsers = await calculateTotalUsers(organization_id)
    }

    // Create message record
    const messageData: InAppMessageInsert = {
      organization_id,
      title,
      content,
      message_type,
      target_user_ids,
      target_user_segments,
      display_type: display_settings.display_type || 'banner',
      display_position: display_settings.display_position || 'top',
      display_priority: display_settings.priority || 5,
      scheduled_at: schedule_at,
      expires_at,
      active: !schedule_at || new Date(schedule_at) <= new Date(), // Active if not scheduled or scheduled time has passed
      cta_text,
      cta_url,
      total_targeted_users: targetedUsers,
      delivered_count: 0,
      viewed_count: 0,
      clicked_count: 0,
      dismissed_count: 0
    }

    const { data, error } = await supabase
      .from('in_app_messages')
      .insert(messageData)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`
      }
    }

    // If message is active and not scheduled, start delivery
    if (data.active && (!schedule_at || new Date(schedule_at) <= new Date())) {
      await deliverMessage(data)
    }

    return {
      success: true,
      data,
      targeted_users: targetedUsers
    }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get active messages for a user
 */
export async function getActiveMessagesForUser(
  userId: string,
  organizationId?: string,
  messageTypes?: MessageType[]
): Promise<InAppMessage[]> {
  try {
    const supabase = createClient()

    let query = supabase
      .from('in_app_messages')
      .select('*')
      .eq('active', true)
      .or(`target_user_ids.cs.{${userId}},target_user_ids.is.null`)
      .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
      .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)

    if (organizationId) {
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`)
    }

    if (messageTypes && messageTypes.length > 0) {
      query = query.in('message_type', messageTypes)
    }

    query = query.order('display_priority', { ascending: false })
                 .order('created_at', { ascending: false })

    const { data: messages, error } = await query

    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`)
    }

    // Filter by user segments if no specific user targeting
    const filteredMessages = await Promise.all(
      (messages || []).map(async (message) => {
        if (message.target_user_ids && message.target_user_ids.length > 0) {
          // Specific user targeting
          return message.target_user_ids.includes(userId) ? message : null
        } else if (message.target_user_segments && message.target_user_segments.length > 0) {
          // Segment targeting - check if user matches segments
          const userMatchesSegment = await checkUserMatchesSegments(
            userId, 
            message.target_user_segments,
            organizationId
          )
          return userMatchesSegment ? message : null
        } else {
          // No targeting - show to all
          return message
        }
      })
    )

    return filteredMessages.filter(Boolean) as InAppMessage[]
  } catch (error) {
    console.error('Error getting active messages:', error)
    return []
  }
}

/**
 * Track message interaction
 */
export async function trackMessageInteraction(request: MessageInteractionRequest): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Validate request
    const validation = messageInteractionRequestSchema.safeParse(request)
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const { message_id, user_id, interaction_type, metadata = {} } = validation.data
    const supabase = createClient()

    // Get current message
    const { data: message, error: fetchError } = await supabase
      .from('in_app_messages')
      .select('*')
      .eq('id', message_id)
      .single()

    if (fetchError || !message) {
      return {
        success: false,
        error: 'Message not found'
      }
    }

    // Update interaction counts
    const updateData: Partial<InAppMessageUpdate> = {}

    switch (interaction_type) {
      case 'viewed':
        updateData.viewed_count = (message.viewed_count || 0) + 1
        break
      case 'clicked':
        updateData.clicked_count = (message.clicked_count || 0) + 1
        updateData.cta_click_count = (message.cta_click_count || 0) + 1
        break
      case 'dismissed':
        updateData.dismissed_count = (message.dismissed_count || 0) + 1
        break
    }

    // Record interaction in metadata
    const interactions = message.metadata?.interactions || []
    interactions.push({
      user_id,
      interaction_type,
      timestamp: new Date().toISOString(),
      ...metadata
    })

    updateData.metadata = {
      ...message.metadata,
      interactions
    }

    const { error } = await supabase
      .from('in_app_messages')
      .update(updateData)
      .eq('id', message_id)

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Create message from template
 */
export async function createMessageFromTemplate(
  templateKey: keyof typeof MESSAGE_TEMPLATES,
  variables: Record<string, string> = {},
  targeting: {
    organizationId?: string
    userIds?: string[]
    userSegments?: string[]
  } = {},
  scheduling: {
    scheduleAt?: string
    expiresAt?: string
  } = {}
): Promise<{
  success: boolean
  data?: InAppMessage
  error?: string
}> {
  try {
    const template = MESSAGE_TEMPLATES[templateKey]
    if (!template) {
      return {
        success: false,
        error: `Template '${templateKey}' not found`
      }
    }

    // Replace variables in template
    let title = template.title
    let content = template.content

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`
      title = title.replace(new RegExp(placeholder, 'g'), value)
      content = content.replace(new RegExp(placeholder, 'g'), value)
    })

    // Create message request
    const messageRequest: SendMessageRequest = {
      organization_id: targeting.organizationId,
      title,
      content,
      message_type: template.type,
      target_user_ids: targeting.userIds,
      target_user_segments: targeting.userSegments,
      display_settings: {
        display_type: template.display_type,
        display_position: template.display_position,
        priority: template.priority
      },
      schedule_at: scheduling.scheduleAt,
      expires_at: scheduling.expiresAt,
      cta_text: template.cta_text,
      cta_url: undefined // Would need to be provided in variables or targeting
    }

    return await sendInAppMessage(messageRequest)
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Trigger automated message based on event
 */
export async function triggerAutomatedMessage(
  eventType: keyof typeof MESSAGE_TRIGGERS,
  userId: string,
  organizationId?: string,
  eventData: Record<string, any> = {}
): Promise<{
  success: boolean
  message_sent?: boolean
  error?: string
}> {
  try {
    const trigger = MESSAGE_TRIGGERS[eventType]
    if (!trigger) {
      return {
        success: false,
        error: `Trigger '${eventType}' not found`
      }
    }

    // Check if user should receive this message (rate limiting, preferences, etc.)
    const shouldSend = await shouldSendAutomatedMessage(userId, trigger.template, organizationId)
    if (!shouldSend) {
      return {
        success: true,
        message_sent: false
      }
    }

    // Prepare variables from event data
    const variables = {
      user_name: eventData.user_name || 'there',
      platform_name: eventData.platform_name || 'Our Platform',
      ...eventData
    }

    // Schedule message with delay
    const scheduleAt = trigger.delay > 0 
      ? new Date(Date.now() + trigger.delay).toISOString()
      : undefined

    const result = await createMessageFromTemplate(
      trigger.template as keyof typeof MESSAGE_TEMPLATES,
      variables,
      {
        organizationId,
        userIds: [userId]
      },
      {
        scheduleAt
      }
    )

    return {
      success: result.success,
      message_sent: result.success,
      error: result.error
    }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get message analytics for organization
 */
export async function getMessageAnalytics(
  organizationId?: string,
  timeRange = '30d'
): Promise<{
  total_messages: number
  active_messages: number
  total_views: number
  total_clicks: number
  total_dismissals: number
  click_through_rate: number
  dismissal_rate: number
  messages_by_type: Record<MessageType, number>
  top_performing_messages: Array<{
    id: string
    title: string
    views: number
    clicks: number
    ctr: number
  }>
}> {
  try {
    const supabase = createClient()
    
    const daysBack = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    let query = supabase
      .from('in_app_messages')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data: messages, error } = await query

    if (error || !messages) {
      throw new Error(`Failed to fetch message analytics: ${error?.message}`)
    }

    const totalMessages = messages.length
    const activeMessages = messages.filter(m => m.active).length
    const totalViews = messages.reduce((sum, m) => sum + (m.viewed_count || 0), 0)
    const totalClicks = messages.reduce((sum, m) => sum + (m.clicked_count || 0), 0)
    const totalDismissals = messages.reduce((sum, m) => sum + (m.dismissed_count || 0), 0)
    
    const clickThroughRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0
    const dismissalRate = totalViews > 0 ? (totalDismissals / totalViews) * 100 : 0

    // Group by message type
    const messagesByType = messages.reduce((acc, message) => {
      acc[message.message_type] = (acc[message.message_type] || 0) + 1
      return acc
    }, {} as Record<MessageType, number>)

    // Top performing messages
    const topPerforming = messages
      .filter(m => (m.viewed_count || 0) > 0)
      .map(m => ({
        id: m.id,
        title: m.title,
        views: m.viewed_count || 0,
        clicks: m.clicked_count || 0,
        ctr: m.viewed_count ? ((m.clicked_count || 0) / m.viewed_count) * 100 : 0
      }))
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 5)

    return {
      total_messages: totalMessages,
      active_messages: activeMessages,
      total_views: totalViews,
      total_clicks: totalClicks,
      total_dismissals: totalDismissals,
      click_through_rate: Math.round(clickThroughRate * 100) / 100,
      dismissal_rate: Math.round(dismissalRate * 100) / 100,
      messages_by_type: messagesByType,
      top_performing_messages: topPerforming
    }
  } catch (error) {
    console.error('Error getting message analytics:', error)
    return {
      total_messages: 0,
      active_messages: 0,
      total_views: 0,
      total_clicks: 0,
      total_dismissals: 0,
      click_through_rate: 0,
      dismissal_rate: 0,
      messages_by_type: {} as Record<MessageType, number>,
      top_performing_messages: []
    }
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Calculate number of users in segments
 */
async function calculateSegmentUsers(segments: string[], organizationId?: string): Promise<number> {
  // This would implement user segmentation logic
  // For now, return an estimate
  return segments.length * 100 // Placeholder
}

/**
 * Calculate total users for organization
 */
async function calculateTotalUsers(organizationId?: string): Promise<number> {
  try {
    const supabase = createClient()
    
    let query = supabase
      .from('users')
      .select('id', { count: 'exact', head: true })

    if (organizationId) {
      // Would need to join with organization membership
      // This is a simplified version
    }

    const { count } = await query
    return count || 0
  } catch (error) {
    console.error('Error calculating total users:', error)
    return 0
  }
}

/**
 * Check if user matches segments
 */
async function checkUserMatchesSegments(
  userId: string, 
  segments: string[], 
  organizationId?: string
): Promise<boolean> {
  // This would implement user segmentation matching logic
  // For now, return true for all segments
  return true // Placeholder
}

/**
 * Check if automated message should be sent
 */
async function shouldSendAutomatedMessage(
  userId: string, 
  templateKey: string, 
  organizationId?: string
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    // Check if user has received this template recently (rate limiting)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const { data: recentMessages } = await supabase
      .from('in_app_messages')
      .select('id')
      .contains('target_user_ids', [userId])
      .gte('created_at', oneDayAgo.toISOString())
      .eq('title', MESSAGE_TEMPLATES[templateKey as keyof typeof MESSAGE_TEMPLATES]?.title)

    // Don't send if user received same message in last 24 hours
    if (recentMessages && recentMessages.length > 0) {
      return false
    }

    // Check user preferences (would be implemented based on user settings)
    // For now, allow all messages
    return true
  } catch (error) {
    console.error('Error checking if message should be sent:', error)
    return false
  }
}

/**
 * Deliver message to targeted users
 */
async function deliverMessage(message: InAppMessage): Promise<void> {
  try {
    // In a real system, this would:
    // 1. Resolve target users based on segments
    // 2. Send real-time notifications (WebSocket, SSE, etc.)
    // 3. Update delivery status
    // 4. Handle delivery failures
    
    console.log(`Delivering message "${message.title}" to ${message.total_targeted_users} users`)
    
    // Update delivered count
    const supabase = createClient()
    await supabase
      .from('in_app_messages')
      .update({ 
        delivered_count: message.total_targeted_users 
      })
      .eq('id', message.id)
  } catch (error) {
    console.error('Error delivering message:', error)
  }
}