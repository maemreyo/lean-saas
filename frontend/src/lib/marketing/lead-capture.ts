// Lead Capture utilities for Marketing & Growth Module
// Following patterns from billing module utilities

import { supabase } from '@/lib/supabase'
import { 
  LeadCapture, 
  LeadCaptureInsert, 
  LeadCaptureUpdate,
  CreateLeadCaptureRequest,
  UTMParameters
} from '@/types/marketing'
import { 
  createLeadCaptureSchema,
  updateLeadCaptureSchema 
} from '@/schemas/marketing'
import { createError, handleSupabaseError } from '@/lib/utils'

// ================================================
// LEAD CAPTURE MANAGEMENT
// ================================================

/**
 * Capture a new lead
 */
export const captureLead = async (
  data: CreateLeadCaptureRequest
): Promise<{ data: LeadCapture | null; error: Error | null }> => {
  try {
    // Validate input data
    const validation = createLeadCaptureSchema.safeParse(data)
    if (!validation.success) {
      return { 
        data: null, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Check if email already exists for this organization
    const { data: existingLead } = await supabase
      .from('lead_captures')
      .select('id, subscribed')
      .eq('organization_id', data.organization_id)
      .eq('email', data.email)
      .single()

    // If lead exists and is still subscribed, return existing record
    if (existingLead && existingLead.subscribed) {
      const { data: lead, error } = await supabase
        .from('lead_captures')
        .select('*')
        .eq('id', existingLead.id)
        .single()

      if (error) {
        return { data: null, error: handleSupabaseError(error) }
      }

      return { data: lead, error: null }
    }

    // If lead exists but unsubscribed, resubscribe them
    if (existingLead && !existingLead.subscribed) {
      const { data: lead, error } = await supabase
        .from('lead_captures')
        .update({
          subscribed: true,
          name: data.name || null,
          source: data.source || null,
          landing_page_id: data.landing_page_id || null,
          utm_source: data.utm_source || null,
          utm_medium: data.utm_medium || null,
          utm_campaign: data.utm_campaign || null,
          utm_content: data.utm_content || null,
          utm_term: data.utm_term || null,
          metadata: data.metadata || {},
          unsubscribed_at: null
        })
        .eq('id', existingLead.id)
        .select()
        .single()

      if (error) {
        return { data: null, error: handleSupabaseError(error) }
      }

      // Track resubscription metric
      await trackLeadMetric(data.organization_id, 'resubscription', data.source)

      return { data: lead, error: null }
    }

    // Create new lead
    const { data: lead, error } = await supabase
      .from('lead_captures')
      .insert({
        organization_id: data.organization_id,
        email: data.email,
        name: data.name,
        source: data.source,
        landing_page_id: data.landing_page_id,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_content: data.utm_content,
        utm_term: data.utm_term,
        metadata: data.metadata || {},
        subscribed: true
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    // Track lead capture metric
    await trackLeadMetric(data.organization_id, 'signup', data.source, {
      landing_page_id: data.landing_page_id,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign
    })

    // Track conversion for landing page if applicable
    if (data.landing_page_id) {
      const { trackConversion } = await import('./landing-pages')
      await trackConversion(data.landing_page_id, 'lead_capture', 1)
    }

    return { data: lead, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to capture lead', error) 
    }
  }
}

/**
 * Update a lead
 */
export const updateLead = async (
  id: string,
  data: Partial<LeadCaptureUpdate>
): Promise<{ data: LeadCapture | null; error: Error | null }> => {
  try {
    // Validate input data
    const validation = updateLeadCaptureSchema.safeParse(data)
    if (!validation.success) {
      return { 
        data: null, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Update lead
    const { data: lead, error } = await supabase
      .from('lead_captures')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: lead, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to update lead', error) 
    }
  }
}

/**
 * Unsubscribe a lead
 */
export const unsubscribeLead = async (
  email: string,
  organizationId: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('lead_captures')
      .update({
        subscribed: false,
        unsubscribed_at: new Date().toISOString()
      })
      .eq('email', email)
      .eq('organization_id', organizationId)

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    // Track unsubscription metric
    await trackLeadMetric(organizationId, 'unsubscription')

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to unsubscribe lead', error) 
    }
  }
}

/**
 * Delete a lead
 */
export const deleteLead = async (
  id: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('lead_captures')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to delete lead', error) 
    }
  }
}

/**
 * Get lead by ID
 */
export const getLead = async (
  id: string
): Promise<{ data: LeadCapture | null; error: Error | null }> => {
  try {
    const { data: lead, error } = await supabase
      .from('lead_captures')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: lead, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get lead', error) 
    }
  }
}

