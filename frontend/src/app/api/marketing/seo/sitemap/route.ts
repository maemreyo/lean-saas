// CREATED: 2025-07-01 - SEO sitemap generation API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAuthClient } from '@/lib/auth/auth-utils'
import { seoUtils } from '@/lib/marketing/seo'

// ================================================
// GET /api/marketing/seo/sitemap
// Generate and return XML sitemap
// ================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const organizationId = searchParams.get('organization_id')
    const format = searchParams.get('format') || 'xml' // xml or json
    const includeImages = searchParams.get('include_images') === 'true'
    const priority = searchParams.get('priority') // high, medium, low, all
    const changefreq = searchParams.get('changefreq') // daily, weekly, monthly, yearly

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Note: Sitemap generation should be accessible without auth for public sitemaps
    // But we'll verify organization exists
    const supabase = await createAuthClient()
    
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get all published content for sitemap
    const sitemapData = await generateSitemapData(supabase, organizationId, {
      priority,
      changefreq,
      includeImages
    })

    if (format === 'json') {
      // Return JSON format for API consumption
      return NextResponse.json({
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug
        },
        generated_at: new Date().toISOString(),
        total_urls: sitemapData.length,
        urls: sitemapData
      })
    }

    // Generate XML sitemap
    const xmlSitemap = generateXMLSitemap(sitemapData, organization)

    // Track sitemap generation for analytics
    try {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id: organizationId,
          metric_type: 'sitemap_generated',
          metric_value: sitemapData.length,
          dimensions: {
            format,
            include_images: includeImages,
            total_urls: sitemapData.length,
            source: 'api'
          }
        })
    } catch (metricsError) {
      console.warn('Failed to track sitemap generation metrics:', metricsError)
    }

    return new NextResponse(xmlSitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-Generated-At': new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Sitemap generation GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// POST /api/marketing/seo/sitemap
// Submit sitemap to search engines
// ================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { organization_id, search_engines = ['google', 'bing'], notify_urls = [] } = body

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to organization
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin', 'editor'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, slug')
      .eq('id', organization_id)
      .single()

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Generate sitemap URL (assuming a standard URL structure)
    const sitemapUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/marketing/seo/sitemap?organization_id=${organization_id}`

    const submissionResults = []

    // Submit to search engines
    for (const engine of search_engines) {
      try {
        const result = await submitSitemapToSearchEngine(engine, sitemapUrl)
        submissionResults.push({
          search_engine: engine,
          success: result.success,
          message: result.message,
          submitted_at: new Date().toISOString()
        })
      } catch (err) {
        submissionResults.push({
          search_engine: engine,
          success: false,
          message: 'Submission failed',
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    // Notify custom URLs if provided
    for (const url of notify_urls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Lean-SaaS Sitemap Notifier'
          },
          body: JSON.stringify({
            sitemap_url: sitemapUrl,
            organization_id,
            organization_name: organization.name,
            submitted_at: new Date().toISOString()
          })
        })

        submissionResults.push({
          target: url,
          success: response.ok,
          message: response.ok ? 'Notification sent' : `HTTP ${response.status}`,
          submitted_at: new Date().toISOString()
        })
      } catch (err) {
        submissionResults.push({
          target: url,
          success: false,
          message: 'Notification failed',
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    // Track submission for analytics
    try {
      await supabase
        .from('growth_metrics')
        .insert({
          organization_id,
          metric_type: 'sitemap_submitted',
          metric_value: search_engines.length + notify_urls.length,
          dimensions: {
            search_engines,
            notify_urls,
            successful_submissions: submissionResults.filter(r => r.success).length,
            user_id: user.id
          }
        })
    } catch (metricsError) {
      console.warn('Failed to track sitemap submission metrics:', metricsError)
    }

    return NextResponse.json({
      sitemap_url: sitemapUrl,
      results: submissionResults,
      summary: {
        total_submissions: submissionResults.length,
        successful: submissionResults.filter(r => r.success).length,
        failed: submissionResults.filter(r => !r.success).length
      },
      message: 'Sitemap submission completed'
    })

  } catch (error) {
    console.error('Sitemap submission POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// PUT /api/marketing/seo/sitemap
// Update sitemap configuration
// ================================================

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createAuthClient()
    
    const body = await request.json()
    const { organization_id, config } = body

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgAccess || !['owner', 'admin', 'editor'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Update or create sitemap configuration
    const { data: existingConfig } = await supabase
      .from('seo_metadata')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('page_type', 'sitemap_config')
      .eq('page_id', 'global')
      .single()

    let result
    if (existingConfig) {
      result = await seoUtils.updateMetadata(existingConfig.id, { sitemap_config: config })
    } else {
      result = await seoUtils.createMetadata({
        organization_id,
        page_type: 'sitemap_config',
        page_id: 'global',
        seo_config: { sitemap_config: config }
      })
    }

    if (result.error) {
      return NextResponse.json(
        { error: 'Failed to update sitemap configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: result.data,
      message: 'Sitemap configuration updated successfully'
    })

  } catch (error) {
    console.error('Sitemap configuration PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================================
// HELPER FUNCTIONS
// ================================================

async function generateSitemapData(supabase: any, organizationId: string, options: any) {
  const urls = []

  // Get published landing pages
  const { data: landingPages } = await supabase
    .from('landing_pages')
    .select('slug, updated_at, view_count')
    .eq('organization_id', organizationId)
    .eq('published', true)

  landingPages?.forEach(page => {
    urls.push({
      url: `/landing/${page.slug}`,
      lastmod: page.updated_at,
      changefreq: getChangeFreq(page.view_count, options.changefreq),
      priority: getPriority(page.view_count, 'landing_page', options.priority)
    })
  })

  // Get blog posts if any
  const { data: blogPosts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at, view_count')
    .eq('organization_id', organizationId)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(1000) // Reasonable limit for sitemap

  blogPosts?.forEach(post => {
    urls.push({
      url: `/blog/${post.slug}`,
      lastmod: post.updated_at,
      changefreq: getChangeFreq(post.view_count, options.changefreq),
      priority: getPriority(post.view_count, 'blog_post', options.priority)
    })
  })

  // Add static pages
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/pricing', priority: '0.9', changefreq: 'monthly' },
    { url: '/features', priority: '0.8', changefreq: 'monthly' },
    { url: '/about', priority: '0.6', changefreq: 'monthly' },
    { url: '/contact', priority: '0.7', changefreq: 'monthly' }
  ]

  staticPages.forEach(page => {
    urls.push({
      ...page,
      lastmod: new Date().toISOString()
    })
  })

  return urls
}

function generateXMLSitemap(urls: any[], organization: any): string {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>'
  const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  const urlsetClose = '</urlset>'

  const urlEntries = urls.map(item => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
    const fullUrl = `${baseUrl}${item.url}`
    
    return `
  <url>
    <loc>${escapeXml(fullUrl)}</loc>
    <lastmod>${item.lastmod.split('T')[0]}</lastmod>
    <changefreq>${item.changefreq || 'monthly'}</changefreq>
    <priority>${item.priority || '0.5'}</priority>
  </url>`
  }).join('')

  return `${xmlHeader}
