// CREATED: 2025-07-01 - A/B tests management dashboard

'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Progress } from '@/components/ui/Progress'
import { 
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Play,
  Pause,
  Square,
  BarChart3,
  TrendingUp,
  Target,
  Trophy,
  Users,
  Percent,
  Clock,
  RefreshCw,
  Settings,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/DropdownMenu'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'
import { useABTesting } from '@/hooks/marketing/useABTesting'
import { ABTestManager } from '@/components/marketing/ABTestManager'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

// ================================================
// A/B TESTS DASHBOARD COMPONENT
// ================================================

export default function ABTestsDashboard() {
  const { organization } = useCurrentOrganization()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'running' | 'paused' | 'completed'>('all')
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  const [showManager, setShowManager] = useState(false)

  const {
    abTests,
    loading,
    error,
    fetchABTests,
    createABTest,
    updateABTest,
    startABTest,
    stopABTest,
    deleteABTest,
    pagination,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage
  } = useABTesting(organization?.id || '')

  // Auto-fetch on organization change
  useEffect(() => {
    if (organization?.id) {
      fetchABTests({ status: statusFilter === 'all' ? undefined : statusFilter })
    }
  }, [organization?.id, statusFilter])

  // Filter tests based on search
  const filteredTests = React.useMemo(() => {
    if (!abTests) return []
    
    return abTests.filter(test => {
      const matchesSearch = !searchQuery || 
        test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (test.description && test.description.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesStatus = statusFilter === 'all' || test.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [abTests, searchQuery, statusFilter])

  // Handle test actions
  const handleStartTest = async (testId: string) => {
    const result = await startABTest(testId)
    if (result.success) {
      fetchABTests()
    }
  }

  const handleStopTest = async (testId: string) => {
    const result = await stopABTest(testId)
    if (result.success) {
      fetchABTests()
    }
  }

  const handleDeleteTest = async (testId: string) => {
    if (confirm('Are you sure you want to delete this A/B test?')) {
      const result = await deleteABTest(testId)
      if (result.success) {
        fetchABTests()
      }
    }
  }

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!abTests) return { 
      total: 0, 
      running: 0, 
      completed: 0, 
      avgImprovement: 0,
      totalSessions: 0 
    }
    
    const running = abTests.filter(t => t.status === 'running')
    const completed = abTests.filter(t => t.status === 'completed')
    
    // Calculate average improvement from completed tests
    const testsWithResults = completed.filter(t => t.results && (t.results as any).winner)
    const avgImprovement = testsWithResults.length > 0
      ? testsWithResults.reduce((sum, test) => {
          const results = test.results as any
          return sum + (results.winner?.improvement || 0)
        }, 0) / testsWithResults.length
      : 0

    // Calculate total sessions (mock data - would come from actual results)
    const totalSessions = abTests.reduce((sum, test) => {
      // This would come from actual session data
      return sum + ((test.results as any)?.total_sessions || 0)
    }, 0)
    
    return {
      total: abTests.length,
      running: running.length,
      completed: completed.length,
      avgImprovement,
      totalSessions
    }
  }, [abTests])

  if (showManager) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">
              {selectedTest ? 'Edit A/B Test' : 'Create A/B Test'}
            </h1>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowManager(false)
                setSelectedTest(null)
              }}
            >
              Back to Tests
            </Button>
          </div>
          <ABTestManager 
            organizationId={organization?.id || ''}
            onSave={() => {
              setShowManager(false)
              setSelectedTest(null)
              fetchABTests()
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
            <h1 className="text-2xl font-bold text-gray-900">A/B Tests</h1>
            <p className="mt-1 text-sm text-gray-600">
              Run experiments to optimize your conversion rates
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fetchABTests()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={() => setShowManager(true)}
              className="flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              New A/B Test
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                All experiments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Running</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.running}</div>
              <p className="text-xs text-muted-foreground">
                Active tests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">
                Finished tests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Improvement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.avgImprovement > 0 ? '+' : ''}{stats.avgImprovement.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                From winners
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Test participants
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <CardTitle>All A/B Tests</CardTitle>
              <div className="flex items-center space-x-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search tests..."
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
                       statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                      All Status
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('draft')}>
                      Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('running')}>
                      Running
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('paused')}>
                      Paused
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('completed')}>
                      Completed
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
            ) : filteredTests.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery || statusFilter !== 'all' ? 'No tests found' : 'No A/B tests yet'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Create your first A/B test to start optimizing conversions'
                  }
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Button onClick={() => setShowManager(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create A/B Test
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTests.map((test) => {
                  const isRunning = test.status === 'running'
                  const isCompleted = test.status === 'completed'
                  const canStart = test.status === 'draft' || test.status === 'paused'
                  const canPause = test.status === 'running'
                  
                  // Mock statistical significance (would come from actual results)
                  const significance = test.statistical_significance || 0
                  const hasWinner = isCompleted && test.winner_variant
                  
                  // Mock progress (would come from actual session data)
                  const targetSessions = 1000 // This would be configurable
                  const currentSessions = (test.results as any)?.total_sessions || 0
                  const progress = Math.min((currentSessions / targetSessions) * 100, 100)

                  return (
                    <div 
                      key={test.id} 
                      className="border rounded-lg hover:bg-gray-50"
                    >
                      {/* Main Test Info */}
                      <div className="flex items-center justify-between p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {test.name}
                            </h4>
                            <Badge variant={
                              test.status === 'running' ? 'default' :
                              test.status === 'completed' ? 'secondary' :
                              test.status === 'paused' ? 'outline' :
                              'secondary'
                            }>
                              {test.status}
                            </Badge>
                            {hasWinner && (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <Trophy className="h-3 w-3 mr-1" />
                                Winner
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            <span>{test.target_metric}</span>
                            <span>•</span>
                            <span>{(test.variants as any[])?.length || 0} variants</span>
                            <span>•</span>
                            <span>{currentSessions.toLocaleString()} sessions</span>
                            {significance > 0 && (
                              <>
                                <span>•</span>
                                <span>{(significance * 100).toFixed(1)}% significance</span>
                              </>
                            )}
                            <span>•</span>
                            <span>Updated {formatDate(test.updated_at)}</span>
                          </div>
                          {test.description && (
                            <p className="mt-1 text-sm text-gray-600 truncate">
                              {test.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Test Control Buttons */}
                          {canStart && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleStartTest(test.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {canPause && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleStopTest(test.id)}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}

                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedTest(test.id)
                              setShowManager(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedTest(test.id)
                                  setShowManager(true)
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Test
                              </DropdownMenuItem>
                              
                              {canStart && (
                                <DropdownMenuItem onClick={() => handleStartTest(test.id)}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Start Test
                                </DropdownMenuItem>
                              )}
                              
                              {canPause && (
                                <DropdownMenuItem onClick={() => handleStopTest(test.id)}>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause Test
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem 
                                onClick={() => handleDeleteTest(test.id)}
                                className="text-red-600"
                                disabled={isRunning}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Progress and Results */}
                      {isRunning && (
                        <div className="px-4 pb-4">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Test Progress</span>
                              <span className="text-sm text-gray-600">
                                {currentSessions.toLocaleString()} / {targetSessions.toLocaleString()} sessions
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                              <span>{progress.toFixed(1)}% complete</span>
                              <span>
                                {test.started_at && (
                                  `Started ${formatDate(test.started_at)}`
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Results Summary */}
                      {isCompleted && test.results && (
                        <div className="px-4 pb-4">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Duration</span>
                                <p className="font-medium">
                                  {test.started_at && test.ended_at && (
                                    `${Math.ceil((new Date(test.ended_at).getTime() - new Date(test.started_at).getTime()) / (1000 * 60 * 60 * 24))} days`
                                  )}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-600">Significance</span>
                                <p className="font-medium">{(significance * 100).toFixed(1)}%</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Winner</span>
                                <p className="font-medium">
                                  {test.winner_variant || 'No clear winner'}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-600">Improvement</span>
                                <p className="font-medium text-green-600">
                                  {hasWinner ? `+${((test.results as any).winner?.improvement || 0).toFixed(1)}%` : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="flex items-center justify-between border-t pt-4 mt-6">
                <div className="text-sm text-gray-600">
                  Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} tests
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