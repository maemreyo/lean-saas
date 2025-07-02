// Customer Success Module Zod Validation Schemas

import { z } from 'zod'

// ================================================
// COMMON VALIDATION SCHEMAS
// ================================================

const uuidSchema = z.string().uuid('Invalid UUID format')
const emailSchema = z.string().email('Invalid email format')
const urlSchema = z.string().url('Invalid URL format')
const positiveIntegerSchema = z.number().int().min(0, 'Must be a non-negative integer')
const percentageSchema = z.number().min(0).max(100, 'Must be between 0 and 100')
const timestampSchema = z.string().datetime('Invalid timestamp format')

// ================================================
// ENUM SCHEMAS
// ================================================

export const onboardingStatusSchema = z.enum([
  'not_started',
  'in_progress', 
  'completed',
  'skipped',
  'abandoned'
], {
  errorMap: () => ({ message: 'Invalid onboarding status' })
})

export const tourStatusSchema = z.enum([
  'active',
  'completed',
  'skipped',
  'paused'
], {
  errorMap: () => ({ message: 'Invalid tour status' })
})

export const feedbackTypeSchema = z.enum([
  'nps',
  'csat',
  'rating',
  'comment',
  'bug_report',
  'feature_request',
  'survey_response'
], {
  errorMap: () => ({ message: 'Invalid feedback type' })
})

export const ticketStatusSchema = z.enum([
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
  'escalated'
], {
  errorMap: () => ({ message: 'Invalid ticket status' })
})

export const ticketPrioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'urgent',
  'critical'
], {
  errorMap: () => ({ message: 'Invalid ticket priority' })
})

export const articleStatusSchema = z.enum([
  'draft',
  'published',
  'archived',
  'under_review'
], {
  errorMap: () => ({ message: 'Invalid article status' })
})

export const healthStatusSchema = z.enum([
  'healthy',
  'at_risk',
  'critical',
  'churned',
  'recovering'
], {
  errorMap: () => ({ message: 'Invalid health status' })
})

export const adoptionStatusSchema = z.enum([
  'not_adopted',
  'exploring',
  'active',
  'power_user',
  'churned'
], {
  errorMap: () => ({ message: 'Invalid adoption status' })
})

export const messageTypeSchema = z.enum([
  'notification',
  'announcement',
  'tips',
  'feature_highlight',
  'survey_prompt',
  'support_followup'
], {
  errorMap: () => ({ message: 'Invalid message type' })
})

export const surveyTypeSchema = z.enum([
  'nps',
  'csat',
  'onboarding_feedback',
  'feature_feedback',
  'churn_survey',
  'product_feedback'
], {
  errorMap: () => ({ message: 'Invalid survey type' })
})

export const questionTypeSchema = z.enum([
  'nps',
  'rating',
  'multiple_choice',
  'text',
  'textarea',
  'boolean',
  'scale'
], {
  errorMap: () => ({ message: 'Invalid question type' })
})

export const interactionTypeSchema = z.enum([
  'viewed',
  'clicked',
  'dismissed',
  'completed',
  'skipped'
], {
  errorMap: () => ({ message: 'Invalid interaction type' })
})

// ================================================
// CONFIGURATION SCHEMAS
// ================================================

export const onboardingStepSchema = z.object({
  step: positiveIntegerSchema,
  title: z.string().min(1, 'Step title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters'),
  component: z.string().max(100, 'Component name must be less than 100 characters').optional(),
  required: z.boolean().default(true),
  estimated_time: positiveIntegerSchema.optional(),
  help_text: z.string().max(500, 'Help text must be less than 500 characters').optional(),
  validation_rules: z.record(z.any()).optional(),
  completion_criteria: z.record(z.any()).optional()
}).strict()

export const onboardingFlowConfigSchema = z.object({
  flow_name: z.string().min(1, 'Flow name is required').max(255, 'Flow name must be less than 255 characters'),
  version: z.string().max(50, 'Version must be less than 50 characters').default('1.0'),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters'),
  total_steps: z.number().int().min(1, 'Must have at least 1 step').max(20, 'Maximum 20 steps allowed'),
  estimated_total_time: positiveIntegerSchema,
  steps: z.array(onboardingStepSchema).min(1, 'At least one step is required'),
  skip_allowed: z.boolean().default(false),
  auto_save: z.boolean().default(true),
  completion_rewards: z.array(z.string()).optional()
}).strict()

export const tourStepSchema = z.object({
  step: positiveIntegerSchema,
  target: z.string().min(1, 'Target selector is required'),
  title: z.string().min(1, 'Step title is required').max(255, 'Title must be less than 255 characters'),
  content: z.string().min(1, 'Step content is required').max(1000, 'Content must be less than 1000 characters'),
  position: z.enum(['top', 'bottom', 'left', 'right', 'center']).default('bottom'),
  action: z.enum(['click', 'hover', 'none']).default('none'),
  wait_for_action: z.boolean().default(false),
  highlight_padding: z.number().min(0).max(50).default(4),
  skip_allowed: z.boolean().default(true)
}).strict()