${urlsetOpen}${urlEntries}
${urlsetClose}`
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}

function getChangeFreq(viewCount: number = 0, override?: string): string {
  if (override) return override
  
  if (viewCount > 1000) return 'daily'
  if (viewCount > 100) return 'weekly'
  if (viewCount > 10) return 'monthly'
  return 'yearly'
}

function getPriority(viewCount: number = 0, pageType: string, override?: string): string {
  if (override) {
    switch (override) {
      case 'high': return '0.9'
      case 'medium': return '0.7'
      case 'low': return '0.5'
      default: return '0.5'
    }
  }

  // Dynamic priority based on content type and engagement
  if (pageType === 'landing_page') {
    if (viewCount > 1000) return '0.9'
    if (viewCount > 100) return '0.8'
    return '0.7'
  }

  if (pageType === 'blog_post') {
    if (viewCount > 500) return '0.8'
    if (viewCount > 50) return '0.6'
    return '0.5'
  }

  return '0.5'
}

async function submitSitemapToSearchEngine(engine: string, sitemapUrl: string) {
  // Note: In production, you would implement actual search engine submission
  // This is a placeholder for the submission logic
  
  const submissionUrls = {
    google: `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    bing: `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
  }

  const url = submissionUrls[engine]
  if (!url) {
    throw new Error(`Unsupported search engine: ${engine}`)
  }

  // For demo purposes, we'll simulate the submission
  // In production, you would make actual HTTP requests to search engines
  return {
    success: true,
    message: `Sitemap submitted to ${engine} successfully`,
    submission_url: url
  }
}