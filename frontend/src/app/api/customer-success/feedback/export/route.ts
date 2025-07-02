import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const organizationId = searchParams.get('organization_id')
    const feedbackType = searchParams.get('type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const format = searchParams.get('format') || 'json' // json, csv, xlsx
    const includeAnalytics = searchParams.get('include_analytics')

    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Build query for feedback export
    let query = supabase
      .from('user_feedback')
      .select(`
        id,
        feedback_type,
        rating,
        comment,
        sentiment,
        context,
        metadata,
        submitted_at,
        created_at,
        survey_id,
        organization_id
      `)

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      query = query.eq('user_id', user.id)
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (feedbackType) {
      query = query.eq('feedback_type', feedbackType)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Order by date
    query = query.order('created_at', { ascending: false })

    const { data: feedbackData, error } = await query

    if (error) {
      console.error('Error fetching feedback for export:', error)
      return NextResponse.json(
        { error: 'Failed to fetch feedback data' }, 
        { status: 500 }
      )
    }

    if (!feedbackData || feedbackData.length === 0) {
      return NextResponse.json(
        { error: 'No feedback data found for the specified criteria' }, 
        { status: 404 }
      )
    }

    // Process data based on format
    let exportData
    let responseHeaders: Record<string, string> = {}

    switch (format.toLowerCase()) {
      case 'csv':
        exportData = await generateCSVExport(feedbackData, includeAnalytics === 'true', supabase)
        responseHeaders = {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="feedback-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
        break

      case 'xlsx':
        exportData = await generateExcelExport(feedbackData, includeAnalytics === 'true', supabase)
        responseHeaders = {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="feedback-export-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
        break

      case 'json':
      default:
        exportData = await generateJSONExport(feedbackData, includeAnalytics === 'true', supabase)
        responseHeaders = {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="feedback-export-${new Date().toISOString().split('T')[0]}.json"`
        }
        break
    }

    // Log export event
    await logExportEvent(user.id, {
      format,
      record_count: feedbackData.length,
      filters: { feedbackType, startDate, endDate, organizationId }
    }, supabase)

    return new Response(exportData, {
      status: 200,
      headers: responseHeaders
    })

  } catch (error) {
    console.error('Feedback export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to generate CSV export
async function generateCSVExport(data: any[], includeAnalytics: boolean, supabase: any): Promise<string> {
  const headers = [
    'ID',
    'Type',
    'Rating',
    'Comment',
    'Sentiment',
    'Context',
    'Survey ID',
    'Submitted Date',
    'Created Date'
  ]

  let csvContent = headers.join(',') + '\n'

  for (const row of data) {
    const csvRow = [
      `"${row.id}"`,
      `"${row.feedback_type || ''}"`,
      `"${row.rating || ''}"`,
      `"${(row.comment || '').replace(/"/g, '""')}"`, // Escape quotes
      `"${row.sentiment || ''}"`,
      `"${row.context || ''}"`,
      `"${row.survey_id || ''}"`,
      `"${row.submitted_at || ''}"`,
      `"${row.created_at || ''}"`
    ]
    csvContent += csvRow.join(',') + '\n'
  }

  // Add analytics summary if requested
  if (includeAnalytics) {
    const analytics = await calculateExportAnalytics(data)
    csvContent += '\n\nAnalytics Summary:\n'
    csvContent += `Total Records,${data.length}\n`
    csvContent += `Average Rating,${analytics.averageRating}\n`
    csvContent += `Sentiment Distribution:\n`
    Object.entries(analytics.sentimentDistribution).forEach(([sentiment, count]) => {
      csvContent += `${sentiment},${count}\n`
    })
  }

  return csvContent
}

// Helper function to generate Excel export (simplified - would need a proper Excel library)
async function generateExcelExport(data: any[], includeAnalytics: boolean, supabase: any): Promise<string> {
  // For now, return CSV format - in production, use a library like ExcelJS
  return generateCSVExport(data, includeAnalytics, supabase)
}

// Helper function to generate JSON export
async function generateJSONExport(data: any[], includeAnalytics: boolean, supabase: any): Promise<string> {
  const exportObject: any = {
    metadata: {
      exported_at: new Date().toISOString(),
      total_records: data.length,
      export_format: 'json'
    },
    feedback_data: data
  }

  if (includeAnalytics) {
    exportObject.analytics = await calculateExportAnalytics(data)
  }

  return JSON.stringify(exportObject, null, 2)
}

// Helper function to calculate analytics for export
async function calculateExportAnalytics(data: any[]) {
  const totalRecords = data.length
  
  // Calculate average rating
  const ratingsData = data.filter(d => d.rating !== null && d.rating !== undefined)
  const averageRating = ratingsData.length > 0 
    ? ratingsData.reduce((sum, d) => sum + d.rating, 0) / ratingsData.length 
    : 0

  // Calculate sentiment distribution
  const sentimentDistribution = data.reduce((acc, d) => {
    const sentiment = d.sentiment || 'unknown'
    acc[sentiment] = (acc[sentiment] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Calculate type distribution
  const typeDistribution = data.reduce((acc, d) => {
    acc[d.feedback_type] = (acc[d.feedback_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Calculate temporal distribution (by month)
  const temporalDistribution = data.reduce((acc, d) => {
    const month = new Date(d.created_at).toISOString().slice(0, 7) // YYYY-MM
    acc[month] = (acc[month] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Calculate NPS if applicable
  const npsData = data.filter(d => d.feedback_type === 'nps' && d.rating !== null)
  let npsMetrics = null
  
  if (npsData.length > 0) {
    const promoters = npsData.filter(d => d.rating >= 9).length
    const detractors = npsData.filter(d => d.rating <= 6).length
    const npsScore = Math.round(((promoters - detractors) / npsData.length) * 100)
    
    npsMetrics = {
      total_nps_responses: npsData.length,
      promoters,
      detractors,
      passives: npsData.length - promoters - detractors,
      nps_score: npsScore
    }
  }

  return {
    summary: {
      total_records: totalRecords,
      average_rating: Math.round(averageRating * 100) / 100,
      date_range: {
        earliest: data.length > 0 ? new Date(Math.min(...data.map(d => new Date(d.created_at).getTime()))).toISOString() : null,
        latest: data.length > 0 ? new Date(Math.max(...data.map(d => new Date(d.created_at).getTime()))).toISOString() : null
      }
    },
    distributions: {
      sentiment: sentimentDistribution,
      type: typeDistribution,
      temporal: temporalDistribution
    },
    nps_metrics: npsMetrics
  }
}

// Helper function to log export events
async function logExportEvent(userId: string, exportDetails: any, supabase: any) {
  try {
    await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: 'feedback_exported',
          export_format: exportDetails.format,
          record_count: exportDetails.record_count,
          filters_applied: exportDetails.filters,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging export event:', error)
    // Don't throw - export should succeed even if logging fails
  }
}