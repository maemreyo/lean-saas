// Email Campaigns React Hook for Marketing & Growth Module
// Following patterns from billing module hooks

import { useState, useEffect, useCallback } from 'react'
import { 
  EmailCampaign, 
  CreateEmailCampaignRequest, 
  UpdateEmailCampaignRequest,
  SendEmailCampaignRequest,
  EmailCampaignAnalytics
} from '@/types/marketing'
import { emailAutomationUtils } from '@/lib/marketing/email-automation'
import { useToast } from '@/hooks/ui/use-toast'

// ================================================
// EMAIL CAMPAIGNS MANAGEMENT HOOK
// ================================================

export function useEmailCampaigns(organizationId: string) {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgAnalytics, setOrgAnalytics] = useState<{
    total_campaigns: number
    total_emails_sent: number
    average_open_rate: number
    average_click_rate: number
    average_unsubscribe_rate: number
    recent_campaigns: EmailCampaign[]
  } | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0
  })
  const { toast } = useToast()

  // Fetch email campaigns
  const fetchCampaigns = useCallback(async (options?: {
    campaignType?: string
    status?: string
    limit?: number
    offset?: number
  }) => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      const { data, count, error } = await emailAutomationUtils.list(organizationId, {
        campaignType: options?.campaignType,
        status: options?.status,
        limit: options?.limit || pagination.limit,
        offset: options?.offset || pagination.offset
      })

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch email campaigns',
          variant: 'destructive'
        })
        return
      }

      setCampaigns(data || [])
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

  // Create email campaign
  const createCampaign = useCallback(async (data: CreateEmailCampaignRequest) => {
    setLoading(true)
    setError(null)

    try {
      const { data: campaign, error } = await emailAutomationUtils.create(data)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to create email campaign',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Add to local state
      if (campaign) {
        setCampaigns(prev => [campaign, ...prev])
        toast({
          title: 'Success',
          description: 'Email campaign created successfully'
        })
      }

      return { success: true, data: campaign }
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

  // Update email campaign
  const updateCampaign = useCallback(async (
    id: string, 
    data: UpdateEmailCampaignRequest
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { data: updatedCampaign, error } = await emailAutomationUtils.update(id, data)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to update email campaign',
          variant: 'destructive'
        })
        return { success: false, data: null }
      }

      // Update local state
      if (updatedCampaign) {
        setCampaigns(prev => 
          prev.map(campaign => campaign.id === id ? updatedCampaign : campaign)
        )
        toast({
          title: 'Success',
          description: 'Email campaign updated successfully'
        })
      }

      return { success: true, data: updatedCampaign }
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

  // Send email campaign
  const sendCampaign = useCallback(async (data: SendEmailCampaignRequest) => {
    setLoading(true)
    setError(null)

    try {
      const { success, error } = await emailAutomationUtils.send(data)

      if (!success || error) {
        setError(error?.message || 'Failed to send email campaign')
        toast({
          title: 'Error',
          description: 'Failed to send email campaign',
          variant: 'destructive'
        })
        return { success: false }
      }

      // Update campaign status in local state
      setCampaigns(prev => 
        prev.map(campaign => 
          campaign.id === data.campaign_id 
            ? { ...campaign, status: data.send_immediately ? 'sending' : 'scheduled' }
            : campaign
        )
      )

      toast({
        title: 'Success',
        description: data.send_immediately ? 'Email campaign sent successfully' : 'Email campaign scheduled successfully'
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

  // Schedule email campaign
  const scheduleCampaign = useCallback(async (
    campaignId: string, 
    scheduledAt: string
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { success, error } = await emailAutomationUtils.schedule(campaignId, scheduledAt)

      if (!success || error) {
        setError(error?.message || 'Failed to schedule email campaign')
        toast({
          title: 'Error',
          description: 'Failed to schedule email campaign',
          variant: 'destructive'
        })
        return { success: false }
      }

      // Update campaign in local state
      setCampaigns(prev => 
        prev.map(campaign => 
          campaign.id === campaignId 
            ? { ...campaign, status: 'scheduled', scheduled_at: scheduledAt }
            : campaign
        )
      )

      toast({
        title: 'Success',
        description: 'Email campaign scheduled successfully'
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

  // Pause email campaign
  const pauseCampaign = useCallback(async (campaignId: string) => {
    setLoading(true)
    setError(null)

    try {
      const { success, error } = await emailAutomationUtils.pause(campaignId)

      if (!success || error) {
        setError(error?.message || 'Failed to pause email campaign')
        toast({
          title: 'Error',
          description: 'Failed to pause email campaign',
          variant: 'destructive'
        })
        return { success: false }
      }

      // Update campaign in local state
      setCampaigns(prev => 
        prev.map(campaign => 
          campaign.id === campaignId 
            ? { ...campaign, status: 'paused' }
            : campaign
        )
      )

      toast({
        title: 'Success',
        description: 'Email campaign paused successfully'
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

  // Delete email campaign
  const deleteCampaign = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const { success, error } = await emailAutomationUtils.delete(id)

      if (!success || error) {
        setError(error?.message || 'Failed to delete email campaign')
        toast({
          title: 'Error',
          description: 'Failed to delete email campaign',
          variant: 'destructive'
        })
        return { success: false }
      }

      // Remove from local state
      setCampaigns(prev => prev.filter(campaign => campaign.id !== id))
      toast({
        title: 'Success',
        description: 'Email campaign deleted successfully'
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

  // Fetch organization analytics
  const fetchOrgAnalytics = useCallback(async (period: 'day' | 'week' | 'month' = 'month') => {
    if (!organizationId) return

    try {
      const { data, error } = await emailAutomationUtils.getOrgAnalytics(organizationId, period)

      if (error) {
        console.warn('Failed to fetch email analytics:', error.message)
        return
      }

      setOrgAnalytics(data)
    } catch (err) {
      console.warn('Failed to fetch email analytics:', err)
    }
  }, [organizationId])

  // Create campaign from template
  const createFromTemplate = useCallback(async (
    templateType: 'welcome' | 'newsletter' | 'promotional' | 'drip',
    customData: {
      name: string
      subject?: string
      recipientName?: string
      organizationName: string
      unsubscribeUrl: string
      [key: string]: any
    }
  ) => {
    const template = emailAutomationUtils.getTemplate(templateType, customData)
    
    return await createCampaign({
      organization_id: organizationId,
      name: customData.name,
      subject: customData.subject || template.subject,
      content: template.content,
      campaign_type: templateType === 'newsletter' ? 'newsletter' : 
                     templateType === 'welcome' ? 'welcome' :
                     templateType === 'promotional' ? 'promotional' : 'drip'
    })
  }, [organizationId, createCampaign])

  // Pagination handlers
  const nextPage = useCallback(() => {
    const newOffset = pagination.offset + pagination.limit
    if (newOffset < pagination.total) {
      fetchCampaigns({ offset: newOffset })
    }
  }, [pagination, fetchCampaigns])

  const prevPage = useCallback(() => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit)
    fetchCampaigns({ offset: newOffset })
  }, [pagination, fetchCampaigns])

  const goToPage = useCallback((page: number) => {
    const newOffset = (page - 1) * pagination.limit
    fetchCampaigns({ offset: newOffset })
  }, [pagination.limit, fetchCampaigns])

  // Auto-fetch on mount
  useEffect(() => {
    if (organizationId) {
      fetchCampaigns()
      fetchOrgAnalytics()
    }
  }, []) // Only run on mount

  return {
    // Data
    campaigns,
    loading,
    error,
    orgAnalytics,
    pagination,
    
    // Actions
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    sendCampaign,
    scheduleCampaign,
    pauseCampaign,
    deleteCampaign,
    fetchOrgAnalytics,
    createFromTemplate,
    
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
// SINGLE EMAIL CAMPAIGN HOOK
// ================================================

export function useEmailCampaign(id: string | null) {
  const [campaign, setCampaign] = useState<EmailCampaign | null>(null)
  const [analytics, setAnalytics] = useState<EmailCampaignAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch campaign
  const fetchCampaign = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await emailAutomationUtils.get(id)

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch email campaign',
          variant: 'destructive'
        })
        return
      }

      setCampaign(data)
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

  // Fetch campaign analytics
  const fetchAnalytics = useCallback(async () => {
    if (!id) return

    try {
      const { data, error } = await emailAutomationUtils.getAnalytics(id)

      if (error) {
        console.warn('Failed to fetch campaign analytics:', error.message)
        return
      }

      setAnalytics(data)
    } catch (err) {
      console.warn('Failed to fetch campaign analytics:', err)
    }
  }, [id])

  // Auto-fetch on mount and id change
  useEffect(() => {
    if (id) {
      fetchCampaign()
      fetchAnalytics()
    }
  }, [id]) // Only depend on id

  return {
    // Data
    campaign,
    analytics,
    loading,
    error,
    
    // Actions
    fetchCampaign,
    fetchAnalytics,
    
    // Helpers
    refetch: fetchCampaign,
    refreshAnalytics: fetchAnalytics
  }
}

// ================================================
// EMAIL TRACKING HOOK
// ================================================

export function useEmailTracking() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track email delivery
  const trackDelivery = useCallback(async (
    campaignId: string,
    email: string,
    status: 'delivered' | 'bounced',
    metadata?: Record<string, any>
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { success, error } = await emailAutomationUtils.trackDelivery(
        campaignId, 
        email, 
        status, 
        metadata
      )

      if (!success || error) {
        setError(error?.message || 'Failed to track email delivery')
        return { success: false }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [])

  // Track email open
  const trackOpen = useCallback(async (
    campaignId: string,
    email: string,
    metadata?: Record<string, any>
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { success, error } = await emailAutomationUtils.trackOpen(
        campaignId, 
        email, 
        metadata
      )

      if (!success || error) {
        setError(error?.message || 'Failed to track email open')
        return { success: false }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [])

  // Track email click
  const trackClick = useCallback(async (
    campaignId: string,
    email: string,
    url: string,
    metadata?: Record<string, any>
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { success, error } = await emailAutomationUtils.trackClick(
        campaignId, 
        email, 
        url, 
        metadata
      )

      if (!success || error) {
        setError(error?.message || 'Failed to track email click')
        return { success: false }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [])

  // Track email unsubscribe
  const trackUnsubscribe = useCallback(async (
    campaignId: string,
    email: string
  ) => {
    setLoading(true)
    setError(null)

    try {
      const { success, error } = await emailAutomationUtils.trackUnsubscribe(
        campaignId, 
        email
      )

      if (!success || error) {
        setError(error?.message || 'Failed to track email unsubscribe')
        return { success: false }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    trackDelivery,
    trackOpen,
    trackClick,
    trackUnsubscribe
  }
}

// ================================================
// EMAIL TEMPLATES HOOK
// ================================================

export function useEmailTemplates() {
  const [templates, setTemplates] = useState<{
    welcome: { subject: string; content: string }
    newsletter: { subject: string; content: string }
    promotional: { subject: string; content: string }
    drip: { subject: string; content: string }
  } | null>(null)

  // Get template by type
  const getTemplate = useCallback((
    type: 'welcome' | 'newsletter' | 'promotional' | 'drip',
    data: {
      recipientName?: string
      organizationName: string
      unsubscribeUrl: string
      [key: string]: any
    }
  ) => {
    return emailAutomationUtils.getTemplate(type, data)
  }, [])

  // Get all templates
  const getAllTemplates = useCallback((data: {
    recipientName?: string
    organizationName: string
    unsubscribeUrl: string
    [key: string]: any
  }) => {
    const welcomeTemplate = getTemplate('welcome', data)
    const newsletterTemplate = getTemplate('newsletter', data)
    const promotionalTemplate = getTemplate('promotional', data)
    const dripTemplate = getTemplate('drip', data)

    const allTemplates = {
      welcome: welcomeTemplate,
      newsletter: newsletterTemplate,
      promotional: promotionalTemplate,
      drip: dripTemplate
    }

    setTemplates(allTemplates)
    return allTemplates
  }, [getTemplate])

  return {
    templates,
    getTemplate,
    getAllTemplates
  }
}