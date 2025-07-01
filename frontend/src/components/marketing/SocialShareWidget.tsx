// CREATED: 2025-07-01 - Social share widget component for marketing module

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Share2, 
  Copy, 
  Check,
  ExternalLink,
  Users,
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  QrCode,
  Mail,
  Phone,
  Link as LinkIcon,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Github,
  Globe,
  Download,
  Eye,
  TrendingUp,
  Zap,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ================================================
// TYPES & INTERFACES
// ================================================

interface SocialShareWidgetProps {
  url: string
  title: string
  description?: string
  hashtags?: string[]
  via?: string
  variant?: 'floating' | 'inline' | 'modal' | 'compact' | 'detailed'
  size?: 'sm' | 'md' | 'lg'
  position?: 'left' | 'right' | 'bottom' | 'top'
  showCounts?: boolean
  showLabels?: boolean
  customMessage?: string
  referralCode?: string
  onShare?: (platform: string, url: string) => void
  className?: string
}

interface SharePlatform {
  id: string
  name: string
  icon: React.ElementType
  color: string
  shareUrl: (params: ShareParams) => string
  isNative?: boolean
}

interface ShareParams {
  url: string
  title: string
  description?: string
  hashtags?: string[]
  via?: string
  customMessage?: string
}

interface ShareButtonProps {
  platform: SharePlatform
  params: ShareParams
  size: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showCount?: boolean
  count?: number
  onClick?: () => void
}

interface ShareStatsProps {
  url: string
  shares?: Record<string, number>
  views?: number
  engagement?: number
}

// ================================================
// PLATFORM CONFIGURATIONS
// ================================================

const sharePlatforms: SharePlatform[] = [
  {
    id: 'twitter',
    name: 'Twitter',
    icon: Twitter,
    color: 'hover:bg-blue-500 hover:text-white',
    shareUrl: ({ url, title, hashtags, via }: ShareParams) => {
      const hashtagString = hashtags?.length ? hashtags.map(tag => `#${tag}`).join(' ') : ''
      const viaString = via ? `via @${via}` : ''
      const text = `${title} ${hashtagString} ${viaString}`.trim()
      return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    }
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'hover:bg-blue-600 hover:text-white',
    shareUrl: ({ url, title }: ShareParams) => 
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'hover:bg-blue-700 hover:text-white',
    shareUrl: ({ url, title, description }: ShareParams) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(description || '')}`
  },
  {
    id: 'email',
    name: 'Email',
    icon: Mail,
    color: 'hover:bg-gray-600 hover:text-white',
    shareUrl: ({ url, title, description, customMessage }: ShareParams) => {
      const subject = encodeURIComponent(title)
      const body = encodeURIComponent(
        `${customMessage || description || title}\n\n${url}`
      )
      return `mailto:?subject=${subject}&body=${body}`
    },
    isNative: true
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: MessageCircle,
    color: 'hover:bg-green-500 hover:text-white',
    shareUrl: ({ url, title, customMessage }: ShareParams) => {
      const text = encodeURIComponent(`${customMessage || title}\n${url}`)
      return `https://wa.me/?text=${text}`
    }
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: Send,
    color: 'hover:bg-blue-500 hover:text-white',
    shareUrl: ({ url, title }: ShareParams) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
  },
  {
    id: 'copy',
    name: 'Copy Link',
    icon: Copy,
    color: 'hover:bg-gray-500 hover:text-white',
    shareUrl: ({ url }: ShareParams) => url
  }
]

// ================================================
// SHARE BUTTON COMPONENT
// ================================================

