// lib/stripe/client.ts
import { loadStripe } from '@stripe/stripe-js'

export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
}

export const redirectToCheckout = async (priceId: string) => {
  const stripe = await getStripe()
  
  const { error } = await stripe!.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    successUrl: `${window.location.origin}/dashboard/billing?success=true`,
    cancelUrl: `${window.location.origin}/dashboard/billing?canceled=true`,
  })
  
  if (error) {
    console.error('Stripe error:', error)
    throw error
  }
}
