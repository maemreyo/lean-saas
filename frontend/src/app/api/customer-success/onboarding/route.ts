import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { customerSuccessSchemas } from '@/shared/schemas/customer-success'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const organizationId = searchParams.get('organization_id')
    const flowName = searchParams.get('flow_name')
    const status = searchParams.get('status')

    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Build query
    let query = supabase
      .from('user_onboarding')
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

    if (flowName) {
      query = query.eq('flow_name', flowName)
    }

    if (status) {
      query = query.eq('status', status)
    }

    // Order by most recent
    query = query.order('created_at', { ascending: false })

    const { data: onboardingData, error } = await query

    if (error) {
      console.error('Error fetching onboarding data:', error)
      return NextResponse.json(
        { error: 'Failed to fetch onboarding data' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: onboardingData,
      count: onboardingData?.length || 0
    })

  } catch (error) {
    console.error('Onboarding API error:', error)
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
    const validation = customerSuccessSchemas.startOnboardingRequest.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        }, 
        { status: 400 }
      )
    }

    const { flow_name, organization_id, metadata } = validation.data

    const supabase = createClient()

    // Check if user already has an active onboarding for this flow
    const { data: existingOnboarding } = await supabase
      .from('user_onboarding')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('flow_name', flow_name)
      .in('status', ['not_started', 'in_progress'])
      .single()

    if (existingOnboarding) {
      return NextResponse.json({
        success: true,
        data: existingOnboarding,
        message: 'Onboarding already exists'
      })
    }

    // Create new onboarding record
    const onboardingData = {
      user_id: user.id,
      organization_id,
      flow_name,
      current_step: 1,
      total_steps: 5, // Default, can be configured
      status: 'not_started' as const,
      started_at: null,
      completed_at: null,
      last_activity_at: new Date().toISOString(),
      completion_percentage: 0,
      completed_steps: [],
      skipped_steps: [],
      step_data: {},
      metadata: metadata || {}
    }

    const { data: newOnboarding, error } = await supabase
      .from('user_onboarding')
      .insert([onboardingData])
      .select()
      .single()

    if (error) {
      console.error('Error creating onboarding:', error)
      return NextResponse.json(
        { error: 'Failed to create onboarding' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newOnboarding,
      message: 'Onboarding created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Onboarding creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}