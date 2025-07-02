// Support Ticket Management and Knowledge Base Operations

import { createClient } from '@/lib/supabase/client'
import { 
  SupportTicket, 
  SupportTicketInsert, 
  SupportTicketUpdate,
  KnowledgeBase,
  KnowledgeBaseInsert,
  KnowledgeBaseUpdate,
  TicketStatus,
  TicketPriority,
  ArticleStatus,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketResponseRequest,
  SupportTicketsResponse,
  SupportTicketAnalytics
} from '@/shared/types/customer-success'
import { 
  createSupportTicketSchema,
  updateSupportTicketSchema,
  createKnowledgeBaseSchema,
  updateKnowledgeBaseSchema,
  createTicketRequestSchema,
  updateTicketRequestSchema,
  ticketResponseRequestSchema
} from '@/shared/schemas/customer-success'

// ================================================
// SUPPORT CONFIGURATION
// ================================================

export const TICKET_PRIORITIES: Record<TicketPriority, { 
  label: string
  sla_hours: number
  escalation_hours: number
  color: string 
}> = {
  low: {
    label: 'Low Priority',
    sla_hours: 72,
    escalation_hours: 96,
    color: 'green'
  },
  medium: {
    label: 'Medium Priority', 
    sla_hours: 24,
    escalation_hours: 48,
    color: 'yellow'
  },
  high: {
    label: 'High Priority',
    sla_hours: 8,
    escalation_hours: 16,
    color: 'orange'
  },
  urgent: {
    label: 'Urgent',
    sla_hours: 4,
    escalation_hours: 8,
    color: 'red'
  },
  critical: {
    label: 'Critical',
    sla_hours: 1,
    escalation_hours: 2,
    color: 'red'
  }
}

export const TICKET_CATEGORIES = [
  'technical_issue',
  'billing_question',
  'feature_request',
  'bug_report',
  'account_access',
  'integration_help',
  'general_question',
  'feedback',
  'training_request',
  'other'
]

export const AUTO_RESPONSE_TEMPLATES = {
  ticket_created: {
    subject: 'Support Ticket Created - #{ticket_id}',
    content: `Thank you for contacting our support team. 

Your ticket has been created with ID #{ticket_id} and priority level: {priority}.

Our team will respond within {sla_hours} hours. You can track the status of your ticket in your dashboard.

If this is an urgent matter, please contact us directly at support@company.com.

Best regards,
Support Team`
  },
  ticket_resolved: {
    subject: 'Support Ticket Resolved - #{ticket_id}',
    content: `Your support ticket #{ticket_id} has been resolved.

Resolution: {resolution_notes}

If you're satisfied with the resolution, no further action is needed. If you have additional questions or the issue persists, please reply to this email.

Please take a moment to rate your support experience: {satisfaction_survey_link}

Best regards,
Support Team`
  }
}

// ================================================
// SUPPORT TICKET FUNCTIONS
// ================================================

/**
 * Create a new support ticket
 */
