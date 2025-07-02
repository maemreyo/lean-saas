// Feedback Collection, NPS Calculation, and Sentiment Analysis

import { createClient } from '@/lib/supabase/client'
import { 
  UserFeedback, 
  UserFeedbackInsert, 
  UserFeedbackUpdate,
  FeedbackType,
  SubmitFeedbackRequest
} from '@/shared/types/customer-success'
import { 
  createUserFeedbackSchema,
  updateUserFeedbackSchema,
  submitFeedbackRequestSchema
} from '@/shared/schemas/customer-success'

// ================================================
// FEEDBACK CONSTANTS AND CONFIGURATIONS
// ================================================

export const FEEDBACK_CATEGORIES = {
  nps: {
    detractors: { min: 0, max: 6 },
    passives: { min: 7, max: 8 },
    promoters: { min: 9, max: 10 }
  },
  csat: {
    poor: { min: 1, max: 2 },
    fair: { min: 3, max: 3 },
    good: { min: 4, max: 4 },
    excellent: { min: 5, max: 5 }
  }
}

export const SENTIMENT_KEYWORDS = {
  positive: [
    'great', 'excellent', 'amazing', 'fantastic', 'wonderful', 'perfect', 'awesome',
    'brilliant', 'outstanding', 'superb', 'marvelous', 'incredible', 'fabulous',
    'love', 'like', 'enjoy', 'pleased', 'satisfied', 'happy', 'delighted',
    'impressive', 'smooth', 'easy', 'intuitive', 'helpful', 'useful'
  ],
  negative: [
    'terrible', 'awful', 'horrible', 'bad', 'poor', 'worst', 'hate', 'dislike',
    'frustrated', 'annoying', 'disappointing', 'confusing', 'difficult', 'hard',
    'slow', 'broken', 'buggy', 'useless', 'problem', 'issue', 'error', 'fail',
    'crash', 'stuck', 'complicated', 'unclear', 'missing', 'lacking'
  ],
  neutral: [
    'okay', 'fine', 'average', 'normal', 'standard', 'typical', 'regular',
    'acceptable', 'decent', 'moderate', 'fair', 'reasonable', 'adequate'
  ]
}

// ================================================
// CORE FEEDBACK FUNCTIONS
// ================================================

/**
 * Submit user feedback
 */
