// CREATED: 2025-07-01 - Landing pages management dashboard

'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { 
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Trash2,
  Globe,
  BarChart3,
  TrendingUp,
  ExternalLink,
  Settings,
  RefreshCw
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/DropdownMenu'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { useLandingPages } from '@/hooks/marketing/useLandingPages'
import { LandingPageBuilder } from '@/components/marketing/LandingPageBuilder'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

// ================================================
// LANDING PAGES DASHBOARD COMPONENT
// ================================================

export default function LandingPagesDashboard() {
  const { organization } = useCurrentOrganization()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [selectedPage, setSelectedPage] = useState<string | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)

  const {
    landingPages,
    loading,
    error,
    fetchLandingPages,
    createLandingPage,
    updateLandingPage,
    publishLandingPage,
    deleteLandingPage,
    duplicateLandingPage,
    pagination,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage
  } = useLandingPages(organization?.id || '')

  // Auto-fetch on organization change
  useEffect(() => {
    if (organization?.id) {
      fetchLandingPages({ published: statusFilter === 'all' ? undefined : statusFilter === 'published' })
    }
  }, [organization?.id, statusFilter])

  // Filter pages based on search
  const filteredPages = React.useMemo(() => {
    if (!landingPages) return []
    
    return landingPages.filter(page => {
      const matchesSearch = !searchQuery || 
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.slug.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'published' && page.published) ||
        (statusFilter === 'draft' && !page.published)

      return matchesSearch && matchesStatus
    })
  }, [landingPages, searchQuery, statusFilter])

  // Handle page actions
  const handlePublishToggle = async (pageId: string, currentStatus: boolean) => {
    const result = await publishLandingPage(pageId, !currentStatus)
    if (result.success) {
      fetchLandingPages()
    }
  }

  const handleDuplicate = async (pageId: string) => {
    const result = await duplicateLandingPage(pageId, `${Date.now()}`)
    if (result.success) {
      fetchLandingPages()
    }
  }

  const handleDelete = async (pageId: string) => {
    if (confirm('Are you sure you want to delete this landing page?')) {
      const result = await deleteLandingPage(pageId)
      if (result.success) {
        fetchLandingPages()
      }
    }
  }

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!landingPages) return { total: 0, published: 0, draft: 0, totalViews: 0, totalConversions: 0 }
    
    return {
      total: landingPages.length,
      published: landingPages.filter(p => p.published).length,
      draft: landingPages.filter(p => !p.published).length,
      totalViews: landingPages.reduce((sum, p) => sum + (p.view_count || 0), 0),
      totalConversions: landingPages.reduce((sum, p) => sum + (p.conversion_count || 0), 0)
    }
  }, [landingPages])

  if (showBuilder) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">
              {selectedPage ? 'Edit Landing Page' : 'Create Landing Page'}
            </h1>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBuilder(false)
                setSelectedPage(null)
              }}
            >
              Back to Pages
            </Button>
          </div>
          <LandingPageBuilder 
            organizationId={organization?.id || ''}
            landingPageId={selectedPage}
            onSave={() => {
              setShowBuilder(false)
              setSelectedPage(null)
              fetchLandingPages()
            }}
          />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Landing Pages</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create and manage high-converting landing pages
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fetchLandingPages()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={() => setShowBuilder(true)}
              className="flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Landing Page
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                All landing pages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.published}</div>
              <p className="text-xs text-muted-foreground">
                Live pages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Drafts</CardTitle>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
              <p className="text-xs text-muted-foreground">
                Unpublished pages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                All time views
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConversions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total conversions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <CardTitle>All Landing Pages</CardTitle>
              <div className="flex items-center space-x-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search pages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>

                {/* Status Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-1" />
                      {statusFilter === 'all' ? 'All Status' : 
                       statusFilter === 'published' ? 'Published' : 'Draft'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                      All Status
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('published')}>
                      Published
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('draft')}>
                      Draft
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="text-center py-12">
                <Globe className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery || statusFilter !== 'all' ? 'No pages found' : 'No landing pages yet'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Create your first landing page to start converting visitors'
                  }
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Button onClick={() => setShowBuilder(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create Landing Page
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPages.map((page) => (
                  <div 
                    key={page.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {page.title}
                        </h4>
                        <Badge variant={page.published ? 'default' : 'secondary'}>
                          {page.published ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>/{page.slug}</span>
                        <span>•</span>
                        <span>{page.view_count || 0} views</span>
                        <span>•</span>
                        <span>{page.conversion_count || 0} conversions</span>
                        <span>•</span>
                        <span>
                          {page.view_count && page.view_count > 0 
                            ? `${((page.conversion_count || 0) / page.view_count * 100).toFixed(1)}%`
                            : '0%'
                          } conversion rate
                        </span>
                        <span>•</span>
                        <span>Updated {formatDate(page.updated_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {page.published && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/landing/${page.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedPage(page.id)
                          setShowBuilder(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handlePublishToggle(page.id, page.published)}
                          >
                            <Globe className="h-4 w-4 mr-2" />
                            {page.published ? 'Unpublish' : 'Publish'}
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem onClick={() => handleDuplicate(page.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            onClick={() => handleDelete(page.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="flex items-center justify-between border-t pt-4 mt-6">
                <div className="text-sm text-gray-600">
                  Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} pages
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
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}