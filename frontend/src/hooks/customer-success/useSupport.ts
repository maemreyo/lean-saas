// Support Ticket Management and Knowledge Base Hook

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { 
  SupportTicket,
  KnowledgeBase,
  TicketStatus,
  TicketPriority,
  ArticleStatus,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketResponseRequest,
  SupportTicketsResponse,
  SupportTicketAnalytics
} from '@/shared/types/customer-success'
import {
  createSupportTicket,
  updateSupportTicket,
  addTicketResponse,
  getSupportTickets,
  createKnowledgeArticle,
  updateKnowledgeArticle,
  searchKnowledgeBase,
  rateKnowledgeArticle,
  TICKET_PRIORITIES
} from '@/lib/customer-success/support'

interface UseSupportOptions {
  organizationId?: string
  autoLoad?: boolean
  filters?: {
    status?: TicketStatus[]
    priority?: TicketPriority[]
    category?: string
    assignedTo?: string
  }
  onTicketCreated?: (ticket: SupportTicket) => void
  onTicketUpdated?: (ticket: SupportTicket) => void
  onError?: (error: string) => void
}

interface UseSupportReturn {
  // Tickets
  tickets: SupportTicket[]
  isLoadingTickets: boolean
  ticketsError: string | null
  analytics: SupportTicketAnalytics | null
  pagination: {
    total: number
    page: number
    limit: number
    has_more: boolean
  }
  
  // Ticket actions
  createTicket: (request: Omit<CreateTicketRequest, 'user_id' | 'organization_id'>) => Promise<SupportTicket | null>
  updateTicket: (ticketId: string, updates: UpdateTicketRequest) => Promise<boolean>
  addResponse: (request: Omit<TicketResponseRequest, 'user_id'>) => Promise<boolean>
  
  // Ticket management
  closeTicket: (ticketId: string, resolution?: string) => Promise<boolean>
  reopenTicket: (ticketId: string) => Promise<boolean>
  escalateTicket: (ticketId: string) => Promise<boolean>
  assignTicket: (ticketId: string, agentId: string) => Promise<boolean>
  
  // Knowledge base
  knowledgeArticles: KnowledgeBase[]
  isLoadingKB: boolean
  searchKB: (query: string, category?: string) => Promise<KnowledgeBase[]>
  rateArticle: (articleId: string, helpful: boolean) => Promise<boolean>
  
  // Utilities
  refreshTickets: () => Promise<void>
  loadMoreTickets: () => Promise<void>
  getTicketPriority: (priority: TicketPriority) => typeof TICKET_PRIORITIES[TicketPriority]
  
  // Creating states
  isCreatingTicket: boolean
  createError: string | null
}