export const tourConfigSchema = z.object({
  tour_name: z.string().min(1, 'Tour name is required').max(255, 'Tour name must be less than 255 characters'),
  version: z.string().max(50, 'Version must be less than 50 characters').default('1.0'),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters'),
  total_steps: z.number().int().min(1, 'Must have at least 1 step').max(15, 'Maximum 15 steps allowed'),
  steps: z.array(tourStepSchema).min(1, 'At least one step is required'),
  auto_start: z.boolean().default(false),
  show_progress: z.boolean().default(true),
  allow_skip: z.boolean().default(true),
  trigger_conditions: z.record(z.any()).optional()
}).strict()

export const surveyQuestionSchema = z.object({
  id: z.string().min(1, 'Question ID is required').max(100, 'ID must be less than 100 characters'),
  type: questionTypeSchema,
  question: z.string().min(1, 'Question text is required').max(500, 'Question must be less than 500 characters'),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  scale: z.object({
    min: z.number().int(),
    max: z.number().int(),
    labels: z.record(z.string()).optional()
  }).optional(),
  condition: z.object({
    trigger: z.string(),
    operator: z.enum(['answered', 'equals', 'greater_than', 'less_than']),
    value: z.any().optional()
  }).optional(),
  validation: z.object({
    min_length: positiveIntegerSchema.optional(),
    max_length: positiveIntegerSchema.optional(),
    pattern: z.string().optional()
  }).optional()
}).strict()

export const surveyConfigSchema = z.object({
  id: uuidSchema,
  title: z.string().min(1, 'Survey title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  survey_type: surveyTypeSchema,
  questions: z.array(surveyQuestionSchema).min(1, 'At least one question is required').max(50, 'Maximum 50 questions allowed'),
  logic_rules: z.record(z.any()).optional(),
  target_audience: z.record(z.any()).optional(),
  trigger_conditions: z.record(z.any()).optional(),
  display_settings: z.record(z.any()).optional(),
  completion_message: z.string().max(500, 'Completion message must be less than 500 characters').optional(),
  redirect_url: urlSchema.optional()
}).strict()

export const healthScoreComponentsSchema = z.object({
  usage_score: percentageSchema,
  engagement_score: percentageSchema,
  satisfaction_score: percentageSchema,
  support_score: percentageSchema,
  billing_score: percentageSchema
}).strict()

export const churnRiskAssessmentSchema = z.object({
  risk_score: z.number().min(0).max(1, 'Risk score must be between 0 and 1'),
  probability_percentage: percentageSchema,
  days_to_predicted_churn: positiveIntegerSchema.optional(),
  risk_factors: z.array(z.string()),
  recommended_interventions: z.array(z.string()),
  confidence_level: z.number().min(0).max(1, 'Confidence level must be between 0 and 1')
}).strict()

// ================================================
// ENTITY CREATION SCHEMAS
// ================================================

export const createUserOnboardingSchema = z.object({
  user_id: uuidSchema,
  organization_id: uuidSchema.optional(),
  flow_name: z.string().min(1, 'Flow name is required').max(255, 'Flow name must be less than 255 characters').default('default'),
  total_steps: z.number().int().min(1, 'Must have at least 1 step').max(20, 'Maximum 20 steps allowed').default(5),
  metadata: z.record(z.any()).optional()
}).strict()

export const updateUserOnboardingSchema = z.object({
  current_step: positiveIntegerSchema.optional(),
  status: onboardingStatusSchema.optional(),
  completed_steps: z.array(positiveIntegerSchema).optional(),
  skipped_steps: z.array(positiveIntegerSchema).optional(),
  step_data: z.record(z.any()).optional(),
  completion_percentage: percentageSchema.optional(),
  metadata: z.record(z.any()).optional()
}).strict()

export const createFeatureTourSchema = z.object({
  user_id: uuidSchema,
  organization_id: uuidSchema.optional(),
  tour_name: z.string().min(1, 'Tour name is required').max(255, 'Tour name must be less than 255 characters'),
  tour_version: z.string().max(50, 'Version must be less than 50 characters').default('1.0'),
  total_steps: z.number().int().min(1, 'Must have at least 1 step').max(15, 'Maximum 15 steps allowed'),
  metadata: z.record(z.any()).optional()
}).strict()

export const updateFeatureTourSchema = z.object({
  current_step: positiveIntegerSchema.optional(),
  status: tourStatusSchema.optional(),
  completed_steps: z.array(positiveIntegerSchema).optional(),
  step_timings: z.record(z.number()).optional(),
  interactions: z.record(z.any()).optional(),
  feedback_score: z.number().int().min(1).max(5).optional(),
  feedback_comment: z.string().max(1000, 'Feedback comment must be less than 1000 characters').optional()
}).strict()

export const createUserFeedbackSchema = z.object({
  user_id: uuidSchema,
  organization_id: uuidSchema.optional(),
  feedback_type: feedbackTypeSchema,
  title: z.string().max(255, 'Title must be less than 255 characters').optional(),
  content: z.string().max(5000, 'Content must be less than 5000 characters').optional(),
  rating: z.number().int().min(1).max(10).optional(),
  nps_score: z.number().int().min(0).max(10).optional(),
  csat_score: z.number().int().min(1).max(5).optional(),
  page_url: urlSchema.optional(),
  feature_name: z.string().max(255, 'Feature name must be less than 255 characters').optional(),
  user_segment: z.string().max(100, 'User segment must be less than 100 characters').optional(),
  survey_id: uuidSchema.optional(),
  survey_response: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
}).strict()

export const updateUserFeedbackSchema = z.object({
  processed: z.boolean().optional(),
  sentiment_score: z.number().min(-1).max(1, 'Sentiment score must be between -1 and 1').optional(),
  sentiment_label: z.enum(['positive', 'negative', 'neutral']).optional(),
  follow_up_required: z.boolean().optional(),
  follow_up_completed: z.boolean().optional(),
  follow_up_notes: z.string().max(1000, 'Follow-up notes must be less than 1000 characters').optional()
}).strict()

export const createSupportTicketSchema = z.object({
  user_id: uuidSchema,
  organization_id: uuidSchema.optional(),
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters'),
  description: z.string().min(1, 'Description is required').max(10000, 'Description must be less than 10000 characters'),
  priority: ticketPrioritySchema.default('medium'),
  category: z.string().max(100, 'Category must be less than 100 characters').optional(),
  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).optional(),
  metadata: z.record(z.any()).optional()
}).strict()

