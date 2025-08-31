'use client'

import { useState, useEffect } from 'react'
import { useVocabularyStore } from '@/store/vocabulary-store'
import { supabase } from '@/lib/supabase'
import { sessionQueueManager } from '@/lib/session-queues'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { 
  BookOpen, 
  Brain, 
  Target, 
  TrendingUp, 
  Play, 
  ArrowLeft,
  LibraryBig,
  Dumbbell,
  Calendar,
  Trophy,
  Activity,
  Settings,
  Eye,
  MessageSquare,
  Ear
} from 'lucide-react'
import DeckSelection from './DeckSelection'
import StudySession from './StudySession'

export default function Dashboard() {
  const { 
    currentDeck,
    setCurrentDeck,
    availableDecks,
    setAvailableDecks,
    userDeckProgress,
    setUserDeckProgress,
    sessionSettings,
    setSessionSettings,
    metrics,
    updateMetrics,
    sessionStats,
    updateSessionStats,
    setUnseenQueue,
    setReviewQueue,
    setPracticePool,
    setNearFutureQueue
  } = useVocabularyStore()

  const [loading, setLoading] = useState(true)
  const [showDeckSelection, setShowDeckSelection] = useState(false)
  const [showStudySession, setShowStudySession] = useState(false)
  const [sessionType, setSessionType] = useState<'review' | 'discovery' | 'deep-dive' | null>(null)
  const [deepDiveCategory, setDeepDiveCategory] = useState<'leeches' | 'learning' | 'strengthening' | 'consolidating' | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load available decks
      const { data: decks, error: decksError } = await supabase
        .from('vocabulary_decks')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (decksError) throw decksError
      setAvailableDecks(decks || [])

      // Load user deck progress
      const { data: progress, error: progressError } = await supabase
        .from('user_deck_progress')
        .select('*')
        .eq('user_id', user.id)

      if (progressError) throw progressError

      const progressMap: Record<string, any> = {}
      progress?.forEach(p => {
        progressMap[p.deck_id] = p
      })
      
      // Update store with progress data
      Object.entries(progressMap).forEach(([deckId, progress]) => {
        setUserDeckProgress(deckId, progress)
      })

      // If current deck is set, load its queues and metrics
      if (currentDeck) {
        await loadDeckData(currentDeck.id, user.id)
      }

      // Load session statistics
      await loadSessionStats(user.id)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDeckData = async (deckId: string, userId: string) => {
    try {
      // Build queues
      const queues = await sessionQueueManager.buildQueues(deckId, userId)
      setUnseenQueue(queues.unseen)
      setReviewQueue(queues.review)
      setPracticePool(queues.practice)
      setNearFutureQueue(queues.nearFuture)

      // Calculate metrics
      const deckMetrics = await sessionQueueManager.calculateMetrics(userId, deckId)
      updateMetrics(deckMetrics)
    } catch (error) {
      console.error('Error loading deck data:', error)
    }
  }

  const loadSessionStats = async (userId: string) => {
    try {
      const today = new Date()
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Get session statistics
      const { data: sessions, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (error) throw error

      const stats = {
        reviewsToday: 0,
        reviews7Days: 0,
        reviews30Days: 0,
        currentStreak: 0
      }

      sessions?.forEach(session => {
        const sessionDate = new Date(session.created_at)
        
        if (sessionDate.toDateString() === today.toDateString()) {
          stats.reviewsToday += session.words_studied
        }
        
        if (sessionDate >= sevenDaysAgo) {
          stats.reviews7Days += session.words_studied
        }
        
        if (sessionDate >= thirtyDaysAgo) {
          stats.reviews30Days += session.words_studied
        }
      })

      updateSessionStats(stats)
    } catch (error) {
      console.error('Error loading session stats:', error)
    }
  }

  const handleStartSession = async (type: 'review' | 'discovery' | 'deep-dive') => {
    if (!currentDeck) {
      alert('Please select a deck first!')
      setShowDeckSelection(true)
      return
    }

    // Check if session settings are configured
    if (sessionSettings.types.length === 0) {
      alert('Please select at least one learning type to continue!')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load fresh deck data before starting session
    await loadDeckData(currentDeck.id, user.id)
    
    setSessionType(type)
    setShowStudySession(true)
  }

  const handleDeckSelected = async (deck: any) => {
    setCurrentDeck(deck)
    setShowDeckSelection(false)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await loadDeckData(deck.id, user.id)
    }
  }

  const handleSessionEnd = () => {
    setShowStudySession(false)
    setSessionType(null)
    // Reload dashboard data to reflect session results
    loadDashboardData()
  }

  const handleLearningTypeToggle = (type: 'recognition' | 'production' | 'listening') => {
    setSessionSettings({
      ...sessionSettings,
      types: sessionSettings.types.includes(type)
        ? sessionSettings.types.filter(t => t !== type)
        : [...sessionSettings.types, type]
    })
  }

  const handleSelectAllTypes = () => {
    setSessionSettings({
      ...sessionSettings,
      types: ['recognition', 'production', 'listening']
    })
  }

  const handleClearAllTypes = () => {
    setSessionSettings({
      ...sessionSettings,
      types: []
    })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    )
  }

  if (showDeckSelection) {
    return (
      <DeckSelection 
        onBack={() => setShowDeckSelection(false)}
      />
    )
  }

  if (showStudySession && sessionType) {
    return (
      <StudySession 
        sessionType={sessionType}
        onBack={handleSessionEnd}
      />
    )
  }

  const getOverallProgress = () => {
    if (!currentDeck) return { totalWords: 0, totalMastered: 0, progressPercentage: 0 }
    
    const progress = userDeckProgress[currentDeck.id]
    if (!progress) return { totalWords: currentDeck.total_words, totalMastered: 0, progressPercentage: 0 }
    
    const totalWords = currentDeck.total_words
    const totalMastered = progress.words_mastered
    const progressPercentage = totalWords > 0 ? (totalMastered / totalWords) * 100 : 0
    
    return { totalWords, totalMastered, progressPercentage }
  }

  const { totalWords, totalMastered, progressPercentage } = getOverallProgress()

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">French Vocabulary Trainer</h1>
          <p className="text-gray-600 mt-2">Master French vocabulary with spaced repetition</p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      {/* Choose Deck Button - At the very top */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Current Deck</h2>
              {currentDeck ? (
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <span className="text-lg font-medium">{currentDeck.name}</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {currentDeck.difficulty_level}
                  </span>
                </div>
              ) : (
                <p className="text-gray-600">No deck selected</p>
              )}
            </div>
            <Button 
              onClick={() => setShowDeckSelection(true)}
              className="flex items-center gap-2"
            >
              <LibraryBig className="h-4 w-4" />
              {currentDeck ? 'Change Deck' : 'Choose Deck'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Deck Progress */}
      {currentDeck && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Deck Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{totalWords}</p>
                <p className="text-sm text-gray-600">Total Words</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{totalMastered}</p>
                <p className="text-sm text-gray-600">Mastered</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{Math.round(progressPercentage)}%</p>
                <p className="text-sm text-gray-600">Progress</p>
              </div>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </CardContent>
        </Card>
      )}



      {/* Progress Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-500">{metrics.unseen}</p>
            <p className="text-sm text-gray-600">Unseen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{metrics.leeches}</p>
            <p className="text-sm text-gray-600">Leeches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{metrics.learning}</p>
            <p className="text-sm text-gray-600">Learning</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{metrics.strengthening}</p>
            <p className="text-sm text-gray-600">Strengthening</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{metrics.consolidating}</p>
            <p className="text-sm text-gray-600">Consolidating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-indigo-500">{metrics.mastered}</p>
            <p className="text-sm text-gray-600">Mastered</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold">{sessionStats.reviewsToday}</p>
              <p className="text-sm text-gray-600">Reviews Today</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{sessionStats.reviews7Days}</p>
              <p className="text-sm text-gray-600">Past 7 Days</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{sessionStats.reviews30Days}</p>
              <p className="text-sm text-gray-600">Past 30 Days</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{sessionStats.currentStreak} 🔥</p>
              <p className="text-sm text-gray-600">Current Streak</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Review words you've learned using spaced repetition
            </p>
            <Button 
              onClick={() => handleStartSession('review')}
              className="w-full"
              disabled={!currentDeck || sessionSettings.types.length === 0}
            >
              Start Review
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Discovery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Learn new words from your selected deck
            </p>
            <Button 
              onClick={() => handleStartSession('discovery')}
              className="w-full"
              disabled={!currentDeck || sessionSettings.types.length === 0}
            >
              Start Discovery
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Deep Dive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Focus on specific categories like leeches or learning words
            </p>
            <Button 
              onClick={() => handleStartSession('deep-dive')}
              className="w-full"
              disabled={!currentDeck || sessionSettings.types.length === 0}
            >
              Start Deep Dive
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Learning Types Configuration - At the bottom */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Learning Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Learning Type Options */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-medium">Select Learning Types</Label>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSelectAllTypes}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearAllTypes}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id="recognition"
                    checked={sessionSettings.types.includes('recognition')}
                    onCheckedChange={() => handleLearningTypeToggle('recognition')}
                  />
                  <Label htmlFor="recognition" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Eye className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">French → English</div>
                      <div className="text-sm text-gray-600">Recognition</div>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id="production"
                    checked={sessionSettings.types.includes('production')}
                    onCheckedChange={() => handleLearningTypeToggle('production')}
                  />
                  <Label htmlFor="production" className="flex items-center gap-2 cursor-pointer flex-1">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">English → French</div>
                      <div className="text-sm text-gray-600">Production</div>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id="listening"
                    checked={sessionSettings.types.includes('listening')}
                    onCheckedChange={() => handleLearningTypeToggle('listening')}
                  />
                  <Label htmlFor="listening" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Ear className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="font-medium">Voice First</div>
                      <div className="text-sm text-gray-600">Listening</div>
                    </div>
                  </Label>
                </div>
              </div>
            </div>

            {/* Status */}
            {sessionSettings.types.length === 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Please select at least one learning type to start sessions.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-12" 
              onClick={() => setShowDeckSelection(true)}
            >
              <LibraryBig className="h-4 w-4 mr-2" />
              Choose Deck
            </Button>
            <Button variant="outline" className="h-12">
              <Dumbbell className="h-4 w-4 mr-2" />
              Practice Mode (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
