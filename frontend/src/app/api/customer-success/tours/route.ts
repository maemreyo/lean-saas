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
    const isActive = searchParams.get('is_active')

    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Build query for feature tours
    let query = supabase
      .from('feature_tours')
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

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    // Order by created date (newest first)
    query = query.order('created_at', { ascending: false })

    const { data: tours, error } = await query

    if (error) {
      console.error('Error fetching tours:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tours' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: tours,
      count: tours?.length || 0
    })

  } catch (error) {
    console.error('Tours API error:', error)
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
    const validation = customerSuccessSchemas.createFeatureTour.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        }, 
        { status: 400 }
      )
    }

    const tourData = validation.data
    const supabase = createClient()

    // Check if user already has an active tour with the same name
    const { data: existingTour } = await supabase
      .from('feature_tours')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('tour_name', tourData.tour_name)
      .eq('is_active', true)
      .single()

    if (existingTour && existingTour.status === 'active') {
      return NextResponse.json({
        success: true,
        data: existingTour,
        message: 'Active tour already exists'
      })
    }

    // Create new tour record
    const newTourData = {
      ...tourData,
      user_id: user.id,
      status: 'active' as const,
      current_step: 1,
      steps_completed: [],
      steps_skipped: [],
      is_active: true,
      started_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString()
    }

    const { data: newTour, error } = await supabase
      .from('feature_tours')
      .insert([newTourData])
      .select()
      .single()

    if (error) {
      console.error('Error creating tour:', error)
      return NextResponse.json(
        { error: 'Failed to create tour' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newTour,
      message: 'Tour created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Tour creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}