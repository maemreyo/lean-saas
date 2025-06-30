// UPDATED: 2025-06-30 - Added advanced billing validation schemas for usage tracking and metered billing

import { z } from 'zod'

// Enum schemas
export const usageEventTypeSchema = z.enum([
  'api_call',
  'storage_used',
  'project_created', 
  'user_invited',
  'email_sent',
  'export_generated',
  'backup_created',
  'custom_domain',
  'advanced_feature'
], {
  errorMap: () => ({ message: 'Invalid usage event type' })
})

export const quotaTypeSchema = z.enum([
  'api_calls',
  'storage_gb',
  'projects',
  'team_members',
  'email_sends',
  'exports',
  'backups',
  'custom_domains'
], {
  errorMap: () => ({ message: 'Invalid quota type' })
})

export const resetPeriodSchema = z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
  errorMap: () => ({ message: 'Reset period must be daily, weekly, monthly, or yearly' })
})

export const alertTypeSchema = z.enum([
  'quota_warning',
  'quota_exceeded',
  'payment_failed',
  'subscription_expired',
  'trial_ending',
  'feature_limit_reached'
], {
  errorMap: () => ({ message: 'Invalid alert type' })
})

// Usage event schemas
export const usageEventCreateSchema = z.object({
  event_type: usageEventTypeSchema,
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  unit_price: z.number().int().min(0, 'Unit price must be non-negative').optional(),
  metadata: z.record(z.any()).optional().default({}),
  organization_id: z.string().uuid('Invalid organization ID').optional()
})

export const usageEventUpdateSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1').optional(),
  unit_price: z.number().int().min(0, 'Unit price must be non-negative').optional(),
  metadata: z.record(z.any()).optional(),
  processed: z.boolean().optional()
})

// Usage quota schemas
export const usageQuotaCreateSchema = z.object({
  quota_type: quotaTypeSchema,
  limit_value: z.number().int().min(-1, 'Limit value must be -1 (unlimited) or positive'),
  current_usage: z.number().int().min(0, 'Current usage must be non-negative').default(0),
  reset_period: resetPeriodSchema.default('monthly'),
  organization_id: z.string().uuid('Invalid organization ID').optional()
})

export const usageQuotaUpdateSchema = z.object({
  limit_value: z.number().int().min(-1, 'Limit value must be -1 (unlimited) or positive').optional(),
  current_usage: z.number().int().min(0, 'Current usage must be non-negative').optional(),
  reset_period: resetPeriodSchema.optional()
})

