// CREATED: 2025-07-01 - Hero sections component for marketing module

'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Play, 
  Star, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  Zap,
  Shield,
  Target,
  TrendingUp,
  Award,
  Globe,
  Sparkles,
  Heart,
  Eye,
  Copy,
  Settings,
  Palette,
  Type,
  Image as ImageIcon,
  Video,
  MousePointer
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ================================================
// TYPES & INTERFACES
// ================================================

interface HeroSectionsProps {
  variant?: 'centered' | 'split' | 'video' | 'minimal' | 'feature-rich' | 'testimonial'
  theme?: 'light' | 'dark' | 'gradient' | 'custom'
  showCustomizer?: boolean
  onVariantChange?: (variant: string) => void
  className?: string
}

interface HeroVariantProps {
  title: string
  subtitle: string
  primaryCTA: string
  secondaryCTA?: string
  features?: string[]
  socialProof?: {
    rating: number
    reviewCount: number
    userCount: string
  }
  testimonial?: {
    text: string
    author: string
    company: string
    avatar?: string
  }
  onPrimaryClick?: () => void
  onSecondaryClick?: () => void
  className?: string
}

interface VariantSelectorProps {
  variants: Array<{
    id: string
    name: string
    description: string
    preview: string
  }>
  activeVariant: string
  onSelect: (variant: string) => void
}

// ================================================
// HERO VARIANTS
// ================================================

