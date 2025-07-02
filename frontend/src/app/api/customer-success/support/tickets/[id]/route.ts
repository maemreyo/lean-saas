import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { customerSuccessSchemas } from '@/shared/schemas/customer-success'
import { getUser } from '@/lib/auth'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()
    const { id } = params

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user can only access their own tickets
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Support ticket not found' }, 
          { status: 404 }
        )
      }
      console.error('Error fetching support ticket:', error)
      return NextResponse.json(
        { error: 'Failed to fetch support ticket' }, 
        { status: 500 }
      )
    }

    // Get ticket history/responses if available
    const ticketHistory = await getTicketHistory(id, supabase)

    return NextResponse.json({
      success: true,
      data: {
        ...ticket,
        history: ticketHistory
      }
    })

  } catch (error) {
    console.error('Support ticket fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = params

    // Validate request body
    const validation = customerSuccessSchemas.updateTicketRequest.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        }, 
        { status: 400 }
      )
    }

    const updateData = validation.data
    const supabase = createClient()

    // Verify ownership
    const { data: existingTicket } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingTicket) {
      return NextResponse.json(
        { error: 'Support ticket not found or access denied' }, 
        { status: 404 }
      )
    }

    // Prepare update data
    const finalUpdateData = {
      ...updateData,
      updated_at: new Date().toISOString()
    }

    // Handle status changes
    if (updateData.status && updateData.status !== existingTicket.status) {
      finalUpdateData.status_changed_at = new Date().toISOString()
      
      // Mark as resolved if status changed to resolved/closed
      if (['resolved', 'closed'].includes(updateData.status) && 
          !['resolved', 'closed'].includes(existingTicket.status)) {
        finalUpdateData.resolved_at = new Date().toISOString()
        finalUpdateData.resolution_time = calculateResolutionTime(existingTicket.created_at)
      }
    }

    // Update support ticket
    const { data: updatedTicket, error } = await supabase
      .from('support_tickets')
      .update(finalUpdateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating support ticket:', error)
      return NextResponse.json(
        { error: 'Failed to update support ticket' }, 
        { status: 500 }
      )
    }

    // Trigger status change actions if applicable
    if (updateData.status && updateData.status !== existingTicket.status) {
      await triggerStatusChangeActions(user.id, updatedTicket, existingTicket.status, supabase)
    }

    return NextResponse.json({
      success: true,
      data: updatedTicket,
      message: 'Support ticket updated successfully'
    })

  } catch (error) {
    console.error('Support ticket update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = params

    // Validate ticket response
    const validation = customerSuccessSchemas.ticketResponseRequest.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid response data',
          details: validation.error.errors
        }, 
        { status: 400 }
      )
    }

    const { message, attachments, is_internal } = validation.data
    const supabase = createClient()

    // Verify ticket ownership
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!ticket) {
      return NextResponse.json(
        { error: 'Support ticket not found or access denied' }, 
        { status: 404 }
      )
    }

    // Create ticket response (using metadata to store responses for now)
    const responseData = {
      id: `response_${Date.now()}`,
      message,
      attachments: attachments || [],
      is_internal: is_internal || false,
      created_by: user.id,
      created_at: new Date().toISOString()
    }

    // Update ticket with new response
    const existingResponses = ticket.metadata?.responses || []
    const updatedResponses = [...existingResponses, responseData]

    const { data: updatedTicket, error } = await supabase
      .from('support_tickets')
      .update({
        metadata: {
          ...ticket.metadata,
          responses: updatedResponses
        },
        response_count: updatedResponses.length,
        updated_at: new Date().toISOString(),
        last_response_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error adding ticket response:', error)
      return NextResponse.json(
        { error: 'Failed to add response' }, 
        { status: 500 }
      )
    }

    // Log response event
    await logTicketResponseEvent(user.id, ticket, responseData, supabase)

    return NextResponse.json({
      success: true,
      data: updatedTicket,
      response: responseData,
      message: 'Response added successfully'
    })

  } catch (error) {
    console.error('Ticket response error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const supabase = createClient()

    // Verify ownership before deletion
    const { data: existingTicket } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingTicket) {
      return NextResponse.json(
        { error: 'Support ticket not found or access denied' }, 
        { status: 404 }
      )
    }

    // Soft delete by marking as closed
    const { data: deletedTicket, error } = await supabase
      .from('support_tickets')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          ...existingTicket.metadata,
          deleted_by_user: true,
          deleted_at: new Date().toISOString()
        }
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error deleting support ticket:', error)
      return NextResponse.json(
        { error: 'Failed to delete support ticket' }, 
        { status: 500 }
      )
    }

    // Log deletion event
    await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_data: {
          event_type: 'support_ticket_deleted',
          ticket_id: id,
          ticket_number: existingTicket.ticket_number,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      data: deletedTicket,
      message: 'Support ticket closed successfully'
    })

  } catch (error) {
    console.error('Support ticket deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to get ticket history
async function getTicketHistory(ticketId: string, supabase: any) {
  try {
    // Get ticket with metadata containing responses
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('metadata')
      .eq('id', ticketId)
      .single()

    return ticket?.metadata?.responses || []
  } catch (error) {
    console.error('Error fetching ticket history:', error)
    return []
  }
}

// Helper function to calculate resolution time
function calculateResolutionTime(createdAt: string): number {
  const createdTime = new Date(createdAt).getTime()
  const resolvedTime = new Date().getTime()
  
  // Return resolution time in hours
  return Math.round((resolvedTime - createdTime) / (1000 * 60 * 60))
}

// Helper function to trigger status change actions
async function triggerStatusChangeActions(userId: string, ticket: any, previousStatus: string, supabase: any) {
  try {
    const promises = []

    // Create status change notification
    let notificationTitle = 'Ticket status updated'
    let notificationContent = `Your ticket ${ticket.ticket_number} status changed from ${previousStatus} to ${ticket.status}.`

    if (ticket.status === 'resolved') {
      notificationTitle = 'Ticket resolved!'
      notificationContent = `Great news! Your ticket ${ticket.ticket_number} has been resolved. Please let us know if you need any further assistance.`
    } else if (ticket.status === 'closed') {
      notificationTitle = 'Ticket closed'
      notificationContent = `Your ticket ${ticket.ticket_number} has been closed. Thank you for using our support!`
    }

    const notificationPromise = supabase
      .from('in_app_messages')
      .insert({
        user_id: userId,
        title: notificationTitle,
        content: notificationContent,
        type: 'notification',
        is_read: false,
        scheduled_at: new Date().toISOString(),
        metadata: {
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          status_change: true,
          previous_status: previousStatus,
          new_status: ticket.status
        }
      })

    promises.push(notificationPromise)

    // Log status change event
    const eventPromise = supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: 'support_ticket_status_changed',
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          previous_status: previousStatus,
          new_status: ticket.status,
          resolution_time: ticket.resolution_time,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })

    promises.push(eventPromise)

    // Execute all actions in parallel
    await Promise.allSettled(promises)

  } catch (error) {
    console.error('Status change actions error:', error)
    // Don't throw - status change should succeed even if post-actions fail
  }
}

// Helper function to log ticket response events
async function logTicketResponseEvent(userId: string, ticket: any, response: any, supabase: any) {
  try {
    await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: 'support_ticket_response_added',
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          response_length: response.message.length,
          has_attachments: response.attachments && response.attachments.length > 0,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging response event:', error)
    // Don't throw - response should succeed even if logging fails
  }
}