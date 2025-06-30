// UPDATED: 2025-06-30 - Added advanced billing types for usage tracking and metered billing

// Usage tracking types
export interface UsageEvent {
  id: string
  user_id: string | null
  organization_id: string | null
  event_type: UsageEventType
  quantity: number
  unit_price?: number // in cents
  metadata: Record<string, any>
  created_at: string
  billing_period_start?: string
  billing_period_end?: string
  processed: boolean
}

export interface UsageEventInsert {
  user_id?: string | null
  organization_id?: string | null
  event_type: UsageEventType
  quantity?: number
  unit_price?: number
  metadata?: Record<string, any>
  billing_period_start?: string
  billing_period_end?: string
  processed?: boolean
}

export interface UsageEventUpdate {
  quantity?: number
  unit_price?: number
  metadata?: Record<string, any>
  processed?: boolean
}

// Usage quota types
export interface UsageQuota {
  id: string
  user_id: string | null
  organization_id: string | null
  quota_type: QuotaType
  limit_value: number // -1 for unlimited
  current_usage: number
  reset_period: ResetPeriod
  last_reset: string
  created_at: string
  updated_at: string
}

export interface UsageQuotaInsert {
  user_id?: string | null
  organization_id?: string | null
  quota_type: QuotaType
  limit_value: number
  current_usage?: number
  reset_period?: ResetPeriod
  last_reset?: string
}

export interface UsageQuotaUpdate {
  limit_value?: number
  current_usage?: number
  reset_period?: ResetPeriod
  last_reset?: string
  updated_at?: string
}

// Invoice item types
export interface InvoiceItem {
  id: string
  subscription_id: string
  stripe_invoice_item_id?: string
  description: string
  amount: number // in cents
  quantity: number
  unit_price: number // in cents
  period_start: string
  period_end: string
  usage_type?: UsageEventType
  metadata: Record<string, any>
  created_at: string
}

export interface InvoiceItemInsert {
  subscription_id: string
  stripe_invoice_item_id?: string
  description: string
  amount: number
  quantity?: number
  unit_price: number
  period_start: string
  period_end: string
  usage_type?: UsageEventType
  metadata?: Record<string, any>
}

// Billing alert types
export interface BillingAlert {
  id: string
  user_id: string | null
  organization_id: string | null
  alert_type: AlertType
  quota_type?: QuotaType
  threshold_percentage?: number
  current_usage?: number
  limit_value?: number
  triggered_at: string
  acknowledged: boolean
  acknowledged_at?: string
  metadata: Record<string, any>
}

export interface BillingAlertInsert {
  user_id?: string | null
  organization_id?: string | null
  alert_type: AlertType
  quota_type?: QuotaType
  threshold_percentage?: number
  current_usage?: number
  limit_value?: number
  metadata?: Record<string, any>
}

export interface BillingAlertUpdate {
  acknowledged?: boolean
  acknowledged_at?: string
  metadata?: Record<string, any>
}

// Payment failure types
export interface PaymentFailure {
  id: string
  subscription_id: string
  stripe_invoice_id?: string
  failure_reason?: string
  retry_count: number
  next_retry_at?: string
  resolved: boolean
  resolved_at?: string
  created_at: string
  updated_at: string
}

export interface PaymentFailureInsert {
  subscription_id: string
  stripe_invoice_id?: string
  failure_reason?: string
  retry_count?: number
  next_retry_at?: string
  resolved?: boolean
}

export interface PaymentFailureUpdate {
  retry_count?: number
  next_retry_at?: string
  resolved?: boolean
  resolved_at?: string
  updated_at?: string
}

// Enum types
export type UsageEventType = 
  | 'api_call'
  | 'storage_used'
  | 'project_created'
  | 'user_invited'
  | 'email_sent'
  | 'export_generated'
  | 'backup_created'
  | 'custom_domain'
  | 'advanced_feature'

