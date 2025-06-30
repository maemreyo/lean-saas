// App configuration
export const APP_CONFIG = {
  name: 'SaaS App',
  description: 'A modern SaaS application built with Next.js and Supabase',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  supportEmail: 'support@yourdomain.com',
  version: '1.0.0'
} as const

// API configuration
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 30000, // 30 seconds
  retries: 3,
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  }
} as const

// Route constants
export const ROUTES = {
  // Public routes
  HOME: '/',
  PRICING: '/pricing',
  ABOUT: '/about',
  CONTACT: '/contact',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  
  // Auth routes
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_EMAIL: '/auth/verify-email',
  AUTH_CALLBACK: '/auth/callback',
  
  // Dashboard routes
  DASHBOARD: '/dashboard',
  PROJECTS: '/dashboard/projects',
  PROJECT_DETAIL: (id: string) => `/dashboard/projects/${id}`,
  PROJECT_NEW: '/dashboard/projects/new',
  SETTINGS: '/dashboard/settings',
  SETTINGS_ACCOUNT: '/dashboard/settings/account',
  SETTINGS_ORGANIZATION: '/dashboard/settings/organization',
  SETTINGS_BILLING: '/dashboard/settings/billing',
  SETTINGS_SECURITY: '/dashboard/settings/security',
  BILLING: '/dashboard/billing',
  
  // Organization routes
  ORGANIZATIONS: '/dashboard/organizations',
  ORGANIZATION_DETAIL: (id: string) => `/dashboard/organizations/${id}`,
  ORGANIZATION_MEMBERS: (id: string) => `/dashboard/organizations/${id}/members`,
  ORGANIZATION_SETTINGS: (id: string) => `/dashboard/organizations/${id}/settings`,
  
  // API routes
  API: {
    AUTH: '/api/auth',
    USERS: '/api/users',
    ORGANIZATIONS: '/api/organizations',
    PROJECTS: '/api/projects',
    BILLING: '/api/billing',
    STRIPE: {
      CHECKOUT: '/api/stripe/checkout',
      PORTAL: '/api/stripe/portal',
      WEBHOOK: '/api/stripe/webhook'
    },
    EMAIL: '/api/email',
    UPLOAD: '/api/upload'
  }
} as const

// Plan configurations
export const PLANS = {
  FREE: {
    id: 'free' as const,
    name: 'Free',
    description: 'Perfect for getting started',
    price: 0,
    interval: 'month' as const,
    priceId: '',
    features: [
      'Up to 3 projects',
      'Basic support',
      '1GB storage',
      'Community access'
    ],
    limits: {
      projects: 3,
      members: 1,
      storage: 1024 // MB
    }
  },
  PRO: {
    id: 'pro' as const,
    name: 'Pro',
    description: 'For growing businesses',
    price: 19,
    interval: 'month' as const,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
    features: [
      'Unlimited projects',
      'Priority support',
      '100GB storage',
      'Advanced analytics',
      'Team collaboration',
      'Custom integrations'
    ],
    limits: {
      projects: -1, // unlimited
      members: 10,
      storage: 102400 // MB (100GB)
    },
    popular: true
  },
  ENTERPRISE: {
    id: 'enterprise' as const,
    name: 'Enterprise',
    description: 'For large organizations',
    price: 99,
    interval: 'month' as const,
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || '',
    features: [
      'Everything in Pro',
      'Unlimited members',
      '1TB storage',
      'Dedicated support',
      'SLA guarantee',
      'Custom features',
      'Single sign-on (SSO)',
      'Advanced security'
    ],
    limits: {
      projects: -1, // unlimited
      members: -1, // unlimited
      storage: 1048576 // MB (1TB)
    }
  }
} as const

// Organization roles and permissions
export const ORGANIZATION_ROLES = {
  OWNER: {
    id: 'owner' as const,
    name: 'Owner',
    description: 'Full access to all organization features',
    permissions: [
      'manage_organization',
      'manage_members',
      'manage_billing',
      'manage_projects',
      'view_analytics',
      'delete_organization'
    ]
  },
  ADMIN: {
    id: 'admin' as const,
    name: 'Admin',
    description: 'Manage members and projects',
    permissions: [
      'manage_members',
      'manage_projects',
      'view_analytics'
    ]
  },
  MEMBER: {
    id: 'member' as const,
    name: 'Member',
    description: 'Basic project access',
    permissions: [
      'view_projects',
      'create_projects',
      'edit_own_projects'
    ]
  }
} as const

