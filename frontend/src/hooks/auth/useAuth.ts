// hooks/auth/useAuth.ts
'use client'

import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authConfig } from '@/lib/auth/config'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }
    
    getInitialSession()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        
        if (event === 'SIGNED_IN') {
          router.push(authConfig.signIn.redirectTo)
        } else if (event === 'SIGNED_OUT') {
          router.push(authConfig.signOut.redirectTo)
        }
      }
    )
    
    return () => subscription.unsubscribe()
  }, [router, supabase.auth])
  
  const signOut = async () => {
    await supabase.auth.signOut()
  }
  
  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
  }
}
