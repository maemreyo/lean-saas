// CREATED: 2025-07-01 - Social proof component for marketing module

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Star, 
  Quote, 
  Users, 
  Award, 
  TrendingUp,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Play,
  Building,
  Globe,
  Heart,
  Zap,
  Target,
  Shield,
  Crown,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ================================================
// TYPES & INTERFACES
// ================================================

interface SocialProofProps {
  variant?: 'testimonials' | 'logos' | 'stats' | 'reviews' | 'carousel' | 'combined'
  showRatings?: boolean
  showAvatars?: boolean
  autoRotate?: boolean
  rotationInterval?: number
  className?: string
}

interface Testimonial {
  id: string
  text: string
  author: string
  position: string
  company: string
  avatar?: string
  rating: number
  featured?: boolean
  video?: boolean
  tags?: string[]
}

interface CompanyLogo {
  id: string
  name: string
  logo: string
  website?: string
  industry?: string
}

interface SocialStat {
  id: string
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  description?: string
}

interface TestimonialCardProps {
  testimonial: Testimonial
  showAvatar?: boolean
  showRating?: boolean
  size?: 'sm' | 'md' | 'lg'
}

interface LogoGridProps {
  logos: CompanyLogo[]
  animated?: boolean
}

interface StatsGridProps {
  stats: SocialStat[]
  layout?: 'grid' | 'row'
}

// ================================================
// SAMPLE DATA
// ================================================

const testimonials: Testimonial[] = [
  {
    id: '1',
    text: "This platform has completely transformed how we manage our SaaS business. The built-in billing system saved us months of development time and the analytics are incredibly detailed.",
    author: "Sarah Johnson",
    position: "CEO",
    company: "TechStart Inc.",
    avatar: "👩‍💼",
    rating: 5,
    featured: true,
    tags: ["Billing", "Analytics"]
  },
  {
    id: '2',
    text: "The marketing tools are phenomenal. We've seen a 300% increase in lead conversion since implementing their A/B testing and email automation features.",
    author: "Mike Chen",
    position: "Marketing Director",
    company: "GrowthLabs",
    avatar: "👨‍💻",
    rating: 5,
    video: true,
    tags: ["Marketing", "Conversion"]
  },
  {
    id: '3',
    text: "Outstanding customer support and the most intuitive interface I've ever used. Our team was up and running in just a few hours.",
    author: "Emily Rodriguez",
    position: "Product Manager",
    company: "InnovaCorp",
    avatar: "👩‍🚀",
    rating: 5,
    tags: ["Support", "UX"]
  },
  {
    id: '4',
    text: "The referral system helped us achieve viral growth. We went from 100 to 10,000 users in just 6 months!",
    author: "David Kim",
    position: "Founder",
    company: "ViralApp",
    avatar: "👨‍🎯",
    rating: 5,
    tags: ["Growth", "Referrals"]
  },
  {
    id: '5',
    text: "Rock-solid infrastructure and amazing performance. Our app has never been more stable and our customers love the experience.",
    author: "Lisa Wang",
    position: "CTO",
    company: "ScaleUp",
    avatar: "👩‍🔬",
    rating: 4,
    tags: ["Infrastructure", "Performance"]
  }
]

const companyLogos: CompanyLogo[] = [
  { id: '1', name: 'TechStart', logo: '🚀', industry: 'Technology' },
  { id: '2', name: 'GrowthLabs', logo: '📈', industry: 'Marketing' },
  { id: '3', name: 'InnovaCorp', logo: '💡', industry: 'Innovation' },
  { id: '4', name: 'ViralApp', logo: '🔥', industry: 'Social' },
  { id: '5', name: 'ScaleUp', logo: '⚡', industry: 'Enterprise' },
  { id: '6', name: 'DataFlow', logo: '📊', industry: 'Analytics' },
  { id: '7', name: 'CloudSync', logo: '☁️', industry: 'Infrastructure' },
  { id: '8', name: 'SecureVault', logo: '🔒', industry: 'Security' }
]

const socialStats: SocialStat[] = [
  {
    id: '1',
    label: 'Happy Customers',
    value: '50,000+',
    icon: Users,
    color: 'text-blue-600',
    description: 'Businesses trust our platform'
  },
  {
    id: '2',
    label: 'Revenue Generated',
    value: '$2.5M+',
    icon: TrendingUp,
    color: 'text-green-600',
    trend: { value: 127, direction: 'up' },
    description: 'For our customers this year'
  },
  {
    id: '3',
    label: 'Average Rating',
    value: '4.9/5',
    icon: Star,
    color: 'text-yellow-600',
    description: 'Based on 2,847 reviews'
  },
  {
    id: '4',
    label: 'Uptime',
    value: '99.9%',
    icon: Shield,
    color: 'text-purple-600',
    description: 'Guaranteed uptime SLA'
  }
]