export const updateSupportTicketSchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assigned_to_user_id: uuidSchema.optional(),
  category: z.string().max(100, 'Category must be less than 100 characters').optional(),
  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).optional(),
  resolution_notes: z.string().max(2000, 'Resolution notes must be less than 2000 characters').optional(),
  resolution_type: z.string().max(100, 'Resolution type must be less than 100 characters').optional(),
  satisfaction_rating: z.number().int().min(1).max(5).optional(),
  satisfaction_feedback: z.string().max(1000, 'Satisfaction feedback must be less than 1000 characters').optional()
}).strict()

export const createKnowledgeBaseSchema = z.object({
  organization_id: uuidSchema.optional(),
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500, 'Excerpt must be less than 500 characters').optional(),
  status: articleStatusSchema.default('draft'),
  category: z.string().max(100, 'Category must be less than 100 characters').optional(),
  subcategory: z.string().max(100, 'Subcategory must be less than 100 characters').optional(),
  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).optional(),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug must be less than 255 characters'),
  meta_title: z.string().max(255, 'Meta title must be less than 255 characters').optional(),
  meta_description: z.string().max(500, 'Meta description must be less than 500 characters').optional(),
  keywords: z.array(z.string().max(50, 'Keyword must be less than 50 characters')).optional(),
  author_id: uuidSchema.optional(),
  featured: z.boolean().default(false),
  featured_order: positiveIntegerSchema.optional()
}).strict()

export const updateKnowledgeBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  excerpt: z.string().max(500, 'Excerpt must be less than 500 characters').optional(),
  status: articleStatusSchema.optional(),
  category: z.string().max(100, 'Category must be less than 100 characters').optional(),
  subcategory: z.string().max(100, 'Subcategory must be less than 100 characters').optional(),
  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).optional(),
  meta_title: z.string().max(255, 'Meta title must be less than 255 characters').optional(),
  meta_description: z.string().max(500, 'Meta description must be less than 500 characters').optional(),
  keywords: z.array(z.string().max(50, 'Keyword must be less than 50 characters')).optional(),
  last_edited_by: uuidSchema.optional(),
  featured: z.boolean().optional(),
  featured_order: positiveIntegerSchema.optional()
}).strict()

export const createCustomerHealthSchema = z.object({
  user_id: uuidSchema,
  organization_id: uuidSchema.optional(),
  health_score: percentageSchema,
  health_status: healthStatusSchema,
  usage_score: percentageSchema.default(0),
  engagement_score: percentageSchema.default(0),
  satisfaction_score: percentageSchema.default(0),
  support_score: percentageSchema.default(0),
  billing_score: percentageSchema.default(0),
  churn_risk_score: z.number().min(0).max(1, 'Churn risk score must be between 0 and 1').default(0),
  churn_probability_percentage: percentageSchema.default(0),
  days_to_predicted_churn: positiveIntegerSchema.optional(),
  login_frequency: z.number().min(0, 'Login frequency must be non-negative').optional(),
  feature_adoption_rate: z.number().min(0).max(1, 'Feature adoption rate must be between 0 and 1').optional(),
  support_ticket_count: positiveIntegerSchema.default(0),
  nps_score: z.number().int().min(0).max(10).optional(),
  calculation_method: z.string().max(100, 'Calculation method must be less than 100 characters').default('standard'),
  data_sources: z.record(z.any()).optional()
}).strict()

