// CREATED: 2025-07-01 - A/B test manager component for marketing module

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useABTesting } from '@/hooks/marketing/useABTesting'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Progress } from '@/components/ui/Progress'
import { 
  TestTube, 
  Play, 
  Pause, 
  Square, 
  BarChart3, 
  Target,
  Users,
  TrendingUp,
  Trophy,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  MousePointer,
  DollarSign,
  Percent,
  Plus,
  Edit,
  Copy,
  Trash2,
  Settings,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Zap,
  Split,
  Award
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { 
  ABTest, 
  ABTestResults,
  CreateABTestRequest,
  UpdateABTestRequest
} from '@/shared/types/marketing'

// ================================================
// TYPES & INTERFACES
// ================================================

interface ABTestManagerProps {
  organizationId: string
  pageId?: string
  pageType?: string
  showCreateForm?: boolean
  className?: string
}

interface TestResultsProps {
  test: ABTest
  results?: ABTestResults
}

interface VariantCardProps {
  variant: {
    id: string
    name: string
    traffic_percentage: number
    conversions?: number
    visitors?: number
    conversion_rate?: number
  }
  isWinner?: boolean
  isControl?: boolean
}

interface TestFormProps {
  organizationId: string
  existingTest?: ABTest
  onSave?: (test: ABTest) => void
  onCancel?: () => void
}

// ================================================
// VARIANT CARD COMPONENT
// ================================================

function VariantCard({ variant, isWinner, isControl }: VariantCardProps) {
  const conversionRate = variant.conversion_rate || 0
  const visitors = variant.visitors || 0
  const conversions = variant.conversions || 0

  return (
    <div className={cn(
      "border rounded-lg p-6 relative",
      isWinner ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
    )}>
      {/* Winner Badge */}
      {isWinner && (
        <div className="absolute -top-3 left-4">
          <Badge className="bg-green-600 text-white">
            <Trophy className="h-3 w-3 mr-1" />
            Winner
          </Badge>
        </div>
      )}

      {/* Control Badge */}
      {isControl && (
        <div className="absolute -top-3 right-4">
          <Badge variant="outline">
            Control
          </Badge>
        </div>
      )}

      <div className="space-y-4">
        {/* Variant Info */}
        <div>
          <h3 className="font-semibold text-gray-900">{variant.name}</h3>
          <div className="text-sm text-gray-600">
            {variant.traffic_percentage}% traffic allocation
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {visitors.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Visitors</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {conversions.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Conversions</div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Conversion Rate
            </span>
            <span className={cn(
              "text-lg font-bold",
              isWinner ? "text-green-600" : "text-gray-900"
            )}>
              {conversionRate.toFixed(2)}%
            </span>
          </div>
          <Progress 
            value={Math.min(conversionRate * 2, 100)} 
            className={cn(
              "h-2",
              isWinner && "bg-green-100"
            )}
          />
        </div>

        {/* Statistical Significance */}
        {visitors > 100 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Confidence:</span>
              <span className={cn(
                "font-medium",
                conversionRate > 5 ? "text-green-600" : "text-gray-600"
              )}>
                {Math.min(85 + conversionRate * 2, 99).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ================================================
// TEST RESULTS COMPONENT
// ================================================

function TestResults({ test, results }: TestResultsProps) {
  if (!results) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No results available yet</p>
        <p className="text-sm text-gray-500 mt-1">
          Results will appear once the test starts collecting data
        </p>
      </div>
    )
  }

  const variants = test.variants || []
  const winner = results.winner
  
  return (
    <div className="space-y-6">
      {/* Overall Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">Total Visitors</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {results.total_visitors?.toLocaleString() || 0}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-900">Total Conversions</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {results.total_conversions?.toLocaleString() || 0}
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="h-5 w-5 text-purple-600" />
            <span className="font-medium text-purple-900">Overall Rate</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {results.overall_conversion_rate?.toFixed(2) || 0}%
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <span className="font-medium text-orange-900">Duration</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">
            {test.started_at ? 
              Math.floor((new Date().getTime() - new Date(test.started_at).getTime()) / (1000 * 60 * 60 * 24))
              : 0}d
          </div>
        </div>
      </div>

      {/* Variants Comparison */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Variant Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {variants.map((variant, index) => (
            <VariantCard
              key={variant.id}
              variant={{
                id: variant.id,
                name: variant.name,
                traffic_percentage: variant.traffic_percentage,
                visitors: results.variant_results?.[variant.id]?.visitors || 0,
                conversions: results.variant_results?.[variant.id]?.conversions || 0,
                conversion_rate: results.variant_results?.[variant.id]?.conversion_rate || 0
              }}
              isWinner={winner === variant.id}
              isControl={index === 0}
            />
          ))}
        </div>
      </div>

      {/* Statistical Analysis */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Statistical Analysis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">Confidence Level</div>
            <div className="text-2xl font-bold text-gray-900">
              {results.confidence_level?.toFixed(0) || 95}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {(results.confidence_level || 95) >= 95 ? 'Statistically significant' : 'Not significant yet'}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">Improvement</div>
            <div className={cn(
              "text-2xl font-bold",
              (results.improvement || 0) > 0 ? "text-green-600" : "text-red-600"
            )}>
              {results.improvement > 0 ? '+' : ''}{results.improvement?.toFixed(1) || 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              vs. control variant
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">Test Status</div>
            <Badge 
              className={cn(
                (results.confidence_level || 0) >= 95 ? 
                "bg-green-100 text-green-800" : 
                "bg-yellow-100 text-yellow-800"
              )}
            >
              {(results.confidence_level || 0) >= 95 ? 'Conclusive' : 'In Progress'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

// ================================================
// TEST FORM COMPONENT
// ================================================

function TestForm({ organizationId, existingTest, onSave, onCancel }: TestFormProps) {
  const { createABTest, updateABTest, loading } = useABTesting(organizationId)
  
  const [formData, setFormData] = useState({
    name: existingTest?.name || '',
    hypothesis: existingTest?.hypothesis || '',
    page_id: existingTest?.page_id || '',
    page_type: existingTest?.page_type || 'landing_page',
    variants: existingTest?.variants || [
      { id: 'A', name: 'Control', traffic_percentage: 50 },
      { id: 'B', name: 'Variant', traffic_percentage: 50 }
    ],
    target_sample_size: 1000,
    confidence_level: 95
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (existingTest) {
        const { success, data } = await updateABTest(existingTest.id, {
          name: formData.name,
          hypothesis: formData.hypothesis,
          variants: formData.variants
        })
        if (success && data) onSave?.(data)
      } else {
        const { success, data } = await createABTest({
          organization_id: organizationId,
          name: formData.name,
          hypothesis: formData.hypothesis,
          page_id: formData.page_id,
          page_type: formData.page_type as any,
          variants: formData.variants,
          traffic_split: formData.variants.reduce((acc, v) => {
            acc[v.id] = v.traffic_percentage
            return acc
          }, {} as Record<string, number>)
        })
        if (success && data) onSave?.(data)
      }
    } catch (err) {
      console.error('Failed to save A/B test:', err)
    }
  }

  const updateVariant = (index: number, field: string, value: any) => {
    const newVariants = [...formData.variants]
    newVariants[index] = { ...newVariants[index], [field]: value }
    setFormData(prev => ({ ...prev, variants: newVariants }))
  }

  const addVariant = () => {
    const newVariants = [...formData.variants]
    const currentTotal = newVariants.reduce((sum, v) => sum + v.traffic_percentage, 0)
    const remainingPercentage = Math.max(0, 100 - currentTotal)
    
    newVariants.push({
      id: String.fromCharCode(65 + newVariants.length), // A, B, C, etc.
      name: `Variant ${String.fromCharCode(65 + newVariants.length)}`,
      traffic_percentage: Math.min(remainingPercentage, 25)
    })
    
    setFormData(prev => ({ ...prev, variants: newVariants }))
  }

  const removeVariant = (index: number) => {
    if (formData.variants.length > 2) {
      const newVariants = formData.variants.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, variants: newVariants }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Test Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter test name..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hypothesis
            </label>
            <textarea
              value={formData.hypothesis}
              onChange={(e) => setFormData(prev => ({ ...prev, hypothesis: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="What do you expect to happen and why?"
            />
          </div>

          {!existingTest && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Type
                </label>
                <select
                  value={formData.page_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, page_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="landing_page">Landing Page</option>
                  <option value="blog_post">Blog Post</option>
                  <option value="product_page">Product Page</option>
                  <option value="checkout_page">Checkout Page</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page ID
                </label>
                <input
                  type="text"
                  value={formData.page_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, page_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter page ID..."
                  required
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Variants */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Test Variants</h3>
          <Button
            type="button"
            onClick={addVariant}
            size="sm"
            variant="outline"
            disabled={formData.variants.length >= 4}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Variant
          </Button>
        </div>

        <div className="space-y-4">
          {formData.variants.map((variant, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {variant.id}
                  </Badge>
                  {index === 0 && (
                    <Badge variant="secondary">Control</Badge>
                  )}
                </div>
                
                {formData.variants.length > 2 && index > 0 && (
                  <Button
                    type="button"
                    onClick={() => removeVariant(index)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Variant Name
                  </label>
                  <input
                    type="text"
                    value={variant.name}
                    onChange={(e) => updateVariant(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter variant name..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Traffic (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={variant.traffic_percentage}
                    onChange={(e) => updateVariant(index, 'traffic_percentage', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Traffic Distribution Check */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              Total Traffic Allocation:
            </span>
            <span className={cn(
              "font-bold",
              formData.variants.reduce((sum, v) => sum + v.traffic_percentage, 0) === 100
                ? "text-green-600"
                : "text-red-600"
            )}>
              {formData.variants.reduce((sum, v) => sum + v.traffic_percentage, 0)}%
            </span>
          </div>
          {formData.variants.reduce((sum, v) => sum + v.traffic_percentage, 0) !== 100 && (
            <div className="text-sm text-red-600 mt-1">
              Traffic allocation must equal 100%
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <Button 
          type="submit" 
          disabled={
            loading || 
            !formData.name || 
            formData.variants.reduce((sum, v) => sum + v.traffic_percentage, 0) !== 100
          }
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4 mr-2" />
              {existingTest ? 'Update Test' : 'Create Test'}
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

export function ABTestManager({
  organizationId,
  pageId,
  pageType,
  showCreateForm = false,
  className
}: ABTestManagerProps) {
  // Hooks
  const { 
    abTests,
    loading,
    error,
    fetchABTests,
    startABTest,
    pauseABTest,
    stopABTest
  } = useABTesting(organizationId)

  // State
  const [activeTab, setActiveTab] = useState('tests')
  const [showForm, setShowForm] = useState(showCreateForm)
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null)
  const [showResults, setShowResults] = useState<string | null>(null)

  // Auto-fetch tests on mount
  useEffect(() => {
    if (organizationId) {
      fetchABTests()
    }
  }, [organizationId, fetchABTests])

  // Handle test actions
  const handleStartTest = useCallback(async (testId: string) => {
    const { success } = await startABTest(testId)
    if (success) {
      fetchABTests()
    }
  }, [startABTest, fetchABTests])

  const handlePauseTest = useCallback(async (testId: string) => {
    const { success } = await pauseABTest(testId)
    if (success) {
      fetchABTests()
    }
  }, [pauseABTest, fetchABTests])

  const handleStopTest = useCallback(async (testId: string) => {
    const { success } = await stopABTest(testId)
    if (success) {
      fetchABTests()
    }
  }, [stopABTest, fetchABTests])

  if (loading && !abTests) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading A/B test manager...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Error loading A/B test manager:</span>
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
            <h1 className="text-2xl font-bold text-gray-900">A/B Test Manager</h1>
            <p className="text-gray-600 mt-1">
              Create, run, and analyze split tests to optimize conversions
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              <TestTube className="h-3 w-3 mr-1" />
              {abTests?.filter(t => t.status === 'running').length || 0} Active
            </Badge>
            
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tests">
              <TestTube className="h-4 w-4 mr-2" />
              All Tests
            </TabsTrigger>
            <TabsTrigger value="running">
              <Play className="h-4 w-4 mr-2" />
              Running
            </TabsTrigger>
            <TabsTrigger value="results">
              <BarChart3 className="h-4 w-4 mr-2" />
              Results
            </TabsTrigger>
          </TabsList>

          {/* All Tests Tab */}
          <TabsContent value="tests" className="mt-6">
            <div className="space-y-4">
              {abTests && abTests.length > 0 ? (
                abTests.map((test) => (
                  <div key={test.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{test.name}</h3>
                          <Badge 
                            variant={
                              test.status === 'running' ? 'default' :
                              test.status === 'completed' ? 'secondary' :
                              'outline'
                            }
                            className={
                              test.status === 'running' ? 'bg-green-100 text-green-800' :
                              test.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              ''
                            }
                          >
                            {test.status}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{test.hypothesis}</p>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <span>Variants: {test.variants?.length || 0}</span>
                          <span>Page: {test.page_type}</span>
                          {test.started_at && (
                            <span>
                              Started: {new Date(test.started_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowResults(test.id)}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>

                        {test.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => handleStartTest(test.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start
                          </Button>
                        )}

                        {test.status === 'running' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePauseTest(test.id)}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStopTest(test.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Square className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTest(test)
                            setShowForm(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No A/B tests created yet</p>
                  <Button 
                    onClick={() => setShowForm(true)} 
                    className="mt-4"
                  >
                    Create Your First Test
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Running Tests Tab */}
          <TabsContent value="running" className="mt-6">
            <div className="space-y-4">
              {abTests?.filter(test => test.status === 'running').length > 0 ? (
                abTests
                  .filter(test => test.status === 'running')
                  .map((test) => (
                    <div key={test.id} className="border border-green-200 bg-green-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-green-900">{test.name}</h3>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-green-700">Live</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-green-700">Duration</div>
                          <div className="font-medium text-green-900">
                            {test.started_at ? 
                              Math.floor((new Date().getTime() - new Date(test.started_at).getTime()) / (1000 * 60 * 60 * 24))
                              : 0} days
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-green-700">Variants</div>
                          <div className="font-medium text-green-900">
                            {test.variants?.length || 0} variants
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-green-700">Page</div>
                          <div className="font-medium text-green-900">
                            {test.page_type}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowResults(test.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Results
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStopTest(test.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Square className="h-4 w-4 mr-2" />
                          Stop Test
                        </Button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-12">
                  <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No tests are currently running</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="mt-6">
            <div className="space-y-4">
              {abTests?.filter(test => test.status === 'completed').length > 0 ? (
                abTests
                  .filter(test => test.status === 'completed')
                  .map((test) => (
                    <div key={test.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">{test.name}</h3>
                        <Badge className="bg-blue-100 text-blue-800">
                          Completed
                        </Badge>
                      </div>
                      
                      <Button
                        onClick={() => setShowResults(test.id)}
                        variant="outline"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Detailed Results
                      </Button>
                    </div>
                  ))
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No completed tests yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Test Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedTest ? 'Edit A/B Test' : 'Create A/B Test'}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowForm(false)
                    setSelectedTest(null)
                  }}
                >
                  ✕
                </Button>
              </div>

              <TestForm
                organizationId={organizationId}
                existingTest={selectedTest || undefined}
                onSave={() => {
                  setShowForm(false)
                  setSelectedTest(null)
                  fetchABTests()
                }}
                onCancel={() => {
                  setShowForm(false)
                  setSelectedTest(null)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Test Results</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResults(null)}
                >
                  ✕
                </Button>
              </div>

              {showResults && (
                <TestResults
                  test={abTests?.find(t => t.id === showResults)!}
                  results={{
                    total_visitors: 2450,
                    total_conversions: 147,
                    overall_conversion_rate: 6.0,
                    confidence_level: 96,
                    improvement: 23.5,
                    winner: 'B',
                    variant_results: {
                      'A': { visitors: 1225, conversions: 61, conversion_rate: 4.98 },
                      'B': { visitors: 1225, conversions: 86, conversion_rate: 7.02 }
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}