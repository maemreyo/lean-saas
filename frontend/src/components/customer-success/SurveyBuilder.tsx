'use client'

import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Eye, 
  Copy,
  ArrowUp,
  ArrowDown,
  Settings,
  Type,
  List,
  ToggleLeft,
  Star,
  Hash,
  Calendar,
  Mail,
  Link,
  FileText,
  Play,
  Pause
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { ProductSurvey, SurveyQuestion, QuestionType, SurveyType } from '@/shared/types/customer-success'

interface SurveyBuilderProps {
  surveyId?: string
  userId: string
  organizationId?: string
  onSave?: (survey: ProductSurvey) => void
  onPreview?: (survey: ProductSurvey) => void
  className?: string
}

interface QuestionBuilderProps {
  question: SurveyQuestion
  index: number
  onUpdate: (question: SurveyQuestion) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}

interface SurveyPreviewProps {
  survey: ProductSurvey
  questions: SurveyQuestion[]
  onClose: () => void
}

const QuestionBuilder: React.FC<QuestionBuilderProps> = ({
  question,
  index,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [localQuestion, setLocalQuestion] = useState(question)

  const questionTypes: { type: QuestionType; label: string; icon: React.ReactNode }[] = [
    { type: 'text', label: 'Text Input', icon: <Type className="w-4 h-4" /> },
    { type: 'textarea', label: 'Long Text', icon: <FileText className="w-4 h-4" /> },
    { type: 'multiple_choice', label: 'Multiple Choice', icon: <List className="w-4 h-4" /> },
    { type: 'single_choice', label: 'Single Choice', icon: <ToggleLeft className="w-4 h-4" /> },
    { type: 'rating', label: 'Rating Scale', icon: <Star className="w-4 h-4" /> },
    { type: 'number', label: 'Number', icon: <Hash className="w-4 h-4" /> },
    { type: 'date', label: 'Date', icon: <Calendar className="w-4 h-4" /> },
    { type: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
    { type: 'url', label: 'URL', icon: <Link className="w-4 h-4" /> }
  ]

  const handleSave = () => {
    onUpdate(localQuestion)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setLocalQuestion(question)
    setIsEditing(false)
  }

  const addOption = () => {
    const newOptions = [...(localQuestion.options || []), '']
    setLocalQuestion({ ...localQuestion, options: newOptions })
  }

  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...(localQuestion.options || [])]
    newOptions[optionIndex] = value
    setLocalQuestion({ ...localQuestion, options: newOptions })
  }

  const removeOption = (optionIndex: number) => {
    const newOptions = (localQuestion.options || []).filter((_, i) => i !== optionIndex)
    setLocalQuestion({ ...localQuestion, options: newOptions })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
            {index + 1}
          </div>
          <h4 className="font-medium text-gray-900">
            {isEditing ? 'Editing Question' : question.question_text || 'New Question'}
          </h4>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveUp}
            disabled={!canMoveUp}
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveDown}
            disabled={!canMoveDown}
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Type
            </label>
            <select
              value={localQuestion.question_type}
              onChange={(e) => setLocalQuestion({ 
                ...localQuestion, 
                question_type: e.target.value as QuestionType,
                options: ['multiple_choice', 'single_choice'].includes(e.target.value) ? [''] : undefined
              })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {questionTypes.map((type) => (
                <option key={type.type} value={type.type}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Text *
            </label>
            <textarea
              value={localQuestion.question_text}
              onChange={(e) => setLocalQuestion({ ...localQuestion, question_text: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Enter your question..."
              required
            />
          </div>

          {/* Question Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <input
              type="text"
              value={localQuestion.description || ''}
              onChange={(e) => setLocalQuestion({ ...localQuestion, description: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional context for this question..."
            />
          </div>

          {/* Options for choice questions */}
          {(['multiple_choice', 'single_choice'].includes(localQuestion.question_type)) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Answer Options
              </label>
              <div className="space-y-2">
                {(localQuestion.options || []).map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(optionIndex, e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Option ${optionIndex + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(optionIndex)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {/* Rating scale configuration */}
          {localQuestion.question_type === 'rating' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Value
                </label>
                <input
                  type="number"
                  value={localQuestion.metadata?.min_value || 1}
                  onChange={(e) => setLocalQuestion({ 
                    ...localQuestion, 
                    metadata: { ...localQuestion.metadata, min_value: parseInt(e.target.value) }
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Value
                </label>
                <input
                  type="number"
                  value={localQuestion.metadata?.max_value || 5}
                  onChange={(e) => setLocalQuestion({ 
                    ...localQuestion, 
                    metadata: { ...localQuestion.metadata, max_value: parseInt(e.target.value) }
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="20"
                />
              </div>
            </div>
          )}

          {/* Question Settings */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localQuestion.is_required || false}
                onChange={(e) => setLocalQuestion({ ...localQuestion, is_required: e.target.checked })}
                className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Required</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSave} size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" onClick={handleCancel} size="sm">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {questionTypes.find(t => t.type === question.question_type)?.icon}
            <Badge variant="outline">
              {questionTypes.find(t => t.type === question.question_type)?.label}
            </Badge>
            {question.is_required && (
              <Badge variant="outline" className="text-red-600 border-red-300">
                Required
              </Badge>
            )}
          </div>
          
          <div>
            <p className="font-medium text-gray-900">{question.question_text}</p>
            {question.description && (
              <p className="text-sm text-gray-600 mt-1">{question.description}</p>
            )}
          </div>

          {question.options && question.options.length > 0 && (
            <div className="ml-4">
              <p className="text-sm text-gray-600 mb-2">Options:</p>
              <ul className="space-y-1 text-sm text-gray-700">
                {question.options.map((option, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-4 h-4 border border-gray-300 rounded-sm"></span>
                    {option}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SurveyPreview: React.FC<SurveyPreviewProps> = ({ survey, questions, onClose }) => {
  const [responses, setResponses] = useState<Record<string, any>>({})

  const handleResponse = (questionId: string, value: any) => {
    setResponses(prev => ({ ...prev, [questionId]: value }))
  }

  const renderQuestion = (question: SurveyQuestion, index: number) => {
    const value = responses[question.id] || ''

    switch (question.question_type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <input
            type={question.question_type === 'email' ? 'email' : question.question_type === 'url' ? 'url' : 'text'}
            value={value}
            onChange={(e) => handleResponse(question.id, e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your answer..."
            required={question.is_required}
          />
        )

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleResponse(question.id, e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            placeholder="Your answer..."
            required={question.is_required}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleResponse(question.id, e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter a number..."
            required={question.is_required}
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleResponse(question.id, e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={question.is_required}
          />
        )

      case 'single_choice':
        return (
          <div className="space-y-2">
            {(question.options || []).map((option, optionIndex) => (
              <label key={optionIndex} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleResponse(question.id, e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                  required={question.is_required}
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )

      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {(question.options || []).map((option, optionIndex) => (
              <label key={optionIndex} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  value={option}
                  checked={(value || []).includes(option)}
                  onChange={(e) => {
                    const currentValues = value || []
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter((v: string) => v !== option)
                    handleResponse(question.id, newValues)
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )

      case 'rating':
        const minValue = question.metadata?.min_value || 1
        const maxValue = question.metadata?.max_value || 5
        return (
          <div className="flex items-center gap-2">
            {Array.from({ length: maxValue - minValue + 1 }, (_, i) => minValue + i).map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleResponse(question.id, rating)}
                className={`w-10 h-10 rounded-full border-2 transition-colors ${
                  value === rating
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        )

      default:
        return (
          <div className="text-gray-500 italic">
            Question type "{question.question_type}" not implemented in preview
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Survey Preview</h3>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{survey.title}</h2>
            {survey.description && (
              <p className="text-gray-600">{survey.description}</p>
            )}
          </div>

          <form className="space-y-6">
            {questions.map((question, index) => (
              <div key={question.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {question.question_text}
                      {question.is_required && <span className="text-red-500 ml-1">*</span>}
                    </h4>
                    {question.description && (
                      <p className="text-sm text-gray-600 mb-3">{question.description}</p>
                    )}
                    {renderQuestion(question, index)}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-3 pt-6 border-t">
              <Button type="button" className="flex-1">
                Submit Survey
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Close Preview
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export const SurveyBuilder: React.FC<SurveyBuilderProps> = ({
  surveyId,
  userId,
  organizationId,
  onSave,
  onPreview,
  className = ''
}) => {
  const [survey, setSurvey] = useState<Partial<ProductSurvey>>({
    title: '',
    description: '',
    survey_type: 'nps',
    is_active: true
  })
  
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [activeTab, setActiveTab] = useState('builder')

  const surveyTypes: { type: SurveyType; label: string; description: string }[] = [
    { type: 'nps', label: 'Net Promoter Score', description: 'Measure customer loyalty and satisfaction' },
    { type: 'csat', label: 'Customer Satisfaction', description: 'Track satisfaction with specific interactions' },
    { type: 'onboarding_feedback', label: 'Onboarding Feedback', description: 'Collect feedback on the onboarding process' },
    { type: 'feature_feedback', label: 'Feature Feedback', description: 'Get input on specific features' },
    { type: 'churn_survey', label: 'Churn Survey', description: 'Understand why customers are leaving' },
    { type: 'product_feedback', label: 'Product Feedback', description: 'General product improvement feedback' }
  ]

  const addQuestion = () => {
    const newQuestion: SurveyQuestion = {
      id: `question_${Date.now()}`,
      survey_id: survey.id || '',
      question_text: '',
      question_type: 'text',
      question_order: questions.length,
      is_required: false,
      options: undefined,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (index: number, updatedQuestion: SurveyQuestion) => {
    const newQuestions = [...questions]
    newQuestions[index] = updatedQuestion
    setQuestions(newQuestions)
  }

  const deleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index)
    // Reorder remaining questions
    const reorderedQuestions = newQuestions.map((q, i) => ({ ...q, question_order: i }))
    setQuestions(reorderedQuestions)
  }

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex >= 0 && targetIndex < questions.length) {
      // Swap questions
      [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]]
      
      // Update order
      newQuestions[index].question_order = index
      newQuestions[targetIndex].question_order = targetIndex
      
      setQuestions(newQuestions)
    }
  }

  const handleSave = () => {
    const completeSurvey = {
      ...survey,
      id: survey.id || `survey_${Date.now()}`,
      user_id: userId,
      organization_id: organizationId,
      created_at: survey.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as ProductSurvey

    if (onSave) {
      onSave(completeSurvey)
    }
  }

  const handlePreview = () => {
    if (questions.length === 0) {
      alert('Please add at least one question before previewing.')
      return
    }
    setShowPreview(true)
  }

  const duplicateQuestion = (index: number) => {
    const questionToDuplicate = questions[index]
    const duplicatedQuestion: SurveyQuestion = {
      ...questionToDuplicate,
      id: `question_${Date.now()}`,
      question_order: questions.length,
      question_text: `${questionToDuplicate.question_text} (Copy)`
    }
    setQuestions([...questions, duplicatedQuestion])
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Survey Builder</h2>
        <p className="text-gray-600">Create and customize surveys to collect customer feedback</p>
      </div>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="logic">Logic</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-6">
            {/* Survey Basic Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-gray-900">Survey Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Survey Title *
                  </label>
                  <input
                    type="text"
                    value={survey.title}
                    onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter survey title..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Survey Type
                  </label>
                  <select
                    value={survey.survey_type}
                    onChange={(e) => setSurvey({ ...survey, survey_type: e.target.value as SurveyType })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {surveyTypes.map((type) => (
                      <option key={type.type} value={type.type}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={survey.description || ''}
                  onChange={(e) => setSurvey({ ...survey, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Describe the purpose of this survey..."
                />
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Questions ({questions.length})</h3>
                <Button onClick={addQuestion}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="font-medium text-gray-900 mb-2">No Questions Yet</h4>
                  <p className="text-gray-600 mb-4">Start building your survey by adding your first question.</p>
                  <Button onClick={addQuestion}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Question
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <QuestionBuilder
                      key={question.id}
                      question={question}
                      index={index}
                      onUpdate={(updatedQuestion) => updateQuestion(index, updatedQuestion)}
                      onDelete={() => deleteQuestion(index)}
                      onMoveUp={() => moveQuestion(index, 'up')}
                      onMoveDown={() => moveQuestion(index, 'down')}
                      canMoveUp={index > 0}
                      canMoveDown={index < questions.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t">
              <Button onClick={handleSave} disabled={!survey.title || questions.length === 0}>
                <Save className="w-4 h-4 mr-2" />
                Save Survey
              </Button>
              <Button variant="outline" onClick={handlePreview} disabled={questions.length === 0}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Survey Settings</h3>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={survey.is_active || false}
                    onChange={(e) => setSurvey({ ...survey, is_active: e.target.checked })}
                    className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Active Survey</span>
                    <p className="text-sm text-gray-600">Allow responses to be collected</p>
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thank You Message
                  </label>
                  <textarea
                    value={survey.metadata?.thank_you_message || ''}
                    onChange={(e) => setSurvey({ 
                      ...survey, 
                      metadata: { 
                        ...survey.metadata, 
                        thank_you_message: e.target.value 
                      }
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Thank you for your feedback!"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logic" className="space-y-6">
            <div className="text-center py-12">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="font-medium text-gray-900 mb-2">Advanced Logic</h4>
              <p className="text-gray-600">
                Conditional logic and branching will be available in future updates.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <SurveyPreview
          survey={survey as ProductSurvey}
          questions={questions}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}