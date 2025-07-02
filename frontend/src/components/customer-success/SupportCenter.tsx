'use client'

import React, { useState, useEffect } from 'react'
import { 
  Search,
  HelpCircle,
  MessageCircle,
  FileText,
  Book,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Tag,
  Filter,
  Plus,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useSupport } from '@/hooks/customer-success/useSupport'
import { SupportTicket, KnowledgeArticle, TicketStatus, TicketPriority } from '@/shared/types/customer-success'

interface SupportCenterProps {
  userId: string
  organizationId?: string
  className?: string
}

interface TicketFormProps {
  onSubmit: (ticket: Partial<SupportTicket>) => void
  onCancel: () => void
  isLoading?: boolean
}

interface KnowledgeSearchProps {
  articles: KnowledgeArticle[]
  onSearch: (query: string) => void
  isLoading?: boolean
}

interface TicketListProps {
  tickets: SupportTicket[]
  onTicketSelect: (ticket: SupportTicket) => void
  onCreateTicket: () => void
}

const TicketForm: React.FC<TicketFormProps> = ({ onSubmit, onCancel, isLoading }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [category, setCategory] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim() && description.trim()) {
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        priority,
        category: category.trim() || undefined
      })
    }
  }

  const priorityOptions: { value: TicketPriority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'text-gray-600' },
    { value: 'medium', label: 'Medium', color: 'text-blue-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
    { value: 'critical', label: 'Critical', color: 'text-red-800' }
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subject *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Briefly describe your issue"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category (optional)
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., billing, technical"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={6}
          placeholder="Provide detailed information about your issue, including steps to reproduce if applicable"
          required
        />
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !title.trim() || !description.trim()} className="flex-1">
          {isLoading ? 'Creating...' : 'Create Ticket'}
        </Button>
      </div>
    </form>
  )
}