// Invoice item schemas
export const invoiceItemCreateSchema = z.object({
  subscription_id: z.string().uuid('Invalid subscription ID'),
  stripe_invoice_item_id: z.string().optional(),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  amount: z.number().int().min(0, 'Amount must be non-negative'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  unit_price: z.number().int().min(0, 'Unit price must be non-negative'),
  period_start: z.string().datetime('Invalid period start date'),
  period_end: z.string().datetime('Invalid period end date'),
  usage_type: usageEventTypeSchema.optional(),
  metadata: z.record(z.any()).optional().default({})
}).refine((data) => new Date(data.period_end) > new Date(data.period_start), {
  message: 'Period end must be after period start',
  path: ['period_end']
})

// Billing alert schemas
export const billingAlertCreateSchema = z.object({
  alert_type: alertTypeSchema,
  quota_type: quotaTypeSchema.optional(),
  threshold_percentage: z.number().int().min(1).max(100, 'Threshold must be between 1-100%').optional(),
  current_usage: z.number().int().min(0, 'Current usage must be non-negative').optional(),
  limit_value: z.number().int().min(-1, 'Limit value must be -1 (unlimited) or positive').optional(),
  metadata: z.record(z.any()).optional().default({}),
  organization_id: z.string().uuid('Invalid organization ID').optional()
})

export const billingAlertUpdateSchema = z.object({
  acknowledged: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
})

// Payment failure schemas
export const paymentFailureCreateSchema = z.object({
  subscription_id: z.string().uuid('Invalid subscription ID'),
  stripe_invoice_id: z.string().optional(),
  failure_reason: z.string().max(1000, 'Failure reason must be less than 1000 characters').optional(),
  retry_count: z.number().int().min(0, 'Retry count must be non-negative').default(0),
  next_retry_at: z.string().datetime('Invalid retry date').optional()
})

export const paymentFailureUpdateSchema = z.object({
  retry_count: z.number().int().min(0, 'Retry count must be non-negative').optional(),
  next_retry_at: z.string().datetime('Invalid retry date').optional(),
  resolved: z.boolean().optional()
})

// API request schemas
export const usageTrackingRequestSchema = z.object({
  eventType: usageEventTypeSchema,
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  metadata: z.record(z.any()).optional().default({}),
  organizationId: z.string().uuid('Invalid organization ID').optional()
})

export const quotaCheckRequestSchema = z.object({
  quotaType: quotaTypeSchema,
  requestedAmount: z.number().int().min(1, 'Requested amount must be at least 1').default(1),
  organizationId: z.string().uuid('Invalid organization ID').optional()
})

// Query parameter schemas
export const usageAnalyticsQuerySchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y'], {
    errorMap: () => ({ message: 'Time range must be 7d, 30d, 90d, or 1y' })
  }).default('30d'),
  eventType: usageEventTypeSchema.optional(),
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  includeProjections: z.boolean().default(true)
})

export const billingAlertsQuerySchema = z.object({
  alertType: alertTypeSchema.optional(),
  acknowledged: z.boolean().optional(),
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).default(0)
})

export const invoiceItemsQuerySchema = z.object({
  subscriptionId: z.string().uuid('Invalid subscription ID').optional(),
  period: z.object({
    start: z.string().datetime('Invalid start date'),
    end: z.string().datetime('Invalid end date')
  }).optional(),
  usageType: usageEventTypeSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
})

// Plan limits schema
export const planLimitsSchema = z.object({
  api_calls: z.number().int().min(-1, 'API calls limit must be -1 (unlimited) or positive'),
  storage_gb: z.number().int().min(-1, 'Storage limit must be -1 (unlimited) or positive'),
  projects: z.number().int().min(-1, 'Projects limit must be -1 (unlimited) or positive'),
  team_members: z.number().int().min(-1, 'Team members limit must be -1 (unlimited) or positive'),
  email_sends: z.number().int().min(-1, 'Email sends limit must be -1 (unlimited) or positive'),
  exports: z.number().int().min(-1, 'Exports limit must be -1 (unlimited) or positive'),
  backups: z.number().int().min(-1, 'Backups limit must be -1 (unlimited) or positive'),
  custom_domains: z.number().int().min(-1, 'Custom domains limit must be -1 (unlimited) or positive')
})

// Advanced plan configuration schema
export const advancedPlanConfigSchema = z.object({
  id: z.string().min(1, 'Plan ID is required'),
  name: z.string().min(1, 'Plan name is required').max(100, 'Plan name must be less than 100 characters'),
  description: z.string().min(1, 'Plan description is required').max(500, 'Description must be less than 500 characters'),
  price: z.number().min(0, 'Price must be non-negative'),
  priceId: z.string().min(1, 'Stripe price ID is required'),
  interval: z.enum(['month', 'year'], {
    errorMap: () => ({ message: 'Interval must be month or year' })
  }),
  limits: planLimitsSchema,
  usagePricing: z.record(usageEventTypeSchema, z.number().int().min(0)).optional().default({}),
  overage: z.object({
    enabled: z.boolean().default(false),
    rates: z.record(quotaTypeSchema, z.number().int().min(0)).optional().default({})
  }).default({ enabled: false, rates: {} }),
  meteringEnabled: z.boolean().default(false),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  popular: z.boolean().optional().default(false)
})