/**
 * Get lead by email
 */
export const getLeadByEmail = async (
  email: string,
  organizationId: string
): Promise<{ data: LeadCapture | null; error: Error | null }> => {
  try {
    const { data: lead, error } = await supabase
      .from('lead_captures')
      .select('*')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: lead, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get lead', error) 
    }
  }
}

/**
 * List leads for an organization
 */
export const listLeads = async (
  organizationId: string,
  options: {
    source?: string
    landingPageId?: string
    subscribed?: boolean
    search?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  } = {}
): Promise<{ 
  data: LeadCapture[] | null; 
  count: number | null;
  error: Error | null 
}> => {
  try {
    let query = supabase
      .from('lead_captures')
      .select('*, count', { count: 'exact' })
      .eq('organization_id', organizationId)

    // Apply filters
    if (options.source) {
      query = query.eq('source', options.source)
    }
    if (options.landingPageId) {
      query = query.eq('landing_page_id', options.landingPageId)
    }
    if (options.subscribed !== undefined) {
      query = query.eq('subscribed', options.subscribed)
    }
    if (options.search) {
      query = query.or(`email.ilike.%${options.search}%,name.ilike.%${options.search}%`)
    }
    if (options.startDate) {
      query = query.gte('created_at', options.startDate)
    }
    if (options.endDate) {
      query = query.lte('created_at', options.endDate)
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit)
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    // Order by creation date
    query = query.order('created_at', { ascending: false })

    const { data: leads, error, count } = await query

    if (error) {
      return { data: null, count: null, error: handleSupabaseError(error) }
    }

    return { data: leads, count, error: null }
  } catch (error) {
    return { 
      data: null, 
      count: null,
      error: createError('Failed to list leads', error) 
    }
  }
}

// ================================================
// ANALYTICS & TRACKING
// ================================================

/**
 * Track lead-related metrics
 */
const trackLeadMetric = async (
  organizationId: string,
  metricType: 'signup' | 'unsubscription' | 'resubscription',
  source?: string,
  dimensions: Record<string, any> = {}
): Promise<void> => {
  try {
    await supabase
      .from('growth_metrics')
      .insert({
        organization_id: organizationId,
        metric_type: metricType,
        metric_value: 1,
        dimensions: {
          source,
          ...dimensions
        }
      })
  } catch (error) {
    console.warn('Failed to track lead metric:', error)
  }
}

/**
 * Get lead analytics
 */
