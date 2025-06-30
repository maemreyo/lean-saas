// Created shared utility functions for lean-saas template

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import { DATE_FORMATS, VALIDATION_LIMITS, PLANS } from '../constants'
import type { PlanType, OrganizationRole, ProjectStatus, SubscriptionStatus } from '../types'

// CSS class utility (for Tailwind)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date and time utilities
export const dateUtils = {
  /**
   * Format a date string or Date object for display
   */
  format: (date: string | Date, formatStr: string = DATE_FORMATS.DISPLAY): string => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date
      if (!isValid(dateObj)) return 'Invalid date'
      return format(dateObj, formatStr)
    } catch {
      return 'Invalid date'
    }
  },

  /**
   * Format a date as relative time (e.g., "2 hours ago")
   */
  formatRelative: (date: string | Date): string => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date
      if (!isValid(dateObj)) return 'Invalid date'
      return formatDistanceToNow(dateObj, { addSuffix: true })
    } catch {
      return 'Invalid date'
    }
  },

  /**
   * Check if a date is today
   */
  isToday: (date: string | Date): boolean => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date
      const today = new Date()
      return dateObj.toDateString() === today.toDateString()
    } catch {
      return false
    }
  },

  /**
   * Get start and end of day for a date
   */
  getDateRange: (date: string | Date): { start: Date; end: Date } => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const start = new Date(dateObj)
    start.setHours(0, 0, 0, 0)
    const end = new Date(dateObj)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }
}

// Currency and number formatting
export const formatUtils = {
  /**
   * Format a number as currency
   */
  currency: (
    amount: number,
    currency: string = 'USD',
    locale: string = 'en-US'
  ): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount)
  },

  /**
   * Format a number with commas
   */
  number: (num: number, locale: string = 'en-US'): string => {
    return new Intl.NumberFormat(locale).format(num)
  },

  /**
   * Format bytes to human readable format
   */
  bytes: (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  },

  /**
   * Format a percentage
   */
  percentage: (value: number, total: number, decimals: number = 1): string => {
    if (total === 0) return '0%'
    const percentage = (value / total) * 100
    return `${percentage.toFixed(decimals)}%`
  }
}

// String manipulation utilities
export const stringUtils = {
  /**
   * Generate a URL-friendly slug from a string
   */
  slugify: (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
  },

  /**
   * Truncate text to a specified length
   */
  truncate: (text: string, length: number, suffix: string = '...'): string => {
    if (text.length <= length) return text
    return text.substring(0, length).trim() + suffix
  },

  /**
   * Capitalize the first letter of a string
   */
  capitalize: (text: string): string => {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  },

  /**
   * Convert camelCase to title case
   */
  camelToTitle: (text: string): string => {
    return text
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  },

  /**
   * Extract initials from a name
   */
  getInitials: (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  },

  /**
   * Generate a random string
   */
  randomString: (length: number = 8): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

// Validation utilities
export const validationUtils = {
  /**
   * Check if an email is valid
   */
  isEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  /**
   * Check if a URL is valid
   */
  isUrl: (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  },

  /**
   * Check if a string is a valid UUID
   */
  isUuid: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  },

  /**
   * Check if a password meets strength requirements
   */
  isStrongPassword: (password: string): boolean => {
    return (
      password.length >= VALIDATION_LIMITS.PASSWORD.MIN &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password)
    )
  },

  /**
   * Check if a slug is valid
   */
  isValidSlug: (slug: string): boolean => {
    const slugRegex = /^[a-z0-9-]+$/
    return (
      slugRegex.test(slug) &&
      slug.length >= VALIDATION_LIMITS.SLUG.MIN &&
      slug.length <= VALIDATION_LIMITS.SLUG.MAX &&
      !slug.startsWith('-') &&
      !slug.endsWith('-')
    )
  }
}

// Array utilities
export const arrayUtils = {
  /**
   * Remove duplicates from an array
   */
  unique: <T>(array: T[]): T[] => {
    return [...new Set(array)]
  },

  /**
   * Group array items by a key
   */
  groupBy: <T>(array: T[], key: keyof T): Record<string, T[]> => {
    return array.reduce((groups, item) => {
      const group = String(item[key])
      groups[group] = groups[group] || []
      groups[group].push(item)
      return groups
    }, {} as Record<string, T[]>)
  },

  /**
   * Sort array by a key
   */
  sortBy: <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
    return [...array].sort((a, b) => {
      const aVal = a[key]
      const bVal = b[key]
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1
      if (aVal > bVal) return direction === 'asc' ? 1 : -1
      return 0
    })
  },

  /**
   * Chunk array into smaller arrays
   */
  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

// Object utilities
export const objectUtils = {
  /**
   * Pick specific keys from an object
   */
  pick: <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>
    keys.forEach((key) => {
      if (key in obj) {
        result[key] = obj[key]
      }
    })
    return result
  },

  /**
   * Omit specific keys from an object
   */
  omit: <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj }
    keys.forEach((key) => {
      delete result[key]
    })
    return result
  },

  /**
   * Check if an object is empty
   */
  isEmpty: (obj: object): boolean => {
    return Object.keys(obj).length === 0
  },

  /**
   * Deep merge two objects
   */
  deepMerge: <T>(target: T, source: Partial<T>): T => {
    const result = { ...target }
    
    for (const key in source) {
      const sourceValue = source[key]
      const targetValue = result[key]
      
      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = objectUtils.deepMerge(targetValue, sourceValue)
      } else {
        result[key] = sourceValue as T[keyof T]
      }
    }
    
    return result
  }
}

