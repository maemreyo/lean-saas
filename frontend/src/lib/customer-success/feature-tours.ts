// Feature Tour Orchestration and User Guidance

import { createClient } from '@/lib/supabase/client'
import { 
  FeatureTour, 
  FeatureTourInsert, 
  FeatureTourUpdate,
  TourConfig,
  TourStep,
  TourStatus,
  StartTourRequest,
  UpdateTourProgressRequest,
  CompleteTourRequest,
  TourStatusResponse
} from '@/shared/types/customer-success'
import { 
  createFeatureTourSchema,
  updateFeatureTourSchema,
  startTourRequestSchema,
  updateTourProgressRequestSchema,
  completeTourRequestSchema
} from '@/shared/schemas/customer-success'

// ================================================
// TOUR CONFIGURATIONS
// ================================================

export const FEATURE_TOUR_CONFIGS: Record<string, TourConfig> = {
  dashboard_overview: {
    tour_name: 'dashboard_overview',
    version: '1.0',
    title: 'Dashboard Overview',
    description: 'Get familiar with your main dashboard and key navigation elements.',
    total_steps: 6,
    auto_start: false,
    show_progress: true,
    allow_skip: true,
    steps: [
      {
        step: 1,
        target: '.dashboard-header',
        title: 'Welcome to Your Dashboard',
        content: 'This is your main dashboard where you can see an overview of all your activities and key metrics.',
        position: 'bottom',
        action: 'none',
        highlight_padding: 8
      },
      {
        step: 2,
        target: '.sidebar-navigation',
        title: 'Navigation Menu',
        content: 'Use this sidebar to navigate between different sections of the platform. You can collapse it by clicking the menu icon.',
        position: 'right',
        action: 'none',
        highlight_padding: 4
      },
      {
        step: 3,
        target: '.projects-section',
        title: 'Your Projects',
        content: 'Here you can see all your projects and create new ones. Click on any project to open it.',
        position: 'top',
        action: 'none',
        highlight_padding: 8
      },
      {
        step: 4,
        target: '.recent-activity',
        title: 'Recent Activity',
        content: 'Stay up to date with recent changes and activities across your projects and team.',
        position: 'left',
        action: 'none',
        highlight_padding: 6
      },
      {
        step: 5,
        target: '.quick-actions',
        title: 'Quick Actions',
        content: 'Use these buttons to quickly perform common actions like creating a new project or inviting team members.',
        position: 'top',
        action: 'none',
        highlight_padding: 4
      },
      {
        step: 6,
        target: '.user-profile',
        title: 'Profile & Settings',
        content: 'Access your profile settings, billing information, and account preferences from here.',
        position: 'bottom',
        action: 'click',
        wait_for_action: false,
        highlight_padding: 4
      }
    ],
    trigger_conditions: {
      user_login_count: { min: 1, max: 3 },
      projects_created: { max: 0 }
    }
  },

  project_management: {
    tour_name: 'project_management',
    version: '1.0',
    title: 'Project Management',
    description: 'Learn how to create, organize, and manage your projects effectively.',
    total_steps: 8,
    auto_start: false,
    show_progress: true,
    allow_skip: true,
    steps: [
      {
        step: 1,
        target: '.create-project-btn',
        title: 'Creating Projects',
        content: 'Click here to create a new project. Projects help you organize your work and collaborate with your team.',
        position: 'bottom',
        action: 'click',
        wait_for_action: true,
        highlight_padding: 6
      },
      {
        step: 2,
        target: '.project-name-input',
        title: 'Project Details',
        content: 'Give your project a descriptive name that your team will easily recognize.',
        position: 'bottom',
        action: 'none',
        highlight_padding: 4
      },
      {
        step: 3,
        target: '.project-template-selector',
        title: 'Project Templates',
        content: 'Choose from pre-built templates to get started quickly, or start from scratch.',
        position: 'right',
        action: 'none',
        highlight_padding: 8
      },
      {
        step: 4,
        target: '.project-settings',
        title: 'Project Settings',
        content: 'Configure privacy settings, access permissions, and other project preferences.',
        position: 'left',
        action: 'none',
        highlight_padding: 6
      },
      {
        step: 5,
        target: '.team-members-section',
        title: 'Team Collaboration',
        content: 'Invite team members to collaborate on your project. You can set different permission levels for each member.',
        position: 'top',
        action: 'none',
        highlight_padding: 8
      },
      {
        step: 6,
        target: '.project-tools',
        title: 'Project Tools',
        content: 'Access various tools and features specific to your project, including analytics, exports, and integrations.',
        position: 'bottom',
        action: 'none',
        highlight_padding: 6
      },
      {
        step: 7,
        target: '.project-activity-feed',
        title: 'Activity Tracking',
        content: 'Monitor all project activities, changes, and team interactions in real-time.',
        position: 'right',
        action: 'none',
        highlight_padding: 4
      },
      {
        step: 8,
        target: '.save-project-btn',
        title: 'Save Your Project',
        content: 'Don\'t forget to save your project settings. Your project will be automatically saved as you work.',
        position: 'top',
        action: 'click',
        wait_for_action: false,
        highlight_padding: 6
      }
    ],
    trigger_conditions: {
      projects_created: { min: 1 },
      project_page_visits: { min: 1 }
    }
  },

  team_collaboration: {
    tour_name: 'team_collaboration',
    version: '1.0',
    title: 'Team Collaboration',
    description: 'Discover how to work effectively with your team using collaboration features.',
    total_steps: 5,
    auto_start: false,
    show_progress: true,
    allow_skip: true,
    steps: [
      {
        step: 1,
        target: '.team-management',
        title: 'Team Management',
        content: 'Manage your team members, their roles, and permissions from this central location.',
        position: 'bottom',
        action: 'none',
        highlight_padding: 8
      },
      {
        step: 2,
        target: '.invite-members-btn',
        title: 'Inviting Team Members',
        content: 'Click here to invite new team members via email. They\'ll receive an invitation to join your organization.',
        position: 'bottom',
        action: 'none',
        highlight_padding: 6
      },
      {
        step: 3,
        target: '.role-permissions',
        title: 'Roles & Permissions',
        content: 'Set appropriate roles and permissions for each team member to control what they can access and modify.',
        position: 'right',
        action: 'none',
        highlight_padding: 4
      },
      {
        step: 4,
        target: '.team-activity',
        title: 'Team Activity',
        content: 'See what your team members are working on and track collaborative activities across projects.',
        position: 'left',
        action: 'none',
        highlight_padding: 6
      },
      {
        step: 5,
        target: '.communication-tools',
        title: 'Communication',
        content: 'Use built-in communication tools to discuss projects, share updates, and coordinate work.',
        position: 'top',
        action: 'none',
        highlight_padding: 8
      }
    ],
    trigger_conditions: {
      team_members_invited: { min: 1 },
      team_page_visits: { min: 1 }
    }
  },

  analytics_deep_dive: {
    tour_name: 'analytics_deep_dive',
    version: '1.0',
    title: 'Analytics Deep Dive',
    description: 'Learn how to use our powerful analytics features to gain insights into your data.',
    total_steps: 7,
    auto_start: false,
    show_progress: true,
    allow_skip: true,
    steps: [
      {
        step: 1,
        target: '.analytics-dashboard',
        title: 'Analytics Overview',
        content: 'Your analytics dashboard provides comprehensive insights into your project performance and user engagement.',
        position: 'bottom',
        action: 'none',
        highlight_padding: 8
      },
      {
        step: 2,
        target: '.date-range-picker',
        title: 'Time Period Selection',
        content: 'Choose different time periods to analyze your data. You can select preset ranges or custom dates.',
        position: 'bottom',
        action: 'none',
        highlight_padding: 4
      },
      {
        step: 3,
        target: '.metrics-cards',
        title: 'Key Metrics',
        content: 'These cards show your most important metrics at a glance. Click on any card to see more detailed information.',
        position: 'top',
        action: 'none',
        highlight_padding: 6
      },
      {
        step: 4,
        target: '.charts-section',
        title: 'Interactive Charts',
        content: 'Explore your data through interactive charts. Hover over data points for details and click to drill down.',
        position: 'top',
        action: 'none',
        highlight_padding: 8
      },
      {
        step: 5,
        target: '.filters-panel',
        title: 'Data Filters',
        content: 'Use filters to segment your data by different criteria and get more targeted insights.',
        position: 'right',
        action: 'none',
        highlight_padding: 6
      },
      {
        step: 6,
        target: '.export-options',
        title: 'Export Data',
        content: 'Export your analytics data in various formats for further analysis or reporting.',
        position: 'left',
        action: 'none',
        highlight_padding: 4
      },
      {
        step: 7,
        target: '.custom-reports',
        title: 'Custom Reports',
        content: 'Create custom reports with the specific metrics and visualizations you need.',
        position: 'bottom',
        action: 'none',
        highlight_padding: 6
      }
    ],
    trigger_conditions: {
      analytics_page_visits: { min: 1 },
      data_points: { min: 10 }
    }
  },

  billing_and_usage: {
    tour_name: 'billing_and_usage',
    version: '1.0',
    title: 'Billing & Usage',
    description: 'Understand how billing works and how to monitor your usage and costs.',
    total_steps: 6,
    auto_start: false,
    show_progress: true,
    allow_skip: true,
    steps: [
      {
        step: 1,
        target: '.billing-overview',
        title: 'Billing Overview',
        content: 'Monitor your subscription, usage, and billing information from this comprehensive dashboard.',
        position: 'bottom',
        action: 'none',
        highlight_padding: 8
      },
      {
        step: 2,
        target: '.usage-metrics',
        title: 'Usage Tracking',
        content: 'See real-time usage metrics for all features. Track your consumption against your plan limits.',
        position: 'top',
        action: 'none',
        highlight_padding: 6
      },
      {
        step: 3,
        target: '.billing-alerts',
        title: 'Usage Alerts',
        content: 'Set up alerts to notify you when you\'re approaching your plan limits or when unusual usage is detected.',
        position: 'right',
        action: 'none',
        highlight_padding: 4
      },
      {
        step: 4,
        target: '.plan-management',
        title: 'Plan Management',
        content: 'Upgrade, downgrade, or modify your subscription plan based on your changing needs.',
        position: 'left',
        action: 'none',
        highlight_padding: 6
      },
      {
        step: 5,
        target: '.invoice-history',
        title: 'Invoice History',
        content: 'Access all your past invoices and download them for your records or accounting purposes.',
        position: 'top',
        action: 'none',
        highlight_padding: 4
      },
      {
        step: 6,
        target: '.payment-methods',
        title: 'Payment Methods',
        content: 'Manage your payment methods and billing preferences securely.',
        position: 'bottom',
        action: 'none',
        highlight_padding: 6
      }
    ],
    trigger_conditions: {
      billing_page_visits: { min: 1 },
      subscription_active: true
    }
  }
}