export type QuotaType = 
  | 'api_calls'
  | 'storage_gb'
  | 'projects'
  | 'team_members'
  | 'email_sends'
  | 'exports'
  | 'backups'
  | 'custom_domains'

export type ResetPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type AlertType = 
  | 'quota_warning'
  | 'quota_exceeded'
  | 'payment_failed'
  | 'subscription_expired'
  | 'trial_ending'
  | 'feature_limit_reached'

// Advanced billing analytics types
export interface UsageAnalytics {
  totalUsage: number
  usageByType: Record<UsageEventType, number>
  usageTrend: Array<{
    date: string
    usage: number
    cost: number
  }>
  projectedCost: number
  currentPeriodUsage: number
  previousPeriodUsage: number
  quotaUtilization: Record<QuotaType, {
    used: number
    limit: number
    percentage: number
  }>
}

export interface BillingDashboardData {
  currentSubscription: Subscription | null
  nextInvoice: {
    amount: number
    date: string
    items: InvoiceItem[]
  } | null
  usageAnalytics: UsageAnalytics
  activeAlerts: BillingAlert[]
  paymentFailures: PaymentFailure[]
  quotas: UsageQuota[]
}

// Plan configuration with usage limits
export interface PlanLimits {
  api_calls: number // -1 for unlimited
  storage_gb: number
  projects: number
  team_members: number
  email_sends: number
  exports: number
  backups: number
  custom_domains: number
}

export interface AdvancedPlanConfig extends PlanConfig {
  limits: PlanLimits
  usagePricing: Record<UsageEventType, number> // price per unit in cents
  overage: {
    enabled: boolean
    rates: Record<QuotaType, number> // price per unit overage in cents
  }
  meteringEnabled: boolean
  billingCycle: 'monthly' | 'yearly'
}

// Stripe webhook types
export interface StripeUsageRecord {
  id: string
  quantity: number
  timestamp: number
  subscription_item: string
}

export interface StripeInvoiceEvent {
  id: string
  object: 'invoice'
  amount_due: number
  amount_paid: number
  amount_remaining: number
  billing_reason: string
  customer: string
  subscription: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  lines: {
    data: Array<{
      id: string
      amount: number
      description: string
      quantity: number
      period: {
        start: number
        end: number
      }
    }>
  }
}

// API request/response types
export interface UsageTrackingRequest {
  eventType: UsageEventType
  quantity?: number
  metadata?: Record<string, any>
  organizationId?: string
}

export interface UsageTrackingResponse {
  success: boolean
  usageEvent: UsageEvent
  quotaStatus: {
    current: number
    limit: number
    remaining: number
    percentage: number
  }
  alerts?: BillingAlert[]
}

export interface QuotaCheckRequest {
  quotaType: QuotaType
  requestedAmount?: number
  organizationId?: string
}

export interface QuotaCheckResponse {
  allowed: boolean
  quota: UsageQuota
  remaining: number
  wouldExceed: boolean
  upgradeRequired: boolean
  suggestedPlan?: string
}

// Component props types
export interface UsageDisplayProps {
  usageData: UsageAnalytics
  quotas: UsageQuota[]
  showDetails?: boolean
  className?: string
}

export interface BillingAlertsProps {
  alerts: BillingAlert[]
  onAcknowledge: (alertId: string) => Promise<void>
  onDismiss?: (alertId: string) => Promise<void>
  className?: string
}

export interface UsageChartProps {
  data: Array<{
    date: string
    usage: number
    cost: number
  }>
  timeRange: '7d' | '30d' | '90d' | '1y'
  onTimeRangeChange: (range: string) => void
  className?: string
}

// Export consolidated types
export interface BillingTypes {
  UsageEvent: UsageEvent
  UsageQuota: UsageQuota
  InvoiceItem: InvoiceItem
  BillingAlert: BillingAlert
  PaymentFailure: PaymentFailure
  UsageAnalytics: UsageAnalytics
  BillingDashboardData: BillingDashboardData
  AdvancedPlanConfig: AdvancedPlanConfig
}