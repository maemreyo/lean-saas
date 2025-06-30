// Created Zod validation schemas for lean-saas template

import { z } from 'zod'

// Base schemas
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  )

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')

export const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(50, 'Slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .refine((val) => !val.startsWith('-') && !val.endsWith('-'), {
    message: 'Slug cannot start or end with a hyphen'
  })

export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format')

export const urlSchema = z
  .string()
  .url('Please enter a valid URL')
  .optional()
  .or(z.literal(''))

// Enum schemas
export const planTypeSchema = z.enum(['free', 'pro', 'enterprise'], {
  errorMap: () => ({ message: 'Plan type must be free, pro, or enterprise' })
})

export const organizationRoleSchema = z.enum(['owner', 'admin', 'member'], {
  errorMap: () => ({ message: 'Role must be owner, admin, or member' })
})

export const subscriptionStatusSchema = z.enum([
  'incomplete',
  'incomplete_expired', 
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused'
])

export const projectStatusSchema = z.enum(['active', 'archived', 'deleted'], {
  errorMap: () => ({ message: 'Status must be active, archived, or deleted' })
})

// Profile schemas
export const profileUpdateSchema = z.object({
  full_name: nameSchema.optional().nullable(),
  avatar_url: urlSchema.optional().nullable()
})

export const profileCreateSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  full_name: nameSchema.optional().nullable(),
  avatar_url: urlSchema.optional().nullable(),
  plan_type: planTypeSchema.optional().default('free')
})

export const completeOnboardingSchema = z.object({
  full_name: nameSchema,
  organization_name: z.string().min(1, 'Organization name is required').optional()
})

// Auth schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: nameSchema,
  terms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  })
})

export const forgotPasswordSchema = z.object({
  email: emailSchema
})

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// Organization schemas
export const organizationCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name must be less than 100 characters'),
  slug: slugSchema.optional()
})

export const organizationUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name must be less than 100 characters')
    .optional()
})

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: organizationRoleSchema.exclude(['owner']),
  organization_id: uuidSchema
})

export const updateMemberRoleSchema = z.object({
  user_id: uuidSchema,
  role: organizationRoleSchema.exclude(['owner']),
  organization_id: uuidSchema
})

// Project schemas
export const projectCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),
  organization_id: uuidSchema
})

export const projectUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),
  status: projectStatusSchema.optional()
})

// Email schemas
export const sendEmailSchema = z.object({
  to: z.union([emailSchema, z.array(emailSchema)]),
  template: z.enum(['welcome', 'password-reset', 'invitation', 'custom']),
  data: z.record(z.any()).optional(),
  subject: z.string().optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  from: emailSchema.optional()
}).refine((data) => {
  if (data.template === 'custom') {
    return data.subject && data.html
  }
  return true
}, {
  message: 'Custom email template requires subject and html',
  path: ['template']
})

export const welcomeEmailDataSchema = z.object({
  name: nameSchema,
  loginUrl: urlSchema.optional()
})

export const passwordResetEmailDataSchema = z.object({
  resetUrl: z.string().url('Invalid reset URL'),
  name: nameSchema.optional()
})

export const invitationEmailDataSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
  inviterName: nameSchema,
  inviteUrl: z.string().url('Invalid invite URL')
})

// Search and filter schemas
export const searchFiltersSchema = z.object({
  query: z.string().optional(),
  status: z.array(projectStatusSchema).optional(),
  organizationId: uuidSchema.optional(),
  createdBy: uuidSchema.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
})

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10)
})

// API schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional()
})

export const paginatedResponseSchema = apiResponseSchema.extend({
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0)
  }).optional()
})

// Contact form schema
export const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be less than 200 characters'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message must be less than 1000 characters')
})

// Settings schemas
export const accountSettingsSchema = z.object({
  full_name: nameSchema,
  email: emailSchema,
  avatar_url: urlSchema.optional().nullable()
})

export const organizationSettingsSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name must be less than 100 characters'),
  slug: slugSchema
})

export const securitySettingsSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string()
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match",
  path: ["confirmNewPassword"]
})

// Notification schemas
export const notificationSchema = z.object({
  id: uuidSchema,
  type: z.enum(['info', 'success', 'warning', 'error']),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  read: z.boolean(),
  created_at: z.string().datetime(),
  action: z.object({
    label: z.string(),
    href: z.string()
  }).optional()
})

// File upload schemas
export const fileUploadSchema = z.object({
  file: z.any(),
  maxSize: z.number().optional().default(5 * 1024 * 1024), // 5MB default
  allowedTypes: z.array(z.string()).optional().default(['image/jpeg', 'image/png', 'image/gif'])
})

// Webhook schemas
export const stripeWebhookSchema = z.object({
  id: z.string(),
  object: z.literal('event'),
  type: z.string(),
  data: z.object({
    object: z.any()
  }),
  created: z.number(),
  livemode: z.boolean()
})

// Query parameter schemas for API endpoints
export const getProjectsQuerySchema = searchFiltersSchema.merge(paginationSchema)

export const getOrganizationsQuerySchema = z.object({
  include_members: z.boolean().optional(),
  role: organizationRoleSchema.optional()
}).merge(paginationSchema)

// Form validation helpers
export const createFormValidator = <T extends z.ZodType>(schema: T) => {
  return (data: unknown): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } => {
    const result = schema.safeParse(data)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return { success: false, errors: result.error }
  }
}

// Export all schemas in a namespace for organized imports
export const schemas = {
  // Base
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  slug: slugSchema,
  uuid: uuidSchema,
  url: urlSchema,
  
  // Enums
  planType: planTypeSchema,
  organizationRole: organizationRoleSchema,
  subscriptionStatus: subscriptionStatusSchema,
  projectStatus: projectStatusSchema,
  
  // Auth
  login: loginSchema,
  register: registerSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  
  // Profile
  profileUpdate: profileUpdateSchema,
  profileCreate: profileCreateSchema,
  completeOnboarding: completeOnboardingSchema,
  
  // Organization
  organizationCreate: organizationCreateSchema,
  organizationUpdate: organizationUpdateSchema,
  inviteMember: inviteMemberSchema,
  updateMemberRole: updateMemberRoleSchema,
  
  // Project
  projectCreate: projectCreateSchema,
  projectUpdate: projectUpdateSchema,
  
  // Email
  sendEmail: sendEmailSchema,
  welcomeEmailData: welcomeEmailDataSchema,
  passwordResetEmailData: passwordResetEmailDataSchema,
  invitationEmailData: invitationEmailDataSchema,
  
  // API
  apiResponse: apiResponseSchema,
  paginatedResponse: paginatedResponseSchema,
  pagination: paginationSchema,
  searchFilters: searchFiltersSchema,
  
  // Forms
  contactForm: contactFormSchema,
  accountSettings: accountSettingsSchema,
  organizationSettings: organizationSettingsSchema,
  securitySettings: securitySettingsSchema,
  
  // Other
  notification: notificationSchema,
  fileUpload: fileUploadSchema,
  stripeWebhook: stripeWebhookSchema,
  
  // Query schemas
  getProjectsQuery: getProjectsQuerySchema,
  getOrganizationsQuery: getOrganizationsQuerySchema
} as const

export type Schemas = typeof schemas