// UPDATED: 2025-06-30 - Created quota reset cron function for automatic quota resets

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

interface QuotaResetJob {
  resetType: 'daily' | 'weekly' | 'monthly' | 'yearly'
  dryRun?: boolean
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function resetQuotasByPeriod(resetPeriod: string, dryRun: boolean = false) {
  console.log(`${dryRun ? 'DRY RUN: ' : ''}Resetting ${resetPeriod} quotas...`)
  
  try {
    const now = new Date()
    let shouldReset: (lastReset: Date) => boolean

    // Determine if quota should be reset based on period
    switch (resetPeriod) {
      case 'daily':
        shouldReset = (lastReset: Date) => {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const resetDate = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate())
          return resetDate < today
        }
        break
        
      case 'weekly':
        shouldReset = (lastReset: Date) => {
          const startOfWeek = new Date(now)
          startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday
          startOfWeek.setHours(0, 0, 0, 0)
          return lastReset < startOfWeek
        }
        break
        
      case 'monthly':
        shouldReset = (lastReset: Date) => {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          return lastReset < startOfMonth
        }
        break
        
      case 'yearly':
        shouldReset = (lastReset: Date) => {
          const startOfYear = new Date(now.getFullYear(), 0, 1)
          return lastReset < startOfYear
        }
        break
        
      default:
        throw new Error(`Invalid reset period: ${resetPeriod}`)
    }

    // Get quotas that need to be reset
    const { data: quotas, error: quotasError } = await supabase
      .from('usage_quotas')
      .select('*')
      .eq('reset_period', resetPeriod)

    if (quotasError) {
      throw new Error(`Failed to fetch quotas: ${quotasError.message}`)
    }

    console.log(`Found ${quotas?.length || 0} quotas with ${resetPeriod} reset period`)

    if (!quotas || quotas.length === 0) {
      return { resetCount: 0, quotas: [] }
    }

    // Filter quotas that need reset
    const quotasToReset = quotas.filter(quota => {
      const lastReset = new Date(quota.last_reset)
      return shouldReset(lastReset)
    })

    console.log(`${quotasToReset.length} quotas need to be reset`)

    if (dryRun) {
      console.log('DRY RUN: Would reset the following quotas:')
      quotasToReset.forEach(quota => {
        console.log(`- ${quota.quota_type} for ${quota.user_id || quota.organization_id}: ${quota.current_usage} -> 0`)
      })
      return { resetCount: quotasToReset.length, quotas: quotasToReset, dryRun: true }
    }

    // Reset quotas in batches
    const batchSize = 100
    let resetCount = 0

    for (let i = 0; i < quotasToReset.length; i += batchSize) {
      const batch = quotasToReset.slice(i, i + batchSize)
      
      for (const quota of batch) {
        const { error: updateError } = await supabase
          .from('usage_quotas')
          .update({
            current_usage: 0,
            last_reset: now.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('id', quota.id)

        if (updateError) {
          console.error(`Failed to reset quota ${quota.id}:`, updateError)
        } else {
          resetCount++
          console.log(`Reset ${quota.quota_type} for ${quota.user_id || quota.organization_id}`)
        }
      }
    }

    // Log reset activity
    await logQuotaResetActivity(resetPeriod, resetCount, quotasToReset.length)

    console.log(`Successfully reset ${resetCount} out of ${quotasToReset.length} quotas`)
    
    return { 
      resetCount, 
      totalChecked: quotas.length,
      quotasToReset: quotasToReset.length,
      quotas: quotasToReset.map(q => ({
        id: q.id,
        quota_type: q.quota_type,
        user_id: q.user_id,
        organization_id: q.organization_id,
        previous_usage: q.current_usage
      }))
    }

  } catch (error) {
    console.error(`Error resetting ${resetPeriod} quotas:`, error)
    throw error
  }
}

async function logQuotaResetActivity(resetPeriod: string, resetCount: number, totalEligible: number) {
  try {
    // You could store this in a quota_reset_logs table for auditing
    console.log(`Quota reset activity logged: ${resetPeriod} - ${resetCount}/${totalEligible} quotas reset`)
    
    // Example: Store in a logs table
    /*
    const { error } = await supabase
      .from('quota_reset_logs')
      .insert({
        reset_period: resetPeriod,
        quotas_reset: resetCount,
        quotas_eligible: totalEligible,
        reset_date: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to log quota reset activity:', error)
    }
    */
  } catch (error) {
    console.error('Error logging quota reset activity:', error)
  }
}

async function cleanupOldUsageEvents(daysToKeep: number = 90) {
  console.log(`Cleaning up usage events older than ${daysToKeep} days...`)
  
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const { data: oldEvents, error: fetchError } = await supabase
      .from('usage_events')
      .select('id')
      .lt('created_at', cutoffDate.toISOString())
      .eq('processed', true)

    if (fetchError) {
      throw new Error(`Failed to fetch old usage events: ${fetchError.message}`)
    }

    console.log(`Found ${oldEvents?.length || 0} old usage events to cleanup`)

    if (!oldEvents || oldEvents.length === 0) {
      return { deletedCount: 0 }
    }

    // Delete in batches to avoid timeout
    const batchSize = 1000
    let deletedCount = 0

    for (let i = 0; i < oldEvents.length; i += batchSize) {
      const batch = oldEvents.slice(i, i + batchSize)
      const ids = batch.map(event => event.id)

      const { error: deleteError } = await supabase
        .from('usage_events')
        .delete()
        .in('id', ids)

      if (deleteError) {
        console.error('Failed to delete usage events batch:', deleteError)
      } else {
        deletedCount += batch.length
        console.log(`Deleted batch of ${batch.length} usage events`)
      }
    }

    console.log(`Cleanup completed: deleted ${deletedCount} old usage events`)
    return { deletedCount }

  } catch (error) {
    console.error('Error cleaning up old usage events:', error)
    throw error
  }
}

async function archiveOldAlerts(daysToKeep: number = 30) {
  console.log(`Archiving billing alerts older than ${daysToKeep} days...`)
  
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const { data: oldAlerts, error: fetchError } = await supabase
      .from('billing_alerts')
      .select('id')
      .lt('triggered_at', cutoffDate.toISOString())
      .eq('acknowledged', true)

    if (fetchError) {
      throw new Error(`Failed to fetch old alerts: ${fetchError.message}`)
    }

    console.log(`Found ${oldAlerts?.length || 0} old alerts to archive`)

    if (!oldAlerts || oldAlerts.length === 0) {
      return { archivedCount: 0 }
    }

    // In a real implementation, you might move these to an archive table
    // For now, we'll just delete acknowledged alerts older than the cutoff
    const { error: deleteError } = await supabase
      .from('billing_alerts')
      .delete()
      .in('id', oldAlerts.map(alert => alert.id))

    if (deleteError) {
      console.error('Failed to archive old alerts:', deleteError)
      throw deleteError
    }

    console.log(`Archived ${oldAlerts.length} old billing alerts`)
    return { archivedCount: oldAlerts.length }

  } catch (error) {
    console.error('Error archiving old alerts:', error)
    throw error
  }
}

