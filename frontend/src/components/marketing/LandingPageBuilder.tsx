// CREATED: 2025-07-01 - Landing page builder component for marketing module

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useLandingPages } from '@/hooks/marketing/useLandingPages'
import { useABTesting } from '@/hooks/marketing/useABTesting'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { 
  Save, 
  Eye, 
  Globe, 
  Settings, 
  Palette, 
  Layout, 
  Plus,
  Trash2,
  Copy,
  BarChart3,
  TestTube,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { 
  LandingPage, 
  LandingPageConfig,
  LandingPageComponent 
} from '@/shared/types/marketing'

// ================================================
// TYPES & INTERFACES
// ================================================

interface LandingPageBuilderProps {
  organizationId: string
  landingPageId?: string
  onSave?: (landingPage: LandingPage) => void
  onPublish?: (landingPage: LandingPage) => void
  onPreview?: (landingPage: LandingPage) => void
  className?: string
}

interface ComponentTemplateProps {
  type: 'hero' | 'pricing' | 'testimonials' | 'cta' | 'features'
  name: string
  description: string
  preview: string
  onAdd: (type: string) => void
}

interface LandingPagePreviewProps {
  config: LandingPageConfig | null
  viewMode: 'desktop' | 'tablet' | 'mobile'
  className?: string
}

// ================================================
// COMPONENT TEMPLATES
// ================================================

const COMPONENT_TEMPLATES = [
  {
    type: 'hero' as const,
    name: 'Hero Section',
    description: 'Eye-catching headline with CTA button',
    preview: '🎯'
  },
  {
    type: 'pricing' as const,
    name: 'Pricing Table',
    description: 'Plans and pricing comparison',
    preview: '💰'
  },
  {
    type: 'testimonials' as const,
    name: 'Social Proof',
    description: 'Customer testimonials and reviews',
    preview: '⭐'
  },
  {
    type: 'features' as const,
    name: 'Features Grid',
    description: 'Product features showcase',
    preview: '⚡'
  },
  {
    type: 'cta' as const,
    name: 'Call to Action',
    description: 'Conversion-focused section',
    preview: '🚀'
  }
]

// ================================================
// COMPONENT TEMPLATE ITEM
// ================================================

function ComponentTemplate({ type, name, description, preview, onAdd }: ComponentTemplateProps) {
  return (
    <div 
      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onAdd(type)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xl">{preview}</div>
        <Plus className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
      </div>
      <h3 className="font-medium text-gray-900 mb-1">{name}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}

// ================================================
// LANDING PAGE PREVIEW
// ================================================

function LandingPagePreview({ config, viewMode, className }: LandingPagePreviewProps) {
  const getViewportClass = () => {
    switch (viewMode) {
      case 'mobile':
        return 'max-w-sm mx-auto'
      case 'tablet':
        return 'max-w-2xl mx-auto'
      default:
        return 'w-full'
    }
  }

  if (!config) {
    return (
      <div className={cn(
        "flex items-center justify-center h-96 bg-gray-50 border border-gray-200 rounded-lg",
        className
      )}>
        <div className="text-center">
          <Layout className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Add components to preview your landing page</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("bg-white border border-gray-200 rounded-lg overflow-hidden", className)}>
      <div className={cn("transition-all duration-300", getViewportClass())}>
        {/* SEO Meta Preview */}
        {config.seoMeta && (
          <div className="bg-blue-50 border-b border-blue-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">SEO Preview</span>
            </div>
            <div className="space-y-1">
              <div className="text-blue-900 font-medium truncate">{config.seoMeta.title}</div>
              <div className="text-blue-700 text-sm truncate">{config.seoMeta.description}</div>
              <div className="text-blue-600 text-sm">/{config.slug}</div>
            </div>
          </div>
        )}

        {/* Components Preview */}
        <div className="p-6 space-y-8">
          {config.components?.length > 0 ? (
            config.components
              .sort((a, b) => a.order - b.order)
              .map((component, index) => (
                <div 
                  key={`${component.type}-${index}`}
                  className="border border-dashed border-gray-300 rounded-lg p-6 bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {COMPONENT_TEMPLATES.find(t => t.type === component.type)?.preview}
                      </span>
                      <span className="font-medium capitalize">{component.type} Section</span>
                    </div>
                    <Badge variant="secondary">{component.order}</Badge>
                  </div>
                  
                  {/* Component Content Preview */}
                  <div className="space-y-2 text-sm text-gray-600">
                    {component.type === 'hero' && (
                      <div>
                        <div className="font-bold text-2xl text-gray-900 mb-2">Your Amazing Product</div>
                        <div className="text-gray-600 mb-4">Transform your business with our solution</div>
                        <Button>Get Started Free</Button>
                      </div>
                    )}
                    
                    {component.type === 'pricing' && (
                      <div className="grid grid-cols-3 gap-4">
                        {['Basic', 'Pro', 'Enterprise'].map(plan => (
                          <div key={plan} className="border rounded p-3 text-center">
                            <div className="font-medium">{plan}</div>
                            <div className="text-lg font-bold">${plan === 'Basic' ? '9' : plan === 'Pro' ? '29' : '99'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {component.type === 'testimonials' && (
                      <div className="grid grid-cols-2 gap-4">
                        {[1, 2].map(i => (
                          <div key={i} className="border rounded p-3">
                            <div className="text-yellow-400 mb-1">⭐⭐⭐⭐⭐</div>
                            <div className="text-sm">"Great product!"</div>
                            <div className="text-xs text-gray-500 mt-1">- Customer {i}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {component.type === 'features' && (
                      <div className="grid grid-cols-2 gap-4">
                        {['Fast', 'Secure', 'Scalable', 'Easy'].map(feature => (
                          <div key={feature} className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {component.type === 'cta' && (
                      <div className="text-center bg-blue-50 p-4 rounded">
                        <div className="font-bold mb-2">Ready to get started?</div>
                        <Button>Start Your Free Trial</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No components added yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ================================================
// MAIN COMPONENT
// ================================================

export function LandingPageBuilder({ 
  organizationId, 
  landingPageId,
  onSave,
  onPublish,
  onPreview,
  className 
}: LandingPageBuilderProps) {
  // Hooks
  const { 
    landingPages, 
    createLandingPage, 
    updateLandingPage,
    publishLandingPage,
    loading,
    error 
  } = useLandingPages(organizationId)
  
  const { abTests, createABTest } = useABTests(organizationId)

  // State
  const [currentPage, setCurrentPage] = useState<LandingPage | null>(null)
  const [activeTab, setActiveTab] = useState('builder')
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [unsavedChanges, setUnsavedChanges] = useState(false)

  // Load existing landing page
  useEffect(() => {
    if (landingPageId && landingPages.length > 0) {
      const page = landingPages.find(p => p.id === landingPageId)
      if (page) {
        setCurrentPage(page)
      }
    }
  }, [landingPageId, landingPages])

  // Add component to landing page
  const addComponent = useCallback((type: string) => {
    if (!currentPage) return

    const newComponent: LandingPageComponent = {
      type: type as any,
      props: {},
      order: (currentPage.config?.components?.length || 0) + 1,
      visible: true
    }

    const updatedConfig = {
      ...currentPage.config,
      components: [...(currentPage.config?.components || []), newComponent]
    }

    setCurrentPage(prev => prev ? {
      ...prev,
      config: updatedConfig
    } : null)
    
    setUnsavedChanges(true)
  }, [currentPage])

  // Remove component
  const removeComponent = useCallback((index: number) => {
    if (!currentPage?.config?.components) return

    const updatedComponents = currentPage.config.components.filter((_, i) => i !== index)
    const updatedConfig = {
      ...currentPage.config,
      components: updatedComponents
    }

    setCurrentPage(prev => prev ? {
      ...prev,
      config: updatedConfig
    } : null)
    
    setUnsavedChanges(true)
  }, [currentPage])

  // Save landing page
  const handleSave = useCallback(async () => {
    if (!currentPage) return

    try {
      if (landingPageId) {
        await updateLandingPage(landingPageId, {
          title: currentPage.title,
          description: currentPage.description,
          config: currentPage.config,
          seo_meta: currentPage.seo_meta
        })
      } else {
        await createLandingPage({
          organization_id: organizationId,
          title: currentPage.title || 'Untitled Page',
          slug: currentPage.slug || 'untitled',
          description: currentPage.description,
          config: currentPage.config || { components: [] },
          seo_meta: currentPage.seo_meta
        })
      }
      
      setUnsavedChanges(false)
      onSave?.(currentPage)
    } catch (err) {
      console.error('Failed to save landing page:', err)
    }
  }, [currentPage, landingPageId, organizationId, updateLandingPage, createLandingPage, onSave])

  // Publish landing page
  const handlePublish = useCallback(async () => {
    if (!currentPage || !landingPageId) return

    try {
      await publishLandingPage(landingPageId)
      onPublish?.(currentPage)
    } catch (err) {
      console.error('Failed to publish landing page:', err)
    }
  }, [currentPage, landingPageId, publishLandingPage, onPublish])

  // Create A/B test
  const handleCreateABTest = useCallback(async () => {
    if (!currentPage || !landingPageId) return

    try {
      await createABTest({
        organization_id: organizationId,
        name: `${currentPage.title} A/B Test`,
        hypothesis: 'Testing new landing page variant',
        page_id: landingPageId,
        page_type: 'landing_page',
        variants: [
          { id: 'A', name: 'Control', traffic_percentage: 50 },
          { id: 'B', name: 'Variant', traffic_percentage: 50 }
        ],
        traffic_split: { A: 50, B: 50 }
      })
    } catch (err) {
      console.error('Failed to create A/B test:', err)
    }
  }, [currentPage, landingPageId, organizationId, createABTest])

  // Initialize new page if none exists
  useEffect(() => {
    if (!landingPageId && !currentPage) {
      setCurrentPage({
        id: '',
        organization_id: organizationId,
        title: 'New Landing Page',
        slug: 'new-page',
        description: '',
        config: { components: [] },
        published: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as LandingPage)
    }
  }, [landingPageId, currentPage, organizationId])

  if (loading && !currentPage) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading landing page builder...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800">
          <span className="font-medium">Error loading landing page builder:</span>
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
            <h1 className="text-2xl font-bold text-gray-900">Landing Page Builder</h1>
            <p className="text-gray-600 mt-1">
              {currentPage?.title || 'Create high-converting landing pages'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-200 rounded-lg">
              {[
                { mode: 'desktop' as const, icon: Monitor },
                { mode: 'tablet' as const, icon: Tablet },
                { mode: 'mobile' as const, icon: Smartphone }
              ].map(({ mode, icon: Icon }) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className="rounded-none first:rounded-l-lg last:rounded-r-lg"
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onPreview?.(currentPage!)}
                disabled={!currentPage}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={!currentPage || !unsavedChanges || loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save'}
              </Button>
              
              {currentPage?.published ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <Globe className="h-3 w-3 mr-1" />
                  Published
                </Badge>
              ) : (
                <Button
                  onClick={handlePublish}
                  disabled={!currentPage || !landingPageId || loading}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="builder">
              <Layout className="h-4 w-4 mr-2" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="design">
              <Palette className="h-4 w-4 mr-2" />
              Design
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Builder Tab */}
          <TabsContent value="builder" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Components Sidebar */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Add Components</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {COMPONENT_TEMPLATES.map((template) => (
                      <ComponentTemplate
                        key={template.type}
                        {...template}
                        onAdd={addComponent}
                      />
                    ))}
                  </div>
                </div>

                {/* A/B Testing */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">A/B Testing</h3>
                  <Button
                    variant="outline"
                    onClick={handleCreateABTest}
                    disabled={!currentPage || !landingPageId}
                    className="w-full"
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Create A/B Test
                  </Button>
                </div>
              </div>

              {/* Preview Area */}
              <div className="lg:col-span-2">
                <LandingPagePreview
                  config={currentPage?.config || null}
                  viewMode={viewMode}
                  className="min-h-[600px]"
                />
              </div>
            </div>
          </TabsContent>

          {/* Design Tab */}
          <TabsContent value="design" className="mt-6">
            <div className="text-center py-12">
              <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Design customization tools coming soon...</p>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Page settings panel coming soon...</p>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Analytics dashboard coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Unsaved Changes Warning */}
      {unsavedChanges && (
        <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <span className="font-medium">Unsaved changes</span>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              Save Now
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}