export async function submitFeedback(request: SubmitFeedbackRequest): Promise<{
  success: boolean
  data?: UserFeedback
  error?: string
}> {
  try {
    // Validate request
    const validation = submitFeedbackRequestSchema.safeParse(request)
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const { 
      user_id, 
      organization_id, 
      feedback_type, 
      rating, 
      nps_score, 
      csat_score, 
      content, 
      context = {},
      metadata = {} 
    } = validation.data

    const supabase = createClient()

    // Perform sentiment analysis if content is provided
    let sentimentScore: number | undefined
    let sentimentLabel: string | undefined

    if (content) {
      const sentiment = analyzeSentiment(content)
      sentimentScore = sentiment.score
      sentimentLabel = sentiment.label
    }

    // Create feedback record
    const feedbackData: UserFeedbackInsert = {
      user_id,
      organization_id,
      feedback_type,
      rating,
      nps_score,
      csat_score,
      content,
      page_url: context.page_url,
      feature_name: context.feature_name,
      user_segment: context.user_segment,
      sentiment_score: sentimentScore,
      sentiment_label: sentimentLabel,
      processed: false,
      follow_up_required: determineFollowUpRequired(feedback_type, rating, nps_score, csat_score, sentimentScore),
      metadata
    }

    const { data, error } = await supabase
      .from('user_feedback')
      .insert(feedbackData)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`
      }
    }

    // Process feedback for immediate actions
    await processFeedbackActions(data)

    return {
      success: true,
      data
    }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get feedback analytics for organization or user
 */
export async function getFeedbackAnalytics(
  organizationId?: string,
  userId?: string,
  timeRange = '30d',
  feedbackType?: FeedbackType
): Promise<{
  total_feedback: number
  nps_score: number | null
  csat_average: number | null
  satisfaction_distribution: Record<string, number>
  sentiment_distribution: Record<string, number>
  feedback_by_type: Record<FeedbackType, number>
  trending_topics: Array<{ topic: string; count: number; sentiment: string }>
  response_rate: number
}> {
  try {
    const supabase = createClient()
    
    // Calculate date range
    const daysBack = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    let query = supabase
      .from('user_feedback')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (feedbackType) {
      query = query.eq('feedback_type', feedbackType)
    }

    const { data, error } = await query

    if (error || !data) {
      throw new Error(`Failed to fetch feedback analytics: ${error?.message}`)
    }

    const totalFeedback = data.length

    // Calculate NPS Score
    const npsResponses = data.filter(f => f.nps_score !== null && f.nps_score !== undefined)
    let npsScore: number | null = null

    if (npsResponses.length > 0) {
      const promoters = npsResponses.filter(f => f.nps_score! >= 9).length
      const detractors = npsResponses.filter(f => f.nps_score! <= 6).length
      npsScore = Math.round(((promoters - detractors) / npsResponses.length) * 100)
    }

    // Calculate CSAT Average
    const csatResponses = data.filter(f => f.csat_score !== null && f.csat_score !== undefined)
    const csatAverage = csatResponses.length > 0
      ? Math.round((csatResponses.reduce((sum, f) => sum + f.csat_score!, 0) / csatResponses.length) * 100) / 100
      : null

    // Satisfaction distribution
    const satisfactionDistribution: Record<string, number> = {
      very_dissatisfied: 0,
      dissatisfied: 0,
      neutral: 0,
      satisfied: 0,
      very_satisfied: 0
    }

    data.forEach(feedback => {
      if (feedback.rating) {
        if (feedback.rating <= 2) satisfactionDistribution.very_dissatisfied++
        else if (feedback.rating <= 4) satisfactionDistribution.dissatisfied++
        else if (feedback.rating <= 6) satisfactionDistribution.neutral++
        else if (feedback.rating <= 8) satisfactionDistribution.satisfied++
        else satisfactionDistribution.very_satisfied++
      }
    })

    // Sentiment distribution
    const sentimentDistribution: Record<string, number> = {
      positive: data.filter(f => f.sentiment_label === 'positive').length,
      negative: data.filter(f => f.sentiment_label === 'negative').length,
      neutral: data.filter(f => f.sentiment_label === 'neutral').length
    }

    // Feedback by type
    const feedbackByType = data.reduce((acc, f) => {
      acc[f.feedback_type] = (acc[f.feedback_type] || 0) + 1
      return acc
    }, {} as Record<FeedbackType, number>)

    // Trending topics (extract from content)
    const trendingTopics = extractTrendingTopics(data.filter(f => f.content))

    // Response rate (approximate - would need more data for accurate calculation)
    const responseRate = 0 // This would require additional data about feedback requests sent

    return {
      total_feedback: totalFeedback,
      nps_score: npsScore,
      csat_average: csatAverage,
      satisfaction_distribution: satisfactionDistribution,
      sentiment_distribution: sentimentDistribution,
      feedback_by_type: feedbackByType,
      trending_topics: trendingTopics,
      response_rate: responseRate
    }
  } catch (error) {
    console.error('Error calculating feedback analytics:', error)
    return {
      total_feedback: 0,
      nps_score: null,
      csat_average: null,
      satisfaction_distribution: {},
      sentiment_distribution: {},
      feedback_by_type: {} as Record<FeedbackType, number>,
      trending_topics: [],
      response_rate: 0
    }
  }
}

/**
 * Get recent feedback for dashboard
 */
export async function getRecentFeedback(
  organizationId?: string,
  limit = 10,
  includeFollowUpRequired = false
): Promise<UserFeedback[]> {
  try {
    const supabase = createClient()

    let query = supabase
      .from('user_feedback')
      .select(`
        *,
        users:user_id(email, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (includeFollowUpRequired) {
      query = query.eq('follow_up_required', true)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch recent feedback: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error getting recent feedback:', error)
    return []
  }
}

/**
 * Mark feedback as processed
 */
export async function markFeedbackProcessed(
  feedbackId: string,
  followUpNotes?: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createClient()

    const updateData: UserFeedbackUpdate = {
      processed: true,
      follow_up_notes: followUpNotes
    }

    const { error } = await supabase
      .from('user_feedback')
      .update(updateData)
      .eq('id', feedbackId)

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Complete follow-up for feedback
 */
export async function completeFeedbackFollowUp(
  feedbackId: string,
  followUpNotes: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createClient()

    const updateData: UserFeedbackUpdate = {
      follow_up_completed: true,
      follow_up_notes: followUpNotes,
      processed: true
    }

    const { error } = await supabase
      .from('user_feedback')
      .update(updateData)
      .eq('id', feedbackId)

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get feedback by feature or page
 */
export async function getFeedbackByContext(
  context: {
    featureName?: string
    pageUrl?: string
    userSegment?: string
  },
  organizationId?: string,
  timeRange = '30d'
): Promise<{
  feedback: UserFeedback[]
  average_rating: number
  sentiment_summary: Record<string, number>
  common_issues: string[]
}> {
  try {
    const supabase = createClient()
    
    const daysBack = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    let query = supabase
      .from('user_feedback')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (context.featureName) {
      query = query.eq('feature_name', context.featureName)
    }

    if (context.pageUrl) {
      query = query.eq('page_url', context.pageUrl)
    }

    if (context.userSegment) {
      query = query.eq('user_segment', context.userSegment)
    }

    const { data, error } = await query

    if (error || !data) {
      throw new Error(`Failed to fetch feedback by context: ${error?.message}`)
    }

    // Calculate average rating
    const ratingsData = data.filter(f => f.rating !== null && f.rating !== undefined)
    const averageRating = ratingsData.length > 0
      ? Math.round((ratingsData.reduce((sum, f) => sum + f.rating!, 0) / ratingsData.length) * 100) / 100
      : 0

    // Sentiment summary
    const sentimentSummary = {
      positive: data.filter(f => f.sentiment_label === 'positive').length,
      negative: data.filter(f => f.sentiment_label === 'negative').length,
      neutral: data.filter(f => f.sentiment_label === 'neutral').length
    }

    // Extract common issues from negative feedback
    const negativeFeedback = data.filter(f => 
      f.sentiment_label === 'negative' && f.content
    )
    const commonIssues = extractCommonIssues(negativeFeedback)

    return {
      feedback: data,
      average_rating: averageRating,
      sentiment_summary: sentimentSummary,
      common_issues: commonIssues
    }
  } catch (error) {
    console.error('Error getting feedback by context:', error)
    return {
      feedback: [],
      average_rating: 0,
      sentiment_summary: { positive: 0, negative: 0, neutral: 0 },
      common_issues: []
    }
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Analyze sentiment of text content
 */
function analyzeSentiment(text: string): { score: number; label: string } {
  if (!text || text.trim().length === 0) {
    return { score: 0, label: 'neutral' }
  }

  const words = text.toLowerCase().split(/\s+/)
  let positiveCount = 0
  let negativeCount = 0
  let neutralCount = 0

  words.forEach(word => {
    const cleanWord = word.replace(/[^\w]/g, '')
    
    if (SENTIMENT_KEYWORDS.positive.includes(cleanWord)) {
      positiveCount++
    } else if (SENTIMENT_KEYWORDS.negative.includes(cleanWord)) {
      negativeCount++
    } else if (SENTIMENT_KEYWORDS.neutral.includes(cleanWord)) {
      neutralCount++
    }
  })

  const totalSentimentWords = positiveCount + negativeCount + neutralCount

  if (totalSentimentWords === 0) {
    return { score: 0, label: 'neutral' }
  }

  // Calculate sentiment score (-1 to 1)
  const score = (positiveCount - negativeCount) / totalSentimentWords

  // Determine label
  let label: string
  if (score > 0.1) {
    label = 'positive'
  } else if (score < -0.1) {
    label = 'negative'
  } else {
    label = 'neutral'
  }

  return { score: Math.round(score * 100) / 100, label }
}

/**
 * Determine if feedback requires follow-up
 */
function determineFollowUpRequired(
  feedbackType: FeedbackType,
  rating?: number,
  npsScore?: number,
  csatScore?: number,
  sentimentScore?: number
): boolean {
  // NPS detractors require follow-up
  if (npsScore !== null && npsScore !== undefined && npsScore <= 6) {
    return true
  }

  // Low CSAT scores require follow-up
  if (csatScore !== null && csatScore !== undefined && csatScore <= 2) {
    return true
  }

  // Low ratings require follow-up
  if (rating !== null && rating !== undefined && rating <= 4) {
    return true
  }

  // Negative sentiment requires follow-up
  if (sentimentScore !== null && sentimentScore !== undefined && sentimentScore < -0.3) {
    return true
  }

  // Bug reports and feature requests always require follow-up
  if (feedbackType === 'bug_report' || feedbackType === 'feature_request') {
    return true
  }

  return false
}

/**
 * Process immediate actions based on feedback
 */
async function processFeedbackActions(feedback: UserFeedback): Promise<void> {
  try {
    // Send alerts for critical feedback
    if (feedback.follow_up_required) {
      // This would integrate with your alerting system
      console.log(`Critical feedback received from user ${feedback.user_id}`)
    }

    // Trigger auto-responses for specific feedback types
    if (feedback.feedback_type === 'bug_report') {
      // Auto-acknowledge bug reports
      // This would integrate with your customer communication system
    }

    // Update user health score based on feedback
    if (feedback.nps_score !== null || feedback.csat_score !== null) {
      // This would trigger health score recalculation
      // We'll implement this in the health-scoring.ts file
    }
  } catch (error) {
    console.error('Error processing feedback actions:', error)
  }
}

/**
 * Extract trending topics from feedback content
 */
function extractTrendingTopics(feedback: UserFeedback[]): Array<{ topic: string; count: number; sentiment: string }> {
  const topicCounts: Record<string, { count: number; sentiments: string[] }> = {}

  feedback.forEach(f => {
    if (!f.content) return

    // Simple keyword extraction (in a real app, you might use NLP)
    const words = f.content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3) // Filter short words

    words.forEach(word => {
      if (!topicCounts[word]) {
        topicCounts[word] = { count: 0, sentiments: [] }
      }
      topicCounts[word].count++
      if (f.sentiment_label) {
        topicCounts[word].sentiments.push(f.sentiment_label)
      }
    })
  })

  return Object.entries(topicCounts)
    .filter(([_, data]) => data.count >= 2) // Only topics mentioned multiple times
    .map(([topic, data]) => {
      // Determine dominant sentiment
      const sentimentCounts = data.sentiments.reduce((acc, sentiment) => {
        acc[sentiment] = (acc[sentiment] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const dominantSentiment = Object.entries(sentimentCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'neutral'

      return {
        topic,
        count: data.count,
        sentiment: dominantSentiment
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Top 10 topics
}

/**
 * Extract common issues from negative feedback
 */
function extractCommonIssues(negativeFeedback: UserFeedback[]): string[] {
  const issueKeywords = [
    'slow', 'broken', 'error', 'bug', 'crash', 'loading', 'confusing',
    'difficult', 'hard', 'problem', 'issue', 'fail', 'stuck', 'missing'
  ]

  const issueCounts: Record<string, number> = {}

  negativeFeedback.forEach(feedback => {
    if (!feedback.content) return

    const content = feedback.content.toLowerCase()
    issueKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        issueCounts[keyword] = (issueCounts[keyword] || 0) + 1
      }
    })
  })

  return Object.entries(issueCounts)
    .filter(([_, count]) => count >= 2)
    .sort(([,a], [,b]) => b - a)
    .map(([issue]) => issue)
    .slice(0, 5) // Top 5 issues
}

/**
 * Calculate NPS category for a score
 */
export function getNPSCategory(score: number): 'promoter' | 'passive' | 'detractor' {
  if (score >= 9) return 'promoter'
  if (score >= 7) return 'passive'
  return 'detractor'
}

/**
 * Calculate CSAT category for a score
 */
export function getCSATCategory(score: number): 'poor' | 'fair' | 'good' | 'excellent' {
  if (score >= 5) return 'excellent'
  if (score >= 4) return 'good'
  if (score >= 3) return 'fair'
  return 'poor'
}