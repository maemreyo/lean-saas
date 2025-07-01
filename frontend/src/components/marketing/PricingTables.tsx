// CREATED: 2025-07-01 - Pricing tables component for marketing module

'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { 
  Check, 
  X, 
  Star, 
  Zap, 
  Crown, 
  Rocket,
  Shield,
  Users,
  Globe,
  Sparkles,
  ArrowRight,
  Info,
  Calculator,
  CreditCard,
  Percent,
  TrendingUp,
  Award,
  Target,
  Building
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ================================================
// TYPES & INTERFACES
// ================================================

interface PricingTablesProps {
  variant?: 'simple' | 'comparison' | 'feature-rich' | 'toggle' | 'usage-based'
  showFeatureComparison?: boolean
  showAnnualDiscount?: boolean
  annualDiscountPercent?: number
  onPlanSelect?: (planId: string, billingPeriod: 'monthly' | 'annually') => void
  className?: string
}

interface PricingPlan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  originalPrice?: number
  features: string[]
  limitations?: string[]
  isPopular?: boolean
  isEnterprise?: boolean
  icon: React.ElementType
  color: string
  ctaText: string
  comingSoon?: boolean
}

interface FeatureComparisonProps {
  plans: PricingPlan[]
  features: Array<{
    category: string
    items: Array<{
      name: string
      description?: string
      plans: Record<string, boolean | string | number>
    }>
  }>
}

interface UsageCalculatorProps {
  basePrice: number
  unitPrice: number
  unitName: string
  onCalculate?: (usage: number, total: number) => void
}

// ================================================
// SAMPLE DATA
// ================================================

const pricingPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for individuals and small projects',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      'Up to 3 projects',
      '1GB storage',
      'Basic support',
      'Core features',
      'Community access'
    ],
    limitations: [
      'No advanced analytics',
      'Limited integrations',
      'Basic templates only'
    ],
    icon: Zap,
    color: 'text-green-600',
    ctaText: 'Get Started Free'
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Ideal for growing businesses and teams',
    monthlyPrice: 29,
    annualPrice: 290,
    originalPrice: 348,
    features: [
      'Unlimited projects',
      '100GB storage',
      'Priority support',
      'Advanced features',
      'Team collaboration',
      'Custom integrations',
      'Advanced analytics'
    ],
    isPopular: true,
    icon: Crown,
    color: 'text-blue-600',
    ctaText: 'Start Free Trial'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with custom needs',
    monthlyPrice: 99,
    annualPrice: 990,
    originalPrice: 1188,
    features: [
      'Everything in Professional',
      'Unlimited storage',
      'Dedicated support',
      'Custom features',
      'Advanced security',
      'SLA guarantee',
      'White-label options',
      'API access'
    ],
    isEnterprise: true,
    icon: Building,
    color: 'text-purple-600',
    ctaText: 'Contact Sales'
  }
]

const featureComparison = [
  {
    category: 'Core Features',
    items: [
      {
        name: 'Projects',
        description: 'Number of projects you can create',
        plans: { starter: '3', professional: 'Unlimited', enterprise: 'Unlimited' }
      },
      {
        name: 'Storage',
        description: 'Total storage space available',
        plans: { starter: '1GB', professional: '100GB', enterprise: 'Unlimited' }
      },
      {
        name: 'Team Members',
        description: 'Number of team members',
        plans: { starter: '1', professional: '10', enterprise: 'Unlimited' }
      }
    ]
  },
  {
    category: 'Advanced Features',
    items: [
      {
        name: 'Advanced Analytics',
        plans: { starter: false, professional: true, enterprise: true }
      },
      {
        name: 'Custom Integrations',
        plans: { starter: false, professional: true, enterprise: true }
      },
      {
        name: 'White-label',
        plans: { starter: false, professional: false, enterprise: true }
      },
      {
        name: 'API Access',
        plans: { starter: false, professional: false, enterprise: true }
      }
    ]
  },
  {
    category: 'Support',
    items: [
      {
        name: 'Support Level',
        plans: { starter: 'Community', professional: 'Priority', enterprise: 'Dedicated' }
      },
      {
        name: 'Response Time',
        plans: { starter: '24-48h', professional: '4-8h', enterprise: '1-2h' }
      },
      {
        name: 'SLA',
        plans: { starter: false, professional: false, enterprise: true }
      }
    ]
  }
]

// ================================================
// PRICING CARD COMPONENT
// ================================================

