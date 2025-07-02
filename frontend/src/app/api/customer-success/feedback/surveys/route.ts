import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { customerSuccessSchemas } from '@/shared/schemas/customer-success'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const organizationId = searchParams.get('organization_id')
    const surveyType = searchParams.get('type')
    const isActive = searchParams.get('is_active')
    const includeResponses = searchParams.get('include_responses')

    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Build query for product surveys
    let query = supabase
      .from('product_surveys')
      .select('*')

    // Apply filters
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (surveyType) {
      query = query.eq('survey_type', surveyType)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    // Order by most recent
    query = query.order('created_at', { ascending: false })

    const { data: surveys, error } = await query

    if (error) {
      console.error('Error fetching surveys:', error)
      return NextResponse.json(
        { error: 'Failed to fetch surveys' }, 
        { status: 500 }
      )
    }

    // If user requests to include responses, fetch them
    let surveysWithResponses = surveys
    if (includeResponses === 'true' && surveys) {
      surveysWithResponses = await Promise.all(
        surveys.map(async (survey) => {
          const { data: responses } = await supabase
            .from('user_feedback')
            .select('*')
            .eq('survey_id', survey.id)
            .eq('user_id', userId || user.id)

          return {
            ...survey,
            user_responses: responses || []
          }
        })
      )
    }

    return NextResponse.json({
      success: true,
      data: surveysWithResponses,
      count: surveys?.length || 0
    })

  } catch (error) {
    console.error('Surveys API error:', error)
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
    const validation = customerSuccessSchemas.createProductSurvey.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        }, 
        { status: 400 }
      )
    }

    const surveyData = validation.data
    const supabase = createClient()

    // Create survey record
    const newSurveyData = {
      ...surveyData,
      created_by: user.id,
      created_at: new Date().toISOString(),
      response_count: 0,
      is_active: surveyData.is_active ?? true
    }

    const { data: newSurvey, error } = await supabase
      .from('product_surveys')
      .insert([newSurveyData])
      .select()
      .single()

    if (error) {
      console.error('Error creating survey:', error)
      return NextResponse.json(
        { error: 'Failed to create survey' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newSurvey,
      message: 'Survey created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Survey creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Handle survey responses
export async function PUT(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate survey response
    const validation = customerSuccessSchemas.submitSurveyResponseRequest.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid survey response data',
          details: validation.error.errors
        }, 
        { status: 400 }
      )
    }

    const { survey_id, responses, metadata } = validation.data
    const supabase = createClient()

    // Verify survey exists and is active
    const { data: survey, error: surveyError } = await supabase
      .from('product_surveys')
      .select('*')
      .eq('id', survey_id)
      .eq('is_active', true)
      .single()

    if (surveyError || !survey) {
      return NextResponse.json(
        { error: 'Survey not found or not active' }, 
        { status: 404 }
      )
    }

    // Check if user already responded
    const { data: existingResponse } = await supabase
      .from('user_feedback')
      .select('id')
      .eq('survey_id', survey_id)
      .eq('user_id', user.id)
      .single()

    if (existingResponse) {
      return NextResponse.json(
        { error: 'You have already responded to this survey' }, 
        { status: 409 }
      )
    }

    // Process responses and create feedback entries
    const feedbackEntries = []
    let overallRating = 0
    let ratingCount = 0

    for (const [questionId, response] of Object.entries(responses)) {
      // Calculate rating if response is numeric
      if (typeof response === 'number') {
        overallRating += response
        ratingCount++
      }

      const feedbackEntry = {
        user_id: user.id,
        organization_id: survey.organization_id,
        survey_id: survey_id,
        feedback_type: 'survey_response' as const,
        rating: typeof response === 'number' ? response : null,
        comment: typeof response === 'string' ? response : null,
        metadata: {
          question_id: questionId,
          response_data: response,
          survey_metadata: metadata
        },
        submitted_at: new Date().toISOString()
      }

      feedbackEntries.push(feedbackEntry)
    }

    // Insert all feedback entries
    const { data: submittedFeedback, error: feedbackError } = await supabase
      .from('user_feedback')
      .insert(feedbackEntries)
      .select()

    if (feedbackError) {
      console.error('Error submitting survey responses:', feedbackError)
      return NextResponse.json(
        { error: 'Failed to submit survey responses' }, 
        { status: 500 }
      )
    }

    // Update survey response count
    await supabase
      .from('product_surveys')
      .update({ 
        response_count: survey.response_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', survey_id)

    // Trigger post-response actions
    const avgRating = ratingCount > 0 ? overallRating / ratingCount : null
    await triggerSurveyResponseActions(user.id, survey, avgRating, supabase)

    return NextResponse.json({
      success: true,
      data: submittedFeedback,
      message: 'Survey responses submitted successfully'
    })

  } catch (error) {
    console.error('Survey response error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to trigger post-survey actions
async function triggerSurveyResponseActions(userId: string, survey: any, avgRating: number | null, supabase: any) {
  try {
    const promises = []

    // 1. Update customer health if rating provided
    if (avgRating) {
      const healthPromise = supabase
        .from('customer_health')
        .upsert({
          user_id: userId,
          satisfaction_score: avgRating * 20, // Convert to 0-100 scale
          last_feedback_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      promises.push(healthPromise)
    }

    // 2. Send thank you message
    const messagePromise = supabase
      .from('in_app_messages')
      .insert({
        user_id: userId,
        title: 'Thank you for your feedback!',
        content: `Your responses to the ${survey.title} survey have been received. We appreciate your input!`,
        type: 'notification',
        is_read: false,
        scheduled_at: new Date().toISOString(),
        metadata: {
          survey_response: true,
          survey_id: survey.id,
          survey_type: survey.survey_type
        }
      })

    promises.push(messagePromise)

    // 3. Log survey completion event
    const eventPromise = supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: 'survey_completed',
          survey_id: survey.id,
          survey_type: survey.survey_type,
          average_rating: avgRating,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })

    promises.push(eventPromise)

    // Execute all actions in parallel
    await Promise.allSettled(promises)

  } catch (error) {
    console.error('Survey response actions error:', error)
    // Don't throw - response should succeed even if post-actions fail
  }
}