export function useSupport(options: UseSupportOptions = {}): UseSupportReturn {
  const { user } = useAuth()
  const {
    organizationId,
    autoLoad = true,
    filters = {},
    onTicketCreated,
    onTicketUpdated,
    onError
  } = options

  // State
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [analytics, setAnalytics] = useState<SupportTicketAnalytics | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    has_more: false
  })
  const [knowledgeArticles, setKnowledgeArticles] = useState<KnowledgeBase[]>([])
  
  const [isLoadingTickets, setIsLoadingTickets] = useState(false)
  const [ticketsError, setTicketsError] = useState<string | null>(null)
  const [isLoadingKB, setIsLoadingKB] = useState(false)
  const [isCreatingTicket, setIsCreatingTicket] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Error handler
  const handleError = useCallback((errorMessage: string) => {
    setTicketsError(errorMessage)
    onError?.(errorMessage)
    console.error('Support error:', errorMessage)
  }, [onError])

  // Load tickets
  const loadTickets = useCallback(async (page = 1, append = false) => {
    if (!user?.id) return

    try {
      setIsLoadingTickets(true)
      if (!append) {
        setTicketsError(null)
      }

      const response = await getSupportTickets(
        {
          organizationId,
          userId: user.id,
          ...filters
        },
        {
          limit: pagination.limit,
          offset: (page - 1) * pagination.limit,
          sortBy: 'created_at',
          sortOrder: 'desc'
        }
      )

      if (append) {
        setTickets(prev => [...prev, ...response.tickets])
      } else {
        setTickets(response.tickets)
      }
      
      setAnalytics(response.analytics)
      setPagination(response.pagination)
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to load tickets')
    } finally {
      setIsLoadingTickets(false)
    }
  }, [user?.id, organizationId, filters, pagination.limit, handleError])

  // Create ticket
  const createTicket = useCallback(async (
    ticketData: Omit<CreateTicketRequest, 'user_id' | 'organization_id'>
  ): Promise<SupportTicket | null> => {
    if (!user?.id) {
      handleError('User not authenticated')
      return null
    }

    try {
      setIsCreatingTicket(true)
      setCreateError(null)

      const request: CreateTicketRequest = {
        user_id: user.id,
        organization_id: organizationId,
        ...ticketData
      }

      const result = await createSupportTicket(request)
      
      if (result.success && result.data) {
        onTicketCreated?.(result.data)
        
        // Add to tickets list
        setTickets(prev => [result.data!, ...prev])
        
        return result.data
      } else {
        setCreateError(result.error || 'Failed to create ticket')
        return null
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create ticket')
      return null
    } finally {
      setIsCreatingTicket(false)
    }
  }, [user?.id, organizationId, onTicketCreated, handleError])

  // Update ticket
  const updateTicket = useCallback(async (
    ticketId: string, 
    updates: UpdateTicketRequest
  ): Promise<boolean> => {
    if (!user?.id) {
      handleError('User not authenticated')
      return false
    }

    try {
      const result = await updateSupportTicket(ticketId, updates, user.id)
      
      if (result.success && result.data) {
        onTicketUpdated?.(result.data)
        
        // Update ticket in list
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketId ? result.data! : ticket
        ))
        
        return true
      } else {
        handleError(result.error || 'Failed to update ticket')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to update ticket')
      return false
    }
  }, [user?.id, onTicketUpdated, handleError])

  // Add response to ticket
  const addResponse = useCallback(async (
    responseData: Omit<TicketResponseRequest, 'user_id'>
  ): Promise<boolean> => {
    if (!user?.id) {
      handleError('User not authenticated')
      return false
    }

    try {
      const request: TicketResponseRequest = {
        user_id: user.id,
        ...responseData
      }

      const result = await addTicketResponse(request)
      
      if (result.success) {
        // Refresh tickets to get updated response count
        await loadTickets(pagination.page, false)
        return true
      } else {
        handleError(result.error || 'Failed to add response')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to add response')
      return false
    }
  }, [user?.id, handleError, loadTickets, pagination.page])

  // Ticket management helpers
  const closeTicket = useCallback(async (ticketId: string, resolution?: string): Promise<boolean> => {
    return await updateTicket(ticketId, {
      status: 'resolved',
      resolution_notes: resolution
    })
  }, [updateTicket])

  const reopenTicket = useCallback(async (ticketId: string): Promise<boolean> => {
    return await updateTicket(ticketId, {
      status: 'open'
    })
  }, [updateTicket])

  const escalateTicket = useCallback(async (ticketId: string): Promise<boolean> => {
    return await updateTicket(ticketId, {
      status: 'escalated',
      priority: 'urgent'
    })
  }, [updateTicket])

  const assignTicket = useCallback(async (ticketId: string, agentId: string): Promise<boolean> => {
    return await updateTicket(ticketId, {
      assigned_to_user_id: agentId
    })
  }, [updateTicket])

  // Knowledge base search
  const searchKB = useCallback(async (
    query: string, 
    category?: string
  ): Promise<KnowledgeBase[]> => {
    try {
      setIsLoadingKB(true)
      
      const articles = await searchKnowledgeBase(
        query,
        {
          organizationId,
          category,
          status: ['published']
        },
        20
      )
      
      setKnowledgeArticles(articles)
      return articles
    } catch (err) {
      console.error('Failed to search knowledge base:', err)
      return []
    } finally {
      setIsLoadingKB(false)
    }
  }, [organizationId])

  // Rate knowledge base article
  const rateArticle = useCallback(async (
    articleId: string, 
    helpful: boolean
  ): Promise<boolean> => {
    try {
      const result = await rateKnowledgeArticle(articleId, helpful)
      return result.success
    } catch (err) {
      console.error('Failed to rate article:', err)
      return false
    }
  }, [])

  // Load more tickets (pagination)
  const loadMoreTickets = useCallback(async () => {
    if (!pagination.has_more || isLoadingTickets) return
    
    await loadTickets(pagination.page + 1, true)
  }, [pagination.has_more, pagination.page, isLoadingTickets, loadTickets])

  // Refresh tickets
  const refreshTickets = useCallback(async () => {
    await loadTickets(1, false)
  }, [loadTickets])

  // Get ticket priority info
  const getTicketPriority = useCallback((priority: TicketPriority) => {
    return TICKET_PRIORITIES[priority]
  }, [])

  // Effects
  useEffect(() => {
    if (autoLoad && user?.id) {
      loadTickets()
    }
  }, [autoLoad, user?.id, loadTickets])

  // Reload when filters change
  useEffect(() => {
    if (user?.id) {
      loadTickets(1, false)
    }
  }, [filters, user?.id])

  return {
    // Tickets
    tickets,
    isLoadingTickets,
    ticketsError,
    analytics,
    pagination,
    
    // Ticket actions
    createTicket,
    updateTicket,
    addResponse,
    
    // Ticket management
    closeTicket,
    reopenTicket,
    escalateTicket,
    assignTicket,
    
    // Knowledge base
    knowledgeArticles,
    isLoadingKB,
    searchKB,
    rateArticle,
    
    // Utilities
    refreshTickets,
    loadMoreTickets,
    getTicketPriority,
    
    // Creating states
    isCreatingTicket,
    createError
  }
}

