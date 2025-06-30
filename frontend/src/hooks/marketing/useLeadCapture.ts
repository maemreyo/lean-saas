// Lead Capture React Hook for Marketing & Growth Module
// Following patterns from billing module hooks

import { useState, useEffect, useCallback } from 'react'
import { 
  LeadCapture, 
  CreateLeadCaptureRequest
} from '@/types/marketing'
import { leadCaptureUtils } from '@/lib/marketing/lead-capture'
import { useToast } from '@/hooks/ui/use-toast'

// ================================================
// LEAD CAPTURE MANAGEMENT HOOK
// ================================================

export function useLeadCapture(organizationId: string) {
  const [leads, setLeads] = useState<LeadCapture[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<{
    total_leads: number
    new_leads: number
    unsubscribed: number
    active_subscribers: number
    conversion_rate: number
    top_sources: Array<{ source: string; count: number; percentage: number }>
    trends: {
      leads_change: number
      unsubscribe_rate_change: number
    }
  } | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0
  })
  const { toast } = useToast()

  // Fetch leads
  const fetchLeads = useCallback(async (options?: {
    source?: string
    landingPageId?: string
    subscribed?: boolean
    search?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }) => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      const { data, count, error } = await leadCaptureUtils.list(organizationId, {
        source: options?.source,
        landingPageId: options?.landingPageId,
        subscribed: options?.subscribed,
        search: options?.search,
        startDate: options?.startDate,
        endDate: options?.endDate,
        limit: options?.limit || pagination.limit,
        offset: options?.offset || pagination.offset
      })

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch leads',
          variant: 'destructive'
        })
        return
      }

      setLeads(data || [])
      setPagination(prev => ({
        ...prev,
        total: count || 0,
        limit: options?.limit || prev.limit,
        offset: options?.offset || prev.offset
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [organizationId, pagination.limit, pagination.offset, toast])

  // Capture lead
  const captureLead = useCallback(async (data: CreateLeadCaptureRequest) => {
    setLoading(true)
    setError(null)

    try {
      const { data: lead, error } = await leadCaptureUtils.capture(data)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to capture lead',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Add to local state if it's a new lead
      if (lead && !leads.find(l => l.email === lead.email)) {
        setLeads(prev => [lead, ...prev])
      }

      toast({
        title: 'Success',
        description: 'Lead captured successfully'
      })

      return { success: true, data: lead }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [leads, toast])

  // Update lead
  const updateLead = useCallback(async (
    id: string, 
    data: Partial<{ subscribed: boolean; metadata: Record<string, any> }>
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { data: updatedLead, error } = await leadCaptureUtils.update(id, data)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to update lead',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Update local state
      if (updatedLead) {
        setLeads(prev => 
          prev.map(lead => lead.id === id ? updatedLead : lead)
        )
        toast({
          title: 'Success',
          description: 'Lead updated successfully'
        })
      }

      return { success: true, data: updatedLead }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Unsubscribe lead
  const unsubscribeLead = useCallback(async (email: string) => {
    setLoading(true)
    setError(null)

    try {
      const { success, error } = await leadCaptureUtils.unsubscribe(email, organizationId)

      if (!success || error) {
        setError(error?.message || 'Failed to unsubscribe lead')
        toast({
          title: 'Error',
          description: 'Failed to unsubscribe lead',
          variant: 'destructive'
        })
        return { success: false }
      }

      // Update local state
      setLeads(prev => 
        prev.map(lead => 
          lead.email === email 
            ? { ...lead, subscribed: false, unsubscribed_at: new Date().toISOString() }
            : lead
        )
      )

      toast({
        title: 'Success',
        description: 'Lead unsubscribed successfully'
      })

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [organizationId, toast])

  // Delete lead
  const deleteLead = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const { success, error } = await leadCaptureUtils.delete(id)

      if (!success || error) {
        setError(error?.message || 'Failed to delete lead')
        toast({
          title: 'Error',
          description: 'Failed to delete lead',
          variant: 'destructive'
        })
        return { success: false }
      }

      // Remove from local state
      setLeads(prev => prev.filter(lead => lead.id !== id))
      toast({
        title: 'Success',
        description: 'Lead deleted successfully'
      })

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Fetch analytics
  const fetchAnalytics = useCallback(async (period: 'day' | 'week' | 'month' = 'month') => {
    if (!organizationId) return

    try {
      const { data, error } = await leadCaptureUtils.getAnalytics(organizationId, period)

      if (error) {
        console.warn('Failed to fetch lead analytics:', error.message)
        return
      }

      setAnalytics(data)
    } catch (err) {
      console.warn('Failed to fetch lead analytics:', err)
    }
  }, [organizationId])

  // Import leads from CSV
  const importLeads = useCallback(async (
    leadData: Array<{
      email: string
      name?: string
      source?: string
      metadata?: Record<string, any>
    }>
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await leadCaptureUtils.import(organizationId, leadData)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to import leads',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Refresh leads list
      fetchLeads()

      toast({
        title: 'Success',
        description: `Imported ${data?.imported || 0} leads successfully. ${data?.skipped || 0} skipped.`
      })

      return { success: true, data }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [organizationId, fetchLeads, toast])

  // Export leads to CSV
  const exportLeads = useCallback(async (options?: {
    source?: string
    subscribed?: boolean
    startDate?: string
    endDate?: string
  }) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await leadCaptureUtils.export(organizationId, options)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to export leads',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Create and download CSV file
      if (data) {
        const blob = new Blob([data], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }

      toast({
        title: 'Success',
        description: 'Leads exported successfully'
      })

      return { success: true, data }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setLoading(false)
    }
  }, [organizationId, toast])

  // Pagination handlers
  const nextPage = useCallback(() => {
    const newOffset = pagination.offset + pagination.limit
    if (newOffset < pagination.total) {
      fetchLeads({ offset: newOffset })
    }
  }, [pagination, fetchLeads])

  const prevPage = useCallback(() => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit)
    fetchLeads({ offset: newOffset })
  }, [pagination, fetchLeads])

  const goToPage = useCallback((page: number) => {
    const newOffset = (page - 1) * pagination.limit
    fetchLeads({ offset: newOffset })
  }, [pagination.limit, fetchLeads])

  // Auto-fetch on mount
  useEffect(() => {
    if (organizationId) {
      fetchLeads()
      fetchAnalytics()
    }
  }, []) // Only run on mount

  return {
    // Data
    leads,
    loading,
    error,
    analytics,
    pagination,
    
    // Actions
    fetchLeads,
    captureLead,
    updateLead,
    unsubscribeLead,
    deleteLead,
    fetchAnalytics,
    importLeads,
    exportLeads,
    
    // Pagination
    nextPage,
    prevPage,
    goToPage,
    
    // Computed values
    hasNextPage: pagination.offset + pagination.limit < pagination.total,
    hasPrevPage: pagination.offset > 0,
    currentPage: Math.floor(pagination.offset / pagination.limit) + 1,
    totalPages: Math.ceil(pagination.total / pagination.limit)
  }
}

// ================================================
// SINGLE LEAD HOOK
// ================================================

export function useLead(id: string | null) {
  const [lead, setLead] = useState<LeadCapture | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch lead
  const fetchLead = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await leadCaptureUtils.get(id)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch lead',
          variant: 'destructive'
        })
        return
      }

      setLead(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  // Auto-fetch on mount and id change
  useEffect(() => {
    if (id) {
      fetchLead()
    }
  }, [id]) // Only depend on id

  return {
    lead,
    loading,
    error,
    refetch: fetchLead
  }
}

// ================================================
// LEAD BY EMAIL HOOK
// ================================================

export function useLeadByEmail(email: string | null, organizationId: string) {
  const [lead, setLead] = useState<LeadCapture | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch lead by email
  const fetchLead = useCallback(async () => {
    if (!email || !organizationId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await leadCaptureUtils.getByEmail(email, organizationId)

      if (error) {
        setError(error.message)
        return
      }

      setLead(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [email, organizationId])

  // Auto-fetch on mount and params change
  useEffect(() => {
    if (email && organizationId) {
      fetchLead()
    }
  }, [email, organizationId]) // Depend on both email and organizationId

  return {
    lead,
    loading,
    error,
    refetch: fetchLead,
    exists: !!lead
  }
}

// ================================================
// LEAD CAPTURE FORM HOOK
// ================================================

export function useLeadCaptureForm(organizationId: string) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Submit lead capture form
  const submitForm = useCallback(async (data: {
    email: string
    name?: string
    source?: string
    landingPageId?: string
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
    utmContent?: string
    utmTerm?: string
    metadata?: Record<string, any>
  }) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const { data: lead, error } = await leadCaptureUtils.capture({
        organization_id: organizationId,
        email: data.email,
        name: data.name,
        source: data.source,
        landing_page_id: data.landingPageId,
        utm_source: data.utmSource,
        utm_medium: data.utmMedium,
        utm_campaign: data.utmCampaign,
        utm_content: data.utmContent,
        utm_term: data.utmTerm,
        metadata: data.metadata
      })

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to submit form. Please try again.',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      setSubmitted(true)
      toast({
        title: 'Success',
        description: 'Thank you for your interest! We\'ll be in touch soon.'
      })

      return { success: true, data: lead }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive'
      })
      return { success: false, data: null }
    } finally {
      setIsSubmitting(false)
    }
  }, [organizationId, toast])

  // Reset form state
  const reset = useCallback(() => {
    setSubmitted(false)
    setError(null)
  }, [])

  return {
    // State
    isSubmitting,
    submitted,
    error,
    
    // Actions
    submitForm,
    reset
  }
}