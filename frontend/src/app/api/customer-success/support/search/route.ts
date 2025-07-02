import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') // 'articles', 'tickets', 'all'
    const category = searchParams.get('category')
    const organizationId = searchParams.get('organization_id')
    const limit = searchParams.get('limit')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters long' }, 
        { status: 400 }
      )
    }

    const user = await getUser()
    const supabase = createClient()

    const searchResults: any = {
      query: query.trim(),
      results: {
        articles: [],
        tickets: [],
        suggestions: []
      },
      total_results: 0,
      search_time: Date.now()
    }

    const searchType = type || 'all'
    const searchLimit = parseInt(limit || '20')

    // Search knowledge base articles
    if (searchType === 'all' || searchType === 'articles') {
      const articleResults = await searchKnowledgeBase(
        query.trim(), 
        category, 
        organizationId, 
        Math.min(searchLimit, 10),
        supabase
      )
      searchResults.results.articles = articleResults
    }

    // Search support tickets (only if user is authenticated)
    if (user && (searchType === 'all' || searchType === 'tickets')) {
      const ticketResults = await searchSupportTickets(
        query.trim(), 
        user.id, 
        category, 
        organizationId, 
        Math.min(searchLimit, 10),
        supabase
      )
      searchResults.results.tickets = ticketResults
    }

    // Generate search suggestions
    const suggestions = await generateSearchSuggestions(
      query.trim(), 
      organizationId, 
      supabase
    )
    searchResults.results.suggestions = suggestions

    // Calculate total results
    searchResults.total_results = 
      searchResults.results.articles.length + 
      searchResults.results.tickets.length

    // Log search event
    if (user) {
      await logSearchEvent(user.id, {
        query: query.trim(),
        type: searchType,
        total_results: searchResults.total_results,
        has_articles: searchResults.results.articles.length > 0,
        has_tickets: searchResults.results.tickets.length > 0
      }, supabase)
    }

    // Calculate search time
    searchResults.search_time = Date.now() - searchResults.search_time

    return NextResponse.json({
      success: true,
      data: searchResults
    })

  } catch (error) {
    console.error('Support search error:', error)
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
    const { queries, filters, options } = body

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json(
        { error: 'Queries array is required' }, 
        { status: 400 }
      )
    }

    const supabase = createClient()
    const batchResults = []

    // Process each query in the batch
    for (const query of queries.slice(0, 5)) { // Limit to 5 queries per batch
      if (typeof query !== 'string' || query.trim().length < 2) {
        continue
      }

      const queryResults = {
        query: query.trim(),
        articles: [],
        tickets: [],
        total_results: 0
      }

      // Search articles
      const articleResults = await searchKnowledgeBase(
        query.trim(),
        filters?.category,
        filters?.organizationId,
        options?.limit || 5,
        supabase
      )
      queryResults.articles = articleResults

      // Search tickets
      const ticketResults = await searchSupportTickets(
        query.trim(),
        user.id,
        filters?.category,
        filters?.organizationId,
        options?.limit || 5,
        supabase
      )
      queryResults.tickets = ticketResults

      queryResults.total_results = articleResults.length + ticketResults.length
      batchResults.push(queryResults)
    }

    // Log batch search event
    await logBatchSearchEvent(user.id, {
      query_count: batchResults.length,
      total_results: batchResults.reduce((sum, r) => sum + r.total_results, 0),
      filters,
      options
    }, supabase)

    return NextResponse.json({
      success: true,
      data: {
        batch_results: batchResults,
        total_queries: batchResults.length,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Batch search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper function to search knowledge base articles
async function searchKnowledgeBase(
  query: string, 
  category: string | null, 
  organizationId: string | null, 
  limit: number,
  supabase: any
) {
  try {
    // Build search query
    let searchQuery = supabase
      .from('knowledge_base')
      .select('id, title, excerpt, content, category, view_count, helpful_count, updated_at, is_featured')
      .eq('status', 'published')

    if (organizationId) {
      searchQuery = searchQuery.eq('organization_id', organizationId)
    }

    if (category) {
      searchQuery = searchQuery.eq('category', category)
    }

    // Simple text search (in production, use full-text search or search service)
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1)
    
    // Search in title, excerpt, and content
    const titleResults = await searchQuery
      .ilike('title', `%${query}%`)
      .limit(limit)

    const excerptResults = await searchQuery
      .ilike('excerpt', `%${query}%`)
      .limit(limit)

    // Combine and deduplicate results
    const allResults = [
      ...(titleResults.data || []),
      ...(excerptResults.data || [])
    ]

    // Remove duplicates and score results
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.id, item])).values()
    )

    // Score and sort results
    const scoredResults = uniqueResults.map(article => {
      let score = 0
      const lowerTitle = article.title.toLowerCase()
      const lowerExcerpt = (article.excerpt || '').toLowerCase()
      const lowerQuery = query.toLowerCase()

      // Exact title match
      if (lowerTitle.includes(lowerQuery)) score += 10

      // Title word matches
      searchTerms.forEach(term => {
        if (lowerTitle.includes(term)) score += 3
        if (lowerExcerpt.includes(term)) score += 1
      })

      // Boost for popular articles
      if (article.view_count > 100) score += 2
      if (article.helpful_count > 10) score += 1
      if (article.is_featured) score += 2

      return {
        ...article,
        search_score: score,
        matched_fields: {
          title: lowerTitle.includes(lowerQuery),
          excerpt: lowerExcerpt.includes(lowerQuery)
        }
      }
    })

    // Sort by score and return top results
    return scoredResults
      .sort((a, b) => b.search_score - a.search_score)
      .slice(0, limit)

  } catch (error) {
    console.error('Error searching knowledge base:', error)
    return []
  }
}

