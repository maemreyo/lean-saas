// In-App Messaging and Notification Hook

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { 
  InAppMessage,
  MessageType,
  SendMessageRequest,
  MessageInteractionRequest
} from '@/shared/types/customer-success'
import {
  sendInAppMessage,
  getActiveMessagesForUser,
  trackMessageInteraction,
  createMessageFromTemplate,
  triggerAutomatedMessage,
  getMessageAnalytics,
  MESSAGE_TEMPLATES,
  MESSAGE_TRIGGERS
} from '@/lib/customer-success/messaging'

interface UseInAppMessagesOptions {
  organizationId?: string
  messageTypes?: MessageType[]
  position?: 'top' | 'bottom' | 'center'
  maxMessages?: number
  autoLoad?: boolean
  onMessageReceived?: (message: InAppMessage) => void
  onMessageInteraction?: (messageId: string, interaction: string) => void
  onError?: (error: string) => void
}

interface UseInAppMessagesReturn {
  // Messages
  messages: InAppMessage[]
  activeMessages: InAppMessage[]
  isLoading: boolean
  error: string | null
  
  // Message actions
  sendMessage: (request: Omit<SendMessageRequest, 'organization_id'>) => Promise<boolean>
  interactWithMessage: (messageId: string, type: 'viewed' | 'clicked' | 'dismissed', metadata?: Record<string, any>) => Promise<boolean>
  dismissMessage: (messageId: string) => void
  dismissAllMessages: () => void
  
  // Template messages
  sendTemplateMessage: (templateKey: keyof typeof MESSAGE_TEMPLATES, variables?: Record<string, string>, targeting?: {
    userIds?: string[]
    userSegments?: string[]
    scheduleAt?: string
    expiresAt?: string
  }) => Promise<boolean>
  
  // Automated messages
  triggerEvent: (eventType: keyof typeof MESSAGE_TRIGGERS, eventData?: Record<string, any>) => Promise<boolean>
  
  // Message management
  markAsRead: (messageId: string) => Promise<boolean>
  markAllAsRead: () => Promise<boolean>
  getUnreadCount: () => number
  hasUnreadMessages: () => boolean
  
  // Utilities
  refresh: () => Promise<void>
  getMessageByType: (type: MessageType) => InAppMessage[]
  getHighestPriorityMessage: () => InAppMessage | null
  
  // Analytics (for admin users)
  analytics: {
    total_messages: number
    active_messages: number
    total_views: number
    total_clicks: number
    total_dismissals: number
    click_through_rate: number
    dismissal_rate: number
    messages_by_type: Record<MessageType, number>
    top_performing_messages: Array<{
      id: string
      title: string
      views: number
      clicks: number
      ctr: number
    }>
  } | null
}

