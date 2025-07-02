// Onboarding Flow Management and Progress Tracking

import { createClient } from '@/lib/supabase/client'
import { 
  UserOnboarding, 
  UserOnboardingInsert, 
  UserOnboardingUpdate,
  OnboardingFlowConfig,
  OnboardingStep,
  OnboardingStatus,
  StartOnboardingRequest,
  UpdateOnboardingProgressRequest,
  CompleteOnboardingRequest,
  OnboardingStatusResponse
} from '@/shared/types/customer-success'
import { 
  createUserOnboardingSchema,
  updateUserOnboardingSchema,
  startOnboardingRequestSchema,
  updateOnboardingProgressRequestSchema,
  completeOnboardingRequestSchema
} from '@/shared/schemas/customer-success'

// ================================================
// ONBOARDING FLOW CONFIGURATIONS
// ================================================

export const DEFAULT_ONBOARDING_FLOWS: Record<string, OnboardingFlowConfig> = {
  default: {
    flow_name: 'default',
    version: '1.0',
    title: 'Welcome to Our Platform',
    description: 'Get started with your new account in just a few simple steps.',
    total_steps: 5,
    estimated_total_time: 15, // minutes
    skip_allowed: true,
    auto_save: true,
    steps: [
      {
        step: 1,
        title: 'Welcome & Account Verification',
        description: 'Verify your email and set up your basic profile information.',
        required: true,
        estimated_time: 3,
        help_text: 'Check your email for a verification link if you haven\'t already.',
        completion_criteria: { email_verified: true, profile_basic: true }
      },
      {
        step: 2,
        title: 'Complete Your Profile',
        description: 'Add your personal and company information to personalize your experience.',
        required: false,
        estimated_time: 5,
        help_text: 'This information helps us customize the platform for your needs.',
        completion_criteria: { profile_completed: true }
      },
      {
        step: 3,
        title: 'Create Your First Project',
        description: 'Set up your first project to start exploring the platform features.',
        required: true,
        estimated_time: 4,
        help_text: 'Don\'t worry, you can always change project settings later.',
        completion_criteria: { project_created: true }
      },
      {
        step: 4,
        title: 'Invite Team Members',
        description: 'Collaborate with your team by inviting members to your organization.',
        required: false,
        estimated_time: 2,
        help_text: 'You can skip this step and invite team members later.',
        completion_criteria: { team_invited: true }
      },
      {
        step: 5,
        title: 'Explore Key Features',
        description: 'Take a quick tour of our main features and get familiar with the interface.',
        required: false,
        estimated_time: 1,
        help_text: 'This tour will help you make the most of our platform.',
        completion_criteria: { features_explored: true }
      }
    ],
    completion_rewards: [
      'unlock_advanced_features',
      'welcome_bonus_credits',
      'priority_support_access'
    ]
  },
  
  developer: {
    flow_name: 'developer',
    version: '1.0',
    title: 'Developer Onboarding',
    description: 'Get your development environment set up and start building.',
    total_steps: 6,
    estimated_total_time: 20,
    skip_allowed: false,
    auto_save: true,
    steps: [
      {
        step: 1,
        title: 'API Key Generation',
        description: 'Generate your API keys for development and production environments.',
        required: true,
        estimated_time: 2,
        completion_criteria: { api_keys_generated: true }
      },
      {
        step: 2,
        title: 'SDK Installation',
        description: 'Install our SDK in your preferred programming language.',
        required: true,
        estimated_time: 5,
        completion_criteria: { sdk_installed: true }
      },
      {
        step: 3,
        title: 'First API Call',
        description: 'Make your first successful API call to verify the setup.',
        required: true,
        estimated_time: 8,
        completion_criteria: { first_api_call: true }
      },
      {
        step: 4,
        title: 'Webhook Configuration',
        description: 'Set up webhooks to receive real-time notifications.',
        required: false,
        estimated_time: 3,
        completion_criteria: { webhooks_configured: true }
      },
      {
        step: 5,
        title: 'Testing Environment',
        description: 'Set up your testing environment and run sample tests.',
        required: false,
        estimated_time: 2,
        completion_criteria: { testing_setup: true }
      }
    ]
  }
}

// ================================================
// CORE ONBOARDING FUNCTIONS
// ================================================

