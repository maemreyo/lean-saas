// app/auth/callback/page.tsx
import { createAuthClient } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const next = typeof searchParams.next === 'string' ? searchParams.next : '/dashboard'
  const supabase = await createAuthClient()
  
  const { data, error } = await supabase.auth.getUser()
  
  if (error || !data.user) {
    redirect('/auth/login')
  }
  
  redirect(next)
}
