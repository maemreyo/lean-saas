// Customer Success Module TypeScript Types
// Following patterns from billing and marketing module types

import { Database } from './database'

// ================================================
// DATABASE TYPES (Generated from Supabase)
// ================================================

export type UserOnboarding = Database['public']['Tables']['user_onboarding']['Row']
export type UserOnboardingInsert = Database['public']['Tables']['user_onboarding']['Insert']
export type UserOnboardingUpdate = Database['public']['Tables']['user_onboarding']['Update']

export type FeatureTour = Database['public']['Tables']['feature_tours']['Row']
export type FeatureTourInsert = Database['public']['Tables']['feature_tours']['Insert']
export type FeatureTourUpdate = Database['public']['Tables']['feature_tours']['Update']

export type UserFeedback = Database['public']['Tables']['user_feedback']['Row']
export type UserFeedbackInsert = Database['public']['Tables']['user_feedback']['Insert']
export type UserFeedbackUpdate = Database['public']['Tables']['user_feedback']['Update']

export type SupportTicket = Database['public']['Tables']['support_tickets']['Row']
export type SupportTicketInsert = Database['public']['Tables']['support_tickets']['Insert']
export type SupportTicketUpdate = Database['public']['Tables']['support_tickets']['Update']

export type KnowledgeBase = Database['public']['Tables']['knowledge_base']['Row']
export type KnowledgeBaseInsert = Database['public']['Tables']['knowledge_base']['Insert']
export type KnowledgeBaseUpdate = Database['public']['Tables']['knowledge_base']['Update']

export type CustomerHealth = Database['public']['Tables']['customer_health']['Row']
export type CustomerHealthInsert = Database['public']['Tables']['customer_health']['Insert']
export type CustomerHealthUpdate = Database['public']['Tables']['customer_health']['Update']

export type FeatureAdoption = Database['public']['Tables']['feature_adoption']['Row']
export type FeatureAdoptionInsert = Database['public']['Tables']['feature_adoption']['Insert']
export type FeatureAdoptionUpdate = Database['public']['Tables']['feature_adoption']['Update']

export type InAppMessage = Database['public']['Tables']['in_app_messages']['Row']
export type InAppMessageInsert = Database['public']['Tables']['in_app_messages']['Insert']
export type InAppMessageUpdate = Database['public']['Tables']['in_app_messages']['Update']

export type ProductSurvey = Database['public']['Tables']['product_surveys']['Row']
export type ProductSurveyInsert = Database['public']['Tables']['product_surveys']['Insert']
export type ProductSurveyUpdate = Database['public']['Tables']['product_surveys']['Update']

export type UserSession = Database['public']['Tables']['user_sessions']['Row']
export type UserSessionInsert = Database['public']['Tables']['user_sessions']['Insert']
export type UserSessionUpdate = Database['public']['Tables']['user_sessions']['Update']

// ================================================
// ENUM TYPES
// ================================================

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'abandoned'
export type TourStatus = 'active' | 'completed' | 'skipped' | 'paused'
export type FeedbackType = 'nps' | 'csat' | 'rating' | 'comment' | 'bug_report' | 'feature_request' | 'survey_response'
export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed' | 'escalated'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical'
export type ArticleStatus = 'draft' | 'published' | 'archived' | 'under_review'
export type HealthStatus = 'healthy' | 'at_risk' | 'critical' | 'churned' | 'recovering'
export type AdoptionStatus = 'not_adopted' | 'exploring' | 'active' | 'power_user' | 'churned'
export type MessageType = 'notification' | 'announcement' | 'tips' | 'feature_highlight' | 'survey_prompt' | 'support_followup'
export type SurveyType = 'nps' | 'csat' | 'onboarding_feedback' | 'feature_feedback' | 'churn_survey' | 'product_feedback'

// ================================================
// BUSINESS LOGIC TYPES
// ================================================

// Onboarding Step Configuration
export interface OnboardingStep {
  step: number
  title: string
  description: string
  component?: string
  required: boolean
  estimated_time?: number // minutes
  help_text?: string
  validation_rules?: Record<string, any>
  completion_criteria?: Record<string, any>
}

// Onboarding Flow Configuration
export interface OnboardingFlowConfig {
  flow_name: string
  version: string
  title: string
  description: string
  total_steps: number
  estimated_total_time: number // minutes
  steps: OnboardingStep[]
  skip_allowed: boolean
  auto_save: boolean
  completion_rewards?: string[]
}

