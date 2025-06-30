// Marketing & Growth Module Zod Validation Schemas
// Following patterns from billing module schemas

import { z } from 'zod'

// ================================================
// BASE VALIDATORS
// ================================================

const uuidSchema = z.string().uuid('Invalid UUID format')
const emailSchema = z.string().email('Invalid email format')
const urlSchema = z.string().url('Invalid URL format').optional()
const slugSchema = z.string()
  .min(1, 'Slug is required')
  .max(100, 'Slug must be less than 100 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')

// ================================================
// ENUM SCHEMAS
// ================================================

export const landingPageStatusSchema = z.enum(['draft', 'published', 'archived'], {
  errorMap: () => ({ message: 'Status must be draft, published, or archived' })
})

export const abTestStatusSchema = z.enum(['draft', 'running', 'paused', 'completed'], {
  errorMap: () => ({ message: 'Status must be draft, running, paused, or completed' })
})

export const emailCampaignTypeSchema = z.enum(['newsletter', 'welcome', 'drip', 'promotional', 'transactional'], {
  errorMap: () => ({ message: 'Campaign type must be newsletter, welcome, drip, promotional, or transactional' })
})

export const emailCampaignStatusSchema = z.enum(['draft', 'scheduled', 'sending', 'sent', 'paused'], {
  errorMap: () => ({ message: 'Status must be draft, scheduled, sending, sent, or paused' })
})

export const emailRecipientStatusSchema = z.enum(['pending', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed'], {
  errorMap: () => ({ message: 'Status must be pending, delivered, opened, clicked, bounced, or unsubscribed' })
})

export const referralRewardTypeSchema = z.enum(['discount', 'credit', 'commission', 'custom'], {
  errorMap: () => ({ message: 'Reward type must be discount, credit, commission, or custom' })
})

export const referralConversionTypeSchema = z.enum(['signup', 'trial', 'subscription', 'purchase'], {
  errorMap: () => ({ message: 'Conversion type must be signup, trial, subscription, or purchase' })
})

export const socialPlatformSchema = z.enum(['twitter', 'facebook', 'linkedin', 'instagram', 'tiktok', 'youtube', 'reddit'], {
  errorMap: () => ({ message: 'Platform must be twitter, facebook, linkedin, instagram, tiktok, youtube, or reddit' })
})

export const contentTypeSchema = z.enum(['landing_page', 'blog_post', 'product', 'feature', 'campaign'], {
  errorMap: () => ({ message: 'Content type must be landing_page, blog_post, product, feature, or campaign' })
})

export const pageTypeSchema = z.enum(['landing_page', 'blog_post', 'product', 'pricing', 'about', 'contact'], {
  errorMap: () => ({ message: 'Page type must be landing_page, blog_post, product, pricing, about, or contact' })
})

export const growthMetricTypeSchema = z.enum([
  'page_view', 'unique_visitor', 'signup', 'activation', 'conversion', 'referral', 
  'share', 'email_open', 'email_click', 'trial_start', 'subscription', 'churn', 'revenue'
], {
  errorMap: () => ({ message: 'Invalid growth metric type' })
})

export const growthExperimentTypeSchema = z.enum(['landing_page', 'email', 'onboarding', 'pricing', 'feature', 'growth_hack'], {
  errorMap: () => ({ message: 'Experiment type must be landing_page, email, onboarding, pricing, feature, or growth_hack' })
})

export const growthExperimentStatusSchema = z.enum(['planning', 'running', 'analyzing', 'implemented', 'rejected'], {
  errorMap: () => ({ message: 'Status must be planning, running, analyzing, implemented, or rejected' })
})

// ================================================
// CONFIGURATION SCHEMAS
// ================================================

// Hero section schema
export const heroConfigSchema = z.object({
  headline: z.string().min(1, 'Headline is required').max(200, 'Headline must be less than 200 characters'),
  subheadline: z.string().max(500, 'Subheadline must be less than 500 characters').optional(),
  cta_text: z.string().min(1, 'CTA text is required').max(50, 'CTA text must be less than 50 characters'),
  cta_url: urlSchema,
  background_image: urlSchema,
  background_video: urlSchema,
  countdown_date: z.string().datetime('Invalid countdown date').optional(),
  video_url: urlSchema
}).strict()

