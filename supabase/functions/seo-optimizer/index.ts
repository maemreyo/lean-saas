// CREATED: 2025-07-01 - SEO optimization and analysis edge function (FINAL EDGE FUNCTION)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ================================================
// TYPES & INTERFACES
// ================================================

interface SEOOptimizationTask {
  type: 'optimize_content' | 'generate_sitemap' | 'analyze_pages' | 'update_meta' | 'check_performance'
  organizationId: string
  data?: Record<string, any>
  priority: 'low' | 'medium' | 'high'
  scheduledAt?: string
}

interface ContentOptimizationData {
  pageId?: string
  pageType: string
  content: string
  targetKeywords?: string[]
  optimizationType: 'title' | 'description' | 'content' | 'keywords' | 'all'
}

interface SitemapGenerationData {
  baseUrl: string
  includeImages?: boolean
  includeVideos?: boolean
  changeFreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

interface PageAnalysisData {
  pageIds?: string[]
  pageTypes?: string[]
  analysisDepth: 'basic' | 'detailed' | 'comprehensive'
}

interface MetaUpdateData {
  pageId: string
  pageType: string
  optimizedMeta: {
    title?: string
    description?: string
    keywords?: string[]
    canonical_url?: string
    open_graph?: Record<string, any>
  }
}

interface SEOAnalysisResult {
  score: number
  issues: string[]
  opportunities: string[]
  recommendations: string[]
  technical_issues: string[]
  content_issues: string[]
}

// ================================================
// SUPABASE CLIENT
// ================================================

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ================================================
// CONTENT OPTIMIZATION
// ================================================

async function processContentOptimization(organizationId: string, data: ContentOptimizationData) {
  console.log(`Optimizing content for page: ${data.pageId}, type: ${data.optimizationType}`)
  
  try {
    // Get existing SEO metadata if available
    let existingMeta = null
    if (data.pageId) {
      const { data: seoData } = await supabase
        .from('seo_metadata')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('page_type', data.pageType)
        .eq('page_id', data.pageId)
        .single()
      
      existingMeta = seoData
    }

    // Analyze content for SEO optimization
    const contentAnalysis = analyzeContent(data.content, data.targetKeywords || [])
    
    // Generate optimized metadata
    const optimizedMeta = generateOptimizedMeta(
      data.content, 
      contentAnalysis, 
      data.targetKeywords || [],
      existingMeta
    )

    // Apply optimizations based on type
    let optimizations = {}
    
    switch (data.optimizationType) {
      case 'title':
        optimizations = { title: optimizedMeta.title }
        break
      case 'description':
        optimizations = { description: optimizedMeta.description }
        break
      case 'keywords':
        optimizations = { keywords: optimizedMeta.keywords }
        break
      case 'content':
        optimizations = { 
          content_suggestions: optimizedMeta.contentSuggestions,
          keyword_density: contentAnalysis.keywordDensity
        }
        break
      case 'all':
        optimizations = optimizedMeta
        break
    }

    // Store optimization results
    const optimizationRecord = {
      organization_id: organizationId,
      page_id: data.pageId,
      page_type: data.pageType,
      optimization_type: data.optimizationType,
      original_content: data.content.substring(0, 1000), // Truncate for storage
      optimizations,
      content_analysis: contentAnalysis,
      target_keywords: data.targetKeywords,
      optimization_score: calculateOptimizationScore(contentAnalysis, optimizedMeta),
      created_at: new Date().toISOString()
    }

    await supabase
      .from('seo_optimizations')
      .insert(optimizationRecord)

    // Update SEO metadata if pageId is provided
    if (data.pageId && data.optimizationType !== 'content') {
      await supabase
        .from('seo_metadata')
        .upsert({
          organization_id: organizationId,
          page_type: data.pageType,
          page_id: data.pageId,
          ...optimizations,
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization_id,page_type,page_id' })
    }

    console.log(`Successfully optimized content for ${data.optimizationType}`)
    return { 
      success: true, 
      data: { 
        pageId: data.pageId,
        optimizationType: data.optimizationType,
        optimizationScore: optimizationRecord.optimization_score,
        optimizations,
        contentAnalysis
      }
    }

  } catch (error) {
    console.error('Content optimization error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// SITEMAP GENERATION
// ================================================

async function processSitemapGeneration(organizationId: string, data: SitemapGenerationData) {
  console.log(`Generating sitemap for org: ${organizationId}`)
  
  try {
    // Get all published pages
    const { data: landingPages, error: pagesError } = await supabase
      .from('landing_pages')
      .select('slug, updated_at, published_at')
      .eq('organization_id', organizationId)
      .eq('published', true)

    if (pagesError) {
      return { success: false, error: pagesError.message }
    }

    // Get SEO metadata for priority and change frequency
    const { data: seoData, error: seoError } = await supabase
      .from('seo_metadata')
      .select('page_id, page_type, canonical_url')
      .eq('organization_id', organizationId)

    if (seoError) {
      console.warn('Could not fetch SEO data:', seoError.message)
    }

    // Build sitemap entries
    const sitemapEntries = []
    
    // Add landing pages
    landingPages?.forEach(page => {
      const url = `${data.baseUrl}/${page.slug}`
      const lastmod = page.updated_at || page.published_at
      const seoInfo = seoData?.find(seo => seo.page_id === page.slug && seo.page_type === 'landing_page')
      
      sitemapEntries.push({
        url: seoInfo?.canonical_url || url,
        lastmod: lastmod.split('T')[0], // ISO date format
        changefreq: data.changeFreq || 'weekly',
        priority: data.priority || 0.8
      })
    })

    // Add static pages
    const staticPages = [
      { path: '', priority: 1.0, changefreq: 'daily' },
      { path: 'pricing', priority: 0.9, changefreq: 'weekly' },
      { path: 'about', priority: 0.6, changefreq: 'monthly' },
      { path: 'contact', priority: 0.7, changefreq: 'monthly' },
      { path: 'blog', priority: 0.8, changefreq: 'daily' },
    ]

    staticPages.forEach(page => {
      sitemapEntries.push({
        url: `${data.baseUrl}/${page.path}`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: page.changefreq,
        priority: page.priority
      })
    })

    // Generate XML sitemap
    const xmlSitemap = generateSitemapXML(sitemapEntries, data.includeImages, data.includeVideos)

    // Store sitemap data
    await supabase
      .from('sitemaps')
      .upsert({
        organization_id: organizationId,
        sitemap_data: xmlSitemap,
        entry_count: sitemapEntries.length,
        base_url: data.baseUrl,
        last_generated: new Date().toISOString(),
        entries: sitemapEntries
      }, { onConflict: 'organization_id' })

    console.log(`Successfully generated sitemap with ${sitemapEntries.length} entries`)
    return { 
      success: true, 
      data: { 
        entryCount: sitemapEntries.length,
        sitemapSize: xmlSitemap.length,
        baseUrl: data.baseUrl,
        entries: sitemapEntries
      }
    }

  } catch (error) {
    console.error('Sitemap generation error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// PAGE ANALYSIS
// ================================================

async function processPageAnalysis(organizationId: string, data: PageAnalysisData) {
  console.log(`Analyzing pages for org: ${organizationId}, depth: ${data.analysisDepth}`)
  
  try {
    // Get pages to analyze
    let query = supabase
      .from('seo_metadata')
      .select('*')
      .eq('organization_id', organizationId)

    if (data.pageIds && data.pageIds.length > 0) {
      query = query.in('page_id', data.pageIds)
    }

    if (data.pageTypes && data.pageTypes.length > 0) {
      query = query.in('page_type', data.pageTypes)
    }

    const { data: pages, error: pagesError } = await query

    if (pagesError) {
      return { success: false, error: pagesError.message }
    }

    // Analyze each page
    const analysisResults = []
    
    for (const page of pages || []) {
      const analysis = await analyzePage(page, data.analysisDepth)
      analysisResults.push({
        page_id: page.page_id,
        page_type: page.page_type,
        analysis,
        analyzed_at: new Date().toISOString()
      })
    }

    // Store analysis results
    await supabase
      .from('seo_page_analyses')
      .upsert(
        analysisResults.map(result => ({
          organization_id: organizationId,
          page_id: result.page_id,
          page_type: result.page_type,
          analysis_depth: data.analysisDepth,
          seo_score: result.analysis.score,
          issues: result.analysis.issues,
          opportunities: result.analysis.opportunities,
          recommendations: result.analysis.recommendations,
          technical_issues: result.analysis.technical_issues,
          content_issues: result.analysis.content_issues,
          analyzed_at: result.analyzed_at
        })),
        { onConflict: 'organization_id,page_id,page_type' }
      )

    // Generate summary report
    const summary = generateAnalysisSummary(analysisResults)

    console.log(`Successfully analyzed ${analysisResults.length} pages`)
    return { 
      success: true, 
      data: { 
        pagesAnalyzed: analysisResults.length,
        analysisDepth: data.analysisDepth,
        summary,
        results: analysisResults
      }
    }

  } catch (error) {
    console.error('Page analysis error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// META UPDATE
// ================================================

async function processMetaUpdate(organizationId: string, data: MetaUpdateData) {
  console.log(`Updating meta for page: ${data.pageId}`)
  
  try {
    // Validate meta data
    const validationResult = validateMetaData(data.optimizedMeta)
    if (!validationResult.valid) {
      return { success: false, error: `Invalid meta data: ${validationResult.errors.join(', ')}` }
    }

    // Update SEO metadata
    const { error: updateError } = await supabase
      .from('seo_metadata')
      .upsert({
        organization_id: organizationId,
        page_type: data.pageType,
        page_id: data.pageId,
        ...data.optimizedMeta,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id,page_type,page_id' })

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Log the update
    await supabase
      .from('seo_update_logs')
      .insert({
        organization_id: organizationId,
        page_id: data.pageId,
        page_type: data.pageType,
        update_type: 'meta_optimization',
        changes: data.optimizedMeta,
        updated_at: new Date().toISOString()
      })

    console.log(`Successfully updated meta for page: ${data.pageId}`)
    return { 
      success: true, 
      data: { 
        pageId: data.pageId,
        pageType: data.pageType,
        updatedFields: Object.keys(data.optimizedMeta)
      }
    }

  } catch (error) {
    console.error('Meta update error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// PERFORMANCE CHECK
// ================================================

async function processPerformanceCheck(organizationId: string) {
  console.log(`Checking SEO performance for org: ${organizationId}`)
  
  try {
    // Get all SEO metadata
    const { data: seoPages, error: seoError } = await supabase
      .from('seo_metadata')
      .select('*')
      .eq('organization_id', organizationId)

    if (seoError) {
      return { success: false, error: seoError.message }
    }

    // Get recent page analyses
    const { data: analyses, error: analysesError } = await supabase
      .from('seo_page_analyses')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('analyzed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days

    if (analysesError) {
      console.warn('Could not fetch recent analyses:', analysesError.message)
    }

    // Calculate overall performance metrics
    const performance = {
      total_pages: seoPages?.length || 0,
      pages_with_titles: seoPages?.filter(p => p.title).length || 0,
      pages_with_descriptions: seoPages?.filter(p => p.description).length || 0,
      pages_with_keywords: seoPages?.filter(p => p.keywords && p.keywords.length > 0).length || 0,
      pages_with_canonical: seoPages?.filter(p => p.canonical_url).length || 0,
      pages_with_og: seoPages?.filter(p => p.open_graph?.title && p.open_graph?.description).length || 0,
      avg_seo_score: 0,
      critical_issues: 0,
      opportunities: 0
    }

    // Calculate completion rates
    const totalPages = performance.total_pages
    if (totalPages > 0) {
      performance.title_completion_rate = performance.pages_with_titles / totalPages
      performance.description_completion_rate = performance.pages_with_descriptions / totalPages
      performance.keywords_completion_rate = performance.pages_with_keywords / totalPages
      performance.canonical_completion_rate = performance.pages_with_canonical / totalPages
      performance.og_completion_rate = performance.pages_with_og / totalPages
      performance.overall_completion_rate = (
        performance.title_completion_rate +
        performance.description_completion_rate +
        performance.keywords_completion_rate
      ) / 3
    }

    // Calculate SEO scores from analyses
    if (analyses && analyses.length > 0) {
      performance.avg_seo_score = analyses.reduce((sum, a) => sum + a.seo_score, 0) / analyses.length
      performance.critical_issues = analyses.filter(a => a.seo_score < 50).length
      performance.opportunities = analyses.reduce((sum, a) => sum + (a.opportunities?.length || 0), 0)
    }

    // Identify top issues and opportunities
    const topIssues = identifyTopSEOIssues(seoPages || [], analyses || [])
    const topOpportunities = identifyTopSEOOpportunities(seoPages || [], analyses || [])

    // Generate performance insights
    const insights = generatePerformanceInsights(performance, topIssues, topOpportunities)

    // Store performance data
    await supabase
      .from('seo_performance_reports')
      .insert({
        organization_id: organizationId,
        performance_metrics: performance,
        top_issues: topIssues,
        top_opportunities: topOpportunities,
        insights,
        report_date: new Date().toISOString()
      })

    console.log(`Successfully completed performance check for ${totalPages} pages`)
    return { 
      success: true, 
      data: { 
        performance,
        topIssues,
        topOpportunities,
        insights,
        summary: {
          totalPages,
          avgScore: Math.round(performance.avg_seo_score),
          completionRate: Math.round(performance.overall_completion_rate * 100),
          criticalIssues: performance.critical_issues
        }
      }
    }

  } catch (error) {
    console.error('Performance check error:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

function analyzeContent(content: string, targetKeywords: string[]) {
  const wordCount = content.split(/\s+/).length
  const sentences = content.split(/[.!?]+/).length
  const avgWordsPerSentence = wordCount / sentences
  
  // Keyword density analysis
  const keywordDensity = {}
  targetKeywords.forEach(keyword => {
    const regex = new RegExp(keyword.toLowerCase(), 'gi')
    const matches = content.toLowerCase().match(regex) || []
    keywordDensity[keyword] = {
      count: matches.length,
      density: wordCount > 0 ? (matches.length / wordCount) * 100 : 0
    }
  })

  // Readability analysis (simplified)
  const readabilityScore = calculateReadabilityScore(wordCount, sentences, avgWordsPerSentence)

  return {
    wordCount,
    sentences,
    avgWordsPerSentence,
    keywordDensity,
    readabilityScore,
    contentStructure: analyzeContentStructure(content)
  }
}

function generateOptimizedMeta(content: string, analysis: any, keywords: string[], existingMeta: any) {
  // Generate optimized title
  const title = generateOptimizedTitle(content, keywords, existingMeta?.title)
  
  // Generate optimized description
  const description = generateOptimizedDescription(content, keywords, existingMeta?.description)
  
  // Optimize keywords
  const optimizedKeywords = optimizeKeywords(content, keywords, analysis.keywordDensity)
  
  // Content suggestions
  const contentSuggestions = generateContentSuggestions(analysis, keywords)

  return {
    title,
    description,
    keywords: optimizedKeywords,
    contentSuggestions,
    open_graph: {
      title: title,
      description: description,
      type: 'article'
    }
  }
}

function generateSitemapXML(entries: any[], includeImages: boolean = false, includeVideos: boolean = false) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
  
  if (includeImages) {
    xml += ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
  }
  
  if (includeVideos) {
    xml += ' xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"'
  }
  
  xml += '>\n'

  entries.forEach(entry => {
    xml += '  <url>\n'
    xml += `    <loc>${entry.url}</loc>\n`
    xml += `    <lastmod>${entry.lastmod}</lastmod>\n`
    xml += `    <changefreq>${entry.changefreq}</changefreq>\n`
    xml += `    <priority>${entry.priority}</priority>\n`
    xml += '  </url>\n'
  })

  xml += '</urlset>'
  return xml
}

async function analyzePage(page: any, depth: string): Promise<SEOAnalysisResult> {
  const analysis: SEOAnalysisResult = {
    score: 0,
    issues: [],
    opportunities: [],
    recommendations: [],
    technical_issues: [],
    content_issues: []
  }

  let score = 0

  // Title analysis
  if (!page.title) {
    analysis.issues.push('Missing title tag')
    analysis.recommendations.push('Add a descriptive title tag (30-60 characters)')
  } else if (page.title.length < 30 || page.title.length > 60) {
    analysis.issues.push('Title length not optimal')
    analysis.recommendations.push('Optimize title length to 30-60 characters')
    score += 15
  } else {
    score += 25
  }

  // Description analysis
  if (!page.description) {
    analysis.issues.push('Missing meta description')
    analysis.recommendations.push('Add meta description (120-160 characters)')
  } else if (page.description.length < 120 || page.description.length > 160) {
    analysis.issues.push('Description length not optimal')
    analysis.recommendations.push('Optimize description length to 120-160 characters')
    score += 15
  } else {
    score += 25
  }

  // Keywords analysis
  if (!page.keywords || page.keywords.length === 0) {
    analysis.content_issues.push('No keywords defined')
    analysis.recommendations.push('Research and add relevant keywords')
  } else if (page.keywords.length > 10) {
    analysis.content_issues.push('Too many keywords (keyword stuffing risk)')
    analysis.recommendations.push('Focus on 3-5 primary keywords')
    score += 10
  } else {
    score += 20
  }

  // Technical SEO checks
  if (page.canonical_url) {
    score += 15
  } else {
    analysis.technical_issues.push('Missing canonical URL')
    analysis.opportunities.push('Add canonical URL to prevent duplicate content issues')
  }

  if (page.open_graph?.title && page.open_graph?.description) {
    score += 15
  } else {
    analysis.opportunities.push('Add Open Graph tags for better social media sharing')
  }

  // Detailed analysis for comprehensive depth
  if (depth === 'comprehensive') {
    // Additional checks for comprehensive analysis
    if (!page.open_graph?.image) {
      analysis.opportunities.push('Add Open Graph image for social media')
    }
    
    if (!page.schema_markup) {
      analysis.opportunities.push('Add structured data (Schema.org) markup')
    }
    
    score += 5 // Bonus for comprehensive analysis
  }

  analysis.score = Math.min(100, score)
  return analysis
}

function calculateOptimizationScore(analysis: any, optimizedMeta: any): number {
  let score = 0
  
  // Content quality score
  if (analysis.wordCount > 300) score += 20
  if (analysis.readabilityScore > 60) score += 15
  
  // Keyword optimization score
  const avgKeywordDensity = Object.values(analysis.keywordDensity)
    .reduce((sum: number, kw: any) => sum + kw.density, 0) / Object.keys(analysis.keywordDensity).length
  
  if (avgKeywordDensity >= 1 && avgKeywordDensity <= 3) score += 25
  
  // Meta optimization score
  if (optimizedMeta.title && optimizedMeta.title.length >= 30 && optimizedMeta.title.length <= 60) score += 20
  if (optimizedMeta.description && optimizedMeta.description.length >= 120 && optimizedMeta.description.length <= 160) score += 20
  
  return Math.min(100, score)
}

function validateMetaData(meta: any) {
  const errors = []
  
  if (meta.title && (meta.title.length < 10 || meta.title.length > 70)) {
    errors.push('Title should be 10-70 characters')
  }
  
  if (meta.description && (meta.description.length < 50 || meta.description.length > 170)) {
    errors.push('Description should be 50-170 characters')
  }
  
  if (meta.keywords && meta.keywords.length > 15) {
    errors.push('Too many keywords (max 15 recommended)')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

function generateAnalysisSummary(results: any[]) {
  const totalPages = results.length
  const avgScore = results.reduce((sum, r) => sum + r.analysis.score, 0) / totalPages
  const criticalIssues = results.filter(r => r.analysis.score < 50).length
  const totalIssues = results.reduce((sum, r) => sum + r.analysis.issues.length, 0)
  const totalOpportunities = results.reduce((sum, r) => sum + r.analysis.opportunities.length, 0)

  return {
    totalPages,
    avgScore: Math.round(avgScore),
    criticalIssues,
    totalIssues,
    totalOpportunities,
    healthStatus: avgScore >= 80 ? 'excellent' : avgScore >= 60 ? 'good' : avgScore >= 40 ? 'fair' : 'poor'
  }
}

function identifyTopSEOIssues(pages: any[], analyses: any[]) {
  const issues = {}
  
  // Count common issues
  pages.forEach(page => {
    if (!page.title) issues['missing_title'] = (issues['missing_title'] || 0) + 1
    if (!page.description) issues['missing_description'] = (issues['missing_description'] || 0) + 1
    if (!page.keywords || page.keywords.length === 0) issues['missing_keywords'] = (issues['missing_keywords'] || 0) + 1
    if (page.title && (page.title.length < 30 || page.title.length > 60)) issues['poor_title_length'] = (issues['poor_title_length'] || 0) + 1
  })

  // Convert to sorted array
  return Object.entries(issues)
    .map(([issue, count]) => ({ issue, count, percentage: (count / pages.length) * 100 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function identifyTopSEOOpportunities(pages: any[], analyses: any[]) {
  const opportunities = {}
  
  pages.forEach(page => {
    if (!page.canonical_url) opportunities['add_canonical_urls'] = (opportunities['add_canonical_urls'] || 0) + 1
    if (!page.open_graph?.title) opportunities['add_open_graph'] = (opportunities['add_open_graph'] || 0) + 1
    if (!page.schema_markup) opportunities['add_structured_data'] = (opportunities['add_structured_data'] || 0) + 1
  })

  return Object.entries(opportunities)
    .map(([opportunity, count]) => ({ opportunity, count, percentage: (count / pages.length) * 100 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function generatePerformanceInsights(performance: any, issues: any[], opportunities: any[]) {
  const insights = []
  
  if (performance.overall_completion_rate < 0.7) {
    insights.push({
      type: 'warning',
      title: 'Low SEO Completion Rate',
      message: `Only ${Math.round(performance.overall_completion_rate * 100)}% of pages have basic SEO elements`,
      priority: 'high'
    })
  }
  
  if (performance.avg_seo_score < 60) {
    insights.push({
      type: 'critical',
      title: 'Poor Average SEO Score',
      message: `Average SEO score is ${Math.round(performance.avg_seo_score)}/100`,
      priority: 'critical'
    })
  }
  
  if (issues.length > 0) {
    insights.push({
      type: 'actionable',
      title: 'Top Priority Issue',
      message: `${issues[0].issue.replace(/_/g, ' ')} affects ${issues[0].count} pages`,
      priority: 'high'
    })
  }
  
  return insights
}

// Helper functions for content optimization
function generateOptimizedTitle(content: string, keywords: string[], existingTitle?: string): string {
  if (existingTitle && existingTitle.length >= 30 && existingTitle.length <= 60) {
    return existingTitle
  }
  
  const firstSentence = content.split(/[.!?]/)[0]
  const primaryKeyword = keywords[0] || 'Page'
  
  let title = firstSentence.length <= 60 ? firstSentence : `${primaryKeyword} - ${firstSentence.substring(0, 40)}...`
  
  if (title.length > 60) {
    title = title.substring(0, 57) + '...'
  }
  
  return title
}

function generateOptimizedDescription(content: string, keywords: string[], existingDescription?: string): string {
  if (existingDescription && existingDescription.length >= 120 && existingDescription.length <= 160) {
    return existingDescription
  }
  
  const firstParagraph = content.split('\n')[0]
  let description = firstParagraph.length <= 160 ? firstParagraph : firstParagraph.substring(0, 157) + '...'
  
  // Try to include primary keyword
  if (keywords[0] && !description.toLowerCase().includes(keywords[0].toLowerCase())) {
    description = `${keywords[0]} - ${description.substring(0, 160 - keywords[0].length - 3)}...`
  }
  
  return description
}

function optimizeKeywords(content: string, targetKeywords: string[], densityAnalysis: any): string[] {
  const optimized = [...targetKeywords]
  
  // Filter out over-optimized keywords
  return optimized.filter(keyword => {
    const density = densityAnalysis[keyword]?.density || 0
    return density <= 3 // Remove keywords with >3% density
  }).slice(0, 10) // Limit to 10 keywords
}

function generateContentSuggestions(analysis: any, keywords: string[]): string[] {
  const suggestions = []
  
  if (analysis.wordCount < 300) {
    suggestions.push('Increase content length to at least 300 words for better SEO')
  }
  
  if (analysis.readabilityScore < 60) {
    suggestions.push('Improve content readability by using shorter sentences and simpler words')
  }
  
  const lowDensityKeywords = Object.entries(analysis.keywordDensity)
    .filter(([_, data]: [string, any]) => data.density < 1)
    .map(([keyword, _]) => keyword)
  
  if (lowDensityKeywords.length > 0) {
    suggestions.push(`Increase keyword density for: ${lowDensityKeywords.join(', ')}`)
  }
  
  return suggestions
}

function calculateReadabilityScore(wordCount: number, sentences: number, avgWordsPerSentence: number): number {
  // Simplified readability score (Flesch-like)
  const avgSentenceLength = avgWordsPerSentence
  const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * (2 / wordCount)) // Simplified
  return Math.max(0, Math.min(100, score))
}

function analyzeContentStructure(content: string) {
  const headingMatches = content.match(/#{1,6}\s+.+/g) || []
  const listMatches = content.match(/^[\s]*[-*+]\s+.+/gm) || []
  const linkMatches = content.match(/\[.+\]\(.+\)/g) || []
  
  return {
    headings: headingMatches.length,
    lists: listMatches.length,
    links: linkMatches.length,
    paragraphs: content.split('\n\n').length
  }
}

// ================================================
// MAIN HANDLER
// ================================================

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { task }: { task: SEOOptimizationTask } = await req.json()

    console.log(`Processing SEO optimization task: ${task.type} for org: ${task.organizationId}`)

    let result
    switch (task.type) {
      case 'optimize_content':
        result = await processContentOptimization(task.organizationId, task.data as ContentOptimizationData)
        break
      case 'generate_sitemap':
        result = await processSitemapGeneration(task.organizationId, task.data as SitemapGenerationData)
        break
      case 'analyze_pages':
        result = await processPageAnalysis(task.organizationId, task.data as PageAnalysisData)
        break
      case 'update_meta':
        result = await processMetaUpdate(task.organizationId, task.data as MetaUpdateData)
        break
      case 'check_performance':
        result = await processPerformanceCheck(task.organizationId)
        break
      default:
        return new Response(
          JSON.stringify({ error: `Unknown task type: ${task.type}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('SEO optimization error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})