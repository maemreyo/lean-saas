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
    const validation = customerSuccessSchemas.updateOnboardingProgressRequest.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        }, 
        { status: 400 }
      )
    }

    const { onboarding_id, step_number, step_data, action } = validation.data
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

    // Calculate new progress
    let updatedData: any = {
      current_step: step_number,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Handle different actions
    if (action === 'start' && currentOnboarding.status === 'not_started') {
      updatedData.status = 'in_progress'
      updatedData.started_at = new Date().toISOString()
    }

    if (action === 'complete_step') {
      // Add to completed steps if not already there
      const completedSteps = Array.isArray(currentOnboarding.completed_steps) 
        ? currentOnboarding.completed_steps 
        : []
      
      if (!completedSteps.includes(step_number)) {
        completedSteps.push(step_number)
        updatedData.completed_steps = completedSteps
      }

      // Update step data if provided
      if (step_data) {
        const currentStepData = currentOnboarding.step_data || {}
        updatedData.step_data = {
          ...currentStepData,
          [`step_${step_number}`]: step_data
        }
      }

      // Calculate completion percentage
      const totalSteps = currentOnboarding.total_steps || 5
      updatedData.completion_percentage = Math.round((completedSteps.length / totalSteps) * 100)

      // Update status if needed
      if (updatedData.completion_percentage === 100) {
        updatedData.status = 'completed'
        updatedData.completed_at = new Date().toISOString()
      } else if (currentOnboarding.status === 'not_started') {
        updatedData.status = 'in_progress'
        updatedData.started_at = new Date().toISOString()
      }
    }

    if (action === 'skip_step') {
      // Add to skipped steps
      const skippedSteps = Array.isArray(currentOnboarding.skipped_steps) 
        ? currentOnboarding.skipped_steps 
        : []
      
      if (!skippedSteps.includes(step_number)) {
        skippedSteps.push(step_number)
        updatedData.skipped_steps = skippedSteps
      }
    }

    // Update onboarding record
    const { data: updatedOnboarding, error: updateError } = await supabase
      .from('user_onboarding')
      .update(updatedData)
      .eq('id', onboarding_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating onboarding progress:', updateError)
      return NextResponse.json(
        { error: 'Failed to update progress' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedOnboarding,
      message: 'Progress updated successfully'
    })

  } catch (error) {
    console.error('Onboarding progress error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { onboarding_id, completed_steps, skipped_steps, step_data } = body

    if (!onboarding_id) {
      return NextResponse.json(
        { error: 'Onboarding ID is required' }, 
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Verify ownership
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

    // Prepare update data
    const updateData: any = {
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (completed_steps !== undefined) {
      updateData.completed_steps = completed_steps
      
      // Recalculate completion percentage
      const totalSteps = currentOnboarding.total_steps || 5
      updateData.completion_percentage = Math.round((completed_steps.length / totalSteps) * 100)
      
      // Update status based on completion
      if (updateData.completion_percentage === 100) {
        updateData.status = 'completed'
        updateData.completed_at = new Date().toISOString()
      } else if (currentOnboarding.status === 'not_started' && completed_steps.length > 0) {
        updateData.status = 'in_progress'
        updateData.started_at = updateData.started_at || new Date().toISOString()
      }
    }

    if (skipped_steps !== undefined) {
      updateData.skipped_steps = skipped_steps
    }

    if (step_data !== undefined) {
      updateData.step_data = {
        ...currentOnboarding.step_data,
        ...step_data
      }
    }

    // Update record
    const { data: updatedOnboarding, error: updateError } = await supabase
      .from('user_onboarding')
      .update(updateData)
      .eq('id', onboarding_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error bulk updating progress:', updateError)
      return NextResponse.json(
        { error: 'Failed to update progress' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedOnboarding,
      message: 'Progress updated successfully'
    })

  } catch (error) {
    console.error('Bulk progress update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}