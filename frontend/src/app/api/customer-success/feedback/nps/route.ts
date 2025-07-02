import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { customerSuccessSchemas } from '@/shared/schemas/customer-success'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const organizationId = searchParams.get('organization_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const includeAnalytics = searchParams.get('include_analytics')

    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Build query for NPS feedback
    let query = supabase
      .from('user_feedback')
      .select('*')
      .eq('feedback_type', 'nps')

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

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Order by most recent
    query = query.order('created_at', { ascending: false })

    const { data: npsData, error } = await query

    if (error) {
      console.error('Error fetching NPS data:', error)
      return NextResponse.json(
        { error: 'Failed to fetch NPS data' }, 
        { status: 500 }
      )
    }

    let analytics = null
    if (includeAnalytics === 'true') {
      analytics = await calculateNPSAnalytics(npsData || [], organizationId, supabase)
    }

    return NextResponse.json({
      success: true,
      data: npsData,
      count: npsData?.length || 0,
      analytics
    })

  } catch (error) {
    console.error('NPS API error:', error)
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

    // Validate NPS submission
    const npsValidation = z.object({
      score: z.number().min(0).max(10),
      comment: z.string().optional(),
      organization_id: z.string().uuid().optional(),
      context: z.string().optional(),
      metadata: z.record(z.any()).optional()
    }).safeParse(body)

    if (!npsValidation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid NPS data',
          details: npsValidation.error.errors
        }, 
        { status: 400 }
      )
    }

    const { score, comment, organization_id, context, metadata } = npsValidation.data
    const supabase = createClient()

    // Check for recent NPS submission (prevent spam)
    const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    const { data: recentNPS } = await supabase
      .from('user_feedback')
      .select('id')
      .eq('user_id', user.id)
      .eq('feedback_type', 'nps')
      .gte('created_at', recentCutoff.toISOString())
      .limit(1)

    if (recentNPS && recentNPS.length > 0) {
      return NextResponse.json(
        { error: 'You have already submitted NPS feedback recently. Please wait before submitting again.' }, 
        { status: 429 }
      )
    }

    // Determine NPS category
    const npsCategory = getNPSCategory(score)

    // Create NPS feedback record
    const npsData = {
      user_id: user.id,
      organization_id,
      feedback_type: 'nps' as const,
      rating: score,
      comment: comment || null,
      sentiment: calculateNPSSentiment(score, comment),
      context: context || 'general',
      metadata: {
        ...metadata,
        nps_category: npsCategory,
        submission_context: context || 'general',
        timestamp: new Date().toISOString()
      },
      submitted_at: new Date().toISOString(),
      is_processed: false
    }

    const { data: newNPS, error } = await supabase
      .from('user_feedback')
      .insert([npsData])
      .select()
      .single()

    if (error) {
      console.error('Error creating NPS feedback:', error)
      return NextResponse.json(
        { error: 'Failed to submit NPS feedback' }, 
        { status: 500 }
      )
    }

    // Trigger NPS-specific actions
    await triggerNPSActions(user.id, newNPS, supabase)

    return NextResponse.json({
      success: true,
      data: newNPS,
      message: 'NPS feedback submitted successfully',
      nps_category: npsCategory
    }, { status: 201 })

  } catch (error) {
    console.error('NPS submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to get NPS category
function getNPSCategory(score: number): 'promoter' | 'passive' | 'detractor' {
  if (score >= 9) return 'promoter'
  if (score >= 7) return 'passive'
  return 'detractor'
}

// Helper function to calculate NPS sentiment
function calculateNPSSentiment(score: number, comment?: string): 'positive' | 'neutral' | 'negative' {
  if (score >= 9) return 'positive'
  if (score >= 7) return 'neutral'
  
  // For detractors, check comment sentiment if available
  if (comment) {
    const positiveWords = ['good', 'great', 'excellent', 'love', 'amazing', 'perfect', 'wonderful']
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'disappointing', 'frustrating']
    
    const lowerComment = comment.toLowerCase()
    const hasPositive = positiveWords.some(word => lowerComment.includes(word))
    const hasNegative = negativeWords.some(word => lowerComment.includes(word))
    
    if (hasPositive && !hasNegative) return 'neutral'
  }
  
  return 'negative'
}

// Helper function to calculate NPS analytics
async function calculateNPSAnalytics(npsData: any[], organizationId: string | null, supabase: any) {
  try {
    // Get broader organizational data if available
    let allNPSQuery = supabase
      .from('user_feedback')
      .select('rating, created_at')
      .eq('feedback_type', 'nps')

    if (organizationId) {
      allNPSQuery = allNPSQuery.eq('organization_id', organizationId)
    }

    // Get data from last 90 days for trend analysis
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    allNPSQuery = allNPSQuery.gte('created_at', ninetyDaysAgo.toISOString())

    const { data: allNPSData } = await allNPSQuery

    if (!allNPSData || allNPSData.length === 0) {
      return {
        nps_score: null,
        total_responses: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        trend: 'stable'
      }
    }

    // Calculate NPS metrics
    const promoters = allNPSData.filter(d => d.rating >= 9).length
    const passives = allNPSData.filter(d => d.rating >= 7 && d.rating <= 8).length
    const detractors = allNPSData.filter(d => d.rating <= 6).length
    const totalResponses = allNPSData.length

    const promoterPercentage = (promoters / totalResponses) * 100
    const detractorPercentage = (detractors / totalResponses) * 100
    const npsScore = Math.round(promoterPercentage - detractorPercentage)

    // Calculate trend (compare first half vs second half of period)
    const midPoint = new Date(ninetyDaysAgo.getTime() + 45 * 24 * 60 * 60 * 1000)
    const firstHalf = allNPSData.filter(d => new Date(d.created_at) < midPoint)
    const secondHalf = allNPSData.filter(d => new Date(d.created_at) >= midPoint)

    let trend = 'stable'
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstHalfNPS = calculateNPSFromData(firstHalf)
      const secondHalfNPS = calculateNPSFromData(secondHalf)
      
      if (secondHalfNPS > firstHalfNPS + 5) trend = 'improving'
      else if (secondHalfNPS < firstHalfNPS - 5) trend = 'declining'
    }

    return {
      nps_score: npsScore,
      total_responses: totalResponses,
      promoters,
      passives,
      detractors,
      promoter_percentage: Math.round(promoterPercentage),
      detractor_percentage: Math.round(detractorPercentage),
      trend,
      average_score: Math.round((allNPSData.reduce((sum, d) => sum + d.rating, 0) / totalResponses) * 10) / 10
    }

  } catch (error) {
    console.error('Error calculating NPS analytics:', error)
    return null
  }
}

