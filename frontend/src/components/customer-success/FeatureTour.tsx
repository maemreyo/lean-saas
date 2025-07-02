'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Play, 
  Pause,
  SkipForward,
  Target,
  Lightbulb,
  CheckCircle,
  Circle,
  Minimize2,
  Maximize2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { useFeatureTours } from '@/hooks/customer-success/useFeatureTours'
import { FeatureTour as FeatureTourType, TourStep } from '@/shared/types/customer-success'

interface FeatureTourProps {
  tourId?: string
  userId: string
  organizationId?: string
  autoStart?: boolean
  onComplete?: (tour: FeatureTourType) => void
  onSkip?: () => void
  onClose?: () => void
  className?: string
}

interface TourOverlayProps {
  step: TourStep
  isVisible: boolean
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
  onClose: () => void
  currentStepIndex: number
  totalSteps: number
  isFirstStep: boolean
  isLastStep: boolean
}

interface TourStepHighlightProps {
  selector: string
  step: TourStep
  children: React.ReactNode
}

const TourStepHighlight: React.FC<TourStepHighlightProps> = ({ 
  selector, 
  step, 
  children 
}) => {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 })

  useEffect(() => {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      setTargetElement(element)
      
      const updatePosition = () => {
        const rect = element.getBoundingClientRect()
        setPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        })
      }

      updatePosition()
      window.addEventListener('scroll', updatePosition)
      window.addEventListener('resize', updatePosition)

      // Add highlight class to target element
      element.classList.add('tour-highlight')
      element.style.position = 'relative'
      element.style.zIndex = '1001'

      return () => {
        window.removeEventListener('scroll', updatePosition)
        window.removeEventListener('resize', updatePosition)
        element.classList.remove('tour-highlight')
        element.style.position = ''
        element.style.zIndex = ''
      }
    }
  }, [selector])

  if (!targetElement) return null

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-1000" />
      
      {/* Highlight spotlight */}
      <div
        className="fixed border-4 border-blue-500 rounded-lg shadow-lg z-1000 pointer-events-none"
        style={{
          top: position.top - 4,
          left: position.left - 4,
          width: position.width + 8,
          height: position.height + 8,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
        }}
      />

      {/* Tour content */}
      {children}
    </>
  )
}

