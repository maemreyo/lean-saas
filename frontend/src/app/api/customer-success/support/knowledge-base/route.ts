import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { customerSuccessSchemas } from '@/shared/schemas/customer-success'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const featured = searchParams.get('featured')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const includeDrafts = searchParams.get('include_drafts')

    const user = await getUser()
    // Knowledge base can be accessed without authentication for public articles
    
    const supabase = createClient()

    // Build query for knowledge base articles
    let query = supabase
      .from('knowledge_base')
      .select('*')

    // Apply filters
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (category) {
      query = query.eq('category', category)
    }

    // Default to published articles unless user requests drafts
    if (status) {
      query = query.eq('status', status)
    } else if (includeDrafts !== 'true') {
      query = query.eq('status', 'published')
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true)
    }

    // Apply pagination
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    if (offset) {
      query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit || '50') - 1)
    }

    // Order by featured first, then by view count, then by date
    query = query.order('is_featured', { ascending: false })
             .order('view_count', { ascending: false })
             .order('updated_at', { ascending: false })

    const { data: articles, error, count } = await query

    if (error) {
      console.error('Error fetching knowledge base articles:', error)
      return NextResponse.json(
        { error: 'Failed to fetch knowledge base articles' }, 
        { status: 500 }
      )
    }

    // Get categories and statistics
    const metadata = await getKnowledgeBaseMetadata(organizationId, supabase)

    return NextResponse.json({
      success: true,
      data: articles,
      count: count || articles?.length || 0,
      metadata
    })

  } catch (error) {
    console.error('Knowledge base API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request body
    const validation = customerSuccessSchemas.createKnowledgeBase.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors
        }, 
        { status: 400 }
      )
    }

    const articleData = validation.data
    const supabase = createClient()

    // Create knowledge base article
    const newArticleData = {
      ...articleData,
      author_id: user.id,
      status: articleData.status || 'draft',
      view_count: 0,
      helpful_count: 0,
      not_helpful_count: 0,
      is_featured: articleData.is_featured || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: newArticle, error } = await supabase
      .from('knowledge_base')
      .insert([newArticleData])
      .select()
      .single()

    if (error) {
      console.error('Error creating knowledge base article:', error)
      return NextResponse.json(
        { error: 'Failed to create knowledge base article' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newArticle,
      message: 'Knowledge base article created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Knowledge base article creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { article_id, action, ...updateData } = body

    if (!article_id) {
      return NextResponse.json(
        { error: 'Article ID is required' }, 
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Handle different actions
    if (action === 'view') {
      // Increment view count
      const { data: updatedArticle, error } = await supabase
        .from('knowledge_base')
        .update({
          view_count: supabase.raw('view_count + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('id', article_id)
        .select()
        .single()

      if (error) {
        console.error('Error updating view count:', error)
        return NextResponse.json(
          { error: 'Failed to update view count' }, 
          { status: 500 }
        )
      }

      // Log view event if user is authenticated
      if (user) {
        await logArticleViewEvent(user.id, updatedArticle, supabase)
      }

      return NextResponse.json({
        success: true,
        data: updatedArticle,
        message: 'View recorded successfully'
      })
    }

    if (action === 'helpful' || action === 'not_helpful') {
      // Update helpfulness rating
      const field = action === 'helpful' ? 'helpful_count' : 'not_helpful_count'
      
      const { data: updatedArticle, error } = await supabase
        .from('knowledge_base')
        .update({
          [field]: supabase.raw(`${field} + 1`),
          updated_at: new Date().toISOString()
        })
        .eq('id', article_id)
        .select()
        .single()

      if (error) {
        console.error('Error updating helpfulness rating:', error)
        return NextResponse.json(
          { error: 'Failed to update rating' }, 
          { status: 500 }
        )
      }

      // Log rating event
      await logArticleRatingEvent(user.id, updatedArticle, action === 'helpful', supabase)

      return NextResponse.json({
        success: true,
        data: updatedArticle,
        message: 'Rating recorded successfully'
      })
    }

    // Regular update (requires ownership verification for non-admin users)
    const validation = customerSuccessSchemas.updateKnowledgeBase.safeParse(updateData)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid update data',
          details: validation.error.errors
        }, 
        { status: 400 }
      )
    }

    // Verify ownership or admin status
    const { data: existingArticle } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('id', article_id)
      .single()

    if (!existingArticle) {
      return NextResponse.json(
        { error: 'Article not found' }, 
        { status: 404 }
      )
    }

    // For now, allow author to edit their own articles
    if (existingArticle.author_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' }, 
        { status: 403 }
      )
    }

    // Update article
    const { data: updatedArticle, error } = await supabase
      .from('knowledge_base')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString()
      })
      .eq('id', article_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating knowledge base article:', error)
      return NextResponse.json(
        { error: 'Failed to update article' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedArticle,
      message: 'Article updated successfully'
    })

  } catch (error) {
    console.error('Knowledge base update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to get knowledge base metadata
async function getKnowledgeBaseMetadata(organizationId: string | null, supabase: any) {
  try {
    let query = supabase
      .from('knowledge_base')
      .select('category, status, created_at')

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data: articles } = await query

    if (!articles) return null

    // Calculate metadata
    const categories = [...new Set(articles.map(a => a.category).filter(Boolean))]
    const statusCounts = articles.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const categoryCounts = articles.reduce((acc, a) => {
      if (a.category) {
        acc[a.category] = (acc[a.category] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const recentArticles = articles.filter(a => 
      new Date(a.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length

    return {
      total_articles: articles.length,
      categories,
      status_distribution: statusCounts,
      category_distribution: categoryCounts,
      recent_articles_count: recentArticles,
      published_articles: statusCounts.published || 0
    }

  } catch (error) {
    console.error('Error calculating knowledge base metadata:', error)
    return null
  }
}

// Helper function to log article view events
async function logArticleViewEvent(userId: string, article: any, supabase: any) {
  try {
    await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: 'knowledge_article_viewed',
          article_id: article.id,
          article_title: article.title,
          article_category: article.category,
          view_count: article.view_count,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging article view event:', error)
    // Don't throw - view should succeed even if logging fails
  }
}

// Helper function to log article rating events
async function logArticleRatingEvent(userId: string, article: any, isHelpful: boolean, supabase: any) {
  try {
    await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: 'knowledge_article_rated',
          article_id: article.id,
          article_title: article.title,
          rating: isHelpful ? 'helpful' : 'not_helpful',
          helpful_count: article.helpful_count,
          not_helpful_count: article.not_helpful_count,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging article rating event:', error)
    // Don't throw - rating should succeed even if logging fails
  }
}