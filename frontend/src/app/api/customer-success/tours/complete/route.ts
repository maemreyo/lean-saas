import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { customerSuccessSchemas } from '@/shared/schemas/customer-success'
import { getUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request body
    const validation = customerSuccessSchemas.completeTourRequest.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        }, 
        { status: 400 }
      )
    }

    const { tour_id, completion_data, rating, feedback } = validation.data
    const supabase = createClient()

    // Get current tour state
    const { data: currentTour, error: fetchError } = await supabase
      .from('feature_tours')
      .select('*')
      .eq('id', tour_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !currentTour) {
      return NextResponse.json(
        { error: 'Tour not found or access denied' }, 
        { status: 404 }
      )
    }

    // Check if already completed
    if (currentTour.status === 'completed') {
      return NextResponse.json({
        success: true,
        data: currentTour,
        message: 'Tour already completed'
      })
    }

    const completionTime = new Date().toISOString()

    // Calculate completion metrics
    const totalSteps = currentTour.total_steps || 5
    const completedSteps = Array.isArray(currentTour.steps_completed) 
      ? currentTour.steps_completed 
      : []
    const skippedSteps = Array.isArray(currentTour.steps_skipped) 
      ? currentTour.steps_skipped 
      : []

    // Mark any remaining steps as completed
    const allSteps = Array.from({ length: totalSteps }, (_, i) => i + 1)
    const missingSteps = allSteps.filter(step => 
      !completedSteps.includes(step) && !skippedSteps.includes(step)
    )

    // Prepare completion data
    const updateData = {
      status: 'completed' as const,
      completed_at: completionTime,
      completion_percentage: 100,
      steps_completed: [...completedSteps, ...missingSteps],
      is_active: false,
      last_activity_at: completionTime,
      updated_at: completionTime
    }

    // Add completion-specific data
    const metadata = {
      ...currentTour.metadata,
      completion_data: completion_data || {},
      completed_at: completionTime,
      duration_minutes: calculateTourDuration(currentTour, completionTime)
    }

    // Add rating and feedback if provided
    if (rating !== undefined) {
      metadata.completion_rating = rating
    }

    if (feedback) {
      metadata.completion_feedback = feedback
    }

    updateData.metadata = metadata

    // Update tour record
    const { data: completedTour, error: updateError } = await supabase
      .from('feature_tours')
      .update(updateData)
      .eq('id', tour_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error completing tour:', updateError)
      return NextResponse.json(
        { error: 'Failed to complete tour' }, 
        { status: 500 }
      )
    }

    // Trigger post-completion actions
    await triggerTourCompletionActions(user.id, completedTour, supabase)

    return NextResponse.json({
      success: true,
      data: completedTour,
      message: 'Tour completed successfully'
    })

  } catch (error) {
    console.error('Tour completion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to calculate tour duration
function calculateTourDuration(tour: any, completionTime: string): number {
  if (!tour.started_at) {
    return 0
  }
  
  const startTime = new Date(tour.started_at).getTime()
  const endTime = new Date(completionTime).getTime()
  
  return Math.round((endTime - startTime) / 1000 / 60) // Duration in minutes
}

// Helper function to trigger post-completion actions
async function triggerTourCompletionActions(userId: string, tour: any, supabase: any) {
  try {
    const promises = []

    // 1. Update feature adoption score
    const adoptionPromise = supabase
      .from('feature_adoption')
      .upsert({
        user_id: userId,
        feature_name: `tour_${tour.tour_name}`,
        adoption_status: 'active',
        usage_count: 1,
        adoption_score: 80, // High score for completing tour
        last_used_at: new Date().toISOString(),
        metadata: {
          tour_completed: true,
          tour_id: tour.id,
          completion_date: tour.completed_at
        },
        updated_at: new Date().toISOString()
      })

    // 2. Update customer health score
    const healthPromise = supabase
      .from('customer_health')
      .upsert({
        user_id: userId,
        engagement_score: Math.min(
          (await getCurrentEngagementScore(userId, supabase)) + 10, 
          100
        ), // Boost engagement
        last_activity_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    // 3. Create success message if tour was rated highly
    if (tour.metadata?.completion_rating >= 4) {
      const messagePromise = supabase
        .from('in_app_messages')
        .insert({
          user_id: userId,
          title: 'Great job completing the tour!',
          content: `You've successfully completed the ${tour.tour_name} tour. You're now ready to make the most of this feature!`,
          type: 'feature_highlight',
          is_read: false,
          scheduled_at: new Date().toISOString(),
          metadata: {
            tour_completion: true,
            tour_id: tour.id,
            tour_name: tour.tour_name
          }
        })
      
      promises.push(messagePromise)
    }

    // 4. Log completion event
    const eventPromise = supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: 'tour_completed',
          tour_id: tour.id,
          tour_name: tour.tour_name,
          completion_time: tour.completed_at,
          duration_minutes: tour.metadata?.duration_minutes || 0,
          rating: tour.metadata?.completion_rating,
          steps_completed: tour.steps_completed?.length || 0,
          steps_skipped: tour.steps_skipped?.length || 0
        },
        created_at: new Date().toISOString()
      })

    promises.push(adoptionPromise, healthPromise, eventPromise)

    // Execute all actions in parallel
    await Promise.allSettled(promises)

  } catch (error) {
    console.error('Tour completion actions error:', error)
    // Don't throw - completion should succeed even if post-actions fail
  }
}

// Helper function to get current engagement score
async function getCurrentEngagementScore(userId: string, supabase: any): Promise<number> {
  try {
    const { data } = await supabase
      .from('customer_health')
      .select('engagement_score')
      .eq('user_id', userId)
      .single()
    
    return data?.engagement_score || 50 // Default engagement score
  } catch {
    return 50
  }
}