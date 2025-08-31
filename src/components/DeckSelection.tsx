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
    // Set the current deck in the store and return to dashboard immediately
    setCurrentDeck(deck)
    onBack()
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

      {/* Compact Deck List */}
      <div className="space-y-3">
        {availableDecks
          .sort((a, b) => {
            const aMatch = a.name.match(/Deck (\d+):/);
            const bMatch = b.name.match(/Deck (\d+):/);
            if (aMatch && bMatch) {
              return parseInt(aMatch[1]) - parseInt(bMatch[1]);
            }
            return a.name.localeCompare(b.name);
          })
          .map((deck) => {
            const progress = userDeckProgress[deck.id] || {
              words_learned: 0,
              words_mastered: 0,
              total_reviews: 0,
              current_streak: 0
            }
            
            // Calculate progress percentages for different states
            const totalWords = deck.total_words
            const mastered = progress.words_mastered
            const learning = progress.words_learned - progress.words_mastered
            const unseen = totalWords - progress.words_learned
            
            return (
              <Card 
                key={deck.id} 
                className="cursor-pointer transition-all hover:shadow-lg hover:bg-gray-50"
                onClick={() => handleDeckSelect(deck)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-lg">{deck.name}</h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {deck.difficulty_level}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Progress Overview</span>
                          <span>{progress.words_mastered}/{totalWords} mastered</span>
                        </div>
                        
                        <div className="flex h-3 bg-gray-200 rounded-full overflow-hidden">
                          {/* Unseen */}
                          <div 
                            className="bg-gray-400"
                            style={{ width: `${(unseen / totalWords) * 100}%` }}
                            title={`${unseen} unseen`}
                          />
                          {/* Learning */}
                          <div 
                            className="bg-orange-400"
                            style={{ width: `${(learning / totalWords) * 100}%` }}
                            title={`${learning} learning`}
                          />
                          {/* Strengthening */}
                          <div 
                            className="bg-yellow-400"
                            style={{ width: `${(Math.max(0, progress.words_learned - progress.words_mastered - learning) / totalWords) * 100}%` }}
                            title="strengthening"
                          />
                          {/* Mastered */}
                          <div 
                            className="bg-green-500"
                            style={{ width: `${(mastered / totalWords) * 100}%` }}
                            title={`${mastered} mastered`}
                          />
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Unseen: {unseen}</span>
                          <span>Learning: {learning}</span>
                          <span>Strengthening: {Math.max(0, progress.words_learned - progress.words_mastered - learning)}</span>
                          <span>Mastered: {mastered}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-blue-600">{totalWords}</div>
                      <div className="text-sm text-gray-600">words</div>
                      {progress.current_streak > 0 && (
                        <div className="flex items-center gap-1 text-orange-600 text-sm mt-1">
                          <Flame className="h-3 w-3" />
                          {progress.current_streak}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
      </div>


    </div>
  )
}