function PricingCard({ 
  plan, 
  billingPeriod, 
  onSelect, 
  showAnnualSavings = true 
}: { 
  plan: PricingPlan
  billingPeriod: 'monthly' | 'annually'
  onSelect: (planId: string) => void
  showAnnualSavings?: boolean
}) {
  const price = billingPeriod === 'monthly' ? plan.monthlyPrice : Math.floor(plan.annualPrice / 12)
  const annualSavings = plan.originalPrice ? plan.originalPrice - plan.annualPrice : 0
  const savingsPercent = plan.originalPrice ? Math.round((annualSavings / plan.originalPrice) * 100) : 0

  return (
    <div className={cn(
      "relative bg-white border rounded-2xl p-8 transition-all duration-300 hover:shadow-lg",
      plan.isPopular 
        ? "border-blue-500 shadow-md ring-2 ring-blue-500/20" 
        : "border-gray-200 hover:border-gray-300"
    )}>
      {/* Popular Badge */}
      {plan.isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-500 text-white px-4 py-1">
            <Star className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}

      {/* Coming Soon Badge */}
      {plan.comingSoon && (
        <div className="absolute -top-4 right-4">
          <Badge variant="outline" className="bg-white">
            Coming Soon
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <div className={cn("w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center", 
          plan.isPopular ? "bg-blue-100" : "bg-gray-100"
        )}>
          <plan.icon className={cn("h-6 w-6", plan.color)} />
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
        <p className="text-gray-600 text-sm">{plan.description}</p>
      </div>

      {/* Pricing */}
      <div className="text-center mb-8">
        {plan.monthlyPrice === 0 ? (
          <div className="text-4xl font-bold text-gray-900">Free</div>
        ) : (
          <>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-gray-900">
                ${price}
              </span>
              <span className="text-gray-600">
                /{billingPeriod === 'monthly' ? 'month' : 'month'}
              </span>
            </div>
            
            {billingPeriod === 'annually' && plan.annualPrice > 0 && (
              <div className="text-sm text-gray-500 mt-1">
                Billed annually (${plan.annualPrice})
              </div>
            )}
            
            {showAnnualSavings && billingPeriod === 'annually' && savingsPercent > 0 && (
              <div className="text-sm text-green-600 font-medium mt-2">
                Save {savingsPercent}% (${annualSavings}/year)
              </div>
            )}
          </>
        )}
      </div>

      {/* CTA Button */}
      <Button
        onClick={() => onSelect(plan.id)}
        className={cn(
          "w-full mb-8",
          plan.isPopular 
            ? "bg-blue-600 hover:bg-blue-700" 
            : "bg-gray-900 hover:bg-gray-800"
        )}
        disabled={plan.comingSoon}
      >
        {plan.comingSoon ? 'Coming Soon' : plan.ctaText}
        {!plan.comingSoon && <ArrowRight className="ml-2 h-4 w-4" />}
      </Button>

      {/* Features */}
      <div className="space-y-4">
        <div className="text-sm font-medium text-gray-900 mb-3">
          What's included:
        </div>
        
        <div className="space-y-3">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>

        {/* Limitations */}
        {plan.limitations && plan.limitations.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <div className="space-y-3">
              {plan.limitations.map((limitation, index) => (
                <div key={index} className="flex items-start gap-3">
                  <X className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-500">{limitation}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ================================================
// FEATURE COMPARISON COMPONENT
// ================================================

function FeatureComparison({ plans, features }: FeatureComparisonProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Feature Comparison</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-4 px-6 font-medium text-gray-900">
                Features
              </th>
              {plans.map((plan) => (
                <th key={plan.id} className="text-center py-4 px-6 font-medium text-gray-900 min-w-[120px]">
                  <div className="flex items-center justify-center gap-2">
                    <plan.icon className={cn("h-4 w-4", plan.color)} />
                    {plan.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {features.map((category) => (
              <React.Fragment key={category.category}>
                <tr className="bg-gray-50">
                  <td colSpan={plans.length + 1} className="py-3 px-6 font-semibold text-gray-900 text-sm">
                    {category.category}
                  </td>
                </tr>
                {category.items.map((item) => (
                  <tr key={item.name} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                        )}
                      </div>
                    </td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="py-4 px-6 text-center">
                        {typeof item.plans[plan.id] === 'boolean' ? (
                          item.plans[plan.id] ? (
                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-gray-400 mx-auto" />
                          )
                        ) : (
                          <span className="text-sm font-medium text-gray-900">
                            {item.plans[plan.id]}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ================================================
// USAGE CALCULATOR COMPONENT
// ================================================

function UsageCalculator({ basePrice, unitPrice, unitName, onCalculate }: UsageCalculatorProps) {
  const [usage, setUsage] = useState(1000)
  const total = basePrice + (Math.max(0, usage - 1000) * unitPrice)

  const handleUsageChange = (value: number) => {
    setUsage(value)
    onCalculate?.(value, total)
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="h-6 w-6 text-blue-600" />
        <h3 className="text-xl font-semibold text-gray-900">Usage Calculator</h3>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expected {unitName} usage per month:
          </label>
          <input
            type="number"
            value={usage}
            onChange={(e) => handleUsageChange(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
            step="100"
          />
          <div className="text-sm text-gray-600 mt-2">
            First 1,000 {unitName} included in base price
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">${basePrice}</div>
              <div className="text-sm text-gray-600">Base Price</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-blue-600">
                ${Math.max(0, (usage - 1000) * unitPrice).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Usage Cost</div>
            </div>
            
            <div>
              <div className="text-3xl font-bold text-purple-600">${total.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Total Monthly</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <div className="text-sm text-gray-600">
              Annual savings: <span className="font-medium text-green-600">${(total * 2).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ================================================
// MAIN COMPONENT
// ================================================

export function PricingTables({
  variant = 'simple',
  showFeatureComparison = true,
  showAnnualDiscount = true,
  annualDiscountPercent = 20,
  onPlanSelect,
  className
}: PricingTablesProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('monthly')
  const [selectedCategory, setSelectedCategory] = useState('saas')

  const handlePlanSelect = useCallback((planId: string) => {
    onPlanSelect?.(planId, billingPeriod)
    console.log(`Selected plan: ${planId} (${billingPeriod})`)
  }, [billingPeriod, onPlanSelect])

  const renderPricingVariant = () => {
    switch (variant) {
      case 'toggle':
        return (
          <div className="space-y-12">
            {/* Billing Toggle */}
            <div className="text-center">
              <div className="inline-flex items-center bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={cn(
                    "px-6 py-2 rounded-lg text-sm font-medium transition-all",
                    billingPeriod === 'monthly'
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('annually')}
                  className={cn(
                    "px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                    billingPeriod === 'annually'
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Annually
                  {showAnnualDiscount && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      Save {annualDiscountPercent}%
                    </Badge>
                  )}
                </button>
              </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {pricingPlans.map((plan) => (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  billingPeriod={billingPeriod}
                  onSelect={handlePlanSelect}
                  showAnnualSavings={showAnnualDiscount}
                />
              ))}
            </div>
          </div>
        )

      case 'usage-based':
        return (
          <div className="space-y-12">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Usage-Based Pricing
              </h2>
              <p className="text-lg text-gray-600">
                Pay only for what you use. Start with our base plan and scale as you grow.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {/* Base Plan */}
              <div className="bg-white border border-gray-200 rounded-2xl p-8">
                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Rocket className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Usage-Based</h3>
                  <p className="text-gray-600">Perfect for businesses of all sizes</p>
                </div>

                <div className="text-center mb-8">
                  <div className="text-4xl font-bold text-gray-900 mb-2">$29</div>
                  <div className="text-gray-600">base + usage</div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Base features included</span>
                    <span className="font-medium">$29/month</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">First 1,000 API calls</span>
                    <span className="font-medium">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Additional API calls</span>
                    <span className="font-medium">$0.01 each</span>
                  </div>
                </div>

                <Button onClick={() => handlePlanSelect('usage-based')} className="w-full">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* Calculator */}
              <UsageCalculator
                basePrice={29}
                unitPrice={0.01}
                unitName="API calls"
                onCalculate={(usage, total) => {
                  console.log(`Usage: ${usage}, Total: $${total}`)
                }}
              />
            </div>
          </div>
        )

      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {pricingPlans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                billingPeriod="monthly"
                onSelect={handlePlanSelect}
              />
            ))}
          </div>
        )
    }
  }

  return (
    <div className={cn("bg-gray-50 py-20", className)}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Choose Your Plan
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Start free and scale as you grow. All plans include our core features 
            with increasing limits and advanced capabilities.
          </p>
        </div>

        {/* Pricing Content */}
        {renderPricingVariant()}

        {/* Feature Comparison */}
        {showFeatureComparison && variant !== 'usage-based' && (
          <div className="mt-20">
            <FeatureComparison plans={pricingPlans} features={featureComparison} />
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            Frequently Asked Questions
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
            {[
              {
                q: "Can I change plans anytime?",
                a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately."
              },
              {
                q: "Is there a free trial?",
                a: "Yes, all paid plans come with a 14-day free trial. No credit card required to start."
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, PayPal, and wire transfers for enterprise customers."
              },
              {
                q: "Can I cancel anytime?",
                a: "Absolutely. You can cancel your subscription at any time with no cancellation fees."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-lg p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">{faq.q}</h4>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
            <h3 className="text-3xl font-bold mb-4">
              Ready to get started?
            </h3>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of businesses already using our platform to grow their success.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-100"
                onClick={() => handlePlanSelect('professional')}
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-white text-white hover:bg-white hover:text-blue-600"
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}