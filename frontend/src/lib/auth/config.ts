// lib/auth/config.ts
export const authConfig = {
  signIn: {
    redirectTo: '/dashboard',
  },
  signUp: {
    redirectTo: '/auth/callback?next=/dashboard',
  },
  signOut: {
    redirectTo: '/',
  },
  passwordReset: {
    redirectTo: '/auth/callback?next=/dashboard',
  },
}

export const authRoutes = {
  signIn: '/auth/login',
  signUp: '/auth/register',
  forgotPassword: '/auth/forgot-password',
  callback: '/auth/callback',
}

export const protectedRoutes = [
  '/dashboard',
  '/settings',
  '/billing',
]

export const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/register', 
  '/auth/forgot-password',
  '/auth/callback',
  '/pricing',
  '/about',
]
