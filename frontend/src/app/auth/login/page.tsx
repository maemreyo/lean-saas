// app/auth/login/page.tsx
import { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'
import { getUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { authConfig } from '@/lib/auth/config'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your account',
}

export default async function LoginPage() {
  const user = await getUser()
  
  if (user) {
    redirect(authConfig.signIn.redirectTo)
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <a
              href="/auth/register"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              create a new account
            </a>
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