// Stripe webhook schemas
export const stripeUsageRecordSchema = z.object({
  id: z.string(),
  quantity: z.number().int().min(0),
  timestamp: z.number().int(),
  subscription_item: z.string()
})

export const stripeInvoiceEventSchema = z.object({
  id: z.string(),
  object: z.literal('invoice'),
  amount_due: z.number().int(),
  amount_paid: z.number().int(),
  amount_remaining: z.number().int(),
  billing_reason: z.string(),
  customer: z.string(),
  subscription: z.string().optional(),
  status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']),
  lines: z.object({
    data: z.array(z.object({
      id: z.string(),
      amount: z.number().int(),
      description: z.string(),
      quantity: z.number().int(),
      period: z.object({
        start: z.number().int(),
        end: z.number().int()
      })
    }))
  })
})

// Bulk operations schemas
export const bulkUsageTrackingSchema = z.object({
  events: z.array(usageTrackingRequestSchema).min(1, 'At least one event is required').max(100, 'Maximum 100 events per batch')
})

export const quotaResetSchema = z.object({
  quotaTypes: z.array(quotaTypeSchema).optional(),
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  resetPeriod: resetPeriodSchema.optional()
})

// Form validation helpers
export const validateUsageTracking = (data: unknown) => usageTrackingRequestSchema.safeParse(data)
export const validateQuotaCheck = (data: unknown) => quotaCheckRequestSchema.safeParse(data)
export const validateUsageEvent = (data: unknown) => usageEventCreateSchema.safeParse(data)
export const validateBillingAlert = (data: unknown) => billingAlertCreateSchema.safeParse(data)
export const validatePlanLimits = (data: unknown) => planLimitsSchema.safeParse(data)

// Type inference helpers
export type UsageTrackingRequest = z.infer<typeof usageTrackingRequestSchema>
export type QuotaCheckRequest = z.infer<typeof quotaCheckRequestSchema>
export type UsageEventCreate = z.infer<typeof usageEventCreateSchema>
export type UsageQuotaCreate = z.infer<typeof usageQuotaCreateSchema>
export type BillingAlertCreate = z.infer<typeof billingAlertCreateSchema>
export type PlanLimits = z.infer<typeof planLimitsSchema>
export type AdvancedPlanConfig = z.infer<typeof advancedPlanConfigSchema>
export type StripeInvoiceEvent = z.infer<typeof stripeInvoiceEventSchema>

// Export all schemas
export const billingSchemas = {
  usageEventType: usageEventTypeSchema,
  quotaType: quotaTypeSchema,
  resetPeriod: resetPeriodSchema,
  alertType: alertTypeSchema,
  usageEventCreate: usageEventCreateSchema,
  usageEventUpdate: usageEventUpdateSchema,
  usageQuotaCreate: usageQuotaCreateSchema,
  usageQuotaUpdate: usageQuotaUpdateSchema,
  invoiceItemCreate: invoiceItemCreateSchema,
  billingAlertCreate: billingAlertCreateSchema,
  billingAlertUpdate: billingAlertUpdateSchema,
  paymentFailureCreate: paymentFailureCreateSchema,
  paymentFailureUpdate: paymentFailureUpdateSchema,
  usageTrackingRequest: usageTrackingRequestSchema,
  quotaCheckRequest: quotaCheckRequestSchema,
  usageAnalyticsQuery: usageAnalyticsQuerySchema,
  billingAlertsQuery: billingAlertsQuerySchema,
  invoiceItemsQuery: invoiceItemsQuerySchema,
  planLimits: planLimitsSchema,
  advancedPlanConfig: advancedPlanConfigSchema,
  stripeUsageRecord: stripeUsageRecordSchema,
  stripeInvoiceEvent: stripeInvoiceEventSchema,
  bulkUsageTracking: bulkUsageTrackingSchema,
  quotaReset: quotaResetSchema
} as const