// CREATED: 2025-07-01 - Referral dashboard component for marketing module

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useReferrals } from '@/hooks/marketing/useReferrals'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Progress } from '@/components/ui/Progress'
import { 
  Share2, 
  Copy, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Gift,
  ExternalLink,
  Mail,
  MessageCircle,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  CheckCircle,
  AlertCircle,
  Calendar,
  Download,
  Target,
  Award,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { 
  ReferralCode, 
  ReferralConversion,
  CreateReferralCodeRequest 
} from '@/shared/types/marketing'

// ================================================
// TYPES & INTERFACES
// ================================================

interface ReferralDashboardProps {
  organizationId: string
  userId?: string
  showPublicView?: boolean
  className?: string
}

interface ReferralStatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  color?: 'blue' | 'green' | 'purple' | 'orange'
}

interface SocialShareButtonProps {
  platform: 'twitter' | 'facebook' | 'linkedin' | 'email' | 'sms'
  referralUrl: string
  message: string
  className?: string
}

// ================================================
// STATS CARD COMPONENT
// ================================================

function ReferralStatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = 'blue' 
}: ReferralStatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("p-2 rounded-lg border", colorClasses[color])}>
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-medium text-gray-900">{title}</h3>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            {subtitle && (
              <div className="text-sm text-gray-600">{subtitle}</div>
            )}
          </div>
        </div>

        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
          )}>
            <TrendingUp className={cn(
              "h-4 w-4",
              trend.direction === 'down' && 'rotate-180'
            )} />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ================================================
// SOCIAL SHARE COMPONENT
// ================================================

