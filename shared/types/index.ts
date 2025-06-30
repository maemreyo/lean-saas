// Created shared TypeScript types for lean-saas template

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      organizations: {
        Row: Organization
        Insert: OrganizationInsert
        Update: OrganizationUpdate
      }
      organization_members: {
        Row: OrganizationMember
        Insert: OrganizationMemberInsert
        Update: OrganizationMemberUpdate
      }
      subscriptions: {
        Row: Subscription
        Insert: SubscriptionInsert
        Update: SubscriptionUpdate
      }
      projects: {
        Row: Project
        Insert: ProjectInsert
        Update: ProjectUpdate
      }
    }
  }
}

// Core entity types
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  plan_type: PlanType
  stripe_customer_id: string | null
  onboarded: boolean
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
  plan_type?: PlanType
  stripe_customer_id?: string | null
  onboarded?: boolean
  created_at?: string
  updated_at?: string
}

export interface ProfileUpdate {
  email?: string
  full_name?: string | null
  avatar_url?: string | null
  plan_type?: PlanType
  stripe_customer_id?: string | null
  onboarded?: boolean
  updated_at?: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan_type: PlanType
  stripe_customer_id: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface OrganizationInsert {
  id?: string
  name: string
  slug: string
  plan_type?: PlanType
  stripe_customer_id?: string | null
  owner_id: string
  created_at?: string
  updated_at?: string
}

export interface OrganizationUpdate {
  name?: string
  slug?: string
  plan_type?: PlanType
  stripe_customer_id?: string | null
  owner_id?: string
  updated_at?: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: OrganizationRole
  invited_by: string | null
  joined_at: string
}

export interface OrganizationMemberInsert {
  id?: string
  organization_id: string
  user_id: string
  role?: OrganizationRole
  invited_by?: string | null
  joined_at?: string
}

export interface OrganizationMemberUpdate {
  role?: OrganizationRole
  invited_by?: string | null
}

export interface Subscription {
  id: string
  organization_id: string | null
  user_id: string | null
  stripe_subscription_id: string
  stripe_price_id: string
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface SubscriptionInsert {
  id?: string
  organization_id?: string | null
  user_id?: string | null
  stripe_subscription_id: string
  stripe_price_id: string
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  cancel_at_period_end?: boolean
  created_at?: string
  updated_at?: string
}

export interface SubscriptionUpdate {
  stripe_price_id?: string
  status?: SubscriptionStatus
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end?: boolean
  updated_at?: string
}

export interface Project {
  id: string
  organization_id: string
  name: string
  description: string | null
  status: ProjectStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface ProjectInsert {
  id?: string
  organization_id: string
  name: string
  description?: string | null
  status?: ProjectStatus
  created_by: string
  created_at?: string
  updated_at?: string
}

export interface ProjectUpdate {
  name?: string
  description?: string | null
  status?: ProjectStatus
  updated_at?: string
}

// Enum types
export type PlanType = 'free' | 'pro' | 'enterprise'

export type OrganizationRole = 'owner' | 'admin' | 'member'

export type SubscriptionStatus = 
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused'

export type ProjectStatus = 'active' | 'archived' | 'deleted'

// API types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  role?: string
  aud: string
  created_at: string
  updated_at: string
}

export interface Session {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: AuthUser
}

// UI component types
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface TableColumn<T = any> {
  key: keyof T | string
  label: string
  sortable?: boolean
  width?: string
  render?: (value: any, row: T) => React.ReactNode
}

export interface TableProps<T = any> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  pagination?: {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
  }
  onSort?: (key: string, direction: 'asc' | 'desc') => void
}

// Form types
export interface FormFieldError {
  message: string
  type: string
}

export interface FormErrors {
  [key: string]: FormFieldError | undefined
}

export interface FormState<T = any> {
  values: T
  errors: FormErrors
  touched: { [key: string]: boolean }
  isSubmitting: boolean
  isValid: boolean
}

// Email types
export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

export interface EmailRequest {
  to: string | string[]
  template: 'welcome' | 'password-reset' | 'invitation' | 'custom'
  data?: any
  subject?: string
  html?: string
  text?: string
  from?: string
}

// Stripe types
export interface StripePrice {
  id: string
  object: 'price'
  active: boolean
  currency: string
  product: string
  type: 'one_time' | 'recurring'
  unit_amount: number
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year'
    interval_count: number
  }
}

export interface StripeProduct {
  id: string
  object: 'product'
  active: boolean
  name: string
  description?: string
  metadata: Record<string, string>
}

// Plan configuration types
export interface PlanFeature {
  name: string
  included: boolean
  limit?: number
}

export interface PlanConfig {
  id: PlanType
  name: string
  description: string
  price: number
  priceId: string
  interval: 'month' | 'year'
  features: PlanFeature[]
  popular?: boolean
  maxProjects?: number
  maxMembers?: number
  maxStorage?: number // in GB
}

// Dashboard types
export interface DashboardStats {
  totalProjects: number
  activeProjects: number
  archivedProjects: number
  totalMembers: number
  planType: PlanType
  subscriptionStatus?: SubscriptionStatus
  storageUsed?: number // in GB
  storageLimit?: number // in GB
}

// Navigation types
export interface NavItem {
  name: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: string | number
  disabled?: boolean
}

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

// Search types
export interface SearchFilters {
  query?: string
  status?: ProjectStatus[]
  organizationId?: string
  createdBy?: string
  dateFrom?: string
  dateTo?: string
}

export interface SearchResult<T = any> {
  items: T[]
  total: number
  query: string
  filters: SearchFilters
}

// Notification types
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  created_at: string
  action?: {
    label: string
    href: string
  }
}

// Export all types as a namespace for easier imports
export namespace Types {
  export type {
    Database,
    Profile,
    ProfileInsert,
    ProfileUpdate,
    Organization,
    OrganizationInsert,
    OrganizationUpdate,
    OrganizationMember,
    OrganizationMemberInsert,
    OrganizationMemberUpdate,
    Subscription,
    SubscriptionInsert,
    SubscriptionUpdate,
    Project,
    ProjectInsert,
    ProjectUpdate,
    PlanType,
    OrganizationRole,
    SubscriptionStatus,
    ProjectStatus,
    ApiResponse,
    PaginatedResponse,
    AuthUser,
    Session,
    SelectOption,
    TableColumn,
    TableProps,
    FormFieldError,
    FormErrors,
    FormState,
    EmailTemplate,
    EmailRequest,
    StripePrice,
    StripeProduct,
    PlanFeature,
    PlanConfig,
    DashboardStats,
    NavItem,
    BreadcrumbItem,
    SearchFilters,
    SearchResult,
    Notification
  }
}