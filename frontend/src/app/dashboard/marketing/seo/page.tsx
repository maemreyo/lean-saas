// CREATED: 2025-07-01 - SEO management dashboard

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
  Globe,
  FileText,
  Download,
  Upload,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  XCircle,
  Target,
  BarChart3,
  RefreshCw,
  Lightbulb,
  ExternalLink,
  Settings,
  Zap,
  FileCode,
  Map
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
import { useSEOMetadata, useSEOTools, useSEOAnalytics } from '@/hooks/marketing/useSEO'
import { SEOManager } from '@/components/marketing/SEOManager'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import type { SEOMetadata, PageType } from '@/shared/types/marketing'

// ================================================
// SEO MANAGER DASHBOARD COMPONENT
// ================================================

export default function SEOManagerDashboard() {
  const { organization } = useCurrentOrganization()
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [pageTypeFilter, setPageTypeFilter] = useState<string>('all')
  const [selectedMetadata, setSelectedMetadata] = useState<SEOMetadata | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false)
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [seoForm, setSeoForm] = useState({
    title: '',
    description: '',
    keywords: '',
    canonical_url: '',
    open_graph: {
      title: '',
      description: '',
      image_url: '',
      type: 'website'
    }
  })

  // Hooks
  const {
    seoMetadata,
    loading: metadataLoading,
    error: metadataError,
    completeness,
    fetchSEOMetadata,
    updateSEOMetadata,
    deleteSEOMetadata,
    bulkUpdateSEO,
    pagination,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
    currentPage,
    totalPages
  } = useSEOMetadata(organization?.id || '')

  const {
    sitemapEntries,
    loading: toolsLoading,
    generateSitemap,
    generateRobotsTxt,
    downloadSitemap,
    downloadRobotsTxt
  } = useSEOTools(organization?.id || '')

  const {
    analytics,
    loading: analyticsLoading,
    fetchAnalytics
  } = useSEOAnalytics(organization?.id || '')

  // Auto-fetch data on organization change
  useEffect(() => {
    if (organization?.id) {
      fetchSEOMetadata()
      fetchAnalytics()
    }
  }, [organization?.id])

  // Filter metadata based on search and filters
  const filteredMetadata = useMemo(() => {
    return seoMetadata.filter(meta => {
      const matchesSearch = !searchQuery || 
        meta.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meta.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meta.page_type.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesPageType = pageTypeFilter === 'all' || meta.page_type === pageTypeFilter

      return matchesSearch && matchesPageType
    })
  }, [seoMetadata, searchQuery, pageTypeFilter])

  // Handle refresh
  const handleRefresh = () => {
    fetchSEOMetadata()
    fetchAnalytics()
  }

  // Handle edit SEO metadata
  const handleEditMetadata = (metadata: SEOMetadata) => {
    setSelectedMetadata(metadata)
    setSeoForm({
      title: metadata.title || '',
      description: metadata.description || '',
      keywords: metadata.keywords?.join(', ') || '',
      canonical_url: metadata.canonical_url || '',
      open_graph: {
        title: metadata.open_graph?.title || '',
        description: metadata.open_graph?.description || '',
        image_url: metadata.open_graph?.image_url || '',
        type: metadata.open_graph?.type || 'website'
      }
    })
    setShowEditDialog(true)
  }

  // Handle save SEO metadata
  const handleSaveMetadata = async () => {
    if (!selectedMetadata) return

    const result = await updateSEOMetadata(selectedMetadata.id, {
      title: seoForm.title,
      description: seoForm.description,
      keywords: seoForm.keywords.split(',').map(k => k.trim()).filter(Boolean),
      canonical_url: seoForm.canonical_url,
      open_graph: seoForm.open_graph
    })

    if (result.success) {
      setShowEditDialog(false)
      fetchSEOMetadata()
      fetchAnalytics()
    }
  }

  // Handle delete SEO metadata
  const handleDeleteMetadata = async (metadataId: string) => {
    if (confirm('Are you sure you want to delete this SEO metadata?')) {
      const result = await deleteSEOMetadata(metadataId)
      if (result.success) {
        fetchSEOMetadata()
        fetchAnalytics()
      }
    }
  }

  // Handle bulk operations
  const handleBulkUpdate = async (updates: Partial<{
    title_suffix: string
    description_suffix: string
    keywords: string[]
  }>) => {
    const result = await bulkUpdateSEO(selectedItems, updates)
    if (result.success) {
      setSelectedItems([])
      setBulkEditMode(false)
      fetchSEOMetadata()
    }
  }

  // Handle sitemap generation
  const handleGenerateSitemap = async () => {
    const baseUrl = window.location.origin
    await generateSitemap(baseUrl)
  }

  // Handle robots.txt generation
  const handleGenerateRobots = () => {
    const baseUrl = window.location.origin
    const disallowPaths = ['/admin', '/api', '/dashboard']
    downloadRobotsTxt(baseUrl, disallowPaths)
  }

  // Get SEO health score
  const getHealthScore = (metadata: SEOMetadata) => {
    let score = 0
    let maxScore = 5

    if (metadata.title && metadata.title.length >= 30 && metadata.title.length <= 60) score += 1
    if (metadata.description && metadata.description.length >= 120 && metadata.description.length <= 160) score += 1
    if (metadata.keywords && metadata.keywords.length > 0) score += 1
    if (metadata.canonical_url) score += 1
    if (metadata.open_graph?.title && metadata.open_graph?.description) score += 1

    return Math.round((score / maxScore) * 100)
  }

  // Get available page types
  const availablePageTypes = useMemo(() => {
    const types = new Set(seoMetadata.map(meta => meta.page_type))
    return Array.from(types)
  }, [seoMetadata])

  // Analytics cards data
  const analyticsCards = [
    {
      title: 'Total Pages',
      value: analytics?.total_pages || 0,
      description: 'Pages tracked for SEO',
      icon: Globe,
      trend: null
    },
    {
      title: 'SEO Complete',
      value: analytics?.pages_with_seo || 0,
      description: 'Pages with full SEO',
      icon: CheckCircle,
      trend: null
    },
    {
      title: 'Completion Rate',
      value: `${(analytics?.completion_rate || 0).toFixed(1)}%`,
      description: 'Overall SEO completion',
      icon: Target,
      trend: null
    },
    {
      title: 'Avg Title Length',
      value: Math.round(analytics?.avg_title_length || 0),
      description: 'Characters in titles',
      icon: FileText,
      trend: null
    }
  ]

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SEO Manager</h1>
            <p className="text-gray-600">Optimize your content for search engines</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleRefresh} disabled={analyticsLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", analyticsLoading && "animate-spin")} />
              Refresh
            </Button>
            
            <Button variant="outline" onClick={handleGenerateSitemap} disabled={toolsLoading}>
              <Map className="h-4 w-4 mr-2" />
              Generate Sitemap
            </Button>
            
            <Button variant="outline" onClick={handleGenerateRobots}>
              <FileCode className="h-4 w-4 mr-2" />
              Robots.txt
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

        {/* SEO Health Overview */}
        {completeness && (
          <Card>
            <CardHeader>
              <CardTitle>SEO Health Overview</CardTitle>
              <CardDescription>Areas that need attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <AlertCircle className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="font-medium">Missing Titles</p>
                    <p className="text-sm text-gray-500">{analytics?.pages_missing_titles || 0} pages</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <AlertCircle className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="font-medium">Missing Descriptions</p>
                    <p className="text-sm text-gray-500">{analytics?.pages_missing_descriptions || 0} pages</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <AlertCircle className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="font-medium">Missing Keywords</p>
                    <p className="text-sm text-gray-500">{analytics?.pages_missing_keywords || 0} pages</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SEO Manager Component */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>SEO Quick Manager</CardTitle>
                  <CardDescription>Manage SEO for specific pages</CardDescription>
                </CardHeader>
                <CardContent>
                  <SEOManager organizationId={organization?.id || ''} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pages Tab */}
          <TabsContent value="pages" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>SEO Metadata ({filteredMetadata.length})</CardTitle>
                    <CardDescription>Manage SEO for all your pages</CardDescription>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {bulkEditMode && selectedItems.length > 0 && (
                      <Button 
                        variant="outline"
                        onClick={() => {/* Open bulk edit dialog */}}
                      >
                        Edit {selectedItems.length} Items
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => setBulkEditMode(!bulkEditMode)}
                    >
                      {bulkEditMode ? 'Cancel' : 'Bulk Edit'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search pages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={pageTypeFilter} onValueChange={setPageTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Page Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Page Types</SelectItem>
                      {availablePageTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pages Table */}
                <div className="border rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {bulkEditMode && (
                            <th className="px-4 py-3 text-left">
                              <input
                                type="checkbox"
                                checked={selectedItems.length === filteredMetadata.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedItems(filteredMetadata.map(m => m.id))
                                  } else {
                                    setSelectedItems([])
                                  }
                                }}
                              />
                            </th>
                          )}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Page
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Title
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Description
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Health
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Updated
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {metadataLoading ? (
                          <tr>
                            <td colSpan={bulkEditMode ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                              Loading SEO metadata...
                            </td>
                          </tr>
                        ) : filteredMetadata.length === 0 ? (
                          <tr>
                            <td colSpan={bulkEditMode ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                              No SEO metadata found
                            </td>
                          </tr>
                        ) : (
                          filteredMetadata.map((metadata) => {
                            const healthScore = getHealthScore(metadata)
                            return (
                              <tr key={metadata.id} className="hover:bg-gray-50">
                                {bulkEditMode && (
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedItems.includes(metadata.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedItems([...selectedItems, metadata.id])
                                        } else {
                                          setSelectedItems(selectedItems.filter(id => id !== metadata.id))
                                        }
                                      }}
                                    />
                                  </td>
                                )}
                                <td className="px-4 py-3">
                                  <div>
                                    <div className="text-sm font-medium">{metadata.page_type}</div>
                                    <div className="text-xs text-gray-500">{metadata.page_id}</div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm">
                                    {metadata.title ? (
                                      <span className={cn(
                                        metadata.title.length < 30 || metadata.title.length > 60 
                                          ? "text-orange-600" 
                                          : "text-green-600"
                                      )}>
                                        {metadata.title.slice(0, 50)}
                                        {metadata.title.length > 50 && '...'}
                                      </span>
                                    ) : (
                                      <span className="text-red-500 italic">Missing title</span>
                                    )}
                                  </div>
                                  {metadata.title && (
                                    <div className="text-xs text-gray-500">
                                      {metadata.title.length} chars
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm">
                                    {metadata.description ? (
                                      <span className={cn(
                                        metadata.description.length < 120 || metadata.description.length > 160 
                                          ? "text-orange-600" 
                                          : "text-green-600"
                                      )}>
                                        {metadata.description.slice(0, 50)}
                                        {metadata.description.length > 50 && '...'}
                                      </span>
                                    ) : (
                                      <span className="text-red-500 italic">Missing description</span>
                                    )}
                                  </div>
                                  {metadata.description && (
                                    <div className="text-xs text-gray-500">
                                      {metadata.description.length} chars
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center space-x-2">
                                    <div className={cn(
                                      "w-12 h-2 rounded-full",
                                      healthScore >= 80 ? "bg-green-200" :
                                      healthScore >= 60 ? "bg-yellow-200" :
                                      "bg-red-200"
                                    )}>
                                      <div 
                                        className={cn(
                                          "h-full rounded-full",
                                          healthScore >= 80 ? "bg-green-500" :
                                          healthScore >= 60 ? "bg-yellow-500" :
                                          "bg-red-500"
                                        )}
                                        style={{ width: `${healthScore}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-gray-500">{healthScore}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {formatDate(metadata.updated_at)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEditMetadata(metadata)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit SEO
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => {
                                        setSelectedMetadata(metadata)
                                        setShowAnalysisDialog(true)
                                      }}>
                                        <Lightbulb className="h-4 w-4 mr-2" />
                                        Analyze
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => handleDeleteMetadata(metadata.id)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {filteredMetadata.length > 0 && (
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

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sitemap Tools */}
              <Card>
                <CardHeader>
                  <CardTitle>Sitemap Generation</CardTitle>
                  <CardDescription>Generate and download XML sitemaps</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handleGenerateSitemap}
                    disabled={toolsLoading}
                    className="w-full"
                  >
                    <Map className="h-4 w-4 mr-2" />
                    Generate Sitemap
                  </Button>
                  
                  {sitemapEntries && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        {sitemapEntries.length} URLs found
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => downloadSitemap(window.location.origin)}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download XML
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Robots.txt Tools */}
              <Card>
                <CardHeader>
                  <CardTitle>Robots.txt</CardTitle>
                  <CardDescription>Generate robots.txt for search engines</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handleGenerateRobots}
                    className="w-full"
                  >
                    <FileCode className="h-4 w-4 mr-2" />
                    Generate & Download
                  </Button>
                  
                  <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
                    <p>Will include:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>Disallow: /admin</li>
                      <li>Disallow: /api</li>
                      <li>Disallow: /dashboard</li>
                      <li>Sitemap: {window.location.origin}/sitemap.xml</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SEO Analysis</CardTitle>
                <CardDescription>Insights and recommendations for improvement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Title Analysis */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <h3 className="font-medium">Title Optimization</h3>
                    </div>
                    <p className="text-2xl font-bold">{analytics?.avg_title_length || 0}</p>
                    <p className="text-sm text-gray-500">Average length</p>
                    <p className="text-xs text-gray-400 mt-1">Optimal: 30-60 characters</p>
                  </div>

                  {/* Description Analysis */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-5 w-5 text-green-500" />
                      <h3 className="font-medium">Description Optimization</h3>
                    </div>
                    <p className="text-2xl font-bold">{analytics?.avg_description_length || 0}</p>
                    <p className="text-sm text-gray-500">Average length</p>
                    <p className="text-xs text-gray-400 mt-1">Optimal: 120-160 characters</p>
                  </div>

                  {/* Coverage Analysis */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="h-5 w-5 text-purple-500" />
                      <h3 className="font-medium">SEO Coverage</h3>
                    </div>
                    <p className="text-2xl font-bold">{(analytics?.completion_rate || 0).toFixed(1)}%</p>
                    <p className="text-sm text-gray-500">Overall completion</p>
                    <p className="text-xs text-gray-400 mt-1">Target: 90%+</p>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <Lightbulb className="h-5 w-5 text-blue-500" />
                    <h3 className="font-medium text-blue-900">Recommendations</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-blue-800">
                    {analytics?.pages_missing_titles ? (
                      <li>• Add titles to {analytics.pages_missing_titles} pages</li>
                    ) : null}
                    {analytics?.pages_missing_descriptions ? (
                      <li>• Add descriptions to {analytics.pages_missing_descriptions} pages</li>
                    ) : null}
                    {analytics?.pages_missing_keywords ? (
                      <li>• Add keywords to {analytics.pages_missing_keywords} pages</li>
                    ) : null}
                    {analytics?.avg_title_length && analytics.avg_title_length < 30 ? (
                      <li>• Increase title length for better SEO (current avg: {Math.round(analytics.avg_title_length)})</li>
                    ) : null}
                    {analytics?.avg_description_length && analytics.avg_description_length < 120 ? (
                      <li>• Increase description length for better CTR (current avg: {Math.round(analytics.avg_description_length)})</li>
                    ) : null}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit SEO Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit SEO Metadata</DialogTitle>
              <DialogDescription>
                Optimize SEO for {selectedMetadata?.page_type} page
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={seoForm.title}
                  onChange={(e) => setSeoForm({...seoForm, title: e.target.value})}
                  placeholder="Page title (30-60 characters)"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {seoForm.title.length} characters
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={seoForm.description}
                  onChange={(e) => setSeoForm({...seoForm, description: e.target.value})}
                  placeholder="Meta description (120-160 characters)"
                  rows={3}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {seoForm.description.length} characters
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Keywords</label>
                <Input
                  value={seoForm.keywords}
                  onChange={(e) => setSeoForm({...seoForm, keywords: e.target.value})}
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Canonical URL</label>
                <Input
                  value={seoForm.canonical_url}
                  onChange={(e) => setSeoForm({...seoForm, canonical_url: e.target.value})}
                  placeholder="https://example.com/page"
                />
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Open Graph</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">OG Title</label>
                    <Input
                      value={seoForm.open_graph.title}
                      onChange={(e) => setSeoForm({
                        ...seoForm, 
                        open_graph: {...seoForm.open_graph, title: e.target.value}
                      })}
                      placeholder="Social media title"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">OG Description</label>
                    <Textarea
                      value={seoForm.open_graph.description}
                      onChange={(e) => setSeoForm({
                        ...seoForm, 
                        open_graph: {...seoForm.open_graph, description: e.target.value}
                      })}
                      placeholder="Social media description"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">OG Image URL</label>
                    <Input
                      value={seoForm.open_graph.image_url}
                      onChange={(e) => setSeoForm({
                        ...seoForm, 
                        open_graph: {...seoForm.open_graph, image_url: e.target.value}
                      })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveMetadata}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Analysis Dialog */}
        <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>SEO Analysis</DialogTitle>
              <DialogDescription>
                Analysis for {selectedMetadata?.page_type} page
              </DialogDescription>
            </DialogHeader>
            
            {selectedMetadata && (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Health Score</h4>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 h-3 bg-gray-200 rounded-full">
                      <div 
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${getHealthScore(selectedMetadata)}%` }}
                      />
                    </div>
                    <span className="font-bold">{getHealthScore(selectedMetadata)}%</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {selectedMetadata.title ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">Title present</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {selectedMetadata.description ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">Description present</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {selectedMetadata.keywords && selectedMetadata.keywords.length > 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">Keywords present</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {selectedMetadata.canonical_url ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">Canonical URL set</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {selectedMetadata.open_graph?.title && selectedMetadata.open_graph?.description ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">Open Graph configured</span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAnalysisDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}