export const updateCustomerHealthSchema = z.object({
  health_score: percentageSchema.optional(),
  health_status: healthStatusSchema.optional(),
  previous_score: percentageSchema.optional(),
  score_trend: z.enum(['improving', 'declining', 'stable']).optional(),
  usage_score: percentageSchema.optional(),
  engagement_score: percentageSchema.optional(),
  satisfaction_score: percentageSchema.optional(),
  support_score: percentageSchema.optional(),
  billing_score: percentageSchema.optional(),
  churn_risk_score: z.number().min(0).max(1, 'Churn risk score must be between 0 and 1').optional(),
  churn_probability_percentage: percentageSchema.optional(),
  days_to_predicted_churn: positiveIntegerSchema.optional(),
  intervention_required: z.boolean().optional(),
  intervention_type: z.string().max(100, 'Intervention type must be less than 100 characters').optional(),
  intervention_scheduled_at: timestampSchema.optional(),
  intervention_completed_at: timestampSchema.optional(),
  intervention_notes: z.string().max(1000, 'Intervention notes must be less than 1000 characters').optional()
}).strict()

export const createFeatureAdoptionSchema = z.object({
  user_id: uuidSchema,
  organization_id: uuidSchema.optional(),
  feature_name: z.string().min(1, 'Feature name is required').max(255, 'Feature name must be less than 255 characters'),
  feature_category: z.string().max(100, 'Feature category must be less than 100 characters').optional(),
  feature_version: z.string().max(50, 'Feature version must be less than 50 characters').default('1.0'),
  adoption_status: adoptionStatusSchema.default('not_adopted'),
  total_usage_count: positiveIntegerSchema.default(0),
  usage_frequency: z.number().min(0, 'Usage frequency must be non-negative').default(0),
  session_duration_avg: positiveIntegerSchema.default(0),
  depth_of_use_score: percentageSchema.default(0),
  feature_satisfaction_rating: z.number().int().min(1).max(5).optional(),
  recommended_next_features: z.array(z.string()).optional(),
  blockers: z.array(z.string()).optional(),
  feedback_provided: z.string().max(1000, 'Feedback must be less than 1000 characters').optional(),
  metadata: z.record(z.any()).optional()
}).strict()

export const updateFeatureAdoptionSchema = z.object({
  adoption_status: adoptionStatusSchema.optional(),
  total_usage_count: positiveIntegerSchema.optional(),
  usage_frequency: z.number().min(0, 'Usage frequency must be non-negative').optional(),
  session_duration_avg: positiveIntegerSchema.optional(),
  power_user_threshold_met: z.boolean().optional(),
  help_viewed: z.boolean().optional(),
  tutorial_completed: z.boolean().optional(),
  support_tickets_created: positiveIntegerSchema.optional(),
  depth_of_use_score: percentageSchema.optional(),
  feature_satisfaction_rating: z.number().int().min(1).max(5).optional(),
  recommended_next_features: z.array(z.string()).optional(),
  blockers: z.array(z.string()).optional(),
  feedback_provided: z.string().max(1000, 'Feedback must be less than 1000 characters').optional()
}).strict()

export const createInAppMessageSchema = z.object({
  organization_id: uuidSchema.optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  content: z.string().min(1, 'Content is required').max(2000, 'Content must be less than 2000 characters'),
  message_type: messageTypeSchema.default('notification'),
  target_user_ids: z.array(uuidSchema).optional(),
  target_user_segments: z.array(z.string().max(100, 'Segment name must be less than 100 characters')).optional(),
  target_conditions: z.record(z.any()).optional(),
  display_type: z.string().max(50, 'Display type must be less than 50 characters').default('banner'),
  display_position: z.string().max(50, 'Display position must be less than 50 characters').default('top'),
  display_priority: positiveIntegerSchema.default(0),
  scheduled_at: timestampSchema.optional(),
  expires_at: timestampSchema.optional(),
  cta_text: z.string().max(100, 'CTA text must be less than 100 characters').optional(),
  cta_url: urlSchema.optional(),
  experiment_id: uuidSchema.optional(),
  variant_name: z.string().max(100, 'Variant name must be less than 100 characters').optional(),
  created_by_user_id: uuidSchema.optional()
}).strict()