export async function createSupportTicket(request: CreateTicketRequest): Promise<{
  success: boolean
  data?: SupportTicket
  error?: string
}> {
  try {
    // Validate request
    const validation = createTicketRequestSchema.safeParse(request)
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const { 
      user_id, 
      organization_id, 
      title, 
      description, 
      priority = 'medium', 
      category, 
      tags = [],
      metadata = {} 
    } = validation.data

    const supabase = createClient()

    // Calculate SLA deadlines
    const priorityConfig = TICKET_PRIORITIES[priority]
    const now = new Date()
    const firstResponseDeadline = new Date(now.getTime() + priorityConfig.sla_hours * 60 * 60 * 1000)
    const resolutionDeadline = new Date(now.getTime() + priorityConfig.sla_hours * 2 * 60 * 60 * 1000)

    // Auto-assign based on category or round-robin
    const assignedAgent = await getNextAvailableAgent(category)

    // Create ticket
    const ticketData: SupportTicketInsert = {
      user_id,
      organization_id,
      title,
      description,
      status: 'open',
      priority,
      category,
      tags,
      assigned_to_user_id: assignedAgent?.id,
      first_response_deadline: firstResponseDeadline.toISOString(),
      resolution_deadline: resolutionDeadline.toISOString(),
      response_count: 0,
      metadata
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .insert(ticketData)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`
      }
    }

    // Send auto-response to user
    await sendTicketAutoResponse(data, 'ticket_created')

    // Notify assigned agent
    if (assignedAgent) {
      await notifyAgentOfAssignment(data, assignedAgent)
    }

    return {
      success: true,
      data
    }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Update support ticket
 */
export async function updateSupportTicket(
  ticketId: string, 
  request: UpdateTicketRequest,
  updatedBy: string
): Promise<{
  success: boolean
  data?: SupportTicket
  error?: string
}> {
  try {
    // Validate request
    const validation = updateTicketRequestSchema.safeParse(request)
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const supabase = createClient()

    // Get current ticket
    const { data: currentTicket, error: fetchError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (fetchError || !currentTicket) {
      return {
        success: false,
        error: 'Ticket not found'
      }
    }

    // Prepare update data
    const updateData: SupportTicketUpdate = {
      ...request,
      last_response_at: new Date().toISOString(),
      last_response_by_user_id: updatedBy
    }

    // Handle status changes
    if (request.status === 'resolved' && currentTicket.status !== 'resolved') {
      updateData.resolved_at = new Date().toISOString()
    }

    // Update response count if status changed or assignment changed
    if (request.status && request.status !== currentTicket.status) {
      updateData.response_count = (currentTicket.response_count || 0) + 1
    }

    // Set first response time if this is the first response
    if (!currentTicket.first_response_at && updatedBy !== currentTicket.user_id) {
      updateData.first_response_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`
      }
    }

    // Send notifications for status changes
    if (request.status === 'resolved') {
      await sendTicketAutoResponse(data, 'ticket_resolved')
    }

    return {
      success: true,
      data
    }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Add response to support ticket
 */
export async function addTicketResponse(request: TicketResponseRequest): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Validate request
    const validation = ticketResponseRequestSchema.safeParse(request)
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const { ticket_id, user_id, message, internal_note = false, attachments = [] } = validation.data
    const supabase = createClient()

    // For now, we'll store responses in the ticket metadata
    // In a real system, you might have a separate ticket_responses table
    
    const { data: ticket, error: fetchError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticket_id)
      .single()

    if (fetchError || !ticket) {
      return {
        success: false,
        error: 'Ticket not found'
      }
    }

    // Add response to ticket history
    const responses = ticket.metadata?.responses || []
    responses.push({
      id: crypto.randomUUID(),
      user_id,
      message,
      internal_note,
      attachments,
      created_at: new Date().toISOString()
    })

    // Update ticket with new response
    const { error } = await supabase
      .from('support_tickets')
      .update({
        metadata: {
          ...ticket.metadata,
          responses
        },
        last_response_at: new Date().toISOString(),
        last_response_by_user_id: user_id,
        response_count: (ticket.response_count || 0) + 1,
        // Set first response time if this is the first agent response
        first_response_at: ticket.first_response_at || (user_id !== ticket.user_id ? new Date().toISOString() : undefined)
      })
      .eq('id', ticket_id)

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`
      }
    }

    // Send notifications if not internal note
    if (!internal_note) {
      await notifyTicketParticipants(ticket, user_id, message)
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
 * Get support tickets with filtering and pagination
 */
export async function getSupportTickets(
  filters: {
    organizationId?: string
    userId?: string
    status?: TicketStatus[]
    priority?: TicketPriority[]
    category?: string
    assignedTo?: string
    createdAfter?: string
    createdBefore?: string
    search?: string
  },
  pagination: {
    limit?: number
    offset?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }
): Promise<SupportTicketsResponse> {
  try {
    const supabase = createClient()
    
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        assigned_agent:assigned_to_user_id(id, email, full_name),
        customer:user_id(id, email, full_name)
      `)

    // Apply filters
    if (filters.organizationId) {
      query = query.eq('organization_id', filters.organizationId)
    }
    
    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }
    
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }
    
    if (filters.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority)
    }
    
    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    
    if (filters.assignedTo) {
      query = query.eq('assigned_to_user_id', filters.assignedTo)
    }
    
    if (filters.createdAfter) {
      query = query.gte('created_at', filters.createdAfter)
    }
    
    if (filters.createdBefore) {
      query = query.lte('created_at', filters.createdBefore)
    }
    
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Get total count for pagination
    const { count } = await query.select('*', { count: 'exact', head: true })
    const total = count || 0

    // Apply sorting
    const sortBy = pagination.sortBy || 'created_at'
    const sortOrder = pagination.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const limit = pagination.limit || 20
    const offset = pagination.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data: tickets, error } = await query

    if (error) {
      throw new Error(`Failed to fetch tickets: ${error.message}`)
    }

    // Calculate analytics
    const analytics = await calculateSupportAnalytics(filters.organizationId)

    return {
      tickets: tickets || [],
      analytics,
      pagination: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        has_more: offset + limit < total
      }
    }
  } catch (error) {
    console.error('Error getting support tickets:', error)
    return {
      tickets: [],
      analytics: {
        total_tickets: 0,
        open_tickets: 0,
        resolved_tickets: 0,
        avg_resolution_time: 0,
        first_response_time: 0,
        satisfaction_rating: 0,
        tickets_by_category: {},
        tickets_by_priority: {},
        escalation_rate: 0
      },
      pagination: {
        total: 0,
        page: 1,
        limit: 20,
        has_more: false
      }
    }
  }
}

