// CREATED: 2025-07-01 - Lead capture form component for marketing module

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useLeadCapture } from '@/hooks/marketing/useLeadCapture'
import { useReferrals } from '@/hooks/marketing/useReferrals'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Mail, 
  User, 
  Gift, 
  Shield, 
  Check, 
  Loader2,
  X,
  Sparkles,
  Target,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CreateLeadCaptureRequest } from '@/shared/types/marketing'

// ================================================
// TYPES & INTERFACES
// ================================================

interface LeadCaptureFormProps {
  organizationId: string
  landingPageId?: string
  source?: string
  style?: 'popup' | 'inline' | 'sidebar' | 'minimal'
  size?: 'sm' | 'md' | 'lg'
  showPrivacyNote?: boolean
  showSocialProof?: boolean
  incentive?: {
    type: 'discount' | 'free_trial' | 'ebook' | 'custom'
    value?: string
    description?: string
  }
  onSuccess?: (lead: any) => void
  onClose?: () => void
  className?: string
  // A/B Testing props
  variant?: string
  testId?: string
}

interface FormData {
  email: string
  name?: string
  company?: string
  consent: boolean
}

interface FormErrors {
  email?: string
  name?: string
  company?: string
  consent?: string
}

// ================================================
// INCENTIVE CONFIGS
// ================================================

const INCENTIVE_CONFIGS = {
  discount: {
    icon: Gift,
    title: 'Get 20% Off',
    description: 'Unlock exclusive discount on your first purchase',
    badge: '20% OFF',
    color: 'text-green-600'
  },
  free_trial: {
    icon: Sparkles,
    title: 'Free 14-Day Trial',
    description: 'Try all premium features risk-free',
    badge: 'FREE TRIAL',
    color: 'text-blue-600'
  },
  ebook: {
    icon: Target,
    title: 'Free eBook',
    description: 'Download our complete growth guide',
    badge: 'FREE GUIDE',
    color: 'text-purple-600'
  },
  custom: {
    icon: Gift,
    title: 'Special Offer',
    description: 'Exclusive access to premium content',
    badge: 'EXCLUSIVE',
    color: 'text-orange-600'
  }
}

// ================================================
// FORM VALIDATION
// ================================================

const validateForm = (data: FormData): FormErrors => {
  const errors: FormErrors = {}

  // Email validation
  if (!data.email) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please enter a valid email address'
  }

  // Name validation (if provided)
  if (data.name && data.name.length < 2) {
    errors.name = 'Name must be at least 2 characters'
  }

  // Consent validation
  if (!data.consent) {
    errors.consent = 'Please accept our privacy policy'
  }

  return errors
}

// ================================================
// FORM STYLES
// ================================================

const getFormStyles = (style: string, size: string) => {
  const baseStyles = "bg-white rounded-lg shadow-lg border border-gray-200"
  
  const styleClasses = {
    popup: "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50",
    inline: "w-full",
    sidebar: "max-w-sm",
    minimal: "border-0 shadow-none bg-transparent"
  }

  const sizeClasses = {
    sm: "p-4 max-w-sm",
    md: "p-6 max-w-md", 
    lg: "p-8 max-w-lg"
  }

  return {
    container: styleClasses[style as keyof typeof styleClasses] || styleClasses.inline,
    form: cn(baseStyles, sizeClasses[size as keyof typeof sizeClasses])
  }
}

// ================================================
// MAIN COMPONENT
// ================================================