// Helper function to calculate NPS from data array
function calculateNPSFromData(data: any[]): number {
  if (data.length === 0) return 0
  
  const promoters = data.filter(d => d.rating >= 9).length
  const detractors = data.filter(d => d.rating <= 6).length
  const total = data.length
  
  return Math.round(((promoters / total) - (detractors / total)) * 100)
}

// Helper function to trigger NPS-specific actions
async function triggerNPSActions(userId: string, npsData: any, supabase: any) {
  try {
    const promises = []
    const { rating, metadata } = npsData

    // 1. Update customer health with NPS impact
    const healthImpact = (rating - 5) * 10 // -50 to +50 impact
    const healthPromise = supabase
      .from('customer_health')
      .upsert({
        user_id: userId,
        satisfaction_score: rating * 10, // Convert 0-10 to 0-100
        nps_score: rating,
        last_feedback_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    promises.push(healthPromise)

    // 2. Create follow-up actions based on NPS category
    if (metadata.nps_category === 'detractor') {
      // Create support follow-up for detractors
      const detractorFollowup = supabase
        .from('in_app_messages')
        .insert({
          user_id: userId,
          title: 'We want to make things right',
          content: 'Thank you for your feedback. Our team will reach out to understand how we can improve your experience.',
          type: 'support_followup',
          is_read: false,
          scheduled_at: new Date().toISOString(),
          metadata: {
            nps_followup: true,
            nps_score: rating,
            priority: 'high'
          }
        })
      
      promises.push(detractorFollowup)
    } else if (metadata.nps_category === 'promoter') {
      // Thank promoters and potentially ask for referral
      const promoterThank = supabase
        .from('in_app_messages')
        .insert({
          user_id: userId,
          title: 'Thank you for being a fan!',
          content: 'We\'re thrilled you love our product! Would you consider referring a friend?',
          type: 'feature_highlight',
          is_read: false,
          scheduled_at: new Date().toISOString(),
          metadata: {
            nps_followup: true,
            nps_score: rating,
            referral_opportunity: true
          }
        })
      
      promises.push(promoterThank)
    }

    // 3. Log NPS event
    const eventPromise = supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: 'nps_submitted',
          nps_score: rating,
          nps_category: metadata.nps_category,
          has_comment: !!npsData.comment,
          context: npsData.context,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })

    promises.push(eventPromise)

    // Execute all actions in parallel
    await Promise.allSettled(promises)

  } catch (error) {
    console.error('NPS actions error:', error)
    // Don't throw - NPS submission should succeed even if post-actions fail
  }
}