// ================================================
// KNOWLEDGE BASE FUNCTIONS
// ================================================

/**
 * Create knowledge base article
 */
export async function createKnowledgeArticle(
  articleData: Omit<KnowledgeBaseInsert, 'id' | 'created_at' | 'updated_at'>,
  authorId: string
): Promise<{
  success: boolean
  data?: KnowledgeBase
  error?: string
}> {
  try {
    // Validate article data
    const validation = createKnowledgeBaseSchema.safeParse({
      ...articleData,
      author_id: authorId
    })
    
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const supabase = createClient()

    // Ensure slug is unique
    const { data: existingArticle } = await supabase
      .from('knowledge_base')
      .select('id')
      .eq('slug', articleData.slug)
      .single()

    if (existingArticle) {
      return {
        success: false,
        error: 'Article with this slug already exists'
      }
    }

    const { data, error } = await supabase
      .from('knowledge_base')
      .insert(validation.data)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`
      }
    }

    return {
      success: true,
      data
    }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Update knowledge base article
 */
export async function updateKnowledgeArticle(
  articleId: string,
  updateData: Partial<KnowledgeBaseUpdate>,
  editorId: string
): Promise<{
  success: boolean
  data?: KnowledgeBase
  error?: string
}> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('knowledge_base')
      .update({
        ...updateData,
        last_edited_by: editorId,
        version: supabase.rpc('increment_version') as any // Increment version
      })
      .eq('id', articleId)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`
      }
    }

    return {
      success: true,
      data
    }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Search knowledge base articles
 */
export async function searchKnowledgeBase(
  query: string,
  filters: {
    organizationId?: string
    category?: string
    status?: ArticleStatus[]
    featured?: boolean
  } = {},
  limit = 10
): Promise<KnowledgeBase[]> {
  try {
    const supabase = createClient()

    let dbQuery = supabase
      .from('knowledge_base')
      .select('*')
      .eq('status', 'published') // Only search published articles

    if (filters.organizationId) {
      dbQuery = dbQuery.eq('organization_id', filters.organizationId)
    }

    if (filters.category) {
      dbQuery = dbQuery.eq('category', filters.category)
    }

    if (filters.featured !== undefined) {
      dbQuery = dbQuery.eq('featured', filters.featured)
    }

    if (query.trim()) {
      // Use full-text search if available, otherwise use ilike
      dbQuery = dbQuery.textSearch('title', query, { config: 'english' })
    }

    dbQuery = dbQuery
      .order('search_rank_score', { ascending: false })
      .order('helpful_count', { ascending: false })
      .limit(limit)

    const { data, error } = await dbQuery

    if (error) {
      throw new Error(`Search failed: ${error.message}`)
    }

    // Update view counts for returned articles
    if (data && data.length > 0) {
      await Promise.all(
        data.map(article => 
          supabase
            .from('knowledge_base')
            .update({ view_count: (article.view_count || 0) + 1 })
            .eq('id', article.id)
        )
      )
    }

    return data || []
  } catch (error) {
    console.error('Error searching knowledge base:', error)
    return []
  }
}

/**
 * Mark article as helpful/not helpful
 */
