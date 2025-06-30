// hooks/auth/useProfile.ts
'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useEffect, useState } from 'react'

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  plan_type: 'free' | 'pro' | 'enterprise'
  onboarded: boolean
  created_at: string
  updated_at: string
}

export function useProfile() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  
  useEffect(() => {
    if (!user || authLoading) {
      setLoading(authLoading)
      return
    }
    
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          
        if (error) {
          setError(error.message)
        } else {
          setProfile(data)
        }
      } catch (err) {
        setError('Failed to fetch profile')
      } finally {
        setLoading(false)
      }
    }
    
    fetchProfile()
  }, [user, authLoading, supabase])
  
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .single()
        
      if (error) {
        throw error
      }
      
      setProfile(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
      throw err
    }
  }
  
  return {
    profile,
    loading,
    error,
    updateProfile,
  }
}
