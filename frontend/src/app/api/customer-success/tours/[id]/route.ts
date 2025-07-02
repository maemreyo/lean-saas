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

    const { data: tour, error } = await supabase
      .from('feature_tours')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user can only access their own tours
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Tour not found' }, 
          { status: 404 }
        )
      }
      console.error('Error fetching tour:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tour' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: tour
    })

  } catch (error) {
    console.error('Tour fetch error:', error)
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
    const validation = customerSuccessSchemas.updateFeatureTour.safeParse(body)
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
    const { data: existingTour } = await supabase
      .from('feature_tours')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingTour) {
      return NextResponse.json(
        { error: 'Tour not found or access denied' }, 
        { status: 404 }
      )
    }

    // Update tour
    const { data: updatedTour, error } = await supabase
      .from('feature_tours')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating tour:', error)
      return NextResponse.json(
        { error: 'Failed to update tour' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedTour,
      message: 'Tour updated successfully'
    })

  } catch (error) {
    console.error('Tour update error:', error)
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
    const { data: existingTour } = await supabase
      .from('feature_tours')
      .select('id, user_id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingTour) {
      return NextResponse.json(
        { error: 'Tour not found or access denied' }, 
        { status: 404 }
      )
    }

    // Soft delete by marking as inactive and completed
    const { data: deletedTour, error } = await supabase
      .from('feature_tours')
      .update({
        is_active: false,
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error deleting tour:', error)
      return NextResponse.json(
        { error: 'Failed to delete tour' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: deletedTour,
      message: 'Tour deleted successfully'
    })

  } catch (error) {
    console.error('Tour deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}