// Feature schema
export const featureSchema = z.object({
  title: z.string().min(1, 'Feature title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(1, 'Feature description is required').max(500, 'Description must be less than 500 characters'),
  icon: z.string().optional(),
  image: urlSchema
}).strict()

// Pricing plan schema
export const pricingPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(50, 'Plan name must be less than 50 characters'),
  price: z.number().min(0, 'Price must be non-negative'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  interval: z.enum(['month', 'year']).default('month'),
  features: z.array(z.string().min(1, 'Feature cannot be empty')).min(1, 'At least one feature is required'),
  highlighted: z.boolean().default(false),
  cta_text: z.string().max(50, 'CTA text must be less than 50 characters').optional()
}).strict()

// Testimonial schema
export const testimonialSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  company: z.string().max(100, 'Company name must be less than 100 characters').optional(),
  role: z.string().max(100, 'Role must be less than 100 characters').optional(),
  text: z.string().min(1, 'Testimonial text is required').max(1000, 'Text must be less than 1000 characters'),
  avatar: urlSchema,
  rating: z.number().min(1).max(5).optional()
}).strict()

// FAQ schema
export const faqSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500, 'Question must be less than 500 characters'),
  answer: z.string().min(1, 'Answer is required').max(2000, 'Answer must be less than 2000 characters')
}).strict()

// Social proof schema
export const socialProofSchema = z.object({
  customer_count: z.number().min(0, 'Customer count must be non-negative').optional(),
  company_logos: z.array(urlSchema).optional(),
  reviews_count: z.number().min(0, 'Reviews count must be non-negative').optional(),
  average_rating: z.number().min(1).max(5).optional()
}).strict()

// Early bird offer schema
export const earlyBirdOfferSchema = z.object({
  discount: z.number().min(1).max(100, 'Discount must be between 1-100%'),
  valid_until: z.string().datetime('Invalid offer expiry date'),
  description: z.string().min(1, 'Offer description is required').max(200, 'Description must be less than 200 characters')
}).strict()

// Landing page configuration schema
export const landingPageConfigSchema = z.object({
  hero: heroConfigSchema.optional(),
  features: z.array(featureSchema).optional(),
  pricing: z.object({
    plans: z.array(pricingPlanSchema).min(1, 'At least one pricing plan is required')
  }).optional(),
  testimonials: z.array(testimonialSchema).optional(),
  faq: z.array(faqSchema).optional(),
  social_proof: socialProofSchema.optional(),
  form_fields: z.array(z.string()).optional(),
  integrations: z.array(z.string()).optional(),
  benefits: z.array(z.string().min(1, 'Benefit cannot be empty')).optional(),
  early_bird_offer: earlyBirdOfferSchema.optional()
}).strict()

// SEO configuration schema
export const seoConfigSchema = z.object({
  title: z.string().max(60, 'Title should be less than 60 characters for SEO').optional(),
  description: z.string().max(160, 'Description should be less than 160 characters for SEO').optional(),
  keywords: z.array(z.string().min(1, 'Keyword cannot be empty')).optional(),
  canonical_url: urlSchema,
  og_title: z.string().max(60, 'OG title should be less than 60 characters').optional(),
  og_description: z.string().max(160, 'OG description should be less than 160 characters').optional(),
  og_image: urlSchema,
  og_type: z.string().default('website'),
  twitter_card: z.string().default('summary_large_image'),
  twitter_title: z.string().max(70, 'Twitter title should be less than 70 characters').optional(),
  twitter_description: z.string().max(200, 'Twitter description should be less than 200 characters').optional(),
  twitter_image: urlSchema,
  structured_data: z.record(z.any()).optional(),
  meta_robots: z.string().default('index,follow')
}).strict()

// UTM parameters schema
export const utmParametersSchema = z.object({
  utm_source: z.string().max(100, 'UTM source must be less than 100 characters').optional(),
  utm_medium: z.string().max(100, 'UTM medium must be less than 100 characters').optional(),
  utm_campaign: z.string().max(100, 'UTM campaign must be less than 100 characters').optional(),
  utm_content: z.string().max(100, 'UTM content must be less than 100 characters').optional(),
  utm_term: z.string().max(100, 'UTM term must be less than 100 characters').optional()
}).strict()

