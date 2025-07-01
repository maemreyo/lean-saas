// CREATED: 2025-07-01 - A/B test results and analytics API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAuthClient } from '@/lib/auth/auth-utils'
import { abTestUtils } from '@/lib/marketing/ab-testing'
import type { ABTestResults } from '@/shared/types/marketing'

// ================================================
// GET /api/marketing/ab-tests/results
// Get A/B test results and statistical analysis
// ================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const testId = searchParams.get('test_id')
    const organizationId = searchParams.get('organization_id')
    const includeRawData = searchParams.get('include_raw_data') === 'true'

    if (!testId) {
      return NextResponse.json(
        { error: 'Test ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createAuthClient()

    // Get A/B test details
    const { data: abTest, error: testError } = await abTestUtils.get(testId)
    
    if (testError || !abTest) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      )
    }

    // Verify user has access to organization
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', abTest.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess) {
      return NextResponse.json(
        { error: 'Access denied to this A/B test' },
        { status: 403 }
      )
    }

    // Get all sessions for the test
    const { data: sessions, error: sessionsError } = await supabase
      .from('ab_test_sessions')
      .select('*')
      .eq('ab_test_id', testId)
      .order('created_at', { ascending: true })

    if (sessionsError) {
      console.error('Failed to fetch A/B test sessions:', sessionsError)
      return NextResponse.json(
        { error: 'Failed to fetch test sessions' },
        { status: 500 }
      )
    }

    // Calculate variant statistics
    const variantStats = {}
    const variants = abTest.variants as Array<{ id: string; name: string }>

    // Initialize stats for each variant
    variants.forEach(variant => {
      variantStats[variant.id] = {
        id: variant.id,
        name: variant.name,
        sessions: 0,
        conversions: 0,
        conversion_rate: 0,
        total_conversion_value: 0,
        average_conversion_value: 0,
        confidence_interval: [0, 0],
        significance_level: 0
      }
    })

    // Aggregate session data
    sessions?.forEach(session => {
      const variantId = session.variant_id
      if (variantStats[variantId]) {
        variantStats[variantId].sessions++
        
        if (session.converted) {
          variantStats[variantId].conversions++
          variantStats[variantId].total_conversion_value += session.conversion_value || 0
        }
      }
    })

    // Calculate rates and averages
    Object.values(variantStats).forEach((variant: any) => {
      if (variant.sessions > 0) {
        variant.conversion_rate = (variant.conversions / variant.sessions) * 100
        variant.average_conversion_value = variant.conversions > 0 
          ? variant.total_conversion_value / variant.conversions 
          : 0
        
        // Calculate binomial confidence interval (95%)
        const p = variant.conversion_rate / 100
        const n = variant.sessions
        if (n > 0) {
          const z = 1.96 // 95% confidence
          const margin = z * Math.sqrt((p * (1 - p)) / n)
          variant.confidence_interval = [
            Math.max(0, (p - margin) * 100),
            Math.min(100, (p + margin) * 100)
          ]
        }
      }
    })

    // Find control variant (usually variant A or first variant)
    const sortedVariants = Object.values(variantStats).sort((a: any, b: any) => a.id.localeCompare(b.id))
    const controlVariant = sortedVariants[0]
    
    // Calculate statistical significance vs control for each variant
    Object.values(variantStats).forEach((variant: any) => {
      if (variant.id !== controlVariant.id && controlVariant.sessions > 0 && variant.sessions > 0) {
        // Simple z-test for proportions
        const p1 = controlVariant.conversion_rate / 100
        const p2 = variant.conversion_rate / 100
        const n1 = controlVariant.sessions
        const n2 = variant.sessions
        
        const pooledP = (controlVariant.conversions + variant.conversions) / (n1 + n2)
        const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2))
        
        if (standardError > 0) {
          const zScore = Math.abs(p2 - p1) / standardError
          const pValue = 2 * (1 - normalCDF(Math.abs(zScore))) // Two-tailed test
          variant.significance_level = 1 - pValue
        }
      }
    })

    // Determine winner (if test is completed)
    let winner = null
    if (abTest.status === 'completed') {
      const testVariants = Object.values(variantStats)
        .filter((v: any) => v.id !== controlVariant.id)
        .sort((a: any, b: any) => b.conversion_rate - a.conversion_rate)
      
      const bestVariant = testVariants[0]
      if (bestVariant && bestVariant.significance_level > 0.95 && bestVariant.conversion_rate > controlVariant.conversion_rate) {
        winner = {
          variant_id: bestVariant.id,
          variant_name: bestVariant.name,
          improvement: ((bestVariant.conversion_rate - controlVariant.conversion_rate) / controlVariant.conversion_rate) * 100,
          confidence_level: bestVariant.significance_level,
          conversion_rate: bestVariant.conversion_rate
        }
      }
    }

    // Calculate overall test metrics
    const totalSessions = sessions?.length || 0
    const totalConversions = sessions?.filter(s => s.converted).length || 0
    const overallConversionRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0

    // Build results object
    const results: ABTestResults = {
      test_id: testId,
      status: abTest.status,
      statistical_significance: abTest.statistical_significance || 0,
      confidence_level: abTest.confidence_level || 0.95,
      variants: Object.values(variantStats),
      winner,
      recommendations: generateRecommendations(abTest, variantStats, winner),
      overview: {
        total_sessions: totalSessions,
        total_conversions: totalConversions,
        overall_conversion_rate: overallConversionRate,
        test_duration_days: abTest.started_at && abTest.ended_at 
          ? Math.ceil((new Date(abTest.ended_at).getTime() - new Date(abTest.started_at).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        traffic_split: abTest.traffic_split as Record<string, number>
      }
    }

    const response: any = { 
      data: results 
    }

    // Include raw session data if requested
    if (includeRawData) {
      response.raw_data = sessions
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('A/B test results GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// POST /api/marketing/ab-tests/results
// Update test results and mark as completed
// ================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { test_id, winner_variant, statistical_significance, notes } = body

    if (!test_id) {
      return NextResponse.json(
        { error: 'Test ID is required' },
        { status: 400 }
      )
    }

    // Get A/B test
    const { data: abTest, error: testError } = await abTestUtils.get(test_id)
    
    if (testError || !abTest) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      )
    }

    // Verify user has access
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', abTest.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin', 'editor'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Update test with results
    const updateData: any = {
      status: 'completed',
      ended_at: new Date().toISOString(),
      statistical_significance,
      winner_variant,
      results: {
        completed_by: user.id,
        completed_at: new Date().toISOString(),
        notes,
        winner_variant,
        statistical_significance
      }
    }

    const { data: updatedTest, error: updateError } = await abTestUtils.update(test_id, updateData)

    if (updateError) {
      console.error('Failed to update A/B test results:', updateError)
      return NextResponse.json(
        { error: 'Failed to update test results' },
        { status: 500 }
      )
    }

    // Track completion
    try {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id: abTest.organization_id,
          metric_type: 'ab_test_completed',
          metric_value: statistical_significance || 0,
          dimensions: {
            test_id,
            winner_variant,
            user_id: user.id,
            has_winner: !!winner_variant
          }
        })
    } catch (metricsError) {
      console.warn('Failed to track A/B test completion metrics:', metricsError)
    }

    return NextResponse.json({
      data: updatedTest,
      message: 'A/B test completed and results saved'
    })

  } catch (error) {
    console.error('A/B test results POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

// Normal cumulative distribution function approximation
function normalCDF(x: number): number {
  const a1 =  0.254829592
  const a2 = -0.284496736
  const a3 =  1.421413741
  const a4 = -1.453152027
  const a5 =  1.061405429
  const p  =  0.3275911

  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2.0)

  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return 0.5 * (1.0 + sign * y)
}

// Generate recommendations based on test results
function generateRecommendations(abTest: any, variantStats: any, winner: any): string[] {
  const recommendations: string[] = []
  
  const totalSessions = Object.values(variantStats).reduce((sum: number, variant: any) => sum + variant.sessions, 0)
  
  // Sample size recommendations
  if (totalSessions < 1000) {
    recommendations.push("Consider running the test longer to gather more data for statistical significance")
  }
  
  // Winner recommendations
  if (winner) {
    recommendations.push(`Implement variant "${winner.variant_name}" - it shows ${winner.improvement.toFixed(1)}% improvement`)
  } else if (abTest.status === 'completed') {
    recommendations.push("No statistically significant winner found. Consider testing more dramatic variations")
  }
  
  // Variant performance recommendations
  const variants = Object.values(variantStats).sort((a: any, b: any) => b.conversion_rate - a.conversion_rate)
  const bestVariant = variants[0] as any
  const worstVariant = variants[variants.length - 1] as any
  
  if (bestVariant.conversion_rate - worstVariant.conversion_rate > 20) {
    recommendations.push("Large performance gap between variants suggests potential for optimization")
  }
  
  return recommendations
}