// Centered Hero
function CenteredHero({ 
  title, 
  subtitle, 
  primaryCTA, 
  secondaryCTA, 
  features, 
  socialProof,
  onPrimaryClick, 
  onSecondaryClick,
  className 
}: HeroVariantProps) {
  return (
    <div className={cn("bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20", className)}>
      <div className="max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <Badge className="mb-6 bg-blue-100 text-blue-800 hover:bg-blue-200">
          <Sparkles className="h-3 w-3 mr-1" />
          New: Advanced Features Available
        </Badge>

        {/* Main Content */}
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          {title}
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button 
            size="lg" 
            onClick={onPrimaryClick}
            className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4"
          >
            {primaryCTA}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          
          {secondaryCTA && (
            <Button 
              variant="outline" 
              size="lg"
              onClick={onSecondaryClick}
              className="text-lg px-8 py-4"
            >
              <Play className="mr-2 h-5 w-5" />
              {secondaryCTA}
            </Button>
          )}
        </div>

        {/* Social Proof */}
        {socialProof && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn(
                      "h-4 w-4",
                      i < socialProof.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                    )} 
                  />
                ))}
              </div>
              <span className="font-medium">
                {socialProof.rating}/5 ({socialProof.reviewCount.toLocaleString()} reviews)
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span>{socialProof.userCount} happy customers</span>
            </div>
          </div>
        )}

        {/* Features */}
        {features && features.length > 0 && (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center justify-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Split Hero
function SplitHero({ 
  title, 
  subtitle, 
  primaryCTA, 
  secondaryCTA, 
  features,
  onPrimaryClick, 
  onSecondaryClick,
  className 
}: HeroVariantProps) {
  return (
    <div className={cn("bg-white py-20", className)}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {title}
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              {subtitle}
            </p>

            {/* Features List */}
            {features && features.length > 0 && (
              <div className="space-y-4 mb-8">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                onClick={onPrimaryClick}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {primaryCTA}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              {secondaryCTA && (
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={onSecondaryClick}
                >
                  {secondaryCTA}
                </Button>
              )}
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl aspect-square max-w-md mx-auto flex items-center justify-center text-white">
              <div className="text-center">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-10 w-10" />
                </div>
                <div className="text-xl font-semibold">Product Demo</div>
                <div className="text-blue-100">Interactive Preview</div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-white rounded-lg shadow-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="font-medium">+127% Growth</span>
              </div>
            </div>
            
            <div className="absolute -bottom-4 -left-4 bg-white rounded-lg shadow-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Enterprise Security</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Video Hero
function VideoHero({ 
  title, 
  subtitle, 
  primaryCTA, 
  secondaryCTA,
  onPrimaryClick, 
  onSecondaryClick,
  className 
}: HeroVariantProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className={cn("relative bg-gray-900 py-20 overflow-hidden", className)}>
      {/* Background Video/Image */}
      <div className="absolute inset-0">
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 w-full h-full opacity-90"></div>
        {/* Video would go here */}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-6 text-center text-white">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          {title}
        </h1>
        
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>

        {/* Video Play Button */}
        <div className="mb-8">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="group relative inline-flex items-center justify-center w-20 h-20 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-300 backdrop-blur-sm"
          >
            <Play className="h-8 w-8 ml-1 group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 rounded-full border-2 border-white/30 group-hover:border-white/50 transition-colors"></div>
          </button>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            onClick={onPrimaryClick}
            className="bg-white text-gray-900 hover:bg-gray-100 text-lg px-8"
          >
            {primaryCTA}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          
          {secondaryCTA && (
            <Button 
              variant="outline" 
              size="lg"
              onClick={onSecondaryClick}
              className="border-white text-white hover:bg-white hover:text-gray-900 text-lg px-8"
            >
              {secondaryCTA}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Minimal Hero
function MinimalHero({ 
  title, 
  subtitle, 
  primaryCTA,
  onPrimaryClick,
  className 
}: HeroVariantProps) {
  return (
    <div className={cn("bg-white py-24", className)}>
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
          {title}
        </h1>
        
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          {subtitle}
        </p>

        <Button 
          size="lg" 
          onClick={onPrimaryClick}
          className="bg-gray-900 hover:bg-gray-800 text-lg px-8"
        >
          {primaryCTA}
        </Button>
      </div>
    </div>
  )
}

// Feature Rich Hero
function FeatureRichHero({ 
  title, 
  subtitle, 
  primaryCTA, 
  secondaryCTA, 
  features,
  socialProof,
  onPrimaryClick, 
  onSecondaryClick,
  className 
}: HeroVariantProps) {
  const iconComponents = [Shield, Target, Zap, Award, Globe, Heart]

  return (
    <div className={cn("bg-gradient-to-br from-gray-50 to-blue-50 py-20", className)}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Main Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            {title}
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            {subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              size="lg" 
              onClick={onPrimaryClick}
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8"
            >
              {primaryCTA}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            {secondaryCTA && (
              <Button 
                variant="outline" 
                size="lg"
                onClick={onSecondaryClick}
                className="text-lg px-8"
              >
                {secondaryCTA}
              </Button>
            )}
          </div>

          {/* Social Proof */}
          {socialProof && (
            <div className="text-sm text-gray-600">
              <div className="flex items-center justify-center gap-2 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn(
                      "h-4 w-4",
                      i < socialProof.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                    )} 
                  />
                ))}
                <span className="ml-2 font-medium">{socialProof.rating}/5</span>
              </div>
              <div>Trusted by {socialProof.userCount} businesses worldwide</div>
            </div>
          )}
        </div>

        {/* Features Grid */}
        {features && features.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = iconComponents[index % iconComponents.length]
              return (
                <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature}</h3>
                  <p className="text-gray-600 text-sm">
                    Powerful feature that helps you achieve your goals faster and more efficiently.
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Testimonial Hero
function TestimonialHero({ 
  title, 
  subtitle, 
  primaryCTA, 
  testimonial,
  onPrimaryClick,
  className 
}: HeroVariantProps) {
  return (
    <div className={cn("bg-white py-20", className)}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {title}
          </h1>
          
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>

          <Button 
            size="lg" 
            onClick={onPrimaryClick}
            className="bg-blue-600 hover:bg-blue-700 text-lg px-8"
          >
            {primaryCTA}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Testimonial */}
        {testimonial && (
          <div className="bg-gray-50 rounded-2xl p-8 md:p-12 text-center">
            <div className="mb-6">
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <blockquote className="text-xl md:text-2xl text-gray-900 font-medium leading-relaxed">
                "{testimonial.text}"
              </blockquote>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">{testimonial.author}</div>
                <div className="text-gray-600">{testimonial.company}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ================================================
// VARIANT SELECTOR COMPONENT
// ================================================

function VariantSelector({ variants, activeVariant, onSelect }: VariantSelectorProps) {
  return (
    <div className="bg-white border-b border-gray-200 p-6">
      <div className="max-w-7xl mx-auto">
        <h3 className="font-semibold text-gray-900 mb-4">Choose Hero Style</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {variants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => onSelect(variant.id)}
              className={cn(
                "text-left p-4 rounded-lg border-2 transition-all hover:shadow-md",
                activeVariant === variant.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="text-2xl mb-2">{variant.preview}</div>
              <div className="font-medium text-gray-900 mb-1">{variant.name}</div>
              <div className="text-xs text-gray-600">{variant.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ================================================
// MAIN COMPONENT
// ================================================

export function HeroSections({
  variant = 'centered',
  theme = 'light',
  showCustomizer = true,
  onVariantChange,
  className
}: HeroSectionsProps) {
  const [activeVariant, setActiveVariant] = useState(variant)

  const variants = [
    {
      id: 'centered',
      name: 'Centered',
      description: 'Classic centered layout',
      preview: '🎯'
    },
    {
      id: 'split',
      name: 'Split',
      description: 'Text + visual split',
      preview: '📱'
    },
    {
      id: 'video',
      name: 'Video',
      description: 'Video background hero',
      preview: '🎬'
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Clean and simple',
      preview: '✨'
    },
    {
      id: 'feature-rich',
      name: 'Feature Rich',
      description: 'Hero with features grid',
      preview: '🚀'
    },
    {
      id: 'testimonial',
      name: 'Testimonial',
      description: 'Hero with social proof',
      preview: '⭐'
    }
  ]

  // Sample data
  const heroData = {
    title: "Build Amazing SaaS Products Faster",
    subtitle: "The complete platform for indie hackers and startups to launch, grow, and scale their SaaS business with confidence.",
    primaryCTA: "Start Free Trial",
    secondaryCTA: "Watch Demo",
    features: [
      "Advanced billing & usage tracking",
      "Built-in marketing tools",
      "Team collaboration features",
      "Enterprise-grade security",
      "99.9% uptime guarantee",
      "24/7 premium support"
    ],
    socialProof: {
      rating: 4.9,
      reviewCount: 2847,
      userCount: "10,000+"
    },
    testimonial: {
      text: "This platform helped us launch our SaaS in just 2 weeks. The built-in features saved us months of development time.",
      author: "Sarah Johnson",
      company: "TechStartup Inc."
    }
  }

  const handleVariantSelect = useCallback((variantId: string) => {
    setActiveVariant(variantId)
    onVariantChange?.(variantId)
  }, [onVariantChange])

  const handlePrimaryClick = () => {
    console.log('Primary CTA clicked')
  }

  const handleSecondaryClick = () => {
    console.log('Secondary CTA clicked')
  }

  const renderHeroVariant = () => {
    const commonProps = {
      ...heroData,
      onPrimaryClick: handlePrimaryClick,
      onSecondaryClick: handleSecondaryClick,
      className: className
    }

    switch (activeVariant) {
      case 'split':
        return <SplitHero {...commonProps} />
      case 'video':
        return <VideoHero {...commonProps} />
      case 'minimal':
        return <MinimalHero {...commonProps} />
      case 'feature-rich':
        return <FeatureRichHero {...commonProps} />
      case 'testimonial':
        return <TestimonialHero {...commonProps} />
      default:
        return <CenteredHero {...commonProps} />
    }
  }

  return (
    <div className="bg-white">
      {/* Variant Selector */}
      {showCustomizer && (
        <VariantSelector
          variants={variants}
          activeVariant={activeVariant}
          onSelect={handleVariantSelect}
        />
      )}

      {/* Selected Hero Variant */}
      {renderHeroVariant()}

      {/* Customizer Panel */}
      {showCustomizer && (
        <div className="bg-gray-50 border-t border-gray-200 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Hero Customization</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Currently showing: {variants.find(v => v.id === activeVariant)?.name}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm">
                  <Palette className="h-4 w-4 mr-2" />
                  Colors
                </Button>
                <Button variant="outline" size="sm">
                  <Type className="h-4 w-4 mr-2" />
                  Typography
                </Button>
                <Button variant="outline" size="sm">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Media
                </Button>
                <Button variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}