/**
 * Start a new onboarding flow for a user
 */
export async function startOnboarding(request: StartOnboardingRequest): Promise<{
  success: boolean
  data?: UserOnboarding
  error?: string
}> {
  try {
    // Validate request
    const validation = startOnboardingRequestSchema.safeParse(request)
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const { user_id, organization_id, flow_name = 'default', metadata = {} } = validation.data
    const supabase = createClient()

    // Check if user already has an active onboarding
    const { data: existing } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', user_id)
      .eq('flow_name', flow_name)
      .in('status', ['not_started', 'in_progress'])
      .single()

    if (existing) {
      return {
        success: true,
        data: existing
      }
    }

    // Get flow configuration
    const flowConfig = DEFAULT_ONBOARDING_FLOWS[flow_name]
    if (!flowConfig) {
      return {
        success: false,
        error: `Unknown onboarding flow: ${flow_name}`
      }
    }

    // Create new onboarding record
    const onboardingData: UserOnboardingInsert = {
      user_id,
      organization_id,
      flow_name,
      current_step: 1,
      total_steps: flowConfig.total_steps,
      status: 'not_started',
      started_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      completion_percentage: 0,
      completed_steps: [],
      skipped_steps: [],
      step_data: {},
      metadata
    }

    const { data, error } = await supabase
      .from('user_onboarding')
      .insert(onboardingData)
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
 * Get current onboarding status for a user
 */
export async function getOnboardingStatus(
  userId: string, 
  flowName = 'default'
): Promise<OnboardingStatusResponse | null> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', userId)
      .eq('flow_name', flowName)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    const flowConfig = DEFAULT_ONBOARDING_FLOWS[flowName]
    if (!flowConfig) {
      return null
    }

    const nextStep = flowConfig.steps.find(step => step.step === data.current_step)
    const estimatedTimeRemaining = flowConfig.steps
      .filter(step => step.step >= data.current_step)
      .reduce((total, step) => total + (step.estimated_time || 0), 0)

    return {
      user_onboarding: data,
      flow_config: flowConfig,
      next_step: nextStep,
      completion_percentage: data.completion_percentage,
      estimated_time_remaining: estimatedTimeRemaining
    }
  } catch (error) {
    console.error('Error getting onboarding status:', error)
    return null
  }
}

/**
 * Update onboarding progress for a specific step
 */
