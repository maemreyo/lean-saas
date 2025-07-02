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
    const validation = customerSuccessSchemas.startTourRequest.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        }, 
        { status: 400 }
      )
    }

    const { tour_id, tour_name, organization_id, restart } = validation.data
    const supabase = createClient()

    let tour = null

    // If tour_id is provided, use existing tour
    if (tour_id) {
      const { data: existingTour, error: fetchError } = await supabase
        .from('feature_tours')
        .select('*')
        .eq('id', tour_id)
        .eq('user_id', user.id)
        .single()

      if (fetchError || !existingTour) {
        return NextResponse.json(
          { error: 'Tour not found or access denied' }, 
          { status: 404 }
        )
      }

      tour = existingTour

      // If tour is already active and not restarting, return existing
      if (tour.status === 'active' && !restart) {
        return NextResponse.json({
          success: true,
          data: tour,
          message: 'Tour is already active'
        })
      }
    } else if (tour_name) {
      // Find tour by name
      const { data: existingTour } = await supabase
        .from('feature_tours')
        .select('*')
        .eq('user_id', user.id)
        .eq('tour_name', tour_name)
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      tour = existingTour

      // If no existing tour found, create a new one
      if (!tour) {
        const newTourData = {
          user_id: user.id,
          organization_id,
          tour_name,
          status: 'active' as const,
          current_step: 1,
          steps_completed: [],
          steps_skipped: [],
          is_active: true,
          started_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
          tour_config: {},
          metadata: {}
        }

        const { data: newTour, error: createError } = await supabase
          .from('feature_tours')
          .insert([newTourData])
          .select()
          .single()

        if (createError) {
          console.error('Error creating new tour:', createError)
          return NextResponse.json(
            { error: 'Failed to create tour' }, 
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: newTour,
          message: 'Tour created and started successfully'
        }, { status: 201 })
      }
    } else {
      return NextResponse.json(
        { error: 'Either tour_id or tour_name must be provided' }, 
        { status: 400 }
      )
    }

    // Prepare update data for starting/restarting tour
    const updateData: any = {
      status: 'active',
      is_active: true,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // If restarting, reset progress
    if (restart) {
      updateData.current_step = 1
      updateData.steps_completed = []
      updateData.steps_skipped = []
      updateData.started_at = new Date().toISOString()
      updateData.completed_at = null
      updateData.completion_percentage = 0
    } else if (tour.status !== 'active') {
      // If starting for first time or resuming
      if (!tour.started_at) {
        updateData.started_at = new Date().toISOString()
      }
    }

    // Update tour record
    const { data: updatedTour, error: updateError } = await supabase
      .from('feature_tours')
      .update(updateData)
      .eq('id', tour.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error starting tour:', updateError)
      return NextResponse.json(
        { error: 'Failed to start tour' }, 
        { status: 500 }
      )
    }

    // Log tour start event
    await logTourEvent(user.id, updatedTour, 'tour_started', supabase)

    return NextResponse.json({
      success: true,
      data: updatedTour,
      message: restart ? 'Tour restarted successfully' : 'Tour started successfully'
    })

  } catch (error) {
    console.error('Tour start error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to log tour events
async function logTourEvent(userId: string, tour: any, eventType: string, supabase: any) {
  try {
    await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: eventType,
          tour_id: tour.id,
          tour_name: tour.tour_name,
          current_step: tour.current_step,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging tour event:', error)
    // Don't throw - tour should succeed even if logging fails
  }
}