// A/B test variant schema
export const abTestVariantSchema = z.object({
  id: z.string().min(1, 'Variant ID is required'),
  name: z.string().min(1, 'Variant name is required').max(100, 'Name must be less than 100 characters'),
  config: z.record(z.any()),
  traffic_percentage: z.number().min(0).max(100).optional()
}).strict()

// Email campaign settings schema
export const emailCampaignSettingsSchema = z.object({
  from_name: z.string().max(100, 'From name must be less than 100 characters').optional(),
  from_email: emailSchema.optional(),
  reply_to: emailSchema.optional(),
  track_opens: z.boolean().default(true),
  track_clicks: z.boolean().default(true),
  schedule_timezone: z.string().optional(),
  send_at_optimal_time: z.boolean().default(false),
  resend_to_unopened: z.boolean().default(false),
  segmentation: z.object({
    criteria: z.record(z.any()),
    include_tags: z.array(z.string()).optional(),
    exclude_tags: z.array(z.string()).optional()
  }).optional()
}).strict()

// ================================================
// ENTITY CREATION SCHEMAS
// ================================================

// Landing page schemas
export const createLandingPageSchema = z.object({
  organization_id: uuidSchema,
  slug: slugSchema,
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  config: landingPageConfigSchema,
  seo_meta: seoConfigSchema.optional()
}).strict()

export const updateLandingPageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters').optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  config: landingPageConfigSchema.partial().optional(),
  seo_meta: seoConfigSchema.partial().optional(),
  published: z.boolean().optional()
}).strict()

export const publishLandingPageSchema = z.object({
  published: z.boolean(),
  published_at: z.string().datetime('Invalid publish date').optional()
}).strict()

// A/B test schemas
export const createABTestSchema = z.object({
  organization_id: uuidSchema,
  name: z.string().min(1, 'Test name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  hypothesis: z.string().max(2000, 'Hypothesis must be less than 2000 characters').optional(),
  target_metric: z.string().min(1, 'Target metric is required').max(100, 'Metric name must be less than 100 characters'),
  variants: z.array(abTestVariantSchema).min(2, 'At least 2 variants are required').max(10, 'Maximum 10 variants allowed'),
  traffic_split: z.record(z.number().min(0).max(100)).refine(
    (split) => {
      const total = Object.values(split).reduce((sum, val) => sum + val, 0)
      return Math.abs(total - 100) < 0.01 // Allow for floating point precision
    },
    { message: 'Traffic split must sum to 100%' }
  ),
  confidence_level: z.number().min(0.8).max(0.99).default(0.95)
}).strict()

export const updateABTestSchema = z.object({
  name: z.string().min(1, 'Test name is required').max(255, 'Name must be less than 255 characters').optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  status: abTestStatusSchema.optional(),
  results: z.record(z.any()).optional(),
  winner_variant: z.string().optional(),
  statistical_significance: z.number().min(0).max(1).optional()
}).strict()

// A/B test session tracking schema
export const createABTestSessionSchema = z.object({
  ab_test_id: uuidSchema,
  session_id: z.string().min(1, 'Session ID is required').max(255, 'Session ID must be less than 255 characters'),
  user_id: uuidSchema.optional(),
  variant_id: z.string().min(1, 'Variant ID is required'),
  converted: z.boolean().default(false),
  conversion_event: z.string().max(100, 'Conversion event must be less than 100 characters').optional(),
  conversion_value: z.number().min(0, 'Conversion value must be non-negative').optional()
}).strict()

// Lead capture schemas
export const createLeadCaptureSchema = z.object({
  organization_id: uuidSchema,
  email: emailSchema,
  name: z.string().max(255, 'Name must be less than 255 characters').optional(),
  source: z.string().max(100, 'Source must be less than 100 characters').optional(),
  landing_page_id: uuidSchema.optional(),
  utm_source: z.string().max(100, 'UTM source must be less than 100 characters').optional(),
  utm_medium: z.string().max(100, 'UTM medium must be less than 100 characters').optional(),
  utm_campaign: z.string().max(100, 'UTM campaign must be less than 100 characters').optional(),
  utm_content: z.string().max(100, 'UTM content must be less than 100 characters').optional(),
  utm_term: z.string().max(100, 'UTM term must be less than 100 characters').optional(),
  metadata: z.record(z.any()).optional()
}).strict()

export const updateLeadCaptureSchema = z.object({
  subscribed: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
}).strict()

// Email campaign schemas
export const createEmailCampaignSchema = z.object({
  organization_id: uuidSchema,
  name: z.string().min(1, 'Campaign name is required').max(255, 'Name must be less than 255 characters'),
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject must be less than 255 characters'),
  content: z.string().min(1, 'Content is required'),
  campaign_type: emailCampaignTypeSchema,
  scheduled_at: z.string().datetime('Invalid schedule date').optional(),
  settings: emailCampaignSettingsSchema.optional()
}).strict()

export const updateEmailCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(255, 'Name must be less than 255 characters').optional(),
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject must be less than 255 characters').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  status: emailCampaignStatusSchema.optional(),
  scheduled_at: z.string().datetime('Invalid schedule date').optional(),
  settings: emailCampaignSettingsSchema.optional()
}).strict()

