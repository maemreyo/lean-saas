// UPDATED: 2025-06-30 - Created usage analytics API endpoint

import { createAuthClient } from '@/lib/auth/server'
import { usageAnalyticsQuerySchema } from '@/shared/schemas/billing'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createAuthClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryData = {
      timeRange: searchParams.get('timeRange') || '30d',
      eventType: searchParams.get('eventType') || undefined,
      organizationId: searchParams.get('organizationId') || undefined,
      includeProjections: searchParams.get('includeProjections') === 'true'
    }

    const validation = usageAnalyticsQuerySchema.safeParse(queryData)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { timeRange, eventType, organizationId, includeProjections } = validation.data

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }

    // Build query
    let query = supabase
      .from('usage_events')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Add filters
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    } else {
      query = query.eq('user_id', user.id)
    }

    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    const { data: usageEvents, error: usageError } = await query.order('created_at', { ascending: true })

    if (usageError) {
      console.error('Failed to fetch usage events:', usageError)
      return NextResponse.json(
        { error: 'Failed to fetch usage analytics' },
        { status: 500 }
      )
    }

    // Process analytics data
    const analytics = processUsageAnalytics(usageEvents || [], timeRange, includeProjections)

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Usage analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to process usage analytics
function processUsageAnalytics(events: any[], timeRange: string, includeProjections: boolean) {
  // Calculate total usage
  const totalUsage = events.reduce((sum, event) => sum + event.quantity, 0)

  // Group usage by type
  const usageByType: Record<string, number> = {}
  events.forEach(event => {
    usageByType[event.event_type] = (usageByType[event.event_type] || 0) + event.quantity
  })

  // Create usage trend data
  const usageTrend = generateUsageTrend(events, timeRange)

  // Calculate projections if requested
  let projectedCost = 0
  let currentPeriodUsage = totalUsage
  let previousPeriodUsage = 0

  if (includeProjections) {
    // Simple projection logic - can be enhanced
    const daysInPeriod = getDaysInPeriod(timeRange)
    const elapsedDays = Math.min(daysInPeriod, (Date.now() - new Date().setDate(1)) / (1000 * 60 * 60 * 24))
    
    if (elapsedDays > 0) {
      projectedCost = (totalUsage / elapsedDays) * daysInPeriod * 0.001 // Rough cost calculation
    }
  }

  return {
    totalUsage,
    usageByType,
    usageTrend,
    projectedCost,
    currentPeriodUsage,
    previousPeriodUsage,
    quotaUtilization: {} // This would be populated from quota data
  }
}

function generateUsageTrend(events: any[], timeRange: string) {
  // Group events by day and calculate daily usage
  const dailyUsage: Record<string, { usage: number; cost: number }> = {}

  events.forEach(event => {
    const date = new Date(event.created_at).toISOString().split('T')[0]
    if (!dailyUsage[date]) {
      dailyUsage[date] = { usage: 0, cost: 0 }
    }
    dailyUsage[date].usage += event.quantity
    dailyUsage[date].cost += (event.unit_price || 0) * event.quantity
  })

  // Convert to array format
  return Object.entries(dailyUsage).map(([date, data]) => ({
    date,
    usage: data.usage,
    cost: data.cost
  }))
}

function getDaysInPeriod(timeRange: string): number {
  switch (timeRange) {
    case '7d': return 7
    case '30d': return 30
    case '90d': return 90
    case '1y': return 365
    default: return 30
  }
}