// ================================================
// CORE TOUR FUNCTIONS
// ================================================

/**
 * Start a new feature tour for a user
 */
export async function startTour(request: StartTourRequest): Promise<{
  success: boolean
  data?: FeatureTour
  error?: string
}> {
  try {
    // Validate request
    const validation = startTourRequestSchema.safeParse(request)
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const { tour_name, user_id, tour_version = '1.0' } = validation.data
    const supabase = createClient()

    // Check if user already has an active tour of this type
    const { data: existing } = await supabase
      .from('feature_tours')
      .select('*')
      .eq('user_id', user_id)
      .eq('tour_name', tour_name)
      .in('status', ['active', 'paused'])
      .single()

    if (existing) {
      return {
        success: true,
        data: existing
      }
    }

    // Get tour configuration
    const tourConfig = FEATURE_TOUR_CONFIGS[tour_name]
    if (!tourConfig) {
      return {
        success: false,
        error: `Unknown tour: ${tour_name}`
      }
    }

    // Create new tour record
    const tourData: FeatureTourInsert = {
      user_id,
      tour_name,
      tour_version,
      status: 'active',
      current_step: 1,
      total_steps: tourConfig.total_steps,
      started_at: new Date().toISOString(),
      last_step_at: new Date().toISOString(),
      completed_steps: [],
      step_timings: {},
      interactions: {}
    }

    const { data, error } = await supabase
      .from('feature_tours')
      .insert(tourData)
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
 * Get current tour status for a user
 */
export async function getTourStatus(
  userId: string, 
  tourName: string
): Promise<TourStatusResponse | null> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('feature_tours')
      .select('*')
      .eq('user_id', userId)
      .eq('tour_name', tourName)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    const tourConfig = FEATURE_TOUR_CONFIGS[tourName]
    if (!tourConfig) {
      return null
    }

    const nextStep = tourConfig.steps.find(step => step.step === data.current_step)
    const progressPercentage = Math.round(((data.completed_steps?.length || 0) / tourConfig.total_steps) * 100)

    return {
      feature_tour: data,
      tour_config: tourConfig,
      next_step: nextStep,
      progress_percentage: progressPercentage
    }
  } catch (error) {
    console.error('Error getting tour status:', error)
    return null
  }
}

