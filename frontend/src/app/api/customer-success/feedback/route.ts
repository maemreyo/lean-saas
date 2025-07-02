import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { customerSuccessSchemas } from '@/shared/schemas/customer-success'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const organizationId = searchParams.get('organization_id')
    const feedbackType = searchParams.get('type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Build query for user feedback
    let query = supabase
      .from('user_feedback')
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

    if (feedbackType) {
      query = query.eq('feedback_type', feedbackType)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Apply pagination
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    if (offset) {
      query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit || '50') - 1)
    }

    // Order by most recent
    query = query.order('created_at', { ascending: false })

    const { data: feedback, error, count } = await query

    if (error) {
      console.error('Error fetching feedback:', error)
      return NextResponse.json(
        { error: 'Failed to fetch feedback' }, 
        { status: 500 }
      )
    }

    // Get feedback analytics
    const analytics = await getFeedbackAnalytics(user.id, organizationId, supabase)

    return NextResponse.json({
      success: true,
      data: feedback,
      count: count || feedback?.length || 0,
      analytics
    })

  } catch (error) {
    console.error('Feedback API error:', error)
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
    const validation = customerSuccessSchemas.submitFeedbackRequest.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        }, 
        { status: 400 }
      )
    }

    const feedbackData = validation.data
    const supabase = createClient()

    // Create feedback record
    const newFeedbackData = {
      ...feedbackData,
      user_id: user.id,
      submitted_at: new Date().toISOString(),
      is_processed: false
    }

    const { data: newFeedback, error } = await supabase
      .from('user_feedback')
      .insert([newFeedbackData])
      .select()
      .single()

    if (error) {
      console.error('Error creating feedback:', error)
      return NextResponse.json(
        { error: 'Failed to submit feedback' }, 
        { status: 500 }
      )
    }

    // Trigger post-submission actions
    await triggerFeedbackActions(user.id, newFeedback, supabase)

    return NextResponse.json({
      success: true,
      data: newFeedback,
      message: 'Feedback submitted successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Feedback submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to get feedback analytics
async function getFeedbackAnalytics(userId: string, organizationId: string | null, supabase: any) {
  try {
    let query = supabase
      .from('user_feedback')
      .select('feedback_type, rating, sentiment')
      .eq('user_id', userId)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data: feedbackData } = await query

    if (!feedbackData) return null

    // Calculate analytics
    const totalFeedback = feedbackData.length
    const avgRating = feedbackData
      .filter(f => f.rating)
      .reduce((sum, f) => sum + f.rating, 0) / 
      feedbackData.filter(f => f.rating).length || 0

    const sentimentCounts = feedbackData.reduce((acc, f) => {
      if (f.sentiment) {
        acc[f.sentiment] = (acc[f.sentiment] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const typeCounts = feedbackData.reduce((acc, f) => {
      acc[f.feedback_type] = (acc[f.feedback_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total_feedback: totalFeedback,
      average_rating: Math.round(avgRating * 10) / 10,
      sentiment_distribution: sentimentCounts,
      type_distribution: typeCounts,
      recent_count: feedbackData.filter(f => 
        new Date(f.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length
    }

  } catch (error) {
    console.error('Error calculating feedback analytics:', error)
    return null
  }
}

// Helper function to trigger post-feedback actions
async function triggerFeedbackActions(userId: string, feedback: any, supabase: any) {
  try {
    const promises = []

    // 1. Update customer health based on feedback
    if (feedback.rating) {
      const healthImpact = calculateHealthImpact(feedback.rating, feedback.feedback_type)
      
      const healthPromise = supabase
        .from('customer_health')
        .upsert({
          user_id: userId,
          satisfaction_score: feedback.rating * 20, // Convert 1-5 to 0-100 scale
          last_feedback_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      promises.push(healthPromise)
    }

    // 2. Create follow-up actions for low ratings
    if (feedback.rating && feedback.rating <= 2) {
      const alertPromise = supabase
        .from('in_app_messages')
        .insert({
          user_id: userId,
          title: 'We value your feedback',
          content: 'Thank you for your feedback. Our team will review it and work on improvements.',
          type: 'support_followup',
          is_read: false,
          scheduled_at: new Date().toISOString(),
          metadata: {
            feedback_id: feedback.id,
            rating: feedback.rating,
            requires_followup: true
          }
        })
      
      promises.push(alertPromise)
    }

    // 3. Log feedback event
    const eventPromise = supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: 'feedback_submitted',
          feedback_type: feedback.feedback_type,
          rating: feedback.rating,
          has_comment: !!feedback.comment,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })

    promises.push(eventPromise)

    // Execute all actions in parallel
    await Promise.allSettled(promises)

  } catch (error) {
    console.error('Feedback actions error:', error)
    // Don't throw - feedback submission should succeed even if post-actions fail
  }
}

// Helper function to calculate health impact from feedback
function calculateHealthImpact(rating: number, feedbackType: string): number {
  const baseImpact = (rating - 3) * 5 // -10 to +10 scale
  
  // Different feedback types have different impacts
  const typeMultipliers = {
    'nps': 1.5,
    'csat': 1.2,
    'rating': 1.0,
    'comment': 0.8,
    'bug_report': 1.3,
    'feature_request': 0.6
  }
  
  const multiplier = typeMultipliers[feedbackType as keyof typeof typeMultipliers] || 1.0
  
  return Math.round(baseImpact * multiplier)
}