// API utilities
export const apiUtils = {
  /**
   * Build query string from object
   */
  buildQueryString: (params: Record<string, any>): string => {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, String(v)))
        } else {
          searchParams.append(key, String(value))
        }
      }
    })
    
    return searchParams.toString()
  },

  /**
   * Create API error from response
   */
  createApiError: (response: Response, message?: string): Error => {
    const error = new Error(message || `API Error: ${response.status}`)
    ;(error as any).status = response.status
    ;(error as any).statusText = response.statusText
    return error
  },

  /**
   * Retry a function with exponential backoff
   */
  retry: async <T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    try {
      return await fn()
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
        return apiUtils.retry(fn, retries - 1, delay * 2)
      }
      throw error
    }
  }
}

// Storage utilities
export const storageUtils = {
  /**
   * Get item from localStorage with JSON parsing
   */
  get: <T>(key: string, defaultValue?: T): T | null => {
    if (typeof window === 'undefined') return defaultValue || null
    
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue || null
    } catch {
      return defaultValue || null
    }
  },

  /**
   * Set item in localStorage with JSON stringification
   */
  set: (key: string, value: any): void => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn('Failed to set localStorage item:', error)
    }
  },

  /**
   * Remove item from localStorage
   */
  remove: (key: string): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  },

  /**
   * Clear all localStorage
   */
  clear: (): void => {
    if (typeof window === 'undefined') return
    localStorage.clear()
  }
}

// Business logic utilities
export const businessUtils = {
  /**
   * Get plan configuration by type
   */
  getPlan: (planType: PlanType) => {
    return PLANS[planType.toUpperCase() as keyof typeof PLANS]
  },

  /**
   * Check if user can perform action based on plan
   */
  canPerformAction: (
    currentPlan: PlanType,
    action: 'create_project' | 'invite_member',
    currentCount: number
  ): boolean => {
    const plan = businessUtils.getPlan(currentPlan)
    
    switch (action) {
      case 'create_project':
        return plan.limits.projects === -1 || currentCount < plan.limits.projects
      case 'invite_member':
        return plan.limits.members === -1 || currentCount < plan.limits.members
      default:
        return false
    }
  },

  /**
   * Get remaining quota for a plan
   */
  getRemainingQuota: (
    currentPlan: PlanType,
    type: 'projects' | 'members' | 'storage',
    currentUsage: number
  ): number | null => {
    const plan = businessUtils.getPlan(currentPlan)
    const limit = plan.limits[type]
    
    if (limit === -1) return null // unlimited
    return Math.max(0, limit - currentUsage)
  },

  /**
   * Check if user has permission for organization action
   */
  hasPermission: (
    userRole: OrganizationRole,
    action: string
  ): boolean => {
    const permissions = {
      owner: ['manage_organization', 'manage_members', 'manage_billing', 'manage_projects', 'view_analytics', 'delete_organization'],
      admin: ['manage_members', 'manage_projects', 'view_analytics'],
      member: ['view_projects', 'create_projects', 'edit_own_projects']
    }
    
    return permissions[userRole]?.includes(action) || false
  },

  /**
   * Get status badge props for different statuses
   */
  getStatusBadge: (status: ProjectStatus | SubscriptionStatus) => {
    const statusMap = {
      // Project statuses
      active: { color: 'green', label: 'Active' },
      archived: { color: 'yellow', label: 'Archived' },
      deleted: { color: 'red', label: 'Deleted' },
      
      // Subscription statuses
      incomplete: { color: 'yellow', label: 'Incomplete' },
      incomplete_expired: { color: 'red', label: 'Expired' },
      trialing: { color: 'blue', label: 'Trial' },
      past_due: { color: 'orange', label: 'Past Due' },
      canceled: { color: 'red', label: 'Canceled' },
      unpaid: { color: 'red', label: 'Unpaid' },
      paused: { color: 'gray', label: 'Paused' }
    }
    
    return statusMap[status as keyof typeof statusMap] || { color: 'gray', label: status }
  }
}

// Form utilities
export const formUtils = {
  /**
   * Get form field error message
   */
  getFieldError: (errors: any, fieldName: string): string | undefined => {
    const error = errors[fieldName]
    return error?.message || error?._errors?.[0]
  },

  /**
   * Check if form field has error
   */
  hasFieldError: (errors: any, fieldName: string): boolean => {
    return !!formUtils.getFieldError(errors, fieldName)
  },

  /**
   * Transform form data for API
   */
  transformFormData: (data: Record<string, any>): Record<string, any> => {
    const transformed = { ...data }
    
    // Remove empty strings and convert to null
    Object.keys(transformed).forEach((key) => {
      if (transformed[key] === '') {
        transformed[key] = null
      }
    })
    
    return transformed
  }
}

// Development utilities
export const devUtils = {
  /**
   * Log with timestamp (only in development)
   */
  log: (...args: any[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}]`, ...args)
    }
  },

  /**
   * Measure function execution time
   */
  time: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    if (process.env.NODE_ENV === 'development') {
      console.time(label)
    }
    const result = await fn()
    if (process.env.NODE_ENV === 'development') {
      console.timeEnd(label)
    }
    return result
  },

  /**
   * Create delay for testing
   */
  delay: (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Export all utilities
export const utils = {
  cn,
  date: dateUtils,
  format: formatUtils,
  string: stringUtils,
  validation: validationUtils,
  array: arrayUtils,
  object: objectUtils,
  api: apiUtils,
  storage: storageUtils,
  business: businessUtils,
  form: formUtils,
  dev: devUtils
} as const

// Re-export individual utilities for convenience
export {
  dateUtils,
  formatUtils,
  stringUtils,
  validationUtils,
  arrayUtils,
  objectUtils,
  apiUtils,
  storageUtils,
  businessUtils,
  formUtils,
  devUtils
}