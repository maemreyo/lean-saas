'use client'

import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Book, 
  FileText, 
  Tag, 
  Clock, 
  User,
  ChevronRight,
  Star,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Filter,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Bookmark,
  Share2,
  Copy,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { KnowledgeArticle, ArticleStatus } from '@/shared/types/customer-success'

interface KnowledgeBaseProps {
  userId?: string
  organizationId?: string
  isAdminView?: boolean
  onArticleSelect?: (article: KnowledgeArticle) => void
  className?: string
}

interface ArticleCardProps {
  article: KnowledgeArticle
  onSelect: () => void
  onEdit?: () => void
  onDelete?: () => void
  showActions?: boolean
  compact?: boolean
}

interface CategorySidebarProps {
  categories: string[]
  selectedCategory: string | null
  onCategorySelect: (category: string | null) => void
  articleCounts: Record<string, number>
}

interface ArticleViewerProps {
  article: KnowledgeArticle
  onClose: () => void
  onRate?: (rating: number) => void
  onBookmark?: () => void
  onShare?: () => void
}

const ArticleCard: React.FC<ArticleCardProps> = ({ 
  article, 
  onSelect, 
  onEdit, 
  onDelete, 
  showActions = false,
  compact = false 
}) => {
  const getStatusColor = (status: ArticleStatus) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'under_review': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${
      compact ? 'cursor-pointer' : ''
    }`} onClick={compact ? onSelect : undefined}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className={`font-medium text-gray-900 hover:text-blue-600 cursor-pointer ${
            compact ? 'text-sm' : 'text-base'
          }`} onClick={onSelect}>
            {article.title}
          </h3>
          {article.excerpt && (
            <p className={`text-gray-600 mt-1 line-clamp-2 ${
              compact ? 'text-xs' : 'text-sm'
            }`}>
              {article.excerpt}
            </p>
          )}
        </div>
        
        {showActions && (
          <div className="flex gap-2 ml-4">
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {article.category && (
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {article.category}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(article.updated_at).toLocaleDateString()}
          </span>
          {article.view_count && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {article.view_count}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {article.helpful_count && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <ThumbsUp className="w-3 h-3" />
              {article.helpful_count}
            </div>
          )}
          <Badge className={getStatusColor(article.status)}>
            {article.status}
          </Badge>
        </div>
      </div>
    </div>
  )
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({ 
  categories, 
  selectedCategory, 
  onCategorySelect,
  articleCounts 
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-medium text-gray-900 mb-4">Categories</h3>
      
      <div className="space-y-2">
        <button
          onClick={() => onCategorySelect(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            selectedCategory === null
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>All Articles</span>
            <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
              {Object.values(articleCounts).reduce((a, b) => a + b, 0)}
            </span>
          </div>
        </button>

        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategorySelect(category)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedCategory === category
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{category}</span>
              <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                {articleCounts[category] || 0}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t">
        <h4 className="font-medium text-gray-900 mb-3">Popular Tags</h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">Getting Started</Badge>
          <Badge variant="outline" className="text-xs">Troubleshooting</Badge>
          <Badge variant="outline" className="text-xs">Features</Badge>
          <Badge variant="outline" className="text-xs">API</Badge>
        </div>
      </div>
    </div>
  )
}

const ArticleViewer: React.FC<ArticleViewerProps> = ({ 
  article, 
  onClose, 
  onRate, 
  onBookmark, 
  onShare 
}) => {
  const [rating, setRating] = useState<number | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const handleRate = (value: number) => {
    setRating(value)
    if (onRate) {
      onRate(value)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt || '',
          url: window.location.href
        })
      } catch (err) {
        // Fallback to copy to clipboard
        handleCopyLink()
      }
    } else {
      handleCopyLink()
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{article.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {article.category && (
                  <span className="flex items-center gap-1">
                    <Tag className="w-4 h-4" />
                    {article.category}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Updated {new Date(article.updated_at).toLocaleDateString()}
                </span>
                {article.view_count && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {article.view_count} views
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              {onBookmark && (
                <Button variant="ghost" size="sm" onClick={onBookmark}>
                  <Bookmark className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleShare}>
                {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {article.excerpt && (
            <div className="bg-gray-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-gray-700 font-medium">{article.excerpt}</p>
            </div>
          )}

          <div className="prose max-w-none">
            {article.content ? (
              <div dangerouslySetInnerHTML={{ __html: article.content }} />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4" />
                <p>Article content will be displayed here</p>
              </div>
            )}
          </div>

          {article.tags && article.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Was this article helpful?</h4>
              <div className="flex gap-2">
                <Button
                  variant={rating === 1 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleRate(1)}
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Yes
                </Button>
                <Button
                  variant={rating === 0 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleRate(0)}
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  No
                </Button>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-500 mb-2">Need more help?</p>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  userId,
  organizationId,
  isAdminView = false,
  onArticleSelect,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null)
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'helpful'>('recent')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Mock data - in real implementation, this would come from the useSupport hook
  const [articles] = useState<KnowledgeArticle[]>([
    {
      id: '1',
      title: 'Getting Started Guide',
      content: '<h2>Welcome to our platform!</h2><p>This guide will help you get started...</p>',
      excerpt: 'Learn the basics of our platform and get up and running quickly.',
      category: 'Getting Started',
      tags: ['beginner', 'setup', 'tutorial'],
      status: 'published',
      view_count: 1250,
      helpful_count: 45,
      is_featured: true,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-20T10:00:00Z'
    },
    {
      id: '2',
      title: 'Troubleshooting Common Issues',
      content: '<h2>Common Problems and Solutions</h2><p>Here are the most frequent issues...</p>',
      excerpt: 'Solutions to the most common problems you might encounter.',
      category: 'Troubleshooting',
      tags: ['problems', 'solutions', 'help'],
      status: 'published',
      view_count: 890,
      helpful_count: 32,
      is_featured: false,
      created_at: '2024-01-10T10:00:00Z',
      updated_at: '2024-01-18T10:00:00Z'
    },
    {
      id: '3',
      title: 'Advanced Features Overview',
      content: '<h2>Unlock Advanced Capabilities</h2><p>Discover powerful features...</p>',
      excerpt: 'Explore advanced features that can enhance your workflow.',
      category: 'Features',
      tags: ['advanced', 'features', 'productivity'],
      status: 'published',
      view_count: 654,
      helpful_count: 28,
      is_featured: true,
      created_at: '2024-01-05T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    },
    {
      id: '4',
      title: 'API Documentation',
      content: '<h2>Developer Resources</h2><p>Complete API reference...</p>',
      excerpt: 'Complete reference for developers using our API.',
      category: 'Developer',
      tags: ['api', 'developer', 'reference'],
      status: 'published',
      view_count: 432,
      helpful_count: 15,
      is_featured: false,
      created_at: '2024-01-12T10:00:00Z',
      updated_at: '2024-01-16T10:00:00Z'
    }
  ])

  const categories = ['Getting Started', 'Troubleshooting', 'Features', 'Developer']
  const articleCounts = categories.reduce((acc, category) => {
    acc[category] = articles.filter(article => article.category === category).length
    return acc
  }, {} as Record<string, number>)

  const filteredArticles = articles.filter(article => {
    const matchesSearch = searchQuery === '' || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory === null || article.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const sortedArticles = [...filteredArticles].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return (b.view_count || 0) - (a.view_count || 0)
      case 'helpful':
        return (b.helpful_count || 0) - (a.helpful_count || 0)
      case 'recent':
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    }
  })

  const handleArticleSelect = (article: KnowledgeArticle) => {
    setSelectedArticle(article)
    if (onArticleSelect) {
      onArticleSelect(article)
    }
  }

  const featuredArticles = articles.filter(article => article.is_featured).slice(0, 3)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Knowledge Base</h2>
          <p className="text-gray-600">Find answers and learn about our platform</p>
        </div>
        {isAdminView && (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Article
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Search articles, guides, and FAQs..."
        />
      </div>

      {/* Featured Articles */}
      {!searchQuery && !selectedCategory && featuredArticles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Featured Articles</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredArticles.map((article) => (
              <div key={article.id} className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <Badge className="bg-blue-100 text-blue-800">Featured</Badge>
                </div>
                <h4 className="font-medium text-gray-900 mb-2 cursor-pointer hover:text-blue-600" 
                    onClick={() => handleArticleSelect(article)}>
                  {article.title}
                </h4>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{article.excerpt}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {article.view_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    {article.helpful_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <CategorySidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
            articleCounts={articleCounts}
          />
        </div>

        {/* Articles List */}
        <div className="lg:col-span-3">
          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
                {selectedCategory && ` in ${selectedCategory}`}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular' | 'helpful')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
                <option value="helpful">Most Helpful</option>
              </select>
            </div>
          </div>

          {/* Articles Grid */}
          {sortedArticles.length === 0 ? (
            <div className="text-center py-12">
              <Book className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No Articles Found</h3>
              <p className="text-gray-600">
                {searchQuery ? 'Try different search terms' : 'No articles in this category yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onSelect={() => handleArticleSelect(article)}
                  showActions={isAdminView}
                  compact={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Article Viewer Modal */}
      {selectedArticle && (
        <ArticleViewer
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onRate={(rating) => console.log('Rated:', rating)}
          onBookmark={() => console.log('Bookmarked')}
          onShare={() => console.log('Shared')}
        />
      )}
    </div>
  )
}