export function useInAppMessages(options: UseInAppMessagesOptions = {}): UseInAppMessagesReturn {
  const { user } = useAuth()
  const {
    organizationId,
    messageTypes,
    position = 'top',
    maxMessages = 5,
    autoLoad = true,
    onMessageReceived,
    onMessageInteraction,
    onError
  } = options

  // State
  const [messages, setMessages] = useState<InAppMessage[]>([])
  const [dismissedMessages, setDismissedMessages] = useState<Set<string>>(new Set())
  const [viewedMessages, setViewedMessages] = useState<Set<string>>(new Set())
  const [analytics, setAnalytics] = useState<UseInAppMessagesReturn['analytics']>(null)
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Error handler
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    onError?.(errorMessage)
    console.error('In-app messages error:', errorMessage)
  }, [onError])

  // Filter active messages (not dismissed, within display limits)
  const activeMessages = useMemo(() => {
    return messages
      .filter(message => !dismissedMessages.has(message.id))
      .slice(0, maxMessages)
      .sort((a, b) => (b.display_priority || 0) - (a.display_priority || 0))
  }, [messages, dismissedMessages, maxMessages])

  // Load messages for user
  const loadMessages = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const userMessages = await getActiveMessagesForUser(
        user.id,
        organizationId,
        messageTypes
      )

      setMessages(userMessages)

      // Trigger callback for new messages
      userMessages.forEach(message => {
        if (!messages.find(m => m.id === message.id)) {
          onMessageReceived?.(message)
        }
      })

    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, organizationId, messageTypes, messages, onMessageReceived, handleError])

  // Send message
  const sendMessage = useCallback(async (
    messageData: Omit<SendMessageRequest, 'organization_id'>
  ): Promise<boolean> => {
    try {
      setError(null)

      const request: SendMessageRequest = {
        organization_id: organizationId,
        ...messageData
      }

      const result = await sendInAppMessage(request)
      
      if (result.success) {
        // Refresh messages to show new message
        await loadMessages()
        return true
      } else {
        handleError(result.error || 'Failed to send message')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to send message')
      return false
    }
  }, [organizationId, loadMessages, handleError])

  // Interact with message
  const interactWithMessage = useCallback(async (
    messageId: string,
    interactionType: 'viewed' | 'clicked' | 'dismissed',
    metadata: Record<string, any> = {}
  ): Promise<boolean> => {
    if (!user?.id) {
      handleError('User not authenticated')
      return false
    }

    try {
      const request: MessageInteractionRequest = {
        message_id: messageId,
        user_id: user.id,
        interaction_type: interactionType,
        metadata
      }

      const result = await trackMessageInteraction(request)
      
      if (result.success) {
        // Update local state based on interaction
        switch (interactionType) {
          case 'viewed':
            setViewedMessages(prev => new Set(prev).add(messageId))
            break
          case 'dismissed':
            setDismissedMessages(prev => new Set(prev).add(messageId))
            break
          case 'clicked':
            setViewedMessages(prev => new Set(prev).add(messageId))
            break
        }

        onMessageInteraction?.(messageId, interactionType)
        return true
      } else {
        handleError(result.error || 'Failed to track interaction')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to track interaction')
      return false
    }
  }, [user?.id, onMessageInteraction, handleError])

  // Dismiss message
  const dismissMessage = useCallback((messageId: string) => {
    setDismissedMessages(prev => new Set(prev).add(messageId))
    interactWithMessage(messageId, 'dismissed')
  }, [interactWithMessage])

  // Dismiss all messages
  const dismissAllMessages = useCallback(() => {
    activeMessages.forEach(message => {
      dismissMessage(message.id)
    })
  }, [activeMessages, dismissMessage])

  // Send template message
  const sendTemplateMessage = useCallback(async (
    templateKey: keyof typeof MESSAGE_TEMPLATES,
    variables: Record<string, string> = {},
    targeting: {
      userIds?: string[]
      userSegments?: string[]
      scheduleAt?: string
      expiresAt?: string
    } = {}
  ): Promise<boolean> => {
    try {
      const result = await createMessageFromTemplate(
        templateKey,
        variables,
        {
          organizationId,
          ...targeting
        },
        {
          scheduleAt: targeting.scheduleAt,
          expiresAt: targeting.expiresAt
        }
      )

      if (result.success) {
        await loadMessages()
        return true
      } else {
        handleError(result.error || 'Failed to send template message')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to send template message')
      return false
    }
  }, [organizationId, loadMessages, handleError])

  // Trigger automated message
  const triggerEvent = useCallback(async (
    eventType: keyof typeof MESSAGE_TRIGGERS,
    eventData: Record<string, any> = {}
  ): Promise<boolean> => {
    if (!user?.id) {
      handleError('User not authenticated')
      return false
    }

    try {
      const result = await triggerAutomatedMessage(
        eventType,
        user.id,
        organizationId,
        eventData
      )

      if (result.success) {
        if (result.message_sent) {
          await loadMessages()
        }
        return true
      } else {
        handleError(result.error || 'Failed to trigger automated message')
        return false
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Failed to trigger automated message')
      return false
    }
  }, [user?.id, organizationId, loadMessages, handleError])

  // Mark as read
  const markAsRead = useCallback(async (messageId: string): Promise<boolean> => {
    return await interactWithMessage(messageId, 'viewed')
  }, [interactWithMessage])

  // Mark all as read
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    const promises = activeMessages.map(message => markAsRead(message.id))
    const results = await Promise.all(promises)
    return results.every(result => result)
  }, [activeMessages, markAsRead])

  // Get unread count
  const getUnreadCount = useCallback((): number => {
    return activeMessages.filter(message => !viewedMessages.has(message.id)).length
  }, [activeMessages, viewedMessages])

  // Check if has unread messages
  const hasUnreadMessages = useCallback((): boolean => {
    return getUnreadCount() > 0
  }, [getUnreadCount])

  // Utilities
  const refresh = useCallback(async () => {
    await loadMessages()
  }, [loadMessages])

  const getMessageByType = useCallback((type: MessageType): InAppMessage[] => {
    return activeMessages.filter(message => message.message_type === type)
  }, [activeMessages])

  const getHighestPriorityMessage = useCallback((): InAppMessage | null => {
    return activeMessages.length > 0 ? activeMessages[0] : null
  }, [activeMessages])

  // Load analytics for admin users
  const loadAnalytics = useCallback(async () => {
    try {
      const analyticsData = await getMessageAnalytics(organizationId)
      setAnalytics(analyticsData)
    } catch (err) {
      console.error('Failed to load message analytics:', err)
    }
  }, [organizationId])

  // Effects
  useEffect(() => {
    if (autoLoad && user?.id) {
      loadMessages()
    }
  }, [autoLoad, user?.id, loadMessages])

  // Auto-mark messages as viewed when they become active
  useEffect(() => {
    activeMessages.forEach(message => {
      if (!viewedMessages.has(message.id)) {
        // Auto-mark as viewed after 2 seconds
        setTimeout(() => {
          markAsRead(message.id)
        }, 2000)
      }
    })
  }, [activeMessages, viewedMessages, markAsRead])

  // Load analytics for admin users
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'owner') {
      loadAnalytics()
    }
  }, [user?.role, loadAnalytics])

  // Periodic refresh for new messages
  useEffect(() => {
    if (!user?.id) return

    const interval = setInterval(() => {
      loadMessages()
    }, 30000) // Check for new messages every 30 seconds

    return () => clearInterval(interval)
  }, [user?.id, loadMessages])

  return {
    // Messages
    messages,
    activeMessages,
    isLoading,
    error,
    
    // Message actions
    sendMessage,
    interactWithMessage,
    dismissMessage,
    dismissAllMessages,
    
    // Template messages
    sendTemplateMessage,
    
    // Automated messages
    triggerEvent,
    
    // Message management
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    hasUnreadMessages,
    
    // Utilities
    refresh,
    getMessageByType,
    getHighestPriorityMessage,
    
    // Analytics
    analytics
  }
}