// ================================================
// TESTIMONIAL CARD COMPONENT
// ================================================

function TestimonialCard({ 
  testimonial, 
  showAvatar = true, 
  showRating = true, 
  size = 'md' 
}: TestimonialCardProps) {
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-300",
      sizeClasses[size],
      testimonial.featured && "ring-2 ring-blue-500 border-blue-300"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        {showRating && (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={cn(
                  "h-4 w-4",
                  i < testimonial.rating 
                    ? "text-yellow-400 fill-current" 
                    : "text-gray-300"
                )} 
              />
            ))}
          </div>
        )}
        
        {testimonial.featured && (
          <Badge className="bg-blue-100 text-blue-800">
            Featured
          </Badge>
        )}
        
        {testimonial.video && (
          <Button variant="outline" size="sm" className="ml-2">
            <Play className="h-3 w-3 mr-1" />
            Video
          </Button>
        )}
      </div>

      {/* Quote */}
      <div className="mb-6">
        <Quote className="h-6 w-6 text-gray-400 mb-3" />
        <p className={cn(
          "text-gray-700 leading-relaxed",
          size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
        )}>
          {testimonial.text}
        </p>
      </div>

      {/* Author */}
      <div className="flex items-center gap-4">
        {showAvatar && (
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl">
            {testimonial.avatar || '👤'}
          </div>
        )}
        
        <div className="flex-1">
          <div className="font-semibold text-gray-900">{testimonial.author}</div>
          <div className="text-sm text-gray-600">
            {testimonial.position} at {testimonial.company}
          </div>
        </div>
      </div>

      {/* Tags */}
      {testimonial.tags && testimonial.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
          {testimonial.tags.map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ================================================
// LOGO GRID COMPONENT
// ================================================

function LogoGrid({ logos, animated = false }: LogoGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8 items-center",
      animated && "animate-pulse"
    )}>
      {logos.map((logo, index) => (
        <div 
          key={logo.id}
          className="flex items-center justify-center p-4 grayscale hover:grayscale-0 transition-all duration-300 hover:scale-110"
          style={{ 
            animationDelay: animated ? `${index * 0.1}s` : undefined 
          }}
        >
          <div className="text-4xl opacity-60 hover:opacity-100 transition-opacity">
            {logo.logo}
          </div>
        </div>
      ))}
    </div>
  )
}

// ================================================
// STATS GRID COMPONENT
// ================================================

function StatsGrid({ stats, layout = 'grid' }: StatsGridProps) {
  return (
    <div className={cn(
      layout === 'grid' 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        : "flex flex-wrap justify-center gap-8"
    )}>
      {stats.map((stat) => (
        <div key={stat.id} className="text-center">
          <div className={cn(
            "w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center",
            stat.color.includes('blue') ? 'bg-blue-100' :
            stat.color.includes('green') ? 'bg-green-100' :
            stat.color.includes('yellow') ? 'bg-yellow-100' :
            stat.color.includes('purple') ? 'bg-purple-100' :
            'bg-gray-100'
          )}>
            <stat.icon className={cn("h-6 w-6", stat.color)} />
          </div>
          
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {stat.value}
          </div>
          
          <div className="font-medium text-gray-900 mb-1">
            {stat.label}
          </div>
          
          {stat.description && (
            <div className="text-sm text-gray-600">
              {stat.description}
            </div>
          )}
          
          {stat.trend && (
            <div className={cn(
              "text-xs font-medium mt-2",
              stat.trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
            )}>
              {stat.trend.direction === 'up' ? '↗' : '↘'} {stat.trend.value}%
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ================================================
// TESTIMONIAL CAROUSEL COMPONENT
// ================================================

function TestimonialCarousel({ 
  testimonials, 
  autoRotate = true, 
  interval = 5000 
}: {
  testimonials: Testimonial[]
  autoRotate?: boolean
  interval?: number
}) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Auto-rotation
  useEffect(() => {
    if (!autoRotate) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    }, interval)

    return () => clearInterval(timer)
  }, [autoRotate, interval, testimonials.length])

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const currentTestimonial = testimonials[currentIndex]

  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Main Testimonial */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 md:p-12 text-center">
        <div className="mb-6">
          <div className="flex justify-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={cn(
                  "h-5 w-5",
                  i < currentTestimonial.rating 
                    ? "text-yellow-400 fill-current" 
                    : "text-gray-300"
                )} 
              />
            ))}
          </div>
          
          <blockquote className="text-xl md:text-2xl text-gray-900 font-medium leading-relaxed mb-8">
            "{currentTestimonial.text}"
          </blockquote>
        </div>
        
        <div className="flex items-center justify-center gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">
            {currentTestimonial.avatar || '👤'}
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900">{currentTestimonial.author}</div>
            <div className="text-gray-600">{currentTestimonial.position} at {currentTestimonial.company}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={prevTestimonial}
          className="rounded-full w-10 h-10 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Dots */}
        <div className="flex gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex 
                  ? "bg-blue-600 w-6" 
                  : "bg-gray-300 hover:bg-gray-400"
              )}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={nextTestimonial}
          className="rounded-full w-10 h-10 p-0"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ================================================