// Project statuses
export const PROJECT_STATUSES = {
  ACTIVE: {
    id: 'active' as const,
    name: 'Active',
    description: 'Project is currently being worked on',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800'
  },
  ARCHIVED: {
    id: 'archived' as const,
    name: 'Archived',
    description: 'Project is completed or on hold',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800'
  },
  DELETED: {
    id: 'deleted' as const,
    name: 'Deleted',
    description: 'Project has been soft deleted',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800'
  }
} as const

// Subscription statuses
export const SUBSCRIPTION_STATUSES = {
  INCOMPLETE: {
    id: 'incomplete' as const,
    name: 'Incomplete',
    description: 'Payment is required',
    color: 'yellow'
  },
  INCOMPLETE_EXPIRED: {
    id: 'incomplete_expired' as const,
    name: 'Expired',
    description: 'Payment failed',
    color: 'red'
  },
  TRIALING: {
    id: 'trialing' as const,
    name: 'Trial',
    description: 'In trial period',
    color: 'blue'
  },
  ACTIVE: {
    id: 'active' as const,
    name: 'Active',
    description: 'Subscription is active',
    color: 'green'
  },
  PAST_DUE: {
    id: 'past_due' as const,
    name: 'Past Due',
    description: 'Payment is overdue',
    color: 'orange'
  },
  CANCELED: {
    id: 'canceled' as const,
    name: 'Canceled',
    description: 'Subscription has been canceled',
    color: 'red'
  },
  UNPAID: {
    id: 'unpaid' as const,
    name: 'Unpaid',
    description: 'Payment failed',
    color: 'red'
  },
  PAUSED: {
    id: 'paused' as const,
    name: 'Paused',
    description: 'Subscription is paused',
    color: 'gray'
  }
} as const

// Error messages
export const ERROR_MESSAGES = {
  // Auth errors
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_NOT_CONFIRMED: 'Please check your email and click the confirmation link',
  USER_NOT_FOUND: 'User not found',
  WEAK_PASSWORD: 'Password is too weak',
  EMAIL_ALREADY_REGISTERED: 'Email is already registered',
  TOKEN_EXPIRED: 'Token has expired',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  
  // Organization errors
  ORGANIZATION_NOT_FOUND: 'Organization not found',
  ALREADY_MEMBER: 'User is already a member of this organization',
  CANNOT_REMOVE_OWNER: 'Cannot remove organization owner',
  INVALID_ROLE: 'Invalid role specified',
  
  // Project errors
  PROJECT_NOT_FOUND: 'Project not found',
  PROJECT_LIMIT_REACHED: 'Project limit reached for your plan',
  
  // Billing errors
  PAYMENT_FAILED: 'Payment failed. Please try again',
  SUBSCRIPTION_NOT_FOUND: 'Subscription not found',
  PLAN_NOT_FOUND: 'Plan not found',
  
  // General errors
  SOMETHING_WENT_WRONG: 'Something went wrong. Please try again',
  NETWORK_ERROR: 'Network error. Please check your connection',
  VALIDATION_ERROR: 'Please fix the validation errors and try again',
  NOT_FOUND: 'Resource not found',
  FORBIDDEN: 'You do not have permission to access this resource'
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  // Auth
  REGISTRATION_SUCCESS: 'Account created successfully! Please check your email to verify your account',
  LOGIN_SUCCESS: 'Welcome back!',
  LOGOUT_SUCCESS: 'You have been signed out',
  PASSWORD_RESET_SENT: 'Password reset email sent. Please check your inbox',
  PASSWORD_UPDATED: 'Password updated successfully',
  EMAIL_VERIFIED: 'Email verified successfully',
  
  // Profile
  PROFILE_UPDATED: 'Profile updated successfully',
  ONBOARDING_COMPLETED: 'Welcome! Your account setup is complete',
  
  // Organization
  ORGANIZATION_CREATED: 'Organization created successfully',
  ORGANIZATION_UPDATED: 'Organization updated successfully',
  MEMBER_INVITED: 'Member invited successfully',
  MEMBER_REMOVED: 'Member removed successfully',
  ROLE_UPDATED: 'Role updated successfully',
  
  // Project
  PROJECT_CREATED: 'Project created successfully',
  PROJECT_UPDATED: 'Project updated successfully',
  PROJECT_DELETED: 'Project deleted successfully',
  PROJECT_ARCHIVED: 'Project archived successfully',
  
  // Billing
  SUBSCRIPTION_CREATED: 'Subscription created successfully',
  SUBSCRIPTION_UPDATED: 'Subscription updated successfully',
  SUBSCRIPTION_CANCELED: 'Subscription canceled successfully',
  
  // General
  CHANGES_SAVED: 'Changes saved successfully',
  EMAIL_SENT: 'Email sent successfully'
} as const

