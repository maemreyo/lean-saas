// Feature Usage Tracking and Adoption Analytics

import { createClient } from '@/lib/supabase/client'
import { 
  FeatureAdoption, 
  FeatureAdoptionInsert, 
  FeatureAdoptionUpdate,
  AdoptionStatus,
  TrackFeatureUsageRequest,
  UpdateAdoptionStatusRequest,
  FeatureUsageAnalytics,
  FeatureAdoptionResponse
} from '@/shared/types/customer-success'
import { 
  createFeatureAdoptionSchema,
  updateFeatureAdoptionSchema,
  trackFeatureUsageRequestSchema,
  updateAdoptionStatusRequestSchema
} from '@/shared/schemas/customer-success'

// ================================================
// FEATURE ADOPTION CONFIGURATION
// ================================================

export const FEATURE_CATEGORIES = {
  core: {
    label: 'Core Features',
    description: 'Essential platform functionality',
    priority: 'high',
    features: [
      'dashboard_view',
      'project_creation',
      'user_management',
      'basic_settings'
    ]
  },
  productivity: {
    label: 'Productivity Tools',
    description: 'Features that enhance workflow efficiency',
    priority: 'medium',
    features: [
      'bulk_operations',
      'keyboard_shortcuts',
      'search_filters',
      'quick_actions'
    ]
  },
  collaboration: {
    label: 'Collaboration',
    description: 'Team and sharing features',
    priority: 'high',
    features: [
      'team_invites',
      'shared_projects',
      'comments_discussion',
      'permissions_management'
    ]
  },
  analytics: {
    label: 'Analytics & Insights',
    description: 'Data analysis and reporting tools',
    priority: 'medium',
    features: [
      'usage_analytics',
      'custom_reports',
      'data_export',
      'trend_analysis'
    ]
  },
  integrations: {
    label: 'Integrations',
    description: 'Third-party connections and APIs',
    priority: 'low',
    features: [
      'api_access',
      'webhook_setup',
      'third_party_sync',
      'import_export'
    ]
  },
  advanced: {
    label: 'Advanced Features',
    description: 'Power user and enterprise features',
    priority: 'low',
    features: [
      'automation_rules',
      'custom_fields',
      'advanced_permissions',
      'white_labeling'
    ]
  }
}

export const ADOPTION_THRESHOLDS = {
  exploring: {
    min_usage_count: 1,
    min_sessions: 1,
    description: 'User has tried the feature at least once'
  },
  active: {
    min_usage_count: 5,
    min_sessions: 3,
    min_frequency: 0.5, // Uses per week
    description: 'Regular usage indicating adoption'
  },
  power_user: {
    min_usage_count: 20,
    min_sessions: 10,
    min_frequency: 2, // Uses per week
    min_depth_score: 70,
    description: 'Heavy usage with deep engagement'
  }
}

export const FEATURE_RECOMMENDATIONS = {
  dashboard_view: ['project_creation', 'analytics_basic'],
  project_creation: ['team_invites', 'shared_projects'],
  team_invites: ['permissions_management', 'comments_discussion'],
  analytics_basic: ['custom_reports', 'data_export'],
  api_access: ['webhook_setup', 'automation_rules'],
  basic_settings: ['advanced_permissions', 'custom_fields']
}

// ================================================
// CORE ADOPTION FUNCTIONS
// ================================================

/**
 * Track feature usage event
 */