// Helper function to search support tickets
async function searchSupportTickets(
  query: string,
  userId: string,
  category: string | null,
  organizationId: string | null,
  limit: number,
  supabase: any
) {
  try {
    let searchQuery = supabase
      .from('support_tickets')
      .select('id, ticket_number, title, description, status, priority, category, created_at, updated_at')
      .eq('user_id', userId)

    if (organizationId) {
      searchQuery = searchQuery.eq('organization_id', organizationId)
    }

    if (category) {
      searchQuery = searchQuery.eq('category', category)
    }

    // Search in title and description
    const titleResults = await searchQuery
      .ilike('title', `%${query}%`)
      .limit(limit)

    const descriptionResults = await searchQuery
      .ilike('description', `%${query}%`)
      .limit(limit)

    // Combine and deduplicate results
    const allResults = [
      ...(titleResults.data || []),
      ...(descriptionResults.data || [])
    ]

    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.id, item])).values()
    )

    // Score results
    const scoredResults = uniqueResults.map(ticket => {
      let score = 0
      const lowerTitle = ticket.title.toLowerCase()
      const lowerDescription = (ticket.description || '').toLowerCase()
      const lowerQuery = query.toLowerCase()

      // Exact matches
      if (lowerTitle.includes(lowerQuery)) score += 5
      if (lowerDescription.includes(lowerQuery)) score += 3

      // Recent tickets get higher score
      const daysSinceCreated = (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceCreated < 30) score += 2
      if (daysSinceCreated < 7) score += 1

      // Priority boost
      if (ticket.priority === 'high' || ticket.priority === 'urgent') score += 1

      return {
        ...ticket,
        search_score: score,
        matched_fields: {
          title: lowerTitle.includes(lowerQuery),
          description: lowerDescription.includes(lowerQuery)
        }
      }
    })

    return scoredResults
      .sort((a, b) => b.search_score - a.search_score)
      .slice(0, limit)

  } catch (error) {
    console.error('Error searching support tickets:', error)
    return []
  }
}

// Helper function to generate search suggestions
async function generateSearchSuggestions(query: string, organizationId: string | null, supabase: any) {
  try {
    // Get popular search terms from knowledge base
    let suggestionsQuery = supabase
      .from('knowledge_base')
      .select('title, category')
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .limit(10)

    if (organizationId) {
      suggestionsQuery = suggestionsQuery.eq('organization_id', organizationId)
    }

    const { data: articles } = await suggestionsQuery

    if (!articles) return []

    const suggestions = []
    const queryWords = query.toLowerCase().split(' ')

    // Generate suggestions based on article titles and categories
    articles.forEach(article => {
      const titleWords = article.title.toLowerCase().split(' ')
      
      // Find similar words
      titleWords.forEach(word => {
        if (word.length > 3 && 
            !queryWords.includes(word) && 
            (word.includes(query.toLowerCase()) || query.toLowerCase().includes(word))) {
          suggestions.push({
            suggestion: word,
            type: 'title_word',
            source: article.title
          })
        }
      })

      // Add category suggestions
      if (article.category && 
          article.category.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push({
          suggestion: article.category,
          type: 'category',
          source: 'knowledge_base'
        })
      }
    })

    // Remove duplicates and return top suggestions
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map(s => [s.suggestion, s])).values()
    )

    return uniqueSuggestions.slice(0, 5)

  } catch (error) {
    console.error('Error generating search suggestions:', error)
    return []
  }
}

// Helper function to log search events
async function logSearchEvent(userId: string, searchData: any, supabase: any) {
  try {
    await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: 'support_search_performed',
          search_query: searchData.query,
          search_type: searchData.type,
          total_results: searchData.total_results,
          has_articles: searchData.has_articles,
          has_tickets: searchData.has_tickets,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging search event:', error)
    // Don't throw - search should succeed even if logging fails
  }
}

// Helper function to log batch search events
async function logBatchSearchEvent(userId: string, batchData: any, supabase: any) {
  try {
    await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_data: {
          event_type: 'support_batch_search_performed',
          query_count: batchData.query_count,
          total_results: batchData.total_results,
          filters: batchData.filters,
          options: batchData.options,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging batch search event:', error)
    // Don't throw - search should succeed even if logging fails
  }
}