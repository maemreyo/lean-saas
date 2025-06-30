// Marketing & Growth Module TypeScript Types
// Following patterns from billing module types

import { Database } from './database'

// ================================================
// DATABASE TYPES (Generated from Supabase)
// ================================================

export type LandingPage = Database['public']['Tables']['landing_pages']['Row']
export type LandingPageInsert = Database['public']['Tables']['landing_pages']['Insert']
export type LandingPageUpdate = Database['public']['Tables']['landing_pages']['Update']

export type ABTest = Database['public']['Tables']['ab_tests']['Row']
export type ABTestInsert = Database['public']['Tables']['ab_tests']['Insert']
export type ABTestUpdate = Database['public']['Tables']['ab_tests']['Update']

export type ABTestSession = Database['public']['Tables']['ab_test_sessions']['Row']
export type ABTestSessionInsert = Database['public']['Tables']['ab_test_sessions']['Insert']
export type ABTestSessionUpdate = Database['public']['Tables']['ab_test_sessions']['Update']

export type LeadCapture = Database['public']['Tables']['lead_captures']['Row']
export type LeadCaptureInsert = Database['public']['Tables']['lead_captures']['Insert']
export type LeadCaptureUpdate = Database['public']['Tables']['lead_captures']['Update']

export type EmailCampaign = Database['public']['Tables']['email_campaigns']['Row']
export type EmailCampaignInsert = Database['public']['Tables']['email_campaigns']['Insert']
export type EmailCampaignUpdate = Database['public']['Tables']['email_campaigns']['Update']

export type EmailCampaignRecipient = Database['public']['Tables']['email_campaign_recipients']['Row']
export type EmailCampaignRecipientInsert = Database['public']['Tables']['email_campaign_recipients']['Insert']
export type EmailCampaignRecipientUpdate = Database['public']['Tables']['email_campaign_recipients']['Update']

export type ReferralCode = Database['public']['Tables']['referral_codes']['Row']
export type ReferralCodeInsert = Database['public']['Tables']['referral_codes']['Insert']
export type ReferralCodeUpdate = Database['public']['Tables']['referral_codes']['Update']

export type ReferralConversion = Database['public']['Tables']['referral_conversions']['Row']
export type ReferralConversionInsert = Database['public']['Tables']['referral_conversions']['Insert']
export type ReferralConversionUpdate = Database['public']['Tables']['referral_conversions']['Update']

export type SocialShare = Database['public']['Tables']['social_shares']['Row']
export type SocialShareInsert = Database['public']['Tables']['social_shares']['Insert']
export type SocialShareUpdate = Database['public']['Tables']['social_shares']['Update']

export type SEOMetadata = Database['public']['Tables']['seo_metadata']['Row']
export type SEOMetadataInsert = Database['public']['Tables']['seo_metadata']['Insert']
export type SEOMetadataUpdate = Database['public']['Tables']['seo_metadata']['Update']

export type GrowthMetric = Database['public']['Tables']['growth_metrics']['Row']
export type GrowthMetricInsert = Database['public']['Tables']['growth_metrics']['Insert']
export type GrowthMetricUpdate = Database['public']['Tables']['growth_metrics']['Update']

export type GrowthExperiment = Database['public']['Tables']['growth_experiments']['Row']
export type GrowthExperimentInsert = Database['public']['Tables']['growth_experiments']['Insert']
export type GrowthExperimentUpdate = Database['public']['Tables']['growth_experiments']['Update']

// ================================================
// ENUM TYPES
// ================================================

export type LandingPageStatus = 'draft' | 'published' | 'archived'

export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed'

export type ABTestVariant = {
  id: string
  name: string
  config: Record<string, any>
  traffic_percentage?: number
}

export type EmailCampaignType = 'newsletter' | 'welcome' | 'drip' | 'promotional' | 'transactional'

export type EmailCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused'

export type EmailRecipientStatus = 'pending' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed'

export type ReferralRewardType = 'discount' | 'credit' | 'commission' | 'custom'

export type ReferralConversionType = 'signup' | 'trial' | 'subscription' | 'purchase'

export type SocialPlatform = 'twitter' | 'facebook' | 'linkedin' | 'instagram' | 'tiktok' | 'youtube' | 'reddit'

export type ContentType = 'landing_page' | 'blog_post' | 'product' | 'feature' | 'campaign'

export type PageType = 'landing_page' | 'blog_post' | 'product' | 'pricing' | 'about' | 'contact'