const KnowledgeSearch: React.FC<KnowledgeSearchProps> = ({ articles, onSearch, isLoading }) => {
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query.trim()})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>')
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Search for help articles..."
        />
        {query && (
          <Button
            type="submit"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
          >
            Search
          </Button>
        )}
      </form>

      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Searching articles...</p>
        </div>
      )}

      {!isLoading && articles.length === 0 && query && (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">No articles found</h3>
          <p className="text-gray-600">Try different search terms or browse categories</p>
        </div>
      )}

      {!isLoading && articles.length === 0 && !query && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Popular Categories */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors">
            <Book className="w-6 h-6 text-blue-600 mb-2" />
            <h3 className="font-medium text-blue-800">Getting Started</h3>
            <p className="text-sm text-blue-600">Setup and basic usage</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors">
            <HelpCircle className="w-6 h-6 text-green-600 mb-2" />
            <h3 className="font-medium text-green-800">FAQ</h3>
            <p className="text-sm text-green-600">Frequently asked questions</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 cursor-pointer hover:bg-purple-100 transition-colors">
            <FileText className="w-6 h-6 text-purple-600 mb-2" />
            <h3 className="font-medium text-purple-800">Troubleshooting</h3>
            <p className="text-sm text-purple-600">Common issues and fixes</p>
          </div>
        </div>
      )}

      {!isLoading && articles.length > 0 && (
        <div className="space-y-4">
          {articles.map((article) => (
            <div key={article.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer">
                  <span 
                    dangerouslySetInnerHTML={{ 
                      __html: highlightText(article.title, query) 
                    }} 
                  />
                </h3>
                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
              </div>
              
              {article.excerpt && (
                <p 
                  className="text-gray-600 text-sm mb-3"
                  dangerouslySetInnerHTML={{ 
                    __html: highlightText(article.excerpt, query) 
                  }} 
                />
              )}

              <div className="flex items-center gap-3 text-xs text-gray-500">
                {article.category && (
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {article.category}
                  </span>
                )}
                <span>Updated {new Date(article.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const TicketList: React.FC<TicketListProps> = ({ tickets, onTicketSelect, onCreateTicket }) => {
  const getStatusBadge = (status: TicketStatus) => {
    const statusConfig = {
      open: { variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
      in_progress: { variant: 'default' as const, color: 'bg-yellow-100 text-yellow-800' },
      waiting_customer: { variant: 'default' as const, color: 'bg-purple-100 text-purple-800' },
      resolved: { variant: 'success' as const, color: 'bg-green-100 text-green-800' },
      closed: { variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
      escalated: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' }
    }

    return statusConfig[status] || statusConfig.open
  }

  const getPriorityIcon = (priority: TicketPriority) => {
    switch (priority) {
      case 'critical':
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'high':
        return <AlertCircle className="w-4 h-4 text-orange-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your Support Tickets</h3>
        <Button onClick={onCreateTicket}>
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">No support tickets</h3>
          <p className="text-gray-600 mb-4">You haven't created any support tickets yet.</p>
          <Button onClick={onCreateTicket}>Create your first ticket</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => onTicketSelect(ticket)}
              className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getPriorityIcon(ticket.priority)}
                  <h4 className="font-medium text-gray-900">{ticket.title}</h4>
                </div>
                <Badge className={getStatusBadge(ticket.status).color}>
                  {ticket.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {ticket.description}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Ticket #{ticket.id.slice(-8)}
                  </span>
                  {ticket.category && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {ticket.category}
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const SupportCenter: React.FC<SupportCenterProps> = ({
  userId,
  organizationId,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('help')
  const [showTicketForm, setShowTicketForm] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)

  const {
    tickets,
    knowledgeArticles,
    isLoading,
    error,
    createTicket,
    searchKnowledge,
    refreshTickets
  } = useSupport(userId, organizationId)

  useEffect(() => {
    refreshTickets()
  }, [refreshTickets])

  const handleCreateTicket = async (ticketData: Partial<SupportTicket>) => {
    try {
      await createTicket(ticketData)
      setShowTicketForm(false)
      setActiveTab('tickets')
    } catch (err) {
      console.error('Failed to create ticket:', err)
    }
  }

  const handleSearch = async (query: string) => {
    try {
      await searchKnowledge(query)
    } catch (err) {
      console.error('Failed to search knowledge base:', err)
    }
  }

  if (selectedTicket) {
    // Ticket detail view would go here
    return (
      <div className={`bg-white rounded-lg border ${className}`}>
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setSelectedTicket(null)}>
              ← Back
            </Button>
            <h2 className="text-xl font-semibold">{selectedTicket.title}</h2>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-600">Ticket detail view would be implemented here</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Support Center</h2>
        <p className="text-gray-600">Get help with your questions and issues</p>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="help">Help Center</TabsTrigger>
            <TabsTrigger value="tickets">My Tickets</TabsTrigger>
            <TabsTrigger value="contact">Contact Support</TabsTrigger>
          </TabsList>

          <TabsContent value="help">
            <KnowledgeSearch
              articles={knowledgeArticles}
              onSearch={handleSearch}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="tickets">
            <TicketList
              tickets={tickets}
              onTicketSelect={setSelectedTicket}
              onCreateTicket={() => setShowTicketForm(true)}
            />
          </TabsContent>

          <TabsContent value="contact">
            {showTicketForm ? (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Create Support Ticket</h3>
                  <p className="text-gray-600">Describe your issue and we'll get back to you soon</p>
                </div>
                <TicketForm
                  onSubmit={handleCreateTicket}
                  onCancel={() => setShowTicketForm(false)}
                  isLoading={isLoading}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Contact Support</h3>
                  <p className="text-gray-600 mb-6">
                    Need help? Choose the best way to get in touch with our support team.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <MessageCircle className="w-8 h-8 text-blue-600 mb-4" />
                    <h4 className="font-semibold text-blue-800 mb-2">Create a Ticket</h4>
                    <p className="text-blue-700 text-sm mb-4">
                      Submit a detailed support request and track its progress
                    </p>
                    <Button onClick={() => setShowTicketForm(true)} className="w-full">
                      Create Ticket
                    </Button>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <Search className="w-8 h-8 text-green-600 mb-4" />
                    <h4 className="font-semibold text-green-800 mb-2">Search Help Center</h4>
                    <p className="text-green-700 text-sm mb-4">
                      Find instant answers in our knowledge base
                    </p>
                    <Button variant="outline" onClick={() => setActiveTab('help')} className="w-full">
                      Browse Articles
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}