// Hook for message widget/notification center
export function useMessageWidget(options: {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  organizationId?: string
} = {}) {
  const { 
    activeMessages, 
    getUnreadCount, 
    hasUnreadMessages, 
    dismissMessage, 
    markAsRead,
    markAllAsRead
  } = useInAppMessages(options)
  
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  const openWidget = useCallback(() => {
    setIsOpen(true)
    setIsMinimized(false)
  }, [])

  const closeWidget = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggleWidget = useCallback(() => {
    setIsOpen(prev => !prev)
    if (isMinimized) {
      setIsMinimized(false)
    }
  }, [isMinimized])

  const minimizeWidget = useCallback(() => {
    setIsMinimized(true)
    setIsOpen(false)
  }, [])

  // Auto-open widget when new high priority messages arrive
  useEffect(() => {
    const highPriorityMessage = activeMessages.find(m => (m.display_priority || 0) >= 8)
    if (highPriorityMessage && !isOpen) {
      setIsOpen(true)
    }
  }, [activeMessages, isOpen])

  return {
    // Widget state
    isOpen,
    isMinimized,
    
    // Widget actions
    openWidget,
    closeWidget,
    toggleWidget,
    minimizeWidget,
    
    // Message data
    messages: activeMessages,
    unreadCount: getUnreadCount(),
    hasUnread: hasUnreadMessages(),
    
    // Message actions
    dismissMessage,
    markAsRead,
    markAllAsRead
  }
}

// Hook for automated message triggers
export function useMessageTriggers(organizationId?: string) {
  const { triggerEvent } = useInAppMessages({ organizationId })

  const triggerWelcome = useCallback(async (userData: {
    userName?: string
    planType?: string
  } = {}) => {
    return await triggerEvent('user_signup', {
      user_name: userData.userName || 'there',
      platform_name: 'Our Platform',
      plan_type: userData.planType || 'free'
    })
  }, [triggerEvent])

  const triggerOnboardingTip = useCallback(async (stepData: {
    stepName?: string
    tipContent?: string
  } = {}) => {
    return await triggerEvent('onboarding_step_completed', {
      step_name: stepData.stepName || 'profile_setup',
      tip_content: stepData.tipContent || 'Great job! You\'re making excellent progress.'
    })
  }, [triggerEvent])

  const triggerFeatureHighlight = useCallback(async (featureData: {
    featureName?: string
    benefitDescription?: string
  } = {}) => {
    return await triggerEvent('feature_first_use', {
      feature_name: featureData.featureName || 'new feature',
      benefit_description: featureData.benefitDescription || 'improve your workflow'
    })
  }, [triggerEvent])

  const triggerMilestone = useCallback(async (milestoneData: {
    milestone?: string
    achievement?: string
  } = {}) => {
    return await triggerEvent('usage_milestone', {
      milestone: milestoneData.milestone || '100 actions completed',
      achievement: milestoneData.achievement || 'You\'re becoming a power user!'
    })
  }, [triggerEvent])

  return {
    triggerWelcome,
    triggerOnboardingTip,
    triggerFeatureHighlight,
    triggerMilestone
  }
}

// Hook for message analytics (admin use)
export function useMessageAnalytics(organizationId?: string, timeRange = '30d') {
  const [analytics, setAnalytics] = useState<UseInAppMessagesReturn['analytics']>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const analyticsData = await getMessageAnalytics(organizationId, timeRange)
      setAnalytics(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [organizationId, timeRange])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  return {
    analytics,
    isLoading,
    error,
    refresh: loadAnalytics
  }
}