// app/dashboard/billing/page.tsx
'use client'

import { useSubscription } from '@/hooks/billing/useSubscription'
import { PLANS } from '@/lib/stripe/config'
import { Button } from '@/components/ui/Button'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'

export default function BillingPage() {
  const { subscription, loading, createCheckoutSession, createPortalSession } = useSubscription()
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">Loading...</div>
      </DashboardLayout>
    )
  }
  
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Billing & Subscription</h1>
        
        {subscription ? (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Current Subscription</h2>
            <p className="text-gray-600 mb-4">
              Status: <span className="font-medium capitalize">{subscription.status}</span>
            </p>
            <p className="text-gray-600 mb-4">
              Current period ends: {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
            <Button onClick={createPortalSession}>
              Manage Subscription
            </Button>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">No Active Subscription</h2>
            <p className="text-gray-600 mb-4">
              Choose a plan to get started with premium features.
            </p>
          </div>
        )}
        
        <div className="grid md:grid-cols-3 gap-6">
          {Object.entries(PLANS).map(([key, plan]) => (
            <div
              key={key}
              className="bg-white p-6 rounded-lg shadow border"
            >
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <p className="text-gray-600 mb-4">{plan.description}</p>
              <div className="text-3xl font-bold mb-4">
                ${plan.price}
                {plan.price > 0 && <span className="text-lg text-gray-600">/month</span>}
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.price > 0 && (
                <Button
                  className="w-full"
                  onClick={() => createCheckoutSession(plan.priceId)}
                  disabled={!plan.priceId}
                >
                  Subscribe
                </Button>
              )}
              {plan.price === 0 && (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
