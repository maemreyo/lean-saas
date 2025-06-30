// lib/stripe/config.ts
export const PLANS = {
  free: {
    name: 'Free',
    description: 'Perfect for getting started',
    price: 0,
    priceId: '',
    features: [
      'Up to 3 projects',
      'Basic support',
      '1GB storage',
    ],
  },
  pro: {
    name: 'Pro',
    description: 'For growing businesses',
    price: 19,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    features: [
      'Unlimited projects',
      'Priority support',
      '100GB storage',
      'Advanced analytics',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    description: 'For large organizations',
    price: 99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    features: [
      'Everything in Pro',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
    ],
  },
} as const

export type PlanType = keyof typeof PLANS