/**
 * Update tour progress for a specific step
 */
export async function updateTourProgress(request: UpdateTourProgressRequest): Promise<{
  success: boolean
  data?: FeatureTour
  error?: string
}> {
  try {
    // Validate request
    const validation = updateTourProgressRequestSchema.safeParse(request)
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const { tour_id, step, interaction_data = {}, completed = false } = validation.data
    const supabase = createClient()

    // Get current tour record
    const { data: current, error: fetchError } = await supabase
      .from('feature_tours')
      .select('*')
      .eq('id', tour_id)
      .single()

    if (fetchError || !current) {
      return {
        success: false,
        error: 'Tour not found'
      }
    }

    // Update step progress
    let updatedCompletedSteps = current.completed_steps || []
    let updatedStepTimings = current.step_timings || {}
    let updatedInteractions = current.interactions || {}

    if (completed && !updatedCompletedSteps.includes(step)) {
      updatedCompletedSteps.push(step)
    }

    // Record step timing
    const stepStartTime = updatedStepTimings[`step_${step}_start`]
    if (stepStartTime && completed) {
      const timeSpent = Date.now() - stepStartTime
      updatedStepTimings[`step_${step}_duration`] = timeSpent
    } else if (!stepStartTime) {
      updatedStepTimings[`step_${step}_start`] = Date.now()
    }

    // Record interactions
    if (Object.keys(interaction_data).length > 0) {
      updatedInteractions[`step_${step}`] = {
        ...updatedInteractions[`step_${step}`],
        ...interaction_data,
        timestamp: new Date().toISOString()
      }
    }

    // Determine next step and status
    let nextStep = step
    let status: TourStatus = current.status

    if (completed) {
      nextStep = step + 1
      if (nextStep > current.total_steps) {
        status = 'completed'
        nextStep = current.total_steps
      }
    }

    // Update tour record
    const updateData: FeatureTourUpdate = {
      current_step: nextStep,
      status,
      completed_steps: updatedCompletedSteps,
      step_timings: updatedStepTimings,
      interactions: updatedInteractions,
      last_step_at: new Date().toISOString()
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('feature_tours')
      .update(updateData)
      .eq('id', tour_id)
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
 * Complete a feature tour
 */
export async function completeTour(request: CompleteTourRequest): Promise<{
  success: boolean
  data?: FeatureTour
  error?: string
}> {
  try {
    // Validate request
    const validation = completeTourRequestSchema.safeParse(request)
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const { tour_id, feedback_score, feedback_comment } = validation.data
    const supabase = createClient()

    // Update tour as completed
    const updateData: FeatureTourUpdate = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      last_step_at: new Date().toISOString(),
      feedback_score,
      feedback_comment
    }

    const { data, error } = await supabase
      .from('feature_tours')
      .update(updateData)
      .eq('id', tour_id)
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
 * Skip a feature tour
 */
export async function skipTour(tourId: string, reason?: string): Promise<{
  success: boolean
  data?: FeatureTour
  error?: string
}> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('feature_tours')
      .update({
        status: 'skipped',
        last_step_at: new Date().toISOString(),
        metadata: {
          skip_reason: reason,
          skipped_at: new Date().toISOString()
        }
      })
      .eq('id', tourId)
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
 * Pause a feature tour
 */
export async function pauseTour(tourId: string): Promise<{
  success: boolean
  data?: FeatureTour
  error?: string
}> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('feature_tours')
      .update({
        status: 'paused',
        last_step_at: new Date().toISOString()
      })
      .eq('id', tourId)
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
 * Resume a paused feature tour
 */
export async function resumeTour(tourId: string): Promise<{
  success: boolean
  data?: FeatureTour
  error?: string
}> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('feature_tours')
      .update({
        status: 'active',
        last_step_at: new Date().toISOString()
      })
      .eq('id', tourId)
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
 * Get tour analytics for an organization
 */
export async function getTourAnalytics(
  organizationId?: string,
  tourName?: string,
  timeRange = '30d'
): Promise<{
  total_tours: number
  completed_tours: number
  completion_rate: number
  average_completion_time: number
  average_rating: number
  step_completion_rates: Record<number, number>
  popular_tours: Array<{ tour_name: string; starts: number; completions: number }>
}> {
  try {
    const supabase = createClient()
    
    // Calculate date range
    const daysBack = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    let query = supabase
      .from('feature_tours')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (tourName) {
      query = query.eq('tour_name', tourName)
    }

    const { data, error } = await query

    if (error || !data) {
      throw new Error(`Failed to fetch tour analytics: ${error?.message}`)
    }

    const totalTours = data.length
    const completedTours = data.filter(t => t.status === 'completed').length
    const completionRate = totalTours > 0 ? (completedTours / totalTours) * 100 : 0

    // Calculate average completion time
    const completedWithTimes = data.filter(t => 
      t.status === 'completed' && t.started_at && t.completed_at
    )
    const avgCompletionTime = completedWithTimes.length > 0 
      ? completedWithTimes.reduce((sum, t) => {
          const start = new Date(t.started_at!).getTime()
          const end = new Date(t.completed_at!).getTime()
          return sum + (end - start)
        }, 0) / completedWithTimes.length / (1000 * 60) // Convert to minutes
      : 0

    // Calculate average rating
    const toursWithRating = data.filter(t => t.feedback_score !== null)
    const avgRating = toursWithRating.length > 0
      ? toursWithRating.reduce((sum, t) => sum + (t.feedback_score || 0), 0) / toursWithRating.length
      : 0

    // Calculate step completion rates (for specific tour if provided)
    const stepCompletionRates: Record<number, number> = {}
    if (tourName && data.length > 0) {
      const tourConfig = FEATURE_TOUR_CONFIGS[tourName]
      if (tourConfig) {
        for (let step = 1; step <= tourConfig.total_steps; step++) {
          const completedStep = data.filter(t => 
            (t.completed_steps || []).includes(step)
          ).length
          stepCompletionRates[step] = totalTours > 0 ? (completedStep / totalTours) * 100 : 0
        }
      }
    }

    // Get popular tours
    const tourStats = data.reduce((acc, tour) => {
      const name = tour.tour_name
      if (!acc[name]) {
        acc[name] = { starts: 0, completions: 0 }
      }
      acc[name].starts++
      if (tour.status === 'completed') {
        acc[name].completions++
      }
      return acc
    }, {} as Record<string, { starts: number; completions: number }>)

    const popularTours = Object.entries(tourStats)
      .map(([tour_name, stats]) => ({ tour_name, ...stats }))
      .sort((a, b) => b.starts - a.starts)
      .slice(0, 5)

    return {
      total_tours: totalTours,
      completed_tours: completedTours,
      completion_rate: Math.round(completionRate * 100) / 100,
      average_completion_time: Math.round(avgCompletionTime),
      average_rating: Math.round(avgRating * 100) / 100,
      step_completion_rates: stepCompletionRates,
      popular_tours: popularTours
    }
  } catch (error) {
    console.error('Error calculating tour analytics:', error)
    return {
      total_tours: 0,
      completed_tours: 0,
      completion_rate: 0,
      average_completion_time: 0,
      average_rating: 0,
      step_completion_rates: {},
      popular_tours: []
    }
  }
}

/**
 * Check if user should be offered a specific tour
 */
export async function shouldOfferTour(
  userId: string,
  tourName: string,
  userContext: Record<string, any> = {}
): Promise<boolean> {
  try {
    const tourConfig = FEATURE_TOUR_CONFIGS[tourName]
    if (!tourConfig?.trigger_conditions) {
      return false
    }

    const supabase = createClient()

    // Check if user has already completed this tour
    const { data: existingTour } = await supabase
      .from('feature_tours')
      .select('status')
      .eq('user_id', userId)
      .eq('tour_name', tourName)
      .in('status', ['completed', 'skipped'])
      .single()

    if (existingTour) {
      return false // User already completed or skipped this tour
    }

    // Check trigger conditions
    for (const [condition, criteria] of Object.entries(tourConfig.trigger_conditions)) {
      const userValue = userContext[condition]
      
      if (typeof criteria === 'object' && criteria !== null) {
        const { min, max } = criteria as { min?: number; max?: number }
        
        if (min !== undefined && userValue < min) {
          return false
        }
        
        if (max !== undefined && userValue > max) {
          return false
        }
      } else if (criteria !== userValue) {
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error checking tour offer conditions:', error)
    return false
  }
}

/**
 * Get recommended tours for a user
 */
export async function getRecommendedTours(
  userId: string,
  userContext: Record<string, any> = {}
): Promise<string[]> {
  const recommendations: string[] = []

  for (const tourName of Object.keys(FEATURE_TOUR_CONFIGS)) {
    const shouldOffer = await shouldOfferTour(userId, tourName, userContext)
    if (shouldOffer) {
      recommendations.push(tourName)
    }
  }

  return recommendations
}