export const sendEmailCampaignSchema = z.object({
  campaign_id: uuidSchema,
  recipient_emails: z.array(emailSchema).optional(),
  send_immediately: z.boolean().default(false)
}).strict()

// Referral schemas
export const createReferralCodeSchema = z.object({
  organization_id: uuidSchema,
  user_id: uuidSchema,
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  reward_type: referralRewardTypeSchema,
  reward_value: z.number().min(0, 'Reward value must be non-negative'),
  reward_description: z.string().min(1, 'Reward description is required').max(500, 'Description must be less than 500 characters'),
  max_uses: z.number().int().min(1, 'Max uses must be at least 1').optional(),
  expires_at: z.string().datetime('Invalid expiry date').optional()
}).strict()

export const updateReferralCodeSchema = z.object({
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  reward_value: z.number().min(0, 'Reward value must be non-negative').optional(),
  reward_description: z.string().min(1, 'Reward description is required').max(500, 'Description must be less than 500 characters').optional(),
  max_uses: z.number().int().min(1, 'Max uses must be at least 1').optional(),
  expires_at: z.string().datetime('Invalid expiry date').optional(),
  active: z.boolean().optional()
}).strict()

export const trackReferralSchema = z.object({
  referral_code: z.string().min(1, 'Referral code is required'),
  referred_email: emailSchema.optional(),
  conversion_type: referralConversionTypeSchema,
  conversion_value: z.number().min(0, 'Conversion value must be non-negative').optional(),
  metadata: z.record(z.any()).optional()
}).strict()

// SEO schemas
export const updateSEOMetadataSchema = z.object({
  organization_id: uuidSchema,
  page_type: pageTypeSchema,
  page_id: z.string().min(1, 'Page ID is required').max(255, 'Page ID must be less than 255 characters'),
  title: z.string().max(60, 'Title should be less than 60 characters for SEO').optional(),
  description: z.string().max(160, 'Description should be less than 160 characters for SEO').optional(),
  keywords: z.array(z.string().min(1, 'Keyword cannot be empty')).optional(),
  canonical_url: urlSchema,
  og_title: z.string().max(60, 'OG title should be less than 60 characters').optional(),
  og_description: z.string().max(160, 'OG description should be less than 160 characters').optional(),
  og_image: urlSchema,
  twitter_title: z.string().max(70, 'Twitter title should be less than 70 characters').optional(),
  twitter_description: z.string().max(200, 'Twitter description should be less than 200 characters').optional(),
  twitter_image: urlSchema,
  structured_data: z.record(z.any()).optional()
}).strict()

// Growth tracking schemas
export const trackGrowthMetricSchema = z.object({
  organization_id: uuidSchema,
  metric_type: growthMetricTypeSchema,
  metric_value: z.number(),
  dimensions: z.record(z.any()).optional(),
  date_recorded: z.string().date('Invalid date format').optional()
}).strict()