// Hook for knowledge base management (admin use)
export function useKnowledgeBase(organizationId?: string) {
  const { user } = useAuth()
  const [articles, setArticles] = useState<KnowledgeBase[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createArticle = useCallback(async (
    articleData: Omit<Parameters<typeof createKnowledgeArticle>[0], 'author_id'>
  ): Promise<KnowledgeBase | null> => {
    if (!user?.id) return null

    try {
      setIsLoading(true)
      setError(null)

      const result = await createKnowledgeArticle(articleData, user.id)
      
      if (result.success && result.data) {
        setArticles(prev => [result.data!, ...prev])
        return result.data
      } else {
        setError(result.error || 'Failed to create article')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create article')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  const updateArticle = useCallback(async (
    articleId: string,
    updates: Parameters<typeof updateKnowledgeArticle>[1]
  ): Promise<boolean> => {
    if (!user?.id) return false

    try {
      setIsLoading(true)
      setError(null)

      const result = await updateKnowledgeArticle(articleId, updates, user.id)
      
      if (result.success && result.data) {
        setArticles(prev => prev.map(article => 
          article.id === articleId ? result.data! : article
        ))
        return true
      } else {
        setError(result.error || 'Failed to update article')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update article')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  const searchArticles = useCallback(async (
    query: string,
    filters: {
      category?: string
      status?: ArticleStatus[]
      featured?: boolean
    } = {}
  ): Promise<KnowledgeBase[]> => {
    try {
      setIsLoading(true)
      
      const results = await searchKnowledgeBase(
        query,
        {
          organizationId,
          ...filters
        },
        50
      )
      
      setArticles(results)
      return results
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search articles')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [organizationId])

  return {
    articles,
    isLoading,
    error,
    createArticle,
    updateArticle,
    searchArticles
  }
}

// Hook for support chat/live chat
export function useSupportChat(ticketId?: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Array<{
    id: string
    content: string
    sender: 'user' | 'agent'
    timestamp: string
  }>>([])
  const [isTyping, setIsTyping] = useState(false)
  const [agentInfo, setAgentInfo] = useState<{
    name: string
    avatar?: string
    status: 'online' | 'away' | 'offline'
  } | null>(null)

  const connect = useCallback(() => {
    // In a real implementation, this would establish WebSocket connection
    setIsConnected(true)
    setAgentInfo({
      name: 'Support Agent',
      status: 'online'
    })
  }, [])

  const disconnect = useCallback(() => {
    setIsConnected(false)
    setAgentInfo(null)
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!isConnected) return false

    const message = {
      id: crypto.randomUUID(),
      content,
      sender: 'user' as const,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, message])

    // In a real implementation, this would send via WebSocket
    // For now, simulate agent response
    setTimeout(() => {
      const agentResponse = {
        id: crypto.randomUUID(),
        content: 'Thank you for your message. An agent will respond shortly.',
        sender: 'agent' as const,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, agentResponse])
    }, 1000)

    return true
  }, [isConnected])

  const startTyping = useCallback(() => {
    setIsTyping(true)
    // Auto-stop typing after 3 seconds
    setTimeout(() => setIsTyping(false), 3000)
  }, [])

  return {
    isConnected,
    messages,
    isTyping,
    agentInfo,
    connect,
    disconnect,
    sendMessage,
    startTyping
  }
}