export const getLeadAnalytics = async (
  organizationId: string,
  period: 'day' | 'week' | 'month' = 'month'
): Promise<{ 
  data: {
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
  } | null; 
  error: Error | null 
}> => {
  try {
    // Calculate date ranges
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1)
        break
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1)
        break
    }

    // Get total leads
    const { count: totalLeads } = await supabase
      .from('lead_captures')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    // Get new leads in period
    const { count: newLeads } = await supabase
      .from('lead_captures')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Get unsubscribed leads in period
    const { count: unsubscribed } = await supabase
      .from('lead_captures')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('subscribed', false)
      .gte('unsubscribed_at', startDate.toISOString())
      .lte('unsubscribed_at', endDate.toISOString())

    // Get active subscribers
    const { count: activeSubscribers } = await supabase
      .from('lead_captures')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('subscribed', true)

    // Get page views for conversion rate calculation
    const { data: pageViewMetrics } = await supabase
      .from('growth_metrics')
      .select('metric_value')
      .eq('organization_id', organizationId)
      .eq('metric_type', 'page_view')
      .gte('date_recorded', startDate.toISOString().split('T')[0])
      .lte('date_recorded', endDate.toISOString().split('T')[0])

    const totalPageViews = pageViewMetrics?.reduce((sum, m) => sum + m.metric_value, 0) || 0
    const conversionRate = totalPageViews > 0 ? (newLeads || 0) / totalPageViews * 100 : 0

    // Get top sources
    const { data: sourceData } = await supabase
      .from('lead_captures')
      .select('source')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('source', 'is', null)

    const sourceCounts: Record<string, number> = {}
    sourceData?.forEach(item => {
      if (item.source) {
        sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1
      }
    })

    const topSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({
        source,
        count,
        percentage: newLeads ? (count / newLeads) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Calculate trends (previous period comparison)
    const prevEndDate = new Date(startDate)
    const prevStartDate = new Date(startDate)
    
    switch (period) {
      case 'day':
        prevStartDate.setDate(prevStartDate.getDate() - 1)
        break
      case 'week':
        prevStartDate.setDate(prevStartDate.getDate() - 7)
        break
      case 'month':
        prevStartDate.setMonth(prevStartDate.getMonth() - 1)
        break
    }

    const { count: prevNewLeads } = await supabase
      .from('lead_captures')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', prevEndDate.toISOString())

    const { count: prevUnsubscribed } = await supabase
      .from('lead_captures')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('subscribed', false)
      .gte('unsubscribed_at', prevStartDate.toISOString())
      .lt('unsubscribed_at', prevEndDate.toISOString())

    const leadsChange = prevNewLeads ? ((newLeads || 0) - prevNewLeads) / prevNewLeads * 100 : 0
    const unsubscribeRateChange = prevUnsubscribed && prevNewLeads 
      ? (((unsubscribed || 0) / (newLeads || 1)) - (prevUnsubscribed / prevNewLeads)) * 100 
      : 0

    return {
      data: {
        total_leads: totalLeads || 0,
        new_leads: newLeads || 0,
        unsubscribed: unsubscribed || 0,
        active_subscribers: activeSubscribers || 0,
        conversion_rate: conversionRate,
        top_sources: topSources,
        trends: {
          leads_change: leadsChange,
          unsubscribe_rate_change: unsubscribeRateChange
        }
      },
      error: null
    }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get lead analytics', error) 
    }
  }
}

// ================================================
// BULK OPERATIONS
// ================================================

/**
 * Import leads from CSV data
 */
export const importLeads = async (
  organizationId: string,
  leads: Array<{
    email: string
    name?: string
    source?: string
    metadata?: Record<string, any>
  }>
): Promise<{ 
  data: { 
    imported: number; 
    skipped: number; 
    errors: string[] 
  } | null; 
  error: Error | null 
}> => {
  try {
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    }

    for (const leadData of leads) {
      try {
        const { error } = await captureLead({
          organization_id: organizationId,
          email: leadData.email,
          name: leadData.name,
          source: leadData.source || 'import',
          metadata: leadData.metadata
        })

        if (error) {
          results.errors.push(`${leadData.email}: ${error.message}`)
          results.skipped++
        } else {
          results.imported++
        }
      } catch (error) {
        results.errors.push(`${leadData.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        results.skipped++
      }
    }

    return { data: results, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to import leads', error) 
    }
  }
}

/**
 * Export leads to CSV format
 */
export const exportLeads = async (
  organizationId: string,
  options: {
    source?: string
    subscribed?: boolean
    startDate?: string
    endDate?: string
  } = {}
): Promise<{ data: string | null; error: Error | null }> => {
  try {
    const { data: leads, error } = await listLeads(organizationId, {
      ...options,
      limit: 10000 // Large limit for export
    })

    if (error || !leads) {
      return { data: null, error: error || createError('No leads found') }
    }

    // Convert to CSV format
    const headers = ['Email', 'Name', 'Source', 'Subscribed', 'Created At', 'UTM Source', 'UTM Medium', 'UTM Campaign']
    const csvRows = [
      headers.join(','),
      ...leads.map(lead => [
        lead.email,
        lead.name || '',
        lead.source || '',
        lead.subscribed ? 'Yes' : 'No',
        lead.created_at,
        lead.utm_source || '',
        lead.utm_medium || '',
        lead.utm_campaign || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ]

    return { data: csvRows.join('\n'), error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to export leads', error) 
    }
  }
}

// Export all utilities
export const leadCaptureUtils = {
  capture: captureLead,
  update: updateLead,
  unsubscribe: unsubscribeLead,
  delete: deleteLead,
  get: getLead,
  getByEmail: getLeadByEmail,
  list: listLeads,
  getAnalytics: getLeadAnalytics,
  import: importLeads,
  export: exportLeads
}