export const createGrowthExperimentSchema = z.object({
  organization_id: uuidSchema,
  name: z.string().min(1, 'Experiment name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  hypothesis: z.string().max(2000, 'Hypothesis must be less than 2000 characters').optional(),
  experiment_type: growthExperimentTypeSchema,
  success_criteria: z.string().max(1000, 'Success criteria must be less than 1000 characters').optional(),
  baseline_metrics: z.record(z.any()).optional()
}).strict()

export const updateGrowthExperimentSchema = z.object({
  name: z.string().min(1, 'Experiment name is required').max(255, 'Name must be less than 255 characters').optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  status: growthExperimentStatusSchema.optional(),
  experiment_metrics: z.record(z.any()).optional(),
  results: z.record(z.any()).optional(),
  learnings: z.string().max(2000, 'Learnings must be less than 2000 characters').optional()
}).strict()

// Social sharing schemas
export const trackSocialShareSchema = z.object({
  organization_id: uuidSchema,
  user_id: uuidSchema.optional(),
  content_type: contentTypeSchema,
  content_id: z.string().min(1, 'Content ID is required').max(255, 'Content ID must be less than 255 characters'),
  platform: socialPlatformSchema,
  share_url: z.string().url('Invalid share URL'),
  metadata: z.record(z.any()).optional()
}).strict()

// ================================================
// QUERY SCHEMAS
// ================================================

export const marketingAnalyticsQuerySchema = z.object({
  organization_id: uuidSchema,
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
  start_date: z.string().date('Invalid start date').optional(),
  end_date: z.string().date('Invalid end date').optional(),
  metrics: z.array(growthMetricTypeSchema).optional()
}).strict()

export const landingPageAnalyticsQuerySchema = z.object({
  organization_id: uuidSchema,
  landing_page_id: uuidSchema.optional(),
  period: z.enum(['day', 'week', 'month']).default('month'),
  include_ab_tests: z.boolean().default(false)
}).strict()

export const emailCampaignAnalyticsQuerySchema = z.object({
  organization_id: uuidSchema,
  campaign_id: uuidSchema.optional(),
  campaign_type: emailCampaignTypeSchema.optional(),
  start_date: z.string().date('Invalid start date').optional(),
  end_date: z.string().date('Invalid end date').optional()
}).strict()

export const referralAnalyticsQuerySchema = z.object({
  organization_id: uuidSchema,
  user_id: uuidSchema.optional(),
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
  start_date: z.string().date('Invalid start date').optional(),
  end_date: z.string().date('Invalid end date').optional()
}).strict()

export const leadCaptureQuerySchema = z.object({
  organization_id: uuidSchema,
  source: z.string().optional(),
  landing_page_id: uuidSchema.optional(),
  subscribed: z.boolean().optional(),
  start_date: z.string().date('Invalid start date').optional(),
  end_date: z.string().date('Invalid end date').optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0)
}).strict()

// ================================================
// BULK OPERATIONS SCHEMAS
// ================================================

export const bulkLeadCaptureSchema = z.object({
  leads: z.array(createLeadCaptureSchema).min(1, 'At least one lead is required').max(1000, 'Maximum 1000 leads per batch')
}).strict()

export const bulkGrowthMetricsSchema = z.object({
  metrics: z.array(trackGrowthMetricSchema).min(1, 'At least one metric is required').max(1000, 'Maximum 1000 metrics per batch')
}).strict()

// ================================================
// FORM VALIDATION HELPERS
// ================================================

export const validateLandingPage = (data: unknown) => createLandingPageSchema.safeParse(data)
export const validateABTest = (data: unknown) => createABTestSchema.safeParse(data)
export const validateLeadCapture = (data: unknown) => createLeadCaptureSchema.safeParse(data)
export const validateEmailCampaign = (data: unknown) => createEmailCampaignSchema.safeParse(data)
export const validateReferralCode = (data: unknown) => createReferralCodeSchema.safeParse(data)
export const validateSEOMetadata = (data: unknown) => updateSEOMetadataSchema.safeParse(data)
export const validateGrowthMetric = (data: unknown) => trackGrowthMetricSchema.safeParse(data)
export const validateGrowthExperiment = (data: unknown) => createGrowthExperimentSchema.safeParse(data)
export const validateSocialShare = (data: unknown) => trackSocialShareSchema.safeParse(data)

