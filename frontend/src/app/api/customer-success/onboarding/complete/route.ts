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
    const validation = customerSuccessSchemas.completeOnboardingRequest.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        }, 
        { status: 400 }
      )
    }

    const { onboarding_id, completion_data, feedback } = validation.data
    const supabase = createClient()

    // Get current onboarding state
    const { data: currentOnboarding, error: fetchError } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('id', onboarding_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !currentOnboarding) {
      return NextResponse.json(
        { error: 'Onboarding not found or access denied' }, 
        { status: 404 }
      )
    }

    // Check if already completed
    if (currentOnboarding.status === 'completed') {
      return NextResponse.json({
        success: true,
        data: currentOnboarding,
        message: 'Onboarding already completed'
      })
    }

    const completionTime = new Date().toISOString()

    // Prepare completion data
    const updateData = {
      status: 'completed' as const,
      completed_at: completionTime,
      completion_percentage: 100,
      last_activity_at: completionTime,
      updated_at: completionTime
    }

    // Add completion-specific data if provided
    if (completion_data) {
      updateData.step_data = {
        ...currentOnboarding.step_data,
        completion_data
      }
    }

    // Add feedback to metadata if provided
    if (feedback) {
      updateData.metadata = {
        ...currentOnboarding.metadata,
        completion_feedback: feedback,
        completed_at: completionTime
      }
    }

    // Mark all remaining steps as completed if not already
    const totalSteps = currentOnboarding.total_steps || 5
    const completedSteps = Array.isArray(currentOnboarding.completed_steps) 
      ? currentOnboarding.completed_steps 
      : []
    
    const allSteps = Array.from({ length: totalSteps }, (_, i) => i + 1)
    const missingSteps = allSteps.filter(step => !completedSteps.includes(step))
    
    updateData.completed_steps = [...completedSteps, ...missingSteps]

    // Update onboarding record
    const { data: completedOnboarding, error: updateError } = await supabase
      .from('user_onboarding')
      .update(updateData)
      .eq('id', onboarding_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error completing onboarding:', updateError)
      return NextResponse.json(
        { error: 'Failed to complete onboarding' }, 
        { status: 500 }
      )
    }

    // Optional: Trigger post-completion actions
    await triggerPostCompletionActions(user.id, completedOnboarding, supabase)

    return NextResponse.json({
      success: true,
      data: completedOnboarding,
      message: 'Onboarding completed successfully'
    })

  } catch (error) {
    console.error('Onboarding completion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to trigger post-completion actions
async function triggerPostCompletionActions(userId: string, onboarding: any, supabase: any) {
  try {
    // 1. Update customer health score
    const healthUpdatePromise = supabase
      .from('customer_health')
      .upsert({
        user_id: userId,
        health_score: Math.min((onboarding.completion_percentage / 100) * 20 + 80, 100), // Boost health score
        engagement_score: 85, // High engagement after completion
        onboarding_completed: true,
        last_activity_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    // 2. Create a welcome message
    const messagePromise = supabase
      .from('in_app_messages')
      .insert({
        user_id: userId,
        title: 'Welcome! You\'re all set up!',
        content: 'Congratulations on completing your onboarding. You\'re now ready to explore all features.',
        type: 'announcement',
        is_read: false,
        scheduled_at: new Date().toISOString(),
        metadata: {
          onboarding_completion: true,
          flow_name: onboarding.flow_name
        }
      })

    // 3. Log completion event for analytics
    const eventPromise = supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: 'onboarding_completed',
          flow_name: onboarding.flow_name,
          completion_time: onboarding.completed_at,
          total_duration: calculateOnboardingDuration(onboarding)
        },
        created_at: new Date().toISOString()
      })

    // Execute all actions in parallel
    await Promise.allSettled([
      healthUpdatePromise,
      messagePromise,
      eventPromise
    ])

  } catch (error) {
    console.error('Post-completion actions error:', error)
    // Don't throw - completion should succeed even if post-actions fail
  }
}

// Helper function to calculate onboarding duration
function calculateOnboardingDuration(onboarding: any): number {
  if (!onboarding.started_at || !onboarding.completed_at) {
    return 0
  }
  
  const startTime = new Date(onboarding.started_at).getTime()
  const endTime = new Date(onboarding.completed_at).getTime()
  
  return Math.round((endTime - startTime) / 1000 / 60) // Duration in minutes
}