export async function updateOnboardingProgress(request: UpdateOnboardingProgressRequest): Promise<{
  success: boolean
  data?: UserOnboarding
  error?: string
}> {
  try {
    // Validate request
    const validation = updateOnboardingProgressRequestSchema.safeParse(request)
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const { user_id, step, step_data = {}, completed = false, skipped = false } = validation.data
    const supabase = createClient()

    // Get current onboarding record
    const { data: current, error: fetchError } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', user_id)
      .in('status', ['not_started', 'in_progress'])
      .single()

    if (fetchError || !current) {
      return {
        success: false,
        error: 'No active onboarding found'
      }
    }

    // Update step data
    const updatedStepData = { ...current.step_data, [`step_${step}`]: step_data }
    let updatedCompletedSteps = current.completed_steps || []
    let updatedSkippedSteps = current.skipped_steps || []

    if (completed && !updatedCompletedSteps.includes(step)) {
      updatedCompletedSteps.push(step)
    }

    if (skipped && !updatedSkippedSteps.includes(step)) {
      updatedSkippedSteps.push(step)
    }

    // Calculate completion percentage
    const totalSteps = current.total_steps
    const completedCount = updatedCompletedSteps.length
    const completionPercentage = Math.round((completedCount / totalSteps) * 100)

    // Determine next step and status
    let nextStep = step
    let status: OnboardingStatus = 'in_progress'

    if (completed || skipped) {
      nextStep = step + 1
      if (nextStep > totalSteps) {
        status = 'completed'
        nextStep = totalSteps
      }
    }

    if (current.status === 'not_started') {
      status = 'in_progress'
    }

    // Update onboarding record
    const updateData: UserOnboardingUpdate = {
      current_step: nextStep,
      status,
      completed_steps: updatedCompletedSteps,
      skipped_steps: updatedSkippedSteps,
      step_data: updatedStepData,
      completion_percentage: completionPercentage,
      last_activity_at: new Date().toISOString()
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('user_onboarding')
      .update(updateData)
      .eq('id', current.id)
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
 * Complete the onboarding flow
 */
export async function completeOnboarding(request: CompleteOnboardingRequest): Promise<{
  success: boolean
  data?: UserOnboarding
  error?: string
}> {
  try {
    // Validate request
    const validation = completeOnboardingRequestSchema.safeParse(request)
    if (!validation.success) {
      return { 
        success: false, 
        error: `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}` 
      }
    }

    const { user_id, completion_data = {}, feedback } = validation.data
    const supabase = createClient()

    // Get current onboarding record
    const { data: current, error: fetchError } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', user_id)
      .in('status', ['not_started', 'in_progress'])
      .single()

    if (fetchError || !current) {
      return {
        success: false,
        error: 'No active onboarding found'
      }
    }

    // Mark as completed
    const updateData: UserOnboardingUpdate = {
      status: 'completed',
      completion_percentage: 100,
      completed_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      metadata: {
        ...current.metadata,
        completion_data,
        feedback,
        completed_by_user: true
      }
    }

    const { data, error } = await supabase
      .from('user_onboarding')
      .update(updateData)
      .eq('id', current.id)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`
      }
    }

    // Trigger completion rewards/actions
    await triggerOnboardingCompletion(user_id, current.flow_name, completion_data)

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
 * Skip the entire onboarding flow
 */
export async function skipOnboarding(userId: string, flowName = 'default', reason?: string): Promise<{
  success: boolean
  data?: UserOnboarding
  error?: string
}> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('user_onboarding')
      .update({
        status: 'skipped',
        completion_percentage: 0,
        last_activity_at: new Date().toISOString(),
        metadata: {
          skip_reason: reason,
          skipped_at: new Date().toISOString()
        }
      })
      .eq('user_id', userId)
      .eq('flow_name', flowName)
      .in('status', ['not_started', 'in_progress'])
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
 * Get onboarding analytics for an organization
 */
export async function getOnboardingAnalytics(
  organizationId?: string,
  flowName?: string,
  timeRange = '30d'
): Promise<{
  completion_rate: number
  average_completion_time: number
  step_completion_rates: Record<number, number>
  drop_off_points: Array<{ step: number; drop_off_rate: number }>
  total_users: number
  completed_users: number
}> {
  try {
    const supabase = createClient()
    
    // Calculate date range
    const daysBack = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    let query = supabase
      .from('user_onboarding')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (flowName) {
      query = query.eq('flow_name', flowName)
    }

    const { data, error } = await query

    if (error || !data) {
      throw new Error(`Failed to fetch analytics: ${error?.message}`)
    }

    const totalUsers = data.length
    const completedUsers = data.filter(u => u.status === 'completed').length
    const completionRate = totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0

    // Calculate average completion time
    const completedOnboardings = data.filter(u => u.status === 'completed' && u.started_at && u.completed_at)
    const avgCompletionTime = completedOnboardings.length > 0 
      ? completedOnboardings.reduce((sum, u) => {
          const start = new Date(u.started_at!).getTime()
          const end = new Date(u.completed_at!).getTime()
          return sum + (end - start)
        }, 0) / completedOnboardings.length / (1000 * 60) // Convert to minutes
      : 0

    // Calculate step completion rates
    const maxSteps = Math.max(...data.map(u => u.total_steps))
    const stepCompletionRates: Record<number, number> = {}
    
    for (let step = 1; step <= maxSteps; step++) {
      const usersWhoReachedStep = data.filter(u => u.current_step >= step || (u.completed_steps || []).includes(step))
      stepCompletionRates[step] = totalUsers > 0 ? (usersWhoReachedStep.length / totalUsers) * 100 : 0
    }

    // Calculate drop-off points
    const dropOffPoints = []
    for (let step = 1; step <= maxSteps; step++) {
      const currentRate = stepCompletionRates[step] || 0
      const nextRate = stepCompletionRates[step + 1] || 0
      const dropOffRate = currentRate - nextRate
      
      if (dropOffRate > 10) { // Significant drop-off threshold
        dropOffPoints.push({ step, drop_off_rate: dropOffRate })
      }
    }

    return {
      completion_rate: Math.round(completionRate * 100) / 100,
      average_completion_time: Math.round(avgCompletionTime),
      step_completion_rates: stepCompletionRates,
      drop_off_points: dropOffPoints,
      total_users: totalUsers,
      completed_users: completedUsers
    }
  } catch (error) {
    console.error('Error calculating onboarding analytics:', error)
    return {
      completion_rate: 0,
      average_completion_time: 0,
      step_completion_rates: {},
      drop_off_points: [],
      total_users: 0,
      completed_users: 0
    }
  }
}

/**
 * Get onboarding completion funnel data
 */
export async function getOnboardingFunnel(
  organizationId?: string,
  flowName = 'default'
): Promise<Array<{
  step: number
  title: string
  users_reached: number
  users_completed: number
  completion_rate: number
  avg_time_spent: number
}>> {
  try {
    const supabase = createClient()
    
    let query = supabase
      .from('user_onboarding')
      .select('*')
      .eq('flow_name', flowName)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query

    if (error || !data) {
      return []
    }

    const flowConfig = DEFAULT_ONBOARDING_FLOWS[flowName]
    if (!flowConfig) {
      return []
    }

    return flowConfig.steps.map(stepConfig => {
      const usersReached = data.filter(u => 
        u.current_step >= stepConfig.step || 
        (u.completed_steps || []).includes(stepConfig.step) ||
        (u.skipped_steps || []).includes(stepConfig.step)
      ).length

      const usersCompleted = data.filter(u => 
        (u.completed_steps || []).includes(stepConfig.step)
      ).length

      const completionRate = usersReached > 0 ? (usersCompleted / usersReached) * 100 : 0

      // Calculate average time spent on this step
      const stepTimes = data
        .map(u => u.step_data?.[`step_${stepConfig.step}`]?.time_spent)
        .filter(time => time && typeof time === 'number')
      
      const avgTimeSpent = stepTimes.length > 0 
        ? stepTimes.reduce((sum, time) => sum + time, 0) / stepTimes.length 
        : 0

      return {
        step: stepConfig.step,
        title: stepConfig.title,
        users_reached: usersReached,
        users_completed: usersCompleted,
        completion_rate: Math.round(completionRate * 100) / 100,
        avg_time_spent: Math.round(avgTimeSpent)
      }
    })
  } catch (error) {
    console.error('Error getting onboarding funnel:', error)
    return []
  }
}

/**
 * Trigger onboarding completion actions
 */
async function triggerOnboardingCompletion(
  userId: string, 
  flowName: string, 
  completionData: Record<string, any>
): Promise<void> {
  try {
    const flowConfig = DEFAULT_ONBOARDING_FLOWS[flowName]
    if (!flowConfig?.completion_rewards) {
      return
    }

    // Process completion rewards
    for (const reward of flowConfig.completion_rewards) {
      switch (reward) {
        case 'unlock_advanced_features':
          // Unlock advanced features for the user
          break
        
        case 'welcome_bonus_credits':
          // Add bonus credits to user account
          break
        
        case 'priority_support_access':
          // Enable priority support for the user
          break
        
        default:
          console.warn(`Unknown completion reward: ${reward}`)
      }
    }

    // Send completion notification (could trigger email, in-app message, etc.)
    // This would typically integrate with your messaging/notification system
    
  } catch (error) {
    console.error('Error triggering onboarding completion:', error)
  }
}

/**
 * Validate onboarding step completion criteria
 */
export function validateStepCompletion(
  stepConfig: OnboardingStep,
  stepData: Record<string, any>
): { isValid: boolean; missingCriteria: string[] } {
  if (!stepConfig.completion_criteria) {
    return { isValid: true, missingCriteria: [] }
  }

  const missingCriteria: string[] = []
  
  for (const [criterion, requiredValue] of Object.entries(stepConfig.completion_criteria)) {
    const actualValue = stepData[criterion]
    
    if (requiredValue === true && !actualValue) {
      missingCriteria.push(criterion)
    } else if (requiredValue !== actualValue) {
      missingCriteria.push(criterion)
    }
  }

  return {
    isValid: missingCriteria.length === 0,
    missingCriteria
  }
}