const TourOverlay: React.FC<TourOverlayProps> = ({
  step,
  isVisible,
  onNext,
  onPrevious,
  onSkip,
  onClose,
  currentStepIndex,
  totalSteps,
  isFirstStep,
  isLastStep
}) => {
  const [overlayPosition, setOverlayPosition] = useState({ top: 0, left: 0 })
  
  useEffect(() => {
    if (step.target_selector && isVisible) {
      const targetElement = document.querySelector(step.target_selector) as HTMLElement
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect()
        const scrollY = window.scrollY
        
        // Position the overlay near the target element
        let top = rect.bottom + scrollY + 20
        let left = rect.left
        
        // Adjust if overlay would go off screen
        const overlayWidth = 400
        const overlayHeight = 200
        
        if (left + overlayWidth > window.innerWidth) {
          left = window.innerWidth - overlayWidth - 20
        }
        
        if (left < 20) {
          left = 20
        }
        
        if (top + overlayHeight > window.innerHeight + scrollY) {
          top = rect.top + scrollY - overlayHeight - 20
        }

        setOverlayPosition({ top, left })
      }
    }
  }, [step.target_selector, isVisible])

  if (!isVisible) return null

  return (
    <div
      className="fixed z-1002 bg-white rounded-lg shadow-xl border max-w-md"
      style={{
        top: overlayPosition.top,
        left: overlayPosition.left
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              Step {currentStepIndex + 1} of {totalSteps}
            </h3>
            <p className="text-xs text-gray-500">{step.title}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress */}
      <div className="px-4 pt-2">
        <Progress value={(currentStepIndex + 1) / totalSteps * 100} className="w-full" />
      </div>

      {/* Content */}
      <div className="p-4">
        <h4 className="font-medium text-gray-900 mb-2">{step.title}</h4>
        <p className="text-gray-600 text-sm mb-4">{step.content}</p>

        {step.tip && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-blue-800 text-sm">{step.tip}</p>
            </div>
          </div>
        )}

        {step.action_required && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-yellow-800 text-sm font-medium">
              Action Required: {step.action_required}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t bg-gray-50 rounded-b-lg">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-gray-500"
          >
            Skip Tour
          </Button>
        </div>

        <div className="flex gap-2">
          {!isFirstStep && (
            <Button variant="outline" size="sm" onClick={onPrevious}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <Button size="sm" onClick={onNext}>
            {isLastStep ? 'Finish' : 'Next'}
            {!isLastStep && <ArrowRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

export const FeatureTour: React.FC<FeatureTourProps> = ({
  tourId,
  userId,
  organizationId,
  autoStart = false,
  onComplete,
  onSkip,
  onClose,
  className = ''
}) => {
  const {
    currentTour,
    steps,
    currentStepIndex,
    isActive,
    isLoading,
    error,
    startTour,
    nextStep,
    previousStep,
    skipTour,
    completeTour,
    pauseTour,
    resumeTour
  } = useFeatureTours(userId, organizationId)

  const [isMinimized, setIsMinimized] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (autoStart && tourId && !isActive) {
      startTour(tourId)
    }
  }, [autoStart, tourId, isActive, startTour])

  const handleNext = async () => {
    const isLastStep = currentStepIndex === steps.length - 1
    
    if (isLastStep) {
      const completed = await completeTour()
      if (completed && onComplete) {
        onComplete(completed)
      }
    } else {
      await nextStep()
    }
  }

  const handlePrevious = async () => {
    if (currentStepIndex > 0) {
      await previousStep()
    }
  }

  const handleSkip = async () => {
    await skipTour()
    if (onSkip) {
      onSkip()
    }
  }

  const handleClose = async () => {
    await pauseTour()
    if (onClose) {
      onClose()
    }
  }

  const handlePause = async () => {
    setIsPaused(true)
    await pauseTour()
  }

  const handleResume = async () => {
    setIsPaused(false)
    await resumeTour()
  }

  // Don't render if no active tour
  if (!isActive || !currentTour || !steps.length) {
    return null
  }

  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  // Minimized state
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-white rounded-lg shadow-lg border p-4 max-w-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{currentTour.title}</h4>
                <p className="text-sm text-gray-600">
                  Step {currentStepIndex + 1} of {steps.length}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(false)}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Progress value={(currentStepIndex + 1) / steps.length * 100} className="w-full mt-3" />
        </div>
      </div>
    )
  }

  // Paused state
  if (isPaused) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl border p-6 max-w-md">
          <div className="text-center">
            <Pause className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Tour Paused</h3>
            <p className="text-gray-600 mb-6">
              Your tour "{currentTour.title}" has been paused. You can resume it anytime.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleSkip}>
                End Tour
              </Button>
              <Button onClick={handleResume}>
                <Play className="w-4 h-4 mr-2" />
                Resume Tour
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm">
          <div className="flex items-center gap-3 mb-3">
            <X className="w-5 h-5 text-red-500" />
            <h4 className="font-medium text-red-800">Tour Error</h4>
          </div>
          <p className="text-red-700 text-sm mb-3">{error}</p>
          <Button variant="outline" onClick={handleClose} size="sm">
            Close
          </Button>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-white rounded-lg shadow-lg border p-4">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Tour Controls */}
      <div className="fixed top-6 right-6 z-1003 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMinimized(true)}
        >
          <Minimize2 className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePause}
        >
          <Pause className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSkip}
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      {/* Step Navigation Dots */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-1003">
        <div className="bg-white rounded-full shadow-lg border px-4 py-2">
          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStepIndex
                    ? 'bg-blue-600'
                    : index < currentStepIndex
                    ? 'bg-green-600'
                    : 'bg-gray-300'
                }`}
                onClick={() => {
                  // Could implement step jumping here
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Tour Content */}
      {currentStep.target_selector ? (
        <TourStepHighlight
          selector={currentStep.target_selector}
          step={currentStep}
        >
          <TourOverlay
            step={currentStep}
            isVisible={true}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSkip={handleSkip}
            onClose={handleClose}
            currentStepIndex={currentStepIndex}
            totalSteps={steps.length}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
          />
        </TourStepHighlight>
      ) : (
        // Center overlay for steps without specific targets
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-1000">
          <TourOverlay
            step={currentStep}
            isVisible={true}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSkip={handleSkip}
            onClose={handleClose}
            currentStepIndex={currentStepIndex}
            totalSteps={steps.length}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
          />
        </div>
      )}
    </>
  )
}