// CREATED: 2025-07-01 - Email campaign builder component for marketing module

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useEmailCampaigns } from '@/hooks/marketing/useEmailCampaigns'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Progress } from '@/components/ui/Progress'
import { 
  Mail, 
  Send, 
  Users, 
  Eye, 
  MousePointer,
  Calendar,
  Settings,
  Image,
  Type,
  Link,
  Palette,
  Play,
  Pause,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Copy,
  Edit,
  Trash2,
  Save,
  Upload,
  Download,
  Filter,
  Search,
  Target,
  Zap,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { 
  EmailCampaign, 
  CreateEmailCampaignRequest,
  UpdateEmailCampaignRequest
} from '@/shared/types/marketing'

// ================================================
// TYPES & INTERFACES
// ================================================

interface EmailCampaignBuilderProps {
  organizationId: string
  campaignId?: string
  onSave?: (campaign: EmailCampaign) => void
  onSend?: (campaign: EmailCampaign) => void
  className?: string
}

interface CampaignStatsProps {
  campaign: EmailCampaign
  analytics?: {
    sent: number
    delivered: number
    opened: number
    clicked: number
    unsubscribed: number
    bounced: number
  }
}

interface EmailTemplateProps {
  template: {
    id: string
    name: string
    type: 'welcome' | 'newsletter' | 'promotional' | 'drip'
    preview: string
    description: string
  }
  onSelect: (template: any) => void
}

interface EmailEditorProps {
  content: string
  subject: string
  onContentChange: (content: string) => void
  onSubjectChange: (subject: string) => void
}

// ================================================
// CAMPAIGN STATS COMPONENT
// ================================================

function CampaignStats({ campaign, analytics }: CampaignStatsProps) {
  const stats = analytics || {
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    unsubscribed: 0,
    bounced: 0
  }

  const metrics = [
    {
      label: 'Sent',
      value: stats.sent,
      icon: Send,
      color: 'text-blue-600'
    },
    {
      label: 'Delivered',
      value: stats.delivered,
      percentage: stats.sent > 0 ? (stats.delivered / stats.sent * 100).toFixed(1) : '0',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      label: 'Opened',
      value: stats.opened,
      percentage: stats.delivered > 0 ? (stats.opened / stats.delivered * 100).toFixed(1) : '0',
      icon: Eye,
      color: 'text-purple-600'
    },
    {
      label: 'Clicked',
      value: stats.clicked,
      percentage: stats.opened > 0 ? (stats.clicked / stats.opened * 100).toFixed(1) : '0',
      icon: MousePointer,
      color: 'text-orange-600'
    },
    {
      label: 'Unsubscribed',
      value: stats.unsubscribed,
      percentage: stats.delivered > 0 ? (stats.unsubscribed / stats.delivered * 100).toFixed(1) : '0',
      icon: AlertTriangle,
      color: 'text-red-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <metric.icon className={cn("h-5 w-5", metric.color)} />
            <span className="font-medium text-gray-900">{metric.label}</span>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">
              {metric.value.toLocaleString()}
            </div>
            {metric.percentage && (
              <div className="text-sm text-gray-600">
                {metric.percentage}%
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ================================================
// EMAIL TEMPLATE COMPONENT
// ================================================

function EmailTemplate({ template, onSelect }: EmailTemplateProps) {
  const typeColors = {
    welcome: 'bg-blue-100 text-blue-800',
    newsletter: 'bg-green-100 text-green-800',
    promotional: 'bg-orange-100 text-orange-800',
    drip: 'bg-purple-100 text-purple-800'
  }

  return (
    <div 
      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onSelect(template)}
    >
      <div className="flex items-center justify-between mb-3">
        <Badge className={typeColors[template.type]}>
          {template.type}
        </Badge>
        <Plus className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
      </div>
      
      <h3 className="font-medium text-gray-900 mb-2">{template.name}</h3>
      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
      
      <div className="bg-gray-50 rounded border p-3 text-xs font-mono text-gray-700">
        {template.preview}
      </div>
    </div>
  )
}

// ================================================
// EMAIL EDITOR COMPONENT
// ================================================

function EmailEditor({ content, subject, onContentChange, onSubjectChange }: EmailEditorProps) {
  const [activeTab, setActiveTab] = useState('content')

  return (
    <div className="border border-gray-200 rounded-lg">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <Button
            variant={activeTab === 'content' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('content')}
          >
            <Type className="h-4 w-4 mr-2" />
            Content
          </Button>
          <Button
            variant={activeTab === 'design' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('design')}
          >
            <Palette className="h-4 w-4 mr-2" />
            Design
          </Button>
          <Button
            variant={activeTab === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('preview')}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email subject..."
              />
              <div className="text-xs text-gray-500 mt-1">
                {subject.length}/100 characters (optimal: 30-50)
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Content
              </label>
              <textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={15}
                placeholder="Write your email content here..."
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline">
                <Image className="h-4 w-4 mr-2" />
                Add Image
              </Button>
              <Button size="sm" variant="outline">
                <Link className="h-4 w-4 mr-2" />
                Insert Link
              </Button>
              <Button size="sm" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Personalize
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'design' && (
          <div className="text-center py-12">
            <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Design editor coming soon...</p>
            <p className="text-sm text-gray-500 mt-2">
              Advanced email design tools with drag-and-drop
            </p>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-2">Subject:</div>
              <div className="font-medium text-gray-900">{subject || 'No subject'}</div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 min-h-[400px]">
              <div className="prose max-w-none">
                {content ? (
                  <div className="whitespace-pre-wrap">{content}</div>
                ) : (
                  <div className="text-gray-500 italic">No content to preview</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ================================================
// MAIN COMPONENT
// ================================================

export function EmailCampaignBuilder({
  organizationId,
  campaignId,
  onSave,
  onSend,
  className
}: EmailCampaignBuilderProps) {
  // Hooks
  const { 
    campaigns,
    createCampaign,
    updateCampaign,
    sendCampaign,
    loading,
    error
  } = useEmailCampaigns(organizationId)

  // State
  const [activeTab, setActiveTab] = useState('builder')
  const [currentCampaign, setCurrentCampaign] = useState<EmailCampaign | null>(null)
  const [campaignData, setCampaignData] = useState({
    name: '',
    subject: '',
    content: '',
    campaign_type: 'newsletter' as const,
    scheduled_at: '',
    recipients: [] as string[]
  })
  const [isSending, setIsSending] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  // Email templates
  const emailTemplates = [
    {
      id: 'welcome-basic',
      name: 'Welcome Email',
      type: 'welcome' as const,
      description: 'Simple welcome message for new subscribers',
      preview: 'Welcome to our community! We\'re excited to have you...'
    },
    {
      id: 'newsletter-weekly',
      name: 'Weekly Newsletter',
      type: 'newsletter' as const,
      description: 'Weekly updates and highlights',
      preview: 'This week in review: Product updates, team highlights...'
    },
    {
      id: 'promo-discount',
      name: 'Promotional Discount',
      type: 'promotional' as const,
      description: 'Special offer with discount code',
      preview: 'Limited time offer: Get 20% off your next purchase...'
    },
    {
      id: 'drip-onboarding',
      name: 'Onboarding Series',
      type: 'drip' as const,
      description: 'Multi-part onboarding sequence',
      preview: 'Day 1: Getting started with your account setup...'
    }
  ]

  // Load existing campaign
  useEffect(() => {
    if (campaignId && campaigns.length > 0) {
      const campaign = campaigns.find(c => c.id === campaignId)
      if (campaign) {
        setCurrentCampaign(campaign)
        setCampaignData({
          name: campaign.name,
          subject: campaign.subject || '',
          content: campaign.content || '',
          campaign_type: campaign.campaign_type,
          scheduled_at: campaign.scheduled_at || '',
          recipients: [] // Would come from campaign data
        })
      }
    }
  }, [campaignId, campaigns])

  // Handle template selection
  const handleTemplateSelect = useCallback((template: any) => {
    setCampaignData(prev => ({
      ...prev,
      name: template.name,
      subject: `${template.name} - ${new Date().toLocaleDateString()}`,
      content: template.preview + '\n\nCustomize this content to match your needs...',
      campaign_type: template.type
    }))
    setShowTemplates(false)
  }, [])

  // Save campaign
  const handleSave = useCallback(async () => {
    try {
      if (currentCampaign) {
        // Update existing campaign
        const { success } = await updateCampaign(currentCampaign.id, {
          name: campaignData.name,
          subject: campaignData.subject,
          content: campaignData.content,
          campaign_type: campaignData.campaign_type,
          scheduled_at: campaignData.scheduled_at || undefined
        })
        
        if (success) {
          onSave?.(currentCampaign)
        }
      } else {
        // Create new campaign
        const { success, data } = await createCampaign({
          organization_id: organizationId,
          name: campaignData.name,
          subject: campaignData.subject,
          content: campaignData.content,
          campaign_type: campaignData.campaign_type,
          scheduled_at: campaignData.scheduled_at || undefined,
          recipients: campaignData.recipients
        })
        
        if (success && data) {
          setCurrentCampaign(data)
          onSave?.(data)
        }
      }
    } catch (err) {
      console.error('Failed to save campaign:', err)
    }
  }, [
    currentCampaign, 
    campaignData, 
    organizationId, 
    updateCampaign, 
    createCampaign, 
    onSave
  ])

  // Send campaign
  const handleSend = useCallback(async () => {
    if (!currentCampaign) return

    setIsSending(true)
    try {
      const { success } = await sendCampaign({
        campaign_id: currentCampaign.id,
        send_at: new Date().toISOString(),
        recipients: campaignData.recipients
      })
      
      if (success) {
        onSend?.(currentCampaign)
      }
    } catch (err) {
      console.error('Failed to send campaign:', err)
    } finally {
      setIsSending(false)
    }
  }, [currentCampaign, campaignData.recipients, sendCampaign, onSend])

  if (loading && !currentCampaign) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading email campaign builder...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Error loading email campaign builder:</span>
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
            <h1 className="text-2xl font-bold text-gray-900">Email Campaign Builder</h1>
            <p className="text-gray-600 mt-1">
              {currentCampaign ? `Editing: ${currentCampaign.name}` : 'Create and send email campaigns'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {currentCampaign && (
              <Badge 
                variant={
                  currentCampaign.status === 'sent' ? 'default' :
                  currentCampaign.status === 'scheduled' ? 'secondary' :
                  'outline'
                }
              >
                {currentCampaign.status}
              </Badge>
            )}
            
            <Button
              onClick={() => setShowTemplates(true)}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Use Template
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={loading || !campaignData.name}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Campaign'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="builder">
              <Edit className="h-4 w-4 mr-2" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="recipients">
              <Users className="h-4 w-4 mr-2" />
              Recipients
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Builder Tab */}
          <TabsContent value="builder" className="mt-6">
            <div className="space-y-6">
              {/* Campaign Settings */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Campaign Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      value={campaignData.name}
                      onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter campaign name..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Type
                    </label>
                    <select
                      value={campaignData.campaign_type}
                      onChange={(e) => setCampaignData(prev => ({ ...prev, campaign_type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="newsletter">Newsletter</option>
                      <option value="welcome">Welcome</option>
                      <option value="promotional">Promotional</option>
                      <option value="drip">Drip Campaign</option>
                      <option value="transactional">Transactional</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Email Editor */}
              <EmailEditor
                content={campaignData.content}
                subject={campaignData.subject}
                onContentChange={(content) => setCampaignData(prev => ({ ...prev, content }))}
                onSubjectChange={(subject) => setCampaignData(prev => ({ ...prev, subject }))}
              />
            </div>
          </TabsContent>

          {/* Recipients Tab */}
          <TabsContent value="recipients" className="mt-6">
            <div className="space-y-6">
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Recipient management coming soon...</p>
                <p className="text-sm text-gray-500 mt-2">
                  Audience segmentation and contact lists
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="mt-6">
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-4">Send Options</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="radio"
                      id="send-now"
                      name="send-option"
                      className="h-4 w-4 text-blue-600"
                      defaultChecked
                    />
                    <label htmlFor="send-now" className="font-medium text-blue-900">
                      Send Now
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <input
                      type="radio"
                      id="schedule-later"
                      name="send-option"
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="schedule-later" className="font-medium text-blue-900">
                      Schedule for Later
                    </label>
                  </div>
                  
                  <div className="ml-8">
                    <input
                      type="datetime-local"
                      value={campaignData.scheduled_at}
                      onChange={(e) => setCampaignData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                      className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-blue-200">
                  <Button
                    onClick={handleSend}
                    disabled={isSending || !currentCampaign || !campaignData.subject || !campaignData.content}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Campaign
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              {currentCampaign && currentCampaign.status === 'sent' ? (
                <CampaignStats
                  campaign={currentCampaign}
                  analytics={{
                    sent: 1250,
                    delivered: 1198,
                    opened: 487,
                    clicked: 73,
                    unsubscribed: 12,
                    bounced: 52
                  }}
                />
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {currentCampaign ? 'Campaign not sent yet' : 'No analytics available'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Analytics will appear after the campaign is sent
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Template Selection Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Choose Email Template</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplates(false)}
                >
                  ✕
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {emailTemplates.map((template) => (
                  <EmailTemplate
                    key={template.id}
                    template={template}
                    onSelect={handleTemplateSelect}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}