export type GrowthMetricType = 
  | 'page_view' 
  | 'unique_visitor' 
  | 'signup' 
  | 'activation' 
  | 'conversion' 
  | 'referral' 
  | 'share' 
  | 'email_open' 
  | 'email_click'
  | 'trial_start'
  | 'subscription'
  | 'churn'
  | 'revenue'

export type GrowthExperimentType = 'landing_page' | 'email' | 'onboarding' | 'pricing' | 'feature' | 'growth_hack'

export type GrowthExperimentStatus = 'planning' | 'running' | 'analyzing' | 'implemented' | 'rejected'

export type UTMParameters = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

// ================================================
// CONFIGURATION TYPES
// ================================================

// Landing page configuration types
export interface LandingPageConfig {
  hero?: {
    headline: string
    subheadline?: string
    cta_text: string
    cta_url?: string
    background_image?: string
    background_video?: string
    countdown_date?: string
    video_url?: string
  }
  features?: Array<{
    title: string
    description: string
    icon?: string
    image?: string
  }>
  pricing?: {
    plans: Array<{
      name: string
      price: number
      currency?: string
      interval?: string
      features: string[]
      highlighted?: boolean
      cta_text?: string
    }>
  }
  testimonials?: Array<{
    name: string
    company?: string
    role?: string
    text: string
    avatar?: string
    rating?: number
  }>
  faq?: Array<{
    question: string
    answer: string
  }>
  social_proof?: {
    customer_count?: number
    company_logos?: string[]
    reviews_count?: number
    average_rating?: number
  }
  form_fields?: string[]
  integrations?: string[]
  benefits?: string[]
  early_bird_offer?: {
    discount: number
    valid_until: string
    description: string
  }
}

// SEO metadata configuration
export interface SEOConfig {
  title?: string
  description?: string
  keywords?: string[]
  canonical_url?: string
  og_title?: string
  og_description?: string
  og_image?: string
  og_type?: string
  twitter_card?: string
  twitter_title?: string
  twitter_description?: string
  twitter_image?: string
  structured_data?: Record<string, any>
  meta_robots?: string
}

// Email campaign settings
export interface EmailCampaignSettings {
  from_name?: string
  from_email?: string
  reply_to?: string
  track_opens?: boolean
  track_clicks?: boolean
  schedule_timezone?: string
  send_at_optimal_time?: boolean
  resend_to_unopened?: boolean
  segmentation?: {
    criteria: Record<string, any>
    include_tags?: string[]
    exclude_tags?: string[]
  }
}

// A/B test configuration
export interface ABTestConfig {
  variants: ABTestVariant[]
  traffic_split: Record<string, number>
  target_metric: string
  minimum_sample_size?: number
  confidence_level?: number
  duration_days?: number
  success_criteria?: string
}

// Referral program configuration
export interface ReferralProgramConfig {
  reward_type: ReferralRewardType
  reward_value: number
  reward_description: string
  referrer_reward?: {
    type: ReferralRewardType
    value: number
    description: string
  }
  referee_reward?: {
    type: ReferralRewardType
    value: number
    description: string
  }
  max_rewards_per_referrer?: number
  reward_tiers?: Array<{
    referrals_count: number
    bonus_reward: number
  }>
}

// ================================================
// API REQUEST/RESPONSE TYPES
// ================================================

// Landing page requests
export interface CreateLandingPageRequest {
  slug: string
  title: string
  description?: string
  config: LandingPageConfig
  seo_meta?: SEOConfig
  organization_id: string
}

export interface UpdateLandingPageRequest {
  title?: string
  description?: string
  config?: Partial<LandingPageConfig>
  seo_meta?: Partial<SEOConfig>
  published?: boolean
}

export interface PublishLandingPageRequest {
  published: boolean
  published_at?: string
}

// A/B test requests
export interface CreateABTestRequest {
  name: string
  description?: string
  hypothesis?: string
  target_metric: string
  variants: ABTestVariant[]
  traffic_split: Record<string, number>
  confidence_level?: number
  organization_id: string
}

export interface UpdateABTestRequest {
  name?: string
  description?: string
  status?: ABTestStatus
  results?: Record<string, any>
  winner_variant?: string
  statistical_significance?: number
}

// Lead capture requests
export interface CreateLeadCaptureRequest {
  email: string
  name?: string
  source?: string
  landing_page_id?: string
  utm_parameters?: UTMParameters
  metadata?: Record<string, any>
  organization_id: string
}

// Email campaign requests
export interface CreateEmailCampaignRequest {
  name: string
  subject: string
  content: string
  campaign_type: EmailCampaignType
  scheduled_at?: string
  settings?: EmailCampaignSettings
  organization_id: string
}