function ShareButton({ 
  platform, 
  params, 
  size, 
  showLabel = true, 
  showCount = false, 
  count = 0,
  onClick 
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const sizeClasses = {
    sm: {
      button: 'w-8 h-8 p-1',
      icon: 'h-4 w-4',
      text: 'text-xs',
      gap: 'gap-1'
    },
    md: {
      button: 'w-10 h-10 p-2',
      icon: 'h-5 w-5',
      text: 'text-sm',
      gap: 'gap-2'
    },
    lg: {
      button: 'w-12 h-12 p-3',
      icon: 'h-6 w-6',
      text: 'text-base',
      gap: 'gap-3'
    }
  }

  const handleClick = async () => {
    if (platform.id === 'copy') {
      try {
        await navigator.clipboard.writeText(params.url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    } else {
      const shareUrl = platform.shareUrl(params)
      if (platform.isNative) {
        window.location.href = shareUrl
      } else {
        window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes')
      }
    }
    
    onClick?.()
  }

  const classes = sizeClasses[size]

  if (!showLabel) {
    // Icon-only button
    return (
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center justify-center border border-gray-200 rounded-lg transition-all duration-200",
          classes.button,
          platform.color,
          copied && platform.id === 'copy' && "bg-green-500 text-white border-green-500"
        )}
        title={platform.name}
      >
        {copied && platform.id === 'copy' ? (
          <Check className={classes.icon} />
        ) : (
          <platform.icon className={classes.icon} />
        )}
      </button>
    )
  }

  // Button with label
  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center border border-gray-200 rounded-lg px-4 py-2 transition-all duration-200",
        classes.gap,
        classes.text,
        platform.color,
        copied && platform.id === 'copy' && "bg-green-500 text-white border-green-500"
      )}
    >
      {copied && platform.id === 'copy' ? (
        <Check className={classes.icon} />
      ) : (
        <platform.icon className={classes.icon} />
      )}
      
      <span className="font-medium">
        {copied && platform.id === 'copy' ? 'Copied!' : platform.name}
      </span>
      
      {showCount && count > 0 && (
        <Badge variant="secondary" className="ml-2 text-xs">
          {count > 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </Badge>
      )}
    </button>
  )
}

// ================================================
// SHARE STATS COMPONENT
// ================================================

