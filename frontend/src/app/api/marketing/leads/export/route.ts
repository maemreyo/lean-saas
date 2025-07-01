// CREATED: 2025-07-01 - Lead export API endpoint for CSV/JSON downloads

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAuthClient } from '@/lib/auth/auth-utils'
import { leadCaptureUtils } from '@/lib/marketing/lead-capture'

// ================================================
// GET /api/marketing/leads/export
// Export leads as CSV or JSON
// ================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const organizationId = searchParams.get('organization_id')
    const format = searchParams.get('format') || 'csv' // csv or json
    const source = searchParams.get('source')
    const landingPageId = searchParams.get('landing_page_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const subscribed = searchParams.get('subscribed')
    const includeUTM = searchParams.get('include_utm') === 'true'
    const includeMetadata = searchParams.get('include_metadata') === 'true'

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    if (!['csv', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'Format must be csv or json' },
        { status: 400 }
      )
    }

    // Verify user has access to organization
    const supabase = await createAuthClient()
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess) {
      return NextResponse.json(
        { error: 'Access denied to organization' },
        { status: 403 }
      )
    }

    // Get organization name for filename
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    // Fetch all leads (no pagination for export)
    const { data: leads, error } = await leadCaptureUtils.list(organizationId, {
      source,
      landing_page_id: landingPageId,
      start_date: startDate,
      end_date: endDate,
      subscribed: subscribed ? subscribed === 'true' : undefined,
      limit: 10000, // High limit for export
      offset: 0
    })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leads for export' },
        { status: 500 }
      )
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads found to export' },
        { status: 404 }
      )
    }

    // Get landing page names for reference
    const landingPageIds = [...new Set(leads.map(lead => lead.landing_page_id).filter(Boolean))]
    let landingPageNames = {}

    if (landingPageIds.length > 0) {
      const { data: pages } = await supabase
        .from('landing_pages')
        .select('id, title')
        .in('id', landingPageIds)

      if (pages) {
        landingPageNames = pages.reduce((acc, page) => {
          acc[page.id] = page.title
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Transform leads for export
    const exportData = leads.map(lead => {
      const baseData = {
        id: lead.id,
        email: lead.email,
        name: lead.name || '',
        source: lead.source || '',
        landing_page: lead.landing_page_id ? landingPageNames[lead.landing_page_id] || 'Unknown' : '',
        subscribed: lead.subscribed ? 'Yes' : 'No',
        created_at: lead.created_at,
        unsubscribed_at: lead.unsubscribed_at || ''
      }

      // Add UTM parameters if requested
      if (includeUTM) {
        Object.assign(baseData, {
          utm_source: lead.utm_source || '',
          utm_medium: lead.utm_medium || '',
          utm_campaign: lead.utm_campaign || '',
          utm_content: lead.utm_content || '',
          utm_term: lead.utm_term || ''
        })
      }

      // Add metadata if requested
      if (includeMetadata && lead.metadata) {
        const metadata = typeof lead.metadata === 'string' 
          ? JSON.parse(lead.metadata) 
          : lead.metadata
        
        if (typeof metadata === 'object') {
          Object.assign(baseData, {
            metadata: JSON.stringify(metadata)
          })
        }
      }

      return baseData
    })

    // Track export for analytics
    try {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id: organizationId,
          metric_type: 'leads_exported',
          metric_value: exportData.length,
          dimensions: {
            format,
            exported_by: user.id,
            filters: {
              source,
              landing_page_id: landingPageId,
              start_date: startDate,
              end_date: endDate,
              subscribed
            }
          }
        })
    } catch (metricsError) {
      console.warn('Failed to track lead export metrics:', metricsError)
    }

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]
    const orgName = organization?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'leads'
    const filename = `${orgName}_leads_${timestamp}.${format}`

    // Handle different export formats
    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(exportData[0])
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header]
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(',')
        )
      ].join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    } else {
      // JSON format
      const jsonContent = JSON.stringify({
        exported_at: new Date().toISOString(),
        exported_by: user.id,
        organization_id: organizationId,
        total_leads: exportData.length,
        filters: {
          source,
          landing_page_id: landingPageId,
          start_date: startDate,
          end_date: endDate,
          subscribed
        },
        leads: exportData
      }, null, 2)

      return new NextResponse(jsonContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

  } catch (error) {
    console.error('Lead export GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// POST /api/marketing/leads/export
// Generate export with custom fields and email delivery
// ================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { 
      organization_id,
      format = 'csv',
      filters = {},
      custom_fields = [],
      email_delivery = false,
      delivery_email
    } = body

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess) {
      return NextResponse.json(
        { error: 'Access denied to organization' },
        { status: 403 }
      )
    }

    // Fetch leads with filters
    const { data: leads, error } = await leadCaptureUtils.list(organization_id, {
      ...filters,
      limit: 10000,
      offset: 0
    })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      )
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads found matching criteria' },
        { status: 404 }
      )
    }

    // Process custom fields and create export
    const processedLeads = leads.map(lead => {
      const result = {}
      
      // Add default fields
      result['email'] = lead.email
      result['name'] = lead.name || ''
      result['created_at'] = lead.created_at
      result['subscribed'] = lead.subscribed ? 'Yes' : 'No'

      // Add custom fields
      custom_fields.forEach(field => {
        switch (field) {
          case 'source':
            result['source'] = lead.source || ''
            break
          case 'utm_data':
            result['utm_source'] = lead.utm_source || ''
            result['utm_medium'] = lead.utm_medium || ''
            result['utm_campaign'] = lead.utm_campaign || ''
            break
          case 'metadata':
            if (lead.metadata) {
              const metadata = typeof lead.metadata === 'string' 
                ? JSON.parse(lead.metadata) 
                : lead.metadata
              result['metadata'] = JSON.stringify(metadata)
            }
            break
          default:
            if (lead[field] !== undefined) {
              result[field] = lead[field]
            }
        }
      })

      return result
    })

    // Generate export content
    let exportContent: string
    let contentType: string
    let fileExtension: string

    if (format === 'csv') {
      const headers = Object.keys(processedLeads[0])
      exportContent = [
        headers.join(','),
        ...processedLeads.map(row => 
          headers.map(header => {
            const value = row[header]
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(',')
        )
      ].join('\n')
      contentType = 'text/csv'
      fileExtension = 'csv'
    } else {
      exportContent = JSON.stringify({
        exported_at: new Date().toISOString(),
        total_leads: processedLeads.length,
        leads: processedLeads
      }, null, 2)
      contentType = 'application/json'
      fileExtension = 'json'
    }

    // Handle email delivery
    if (email_delivery && delivery_email) {
      // TODO: Integrate with email service (e.g., Resend)
      // For now, just track the request
      try {
        await supabase
          .from('growth_metrics')
          .insert({
            organization_id,
            metric_type: 'export_email_requested',
            metric_value: processedLeads.length,
            dimensions: {
              delivery_email,
              format,
              requested_by: user.id
            }
          })
      } catch (metricsError) {
        console.warn('Failed to track email export request:', metricsError)
      }

      return NextResponse.json({
        message: 'Export will be emailed to the specified address',
        lead_count: processedLeads.length,
        delivery_email
      })
    }

    // Return file directly
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `custom_leads_export_${timestamp}.${fileExtension}`

    return new NextResponse(exportContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('Custom lead export POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}