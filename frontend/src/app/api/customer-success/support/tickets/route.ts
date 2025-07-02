import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { customerSuccessSchemas } from '@/shared/schemas/customer-success'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const organizationId = searchParams.get('organization_id')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Build query for support tickets
    let query = supabase
      .from('support_tickets')
      .select('*')

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      // Default to current user if no user_id specified
      query = query.eq('user_id', user.id)
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    if (category) {
      query = query.eq('category', category)
    }

    // Apply pagination
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    if (offset) {
      query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit || '50') - 1)
    }

    // Order by most recent and priority
    query = query.order('created_at', { ascending: false })

    const { data: tickets, error, count } = await query

    if (error) {
      console.error('Error fetching support tickets:', error)
      return NextResponse.json(
        { error: 'Failed to fetch support tickets' }, 
        { status: 500 }
      )
    }

    // Get ticket statistics
    const stats = await getTicketStatistics(user.id, organizationId, supabase)

    return NextResponse.json({
      success: true,
      data: tickets,
      count: count || tickets?.length || 0,
      statistics: stats
    })

  } catch (error) {
    console.error('Support tickets API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request body
    const validation = customerSuccessSchemas.createTicketRequest.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        }, 
        { status: 400 }
      )
    }

    const ticketData = validation.data
    const supabase = createClient()

    // Generate ticket number
    const ticketNumber = await generateTicketNumber(supabase)

    // Create support ticket record
    const newTicketData = {
      ...ticketData,
      user_id: user.id,
      ticket_number: ticketNumber,
      status: 'open' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      response_count: 0,
      resolution_time: null
    }

    const { data: newTicket, error } = await supabase
      .from('support_tickets')
      .insert([newTicketData])
      .select()
      .single()

    if (error) {
      console.error('Error creating support ticket:', error)
      return NextResponse.json(
        { error: 'Failed to create support ticket' }, 
        { status: 500 }
      )
    }

    // Trigger post-creation actions
    await triggerTicketCreationActions(user.id, newTicket, supabase)

    return NextResponse.json({
      success: true,
      data: newTicket,
      message: 'Support ticket created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Support ticket creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to generate unique ticket number
async function generateTicketNumber(supabase: any): Promise<string> {
  const prefix = 'TKT'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  
  return `${prefix}-${timestamp}-${random}`
}

// Helper function to get ticket statistics
async function getTicketStatistics(userId: string, organizationId: string | null, supabase: any) {
  try {
    let query = supabase
      .from('support_tickets')
      .select('status, priority, created_at, resolved_at')
      .eq('user_id', userId)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data: tickets } = await query

    if (!tickets) return null

    // Calculate statistics
    const stats = {
      total_tickets: tickets.length,
      open_tickets: tickets.filter(t => ['open', 'in_progress', 'waiting_customer'].includes(t.status)).length,
      resolved_tickets: tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length,
      by_status: tickets.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      by_priority: tickets.reduce((acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      average_resolution_time: calculateAverageResolutionTime(tickets),
      recent_activity: tickets.filter(t => 
        new Date(t.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length
    }

    return stats

  } catch (error) {
    console.error('Error calculating ticket statistics:', error)
    return null
  }
}

// Helper function to calculate average resolution time
function calculateAverageResolutionTime(tickets: any[]): number | null {
  const resolvedTickets = tickets.filter(t => t.resolved_at && t.created_at)
  
  if (resolvedTickets.length === 0) return null

  const totalTime = resolvedTickets.reduce((sum, ticket) => {
    const createdTime = new Date(ticket.created_at).getTime()
    const resolvedTime = new Date(ticket.resolved_at).getTime()
    return sum + (resolvedTime - createdTime)
  }, 0)

  // Return average in hours
  return Math.round((totalTime / resolvedTickets.length) / (1000 * 60 * 60))
}

// Helper function to trigger post-creation actions
async function triggerTicketCreationActions(userId: string, ticket: any, supabase: any) {
  try {
    const promises = []

    // 1. Create confirmation message
    const confirmationPromise = supabase
      .from('in_app_messages')
      .insert({
        user_id: userId,
        title: 'Support ticket created',
        content: `Your support ticket ${ticket.ticket_number} has been created. We'll get back to you soon!`,
        type: 'notification',
        is_read: false,
        scheduled_at: new Date().toISOString(),
        metadata: {
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          auto_generated: true
        }
      })

    promises.push(confirmationPromise)

    // 2. Update customer health (support ticket might indicate issues)
    const healthPromise = supabase
      .from('customer_health')
      .upsert({
        user_id: userId,
        support_ticket_count: await getCurrentTicketCount(userId, supabase),
        last_support_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    promises.push(healthPromise)

    // 3. Log ticket creation event
    const eventPromise = supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: 'support_ticket_created',
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          priority: ticket.priority,
          category: ticket.category,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })

    promises.push(eventPromise)

    // Execute all actions in parallel
    await Promise.allSettled(promises)

  } catch (error) {
    console.error('Ticket creation actions error:', error)
    // Don't throw - ticket creation should succeed even if post-actions fail
  }
}

// Helper function to get current ticket count
async function getCurrentTicketCount(userId: string, supabase: any): Promise<number> {
  try {
    const { count } = await supabase
      .from('support_tickets')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .in('status', ['open', 'in_progress', 'waiting_customer'])
    
    return count || 0
  } catch {
    return 0
  }
}