export async function trackFeatureUsage(request: TrackFeatureUsageRequest): Promise<{
  success: boolean
  data?: FeatureAdoption
  adoption_status?: AdoptionStatus
  error?: string
}> {
  try {
    // Validate request
    const validation = trackFeatureUsageRequestSchema.safeParse(request)
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const { 
      user_id, 
      organization_id, 
      feature_name, 
      feature_category, 
      session_duration = 0, 
      depth_score = 0,
      metadata = {} 
    } = validation.data

    const supabase = createClient()

    // Get or create feature adoption record
    let { data: adoption, error: fetchError } = await supabase
      .from('feature_adoption')
      .select('*')
      .eq('user_id', user_id)
      .eq('feature_name', feature_name)
      .single()

    const now = new Date().toISOString()

    if (fetchError && fetchError.code !== 'PGRST116') { // Not "no rows returned"
      return {
        success: false,
        error: `Database error: ${fetchError.message}`
      }
    }

    if (!adoption) {
      // Create new adoption record
      const adoptionData: FeatureAdoptionInsert = {
        user_id,
        organization_id,
        feature_name,
        feature_category,
        adoption_status: 'exploring',
        first_used_at: now,
        last_used_at: now,
        total_usage_count: 1,
        usage_frequency: 0.1, // Will be calculated properly later
        session_duration_avg: session_duration,
        depth_of_use_score: depth_score,
        feature_discovered_at: now,
        first_click_at: now,
        metadata
      }

      const { data, error } = await supabase
        .from('feature_adoption')
        .insert(adoptionData)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: `Database error: ${error.message}`
        }
      }

      return {
        success: true,
        data,
        adoption_status: 'exploring'
      }
    } else {
      // Update existing adoption record
      const newUsageCount = adoption.total_usage_count + 1
      const newAvgDuration = Math.round(
        ((adoption.session_duration_avg * adoption.total_usage_count) + session_duration) / newUsageCount
      )
      
      // Calculate usage frequency (uses per week)
      const daysSinceFirst = Math.max(1, 
        (new Date().getTime() - new Date(adoption.first_used_at!).getTime()) / (1000 * 60 * 60 * 24)
      )
      const weeksActive = daysSinceFirst / 7
      const newFrequency = newUsageCount / weeksActive

      // Determine new adoption status
      const newAdoptionStatus = determineAdoptionStatus({
        usage_count: newUsageCount,
        frequency: newFrequency,
        depth_score: Math.max(adoption.depth_of_use_score, depth_score),
        sessions: adoption.total_usage_count // Simplified: each usage = session
      })

      // Check for milestones
      const milestones = checkAdoptionMilestones(adoption, {
        usage_count: newUsageCount,
        status: newAdoptionStatus,
        frequency: newFrequency
      })

      const updateData: FeatureAdoptionUpdate = {
        last_used_at: now,
        total_usage_count: newUsageCount,
        usage_frequency: Math.round(newFrequency * 100) / 100,
        session_duration_avg: newAvgDuration,
        adoption_status: newAdoptionStatus,
        depth_of_use_score: Math.max(adoption.depth_of_use_score, depth_score),
        power_user_threshold_met: newAdoptionStatus === 'power_user',
        // Set activation milestone if reached
        feature_activated_at: adoption.feature_activated_at || (newUsageCount >= 3 ? now : undefined),
        // Set retention milestone if reached  
        feature_retained_at: adoption.feature_retained_at || (milestones.includes('retained') ? now : undefined)
      }

      const { data, error } = await supabase
        .from('feature_adoption')
        .update(updateData)
        .eq('id', adoption.id)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: `Database error: ${error.message}`
        }
      }

      // Track milestone achievements
      if (milestones.length > 0) {
        await trackAdoptionMilestones(user_id, feature_name, milestones)
      }

      return {
        success: true,
        data,
        adoption_status: newAdoptionStatus
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get feature adoption data for user
 */
export async function getUserFeatureAdoption(
  userId: string,
  organizationId?: string,
  featureNames?: string[]
): Promise<FeatureAdoptionResponse> {
  try {
    const supabase = createClient()

    let query = supabase
      .from('feature_adoption')
      .select('*')
      .eq('user_id', userId)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (featureNames && featureNames.length > 0) {
      query = query.in('feature_name', featureNames)
    }

    const { data: adoptionData, error } = await query

    if (error) {
      throw new Error(`Failed to fetch adoption data: ${error.message}`)
    }

    const adoptions = adoptionData || []

    // Calculate adoption summary
    const totalFeatures = Object.values(FEATURE_CATEGORIES)
      .flatMap(cat => cat.features).length
    const adoptedFeatures = adoptions.filter(a => 
      ['active', 'power_user'].includes(a.adoption_status)
    ).length
    const adoptionRate = totalFeatures > 0 ? (adoptedFeatures / totalFeatures) * 100 : 0
    const powerUserFeatures = adoptions.filter(a => a.adoption_status === 'power_user').length

    const adoptionSummary = {
      total_features: totalFeatures,
      adopted_features: adoptedFeatures,
      adoption_rate: Math.round(adoptionRate * 100) / 100,
      power_user_features: powerUserFeatures
    }

    // Get recommended features
    const recommendedFeatures = getRecommendedFeatures(adoptions)

    return {
      feature_adoption: adoptions,
      adoption_summary: adoptionSummary,
      recommended_features: recommendedFeatures
    }
  } catch (error) {
    console.error('Error getting user feature adoption:', error)
    return {
      feature_adoption: [],
      adoption_summary: {
        total_features: 0,
        adopted_features: 0,
        adoption_rate: 0,
        power_user_features: 0
      },
      recommended_features: []
    }
  }
}

/**
 * Get feature usage analytics for organization
 */
export async function getFeatureUsageAnalytics(
  organizationId?: string,
  timeRange = '30d',
  featureCategory?: string
): Promise<FeatureUsageAnalytics[]> {
  try {
    const supabase = createClient()
    
    // Calculate date range
    const daysBack = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    let query = supabase
      .from('feature_adoption')
      .select('*')
      .gte('last_used_at', startDate.toISOString())

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (featureCategory) {
      query = query.eq('feature_category', featureCategory)
    }

    const { data, error } = await query

    if (error || !data) {
      throw new Error(`Failed to fetch usage analytics: ${error?.message}`)
    }

    // Group by feature name and calculate analytics
    const featureGroups = data.reduce((acc, adoption) => {
      const name = adoption.feature_name
      if (!acc[name]) {
        acc[name] = []
      }
      acc[name].push(adoption)
      return acc
    }, {} as Record<string, FeatureAdoption[]>)

    return Object.entries(featureGroups).map(([featureName, adoptions]) => {
      const totalUsers = adoptions.length
      const activeUsers = adoptions.filter(a => 
        ['active', 'power_user'].includes(a.adoption_status)
      ).length
      const powerUsers = adoptions.filter(a => a.adoption_status === 'power_user').length
      const churnedUsers = adoptions.filter(a => a.adoption_status === 'churned').length

      const adoptionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0
      const retentionRate = totalUsers > 0 ? ((totalUsers - churnedUsers) / totalUsers) * 100 : 0
      
      const avgUsageFrequency = adoptions.length > 0
        ? adoptions.reduce((sum, a) => sum + a.usage_frequency, 0) / adoptions.length
        : 0

      const avgSessionDuration = adoptions.length > 0
        ? adoptions.reduce((sum, a) => sum + a.session_duration_avg, 0) / adoptions.length
        : 0

      // Determine trend (simplified - would need historical data for accurate trend)
      const recentUsers = adoptions.filter(a => 
        new Date(a.last_used_at!).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000)
      ).length
      const trend = recentUsers > totalUsers * 0.7 ? 'increasing' : 
                   recentUsers < totalUsers * 0.3 ? 'decreasing' : 'stable'

      return {
        feature_name: featureName,
        total_users: totalUsers,
        active_users: activeUsers,
        adoption_rate: Math.round(adoptionRate * 100) / 100,
        retention_rate: Math.round(retentionRate * 100) / 100,
        avg_usage_frequency: Math.round(avgUsageFrequency * 100) / 100,
        avg_session_duration: Math.round(avgSessionDuration),
        power_users_count: powerUsers,
        churned_users_count: churnedUsers,
        trend: trend as 'increasing' | 'decreasing' | 'stable'
      }
    }).sort((a, b) => b.adoption_rate - a.adoption_rate) // Sort by adoption rate
  } catch (error) {
    console.error('Error getting feature usage analytics:', error)
    return []
  }
}

