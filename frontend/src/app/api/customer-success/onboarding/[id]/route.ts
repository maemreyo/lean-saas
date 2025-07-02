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

    const { data: onboarding, error } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user can only access their own onboarding
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Onboarding not found' }, 
          { status: 404 }
        )
      }
      console.error('Error fetching onboarding:', error)
      return NextResponse.json(
        { error: 'Failed to fetch onboarding' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: onboarding
    })

  } catch (error) {
    console.error('Onboarding fetch error:', error)
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
    const validation = customerSuccessSchemas.updateUserOnboarding.safeParse(body)
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
    const { data: existingOnboarding } = await supabase
      .from('user_onboarding')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingOnboarding) {
      return NextResponse.json(
        { error: 'Onboarding not found or access denied' }, 
        { status: 404 }
      )
    }

    // Update onboarding
    const { data: updatedOnboarding, error } = await supabase
      .from('user_onboarding')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating onboarding:', error)
      return NextResponse.json(
        { error: 'Failed to update onboarding' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedOnboarding,
      message: 'Onboarding updated successfully'
    })

  } catch (error) {
    console.error('Onboarding update error:', error)
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
    const { data: existingOnboarding } = await supabase
      .from('user_onboarding')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingOnboarding) {
      return NextResponse.json(
        { error: 'Onboarding not found or access denied' }, 
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('user_onboarding')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting onboarding:', error)
      return NextResponse.json(
        { error: 'Failed to delete onboarding' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding deleted successfully'
    })

  } catch (error) {
    console.error('Onboarding deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}