export async function rateKnowledgeArticle(
  articleId: string, 
  helpful: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const field = helpful ? 'helpful_count' : 'not_helpful_count'
    
    const { error } = await supabase.rpc('increment_kb_rating', {
      article_id: articleId,
      rating_field: field
    })

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

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Get next available support agent for assignment
 */
async function getNextAvailableAgent(category?: string): Promise<{ id: string; email: string } | null> {
  // This would implement round-robin or skill-based assignment
  // For now, return null (unassigned)
  return null
}

/**
 * Send auto-response email for ticket events
 */
async function sendTicketAutoResponse(
  ticket: SupportTicket, 
  templateType: 'ticket_created' | 'ticket_resolved'
): Promise<void> {
  try {
    const template = AUTO_RESPONSE_TEMPLATES[templateType]
    const priorityConfig = TICKET_PRIORITIES[ticket.priority as TicketPriority]
    
    // Replace template variables
    const subject = template.subject.replace('{ticket_id}', ticket.id)
    const content = template.content
      .replace('{ticket_id}', ticket.id)
      .replace('{priority}', priorityConfig.label)
      .replace('{sla_hours}', priorityConfig.sla_hours.toString())
      .replace('{resolution_notes}', ticket.resolution_notes || '')
    
    // In a real system, this would send an email
    console.log(`Auto-response sent for ticket ${ticket.id}:`, { subject, content })
  } catch (error) {
    console.error('Error sending auto-response:', error)
  }
}

/**
 * Notify agent of new ticket assignment
 */
async function notifyAgentOfAssignment(
  ticket: SupportTicket, 
  agent: { id: string; email: string }
): Promise<void> {
  try {
    // In a real system, this would send a notification
    console.log(`Agent ${agent.email} assigned to ticket ${ticket.id}`)
  } catch (error) {
    console.error('Error notifying agent:', error)
  }
}

/**
 * Notify ticket participants of new response
 */
async function notifyTicketParticipants(
  ticket: SupportTicket,
  responderId: string,
  message: string
): Promise<void> {
  try {
    // In a real system, this would send notifications
    console.log(`New response on ticket ${ticket.id} from ${responderId}`)
  } catch (error) {
    console.error('Error notifying participants:', error)
  }
}

/**
 * Calculate support analytics
 */
async function calculateSupportAnalytics(organizationId?: string): Promise<SupportTicketAnalytics> {
  try {
    const supabase = createClient()
    
    // Get last 30 days of tickets
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    let query = supabase
      .from('support_tickets')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data: tickets, error } = await query

    if (error || !tickets) {
      throw new Error(`Failed to fetch analytics: ${error?.message}`)
    }

    const totalTickets = tickets.length
    const openTickets = tickets.filter(t => ['open', 'in_progress', 'waiting_customer'].includes(t.status)).length
    const resolvedTickets = tickets.filter(t => t.status === 'resolved').length

    // Calculate average resolution time
    const resolvedWithTimes = tickets.filter(t => 
      t.status === 'resolved' && t.created_at && t.resolved_at
    )
    const avgResolutionTime = resolvedWithTimes.length > 0
      ? resolvedWithTimes.reduce((sum, t) => {
          const created = new Date(t.created_at).getTime()
          const resolved = new Date(t.resolved_at!).getTime()
          return sum + (resolved - created)
        }, 0) / resolvedWithTimes.length / (1000 * 60 * 60) // Convert to hours
      : 0

    // Calculate first response time
    const withFirstResponse = tickets.filter(t => t.created_at && t.first_response_at)
    const firstResponseTime = withFirstResponse.length > 0
      ? withFirstResponse.reduce((sum, t) => {
          const created = new Date(t.created_at).getTime()
          const firstResponse = new Date(t.first_response_at!).getTime()
          return sum + (firstResponse - created)
        }, 0) / withFirstResponse.length / (1000 * 60 * 60) // Convert to hours
      : 0

    // Calculate satisfaction rating
    const withRatings = tickets.filter(t => t.satisfaction_rating !== null)
    const satisfactionRating = withRatings.length > 0
      ? withRatings.reduce((sum, t) => sum + (t.satisfaction_rating || 0), 0) / withRatings.length
      : 0

    // Group by category and priority
    const ticketsByCategory = tickets.reduce((acc, t) => {
      const category = t.category || 'uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const ticketsByPriority = tickets.reduce((acc, t) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate escalation rate
    const escalatedTickets = tickets.filter(t => t.status === 'escalated').length
    const escalationRate = totalTickets > 0 ? (escalatedTickets / totalTickets) * 100 : 0

    return {
      total_tickets: totalTickets,
      open_tickets: openTickets,
      resolved_tickets: resolvedTickets,
      avg_resolution_time: Math.round(avgResolutionTime * 100) / 100,
      first_response_time: Math.round(firstResponseTime * 100) / 100,
      satisfaction_rating: Math.round(satisfactionRating * 100) / 100,
      tickets_by_category: ticketsByCategory,
      tickets_by_priority: ticketsByPriority,
      escalation_rate: Math.round(escalationRate * 100) / 100
    }
  } catch (error) {
    console.error('Error calculating support analytics:', error)
    return {
      total_tickets: 0,
      open_tickets: 0,
      resolved_tickets: 0,
      avg_resolution_time: 0,
      first_response_time: 0,
      satisfaction_rating: 0,
      tickets_by_category: {},
      tickets_by_priority: {},
      escalation_rate: 0
    }
  }
}