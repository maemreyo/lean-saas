// CREATED: 2025-07-01 - Lead capture management dashboard

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { 
  Search,
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  Mail,
  Eye,
  UserMinus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Users,
  UserCheck,
  UserX,
  Calendar,
  FileText,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from '@/components/ui/DropdownMenu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { useLeadCapture } from '@/hooks/marketing/useLeadCapture'
import { LeadCaptureForm } from '@/components/marketing/LeadCaptureForm'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { LeadCapture } from '@/shared/types/marketing'

// ================================================
// LEADS MANAGEMENT DASHBOARD COMPONENT
// ================================================

export default function LeadsManagementDashboard() {
  const { organization } = useCurrentOrganization()
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [subscribedFilter, setSubscribedFilter] = useState<string>('all')
  const [selectedLead, setSelectedLead] = useState<LeadCapture | null>(null)
  const [showLeadDetail, setShowLeadDetail] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [dateRange, setDateRange] = useState<string>('30d')

  const {
    leads,
    loading,
    error,
    analytics,
    pagination,
    fetchLeads,
    captureLead,
    updateLead,
    unsubscribeLead,
    deleteLead,
    fetchAnalytics,
    exportLeads,
    importLeads,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
    currentPage,
    totalPages
  } = useLeadCapture(organization?.id || '')

  // Auto-fetch on organization change
  useEffect(() => {
    if (organization?.id) {
      fetchLeads()
      fetchAnalytics()
    }
  }, [organization?.id])

  // Filter leads based on search and filters
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = !searchQuery || 
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.name && lead.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (lead.source && lead.source.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter
      const matchesSubscribed = subscribedFilter === 'all' || 
        (subscribedFilter === 'subscribed' && lead.subscribed) ||
        (subscribedFilter === 'unsubscribed' && !lead.subscribed)

      return matchesSearch && matchesSource && matchesSubscribed
    })
  }, [leads, searchQuery, sourceFilter, subscribedFilter])

  // Handle refresh
  const handleRefresh = () => {
    fetchLeads()
    fetchAnalytics()
  }

  // Handle search with debounce
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    // Implement debounced search if needed
  }

  // Handle filters
  const handleFilterChange = () => {
    const filters: any = {}
    
    if (sourceFilter !== 'all') filters.source = sourceFilter
    if (subscribedFilter !== 'all') filters.subscribed = subscribedFilter === 'subscribed'
    
    fetchLeads(filters)
  }

  useEffect(() => {
    handleFilterChange()
  }, [sourceFilter, subscribedFilter])

  // Handle lead actions
  const handleViewLead = (lead: LeadCapture) => {
    setSelectedLead(lead)
    setShowLeadDetail(true)
  }

  const handleUnsubscribe = async (leadId: string) => {
    const result = await unsubscribeLead(leadId)
    if (result.success) {
      fetchLeads()
      fetchAnalytics()
    }
  }

  const handleDelete = async (leadId: string) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      const result = await deleteLead(leadId)
      if (result.success) {
        fetchLeads()
        fetchAnalytics()
      }
    }
  }

  // Handle export
  const handleExport = async () => {
    await exportLeads({
      source: sourceFilter !== 'all' ? sourceFilter : undefined,
      subscribed: subscribedFilter !== 'all' ? subscribedFilter === 'subscribed' : undefined
    })
  }

  // Get unique sources for filter dropdown
  const availableSources = useMemo(() => {
    const sources = new Set(leads.map(lead => lead.source).filter(Boolean))
    return Array.from(sources)
  }, [leads])

  // Analytics cards data
  const analyticsCards = [
    {
      title: 'Total Leads',
      value: analytics?.total_leads || 0,
      change: analytics?.trends?.leads_change || 0,
      icon: Users,
      description: 'All time leads captured'
    },
    {
      title: 'New This Month',
      value: analytics?.new_leads || 0,
      change: null,
      icon: UserCheck,
      description: 'New leads this month'
    },
    {
      title: 'Active Subscribers',
      value: analytics?.active_subscribers || 0,
      change: null,
      icon: Mail,
      description: 'Currently subscribed'
    },
    {
      title: 'Conversion Rate',
      value: `${(analytics?.conversion_rate || 0).toFixed(1)}%`,
      change: null,
      icon: TrendingUp,
      description: 'Visitor to lead rate'
    }
  ]

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
            <p className="text-gray-600">Manage and track your captured leads</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
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
                      {card.change !== null && (
                        <div className="flex items-center mt-1">
                          {card.change >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                          )}
                          <span className={cn(
                            "text-sm font-medium",
                            card.change >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {Math.abs(card.change)}%
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{card.description}</p>
                    </div>
                    <Icon className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Leads ({filteredLeads.length})</CardTitle>
                <CardDescription>Manage your captured leads and track their engagement</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Source Filter */}
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {availableSources.map(source => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Subscription Filter */}
              <Select value={subscribedFilter} onValueChange={setSubscribedFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Subscribers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscribers</SelectItem>
                  <SelectItem value="subscribed">Subscribed</SelectItem>
                  <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Leads Table */}
            <div className="border rounded-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lead
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Captured
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                          Loading leads...
                        </td>
                      </tr>
                    ) : filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No leads found
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {lead.name || 'Anonymous'}
                              </div>
                              <div className="text-sm text-gray-500">{lead.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline">
                              {lead.source || 'Direct'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={lead.subscribed ? "default" : "secondary"}>
                              {lead.subscribed ? "Subscribed" : "Unsubscribed"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(lead.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewLead(lead)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {lead.subscribed && (
                                  <DropdownMenuItem onClick={() => handleUnsubscribe(lead.id)}>
                                    <UserMinus className="h-4 w-4 mr-2" />
                                    Unsubscribe
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(lead.id)}
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
              {filteredLeads.length > 0 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
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

        {/* Lead Detail Dialog */}
        <Dialog open={showLeadDetail} onOpenChange={setShowLeadDetail}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Lead Details</DialogTitle>
              <DialogDescription>
                View and manage lead information
              </DialogDescription>
            </DialogHeader>
            
            {selectedLead && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedLead.email}</p>
                </div>
                
                {selectedLead.name && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-sm text-gray-900">{selectedLead.name}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Source</label>
                  <p className="text-sm text-gray-900">{selectedLead.source || 'Direct'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Badge variant={selectedLead.subscribed ? "default" : "secondary"}>
                    {selectedLead.subscribed ? "Subscribed" : "Unsubscribed"}
                  </Badge>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Captured</label>
                  <p className="text-sm text-gray-900">{formatDateTime(selectedLead.created_at)}</p>
                </div>

                {selectedLead.utm_source && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">UTM Source</label>
                    <p className="text-sm text-gray-900">{selectedLead.utm_source}</p>
                  </div>
                )}

                {selectedLead.metadata && Object.keys(selectedLead.metadata).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Metadata</label>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(selectedLead.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLeadDetail(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Import Leads</DialogTitle>
              <DialogDescription>
                Upload a CSV file to import leads in bulk
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              
              <div className="text-xs text-gray-500">
                CSV should contain columns: email (required), name, source, metadata
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowImportDialog(false)}>
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}