// ================================================
// TYPE INFERENCE HELPERS
// ================================================

export type CreateLandingPageRequest = z.infer<typeof createLandingPageSchema>
export type UpdateLandingPageRequest = z.infer<typeof updateLandingPageSchema>
export type CreateABTestRequest = z.infer<typeof createABTestSchema>
export type UpdateABTestRequest = z.infer<typeof updateABTestSchema>
export type CreateLeadCaptureRequest = z.infer<typeof createLeadCaptureSchema>
export type CreateEmailCampaignRequest = z.infer<typeof createEmailCampaignSchema>
export type CreateReferralCodeRequest = z.infer<typeof createReferralCodeSchema>
export type TrackReferralRequest = z.infer<typeof trackReferralSchema>
export type UpdateSEOMetadataRequest = z.infer<typeof updateSEOMetadataSchema>
export type TrackGrowthMetricRequest = z.infer<typeof trackGrowthMetricSchema>
export type CreateGrowthExperimentRequest = z.infer<typeof createGrowthExperimentSchema>
export type TrackSocialShareRequest = z.infer<typeof trackSocialShareSchema>
export type LandingPageConfig = z.infer<typeof landingPageConfigSchema>
export type SEOConfig = z.infer<typeof seoConfigSchema>
export type EmailCampaignSettings = z.infer<typeof emailCampaignSettingsSchema>
export type UTMParameters = z.infer<typeof utmParametersSchema>
export type ABTestVariant = z.infer<typeof abTestVariantSchema>

// ================================================
// EXPORT ALL SCHEMAS
// ================================================

export const marketingSchemas = {
  // Status enums
  landingPageStatus: landingPageStatusSchema,
  abTestStatus: abTestStatusSchema,
  emailCampaignType: emailCampaignTypeSchema,
  emailCampaignStatus: emailCampaignStatusSchema,
  emailRecipientStatus: emailRecipientStatusSchema,
  referralRewardType: referralRewardTypeSchema,
  referralConversionType: referralConversionTypeSchema,
  socialPlatform: socialPlatformSchema,
  contentType: contentTypeSchema,
  pageType: pageTypeSchema,
  growthMetricType: growthMetricTypeSchema,
  growthExperimentType: growthExperimentTypeSchema,
  growthExperimentStatus: growthExperimentStatusSchema,

  // Configuration schemas
  landingPageConfig: landingPageConfigSchema,
  seoConfig: seoConfigSchema,
  emailCampaignSettings: emailCampaignSettingsSchema,
  utmParameters: utmParametersSchema,
  abTestVariant: abTestVariantSchema,

  // Entity schemas
  createLandingPage: createLandingPageSchema,
  updateLandingPage: updateLandingPageSchema,
  publishLandingPage: publishLandingPageSchema,
  createABTest: createABTestSchema,
  updateABTest: updateABTestSchema,
  createABTestSession: createABTestSessionSchema,
  createLeadCapture: createLeadCaptureSchema,
  updateLeadCapture: updateLeadCaptureSchema,
  createEmailCampaign: createEmailCampaignSchema,
  updateEmailCampaign: updateEmailCampaignSchema,
  sendEmailCampaign: sendEmailCampaignSchema,
  createReferralCode: createReferralCodeSchema,
  updateReferralCode: updateReferralCodeSchema,
  trackReferral: trackReferralSchema,
  updateSEOMetadata: updateSEOMetadataSchema,
  trackGrowthMetric: trackGrowthMetricSchema,
  createGrowthExperiment: createGrowthExperimentSchema,
  updateGrowthExperiment: updateGrowthExperimentSchema,
  trackSocialShare: trackSocialShareSchema,

  // Query schemas
  marketingAnalyticsQuery: marketingAnalyticsQuerySchema,
  landingPageAnalyticsQuery: landingPageAnalyticsQuerySchema,
  emailCampaignAnalyticsQuery: emailCampaignAnalyticsQuerySchema,
  referralAnalyticsQuery: referralAnalyticsQuerySchema,
  leadCaptureQuery: leadCaptureQuerySchema,

  // Bulk operations
  bulkLeadCapture: bulkLeadCaptureSchema,
  bulkGrowthMetrics: bulkGrowthMetricsSchema
} as const