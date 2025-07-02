'use client'

import React, { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  Star, 
  ThumbsUp, 
  ThumbsDown,
  Send,
  X,
  Heart,
  Frown,
  Meh,
  Smile,
  Minimize2,
  Maximize2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useFeedback } from '@/hooks/customer-success/useFeedback'
import { FeedbackType } from '@/shared/types/customer-success'

interface FeedbackWidgetProps {
  userId: string
  organizationId?: string
  position?: 'bottom-right' | 'bottom-left' | 'center'
  showTypes?: FeedbackType[]
  onSubmit?: (feedback: any) => void
  onClose?: () => void
  className?: string
}

interface NPSWidgetProps {
  onSubmit: (score: number, comment?: string) => void
  onClose: () => void
}

interface RatingWidgetProps {
  onSubmit: (rating: number, comment?: string) => void
  onClose: () => void
}

interface CommentWidgetProps {
  onSubmit: (comment: string, type: FeedbackType) => void
  onClose: () => void
}

const NPSWidget: React.FC<NPSWidgetProps> = ({ onSubmit, onClose }) => {
  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [step, setStep] = useState<'score' | 'comment'>('score')

  const handleScoreSelect = (score: number) => {
    setSelectedScore(score)
    setStep('comment')
  }

  const handleSubmit = () => {
    if (selectedScore !== null) {
      onSubmit(selectedScore, comment.trim() || undefined)
    }
  }

  const getScoreLabel = (score: number) => {
    if (score >= 9) return 'Promoter'
    if (score >= 7) return 'Passive'
    return 'Detractor'
  }

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'text-green-600'
    if (score >= 7) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">How likely are you to recommend us?</h3>
        <p className="text-sm text-gray-600">Rate from 0 (not likely) to 10 (very likely)</p>
      </div>

      {step === 'score' && (
        <div className="space-y-4">
          <div className="grid grid-cols-11 gap-1">
            {[...Array(11)].map((_, i) => (
              <button
                key={i}
                onClick={() => handleScoreSelect(i)}
                className={`h-12 rounded-lg border-2 transition-all font-medium ${
                  selectedScore === i
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Not likely</span>
            <span>Very likely</span>
          </div>
        </div>
      )}

      {step === 'comment' && selectedScore !== null && (
        <div className="space-y-4">
          <div className="text-center">
            <div className={`text-lg font-semibold ${getScoreColor(selectedScore)}`}>
              Score: {selectedScore} ({getScoreLabel(selectedScore)})
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tell us more (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="What's the main reason for your score?"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('score')}>
              Back
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              Submit Feedback
            </Button>
          </div>
        </div>
      )}

      <Button variant="ghost" onClick={onClose} className="w-full">
        Skip for now
      </Button>
    </div>
  )
}

const RatingWidget: React.FC<RatingWidgetProps> = ({ onSubmit, onClose }) => {
  const [rating, setRating] = useState<number>(0)
  const [comment, setComment] = useState('')

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, comment.trim() || undefined)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Rate your experience</h3>
        <p className="text-sm text-gray-600">How satisfied are you with our service?</p>
      </div>

      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="p-1 transition-colors"
          >
            <Star
              className={`w-8 h-8 ${
                star <= rating 
                  ? 'text-yellow-400 fill-yellow-400' 
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>

      {rating > 0 && (
        <div className="text-center">
          <span className="text-sm text-gray-600">
            {rating === 1 && 'Very Dissatisfied'}
            {rating === 2 && 'Dissatisfied'}
            {rating === 3 && 'Neutral'}
            {rating === 4 && 'Satisfied'}
            {rating === 5 && 'Very Satisfied'}
          </span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional comments (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder="Tell us more about your experience..."
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={rating === 0} className="flex-1">
          Submit Rating
        </Button>
      </div>
    </div>
  )
}

const CommentWidget: React.FC<CommentWidgetProps> = ({ onSubmit, onClose }) => {
  const [comment, setComment] = useState('')
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('comment')

  const handleSubmit = () => {
    if (comment.trim()) {
      onSubmit(comment.trim(), feedbackType)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Share your feedback</h3>
        <p className="text-sm text-gray-600">Help us improve your experience</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFeedbackType('comment')}
          className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
            feedbackType === 'comment'
              ? 'border-blue-500 bg-blue-50 text-blue-600'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <MessageSquare className="w-4 h-4 mx-auto mb-1" />
          General
        </button>
        <button
          onClick={() => setFeedbackType('bug_report')}
          className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
            feedbackType === 'bug_report'
              ? 'border-red-500 bg-red-50 text-red-600'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <X className="w-4 h-4 mx-auto mb-1" />
          Bug Report
        </button>
        <button
          onClick={() => setFeedbackType('feature_request')}
          className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
            feedbackType === 'feature_request'
              ? 'border-green-500 bg-green-50 text-green-600'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <Star className="w-4 h-4 mx-auto mb-1" />
          Feature Request
        </button>
      </div>

      <div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          placeholder={
            feedbackType === 'bug_report'
              ? 'Describe the bug you encountered...'
              : feedbackType === 'feature_request'
              ? 'Describe the feature you would like to see...'
              : 'Share your thoughts with us...'
          }
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!comment.trim()} className="flex-1">
          <Send className="w-4 h-4 mr-2" />
          Submit Feedback
        </Button>
      </div>
    </div>
  )
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  userId,
  organizationId,
  position = 'bottom-right',
  showTypes = ['nps', 'rating', 'comment'],
  onSubmit,
  onClose,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeType, setActiveType] = useState<FeedbackType | null>(null)

  const {
    submitFeedback,
    isLoading,
    error
  } = useFeedback(userId, organizationId)

  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6 z-50',
    'bottom-left': 'fixed bottom-6 left-6 z-50',
    'center': 'mx-auto max-w-md'
  }

  const handleFeedbackSubmit = async (data: any, type: FeedbackType) => {
    try {
      await submitFeedback({
        type,
        ...data
      })
      
      if (onSubmit) {
        onSubmit({ type, ...data })
      }
      
      setIsOpen(false)
      setActiveType(null)
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setActiveType(null)
    if (onClose) {
      onClose()
    }
  }

  if (!isOpen && position !== 'center') {
    return (
      <div className={positionClasses[position]}>
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 shadow-lg"
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      </div>
    )
  }

  if (!isOpen && position === 'center') {
    return null
  }

  return (
    <div className={`${position !== 'center' ? positionClasses[position] : ''} ${className}`}>
      <div className="bg-white rounded-lg shadow-xl border max-w-sm w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Feedback</h3>
          </div>
          <div className="flex gap-2">
            {position !== 'center' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="p-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {!activeType && (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Help us improve by sharing your feedback
                </p>

                <div className="space-y-3">
                  {showTypes.includes('nps') && (
                    <Button
                      variant="outline"
                      onClick={() => setActiveType('nps')}
                      className="w-full justify-start"
                    >
                      <Heart className="w-4 h-4 mr-3 text-pink-500" />
                      <div className="text-left">
                        <div className="font-medium">Rate Recommendation</div>
                        <div className="text-xs text-gray-500">Net Promoter Score</div>
                      </div>
                    </Button>
                  )}

                  {showTypes.includes('rating') && (
                    <Button
                      variant="outline"
                      onClick={() => setActiveType('rating')}
                      className="w-full justify-start"
                    >
                      <Star className="w-4 h-4 mr-3 text-yellow-500" />
                      <div className="text-left">
                        <div className="font-medium">Rate Experience</div>
                        <div className="text-xs text-gray-500">5-star rating</div>
                      </div>
                    </Button>
                  )}

                  {showTypes.includes('comment') && (
                    <Button
                      variant="outline"
                      onClick={() => setActiveType('comment')}
                      className="w-full justify-start"
                    >
                      <MessageSquare className="w-4 h-4 mr-3 text-blue-500" />
                      <div className="text-left">
                        <div className="font-medium">Share Comments</div>
                        <div className="text-xs text-gray-500">General feedback</div>
                      </div>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {activeType === 'nps' && (
              <NPSWidget
                onSubmit={(score, comment) => handleFeedbackSubmit({ score, comment }, 'nps')}
                onClose={() => setActiveType(null)}
              />
            )}

            {activeType === 'rating' && (
              <RatingWidget
                onSubmit={(rating, comment) => handleFeedbackSubmit({ rating, comment }, 'rating')}
                onClose={() => setActiveType(null)}
              />
            )}

            {activeType === 'comment' && (
              <CommentWidget
                onSubmit={(comment, type) => handleFeedbackSubmit({ comment }, type)}
                onClose={() => setActiveType(null)}
              />
            )}

            {isLoading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Submitting feedback...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}