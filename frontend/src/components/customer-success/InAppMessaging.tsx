'use client'

import React, { useState, useEffect } from 'react'
import { 
  Bell, 
  X, 
  Eye, 
  MousePointer, 
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
  Star,
  Gift,
  Lightbulb,
  Settings,
  Minimize2,
  Maximize2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useInAppMessages } from '@/hooks/customer-success/useInAppMessages'
import { InAppMessage, MessageType, InteractionType } from '@/shared/types/customer-success'

interface InAppMessagingProps {
  userId: string
  organizationId?: string
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  maxMessages?: number
  autoShow?: boolean
  className?: string
}

interface MessageCardProps {
  message: InAppMessage
  onInteraction: (type: InteractionType) => void
  onDismiss: () => void
  compact?: boolean
}

interface MessageCenterProps {
  messages: InAppMessage[]
  onMessageInteraction: (messageId: string, type: InteractionType) => void
  onMarkAllRead: () => void
  onClearAll: () => void
  isLoading?: boolean
}

const MessageCard: React.FC<MessageCardProps> = ({ 
  message, 
  onInteraction, 
  onDismiss, 
  compact = false 
}) => {
  const getMessageIcon = (type: MessageType) => {
    switch (type) {
      case 'notification': return <Bell className="w-5 h-5" />
      case 'announcement': return <Info className="w-5 h-5" />
      case 'tips': return <Lightbulb className="w-5 h-5" />
      case 'feature_highlight': return <Star className="w-5 h-5" />
      case 'survey_prompt': return <CheckCircle className="w-5 h-5" />
      case 'support_followup': return <AlertCircle className="w-5 h-5" />
      default: return <Info className="w-5 h-5" />
    }
  }

  const getMessageColor = (type: MessageType) => {
    switch (type) {
      case 'notification': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'announcement': return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'tips': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'feature_highlight': return 'text-green-600 bg-green-50 border-green-200'
      case 'survey_prompt': return 'text-indigo-600 bg-indigo-50 border-indigo-200'
      case 'support_followup': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getActionButton = (action: any) => {
    if (!action) return null

    return (
      <Button 
        size="sm" 
        onClick={() => {
          onInteraction('clicked')
          if (action.url) {
            window.open(action.url, action.target || '_blank')
          }
        }}
        className="mt-3"
      >
        {action.label || 'Learn More'}
      </Button>
    )
  }

  return (
    <div className={`border-2 rounded-lg p-4 ${getMessageColor(message.type)} ${compact ? 'max-w-sm' : 'max-w-md'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {getMessageIcon(message.type)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm leading-tight">{message.title}</h4>
            {!message.is_read && (
              <Badge variant="default" className="text-xs mt-1">New</Badge>
            )}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDismiss}
          className="flex-shrink-0 ml-2"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="mb-3">
        <p className="text-sm leading-relaxed">{message.content}</p>
        
        {message.metadata?.action && getActionButton(message.metadata.action)}
      </div>

      <div className="flex items-center justify-between text-xs opacity-75">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(message.created_at).toLocaleDateString()}
        </span>
        
        <div className="flex gap-3">
          {!message.is_read && (
            <button
              onClick={() => onInteraction('viewed')}
              className="flex items-center gap-1 hover:opacity-100 transition-opacity"
            >
              <Eye className="w-3 h-3" />
              Mark Read
            </button>
          )}
          
          <button
            onClick={() => onInteraction('clicked')}
            className="flex items-center gap-1 hover:opacity-100 transition-opacity"
          >
            <MousePointer className="w-3 h-3" />
            Interact
          </button>
        </div>
      </div>
    </div>
  )
}

const MessageCenter: React.FC<MessageCenterProps> = ({
  messages,
  onMessageInteraction,
  onMarkAllRead,
  onClearAll,
  isLoading
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | MessageType>('all')

  const filteredMessages = messages.filter(message => {
    if (filter === 'all') return true
    if (filter === 'unread') return !message.is_read
    return message.type === filter
  })

  const unreadCount = messages.filter(m => !m.is_read).length

  return (
    <div className="bg-white rounded-lg border shadow-lg">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Message Center</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button size="sm" variant="outline" onClick={onMarkAllRead}>
                Mark All Read ({unreadCount})
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onClearAll}>
              Clear All
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              filter === 'all' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({messages.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              filter === 'unread' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('notification')}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              filter === 'notification' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setFilter('announcement')}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              filter === 'announcement' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Announcements
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading messages...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-medium text-gray-900 mb-2">No Messages</h4>
            <p className="text-gray-600">
              {filter === 'unread' ? 'All caught up! No unread messages.' : 'No messages to display.'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {filteredMessages.map((message) => (
              <div key={message.id} className={`border rounded-lg p-3 ${
                !message.is_read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getMessageIcon(message.type)}
                      <h4 className="font-medium text-sm">{message.title}</h4>
                      {!message.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{message.content}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{new Date(message.created_at).toLocaleDateString()}</span>
                      <Badge variant="outline" className="text-xs">
                        {message.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!message.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onMessageInteraction(message.id, 'viewed')}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onMessageInteraction(message.id, 'dismissed')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const InAppMessaging: React.FC<InAppMessagingProps> = ({
  userId,
  organizationId,
  position = 'bottom-right',
  maxMessages = 3,
  autoShow = true,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)

  const {
    messages,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAsInteracted,
    dismissMessage,
    refreshMessages
  } = useInAppMessages(userId, organizationId)

  const positionClasses = {
    'top-right': 'fixed top-6 right-6 z-50',
    'top-left': 'fixed top-6 left-6 z-50',
    'bottom-right': 'fixed bottom-6 right-6 z-50',
    'bottom-left': 'fixed bottom-6 left-6 z-50'
  }

  // Auto-show priority messages
  useEffect(() => {
    if (autoShow && messages.length > 0 && !isOpen) {
      const priorityMessage = messages.find(m => 
        !m.is_read && (m.type === 'announcement' || m.type === 'feature_highlight')
      )
      if (priorityMessage) {
        setIsOpen(true)
      }
    }
  }, [messages, autoShow, isOpen])

  const handleMessageInteraction = async (messageId: string, type: InteractionType) => {
    try {
      await markAsInteracted(messageId, type)
      
      if (type === 'dismissed') {
        await dismissMessage(messageId)
      }
      
      if (type === 'viewed') {
        await markAsRead(messageId)
      }
    } catch (err) {
      console.error('Failed to handle message interaction:', err)
    }
  }

  const handleDismissCurrentMessage = async () => {
    const currentMessage = visibleMessages[currentMessageIndex]
    if (currentMessage) {
      await handleMessageInteraction(currentMessage.id, 'dismissed')
      
      if (currentMessageIndex >= visibleMessages.length - 1) {
        setCurrentMessageIndex(0)
        if (visibleMessages.length <= 1) {
          setIsOpen(false)
        }
      }
    }
  }

  const handleMarkAllRead = async () => {
    for (const message of messages.filter(m => !m.is_read)) {
      await markAsRead(message.id)
    }
  }

  const handleClearAll = async () => {
    for (const message of messages) {
      await dismissMessage(message.id)
    }
    setIsOpen(false)
  }

  // Filter messages for display
  const visibleMessages = messages
    .filter(m => !m.is_dismissed)
    .slice(0, maxMessages)

  // Bell icon with notification count
  if (!isOpen) {
    return (
      <div className={positionClasses[position]}>
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 shadow-lg relative"
          disabled={visibleMessages.length === 0}
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </Button>
      </div>
    )
  }

  // Message center view
  if (isMinimized) {
    return (
      <div className={positionClasses[position]}>
        <MessageCenter
          messages={messages}
          onMessageInteraction={handleMessageInteraction}
          onMarkAllRead={handleMarkAllRead}
          onClearAll={handleClearAll}
          isLoading={isLoading}
        />
      </div>
    )
  }

  // Individual message display
  return (
    <div className={`${positionClasses[position]} ${className}`}>
      <div className="space-y-4 max-w-sm">
        {/* Controls */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMinimized(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h4 className="font-medium text-red-800">Message Error</h4>
            </div>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white border rounded-lg p-4">
            <div className="animate-pulse flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {!isLoading && visibleMessages.length > 0 && (
          <>
            <MessageCard
              message={visibleMessages[currentMessageIndex]}
              onInteraction={(type) => handleMessageInteraction(visibleMessages[currentMessageIndex].id, type)}
              onDismiss={handleDismissCurrentMessage}
              compact={true}
            />

            {/* Message Navigation */}
            {visibleMessages.length > 1 && (
              <div className="flex items-center justify-between bg-white border rounded-lg p-3">
                <span className="text-sm text-gray-600">
                  {currentMessageIndex + 1} of {visibleMessages.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentMessageIndex(Math.max(0, currentMessageIndex - 1))}
                    disabled={currentMessageIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentMessageIndex(Math.min(visibleMessages.length - 1, currentMessageIndex + 1))}
                    disabled={currentMessageIndex === visibleMessages.length - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && visibleMessages.length === 0 && (
          <div className="bg-white border rounded-lg p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 mb-1">All Caught Up!</h4>
            <p className="text-gray-600 text-sm">No new messages to display.</p>
          </div>
        )}
      </div>
    </div>
  )
}// frontend/src/components/customer-success/InAppMessaging.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { 
  Bell, 
  X, 
  Eye, 
  MousePointer, 
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
  Star,
  Gift,
  Lightbulb,
  Settings,
  Minimize2,
  Maximize2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useInAppMessages } from '@/hooks/customer-success/useInAppMessages'
import { InAppMessage, MessageType, InteractionType } from '@/shared/types/customer-success'

interface InAppMessagingProps {
  userId: string
  organizationId?: string
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  maxMessages?: number
  autoShow?: boolean
  className?: string
}

interface MessageCardProps {
  message: InAppMessage
  onInteraction: (type: InteractionType) => void
  onDismiss: () => void
  compact?: boolean
}

interface MessageCenterProps {
  messages: InAppMessage[]
  onMessageInteraction: (messageId: string, type: InteractionType) => void
  onMarkAllRead: () => void
  onClearAll: () => void
  isLoading?: boolean
}

const MessageCard: React.FC<MessageCardProps> = ({ 
  message, 
  onInteraction, 
  onDismiss, 
  compact = false 
}) => {
  const getMessageIcon = (type: MessageType) => {
    switch (type) {
      case 'notification': return <Bell className="w-5 h-5" />
      case 'announcement': return <Info className="w-5 h-5" />
      case 'tips': return <Lightbulb className="w-5 h-5" />
      case 'feature_highlight': return <Star className="w-5 h-5" />
      case 'survey_prompt': return <CheckCircle className="w-5 h-5" />
      case 'support_followup': return <AlertCircle className="w-5 h-5" />
      default: return <Info className="w-5 h-5" />
    }
  }

  const getMessageColor = (type: MessageType) => {
    switch (type) {
      case 'notification': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'announcement': return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'tips': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'feature_highlight': return 'text-green-600 bg-green-50 border-green-200'
      case 'survey_prompt': return 'text-indigo-600 bg-indigo-50 border-indigo-200'
      case 'support_followup': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getActionButton = (action: any) => {
    if (!action) return null

    return (
      <Button 
        size="sm" 
        onClick={() => {
          onInteraction('clicked')
          if (action.url) {
            window.open(action.url, action.target || '_blank')
          }
        }}
        className="mt-3"
      >
        {action.label || 'Learn More'}
      </Button>
    )
  }

  return (
    <div className={`border-2 rounded-lg p-4 ${getMessageColor(message.type)} ${compact ? 'max-w-sm' : 'max-w-md'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {getMessageIcon(message.type)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm leading-tight">{message.title}</h4>
            {!message.is_read && (
              <Badge variant="default" className="text-xs mt-1">New</Badge>
            )}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDismiss}
          className="flex-shrink-0 ml-2"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="mb-3">
        <p className="text-sm leading-relaxed">{message.content}</p>
        
        {message.metadata?.action && getActionButton(message.metadata.action)}
      </div>

      <div className="flex items-center justify-between text-xs opacity-75">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(message.created_at).toLocaleDateString()}
        </span>
        
        <div className="flex gap-3">
          {!message.is_read && (
            <button
              onClick={() => onInteraction('viewed')}
              className="flex items-center gap-1 hover:opacity-100 transition-opacity"
            >
              <Eye className="w-3 h-3" />
              Mark Read
            </button>
          )}
          
          <button
            onClick={() => onInteraction('clicked')}
            className="flex items-center gap-1 hover:opacity-100 transition-opacity"
          >
            <MousePointer className="w-3 h-3" />
            Interact
          </button>
        </div>
      </div>
    </div>
  )
}

const MessageCenter: React.FC<MessageCenterProps> = ({
  messages,
  onMessageInteraction,
  onMarkAllRead,
  onClearAll,
  isLoading
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | MessageType>('all')

  const filteredMessages = messages.filter(message => {
    if (filter === 'all') return true
    if (filter === 'unread') return !message.is_read
    return message.type === filter
  })

  const unreadCount = messages.filter(m => !m.is_read).length

  return (
    <div className="bg-white rounded-lg border shadow-lg">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Message Center</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button size="sm" variant="outline" onClick={onMarkAllRead}>
                Mark All Read ({unreadCount})
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onClearAll}>
              Clear All
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              filter === 'all' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({messages.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              filter === 'unread' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('notification')}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              filter === 'notification' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setFilter('announcement')}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              filter === 'announcement' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Announcements
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading messages...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-medium text-gray-900 mb-2">No Messages</h4>
            <p className="text-gray-600">
              {filter === 'unread' ? 'All caught up! No unread messages.' : 'No messages to display.'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {filteredMessages.map((message) => (
              <div key={message.id} className={`border rounded-lg p-3 ${
                !message.is_read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getMessageIcon(message.type)}
                      <h4 className="font-medium text-sm">{message.title}</h4>
                      {!message.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{message.content}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{new Date(message.created_at).toLocaleDateString()}</span>
                      <Badge variant="outline" className="text-xs">
                        {message.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!message.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onMessageInteraction(message.id, 'viewed')}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onMessageInteraction(message.id, 'dismissed')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const InAppMessaging: React.FC<InAppMessagingProps> = ({
  userId,
  organizationId,
  position = 'bottom-right',
  maxMessages = 3,
  autoShow = true,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)

  const {
    messages,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAsInteracted,
    dismissMessage,
    refreshMessages
  } = useInAppMessages(userId, organizationId)

  const positionClasses = {
    'top-right': 'fixed top-6 right-6 z-50',
    'top-left': 'fixed top-6 left-6 z-50',
    'bottom-right': 'fixed bottom-6 right-6 z-50',
    'bottom-left': 'fixed bottom-6 left-6 z-50'
  }

  // Auto-show priority messages
  useEffect(() => {
    if (autoShow && messages.length > 0 && !isOpen) {
      const priorityMessage = messages.find(m => 
        !m.is_read && (m.type === 'announcement' || m.type === 'feature_highlight')
      )
      if (priorityMessage) {
        setIsOpen(true)
      }
    }
  }, [messages, autoShow, isOpen])

  const handleMessageInteraction = async (messageId: string, type: InteractionType) => {
    try {
      await markAsInteracted(messageId, type)
      
      if (type === 'dismissed') {
        await dismissMessage(messageId)
      }
      
      if (type === 'viewed') {
        await markAsRead(messageId)
      }
    } catch (err) {
      console.error('Failed to handle message interaction:', err)
    }
  }

  const handleDismissCurrentMessage = async () => {
    const currentMessage = visibleMessages[currentMessageIndex]
    if (currentMessage) {
      await handleMessageInteraction(currentMessage.id, 'dismissed')
      
      if (currentMessageIndex >= visibleMessages.length - 1) {
        setCurrentMessageIndex(0)
        if (visibleMessages.length <= 1) {
          setIsOpen(false)
        }
      }
    }
  }

  const handleMarkAllRead = async () => {
    for (const message of messages.filter(m => !m.is_read)) {
      await markAsRead(message.id)
    }
  }

  const handleClearAll = async () => {
    for (const message of messages) {
      await dismissMessage(message.id)
    }
    setIsOpen(false)
  }

  // Filter messages for display
  const visibleMessages = messages
    .filter(m => !m.is_dismissed)
    .slice(0, maxMessages)

  // Bell icon with notification count
  if (!isOpen) {
    return (
      <div className={positionClasses[position]}>
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 shadow-lg relative"
          disabled={visibleMessages.length === 0}
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </Button>
      </div>
    )
  }

  // Message center view
  if (isMinimized) {
    return (
      <div className={positionClasses[position]}>
        <MessageCenter
          messages={messages}
          onMessageInteraction={handleMessageInteraction}
          onMarkAllRead={handleMarkAllRead}
          onClearAll={handleClearAll}
          isLoading={isLoading}
        />
      </div>
    )
  }

  // Individual message display
  return (
    <div className={`${positionClasses[position]} ${className}`}>
      <div className="space-y-4 max-w-sm">
        {/* Controls */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMinimized(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h4 className="font-medium text-red-800">Message Error</h4>
            </div>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white border rounded-lg p-4">
            <div className="animate-pulse flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {!isLoading && visibleMessages.length > 0 && (
          <>
            <MessageCard
              message={visibleMessages[currentMessageIndex]}
              onInteraction={(type) => handleMessageInteraction(visibleMessages[currentMessageIndex].id, type)}
              onDismiss={handleDismissCurrentMessage}
              compact={true}
            />

            {/* Message Navigation */}
            {visibleMessages.length > 1 && (
              <div className="flex items-center justify-between bg-white border rounded-lg p-3">
                <span className="text-sm text-gray-600">
                  {currentMessageIndex + 1} of {visibleMessages.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentMessageIndex(Math.max(0, currentMessageIndex - 1))}
                    disabled={currentMessageIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentMessageIndex(Math.min(visibleMessages.length - 1, currentMessageIndex + 1))}
                    disabled={currentMessageIndex === visibleMessages.length - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && visibleMessages.length === 0 && (
          <div className="bg-white border rounded-lg p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 mb-1">All Caught Up!</h4>
            <p className="text-gray-600 text-sm">No new messages to display.</p>
          </div>
        )}
      </div>
    </div>
  )
}