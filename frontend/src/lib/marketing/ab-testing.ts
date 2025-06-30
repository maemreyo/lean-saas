// A/B Testing utilities for Marketing & Growth Module
// Following patterns from billing module utilities

import { supabase } from '@/lib/supabase'
import { 
  ABTest, 
  ABTestInsert, 
  ABTestUpdate,
  ABTestSession,
  ABTestVariant,
  CreateABTestRequest,
  UpdateABTestRequest,
  ABTestResults
} from '@/types/marketing'
import { 
  createABTestSchema,
  updateABTestSchema,
  createABTestSessionSchema 
} from '@/schemas/marketing'
import { createError, handleSupabaseError } from '@/lib/utils'

// ================================================
// A/B TEST MANAGEMENT
// ================================================

/**
 * Create a new A/B test
 */
export const createABTest = async (
  data: CreateABTestRequest
): Promise<{ data: ABTest | null; error: Error | null }> => {
  try {
    // Validate input data
    const validation = createABTestSchema.safeParse(data)
    if (!validation.success) {
      return { 
        data: null, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Validate traffic split sums to 100%
    const totalTraffic = Object.values(data.traffic_split).reduce((sum, val) => sum + val, 0)
    if (Math.abs(totalTraffic - 100) > 0.01) {
      return { 
        data: null, 
        error: createError('Traffic split must sum to 100%') 
      }
    }

    // Create A/B test
    const { data: abTest, error } = await supabase
      .from('ab_tests')
      .insert({
        organization_id: data.organization_id,
        name: data.name,
        description: data.description,
        hypothesis: data.hypothesis,
        target_metric: data.target_metric,
        variants: data.variants,
        traffic_split: data.traffic_split,
        confidence_level: data.confidence_level || 0.95,
        status: 'draft'
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: abTest, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to create A/B test', error) 
    }
  }
}

/**
 * Update an A/B test
 */
export const updateABTest = async (
  id: string,
  data: UpdateABTestRequest
): Promise<{ data: ABTest | null; error: Error | null }> => {
  try {
    // Validate input data
    const validation = updateABTestSchema.safeParse(data)
    if (!validation.success) {
      return { 
        data: null, 
        error: createError('Validation failed', validation.error.flatten().fieldErrors) 
      }
    }

    // Update A/B test
    const { data: abTest, error } = await supabase
      .from('ab_tests')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: abTest, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to update A/B test', error) 
    }
  }
}

/**
 * Start an A/B test
 */
export const startABTest = async (
  id: string
): Promise<{ data: ABTest | null; error: Error | null }> => {
  try {
    const { data: abTest, error } = await supabase
      .from('ab_tests')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'draft') // Only allow starting from draft status
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: abTest, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to start A/B test', error) 
    }
  }
}

/**
 * Stop an A/B test
 */
export const stopABTest = async (
  id: string
): Promise<{ data: ABTest | null; error: Error | null }> => {
  try {
    // Calculate final results before stopping
    const results = await calculateABTestResults(id)
    
    const { data: abTest, error } = await supabase
      .from('ab_tests')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        results: results.data || {},
        statistical_significance: results.data?.winner?.p_value || 0,
        winner_variant: results.data?.winner?.variant_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'running') // Only allow stopping from running status
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: abTest, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to stop A/B test', error) 
    }
  }
}

/**
 * Delete an A/B test
 */
export const deleteABTest = async (
  id: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('ab_tests')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to delete A/B test', error) 
    }
  }
}

/**
 * Get A/B test by ID
 */
export const getABTest = async (
  id: string
): Promise<{ data: ABTest | null; error: Error | null }> => {
  try {
    const { data: abTest, error } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data: abTest, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to get A/B test', error) 
    }
  }
}

/**
 * List A/B tests for an organization
 */
