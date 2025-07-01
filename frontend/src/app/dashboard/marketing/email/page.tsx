// CREATED: 2025-07-01 - Email campaigns management dashboard

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { 
  Search,
  Plus,
  Send,
  Calendar,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Pause,
  Play,
  Copy,
  TrendingUp,
  TrendingDown,
  Mail,
  Users,
  MousePointer,
  XCircle,
  RefreshCw,
  Clock,
  CheckCircle,
  FileText,
  Settings,
  Download,
  Upload,
  Target,
  BarChart3,
  Zap,
  Globe
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { useEmailCampaigns, useEmailCampaign } from '@/hooks/marketing/useEmailCampaigns'
import { EmailCampaignBuilder } from '@/components/marketing/EmailCampaignBuilder'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime, formatNumber } from '@/lib/utils'
import type { EmailCampaign } from '@/shared/types/marketing'

// ================================================
// EMAIL CAMPAIGNS DASHBOARD COMPONENT
// ================================================

export default function EmailCampaignsDashboard() {
  const { organization } = useCurrentOrganization()
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    subject: '',
    content: '',
    campaign_type: 'newsletter' as const,
    scheduled_at: ''
  })

  // Hooks
  const {
    campaigns,
    loading: campaignsLoading,
    error: campaignsError,
    orgAnalytics,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    sendCampaign,
    scheduleCampaign,
    pauseCampaign,
    deleteCampaign,
    fetchOrgAnalytics,
    createFromTemplate,
    pagination,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
    currentPage,
    totalPages
  } = useEmailCampaigns(organization?.id || '')

  // Single campaign hook for analytics
  const {
    campaign: selectedCampaignData,
    analytics: campaignAnalytics,
    fetchAnalytics: fetchCampaignAnalytics
  } = useEmailCampaign(selectedCampaign?.id || null)

  // Auto-fetch data on organization change
  useEffect(() => {
    if (organization?.id) {
      fetchCampaigns()
      fetchOrgAnalytics()
    }
  }, [organization?.id])

  // Filter campaigns based on search and filters
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesSearch = !searchQuery || 
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.subject.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter
      const matchesType = typeFilter === 'all' || campaign.campaign_type === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [campaigns, searchQuery, statusFilter, typeFilter])

  // Handle refresh
  const handleRefresh = () => {
    fetchCampaigns()
    fetchOrgAnalytics()
  }

  // Handle create campaign
  const handleCreateCampaign = async () => {
    const result = await createCampaign({
      name: campaignForm.name,
      subject: campaignForm.subject,
      content: campaignForm.content,
      campaign_type: campaignForm.campaign_type,
      scheduled_at: campaignForm.scheduled_at || undefined,
      organization_id: organization!.id
    })

    if (result.success) {
      setShowCreateDialog(false)
      setCampaignForm({
        name: '',
        subject: '',
        content: '',
        campaign_type: 'newsletter',
        scheduled_at: ''
      })
      fetchCampaigns()
    }
  }

  // Handle edit campaign
  const handleEditCampaign = (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign)
    setCampaignForm({
      name: campaign.name,
      subject: campaign.subject,
      content: campaign.content,
      campaign_type: campaign.campaign_type,
      scheduled_at: campaign.scheduled_at || ''
    })
    setShowEditDialog(true)
  }

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!selectedCampaign) return

    const result = await updateCampaign(selectedCampaign.id, {
      name: campaignForm.name,
      subject: campaignForm.subject,
      content: campaignForm.content,
      campaign_type: campaignForm.campaign_type
    })

    if (result.success) {
      setShowEditDialog(false)
      fetchCampaigns()
    }
  }

  // Handle send campaign
  const handleSendCampaign = async (campaign: EmailCampaign, sendNow: boolean = true) => {
    const result = await sendCampaign({
      campaign_id: campaign.id,
      send_immediately: sendNow
    })

    if (result.success) {
      setShowSendDialog(false)
      fetchCampaigns()
    }
  }

  // Handle schedule campaign
  const handleScheduleCampaign = async (campaignId: string, scheduledAt: string) => {
    const result = await scheduleCampaign(campaignId, scheduledAt)
    if (result.success) {
      fetchCampaigns()
    }
  }

  // Handle pause campaign
  const handlePauseCampaign = async (campaignId: string) => {
    const result = await pauseCampaign(campaignId)
    if (result.success) {
      fetchCampaigns()
    }
  }

  // Handle delete campaign
  const handleDeleteCampaign = async (campaignId: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      const result = await deleteCampaign(campaignId)
      if (result.success) {
        fetchCampaigns()
      }
    }
  }

  // Handle view analytics
  const handleViewAnalytics = (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign)
    setShowAnalyticsDialog(true)
    fetchCampaignAnalytics()
  }

  // Get campaign status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800'
      case 'sending': return 'bg-blue-100 text-blue-800'
      case 'scheduled': return 'bg-orange-100 text-orange-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get campaign type options
  const campaignTypes = [
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'welcome', label: 'Welcome' },
    { value: 'promotional', label: 'Promotional' },
    { value: 'drip', label: 'Drip Campaign' },
    { value: 'transactional', label: 'Transactional' }
  ]

  // Analytics cards data
  const analyticsCards = [
    {
      title: 'Total Campaigns',
      value: orgAnalytics?.total_campaigns || 0,
      description: 'All time campaigns',
      icon: Mail,
      trend: null
    },
    {
      title: 'Emails Sent',
      value: formatNumber(orgAnalytics?.total_emails_sent || 0),
      description: 'Total emails delivered',
      icon: Send,
      trend: null
    },
    {
      title: 'Open Rate',
      value: `${((orgAnalytics?.average_open_rate || 0) * 100).toFixed(1)}%`,
      description: 'Average open rate',
      icon: Eye,
      trend: null
    },
    {
      title: 'Click Rate',
      value: `${((orgAnalytics?.average_click_rate || 0) * 100).toFixed(1)}%`,
      description: 'Average click-through rate',
      icon: MousePointer,
      trend: null
    }
  ]

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
            <p className="text-gray-600">Create and manage email marketing campaigns</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleRefresh} disabled={campaignsLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", campaignsLoading && "animate-spin")} />
              Refresh
            </Button>
            
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Campaigns */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Campaigns</CardTitle>
                  <CardDescription>Your latest email campaigns</CardDescription>
                </CardHeader>
                <CardContent>
                  {campaigns.slice(0, 5).map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{campaign.name}</p>
                        <p className="text-xs text-gray-500">{campaign.subject}</p>
                        <div className="flex items-center space-x-3 mt-1">
                          <Badge variant="outline" className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {campaign.recipient_count || 0} recipients
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {((campaign.opened_count || 0) / (campaign.recipient_count || 1) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">Open rate</p>
                      </div>
                    </div>
                  ))}
                  
                  {campaigns.length === 0 && (
                    <div className="text-center py-8">
                      <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
                      <p className="text-gray-500 mb-4">Create your first email campaign to get started</p>
                      <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Campaign
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common email tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('templates')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Browse Templates
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('automation')}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Setup Automation
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Email Campaigns ({filteredCampaigns.length})</CardTitle>
                    <CardDescription>Manage your email marketing campaigns</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search campaigns..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="sending">Sending</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {campaignTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Campaigns Table */}
                <div className="border rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Campaign
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Recipients
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Performance
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Created
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {campaignsLoading ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                              Loading campaigns...
                            </td>
                          </tr>
                        ) : filteredCampaigns.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                              No campaigns found
                            </td>
                          </tr>
                        ) : (
                          filteredCampaigns.map((campaign) => (
                            <tr key={campaign.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {campaign.name}
                                  </div>
                                  <div className="text-sm text-gray-500 truncate max-w-xs">
                                    {campaign.subject}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline">
                                  {campaignTypes.find(t => t.value === campaign.campaign_type)?.label || campaign.campaign_type}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={getStatusColor(campaign.status)}>
                                  {campaign.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {formatNumber(campaign.recipient_count || 0)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm">
                                  <div className="flex items-center space-x-4">
                                    <div>
                                      <span className="font-medium">
                                        {((campaign.opened_count || 0) / (campaign.recipient_count || 1) * 100).toFixed(1)}%
                                      </span>
                                      <span className="text-gray-500 text-xs ml-1">open</span>
                                    </div>
                                    <div>
                                      <span className="font-medium">
                                        {((campaign.clicked_count || 0) / (campaign.recipient_count || 1) * 100).toFixed(1)}%
                                      </span>
                                      <span className="text-gray-500 text-xs ml-1">click</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {formatDate(campaign.created_at)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleViewAnalytics(campaign)}>
                                      <BarChart3 className="h-4 w-4 mr-2" />
                                      View Analytics
                                    </DropdownMenuItem>
                                    
                                    {campaign.status === 'draft' && (
                                      <>
                                        <DropdownMenuItem onClick={() => handleEditCampaign(campaign)}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                          setSelectedCampaign(campaign)
                                          setShowSendDialog(true)
                                        }}>
                                          <Send className="h-4 w-4 mr-2" />
                                          Send Now
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    
                                    {campaign.status === 'sending' && (
                                      <DropdownMenuItem onClick={() => handlePauseCampaign(campaign.id)}>
                                        <Pause className="h-4 w-4 mr-2" />
                                        Pause
                                      </DropdownMenuItem>
                                    )}
                                    
                                    {campaign.status === 'paused' && (
                                      <DropdownMenuItem onClick={() => handleSendCampaign(campaign, true)}>
                                        <Play className="h-4 w-4 mr-2" />
                                        Resume
                                      </DropdownMenuItem>
                                    )}
                                    
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteCampaign(campaign.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {filteredCampaigns.length > 0 && (
                    <div className="bg-white px-4 py-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} results
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={prevPage}
                            disabled={!hasPrevPage}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-gray-700">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={nextPage}
                            disabled={!hasNextPage}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>Pre-built templates for quick campaign creation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {campaignTypes.map((type) => (
                    <div key={type.value} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="mb-3">
                        <h3 className="font-medium text-gray-900">{type.label}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {type.value === 'newsletter' && 'Regular updates and news'}
                          {type.value === 'welcome' && 'Welcome new subscribers'}
                          {type.value === 'promotional' && 'Special offers and deals'}
                          {type.value === 'drip' && 'Automated email sequences'}
                          {type.value === 'transactional' && 'Order confirmations and receipts'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setCampaignForm({
                            ...campaignForm,
                            campaign_type: type.value as any,
                            name: `${type.label} Campaign`,
                            subject: `${type.label} - ${new Date().toLocaleDateString()}`
                          })
                          setShowCreateDialog(true)
                        }}
                      >
                        Use Template
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Automation</CardTitle>
                <CardDescription>Set up automated email workflows</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Zap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Email Automation</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Create automated email sequences based on user actions and triggers. Coming soon!
                  </p>
                  <Button variant="outline" disabled>
                    <Settings className="h-4 w-4 mr-2" />
                    Setup Automation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Campaign Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Email Campaign</DialogTitle>
              <DialogDescription>
                Set up a new email marketing campaign
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Campaign Name</label>
                <Input
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
                  placeholder="e.g., Weekly Newsletter"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Subject Line</label>
                <Input
                  value={campaignForm.subject}
                  onChange={(e) => setCampaignForm({...campaignForm, subject: e.target.value})}
                  placeholder="e.g., Your weekly update is here!"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Campaign Type</label>
                <Select value={campaignForm.campaign_type} onValueChange={(value: any) => setCampaignForm({...campaignForm, campaign_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Email Content</label>
                <Textarea
                  value={campaignForm.content}
                  onChange={(e) => setCampaignForm({...campaignForm, content: e.target.value})}
                  placeholder="Write your email content here..."
                  rows={6}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Schedule (Optional)</label>
                <Input
                  type="datetime-local"
                  value={campaignForm.scheduled_at}
                  onChange={(e) => setCampaignForm({...campaignForm, scheduled_at: e.target.value})}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCampaign}>
                Create Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Campaign Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Campaign</DialogTitle>
              <DialogDescription>
                Update your email campaign
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Campaign Name</label>
                <Input
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Subject Line</label>
                <Input
                  value={campaignForm.subject}
                  onChange={(e) => setCampaignForm({...campaignForm, subject: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Email Content</label>
                <Textarea
                  value={campaignForm.content}
                  onChange={(e) => setCampaignForm({...campaignForm, content: e.target.value})}
                  rows={6}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send Campaign Dialog */}
        <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Campaign</DialogTitle>
              <DialogDescription>
                Send "{selectedCampaign?.name}" to your subscribers
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <p className="text-sm text-gray-600">
                This campaign will be sent to all active subscribers. Are you sure you want to proceed?
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => selectedCampaign && handleSendCampaign(selectedCampaign, true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Analytics Dialog */}
        <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Campaign Analytics</DialogTitle>
              <DialogDescription>
                Performance metrics for "{selectedCampaign?.name}"
              </DialogDescription>
            </DialogHeader>
            
            {campaignAnalytics && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatNumber(campaignAnalytics.total_recipients)}
                    </p>
                    <p className="text-sm text-gray-600">Recipients</p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {(campaignAnalytics.open_rate * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Open Rate</p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {(campaignAnalytics.click_rate * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Click Rate</p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      {(campaignAnalytics.unsubscribe_rate * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Unsubscribe</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Campaign Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span>{formatDateTime(selectedCampaign?.created_at || '')}</span>
                    </div>
                    {selectedCampaign?.sent_at && (
                      <div className="flex justify-between">
                        <span>Sent:</span>
                        <span>{formatDateTime(selectedCampaign.sent_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAnalyticsDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}