async function runMaintenanceTasks() {
  console.log('Running maintenance tasks...')
  
  const results = {
    quotaResets: {} as Record<string, any>,
    cleanup: {} as any,
    alerts: {} as any
  }

  try {
    // Reset quotas for each period
    const periods = ['daily', 'weekly', 'monthly', 'yearly']
    
    for (const period of periods) {
      try {
        results.quotaResets[period] = await resetQuotasByPeriod(period)
      } catch (error) {
        console.error(`Failed to reset ${period} quotas:`, error)
        results.quotaResets[period] = { error: error.message }
      }
    }

    // Cleanup old data
    try {
      results.cleanup = await cleanupOldUsageEvents(90)
    } catch (error) {
      console.error('Failed to cleanup usage events:', error)
      results.cleanup = { error: error.message }
    }

    // Archive old alerts
    try {
      results.alerts = await archiveOldAlerts(30)
    } catch (error) {
      console.error('Failed to archive alerts:', error)
      results.alerts = { error: error.message }
    }

    console.log('Maintenance tasks completed')
    return results

  } catch (error) {
    console.error('Error running maintenance tasks:', error)
    throw error
  }
}

// Main handler
serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const body: QuotaResetJob = await req.json()
    const { resetType, dryRun = false } = body

    let result: any

    if (resetType === 'daily' || resetType === 'weekly' || resetType === 'monthly' || resetType === 'yearly') {
      // Reset specific period
      result = await resetQuotasByPeriod(resetType, dryRun)
    } else if (resetType === 'maintenance' || !resetType) {
      // Run all maintenance tasks
      result = await runMaintenanceTasks()
    } else {
      throw new Error(`Invalid reset type: ${resetType}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        resetType,
        dryRun,
        result,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Quota reset error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Export for Deno cron
export { resetQuotasByPeriod, runMaintenanceTasks }