/**
 * Update adoption status manually
 */
export async function updateAdoptionStatus(request: UpdateAdoptionStatusRequest): Promise<{
  success: boolean
  data?: FeatureAdoption
  error?: string
}> {
  try {
    // Validate request
    const validation = updateAdoptionStatusRequestSchema.safeParse(request)
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const { user_id, feature_name, adoption_status, usage_data = {} } = validation.data
    const supabase = createClient()

    const updateData: FeatureAdoptionUpdate = {
      adoption_status,
      ...usage_data
    }

    const { data, error } = await supabase
      .from('feature_adoption')
      .update(updateData)
      .eq('user_id', user_id)
      .eq('feature_name', feature_name)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`
      }
    }

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
 * Get adoption funnel for specific feature
 */
export async function getFeatureAdoptionFunnel(
  featureName: string,
  organizationId?: string,
  timeRange = '30d'
): Promise<Array<{
  stage: string
  user_count: number
  conversion_rate: number
  avg_time_to_stage: number
}>> {
  try {
    const supabase = createClient()
    
    const daysBack = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    let query = supabase
      .from('feature_adoption')
      .select('*')
      .eq('feature_name', featureName)
      .gte('first_used_at', startDate.toISOString())

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query

    if (error || !data) {
      return []
    }

    const totalUsers = data.length

    // Define funnel stages
    const stages = [
      {
        name: 'Discovered',
        filter: (a: FeatureAdoption) => !!a.feature_discovered_at,
        timeField: 'feature_discovered_at'
      },
      {
        name: 'First Click',
        filter: (a: FeatureAdoption) => !!a.first_click_at,
        timeField: 'first_click_at'
      },
      {
        name: 'Activated',
        filter: (a: FeatureAdoption) => !!a.feature_activated_at,
        timeField: 'feature_activated_at'
      },
      {
        name: 'Retained',
        filter: (a: FeatureAdoption) => !!a.feature_retained_at,
        timeField: 'feature_retained_at'
      },
      {
        name: 'Power User',
        filter: (a: FeatureAdoption) => a.adoption_status === 'power_user',
        timeField: 'last_used_at'
      }
    ]

    return stages.map((stage, index) => {
      const stageUsers = data.filter(stage.filter)
      const userCount = stageUsers.length
      const conversionRate = totalUsers > 0 ? (userCount / totalUsers) * 100 : 0

      // Calculate average time to reach this stage
      const avgTimeToStage = stageUsers.length > 0
        ? stageUsers.reduce((sum, adoption) => {
            const startTime = new Date(adoption.first_used_at!).getTime()
            const stageTime = new Date(adoption[stage.timeField as keyof FeatureAdoption] as string).getTime()
            return sum + (stageTime - startTime)
          }, 0) / stageUsers.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0

      return {
        stage: stage.name,
        user_count: userCount,
        conversion_rate: Math.round(conversionRate * 100) / 100,
        avg_time_to_stage: Math.round(avgTimeToStage * 100) / 100
      }
    })
  } catch (error) {
    console.error('Error getting adoption funnel:', error)
    return []
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Determine adoption status based on usage metrics
 */
function determineAdoptionStatus(metrics: {
  usage_count: number
  frequency: number
  depth_score: number
  sessions: number
}): AdoptionStatus {
  const { usage_count, frequency, depth_score, sessions } = metrics

  // Check for power user
  if (
    usage_count >= ADOPTION_THRESHOLDS.power_user.min_usage_count &&
    sessions >= ADOPTION_THRESHOLDS.power_user.min_sessions &&
    frequency >= ADOPTION_THRESHOLDS.power_user.min_frequency &&
    depth_score >= ADOPTION_THRESHOLDS.power_user.min_depth_score
  ) {
    return 'power_user'
  }

  // Check for active user
  if (
    usage_count >= ADOPTION_THRESHOLDS.active.min_usage_count &&
    sessions >= ADOPTION_THRESHOLDS.active.min_sessions &&
    frequency >= ADOPTION_THRESHOLDS.active.min_frequency
  ) {
    return 'active'
  }

  // Check for exploring
  if (
    usage_count >= ADOPTION_THRESHOLDS.exploring.min_usage_count &&
    sessions >= ADOPTION_THRESHOLDS.exploring.min_sessions
  ) {
    return 'exploring'
  }

  return 'not_adopted'
}

/**
 * Check for adoption milestone achievements
 */
function checkAdoptionMilestones(
  previous: FeatureAdoption,
  current: { usage_count: number; status: AdoptionStatus; frequency: number }
): string[] {
  const milestones: string[] = []

  // First time activation (3+ uses)
  if (!previous.feature_activated_at && current.usage_count >= 3) {
    milestones.push('activated')
  }

  // Retention milestone (used again within 7 days of first use)
  if (!previous.feature_retained_at && current.usage_count >= 2) {
    const daysSinceFirst = (Date.now() - new Date(previous.first_used_at!).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceFirst <= 7) {
      milestones.push('retained')
    }
  }

  // Power user milestone
  if (previous.adoption_status !== 'power_user' && current.status === 'power_user') {
    milestones.push('power_user')
  }

  // High frequency milestone (5+ uses per week)
  if (current.frequency >= 5 && (previous.usage_frequency < 5)) {
    milestones.push('high_frequency')
  }

  return milestones
}

/**
 * Track adoption milestone achievements
 */
async function trackAdoptionMilestones(
  userId: string,
  featureName: string,
  milestones: string[]
): Promise<void> {
  try {
    // In a real system, this might trigger:
    // - User notifications/congratulations
    // - Analytics events
    // - Reward systems
    // - Automated feature recommendations
    
    console.log(`User ${userId} achieved milestones for ${featureName}:`, milestones)
    
    // Could integrate with marketing automation, analytics, or notification systems
  } catch (error) {
    console.error('Error tracking adoption milestones:', error)
  }
}

/**
 * Get recommended features based on current adoption
 */
function getRecommendedFeatures(adoptions: FeatureAdoption[]): string[] {
  const adoptedFeatures = adoptions
    .filter(a => ['active', 'power_user'].includes(a.adoption_status))
    .map(a => a.feature_name)

  const recommendations = new Set<string>()

  // Get recommendations based on adopted features
  adoptedFeatures.forEach(featureName => {
    const featureRecs = FEATURE_RECOMMENDATIONS[featureName] || []
    featureRecs.forEach(rec => {
      // Only recommend if not already adopted
      if (!adoptedFeatures.includes(rec)) {
        recommendations.add(rec)
      }
    })
  })

  // Add category-based recommendations
  const adoptedCategories = new Set(
    adoptions
      .filter(a => ['active', 'power_user'].includes(a.adoption_status))
      .map(a => a.feature_category)
      .filter(Boolean)
  )

  Object.entries(FEATURE_CATEGORIES).forEach(([categoryKey, category]) => {
    if (adoptedCategories.has(categoryKey)) {
      category.features.forEach(feature => {
        if (!adoptedFeatures.includes(feature)) {
          recommendations.add(feature)
        }
      })
    }
  })

  return Array.from(recommendations).slice(0, 5) // Top 5 recommendations
}

/**
 * Calculate feature stickiness (DAU/MAU ratio)
 */
export async function calculateFeatureStickiness(
  featureName: string,
  organizationId?: string
): Promise<{
  daily_active_users: number
  monthly_active_users: number
  stickiness_ratio: number
}> {
  try {
    const supabase = createClient()
    
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get daily active users
    let dailyQuery = supabase
      .from('feature_adoption')
      .select('user_id')
      .eq('feature_name', featureName)
      .gte('last_used_at', oneDayAgo.toISOString())

    if (organizationId) {
      dailyQuery = dailyQuery.eq('organization_id', organizationId)
    }

    // Get monthly active users
    let monthlyQuery = supabase
      .from('feature_adoption')
      .select('user_id')
      .eq('feature_name', featureName)
      .gte('last_used_at', thirtyDaysAgo.toISOString())

    if (organizationId) {
      monthlyQuery = monthlyQuery.eq('organization_id', organizationId)
    }

    const [dailyResult, monthlyResult] = await Promise.all([
      dailyQuery,
      monthlyQuery
    ])

    const dailyActiveUsers = dailyResult.data?.length || 0
    const monthlyActiveUsers = monthlyResult.data?.length || 0
    const stickinessRatio = monthlyActiveUsers > 0 ? (dailyActiveUsers / monthlyActiveUsers) * 100 : 0

    return {
      daily_active_users: dailyActiveUsers,
      monthly_active_users: monthlyActiveUsers,
      stickiness_ratio: Math.round(stickinessRatio * 100) / 100
    }
  } catch (error) {
    console.error('Error calculating feature stickiness:', error)
    return {
      daily_active_users: 0,
      monthly_active_users: 0,
      stickiness_ratio: 0
    }
  }
}