export interface SendEmailCampaignRequest {
  campaign_id: string
  recipient_emails?: string[]
  send_immediately?: boolean
}

// Referral requests
export interface CreateReferralCodeRequest {
  description?: string
  reward_type: ReferralRewardType
  reward_value: number
  reward_description: string
  max_uses?: number
  expires_at?: string
  organization_id: string
}

export interface TrackReferralRequest {
  referral_code: string
  referred_email?: string
  conversion_type: ReferralConversionType
  conversion_value?: number
  metadata?: Record<string, any>
}

// SEO requests
export interface UpdateSEOMetadataRequest {
  page_type: PageType
  page_id: string
  seo_config: SEOConfig
  organization_id: string
}

// Growth tracking requests
export interface TrackGrowthMetricRequest {
  metric_type: GrowthMetricType
  metric_value: number
  dimensions?: Record<string, any>
  organization_id: string
}

export interface CreateGrowthExperimentRequest {
  name: string
  description?: string
  hypothesis?: string
  experiment_type: GrowthExperimentType
  success_criteria?: string
  baseline_metrics?: Record<string, any>
  organization_id: string
}

// Social sharing requests
export interface TrackSocialShareRequest {
  content_type: ContentType
  content_id: string
  platform: SocialPlatform
  share_url: string
  organization_id: string
}

// ================================================
// ANALYTICS & REPORTING TYPES
// ================================================

export interface MarketingOverview {
  organization_id: string
  total_landing_pages: number
  total_leads: number
  total_referral_codes: number
  published_pages: number
  leads_last_30_days: number
  total_page_views: number
  total_conversions: number
  overall_conversion_rate: number
}

export interface GrowthAnalytics {
  organization_id: string
  period: 'day' | 'week' | 'month' | 'quarter' | 'year'
  metrics: {
    page_views: number
    unique_visitors: number
    signups: number
    conversions: number
    conversion_rate: number
    referrals: number
    social_shares: number
    email_subscribers: number
  }
  trends: {
    page_views_change: number
    signups_change: number
    conversion_rate_change: number
  }
}

export interface ConversionFunnel {
  organization_id: string
  steps: Array<{
    name: string
    count: number
    conversion_rate: number
    drop_off_rate: number
  }>
  overall_conversion_rate: number
}

export interface ABTestResults {
  test_id: string
  status: ABTestStatus
  statistical_significance: number
  confidence_level: number
  variants: Array<{
    id: string
    name: string
    sessions: number
    conversions: number
    conversion_rate: number
    confidence_interval: [number, number]
  }>
  winner: {
    variant_id: string
    improvement: number
    p_value: number
  } | null
  recommendations: string[]
}

export interface EmailCampaignAnalytics {
  campaign_id: string
  sent_count: number
  delivered_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  unsubscribed_count: number
  delivery_rate: number
  open_rate: number
  click_rate: number
  click_to_open_rate: number
  bounce_rate: number
  unsubscribe_rate: number
}

export interface ReferralAnalytics {
  organization_id: string
  total_referrals: number
  successful_conversions: number
  conversion_rate: number
  total_commission_owed: number
  total_commission_paid: number
  top_referrers: Array<{
    user_id: string
    referral_count: number
    conversion_count: number
    commission_earned: number
  }>
}

// ================================================
// UTILITY TYPES
// ================================================

export interface MarketingDashboardData {
  overview: MarketingOverview
  growth_analytics: GrowthAnalytics
  conversion_funnel: ConversionFunnel
  recent_leads: LeadCapture[]
  active_campaigns: EmailCampaign[]
  active_ab_tests: ABTest[]
  top_landing_pages: Array<LandingPage & { conversion_rate: number }>
}

export interface CreateMarketingCampaignRequest {
  name: string
  type: 'landing_page' | 'email' | 'social' | 'referral'
  config: Record<string, any>
  start_date?: string
  end_date?: string
  organization_id: string
}

// Export commonly used union types
export type MarketingEventType = 
  | 'page_view'
  | 'form_submit'
  | 'email_signup'
  | 'referral_click'
  | 'social_share'
  | 'campaign_interaction'

export type MarketingChannelType = 
  | 'organic'
  | 'paid_search'
  | 'social_media'
  | 'email'
  | 'referral'
  | 'direct'
  | 'content'

export type CampaignObjective = 
  | 'awareness'
  | 'lead_generation'
  | 'conversion'
  | 'retention'
  | 'referral'
  | 'engagement'