export const updateInAppMessageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters').optional(),
  content: z.string().min(1, 'Content is required').max(2000, 'Content must be less than 2000 characters').optional(),
  active: z.boolean().optional(),
  scheduled_at: timestampSchema.optional(),
  expires_at: timestampSchema.optional(),
  display_priority: positiveIntegerSchema.optional(),
  target_user_segments: z.array(z.string().max(100, 'Segment name must be less than 100 characters')).optional(),
  cta_text: z.string().max(100, 'CTA text must be less than 100 characters').optional(),
  cta_url: urlSchema.optional()
}).strict()

export const createProductSurveySchema = z.object({
  organization_id: uuidSchema.optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  survey_type: surveyTypeSchema,
  questions: z.array(surveyQuestionSchema).min(1, 'At least one question is required').max(50, 'Maximum 50 questions allowed'),
  logic_rules: z.record(z.any()).optional(),
  target_audience: z.record(z.any()).optional(),
  scheduled_start: timestampSchema.optional(),
  scheduled_end: timestampSchema.optional(),
  trigger_conditions: z.record(z.any()).optional(),
  frequency_limit: positiveIntegerSchema.default(1),
  display_settings: z.record(z.any()).optional(),
  created_by_user_id: uuidSchema.optional()
}).strict()

export const updateProductSurveySchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters').optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  questions: z.array(surveyQuestionSchema).min(1, 'At least one question is required').max(50, 'Maximum 50 questions allowed').optional(),
  active: z.boolean().optional(),
  scheduled_start: timestampSchema.optional(),
  scheduled_end: timestampSchema.optional(),
  target_audience: z.record(z.any()).optional(),
  display_settings: z.record(z.any()).optional(),
  results_summary: z.record(z.any()).optional(),
  nps_score: z.number().min(0).max(10).optional(),
  csat_average: z.number().min(1).max(5).optional()
}).strict()

export const createUserSessionSchema = z.object({
  user_id: uuidSchema,
  organization_id: uuidSchema.optional(),
  session_id: z.string().min(1, 'Session ID is required').max(255, 'Session ID must be less than 255 characters'),
  device_id: z.string().max(255, 'Device ID must be less than 255 characters').optional(),
  user_agent: z.string().max(1000, 'User agent must be less than 1000 characters').optional(),
  device_type: z.string().max(50, 'Device type must be less than 50 characters').optional(),
  browser: z.string().max(100, 'Browser must be less than 100 characters').optional(),
  operating_system: z.string().max(100, 'OS must be less than 100 characters').optional(),
  screen_resolution: z.string().max(20, 'Screen resolution must be less than 20 characters').optional(),
  country: z.string().max(100, 'Country must be less than 100 characters').optional(),
  city: z.string().max(100, 'City must be less than 100 characters').optional(),
  timezone: z.string().max(100, 'Timezone must be less than 100 characters').optional(),
  ip_address: z.string().ip('Invalid IP address').optional(),
  metadata: z.record(z.any()).optional()
}).strict()

export const updateUserSessionSchema = z.object({
  ended_at: timestampSchema.optional(),
  duration_seconds: positiveIntegerSchema.optional(),
  page_views: positiveIntegerSchema.optional(),
  clicks: positiveIntegerSchema.optional(),
  features_used: z.array(z.string()).optional(),
  actions_performed: z.array(z.record(z.any())).optional(),
  bounce_session: z.boolean().optional(),
  engaged_session: z.boolean().optional(),
  conversion_session: z.boolean().optional(),
  page_load_times: z.record(z.number()).optional(),
  error_count: positiveIntegerSchema.optional(),
  errors: z.array(z.record(z.any())).optional()
}).strict()

// ================================================
// API REQUEST SCHEMAS
// ================================================

export const startOnboardingRequestSchema = z.object({
  flow_name: z.string().max(255, 'Flow name must be less than 255 characters').default('default'),
  user_id: uuidSchema,
  organization_id: uuidSchema.optional(),
  metadata: z.record(z.any()).optional()
}).strict()

export const updateOnboardingProgressRequestSchema = z.object({
  user_id: uuidSchema,
  step: positiveIntegerSchema,
  step_data: z.record(z.any()).optional(),
  completed: z.boolean().optional(),
  skipped: z.boolean().optional()
}).strict()

export const completeOnboardingRequestSchema = z.object({
  user_id: uuidSchema,
  completion_data: z.record(z.any()).optional(),
  feedback: z.string().max(1000, 'Feedback must be less than 1000 characters').optional()
}).strict()

export const startTourRequestSchema = z.object({
  tour_name: z.string().min(1, 'Tour name is required').max(255, 'Tour name must be less than 255 characters'),
  user_id: uuidSchema,
  tour_version: z.string().max(50, 'Version must be less than 50 characters').default('1.0')
}).strict()