function ShareStats({ url, shares = {}, views = 0, engagement = 0 }: ShareStatsProps) {
  const totalShares = Object.values(shares).reduce((sum, count) => sum + count, 0)

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        Share Analytics
      </h4>
      
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-blue-600">{totalShares}</div>
          <div className="text-xs text-gray-600">Total Shares</div>
        </div>
        
        <div>
          <div className="text-2xl font-bold text-green-600">
            {views > 1000 ? `${(views / 1000).toFixed(1)}k` : views}
          </div>
          <div className="text-xs text-gray-600">Views</div>
        </div>
        
        <div>
          <div className="text-2xl font-bold text-purple-600">
            {engagement > 0 ? `${engagement.toFixed(1)}%` : '0%'}
          </div>
          <div className="text-xs text-gray-600">Engagement</div>
        </div>
      </div>

      {Object.keys(shares).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-2">
            {Object.entries(shares).map(([platform, count]) => {
              const platformConfig = sharePlatforms.find(p => p.id === platform)
              if (!platformConfig || count === 0) return null
              
              return (
                <div key={platform} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <platformConfig.icon className="h-3 w-3 text-gray-600" />
                    <span className="text-gray-700">{platformConfig.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ================================================
// QR CODE COMPONENT
// ================================================

function QRCodeShare({ url, title }: { url: string; title: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
      <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
        <QrCode className="h-16 w-16 text-gray-400" />
      </div>
      
      <h4 className="font-medium text-gray-900 mb-2">Scan to Share</h4>
      <p className="text-sm text-gray-600 mb-4">
        Scan this QR code to quickly share the link
      </p>
      
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Download QR
      </Button>
    </div>
  )
}

// ================================================
// MAIN COMPONENT
// ================================================

export function SocialShareWidget({
  url,
  title,
  description,
  hashtags = [],
  via,
  variant = 'inline',
  size = 'md',
  position = 'left',
  showCounts = false,
  showLabels = true,
  customMessage,
  referralCode,
  onShare,
  className
}: SocialShareWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [shareStats, setShareStats] = useState({
    shares: { twitter: 45, facebook: 32, linkedin: 18 },
    views: 1247,
    engagement: 12.5
  })

  // Add referral code to URL if provided
  const shareUrl = referralCode 
    ? `${url}${url.includes('?') ? '&' : '?'}ref=${referralCode}`
    : url

  const shareParams: ShareParams = {
    url: shareUrl,
    title,
    description,
    hashtags,
    via,
    customMessage
  }

  const handleShare = useCallback((platform: string) => {
    onShare?.(platform, shareUrl)
    
    // Track share analytics (mock)
    setShareStats(prev => ({
      ...prev,
      shares: {
        ...prev.shares,
        [platform]: (prev.shares[platform] || 0) + 1
      }
    }))
  }, [shareUrl, onShare])

  const renderFloatingWidget = () => (
    <div className={cn(
      "fixed z-50 flex flex-col gap-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2",
      position === 'left' && "left-4 top-1/2 transform -translate-y-1/2",
      position === 'right' && "right-4 top-1/2 transform -translate-y-1/2",
      position === 'bottom' && "bottom-4 left-1/2 transform -translate-x-1/2 flex-row",
      position === 'top' && "top-4 left-1/2 transform -translate-x-1/2 flex-row"
    )}>
      {sharePlatforms.slice(0, 5).map((platform) => (
        <ShareButton
          key={platform.id}
          platform={platform}
          params={shareParams}
          size={size}
          showLabel={false}
          onClick={() => handleShare(platform.id)}
        />
      ))}
    </div>
  )

  const renderInlineWidget = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Share2 className="h-5 w-5 text-gray-600" />
        <span className="font-medium text-gray-900">Share this content</span>
      </div>
      
      <div className={cn(
        "flex gap-3",
        showLabels ? "flex-wrap" : "flex-nowrap"
      )}>
        {sharePlatforms.map((platform) => (
          <ShareButton
            key={platform.id}
            platform={platform}
            params={shareParams}
            size={size}
            showLabel={showLabels}
            showCount={showCounts}
            count={shareStats.shares[platform.id]}
            onClick={() => handleShare(platform.id)}
          />
        ))}
      </div>
    </div>
  )

  const renderCompactWidget = () => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>
      
      {isOpen && (
        <div className="flex items-center gap-2">
          {sharePlatforms.slice(0, 4).map((platform) => (
            <ShareButton
              key={platform.id}
              platform={platform}
              params={shareParams}
              size="sm"
              showLabel={false}
              onClick={() => {
                handleShare(platform.id)
                setIsOpen(false)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )

  const renderDetailedWidget = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Share this content</h3>
        <p className="text-gray-600">{description || title}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Share Buttons */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Choose Platform</h4>
          <div className="space-y-2">
            {sharePlatforms.map((platform) => (
              <ShareButton
                key={platform.id}
                platform={platform}
                params={shareParams}
                size={size}
                showLabel={true}
                showCount={showCounts}
                count={shareStats.shares[platform.id]}
                onClick={() => handleShare(platform.id)}
              />
            ))}
          </div>
        </div>

        {/* Stats & QR */}
        <div className="space-y-4">
          <ShareStats
            url={shareUrl}
            shares={shareStats.shares}
            views={shareStats.views}
            engagement={shareStats.engagement}
          />
          
          <QRCodeShare url={shareUrl} title={title} />
        </div>
      </div>

      {/* Custom Message */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Custom Message</h4>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          placeholder="Add a personal message..."
          defaultValue={customMessage}
        />
      </div>
    </div>
  )

  const renderModalWidget = () => (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Share Content</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  ✕
                </Button>
              </div>

              {renderDetailedWidget()}
            </div>
          </div>
        </div>
      )}
    </>
  )

  const renderWidget = () => {
    switch (variant) {
      case 'floating':
        return renderFloatingWidget()
      case 'modal':
        return renderModalWidget()
      case 'compact':
        return renderCompactWidget()
      case 'detailed':
        return renderDetailedWidget()
      default:
        return renderInlineWidget()
    }
  }

  return (
    <div className={className}>
      {renderWidget()}
    </div>
  )
}

// ================================================
// PRESET CONFIGURATIONS
// ================================================

// Floating Share Buttons
export function FloatingShareButtons(props: Omit<SocialShareWidgetProps, 'variant'>) {
  return (
    <SocialShareWidget
      {...props}
      variant="floating"
      size="md"
      showLabels={false}
    />
  )
}

// Blog Post Share Widget
export function BlogPostShare(props: Omit<SocialShareWidgetProps, 'variant' | 'showLabels'>) {
  return (
    <SocialShareWidget
      {...props}
      variant="inline"
      showLabels={true}
      showCounts={true}
    />
  )
}

// Product Share Modal
export function ProductShareModal(props: Omit<SocialShareWidgetProps, 'variant'>) {
  return (
    <SocialShareWidget
      {...props}
      variant="modal"
      showLabels={true}
      showCounts={true}
    />
  )
}

// Referral Share Widget
export function ReferralShareWidget(props: Omit<SocialShareWidgetProps, 'customMessage'>) {
  return (
    <SocialShareWidget
      {...props}
      variant="detailed"
      customMessage="Check out this amazing platform I've been using! You'll get a special discount with my referral link:"
      showCounts={true}
    />
  )
}