function SocialShareButton({ platform, referralUrl, message, className }: SocialShareButtonProps) {
  const platforms = {
    twitter: {
      icon: Twitter,
      name: 'Twitter',
      color: 'bg-blue-400 hover:bg-blue-500',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(referralUrl)}`
    },
    facebook: {
      icon: Facebook,
      name: 'Facebook',
      color: 'bg-blue-600 hover:bg-blue-700',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`
    },
    linkedin: {
      icon: Linkedin,
      name: 'LinkedIn',
      color: 'bg-blue-700 hover:bg-blue-800',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`
    },
    email: {
      icon: Mail,
      name: 'Email',
      color: 'bg-gray-600 hover:bg-gray-700',
      url: `mailto:?subject=${encodeURIComponent('Check this out!')}&body=${encodeURIComponent(`${message} ${referralUrl}`)}`
    },
    sms: {
      icon: MessageCircle,
      name: 'SMS',
      color: 'bg-green-600 hover:bg-green-700',
      url: `sms:?body=${encodeURIComponent(`${message} ${referralUrl}`)}`
    }
  }

  const config = platforms[platform]
  const Icon = config.icon

  const handleClick = () => {
    window.open(config.url, '_blank', 'width=600,height=400')
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 border-0 text-white transition-colors",
        config.color,
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{config.name}</span>
    </Button>
  )
}

// ================================================
// MAIN COMPONENT
// ================================================

export function ReferralDashboard({
  organizationId,
  userId,
  showPublicView = false,
  className
}: ReferralDashboardProps) {
  // Hooks
  const { 
    analytics,
    userStats,
    loading,
    error,
    fetchAnalytics,
    fetchUserStats
  } = useReferrals(organizationId)

  // State
  const [activeTab, setActiveTab] = useState('overview')
  const [myReferralCode, setMyReferralCode] = useState<ReferralCode | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [shareMessage, setShareMessage] = useState(
    "Check out this amazing product I've been using! You'll get a special discount with my referral link:"
  )

  // Sample referral data (would come from actual API)
  const [referralUrl] = useState(`https://yourapp.com/?ref=USER123`)

  // Copy referral URL
  const copyReferralUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }, [referralUrl])

  // Generate new referral code
  const generateReferralCode = useCallback(async () => {
    // This would call the actual API
    console.log('Generating new referral code...')
  }, [])

  // Auto-fetch data on mount
  useEffect(() => {
    if (organizationId) {
      fetchAnalytics()
      if (userId) {
        fetchUserStats(userId)
      }
    }
  }, [organizationId, userId, fetchAnalytics, fetchUserStats])

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading referral dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Error loading referral dashboard:</span>
          <span>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("bg-white rounded-lg shadow-sm border border-gray-200", className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Referral Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Share your link and earn rewards for every referral
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Gift className="h-3 w-3 mr-1" />
              Active Program
            </Badge>
            <Button onClick={generateReferralCode} variant="outline">
              <Zap className="h-4 w-4 mr-2" />
              Generate New Code
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <Target className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="share">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </TabsTrigger>
            <TabsTrigger value="earnings">
              <DollarSign className="h-4 w-4 mr-2" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="leaderboard">
              <Award className="h-4 w-4 mr-2" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ReferralStatsCard
                  title="Total Referrals"
                  value={userStats?.total_referrals || analytics?.total_referrals || 0}
                  subtitle="All time"
                  icon={Users}
                  color="blue"
                  trend={{ value: 12, direction: 'up' }}
                />
                
                <ReferralStatsCard
                  title="Conversions"
                  value={userStats?.successful_conversions || 0}
                  subtitle={`${((userStats?.successful_conversions || 0) / Math.max(userStats?.total_referrals || 1, 1) * 100).toFixed(1)}% rate`}
                  icon={CheckCircle}
                  color="green"
                  trend={{ value: 8, direction: 'up' }}
                />
                
                <ReferralStatsCard
                  title="Total Earned"
                  value={`$${(userStats?.total_earned || 0).toFixed(2)}`}
                  subtitle="Commission earned"
                  icon={DollarSign}
                  color="purple"
                  trend={{ value: 24, direction: 'up' }}
                />
                
                <ReferralStatsCard
                  title="This Month"
                  value={userStats?.month_referrals || 0}
                  subtitle="New referrals"
                  icon={Calendar}
                  color="orange"
                  trend={{ value: 5, direction: 'up' }}
                />
              </div>

              {/* Progress to Next Tier */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Progress to VIP Tier</h3>
                    <p className="text-sm text-gray-600">3 more referrals to unlock 30% commission</p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800">
                    Silver Tier
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>7 of 10 referrals</span>
                    <span>70%</span>
                  </div>
                  <Progress value={70} className="h-2" />
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Recent Referral Activity</h3>
                <div className="space-y-3">
                  {[
                    { type: 'signup', email: 'john@example.com', date: '2 hours ago', status: 'pending' },
                    { type: 'conversion', email: 'sarah@example.com', date: '1 day ago', status: 'completed', amount: '$25.00' },
                    { type: 'signup', email: 'mike@example.com', date: '3 days ago', status: 'converted', amount: '$15.00' }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          activity.status === 'completed' ? 'bg-green-100 text-green-600' :
                          activity.status === 'converted' ? 'bg-blue-100 text-blue-600' :
                          'bg-yellow-100 text-yellow-600'
                        )}>
                          {activity.status === 'completed' ? <CheckCircle className="h-4 w-4" /> :
                           activity.status === 'converted' ? <DollarSign className="h-4 w-4" /> :
                           <Users className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{activity.email}</div>
                          <div className="text-sm text-gray-600">{activity.date}</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant={
                          activity.status === 'completed' ? 'default' :
                          activity.status === 'converted' ? 'secondary' :
                          'outline'
                        }>
                          {activity.status}
                        </Badge>
                        {activity.amount && (
                          <div className="text-sm font-medium text-green-600 mt-1">
                            {activity.amount}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Share Tab */}
          <TabsContent value="share" className="mt-6">
            <div className="space-y-6">
              {/* Referral Link */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Your Referral Link</h3>
                <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex-1 font-mono text-sm text-gray-700 break-all">
                    {referralUrl}
                  </div>
                  <Button
                    onClick={copyReferralUrl}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "transition-colors",
                      copiedUrl && "bg-green-50 border-green-200 text-green-700"
                    )}
                  >
                    {copiedUrl ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Custom Message */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Share Message</h3>
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Customize your referral message..."
                  className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              {/* Social Sharing */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Share on Social Media</h3>
                <div className="flex flex-wrap gap-3">
                  <SocialShareButton
                    platform="twitter"
                    referralUrl={referralUrl}
                    message={shareMessage}
                  />
                  <SocialShareButton
                    platform="facebook"
                    referralUrl={referralUrl}
                    message={shareMessage}
                  />
                  <SocialShareButton
                    platform="linkedin"
                    referralUrl={referralUrl}
                    message={shareMessage}
                  />
                  <SocialShareButton
                    platform="email"
                    referralUrl={referralUrl}
                    message={shareMessage}
                  />
                  <SocialShareButton
                    platform="sms"
                    referralUrl={referralUrl}
                    message={shareMessage}
                  />
                </div>
              </div>

              {/* Sharing Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-medium text-blue-900 mb-3">💡 Sharing Tips</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• Share your personal experience with the product</li>
                  <li>• Explain the benefits your referrals will receive</li>
                  <li>• Post at optimal times when your audience is most active</li>
                  <li>• Use relevant hashtags to increase visibility</li>
                  <li>• Follow up with interested prospects personally</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="mt-6">
            <div className="space-y-6">
              {/* Earnings Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="h-6 w-6 text-green-600" />
                    <h3 className="font-semibold text-green-900">Available Balance</h3>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    ${(userStats?.available_balance || 0).toFixed(2)}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-6 w-6 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">This Month</h3>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    ${(userStats?.month_earnings || 0).toFixed(2)}
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                    <h3 className="font-semibold text-purple-900">Total Earned</h3>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    ${(userStats?.total_earned || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Payout Button */}
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Ready to withdraw?</div>
                  <div className="text-sm text-gray-600">Minimum payout: $50.00</div>
                </div>
                <Button 
                  disabled={(userStats?.available_balance || 0) < 50}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Request Payout
                </Button>
              </div>

              {/* Commission Structure */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Commission Structure</h3>
                <div className="space-y-3">
                  {[
                    { tier: 'Bronze', referrals: '0-4', commission: '15%', current: false },
                    { tier: 'Silver', referrals: '5-9', commission: '20%', current: true },
                    { tier: 'Gold', referrals: '10-19', commission: '25%', current: false },
                    { tier: 'VIP', referrals: '20+', commission: '30%', current: false }
                  ].map((tier, index) => (
                    <div key={index} className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      tier.current 
                        ? "bg-blue-50 border-blue-200" 
                        : "bg-gray-50 border-gray-200"
                    )}>
                      <div className="flex items-center gap-3">
                        <Award className={cn(
                          "h-5 w-5",
                          tier.current ? "text-blue-600" : "text-gray-400"
                        )} />
                        <div>
                          <div className={cn(
                            "font-medium",
                            tier.current ? "text-blue-900" : "text-gray-900"
                          )}>
                            {tier.tier} Tier
                          </div>
                          <div className="text-sm text-gray-600">
                            {tier.referrals} referrals
                          </div>
                        </div>
                      </div>
                      <div className={cn(
                        "font-bold",
                        tier.current ? "text-blue-900" : "text-gray-600"
                      )}>
                        {tier.commission}
                      </div>
                      {tier.current && (
                        <Badge className="bg-blue-100 text-blue-800 ml-3">
                          Current
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="mt-6">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Monthly Leaderboard
                </h3>
                <p className="text-gray-600">
                  Top performers this month
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { rank: 1, name: 'Sarah Johnson', referrals: 45, earnings: '$1,350' },
                  { rank: 2, name: 'Mike Chen', referrals: 38, earnings: '$1,140' },
                  { rank: 3, name: 'Emily Davis', referrals: 32, earnings: '$960' },
                  { rank: 4, name: 'You', referrals: 28, earnings: '$840', isUser: true },
                  { rank: 5, name: 'David Wilson', referrals: 25, earnings: '$750' }
                ].map((leader, index) => (
                  <div key={index} className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    leader.isUser 
                      ? "bg-blue-50 border-blue-200" 
                      : "bg-white border-gray-200"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
                        leader.rank === 1 ? "bg-yellow-100 text-yellow-800" :
                        leader.rank === 2 ? "bg-gray-100 text-gray-800" :
                        leader.rank === 3 ? "bg-orange-100 text-orange-800" :
                        leader.isUser ? "bg-blue-100 text-blue-800" :
                        "bg-gray-50 text-gray-600"
                      )}>
                        {leader.rank === 1 ? '🥇' :
                         leader.rank === 2 ? '🥈' :
                         leader.rank === 3 ? '🥉' :
                         `#${leader.rank}`}
                      </div>
                      <div>
                        <div className={cn(
                          "font-medium",
                          leader.isUser ? "text-blue-900" : "text-gray-900"
                        )}>
                          {leader.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {leader.referrals} referrals
                        </div>
                      </div>
                    </div>
                    <div className={cn(
                      "font-semibold",
                      leader.isUser ? "text-blue-900" : "text-gray-900"
                    )}>
                      {leader.earnings}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}