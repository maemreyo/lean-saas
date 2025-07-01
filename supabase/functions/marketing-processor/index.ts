// CREATED: 2025-07-01 - Marketing background processor edge function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ================================================
// TYPES & INTERFACES
// ================================================

interface ProcessingTask {
  type: 'analytics_aggregation' | 'lead_scoring' | 'campaign_optimization' | 'seo_analysis'
  organizationId: string
  data?: Record<string, any>
  priority: 'low' | 'medium' | 'high'
  scheduledAt?: string
}

interface AnalyticsAggregationData {
  startDate: string
  endDate: string
  period: 'daily' | 'weekly' | 'monthly'
}

interface LeadScoringData {
  leadIds?: string[]
  scoringModel: 'engagement' | 'behavioral' | 'demographic' | 'combined'
}

interface CampaignOptimizationData {
  campaignId: string
  optimizationType: 'subject_line' | 'send_time' | 'segmentation' | 'content'
}

// ================================================
// SUPABASE CLIENT
// ================================================

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ================================================
// ANALYTICS AGGREGATION
// ================================================

async function processAnalyticsAggregation(
  organizationId: string, 
  data: AnalyticsAggregationData
) {
  console.log(`Processing analytics aggregation for org: ${organizationId}`)
  
  try {
    // Get raw metrics data
    const { data: metrics, error: metricsError } = await supabase
      .from('growth_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('date_recorded', data.startDate)
      .lte('date_recorded', data.endDate)
      .order('date_recorded', { ascending: true })

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError)
      return { success: false, error: metricsError.message }
    }

    // Aggregate by period
    const aggregated = aggregateMetricsByPeriod(metrics || [], data.period)

    // Calculate trends and insights
    const trends = calculateTrends(aggregated)
    const insights = generateInsights(aggregated, trends)

    // Store aggregated data
    const { error: insertError } = await supabase
      .from('analytics_aggregations')
      .upsert({
        organization_id: organizationId,
        period: data.period,
        start_date: data.startDate,
        end_date: data.endDate,
        metrics: aggregated,
        trends,
        insights,
        processed_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error storing aggregated analytics:', insertError)
      return { success: false, error: insertError.message }
    }

    console.log(`Successfully processed analytics for ${metrics?.length || 0} data points`)
    return { 
      success: true, 
      data: { 
        metricsProcessed: metrics?.length || 0,
        period: data.period,
        trends: trends.length,
        insights: insights.length
      }
    }

  } catch (error) {
    console.error('Analytics aggregation error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// LEAD SCORING
// ================================================

async function processLeadScoring(
  organizationId: string,
  data: LeadScoringData
) {
  console.log(`Processing lead scoring for org: ${organizationId}`)
  
  try {
    // Get leads to score
    let query = supabase
      .from('lead_captures')
      .select('*')
      .eq('organization_id', organizationId)

    if (data.leadIds && data.leadIds.length > 0) {
      query = query.in('id', data.leadIds)
    }

    const { data: leads, error: leadsError } = await query

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
      return { success: false, error: leadsError.message }
    }

    // Score each lead
    const scoredLeads = []
    for (const lead of leads || []) {
      const score = await calculateLeadScore(lead, data.scoringModel)
      scoredLeads.push({
        lead_id: lead.id,
        score,
        scoring_model: data.scoringModel,
        factors: score.factors,
        calculated_at: new Date().toISOString()
      })
    }

    // Store lead scores
    const { error: scoresError } = await supabase
      .from('lead_scores')
      .upsert(scoredLeads)

    if (scoresError) {
      console.error('Error storing lead scores:', scoresError)
      return { success: false, error: scoresError.message }
    }

    console.log(`Successfully scored ${scoredLeads.length} leads`)
    return { 
      success: true, 
      data: { 
        leadsScored: scoredLeads.length,
        model: data.scoringModel,
        averageScore: scoredLeads.reduce((sum, l) => sum + l.score.total, 0) / scoredLeads.length
      }
    }

  } catch (error) {
    console.error('Lead scoring error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// CAMPAIGN OPTIMIZATION
// ================================================

async function processCampaignOptimization(
  organizationId: string,
  data: CampaignOptimizationData
) {
  console.log(`Processing campaign optimization for campaign: ${data.campaignId}`)
  
  try {
    // Get campaign data
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', data.campaignId)
      .eq('organization_id', organizationId)
      .single()

    if (campaignError || !campaign) {
      return { success: false, error: 'Campaign not found' }
    }

    // Get campaign performance data
    const { data: recipients, error: recipientsError } = await supabase
      .from('email_campaign_recipients')
      .select('*')
      .eq('campaign_id', data.campaignId)

    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError)
      return { success: false, error: recipientsError.message }
    }

    // Analyze and generate optimization recommendations
    const optimization = await generateCampaignOptimization(
      campaign,
      recipients || [],
      data.optimizationType
    )

    // Store optimization results
    const { error: optimizationError } = await supabase
      .from('campaign_optimizations')
      .insert({
        campaign_id: data.campaignId,
        organization_id: organizationId,
        optimization_type: data.optimizationType,
        current_performance: optimization.currentPerformance,
        recommendations: optimization.recommendations,
        estimated_improvement: optimization.estimatedImprovement,
        confidence_score: optimization.confidenceScore,
        created_at: new Date().toISOString()
      })

    if (optimizationError) {
      console.error('Error storing optimization:', optimizationError)
      return { success: false, error: optimizationError.message }
    }

    console.log(`Successfully optimized campaign: ${data.campaignId}`)
    return { 
      success: true, 
      data: optimization
    }

  } catch (error) {
    console.error('Campaign optimization error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// SEO ANALYSIS
// ================================================

async function processSEOAnalysis(organizationId: string) {
  console.log(`Processing SEO analysis for org: ${organizationId}`)
  
  try {
    // Get all SEO metadata
    const { data: seoData, error: seoError } = await supabase
      .from('seo_metadata')
      .select('*')
      .eq('organization_id', organizationId)

    if (seoError) {
      console.error('Error fetching SEO data:', seoError)
      return { success: false, error: seoError.message }
    }

    // Analyze SEO health for each page
    const analyses = []
    for (const seo of seoData || []) {
      const analysis = analyzeSEOHealth(seo)
      analyses.push({
        seo_metadata_id: seo.id,
        page_type: seo.page_type,
        page_id: seo.page_id,
        health_score: analysis.score,
        issues: analysis.issues,
        recommendations: analysis.recommendations,
        opportunities: analysis.opportunities,
        analyzed_at: new Date().toISOString()
      })
    }

    // Store SEO analysis results
    const { error: analysisError } = await supabase
      .from('seo_analyses')
      .upsert(analyses, { onConflict: 'seo_metadata_id' })

    if (analysisError) {
      console.error('Error storing SEO analysis:', analysisError)
      return { success: false, error: analysisError.message }
    }

    // Generate organization-wide SEO report
    const overallScore = analyses.reduce((sum, a) => sum + a.health_score, 0) / analyses.length
    const criticalIssues = analyses.filter(a => a.health_score < 50).length
    const recommendations = analyses.flatMap(a => a.recommendations).slice(0, 10)

    console.log(`Successfully analyzed ${analyses.length} pages, overall score: ${overallScore}`)
    return { 
      success: true, 
      data: {
        pagesAnalyzed: analyses.length,
        overallScore: Math.round(overallScore),
        criticalIssues,
        topRecommendations: recommendations
      }
    }

  } catch (error) {
    console.error('SEO analysis error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

function aggregateMetricsByPeriod(metrics: any[], period: string) {
  // Group metrics by period and aggregate
  const grouped = metrics.reduce((acc, metric) => {
    const date = new Date(metric.date_recorded)
    let key: string
    
    switch (period) {
      case 'daily':
        key = date.toISOString().split('T')[0]
        break
      case 'weekly':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      default:
        key = date.toISOString().split('T')[0]
    }

    if (!acc[key]) {
      acc[key] = {
        period: key,
        metrics: {},
        count: 0
      }
    }

    if (!acc[key].metrics[metric.metric_type]) {
      acc[key].metrics[metric.metric_type] = 0
    }

    acc[key].metrics[metric.metric_type] += metric.metric_value
    acc[key].count++

    return acc
  }, {})

  return Object.values(grouped)
}

function calculateTrends(aggregatedData: any[]) {
  if (aggregatedData.length < 2) return []

  const trends = []
  const sortedData = aggregatedData.sort((a, b) => a.period.localeCompare(b.period))
  
  for (let i = 1; i < sortedData.length; i++) {
    const current = sortedData[i]
    const previous = sortedData[i - 1]
    
    for (const metricType in current.metrics) {
      const currentValue = current.metrics[metricType]
      const previousValue = previous.metrics[metricType] || 0
      
      if (previousValue > 0) {
        const change = ((currentValue - previousValue) / previousValue) * 100
        trends.push({
          metric_type: metricType,
          period: current.period,
          change_percentage: change,
          direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
        })
      }
    }
  }

  return trends
}

function generateInsights(aggregatedData: any[], trends: any[]) {
  const insights = []

  // Analyze trends for insights
  trends.forEach(trend => {
    if (Math.abs(trend.change_percentage) > 20) {
      insights.push({
        type: 'trend',
        severity: Math.abs(trend.change_percentage) > 50 ? 'high' : 'medium',
        metric: trend.metric_type,
        message: `${trend.metric_type} ${trend.direction === 'up' ? 'increased' : 'decreased'} by ${Math.abs(trend.change_percentage).toFixed(1)}%`,
        recommendation: generateTrendRecommendation(trend)
      })
    }
  })

  return insights
}

function generateTrendRecommendation(trend: any): string {
  const { metric_type, direction, change_percentage } = trend
  
  if (direction === 'up') {
    switch (metric_type) {
      case 'page_views': return 'Great! Consider scaling successful content strategies.'
      case 'signups': return 'Excellent growth! Monitor conversion quality and user onboarding.'
      case 'conversions': return 'Strong performance! Document what\'s working for replication.'
      default: return 'Positive trend! Continue current strategies.'
    }
  } else {
    switch (metric_type) {
      case 'page_views': return 'Review SEO performance and content strategy.'
      case 'signups': return 'Analyze conversion funnel and optimize landing pages.'
      case 'conversions': return 'Review user experience and value proposition.'
      default: return 'Declining trend needs attention. Investigate root causes.'
    }
  }
}

async function calculateLeadScore(lead: any, model: string) {
  // Implement lead scoring algorithm
  const factors = {
    email_engagement: 0,
    time_since_signup: 0,
    source_quality: 0,
    demographic_fit: 0,
    behavioral_signals: 0
  }

  // Email engagement scoring
  if (lead.utm_source === 'email') {
    factors.email_engagement = 20
  }

  // Time since signup scoring
  const daysSinceSignup = Math.floor(
    (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  factors.time_since_signup = Math.max(0, 30 - daysSinceSignup)

  // Source quality scoring
  const sourceScores = {
    'organic': 25,
    'referral': 20,
    'email': 15,
    'social': 10,
    'paid': 5
  }
  factors.source_quality = sourceScores[lead.source] || 5

  // Demographic fit (if available)
  if (lead.metadata?.company_size) {
    factors.demographic_fit = 15
  }

  // Behavioral signals (placeholder)
  factors.behavioral_signals = Math.floor(Math.random() * 20)

  const total = Object.values(factors).reduce((sum, score) => sum + score, 0)

  return {
    total: Math.min(100, total),
    factors,
    model,
    confidence: total > 60 ? 'high' : total > 30 ? 'medium' : 'low'
  }
}

async function generateCampaignOptimization(campaign: any, recipients: any[], type: string) {
  const currentPerformance = {
    open_rate: recipients.filter(r => r.opened_at).length / recipients.length,
    click_rate: recipients.filter(r => r.clicked_at).length / recipients.length,
    unsubscribe_rate: recipients.filter(r => r.unsubscribed_at).length / recipients.length
  }

  const recommendations = []
  let estimatedImprovement = 0

  switch (type) {
    case 'subject_line':
      if (currentPerformance.open_rate < 0.25) {
        recommendations.push('Subject line may be too generic. Try personalization or urgency.')
        recommendations.push('Consider A/B testing subject line length (30-50 characters optimal).')
        estimatedImprovement = 15
      }
      break
    case 'send_time':
      recommendations.push('Test different send times (Tuesday-Thursday, 10am-2pm typically perform best).')
      recommendations.push('Consider timezone-based sending for global audiences.')
      estimatedImprovement = 8
      break
    case 'segmentation':
      recommendations.push('Segment audience by engagement level and customize content.')
      recommendations.push('Create separate campaigns for new vs. existing subscribers.')
      estimatedImprovement = 20
      break
    case 'content':
      if (currentPerformance.click_rate < 0.05) {
        recommendations.push('Improve call-to-action visibility and clarity.')
        recommendations.push('Reduce content length and focus on single objective.')
        estimatedImprovement = 12
      }
      break
  }

  return {
    currentPerformance,
    recommendations,
    estimatedImprovement,
    confidenceScore: recommendations.length > 0 ? 75 : 50
  }
}

function analyzeSEOHealth(seoData: any) {
  let score = 0
  const issues = []
  const recommendations = []
  const opportunities = []

  // Title analysis
  if (!seoData.title) {
    issues.push('Missing title tag')
    recommendations.push('Add a descriptive title tag (30-60 characters)')
  } else if (seoData.title.length < 30 || seoData.title.length > 60) {
    issues.push('Title length not optimal')
    recommendations.push('Optimize title length to 30-60 characters')
    score += 10
  } else {
    score += 25
  }

  // Description analysis
  if (!seoData.description) {
    issues.push('Missing meta description')
    recommendations.push('Add meta description (120-160 characters)')
  } else if (seoData.description.length < 120 || seoData.description.length > 160) {
    issues.push('Description length not optimal')
    recommendations.push('Optimize description length to 120-160 characters')
    score += 10
  } else {
    score += 25
  }

  // Keywords analysis
  if (!seoData.keywords || seoData.keywords.length === 0) {
    issues.push('No keywords defined')
    recommendations.push('Research and add relevant keywords')
  } else {
    score += 20
  }

  // Canonical URL
  if (seoData.canonical_url) {
    score += 15
  } else {
    opportunities.push('Add canonical URL to prevent duplicate content issues')
  }

  // Open Graph
  if (seoData.open_graph?.title && seoData.open_graph?.description) {
    score += 15
  } else {
    opportunities.push('Add Open Graph tags for better social media sharing')
  }

  return {
    score: Math.min(100, score),
    issues,
    recommendations,
    opportunities
  }
}

// ================================================
// MAIN HANDLER
// ================================================

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { task }: { task: ProcessingTask } = await req.json()

    console.log(`Processing marketing task: ${task.type} for org: ${task.organizationId}`)

    let result
    switch (task.type) {
      case 'analytics_aggregation':
        result = await processAnalyticsAggregation(task.organizationId, task.data as AnalyticsAggregationData)
        break
      case 'lead_scoring':
        result = await processLeadScoring(task.organizationId, task.data as LeadScoringData)
        break
      case 'campaign_optimization':
        result = await processCampaignOptimization(task.organizationId, task.data as CampaignOptimizationData)
        break
      case 'seo_analysis':
        result = await processSEOAnalysis(task.organizationId)
        break
      default:
        return new Response(
          JSON.stringify({ error: `Unknown task type: ${task.type}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Marketing processor error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})