export const updateTourProgressRequestSchema = z.object({
  tour_id: uuidSchema,
  step: positiveIntegerSchema,
  interaction_data: z.record(z.any()).optional(),
  completed: z.boolean().optional()
}).strict()

export const completeTourRequestSchema = z.object({
  tour_id: uuidSchema,
  feedback_score: z.number().int().min(1).max(5).optional(),
  feedback_comment: z.string().max(1000, 'Feedback comment must be less than 1000 characters').optional()
}).strict()

export const submitFeedbackRequestSchema = z.object({
  user_id: uuidSchema,
  organization_id: uuidSchema.optional(),
  feedback_type: feedbackTypeSchema,
  rating: z.number().int().min(1).max(10).optional(),
  nps_score: z.number().int().min(0).max(10).optional(),
  csat_score: z.number().int().min(1).max(5).optional(),
  content: z.string().max(5000, 'Content must be less than 5000 characters').optional(),
  context: z.object({
    page_url: urlSchema.optional(),
    feature_name: z.string().max(255, 'Feature name must be less than 255 characters').optional(),
    user_segment: z.string().max(100, 'User segment must be less than 100 characters').optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
}).strict()

export const createTicketRequestSchema = z.object({
  user_id: uuidSchema,
  organization_id: uuidSchema.optional(),
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters'),
  description: z.string().min(1, 'Description is required').max(10000, 'Description must be less than 10000 characters'),
  priority: ticketPrioritySchema.optional(),
  category: z.string().max(100, 'Category must be less than 100 characters').optional(),
  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).optional(),
  metadata: z.record(z.any()).optional()
}).strict()

export const updateTicketRequestSchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assigned_to_user_id: uuidSchema.optional(),
  resolution_notes: z.string().max(2000, 'Resolution notes must be less than 2000 characters').optional(),
  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).optional()
}).strict()

export const ticketResponseRequestSchema = z.object({
  ticket_id: uuidSchema,
  user_id: uuidSchema,
  message: z.string().min(1, 'Message is required').max(5000, 'Message must be less than 5000 characters'),
  internal_note: z.boolean().default(false),
  attachments: z.array(z.string()).optional()
}).strict()

export const calculateHealthScoreRequestSchema = z.object({
  user_id: uuidSchema,
  organization_id: uuidSchema.optional(),
  calculation_method: z.string().max(100, 'Calculation method must be less than 100 characters').default('standard'),
  custom_weights: healthScoreComponentsSchema.optional()
}).strict()

export const trackFeatureUsageRequestSchema = z.object({
  user_id: uuidSchema,
  organization_id: uuidSchema.optional(),
  feature_name: z.string().min(1, 'Feature name is required').max(255, 'Feature name must be less than 255 characters'),
  feature_category: z.string().max(100, 'Feature category must be less than 100 characters').optional(),
  session_duration: positiveIntegerSchema.optional(),
  depth_score: percentageSchema.optional(),
  metadata: z.record(z.any()).optional()
}).strict()

export const updateAdoptionStatusRequestSchema = z.object({
  user_id: uuidSchema,
  feature_name: z.string().min(1, 'Feature name is required').max(255, 'Feature name must be less than 255 characters'),
  adoption_status: adoptionStatusSchema,
  usage_data: z.record(z.any()).optional()
}).strict()

export const sendMessageRequestSchema = z.object({
  organization_id: uuidSchema.optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  content: z.string().min(1, 'Content is required').max(2000, 'Content must be less than 2000 characters'),
  message_type: messageTypeSchema,
  target_user_ids: z.array(uuidSchema).optional(),
  target_user_segments: z.array(z.string().max(100, 'Segment name must be less than 100 characters')).optional(),
  display_settings: z.record(z.any()).optional(),
  schedule_at: timestampSchema.optional(),
  expires_at: timestampSchema.optional(),
  cta_text: z.string().max(100, 'CTA text must be less than 100 characters').optional(),
  cta_url: urlSchema.optional()
}).strict()

export const messageInteractionRequestSchema = z.object({
  message_id: uuidSchema,
  user_id: uuidSchema,
  interaction_type: interactionTypeSchema,
  metadata: z.record(z.any()).optional()
}).strict()

export const submitSurveyResponseRequestSchema = z.object({
  survey_id: uuidSchema,
  user_id: uuidSchema,
  responses: z.record(z.any()).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one response is required'
  }),
  completion_time: positiveIntegerSchema.optional(),
  metadata: z.record(z.any()).optional()
}).strict()

// ================================================
// QUERY PARAMETER SCHEMAS
// ================================================

export const customerSuccessAnalyticsQuerySchema = z.object({
  organization_id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  time_range: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  start_date: z.string().date('Invalid start date').optional(),
  end_date: z.string().date('Invalid end date').optional(),
  metrics: z.array(z.string()).optional(),
  include_trends: z.boolean().default(true)
}).strict()