// Feature Tour Step
export interface TourStep {
  step: number
  target: string // CSS selector
  title: string
  content: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: 'click' | 'hover' | 'none'
  wait_for_action?: boolean
  highlight_padding?: number
  skip_allowed?: boolean
}

// Feature Tour Configuration  
export interface TourConfig {
  tour_name: string
  version: string
  title: string
  description: string
  total_steps: number
  steps: TourStep[]
  auto_start: boolean
  show_progress: boolean
  allow_skip: boolean
  trigger_conditions?: Record<string, any>
}

// Survey Question Types
export interface SurveyQuestion {
  id: string
  type: 'nps' | 'rating' | 'multiple_choice' | 'text' | 'textarea' | 'boolean' | 'scale'
  question: string
  required: boolean
  options?: string[]
  scale?: {
    min: number
    max: number
    labels?: Record<string, string>
  }
  condition?: {
    trigger: string
    operator: 'answered' | 'equals' | 'greater_than' | 'less_than'
    value?: any
  }
  validation?: {
    min_length?: number
    max_length?: number
    pattern?: string
  }
}

// Survey Configuration
export interface SurveyConfig {
  id: string
  title: string
  description?: string
  survey_type: SurveyType
  questions: SurveyQuestion[]
  logic_rules?: Record<string, any>
  target_audience?: Record<string, any>
  trigger_conditions?: Record<string, any>
  display_settings?: Record<string, any>
  completion_message?: string
  redirect_url?: string
}

// Health Score Components
export interface HealthScoreComponents {
  usage_score: number
  engagement_score: number
  satisfaction_score: number
  support_score: number
  billing_score: number
}

// Health Score Calculation Data
export interface HealthCalculationData {
  login_frequency: number
  feature_adoption_rate: number
  session_duration_avg: number
  support_tickets_count: number
  payment_issues_count: number
  nps_score?: number
  csat_average?: number
  days_since_last_login: number
  usage_vs_plan_ratio: number
}

// Churn Risk Assessment
export interface ChurnRiskAssessment {
  risk_score: number
  probability_percentage: number
  days_to_predicted_churn?: number
  risk_factors: string[]
  recommended_interventions: string[]
  confidence_level: number
}

