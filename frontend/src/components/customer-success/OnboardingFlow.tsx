'use client'

import React, { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, Check, X, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { useOnboarding } from '@/hooks/customer-success/useOnboarding'
import { UserOnboarding, OnboardingStep } from '@/shared/types/customer-success'

interface OnboardingFlowProps {
  flowName?: string
  userId: string
  organizationId?: string
  onComplete?: (completion: UserOnboarding) => void
  onSkip?: () => void
  className?: string
}

interface StepComponentProps {
  step: OnboardingStep
  isActive: boolean
  isCompleted: boolean
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
}

const StepComponent: React.FC<StepComponentProps> = ({
  step,
  isActive,
  isCompleted,
  onNext,
  onPrevious,
  onSkip
}) => {
  if (!isActive) return null

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isCompleted 
              ? 'bg-green-100 text-green-600' 
              : 'bg-blue-100 text-blue-600'
          }`}>
            {isCompleted ? <Check className="w-4 h-4" /> : step.step_number}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
        </div>
        <Badge variant={isCompleted ? 'success' : 'default'}>
          {isCompleted ? 'Completed' : 'In Progress'}
        </Badge>
      </div>

      <div className="mb-6">
        <p className="text-gray-600 mb-4">{step.description}</p>
        
        {step.content && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div dangerouslySetInnerHTML={{ __html: step.content }} />
          </div>
        )}

        {step.call_to_action && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 font-medium">{step.call_to_action}</p>
            {step.action_url && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => window.open(step.action_url, '_blank')}
              >
                <Play className="w-4 h-4 mr-2" />
                Take Action
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={step.step_number === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-gray-500"
          >
            Skip Step
          </Button>
          <Button onClick={onNext}>
            {step.is_final_step ? 'Complete' : 'Next'}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  flowName = 'default',
  userId,
  organizationId,
  onComplete,
  onSkip,
  className = ''
}) => {
  const {
    onboarding,
    steps,
    currentStep,
    isLoading,
    error,
    startOnboarding,
    updateProgress,
    completeOnboarding,
    skipStep,
    restartOnboarding
  } = useOnboarding(userId, organizationId)

  const [isMinimized, setIsMinimized] = useState(false)

  useEffect(() => {
    if (!onboarding && !isLoading) {
      startOnboarding(flowName)
    }
  }, [onboarding, isLoading, startOnboarding, flowName])

  const handleNext = async () => {
    if (!onboarding || !currentStep) return

    const nextStepNumber = currentStep.step_number + 1
    
    if (currentStep.is_final_step) {
      const completed = await completeOnboarding()
      if (completed && onComplete) {
        onComplete(completed)
      }
    } else {
      await updateProgress(nextStepNumber, {
        completed_step: currentStep.step_number,
        timestamp: new Date().toISOString()
      })
    }
  }

  const handlePrevious = async () => {
    if (!onboarding || !currentStep || currentStep.step_number <= 1) return
    
    const previousStepNumber = currentStep.step_number - 1
    await updateProgress(previousStepNumber)
  }

  const handleSkip = async () => {
    if (!onboarding || !currentStep) return
    
    await skipStep(currentStep.step_number)
    
    if (currentStep.is_final_step) {
      if (onSkip) onSkip()
    }
  }

  const handleRestart = async () => {
    await restartOnboarding(flowName)
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <X className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-red-800">Onboarding Error</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <Button variant="outline" onClick={handleRestart}>
          Restart Onboarding
        </Button>
      </div>
    )
  }

  if (!onboarding || !currentStep) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}>
        <p className="text-gray-600">No onboarding flow available.</p>
        <Button onClick={() => startOnboarding(flowName)} className="mt-4">
          Start Onboarding
        </Button>
      </div>
    )
  }

  // Completed state
  if (onboarding.status === 'completed') {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Check className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-green-800">Onboarding Complete!</h3>
        </div>
        <p className="text-green-700 mb-4">
          Congratulations! You've completed the onboarding process. You're all set to get started.
        </p>
        <div className="flex gap-3">
          <Button onClick={handleRestart} variant="outline">
            Restart Onboarding
          </Button>
          <Button onClick={() => setIsMinimized(true)}>
            Continue to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-800">Onboarding in Progress</h4>
              <p className="text-sm text-blue-600">
                Step {onboarding.current_step} of {onboarding.total_steps}
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={() => setIsMinimized(false)}
          >
            Continue
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Welcome Onboarding</h2>
            <p className="text-gray-600">
              Let's get you set up for success
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
            >
              <Pause className="w-4 h-4 mr-2" />
              Minimize
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {onboarding.current_step} of {onboarding.total_steps}
            </span>
            <span className="text-sm text-gray-500">
              {onboarding.completion_percentage}% complete
            </span>
          </div>
          <Progress value={onboarding.completion_percentage} className="w-full" />
        </div>

        {/* Steps Overview */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {steps.map((step) => (
            <div
              key={step.step_number}
              className={`flex-shrink-0 w-24 h-16 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                step.step_number === onboarding.current_step
                  ? 'border-blue-500 bg-blue-50'
                  : step.step_number < onboarding.current_step
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
              onClick={() => updateProgress(step.step_number)}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step.step_number === onboarding.current_step
                  ? 'bg-blue-500 text-white'
                  : step.step_number < onboarding.current_step
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {step.step_number < onboarding.current_step ? (
                  <Check className="w-3 h-3" />
                ) : (
                  step.step_number
                )}
              </div>
              <span className="text-xs text-center mt-1 leading-tight">
                {step.title.substring(0, 12)}...
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Step */}
      <StepComponent
        step={currentStep}
        isActive={true}
        isCompleted={currentStep.step_number < onboarding.current_step}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSkip={handleSkip}
      />
    </div>
  )
}