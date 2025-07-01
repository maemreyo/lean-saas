// CREATED: 2025-07-01 - SEO manager component for marketing module

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useSEOMetadata } from '@/hooks/marketing/useSEO'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Progress } from '@/components/ui/Progress'
import { 
  Search, 
  Globe, 
  FileText, 
  Target, 
  CheckCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Copy,
  Eye,
  BarChart3,
  Settings,
  Zap,
  Tag,
  Link,
  Image,
  Users,
  TrendingUp,
  RefreshCw,
  Download,
  Upload,
  Plus,
  Edit,
  Trash2,
  Save
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { 
  SEOMetadata, 
  UpdateSEOMetadataRequest,
  PageType
} from '@/shared/types/marketing'

// ================================================
// TYPES & INTERFACES
// ================================================

interface SEOManagerProps {
  organizationId: string
  pageType?: PageType
  pageId?: string
  showBulkActions?: boolean
  className?: string
}

interface SEOScoreCardProps {
  title: string
  score: number
  maxScore: number
  issues: string[]
  recommendations: string[]
  color?: 'green' | 'yellow' | 'red'
}

interface SEOFormProps {
  organizationId: string
  pageType: PageType
  pageId: string
  existingData?: SEOMetadata
  onSave?: (data: SEOMetadata) => void
  onCancel?: () => void
}

interface KeywordAnalysisProps {
  keywords: string[]
  content?: string
  title?: string
  description?: string
}

// ================================================
// SEO SCORE CARD COMPONENT
// ================================================

function SEOScoreCard({ 
  title, 
  score, 
  maxScore, 
  issues, 
  recommendations,
  color = 'green'
}: SEOScoreCardProps) {
  const percentage = (score / maxScore) * 100
  
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    red: 'bg-red-50 border-red-200 text-red-800'
  }

  const getScoreColor = () => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className={cn("border rounded-lg p-6", colorClasses[color])}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
        <div className={cn("text-2xl font-bold", getScoreColor())}>
          {score}/{maxScore}
        </div>
      </div>
      
      <Progress value={percentage} className="mb-4" />
      
      {issues.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Issues ({issues.length})
          </h4>
          <ul className="space-y-1 text-sm">
            {issues.slice(0, 3).map((issue, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>{issue}</span>
              </li>
            ))}
            {issues.length > 3 && (
              <li className="text-sm opacity-75">
                +{issues.length - 3} more issues
              </li>
            )}
          </ul>
        </div>
      )}
      
      {recommendations.length > 0 && (
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Recommendations
          </h4>
          <ul className="space-y-1 text-sm">
            {recommendations.slice(0, 2).map((rec, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ================================================
// KEYWORD ANALYSIS COMPONENT
// ================================================

function KeywordAnalysis({ keywords, content, title, description }: KeywordAnalysisProps) {
  const analyzeKeyword = (keyword: string) => {
    const titleMatches = title?.toLowerCase().includes(keyword.toLowerCase()) ? 1 : 0
    const descMatches = description?.toLowerCase().includes(keyword.toLowerCase()) ? 1 : 0
    const contentMatches = content?.toLowerCase().split(keyword.toLowerCase()).length - 1 || 0
    
    const density = content ? (contentMatches / content.split(' ').length) * 100 : 0
    
    return {
      keyword,
      titleMatches,
      descMatches,
      contentMatches,
      density: Math.min(density, 5), // Cap at 5%
      score: Math.min((titleMatches * 3 + descMatches * 2 + Math.min(contentMatches, 5)) / 10 * 100, 100)
    }
  }

  const analysis = keywords.map(analyzeKeyword)

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Keyword Analysis</h3>
      
      {analysis.length > 0 ? (
        <div className="space-y-3">
          {analysis.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{item.keyword}</span>
                </div>
                <Badge 
                  variant={item.score >= 70 ? 'default' : item.score >= 40 ? 'secondary' : 'outline'}
                  className={
                    item.score >= 70 ? 'bg-green-100 text-green-800' :
                    item.score >= 40 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }
                >
                  {Math.round(item.score)}%
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">In Title</div>
                  <div className="font-medium">
                    {item.titleMatches ? '✓' : '✗'} 
                    <span className="ml-1 text-gray-500">
                      ({item.titleMatches})
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-600">In Description</div>
                  <div className="font-medium">
                    {item.descMatches ? '✓' : '✗'}
                    <span className="ml-1 text-gray-500">
                      ({item.descMatches})
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-600">In Content</div>
                  <div className="font-medium">
                    {item.contentMatches}
                    <span className="ml-1 text-gray-500">times</span>
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-600">Density</div>
                  <div className="font-medium">
                    {item.density.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No keywords to analyze</p>
        </div>
      )}
    </div>
  )
}

// ================================================
// SEO FORM COMPONENT
// ================================================

function SEOForm({ 
  organizationId, 
  pageType, 
  pageId, 
  existingData, 
  onSave, 
  onCancel 
}: SEOFormProps) {
  const { updateSEOMetadata, loading } = useSEOMetadata(organizationId)
  
  const [formData, setFormData] = useState({
    title: existingData?.title || '',
    description: existingData?.description || '',
    keywords: existingData?.keywords?.join(', ') || '',
    canonical_url: existingData?.canonical_url || '',
    og_title: existingData?.og_title || '',
    og_description: existingData?.og_description || '',
    og_image: existingData?.og_image || '',
    robots: existingData?.robots || 'index,follow'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const seoData: UpdateSEOMetadataRequest = {
      organization_id: organizationId,
      page_type: pageType,
      page_id: pageId,
      title: formData.title,
      description: formData.description,
      keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
      canonical_url: formData.canonical_url || undefined,
      og_title: formData.og_title || undefined,
      og_description: formData.og_description || undefined,
      og_image: formData.og_image || undefined,
      robots: formData.robots
    }

    const { success, data } = await updateSEOMetadata(seoData)
    if (success && data) {
      onSave?.(data)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic SEO */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Basic SEO</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title Tag
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter page title (50-60 characters)"
              maxLength={60}
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.title.length}/60 characters
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meta Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Enter meta description (150-160 characters)"
              maxLength={160}
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.description.length}/160 characters
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keywords
            </label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="keyword1, keyword2, keyword3"
            />
            <div className="text-xs text-gray-500 mt-1">
              Separate keywords with commas
            </div>
          </div>
        </div>
      </div>

      {/* Advanced SEO */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Advanced SEO</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Canonical URL
            </label>
            <input
              type="url"
              value={formData.canonical_url}
              onChange={(e) => setFormData(prev => ({ ...prev, canonical_url: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/page"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Robots
            </label>
            <select
              value={formData.robots}
              onChange={(e) => setFormData(prev => ({ ...prev, robots: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="index,follow">Index, Follow</option>
              <option value="index,nofollow">Index, No Follow</option>
              <option value="noindex,follow">No Index, Follow</option>
              <option value="noindex,nofollow">No Index, No Follow</option>
            </select>
          </div>
        </div>
      </div>

      {/* Open Graph */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Open Graph (Social Media)</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OG Title
            </label>
            <input
              type="text"
              value={formData.og_title}
              onChange={(e) => setFormData(prev => ({ ...prev, og_title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Social media title (leave empty to use page title)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OG Description
            </label>
            <textarea
              value={formData.og_description}
              onChange={(e) => setFormData(prev => ({ ...prev, og_description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              placeholder="Social media description (leave empty to use meta description)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OG Image URL
            </label>
            <input
              type="url"
              value={formData.og_image}
              onChange={(e) => setFormData(prev => ({ ...prev, og_image: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save SEO Data
            </>
          )}
        </Button>
        
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

// ================================================
// MAIN COMPONENT
// ================================================

export function SEOManager({
  organizationId,
  pageType,
  pageId,
  showBulkActions = true,
  className
}: SEOManagerProps) {
  // Hooks
  const { 
    seoMetadata,
    completeness,
    loading,
    error,
    fetchSEOMetadata,
    bulkUpdateSEO
  } = useSEOMetadata(organizationId)

  // State
  const [activeTab, setActiveTab] = useState('overview')
  const [showSEOForm, setShowSEOForm] = useState(false)
  const [selectedPageType, setSelectedPageType] = useState<PageType>(pageType || 'landing_page')
  const [selectedPageId, setSelectedPageId] = useState(pageId || '')

  // SEO Analysis (mock data)
  const seoAnalysis = {
    overallScore: 78,
    technical: {
      score: 85,
      issues: ['Missing alt text on 2 images', 'Page load time could be improved'],
      recommendations: ['Add descriptive alt text', 'Optimize images', 'Enable compression']
    },
    content: {
      score: 72,
      issues: ['Title too short', 'Missing H1 tag', 'Low keyword density'],
      recommendations: ['Expand title to 50-60 characters', 'Add proper heading structure']
    },
    social: {
      score: 65,
      issues: ['Missing Open Graph image', 'OG description not optimized'],
      recommendations: ['Add high-quality OG image', 'Write compelling social descriptions']
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    if (organizationId) {
      fetchSEOMetadata()
    }
  }, [organizationId, fetchSEOMetadata])

  if (loading && !seoMetadata) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SEO manager...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Error loading SEO manager:</span>
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
            <h1 className="text-2xl font-bold text-gray-900">SEO Manager</h1>
            <p className="text-gray-600 mt-1">
              Optimize your content for search engines and social media
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className={cn(
                "text-sm",
                seoAnalysis.overallScore >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                seoAnalysis.overallScore >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                'bg-red-50 text-red-700 border-red-200'
              )}
            >
              SEO Score: {seoAnalysis.overallScore}/100
            </Badge>
            
            <Button onClick={() => setShowSEOForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add SEO Data
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analysis">
              <Search className="h-4 w-4 mr-2" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="pages">
              <FileText className="h-4 w-4 mr-2" />
              Pages
            </TabsTrigger>
            <TabsTrigger value="tools">
              <Settings className="h-4 w-4 mr-2" />
              Tools
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              {/* SEO Score Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SEOScoreCard
                  title="Technical SEO"
                  score={seoAnalysis.technical.score}
                  maxScore={100}
                  issues={seoAnalysis.technical.issues}
                  recommendations={seoAnalysis.technical.recommendations}
                  color={seoAnalysis.technical.score >= 80 ? 'green' : seoAnalysis.technical.score >= 60 ? 'yellow' : 'red'}
                />
                
                <SEOScoreCard
                  title="Content SEO"
                  score={seoAnalysis.content.score}
                  maxScore={100}
                  issues={seoAnalysis.content.issues}
                  recommendations={seoAnalysis.content.recommendations}
                  color={seoAnalysis.content.score >= 80 ? 'green' : seoAnalysis.content.score >= 60 ? 'yellow' : 'red'}
                />
                
                <SEOScoreCard
                  title="Social Media"
                  score={seoAnalysis.social.score}
                  maxScore={100}
                  issues={seoAnalysis.social.issues}
                  recommendations={seoAnalysis.social.recommendations}
                  color={seoAnalysis.social.score >= 80 ? 'green' : seoAnalysis.social.score >= 60 ? 'yellow' : 'red'}
                />
              </div>

              {/* Completeness Overview */}
              {completeness && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-blue-900">SEO Completeness</h3>
                    <div className="text-2xl font-bold text-blue-900">
                      {completeness.completion_rate.toFixed(1)}%
                    </div>
                  </div>
                  
                  <Progress value={completeness.completion_rate} className="mb-4" />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                    <div>
                      <div className="font-medium">Pages with SEO</div>
                      <div>{completeness.pages_with_seo} of {completeness.total_pages}</div>
                    </div>
                    <div>
                      <div className="font-medium">Missing SEO</div>
                      <div>{completeness.missing_seo.length} pages</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-auto p-4 flex-col">
                    <Search className="h-6 w-6 mb-2 text-blue-600" />
                    <span className="font-medium">SEO Audit</span>
                    <span className="text-sm text-gray-600">Full site analysis</span>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex-col">
                    <FileText className="h-6 w-6 mb-2 text-green-600" />
                    <span className="font-medium">Generate Sitemap</span>
                    <span className="text-sm text-gray-600">XML sitemap</span>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex-col">
                    <Globe className="h-6 w-6 mb-2 text-purple-600" />
                    <span className="font-medium">Schema Markup</span>
                    <span className="text-sm text-gray-600">Structured data</span>
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="mt-6">
            <div className="space-y-6">
              <KeywordAnalysis
                keywords={['saas platform', 'business automation', 'productivity tools']}
                title="The Best SaaS Platform for Business Automation"
                description="Streamline your business processes with our powerful automation tools and boost productivity."
                content="Our SaaS platform provides comprehensive business automation solutions..."
              />
            </div>
          </TabsContent>

          {/* Pages Tab */}
          <TabsContent value="pages" className="mt-6">
            <div className="space-y-6">
              {/* Page List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">SEO Pages</h3>
                  <Button onClick={() => setShowSEOForm(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Page
                  </Button>
                </div>

                {seoMetadata && seoMetadata.length > 0 ? (
                  <div className="space-y-3">
                    {seoMetadata.map((page, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline">{page.page_type}</Badge>
                              <h4 className="font-medium text-gray-900">{page.title || 'Untitled'}</h4>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {page.description || 'No description'}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Keywords: {page.keywords?.length || 0}</span>
                              <span>Updated: {new Date(page.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No SEO pages configured yet</p>
                    <Button 
                      onClick={() => setShowSEOForm(true)} 
                      className="mt-4"
                    >
                      Add Your First Page
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="mt-6">
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">SEO tools coming soon...</p>
              <p className="text-sm text-gray-500 mt-2">
                Sitemap generator, schema markup, and more
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* SEO Form Modal */}
      {showSEOForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">SEO Configuration</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSEOForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Page Selection */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Type
                  </label>
                  <select
                    value={selectedPageType}
                    onChange={(e) => setSelectedPageType(e.target.value as PageType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="landing_page">Landing Page</option>
                    <option value="blog_post">Blog Post</option>
                    <option value="product_page">Product Page</option>
                    <option value="home_page">Home Page</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page ID
                  </label>
                  <input
                    type="text"
                    value={selectedPageId}
                    onChange={(e) => setSelectedPageId(e.target.value)}
                    placeholder="Enter page ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <SEOForm
                organizationId={organizationId}
                pageType={selectedPageType}
                pageId={selectedPageId}
                onSave={() => {
                  setShowSEOForm(false)
                  fetchSEOMetadata()
                }}
                onCancel={() => setShowSEOForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}