export function LeadCaptureForm({
  organizationId,
  landingPageId,
  source = 'direct',
  style = 'inline',
  size = 'md',
  showPrivacyNote = true,
  showSocialProof = true,
  incentive,
  onSuccess,
  onClose,
  variant,
  testId,
  className
}: LeadCaptureFormProps) {
  // Hooks
  const { captureLeads, loading, error } = useLeadCapture(organizationId)
  const { trackReferralClick } = useReferrals()

  // State
  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    company: '',
    consent: false
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)

  // Get referral code from URL if present
  const [referralCode, setReferralCode] = useState<string | null>(null)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const refCode = urlParams.get('ref')
      if (refCode) {
        setReferralCode(refCode)
      }
    }
  }, [])

  // Handle input changes
  const handleInputChange = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }, [formErrors])

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    const errors = validateForm(formData)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSubmitted(true)

    try {
      // Track referral click if referral code exists
      if (referralCode) {
        await trackReferralClick(referralCode)
      }

      // Capture lead
      const leadData: CreateLeadCaptureRequest = {
        organization_id: organizationId,
        email: formData.email,
        name: formData.name || undefined,
        company: formData.company || undefined,
        source,
        landing_page_id: landingPageId,
        metadata: {
          consent_given: formData.consent,
          referral_code: referralCode,
          form_variant: variant,
          test_id: testId,
          incentive_type: incentive?.type,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      }

      const { success, data } = await captureLeads([leadData])

      if (success && data) {
        setShowThankYou(true)
        onSuccess?.(data)

        // Reset form after delay
        setTimeout(() => {
          setFormData({
            email: '',
            name: '',
            company: '',
            consent: false
          })
          setIsSubmitted(false)
          setShowThankYou(false)
          
          // Close popup if it's a popup style
          if (style === 'popup') {
            onClose?.()
          }
        }, 3000)
      }
    } catch (err) {
      console.error('Lead capture failed:', err)
      setIsSubmitted(false)
    }
  }, [
    formData, 
    organizationId, 
    source, 
    landingPageId, 
    referralCode, 
    variant, 
    testId, 
    incentive,
    captureLeads, 
    trackReferralClick, 
    onSuccess, 
    onClose, 
    style
  ])

  // Get form styles
  const styles = getFormStyles(style, size)

  // Render thank you message
  if (showThankYou) {
    return (
      <div className={cn(styles.container, className)}>
        <div className={styles.form}>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Thank you for signing up!
            </h3>
            <p className="text-gray-600 mb-4">
              We've sent you a confirmation email. Check your inbox to get started.
            </p>
            {incentive && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  🎉 Your {incentive.description} is on the way!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Main form render
  return (
    <div className={cn(styles.container, className)}>
      <div className={styles.form}>
        {/* Close button for popup */}
        {style === 'popup' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          {incentive && (
            <div className="flex items-center justify-center mb-4">
              <Badge variant="secondary" className={cn("text-sm font-medium", INCENTIVE_CONFIGS[incentive.type]?.color)}>
                {INCENTIVE_CONFIGS[incentive.type]?.badge}
              </Badge>
            </div>
          )}
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {incentive ? INCENTIVE_CONFIGS[incentive.type]?.title : 'Join Our Newsletter'}
          </h2>
          
          <p className="text-gray-600">
            {incentive 
              ? INCENTIVE_CONFIGS[incentive.type]?.description 
              : 'Get the latest updates and exclusive content delivered to your inbox.'}
          </p>
        </div>

        {/* Social Proof */}
        {showSocialProof && (
          <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>Join 10,000+ subscribers</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors",
                  formErrors.email 
                    ? "border-red-300 bg-red-50" 
                    : "border-gray-300 focus:border-blue-500"
                )}
                disabled={loading}
                autoComplete="email"
              />
            </div>
            {formErrors.email && (
              <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
            )}
          </div>

          {/* Name Field (Optional) */}
          {size !== 'sm' && (
            <div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors",
                    formErrors.name 
                      ? "border-red-300 bg-red-50" 
                      : "border-gray-300 focus:border-blue-500"
                  )}
                  disabled={loading}
                  autoComplete="name"
                />
              </div>
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>
          )}

          {/* Company Field (Large size only) */}
          {size === 'lg' && (
            <div>
              <input
                type="text"
                placeholder="Company (optional)"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                className={cn(
                  "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors",
                  formErrors.company 
                    ? "border-red-300 bg-red-50" 
                    : "border-gray-300 focus:border-blue-500"
                )}
                disabled={loading}
                autoComplete="organization"
              />
              {formErrors.company && (
                <p className="mt-1 text-sm text-red-600">{formErrors.company}</p>
              )}
            </div>
          )}

          {/* Consent Checkbox */}
          {showPrivacyNote && (
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="consent"
                checked={formData.consent}
                onChange={(e) => handleInputChange('consent', e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <label htmlFor="consent" className="text-sm text-gray-600">
                I agree to receive emails and accept the{' '}
                <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                  privacy policy
                </a>
              </label>
            </div>
          )}
          
          {formErrors.consent && (
            <p className="text-sm text-red-600">{formErrors.consent}</p>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || isSubmitted}
            size="lg"
          >
            {loading || isSubmitted ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {incentive ? 'Claiming...' : 'Subscribing...'}
              </>
            ) : (
              <>
                {incentive ? `Get ${INCENTIVE_CONFIGS[incentive.type]?.badge}` : 'Subscribe Now'}
              </>
            )}
          </Button>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Privacy Note */}
          {showPrivacyNote && (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Shield className="h-3 w-3" />
              <span>We respect your privacy. Unsubscribe anytime.</span>
            </div>
          )}
        </form>

        {/* Referral Indicator */}
        {referralCode && (
          <div className="mt-4 text-center">
            <Badge variant="outline" className="text-xs">
              Referred by: {referralCode}
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}

// ================================================
// PRESET CONFIGURATIONS
// ================================================

// Popup Newsletter Signup
export function NewsletterPopup(props: Omit<LeadCaptureFormProps, 'style' | 'size'>) {
  return (
    <LeadCaptureForm
      {...props}
      style="popup"
      size="md"
      showSocialProof={true}
    />
  )
}

// Inline Lead Magnet
export function LeadMagnetForm(props: Omit<LeadCaptureFormProps, 'style' | 'incentive'>) {
  return (
    <LeadCaptureForm
      {...props}
      style="inline"
      size="lg"
      incentive={{
        type: 'ebook',
        description: 'Complete Growth Marketing Guide'
      }}
    />
  )
}

// Sidebar Minimal Form
export function SidebarForm(props: Omit<LeadCaptureFormProps, 'style' | 'size'>) {
  return (
    <LeadCaptureForm
      {...props}
      style="sidebar"
      size="sm"
      showSocialProof={false}
    />
  )
}

// Discount Offer Form
export function DiscountForm(props: Omit<LeadCaptureFormProps, 'incentive'>) {
  return (
    <LeadCaptureForm
      {...props}
      incentive={{
        type: 'discount',
        value: '20',
        description: '20% off your first purchase'
      }}
    />
  )
}