export const onboardingAnalyticsQuerySchema = z.object({
  organization_id: uuidSchema.optional(),
  flow_name: z.string().optional(),
  time_range: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  include_step_breakdown: z.boolean().default(true),
  include_completion_funnel: z.boolean().default(true)
}).strict()

export const feedbackQuerySchema = z.object({
  organization_id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  feedback_type: feedbackTypeSchema.optional(),
  rating_range: z.object({
    min: z.number().int().min(1).max(10),
    max: z.number().int().min(1).max(10)
  }).optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  processed: z.boolean().optional(),
  start_date: z.string().date('Invalid start date').optional(),
  end_date: z.string().date('Invalid end date').optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: positiveIntegerSchema.default(0)
}).strict()

export const supportTicketsQuerySchema = z.object({
  organization_id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  status: z.array(ticketStatusSchema).optional(),
  priority: z.array(ticketPrioritySchema).optional(),
  category: z.string().optional(),
  assigned_to: uuidSchema.optional(),
  created_after: z.string().date('Invalid date').optional(),
  created_before: z.string().date('Invalid date').optional(),
  search: z.string().max(255, 'Search term must be less than 255 characters').optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: positiveIntegerSchema.default(0),
  sort_by: z.enum(['created_at', 'updated_at', 'priority', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
}).strict()

export const knowledgeBaseQuerySchema = z.object({
  organization_id: uuidSchema.optional(),
  status: z.array(articleStatusSchema).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  search: z.string().max(255, 'Search term must be less than 255 characters').optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: positiveIntegerSchema.default(0),
  sort_by: z.enum(['created_at', 'updated_at', 'view_count', 'helpful_count']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
}).strict()

export const healthScoreQuerySchema = z.object({
  organization_id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  health_status: z.array(healthStatusSchema).optional(),
  risk_threshold: z.number().min(0).max(1).optional(),
  include_history: z.boolean().default(false),
  history_days: positiveIntegerSchema.default(30),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: positiveIntegerSchema.default(0)
}).strict()

export const featureAdoptionQuerySchema = z.object({
  organization_id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  feature_names: z.array(z.string()).optional(),
  feature_category: z.string().optional(),
  adoption_status: z.array(adoptionStatusSchema).optional(),
  time_range: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  include_analytics: z.boolean().default(true),
  limit: z.number().int().min(1).max(100).default(50),
  offset: positiveIntegerSchema.default(0)
}).strict()

// ================================================
// BULK OPERATIONS SCHEMAS
// ================================================

export const bulkFeedbackSchema = z.object({
  feedback: z.array(createUserFeedbackSchema).min(1, 'At least one feedback is required').max(100, 'Maximum 100 feedback items per batch')
}).strict()

export const bulkFeatureUsageSchema = z.object({
  usage_events: z.array(trackFeatureUsageRequestSchema).min(1, 'At least one usage event is required').max(1000, 'Maximum 1000 usage events per batch')
}).strict()

export const bulkHealthScoreUpdateSchema = z.object({
  health_updates: z.array(
    z.object({
      user_id: uuidSchema,
      health_data: updateCustomerHealthSchema
    })
  ).min(1, 'At least one health update is required').max(100, 'Maximum 100 health updates per batch')
}).strict()

// ================================================
// FORM VALIDATION HELPERS
// ================================================

export const validateOnboardingProgress = (data: unknown) => updateOnboardingProgressRequestSchema.safeParse(data)
export const validateTourProgress = (data: unknown) => updateTourProgressRequestSchema.safeParse(data)
export const validateFeedbackSubmission = (data: unknown) => submitFeedbackRequestSchema.safeParse(data)
export const validateTicketCreation = (data: unknown) => createTicketRequestSchema.safeParse(data)
export const validateHealthScoreCalculation = (data: unknown) => calculateHealthScoreRequestSchema.safeParse(data)
export const validateFeatureUsage = (data: unknown) => trackFeatureUsageRequestSchema.safeParse(data)
export const validateMessageSending = (data: unknown) => sendMessageRequestSchema.safeParse(data)
export const validateSurveyResponse = (data: unknown) => submitSurveyResponseRequestSchema.safeParse(data)

// ================================================
// TYPE INFERENCE HELPERS
// ================================================

export type OnboardingProgressRequest = z.infer<typeof updateOnboardingProgressRequestSchema>
export type TourProgressRequest = z.infer<typeof updateTourProgressRequestSchema>
export type FeedbackSubmissionRequest = z.infer<typeof submitFeedbackRequestSchema>
export type TicketCreationRequest = z.infer<typeof createTicketRequestSchema>
export type HealthScoreCalculationRequest = z.infer<typeof calculateHealthScoreRequestSchema>
export type FeatureUsageRequest = z.infer<typeof trackFeatureUsageRequestSchema>
export type MessageSendingRequest = z.infer<typeof sendMessageRequestSchema>
export type SurveyResponseRequest = z.infer<typeof submitSurveyResponseRequestSchema>

export type CustomerSuccessAnalyticsQuery = z.infer<typeof customerSuccessAnalyticsQuerySchema>
export type FeedbackQuery = z.infer<typeof feedbackQuerySchema>
export type SupportTicketsQuery = z.infer<typeof supportTicketsQuerySchema>
export type KnowledgeBaseQuery = z.infer<typeof knowledgeBaseQuerySchema>
export type HealthScoreQuery = z.infer<typeof healthScoreQuerySchema>
export type FeatureAdoptionQuery = z.infer<typeof featureAdoptionQuerySchema>

// ================================================
// EXPORT ALL SCHEMAS
// ================================================

export const customerSuccessSchemas = {
  // Status enums
  onboardingStatus: onboardingStatusSchema,
  tourStatus: tourStatusSchema,
  feedbackType: feedbackTypeSchema,
  ticketStatus: ticketStatusSchema,
  ticketPriority: ticketPrioritySchema,
  articleStatus: articleStatusSchema,
  healthStatus: healthStatusSchema,
  adoptionStatus: adoptionStatusSchema,
  messageType: messageTypeSchema,
  surveyType: surveyTypeSchema,
  questionType: questionTypeSchema,
  interactionType: interactionTypeSchema,

  // Configuration schemas
  onboardingStep: onboardingStepSchema,
  onboardingFlowConfig: onboardingFlowConfigSchema,
  tourStep: tourStepSchema,
  tourConfig: tourConfigSchema,
  surveyQuestion: surveyQuestionSchema,
  surveyConfig: surveyConfigSchema,
  healthScoreComponents: healthScoreComponentsSchema,
  churnRiskAssessment: churnRiskAssessmentSchema,

  // Entity creation schemas
  createUserOnboarding: createUserOnboardingSchema,
  updateUserOnboarding: updateUserOnboardingSchema,
  createFeatureTour: createFeatureTourSchema,
  updateFeatureTour: updateFeatureTourSchema,
  createUserFeedback: createUserFeedbackSchema,
  updateUserFeedback: updateUserFeedbackSchema,
  createSupportTicket: createSupportTicketSchema,
  updateSupportTicket: updateSupportTicketSchema,
  createKnowledgeBase: createKnowledgeBaseSchema,
  updateKnowledgeBase: updateKnowledgeBaseSchema,
  createCustomerHealth: createCustomerHealthSchema,
  updateCustomerHealth: updateCustomerHealthSchema,
  createFeatureAdoption: createFeatureAdoptionSchema,
  updateFeatureAdoption: updateFeatureAdoptionSchema,
  createInAppMessage: createInAppMessageSchema,
  updateInAppMessage: updateInAppMessageSchema,
  createProductSurvey: createProductSurveySchema,
  updateProductSurvey: updateProductSurveySchema,
  createUserSession: createUserSessionSchema,
  updateUserSession: updateUserSessionSchema,

  // API request schemas
  startOnboardingRequest: startOnboardingRequestSchema,
  updateOnboardingProgressRequest: updateOnboardingProgressRequestSchema,
  completeOnboardingRequest: completeOnboardingRequestSchema,
  startTourRequest: startTourRequestSchema,
  updateTourProgressRequest: updateTourProgressRequestSchema,
  completeTourRequest: completeTourRequestSchema,
  submitFeedbackRequest: submitFeedbackRequestSchema,
  createTicketRequest: createTicketRequestSchema,
  updateTicketRequest: updateTicketRequestSchema,
  ticketResponseRequest: ticketResponseRequestSchema,
  calculateHealthScoreRequest: calculateHealthScoreRequestSchema,
  trackFeatureUsageRequest: trackFeatureUsageRequestSchema,
  updateAdoptionStatusRequest: updateAdoptionStatusRequestSchema,
  sendMessageRequest: sendMessageRequestSchema,
  messageInteractionRequest: messageInteractionRequestSchema,
  submitSurveyResponseRequest: submitSurveyResponseRequestSchema,

  // Query schemas
  customerSuccessAnalyticsQuery: customerSuccessAnalyticsQuerySchema,
  onboardingAnalyticsQuery: onboardingAnalyticsQuerySchema,
  feedbackQuery: feedbackQuerySchema,
  supportTicketsQuery: supportTicketsQuerySchema,
  knowledgeBaseQuery: knowledgeBaseQuerySchema,
  healthScoreQuery: healthScoreQuerySchema,
  featureAdoptionQuery: featureAdoptionQuerySchema,

  // Bulk operations
  bulkFeedback: bulkFeedbackSchema,
  bulkFeatureUsage: bulkFeatureUsageSchema,
  bulkHealthScoreUpdate: bulkHealthScoreUpdateSchema
} as const