// Feature Usage Analytics
export interface FeatureUsageAnalytics {
  feature_name: string
  total_users: number
  active_users: number
  adoption_rate: number
  retention_rate: number
  avg_usage_frequency: number
  avg_session_duration: number
  power_users_count: number
  churned_users_count: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

// Customer Success Metrics
export interface CustomerSuccessMetrics {
  total_users: number
  onboarding_completion_rate: number
  average_onboarding_time: number
  health_score_average: number
  churn_rate: number
  nps_score: number
  csat_score: number
  support_satisfaction: number
  feature_adoption_rate: number
  monthly_active_users: number
}

// Support Ticket Analytics
export interface SupportTicketAnalytics {
  total_tickets: number
  open_tickets: number
  resolved_tickets: number
  avg_resolution_time: number
  first_response_time: number
  satisfaction_rating: number
  tickets_by_category: Record<string, number>
  tickets_by_priority: Record<string, number>
  escalation_rate: number
}

// ================================================
// API REQUEST/RESPONSE TYPES
// ================================================

// Onboarding Requests
export interface StartOnboardingRequest {
  flow_name?: string
  user_id: string
  organization_id?: string
  metadata?: Record<string, any>
}

export interface UpdateOnboardingProgressRequest {
  user_id: string
  step: number
  step_data?: Record<string, any>
  completed?: boolean
  skipped?: boolean
}

export interface CompleteOnboardingRequest {
  user_id: string
  completion_data?: Record<string, any>
  feedback?: string
}

// Feature Tour Requests
export interface StartTourRequest {
  tour_name: string
  user_id: string
  tour_version?: string
}

export interface UpdateTourProgressRequest {
  tour_id: string
  step: number
  interaction_data?: Record<string, any>
  completed?: boolean
}

export interface CompleteTourRequest {
  tour_id: string
  feedback_score?: number
  feedback_comment?: string
}

// Feedback Requests
export interface SubmitFeedbackRequest {
  user_id: string
  organization_id?: string
  feedback_type: FeedbackType
  rating?: number
  nps_score?: number
  csat_score?: number
  content?: string
  context?: {
    page_url?: string
    feature_name?: string
    user_segment?: string
  }
  metadata?: Record<string, any>
}

// Support Ticket Requests
export interface CreateTicketRequest {
  user_id: string
  organization_id?: string
  title: string
  description: string
  priority?: TicketPriority
  category?: string
  tags?: string[]
  metadata?: Record<string, any>
}

export interface UpdateTicketRequest {
  status?: TicketStatus
  priority?: TicketPriority
  assigned_to_user_id?: string
  resolution_notes?: string
  tags?: string[]
}

export interface TicketResponseRequest {
  ticket_id: string
  user_id: string
  message: string
  internal_note?: boolean
  attachments?: string[]
}

// Health Score Requests
export interface CalculateHealthScoreRequest {
  user_id: string
  organization_id?: string
  calculation_method?: 'standard' | 'custom'
  custom_weights?: Partial<HealthScoreComponents>
}

export interface UpdateHealthScoreRequest {
  health_score: number
  health_status: HealthStatus
  score_components: HealthScoreComponents
  churn_risk_score: number
  intervention_required?: boolean
  intervention_type?: string
}

// Feature Adoption Requests
export interface TrackFeatureUsageRequest {
  user_id: string
  organization_id?: string
  feature_name: string
  feature_category?: string
  session_duration?: number
  depth_score?: number
  metadata?: Record<string, any>
}

export interface UpdateAdoptionStatusRequest {
  user_id: string
  feature_name: string
  adoption_status: AdoptionStatus
  usage_data?: Record<string, any>
}

// Message Requests
export interface SendMessageRequest {
  organization_id?: string
  title: string
  content: string
  message_type: MessageType
  target_user_ids?: string[]
  target_user_segments?: string[]
  display_settings?: Record<string, any>
  schedule_at?: string
  expires_at?: string
  cta_text?: string
  cta_url?: string
}

export interface MessageInteractionRequest {
  message_id: string
  user_id: string
  interaction_type: 'viewed' | 'clicked' | 'dismissed'
  metadata?: Record<string, any>
}

// Survey Response Request
export interface SubmitSurveyResponseRequest {
  survey_id: string
  user_id: string
  responses: Record<string, any>
  completion_time?: number
  metadata?: Record<string, any>
}

// ================================================
// API RESPONSE TYPES  
// ================================================

export interface OnboardingStatusResponse {
  user_onboarding: UserOnboarding
  flow_config: OnboardingFlowConfig
  next_step?: OnboardingStep
  completion_percentage: number
  estimated_time_remaining?: number
}

export interface TourStatusResponse {
  feature_tour: FeatureTour
  tour_config: TourConfig
  next_step?: TourStep
  progress_percentage: number
}

export interface HealthScoreResponse {
  customer_health: CustomerHealth
  score_breakdown: HealthScoreComponents
  risk_assessment: ChurnRiskAssessment
  recommendations: string[]
  historical_scores?: Array<{
    date: string
    score: number
    status: HealthStatus
  }>
}

export interface FeatureAdoptionResponse {
  feature_adoption: FeatureAdoption[]
  adoption_summary: {
    total_features: number
    adopted_features: number
    adoption_rate: number
    power_user_features: number
  }
  recommended_features: string[]
}

export interface SupportTicketsResponse {
  tickets: SupportTicket[]
  analytics: SupportTicketAnalytics
  pagination: {
    total: number
    page: number
    limit: number
    has_more: boolean
  }
}

export interface CustomerSuccessDashboardResponse {
  metrics: CustomerSuccessMetrics
  health_distribution: Record<HealthStatus, number>
  onboarding_funnel: Array<{
    step: number
    title: string
    completion_rate: number
    avg_time: number
  }>
  feature_adoption_overview: FeatureUsageAnalytics[]
  recent_feedback: UserFeedback[]
  support_overview: SupportTicketAnalytics
}

// ================================================
// COMPONENT PROPS TYPES
// ================================================

export interface OnboardingFlowProps {
  userId: string
  organizationId?: string
  flowName?: string
  onComplete?: (data: UserOnboarding) => void
  onStepChange?: (step: number, data: any) => void
  customization?: {
    theme?: 'light' | 'dark'
    primaryColor?: string
    showProgress?: boolean
    allowSkip?: boolean
  }
  className?: string
}

export interface FeatureTourProps {
  tourName: string
  userId: string
  autoStart?: boolean
  onComplete?: (feedback: any) => void
  onSkip?: () => void
  customization?: {
    theme?: 'light' | 'dark'
    highlightColor?: string
    showProgress?: boolean
  }
  className?: string
}

export interface FeedbackWidgetProps {
  feedbackType: FeedbackType
  userId: string
  onSubmit?: (feedback: UserFeedback) => void
  context?: {
    featureName?: string
    pageUrl?: string
  }
  customization?: {
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    theme?: 'light' | 'dark'
    primaryColor?: string
  }
  className?: string
}

export interface SupportCenterProps {
  userId: string
  organizationId?: string
  initialView?: 'tickets' | 'knowledge-base' | 'contact'
  onTicketCreate?: (ticket: SupportTicket) => void
  showChat?: boolean
  knowledgeBaseCategories?: string[]
  className?: string
}

export interface HealthDashboardProps {
  userId?: string
  organizationId?: string
  showBreakdown?: boolean
  showRecommendations?: boolean
  showHistoricalData?: boolean
  timeRange?: '7d' | '30d' | '90d' | '1y'
  onInterventionTrigger?: (intervention: string) => void
  className?: string
}

export interface AdoptionAnalyticsProps {
  userId?: string
  organizationId?: string
  showRecommendations?: boolean
  featureCategories?: string[]
  timeRange?: '7d' | '30d' | '90d' | '1y'
  onFeatureClick?: (featureName: string) => void
  className?: string
}

export interface InAppMessagingProps {
  userId: string
  organizationId?: string
  position?: 'top' | 'bottom' | 'center'
  maxMessages?: number
  onMessageInteraction?: (messageId: string, interaction: string) => void
  className?: string
}

export interface SurveyBuilderProps {
  surveyId?: string
  organizationId: string
  onSave?: (survey: ProductSurvey) => void
  onPreview?: (survey: SurveyConfig) => void
  initialData?: Partial<ProductSurvey>
  questionTypes?: string[]
  className?: string
}

export interface KnowledgeBaseProps {
  organizationId?: string
  categories?: string[]
  searchEnabled?: boolean
  showFeedback?: boolean
  onArticleView?: (articleId: string) => void
  onFeedback?: (articleId: string, helpful: boolean) => void
  className?: string
}

export interface ChurnPreventionProps {
  organizationId?: string
  riskThreshold?: number
  showInterventions?: boolean
  onInterventionSchedule?: (userId: string, intervention: string) => void
  timeRange?: '7d' | '30d' | '90d'
  className?: string
}

export interface SuccessMetricsProps {
  organizationId?: string
  metrics?: (keyof CustomerSuccessMetrics)[]
  timeRange?: '7d' | '30d' | '90d' | '1y'
  showComparisons?: boolean
  onMetricClick?: (metric: string) => void
  className?: string
}

// ================================================
// UTILITY TYPES
// ================================================

export interface PaginationParams {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface FilterParams {
  status?: string[]
  category?: string[]
  date_range?: {
    start: string
    end: string
  }
  search?: string
}

export interface CustomerSuccessError {
  code: string
  message: string
  details?: Record<string, any>
  suggestion?: string
}

export interface CustomerSuccessResponse<T = any> {
  success: boolean
  data?: T
  error?: CustomerSuccessError
  metadata?: {
    total?: number
    page?: number
    limit?: number
    processing_time?: number
  }
}

// ================================================
// CONSOLIDATED EXPORT TYPE
// ================================================

export interface CustomerSuccessTypes {
  // Database Types
  UserOnboarding: UserOnboarding
  FeatureTour: FeatureTour
  UserFeedback: UserFeedback
  SupportTicket: SupportTicket
  KnowledgeBase: KnowledgeBase
  CustomerHealth: CustomerHealth
  FeatureAdoption: FeatureAdoption
  InAppMessage: InAppMessage
  ProductSurvey: ProductSurvey
  UserSession: UserSession
  
  // Business Logic Types
  OnboardingFlowConfig: OnboardingFlowConfig
  TourConfig: TourConfig
  SurveyConfig: SurveyConfig
  HealthScoreComponents: HealthScoreComponents
  ChurnRiskAssessment: ChurnRiskAssessment
  FeatureUsageAnalytics: FeatureUsageAnalytics
  CustomerSuccessMetrics: CustomerSuccessMetrics
  
  // Request/Response Types
  OnboardingStatusResponse: OnboardingStatusResponse
  HealthScoreResponse: HealthScoreResponse
  CustomerSuccessDashboardResponse: CustomerSuccessDashboardResponse
}