// MAIN COMPONENT
// ================================================

export function SocialProof({
  variant = 'combined',
  showRatings = true,
  showAvatars = true,
  autoRotate = true,
  rotationInterval = 5000,
  className
}: SocialProofProps) {
  const renderVariant = () => {
    switch (variant) {
      case 'testimonials':
        return (
          <div className="space-y-12">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                What Our Customers Say
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Don't just take our word for it. Here's what real customers have to say about their experience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.slice(0, 6).map((testimonial) => (
                <TestimonialCard
                  key={testimonial.id}
                  testimonial={testimonial}
                  showAvatar={showAvatars}
                  showRating={showRatings}
                />
              ))}
            </div>
          </div>
        )

      case 'logos':
        return (
          <div className="space-y-12">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Trusted by Leading Companies
              </h2>
              <p className="text-gray-600">
                Join thousands of businesses already growing with our platform
              </p>
            </div>

            <LogoGrid logos={companyLogos} animated={autoRotate} />
          </div>
        )

      case 'stats':
        return (
          <div className="space-y-12">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Proven Results
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Our platform delivers measurable results for businesses of all sizes.
              </p>
            </div>

            <StatsGrid stats={socialStats} />
          </div>
        )

      case 'reviews':
        return (
          <div className="space-y-12">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Customer Reviews
              </h2>
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                  ))}
                </div>
                <span className="text-lg font-semibold text-gray-900">4.9 out of 5</span>
                <span className="text-gray-600">(2,847 reviews)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {testimonials.slice(0, 4).map((testimonial) => (
                <TestimonialCard
                  key={testimonial.id}
                  testimonial={testimonial}
                  showAvatar={showAvatars}
                  showRating={showRatings}
                  size="lg"
                />
              ))}
            </div>
          </div>
        )

      case 'carousel':
        return (
          <div className="space-y-12">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Customer Success Stories
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Discover how our customers are achieving their goals with our platform.
              </p>
            </div>

            <TestimonialCarousel
              testimonials={testimonials}
              autoRotate={autoRotate}
              interval={rotationInterval}
            />
          </div>
        )

      default: // 'combined'
        return (
          <div className="space-y-20">
            {/* Stats Section */}
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12">
                Join Thousands of Successful Businesses
              </h2>
              <StatsGrid stats={socialStats} layout="row" />
            </div>

            {/* Logo Section */}
            <div className="text-center">
              <p className="text-gray-600 mb-8">Trusted by leading companies</p>
              <LogoGrid logos={companyLogos} />
            </div>

            {/* Featured Testimonial */}
            <TestimonialCarousel
              testimonials={testimonials.filter(t => t.featured)}
              autoRotate={autoRotate}
              interval={rotationInterval}
            />

            {/* More Testimonials Grid */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                More Customer Stories
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {testimonials.filter(t => !t.featured).slice(0, 3).map((testimonial) => (
                  <TestimonialCard
                    key={testimonial.id}
                    testimonial={testimonial}
                    showAvatar={showAvatars}
                    showRating={showRatings}
                  />
                ))}
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className={cn("bg-white py-20", className)}>
      <div className="max-w-7xl mx-auto px-6">
        {renderVariant()}

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Join Them?
            </h3>
            <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
              Start your free trial today and see why thousands of businesses choose our platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-100"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-white text-white hover:bg-white hover:text-blue-600"
              >
                View All Reviews
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}