// Validation limits
export const VALIDATION_LIMITS = {
  NAME: {
    MIN: 1,
    MAX: 100
  },
  EMAIL: {
    MAX: 255
  },
  PASSWORD: {
    MIN: 8,
    MAX: 128
  },
  ORGANIZATION_NAME: {
    MIN: 1,
    MAX: 100
  },
  PROJECT_NAME: {
    MIN: 1,
    MAX: 100
  },
  PROJECT_DESCRIPTION: {
    MAX: 500
  },
  SLUG: {
    MIN: 1,
    MAX: 50
  },
  MESSAGE: {
    MIN: 10,
    MAX: 1000
  }
} as const

// File upload limits
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENTS: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },
  AVATAR: {
    MAX_SIZE: 2 * 1024 * 1024, // 2MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp']
  }
} as const

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  ITEMS_PER_PAGE_OPTIONS: [5, 10, 20, 50, 100]
} as const

// Theme configuration
export const THEME = {
  COLORS: {
    PRIMARY: '#2563eb',
    SECONDARY: '#64748b',
    SUCCESS: '#059669',
    WARNING: '#d97706',
    ERROR: '#dc2626',
    INFO: '#0ea5e9'
  },
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536
  }
} as const

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  ENABLE_CHAT_SUPPORT: process.env.NEXT_PUBLIC_ENABLE_CHAT_SUPPORT === 'true',
  ENABLE_NOTIFICATIONS: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === 'true',
  ENABLE_COLLABORATION: process.env.NEXT_PUBLIC_ENABLE_COLLABORATION === 'true',
  ENABLE_API_DOCS: process.env.NEXT_PUBLIC_ENABLE_API_DOCS === 'true'
} as const

// External service URLs
export const EXTERNAL_URLS = {
  DOCUMENTATION: 'https://docs.yourdomain.com',
  SUPPORT: 'https://support.yourdomain.com',
  STATUS: 'https://status.yourdomain.com',
  BLOG: 'https://blog.yourdomain.com',
  COMMUNITY: 'https://community.yourdomain.com',
  GITHUB: 'https://github.com/yourusername/yourrepo',
  TWITTER: 'https://twitter.com/yourusername'
} as const

// Date and time formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM d, yyyy',
  DISPLAY_WITH_TIME: 'MMM d, yyyy h:mm a',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  API: 'yyyy-MM-dd',
  RELATIVE: 'relative' // for date-fns formatDistanceToNow
} as const

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'saas-app-theme',
  SIDEBAR_COLLAPSED: 'saas-app-sidebar-collapsed',
  LAST_ORGANIZATION: 'saas-app-last-organization',
  ONBOARDING_COMPLETED: 'saas-app-onboarding-completed',
  NOTIFICATION_PREFERENCES: 'saas-app-notification-preferences'
} as const

// Cookie names
export const COOKIES = {
  AUTH_TOKEN: 'supabase-auth-token',
  REFRESH_TOKEN: 'supabase-refresh-token'
} as const

// Event names for analytics
export const ANALYTICS_EVENTS = {
  // Auth events
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  
  // Organization events
  ORGANIZATION_CREATED: 'organization_created',
  MEMBER_INVITED: 'member_invited',
  
  // Project events
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_DELETED: 'project_deleted',
  
  // Billing events
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  
  // Engagement events
  FEATURE_USED: 'feature_used',
  PAGE_VIEWED: 'page_viewed',
  BUTTON_CLICKED: 'button_clicked'
} as const

// Export all constants in a single object for easier importing
export const CONSTANTS = {
  APP_CONFIG,
  API_CONFIG,
  ROUTES,
  PLANS,
  ORGANIZATION_ROLES,
  PROJECT_STATUSES,
  SUBSCRIPTION_STATUSES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION_LIMITS,
  FILE_UPLOAD,
  PAGINATION,
  THEME,
  FEATURE_FLAGS,
  EXTERNAL_URLS,
  DATE_FORMATS,
  STORAGE_KEYS,
  COOKIES,
  ANALYTICS_EVENTS
} as const