export const listABTests = async (
  organizationId: string,
  options: {
    status?: string
    limit?: number
    offset?: number
  } = {}
): Promise<{ 
  data: ABTest[] | null; 
  count: number | null;
  error: Error | null 
}> => {
  try {
    let query = supabase
      .from('ab_tests')
      .select('*, count', { count: 'exact' })
      .eq('organization_id', organizationId)

    // Apply filters
    if (options.status) {
      query = query.eq('status', options.status)
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

    const { data: abTests, error, count } = await query

    if (error) {
      return { data: null, count: null, error: handleSupabaseError(error) }
    }

    return { data: abTests, count, error: null }
  } catch (error) {
    return { 
      data: null, 
      count: null,
      error: createError('Failed to list A/B tests', error) 
    }
  }
}

// ================================================
// SESSION TRACKING
// ================================================

/**
 * Track A/B test session (assign variant to user)
 */
export const trackABTestSession = async (
  abTestId: string,
  sessionId: string,
  userId?: string
): Promise<{ 
  data: { variant_id: string; session: ABTestSession } | null; 
  error: Error | null 
}> => {
  try {
    // Check if session already exists
    const { data: existingSession } = await supabase
      .from('ab_test_sessions')
      .select('*')
      .eq('ab_test_id', abTestId)
      .eq('session_id', sessionId)
      .single()

    if (existingSession) {
      return { 
        data: { 
          variant_id: existingSession.variant_id, 
          session: existingSession 
        }, 
        error: null 
      }
    }

    // Get A/B test details
    const { data: abTest, error: testError } = await getABTest(abTestId)
    if (testError || !abTest || abTest.status !== 'running') {
      return { 
        data: null, 
        error: testError || createError('A/B test not running') 
      }
    }

    // Assign variant based on traffic split
    const variants = abTest.variants as ABTestVariant[]
    const trafficSplit = abTest.traffic_split as Record<string, number>
    
    const random = Math.random() * 100
    let cumulative = 0
    let assignedVariant = variants[0].id

    for (const [variantId, percentage] of Object.entries(trafficSplit)) {
      cumulative += percentage
      if (random <= cumulative) {
        assignedVariant = variantId
        break
      }
    }

    // Create session record
    const { data: session, error } = await supabase
      .from('ab_test_sessions')
      .insert({
        ab_test_id: abTestId,
        session_id: sessionId,
        user_id: userId,
        variant_id: assignedVariant
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { 
      data: { 
        variant_id: assignedVariant, 
        session 
      }, 
      error: null 
    }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to track A/B test session', error) 
    }
  }
}

/**
 * Track A/B test conversion
 */
export const trackABTestConversion = async (
  abTestId: string,
  sessionId: string,
  conversionEvent?: string,
  conversionValue?: number
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Update session with conversion
    const { error } = await supabase
      .from('ab_test_sessions')
      .update({
        converted: true,
        conversion_event: conversionEvent,
        conversion_value: conversionValue
      })
      .eq('ab_test_id', abTestId)
      .eq('session_id', sessionId)

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    return { success: true, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: createError('Failed to track A/B test conversion', error) 
    }
  }
}

// ================================================
// ANALYTICS & RESULTS
// ================================================

/**
 * Calculate A/B test results with statistical significance
 */
export const calculateABTestResults = async (
  abTestId: string
): Promise<{ data: ABTestResults | null; error: Error | null }> => {
  try {
    // Get A/B test details
    const { data: abTest, error: testError } = await getABTest(abTestId)
    if (testError || !abTest) {
      return { data: null, error: testError || createError('A/B test not found') }
    }

    // Get session data
    const { data: sessions, error: sessionsError } = await supabase
      .from('ab_test_sessions')
      .select('*')
      .eq('ab_test_id', abTestId)

    if (sessionsError) {
      return { data: null, error: handleSupabaseError(sessionsError) }
    }

    // Calculate results per variant
    const variants = abTest.variants as ABTestVariant[]
    const variantResults = variants.map(variant => {
      const variantSessions = sessions?.filter(s => s.variant_id === variant.id) || []
      const conversions = variantSessions.filter(s => s.converted).length
      const conversionRate = variantSessions.length > 0 ? conversions / variantSessions.length : 0

      // Calculate confidence interval (simplified)
      const n = variantSessions.length
      const p = conversionRate
      const z = 1.96 // 95% confidence
      const margin = n > 0 ? z * Math.sqrt((p * (1 - p)) / n) : 0

      return {
        id: variant.id,
        name: variant.name,
        sessions: variantSessions.length,
        conversions,
        conversion_rate: conversionRate,
        confidence_interval: [
          Math.max(0, p - margin),
          Math.min(1, p + margin)
        ] as [number, number]
      }
    })

    // Find best performing variant
    const bestVariant = variantResults.reduce((best, current) => 
      current.conversion_rate > best.conversion_rate ? current : best
    )

    // Calculate statistical significance (simplified chi-square test)
    let winner = null
    let pValue = 1

    if (variantResults.length === 2) {
      const [variantA, variantB] = variantResults
      
      if (variantA.sessions > 30 && variantB.sessions > 30) {
        // Chi-square test for independence
        const totalSessions = variantA.sessions + variantB.sessions
        const totalConversions = variantA.conversions + variantB.conversions
        const expectedA = (variantA.sessions * totalConversions) / totalSessions
        const expectedB = (variantB.sessions * totalConversions) / totalSessions
        
        const chiSquare = 
          Math.pow(variantA.conversions - expectedA, 2) / expectedA +
          Math.pow(variantB.conversions - expectedB, 2) / expectedB +
          Math.pow((variantA.sessions - variantA.conversions) - (variantA.sessions - expectedA), 2) / (variantA.sessions - expectedA) +
          Math.pow((variantB.sessions - variantB.conversions) - (variantB.sessions - expectedB), 2) / (variantB.sessions - expectedB)

        // Simplified p-value calculation (degrees of freedom = 1)
        pValue = Math.exp(-chiSquare / 2)

        if (pValue < 0.05) { // Statistically significant
          winner = {
            variant_id: bestVariant.id,
            improvement: ((bestVariant.conversion_rate - Math.min(variantA.conversion_rate, variantB.conversion_rate)) / Math.min(variantA.conversion_rate, variantB.conversion_rate)) * 100,
            p_value: pValue
          }
        }
      }
    }

    // Generate recommendations
    const recommendations: string[] = []
    
    if (pValue < 0.05) {
      recommendations.push(`Variant ${bestVariant.name} shows statistically significant improvement`)
      recommendations.push('Consider implementing the winning variant')
    } else {
      recommendations.push('No statistically significant difference detected')
      if (Math.max(...variantResults.map(v => v.sessions)) < 100) {
        recommendations.push('Continue test to gather more data for reliable results')
      }
    }

    const results: ABTestResults = {
      test_id: abTestId,
      status: abTest.status,
      statistical_significance: 1 - pValue,
      confidence_level: abTest.confidence_level || 0.95,
      variants: variantResults,
      winner,
      recommendations
    }

    return { data: results, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: createError('Failed to calculate A/B test results', error) 
    }
  }
}

/**
 * Get A/B test sessions
 */
export const getABTestSessions = async (
  abTestId: string,
  options: {
    variantId?: string
    converted?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<{ 
  data: ABTestSession[] | null; 
  count: number | null;
  error: Error | null 
}> => {
  try {
    let query = supabase
      .from('ab_test_sessions')
      .select('*, count', { count: 'exact' })
      .eq('ab_test_id', abTestId)

    // Apply filters
    if (options.variantId) {
      query = query.eq('variant_id', options.variantId)
    }
    if (options.converted !== undefined) {
      query = query.eq('converted', options.converted)
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

    const { data: sessions, error, count } = await query

    if (error) {
      return { data: null, count: null, error: handleSupabaseError(error) }
    }

    return { data: sessions, count, error: null }
  } catch (error) {
    return { 
      data: null, 
      count: null,
      error: createError('Failed to get A/B test sessions', error) 
    }
  }
}

// Export all utilities
export const abTestUtils = {
  create: createABTest,
  update: updateABTest,
  start: startABTest,
  stop: stopABTest,
  delete: deleteABTest,
  get: getABTest,
  list: listABTests,
  trackSession: trackABTestSession,
  trackConversion: trackABTestConversion,
  calculateResults: calculateABTestResults,
  getSessions: getABTestSessions
}