// CREATED: 2025-07-01 - Referral program management dashboard

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { 
  Share2,
  Copy,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Gift,
  ExternalLink,
  RefreshCw,
  Crown,
  Mail,
  MessageCircle,
  Twitter,
  Facebook,
  Linkedin,
  CheckCircle,
  XCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/DropdownMenu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/Tabs'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { useReferralCodes, useReferralAnalytics, useReferralConversions } from '@/hooks/marketing/useReferrals'
import { ReferralDashboard } from '@/components/marketing/ReferralDashboard'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'
import { useUser } from '@/hooks/auth/useAuth'
import type { ReferralCode, ReferralConversion } from '@/shared/types/marketing'

// ================================================
// REFERRALS MANAGEMENT DASHBOARD COMPONENT
// ================================================

export default function ReferralsManagementDashboard() {
  const { organization } = useCurrentOrganization()
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedCode, setSelectedCode] = useState<ReferralCode | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showCodeDetail, setShowCodeDetail] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState('')

  // Hooks for referral data
  const {
    referralCodes,
    loading: codesLoading,
    error: codesError,
    fetchReferralCodes,
    createReferralCode,
    updateReferralCode,
    deactivateReferralCode,
    deleteReferralCode,
    generateReferralLink,
    pagination: codesPagination,
    nextPage: codesNextPage,
    prevPage: codesPrevPage,
    hasNextPage: codesHasNext,
    hasPrevPage: codesHasPrev
  } = useReferralCodes({
    organizationId: organization?.id,
    userId: user?.id
  })

  const {
    analytics,
    loading: analyticsLoading,
    fetchAnalytics
  } = useReferralAnalytics(organization?.id || '')

  const {
    conversions,
    loading: conversionsLoading,
    fetchConversions,
    markCommissionPaid,
    pagination: conversionsPagination
  } = useReferralConversions({
    organizationId: organization?.id
  })

  // Auto-fetch data on organization change
  useEffect(() => {
    if (organization?.id) {
      fetchReferralCodes()
      fetchAnalytics()
      fetchConversions()
    }
  }, [organization?.id])

  // Handle refresh
  const handleRefresh = () => {
    fetchReferralCodes()
    fetchAnalytics()
    fetchConversions()
  }

  // Handle copy referral link
  const handleCopyLink = async (referralCode: ReferralCode) => {
    const baseUrl = window.location.origin
    const referralLink = generateReferralLink(baseUrl, referralCode.code)
    
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopiedUrl(referralCode.id)
      setTimeout(() => setCopiedUrl(''), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  // Handle create referral code
  const handleCreateCode = async (data: {
    description: string
    rewardType: 'percentage' | 'fixed'
    rewardValue: number
    maxUses?: number
  }) => {
    const result = await createReferralCode({
      description: data.description,
      reward_type: data.rewardType,
      reward_value: data.rewardValue,
      reward_description: `${data.rewardValue}${data.rewardType === 'percentage' ? '%' : '$'} reward`,
      max_uses: data.maxUses,
      organization_id: organization!.id
    })

    if (result.success) {
      setShowCreateDialog(false)
      fetchReferralCodes()
    }
  }

  // Handle deactivate code
  const handleDeactivateCode = async (codeId: string) => {
    const result = await deactivateReferralCode(codeId)
    if (result.success) {
      fetchReferralCodes()
    }
  }

  // Handle delete code
  const handleDeleteCode = async (codeId: string) => {
    if (confirm('Are you sure you want to delete this referral code?')) {
      const result = await deleteReferralCode(codeId)
      if (result.success) {
        fetchReferralCodes()
      }
    }
  }

  // Handle mark commission paid
  const handleMarkPaid = async (conversionId: string) => {
    const result = await markCommissionPaid(conversionId)
    if (result.success) {
      fetchConversions()
    }
  }

  // Analytics cards data
  const analyticsCards = [
    {
      title: 'Total Referrals',
      value: analytics?.total_referrals || 0,
      icon: Users,
      description: 'All time referrals',
      trend: null
    },
    {
      title: 'Conversions',
      value: analytics?.successful_conversions || 0,
      icon: Target,
      description: 'Successful conversions',
      trend: null
    },
    {
      title: 'Conversion Rate',
      value: `${((analytics?.conversion_rate || 0) * 100).toFixed(1)}%`,
      icon: TrendingUp,
      description: 'Referral to conversion',
      trend: null
    },
    {
      title: 'Commission Owed',
      value: formatCurrency(analytics?.total_commission_owed || 0),
      icon: DollarSign,
      description: 'Total pending payments',
      trend: null
    }
  ]

  // Top referrers from analytics
  const topReferrers = analytics?.top_referrers || []

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Referral Program</h1>
            <p className="text-gray-600">Manage your referral codes and track viral growth</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleRefresh} disabled={analyticsLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", analyticsLoading && "animate-spin")} />
              Refresh
            </Button>
            
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Code
            </Button>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {analyticsCards.map((card, index) => {
            const Icon = card.icon
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{card.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{card.description}</p>
                    </div>
                    <Icon className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="codes">Referral Codes</TabsTrigger>
            <TabsTrigger value="conversions">Conversions</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Referral Dashboard Component */}
              <div className="lg:col-span-2">
                <ReferralDashboard 
                  organizationId={organization?.id || ''}
                  userId={user?.id}
                />
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common referral tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Code
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('codes')}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Existing Code
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('conversions')}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    View Earnings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Referral Codes Tab */}
          <TabsContent value="codes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Referral Codes</CardTitle>
                <CardDescription>Manage and share your referral codes</CardDescription>
              </CardHeader>
              <CardContent>
                {codesLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading referral codes...
                  </div>
                ) : referralCodes.length === 0 ? (
                  <div className="text-center py-8">
                    <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No referral codes yet</h3>
                    <p className="text-gray-500 mb-4">Create your first referral code to start earning rewards</p>
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Code
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {referralCodes.map((code) => (
                      <div key={code.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="font-mono text-lg font-bold bg-gray-100 px-3 py-1 rounded">
                                {code.code}
                              </div>
                              <Badge variant={code.active ? "default" : "secondary"}>
                                {code.active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {code.description || 'No description'}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>Reward: {code.reward_description}</span>
                              <span>Uses: {code.uses_count || 0}</span>
                              {code.max_uses && <span>Max: {code.max_uses}</span>}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyLink(code)}
                            >
                              {copiedUrl === code.id ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedCode(code)
                                  setShowCodeDetail(true)
                                }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {code.active && (
                                  <DropdownMenuItem onClick={() => handleDeactivateCode(code.id)}>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteCode(code.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conversions Tab */}
          <TabsContent value="conversions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Referral Conversions</CardTitle>
                <CardDescription>Track successful referrals and commission payments</CardDescription>
              </CardHeader>
              <CardContent>
                {conversionsLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading conversions...
                  </div>
                ) : conversions.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No conversions yet</h3>
                    <p className="text-gray-500">Share your referral codes to start earning commissions</p>
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Referral Code
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Value
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Commission
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Date
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {conversions.map((conversion) => (
                            <tr key={conversion.id}>
                              <td className="px-4 py-3 text-sm font-mono">
                                {conversion.referral_code?.code || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <Badge variant="outline">
                                  {conversion.conversion_type}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {conversion.conversion_value ? formatCurrency(conversion.conversion_value) : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium">
                                {formatCurrency(conversion.commission_amount || 0)}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <Badge variant={conversion.commission_paid ? "default" : "secondary"}>
                                  {conversion.commission_paid ? "Paid" : "Pending"}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {formatDate(conversion.created_at)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {!conversion.commission_paid && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMarkPaid(conversion.id)}
                                  >
                                    Mark Paid
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Referrers</CardTitle>
                <CardDescription>See who's driving the most referrals</CardDescription>
              </CardHeader>
              <CardContent>
                {topReferrers.length === 0 ? (
                  <div className="text-center py-8">
                    <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No referral data available yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topReferrers.map((referrer, index) => (
                      <div key={referrer.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                            index === 0 ? "bg-yellow-100 text-yellow-800" :
                            index === 1 ? "bg-gray-100 text-gray-800" :
                            index === 2 ? "bg-orange-100 text-orange-800" :
                            "bg-blue-100 text-blue-800"
                          )}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">User {referrer.user_id.slice(0, 8)}</p>
                            <p className="text-sm text-gray-500">
                              {referrer.conversion_count} conversions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{referrer.referral_count} referrals</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(referrer.commission_earned)} earned
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Referral Code Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Referral Code</DialogTitle>
              <DialogDescription>
                Set up a new referral code with custom rewards
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleCreateCode({
                description: formData.get('description') as string,
                rewardType: formData.get('rewardType') as 'percentage' | 'fixed',
                rewardValue: Number(formData.get('rewardValue')),
                maxUses: formData.get('maxUses') ? Number(formData.get('maxUses')) : undefined
              })
            }}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    name="description"
                    placeholder="e.g., Friend referral program"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Reward Type</label>
                    <select name="rewardType" className="w-full p-2 border rounded" required>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Reward Value</label>
                    <Input
                      name="rewardValue"
                      type="number"
                      placeholder="10"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Max Uses (optional)</label>
                  <Input
                    name="maxUses"
                    type="number"
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Code
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Code Detail Dialog */}
        <Dialog open={showCodeDetail} onOpenChange={setShowCodeDetail}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Referral Code Details</DialogTitle>
            </DialogHeader>
            
            {selectedCode && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Code</label>
                  <div className="font-mono text-lg font-bold bg-gray-100 px-3 py-2 rounded mt-1">
                    {selectedCode.code}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Referral Link</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      value={generateReferralLink(window.location.origin, selectedCode.code)}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(selectedCode)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Uses</label>
                    <p className="text-sm">{selectedCode.uses_count || 0}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Max Uses</label>
                    <p className="text-sm">{selectedCode.max_uses || 'Unlimited'}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm">{formatDateTime(selectedCode.created_at)}</p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCodeDetail(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}