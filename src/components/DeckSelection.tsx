'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { VocabularyDeck, UserDeckProgress } from '@/lib/supabase'
import { useVocabularyStore } from '@/store/vocabulary-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  BookOpen, 
  Play,
  TrendingUp,
  Clock,
  Target,
  Flame,
  ArrowLeft
} from 'lucide-react'

interface DeckSelectionProps {
  onBack: () => void
}

export default function DeckSelection({ onBack }: DeckSelectionProps) {
  const { 
    availableDecks, 
    userDeckProgress, 
    setAvailableDecks, 
    setUserDeckProgressMap,
    setCurrentDeck 
  } = useVocabularyStore()
  const [loading, setLoading] = useState(true)
  const [selectedDeck, setSelectedDeck] = useState<VocabularyDeck | null>(null)

  useEffect(() => {
    loadDecks()
  }, [])

  const loadDecks = async () => {
    try {
      setLoading(true)
      
      // Load available decks
      const { data: decks, error: decksError } = await supabase
        .from('vocabulary_decks')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (decksError) throw decksError

      setAvailableDecks(decks || [])

      // Load user progress for each deck
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: progress, error: progressError } = await supabase
          .from('user_deck_progress')
          .select('*')
          .eq('user_id', user.id)

        if (progressError) throw progressError

        // Create progress records for decks that don't have them
        const progressMap: Record<string, UserDeckProgress> = {}
        
        for (const deck of decks || []) {
          const existingProgress = progress?.find(p => p.deck_id === deck.id)
          if (existingProgress) {
            progressMap[deck.id] = existingProgress
          } else {
            // Create initial progress record
            const { data: newProgress, error: createError } = await supabase
              .from('user_deck_progress')
              .insert({
                user_id: user.id,
                deck_id: deck.id,
                words_learned: 0,
                words_mastered: 0,
                total_reviews: 0,
                current_streak: 0
              })
              .select()
              .single()

            if (!createError && newProgress) {
              progressMap[deck.id] = newProgress
            }
          }
        }

        setUserDeckProgressMap(progressMap)
      }
    } catch (error) {
      console.error('Error loading decks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeckSelect = (deck: VocabularyDeck) => {
    setSelectedDeck(deck)
  }

  const handleContinue = () => {
    if (selectedDeck) {
      // Set the current deck in the store
      setCurrentDeck(selectedDeck)
      // Go back to dashboard
      onBack()
    }
  }

  const getProgressPercentage = (deckId: string) => {
    const progress = userDeckProgress[deckId]
    if (!progress) return 0
    return (progress.words_learned > 0) ? (progress.words_mastered / progress.words_learned) * 100 : 0
  }

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'text-green-600 bg-green-100'
      case 'intermediate': return 'text-yellow-600 bg-yellow-100'
      case 'advanced': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading decks...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Choose Your Vocabulary Deck
        </h1>
        <p className="text-gray-600">
          Select a deck to start your French vocabulary journey
        </p>
      </div>

      {/* Decks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {availableDecks.map((deck) => {
          const progress = userDeckProgress[deck.id] || {
            words_learned: 0,
            words_mastered: 0,
            total_reviews: 0,
            current_streak: 0
          }
          const progressPercentage = getProgressPercentage(deck.id)
          
          return (
            <Card 
              key={deck.id} 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedDeck?.id === deck.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleDeckSelect(deck)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {deck.name}
                  </CardTitle>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(deck.difficulty_level)}`}>
                    {deck.difficulty_level}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{deck.description}</p>
              </CardHeader>
              
              <CardContent>
                {/* Progress Overview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">
                      {progress.words_mastered} / {deck.total_words} mastered
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {progress.words_learned}
                      </div>
                      <div className="text-xs text-gray-500">Words Learned</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {progress.words_mastered}
                      </div>
                      <div className="text-xs text-gray-500">Mastered</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {progress.total_reviews}
                      </div>
                      <div className="text-xs text-gray-500">Total Reviews</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold flex items-center justify-center gap-1">
                        {progress.current_streak}
                        <Flame className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="text-xs text-gray-500">Current Streak</div>
                    </div>
                  </div>
                  
                  {/* Last Studied */}
                  {progress.last_studied_at && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      Last studied: {new Date(progress.last_studied_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Continue Button */}
      {selectedDeck && (
        <div className="mt-8 text-center">
          <Button 
            size="lg" 
            className="px-8"
            onClick={handleContinue}
          >
            <Play className="h-5 w-5 mr-2" />
            Continue with {selectedDeck.name}
          </Button>
        </div>
      )}

      {/* Instructions */}
      {!selectedDeck && (
        <div className="mt-8 text-center text-gray-500">
          <p>Click on a deck above to select it, then click "Continue" to start studying.</p>
        </div>
      )}
    </div>
  )
}
