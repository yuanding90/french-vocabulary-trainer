'use client'

import { useState, useEffect } from 'react'
import { useVocabularyStore } from '@/store/vocabulary-store'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowLeft,
  Volume2,
  Check,
  X,
  RotateCcw,
  Play,
  Pause,
  SkipForward,
  AlertTriangle
} from 'lucide-react'
import { 
  SRS, 
  calculateNextReview, 
  speakText, 
  getCardType, 
  checkAnswer,
  normalizeText,
  logRating,
  getRecentRatings,
  shouldRemoveFromLeech
} from '@/lib/utils'

interface StudySessionProps {
  onBack: () => void
  sessionType: 'review' | 'discovery' | 'deep-dive'
  deepDiveCategory?: 'leeches' | 'learning' | 'strengthening' | 'consolidating' | null
}

interface SessionProgress {
  total: number
  reviewed: number
  again: number
  hard: number
  good: number
  easy: number
  learn: number
  know: number
}

export default function StudySession({ onBack, sessionType, deepDiveCategory }: StudySessionProps) {
  const { currentDeck, setCurrentWord, setSessionWords, sessionSettings } = useVocabularyStore()
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [sessionWords, setLocalSessionWords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAnswer, setShowAnswer] = useState(false)
  const [cardType, setCardType] = useState<'recognition' | 'production' | 'listening'>('recognition')
  const [userAnswer, setUserAnswer] = useState('')
  const [isCorrect, setIsCorrect] = useState(false)
  const [sessionProgress, setSessionProgress] = useState<SessionProgress>({
    total: 0,
    reviewed: 0,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    learn: 0,
    know: 0
  })
  const [currentWord, setCurrentWordState] = useState<any>(null)

  useEffect(() => {
    loadSessionWords()
  }, [])

  const loadSessionWords = async () => {
    if (!currentDeck) return

    try {
      setLoading(true)
      
      // First, get the vocabulary IDs for this deck
      const { data: deckVocab, error: deckError } = await supabase
        .from('deck_vocabulary')
        .select('vocabulary_id')
        .eq('deck_id', currentDeck.id)
        .order('word_order')

      if (deckError) throw deckError

      if (!deckVocab || deckVocab.length === 0) {
        console.log('No vocabulary found for deck:', currentDeck.id)
        setLocalSessionWords([])
        setLoading(false)
        return
      }

      // Extract vocabulary IDs
      const vocabIds = deckVocab.map(item => item.vocabulary_id)
      console.log('Vocabulary IDs for deck:', vocabIds)
      console.log('Vocabulary ID types:', vocabIds.map(id => typeof id))

      // Get the actual vocabulary words
      const { data: words, error: wordsError } = await supabase
        .from('vocabulary')
        .select('*')
        .in('id', vocabIds)

      if (wordsError) throw wordsError

      console.log('Loaded words:', words)
      if (words && words.length > 0) {
        console.log('First word ID type:', typeof words[0].id)
        console.log('First word ID value:', words[0].id)
      }

      if (words && words.length > 0) {
        // Filter words based on session type
        let filteredWords = words
        const { data: { user } } = await supabase.auth.getUser()
        let userProgress: any[] = []
        
        if (user) {
          const { data: progressData, error: progressError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('deck_id', currentDeck.id)

          if (!progressError && progressData) {
            userProgress = progressData
            
            if (sessionType === 'review') {
              // Create a map of word progress for efficient lookup
              const progressMap = new Map(userProgress.map(p => [p.word_id, p]))
              
              // Step 1: Check for Due Now words (overdue for review)
              const dueNowWords = userProgress.filter(progress => {
                const nextReview = new Date(progress.next_review_date)
                return nextReview <= new Date()
              })
              
              if (dueNowWords.length > 0) {
                // Use Due Now words
                const dueNowWordIds = dueNowWords.map(p => p.word_id)
                filteredWords = words.filter(word => dueNowWordIds.includes(word.id))
                console.log(`Review session: Using ${dueNowWords.length} Due Now words`)
              } else {
                // Step 2: Check for Due Soon words (coming up in next 24 hours)
                const dueSoonWords = userProgress.filter(progress => {
                  const nextReview = new Date(progress.next_review_date)
                  const tomorrow = new Date()
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  return nextReview <= tomorrow && nextReview > new Date()
                })
                
                if (dueSoonWords.length > 0) {
                  // Use Due Soon words
                  const dueSoonWordIds = dueSoonWords.map(p => p.word_id)
                  filteredWords = words.filter(word => dueSoonWordIds.includes(word.id))
                  console.log(`Review session: Using ${dueSoonWords.length} Due Soon words`)
                } else {
                  // Step 3: Use Unseen words (no progress record)
                  const unseenWords = words.filter(word => !progressMap.has(word.id))
                  
                  if (unseenWords.length > 0) {
                    filteredWords = unseenWords
                    console.log(`Review session: Using ${unseenWords.length} Unseen words`)
                  } else {
                    // Fallback: use all words for practice
                    filteredWords = words
                    console.log(`Review session: Using all ${words.length} words for practice`)
                  }
                }
              }
            } else if (sessionType === 'discovery') {
              // For discovery sessions, exclude words that have already been learned
              const learnedWordIds = userProgress.map(p => p.word_id)
              filteredWords = words.filter(word => !learnedWordIds.includes(word.id))
            } else if (sessionType === 'deep-dive' && deepDiveCategory) {
              // For deep dive, filter based on selected category
              const progressMap = new Map(userProgress.map(p => [p.word_id, p]))
              
              filteredWords = words.filter(word => {
                const progress = progressMap.get(word.id)
                if (!progress) return false
                
                switch (deepDiveCategory) {
                  case 'leeches':
                    return progress.again_count >= 4
                  case 'learning':
                    return progress.again_count < 4 && progress.interval < 7
                  case 'strengthening':
                    return progress.again_count < 4 && progress.interval >= 7 && progress.interval < 21
                  case 'consolidating':
                    return progress.again_count < 4 && progress.interval >= 21 && progress.interval < 60
                  default:
                    return false
                }
              })
            }
          }
        }

        // Merge word data with progress data for current word tracking
        const progressMap = new Map(userProgress.map(p => [p.word_id, p]))
        console.log('Progress map sample:', Array.from(progressMap.entries()).slice(0, 3))
        
        const wordsWithProgress = filteredWords.map(word => {
          const progress = progressMap.get(word.id)
          if (progress) {
            console.log(`Word ${word.id} progress data:`, progress)
          }
          return {
            ...word,
            // Only merge specific progress fields, not the entire progress object
            repetitions: progress?.repetitions || 0,
            interval: progress?.interval || 0,
            ease_factor: progress?.ease_factor || 2.5,
            next_review_date: progress?.next_review_date || null,
            again_count: progress?.again_count || 0,
            // Keep the word's original integer ID
            id: word.id
          }
        })

        setLocalSessionWords(wordsWithProgress)
        setSessionProgress(prev => ({ ...prev, total: wordsWithProgress.length }))
        setCurrentWord(wordsWithProgress[0])
        setCardType(getRandomCardType())
      } else {
        setLocalSessionWords([])
      }
    } catch (error) {
      console.error('Error loading session words:', error)
      setLocalSessionWords([])
    } finally {
      setLoading(false)
    }
  }

  const getRandomCardType = (): 'recognition' | 'production' | 'listening' => {
    const availableTypes = sessionSettings.types
    if (availableTypes.length === 0) return 'recognition'
    
    const randomIndex = Math.floor(Math.random() * availableTypes.length)
    return availableTypes[randomIndex]
  }

  const handleShowAnswer = () => {
    setShowAnswer(true)
  }

  const handleAnswer = async (rating: 'again' | 'hard' | 'good' | 'easy' | 'learn' | 'know' | 'leech' | 'remove-leech') => {
    if (!currentDeck) return

    const currentWord = sessionWords[currentWordIndex]
    
    // Handle leech actions
    if (rating === 'leech') {
      await markWordAsLeech(currentWord)
      return
    }
    
    if (rating === 'remove-leech') {
      await removeWordFromLeech(currentWord)
      return
    }
    
    // Update session progress
    setSessionProgress(prev => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      [rating]: prev[rating as keyof SessionProgress] + 1
    }))

    // Save progress to database
    await saveWordProgress(currentWord, rating)

    // Move to next word or end session
    if (currentWordIndex < sessionWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1)
      setCurrentWord(sessionWords[currentWordIndex + 1])
      setShowAnswer(false)
      setUserAnswer('')
      setIsCorrect(false)
      setCardType(getRandomCardType())
    } else {
      // Session completed
      console.log('Session completed:', sessionProgress)
      await saveSessionSummary()
      onBack()
    }
  }

  const markWordAsLeech = async (word: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !currentDeck) return

    try {
      // Get existing progress to preserve other fields
      const { data: existingProgress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('word_id', word.id)
        .eq('deck_id', currentDeck.id)
        .single()

      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          word_id: word.id,
          deck_id: currentDeck.id,
          repetitions: existingProgress?.repetitions || 0,
          interval: existingProgress?.interval || 0,
          ease_factor: existingProgress?.ease_factor || SRS.EASE_FACTOR_DEFAULT,
          next_review_date: existingProgress?.next_review_date || new Date().toISOString(),
          again_count: SRS.LEECH_THRESHOLD // Mark as leech by setting again_count to threshold
        }, { onConflict: 'user_id,word_id,deck_id' })

      if (error) throw error
      console.log('Word marked as leech:', word.french_word)
      
      // Update session progress
      setSessionProgress(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1
      }))
      
      // Move to next word after marking as leech
      if (currentWordIndex < sessionWords.length - 1) {
        const nextIndex = currentWordIndex + 1
        setCurrentWordIndex(nextIndex)
        setCurrentWord(sessionWords[nextIndex])
        setShowAnswer(false)
        setUserAnswer('')
        setIsCorrect(false)
        setCardType(getRandomCardType())
      } else {
        // Session completed
        console.log('Session completed:', sessionProgress)
        await saveSessionSummary()
        onBack()
      }
    } catch (error) {
      console.error('Error marking word as leech:', error)
    }
  }

  const removeWordFromLeech = async (word: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !currentDeck) return

    try {
      // Get existing progress to preserve other fields
      const { data: existingProgress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('word_id', word.id)
        .eq('deck_id', currentDeck.id)
        .single()

      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          word_id: word.id,
          deck_id: currentDeck.id,
          repetitions: existingProgress?.repetitions || 0,
          interval: existingProgress?.interval || 0,
          ease_factor: existingProgress?.ease_factor || SRS.EASE_FACTOR_DEFAULT,
          next_review_date: existingProgress?.next_review_date || new Date().toISOString(),
          again_count: 0 // Remove from leeches by resetting again_count to 0
        }, { onConflict: 'user_id,word_id,deck_id' })

      if (error) throw error
      console.log('Word removed from leeches:', word.french_word)
      
      // Update session progress
      setSessionProgress(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1
      }))
      
      // Move to next word after removing from leeches
      if (currentWordIndex < sessionWords.length - 1) {
        const nextIndex = currentWordIndex + 1
        setCurrentWordIndex(nextIndex)
        setCurrentWord(sessionWords[nextIndex])
        setShowAnswer(false)
        setUserAnswer('')
        setIsCorrect(false)
        setCardType(getRandomCardType())
      } else {
        // Session completed
        console.log('Session completed:', sessionProgress)
        await saveSessionSummary()
        onBack()
      }
    } catch (error) {
      console.error('Error removing word from leeches:', error)
    }
  }

  const saveWordProgress = async (word: any, rating: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !currentDeck) return

    try {
      // Get existing progress
      const { data: existingProgress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('word_id', word.id)
        .eq('deck_id', currentDeck.id)
        .single()

      let newInterval = 0
      let newEaseFactor = SRS.EASE_FACTOR_DEFAULT
      let newAgainCount = 0
      let newRepetitions = 0

      if (sessionType === 'review') {
        // Enhanced SRS logic for review sessions
        const currentInterval = existingProgress?.interval || 0
        const currentEaseFactor = existingProgress?.ease_factor || SRS.EASE_FACTOR_DEFAULT
        const currentAgainCount = existingProgress?.again_count || 0
        const currentRepetitions = existingProgress?.repetitions || 0

        // Use the new SRS calculation function
        const srsResult = calculateNextReview(
          currentInterval,
          currentEaseFactor,
          currentRepetitions,
          rating as 'again' | 'hard' | 'good' | 'easy'
        )

        newInterval = srsResult.interval
        newEaseFactor = srsResult.easeFactor
        newRepetitions = srsResult.repetitions

        // Handle again count
        if (rating === 'again') {
          newAgainCount = currentAgainCount + 1
        } else {
          newAgainCount = currentAgainCount
        }

        // Check for leech removal
        if (currentAgainCount >= SRS.LEECH_THRESHOLD) {
          const recentRatings = await getRecentRatings(user.id, word.id)
          if (shouldRemoveFromLeech(rating as 'again' | 'hard' | 'good' | 'easy', newInterval, recentRatings)) {
            newAgainCount = 0 // Remove from leeches
            console.log(`✅ Word "${word.french_word}" removed from leeches after 2 consecutive "Easy" ratings`)
          }
        }

        // Log the rating for history tracking
        await logRating(user.id, word.id, currentDeck.id, rating as 'again' | 'hard' | 'good' | 'easy')

      } else if (sessionType === 'discovery') {
        // Discovery session logic
        if (rating === 'know') {
          newInterval = SRS.MASTERED_INTERVAL
          newEaseFactor = SRS.EASE_FACTOR_DEFAULT
          newRepetitions = 1
        } else {
          newInterval = 0
          newEaseFactor = SRS.EASE_FACTOR_DEFAULT
          newRepetitions = 0
        }

        // Log the rating for discovery sessions
        await logRating(user.id, word.id, currentDeck.id, rating as 'learn' | 'know')
      }

      const nextReviewDate = new Date()
      if (newInterval > 0) {
        nextReviewDate.setDate(nextReviewDate.getDate() + newInterval)
      }

      // Log the data being sent for debugging
      console.log('Word ID before conversion:', word.id, 'Type:', typeof word.id)
      
      const progressData = {
        user_id: user.id,
        word_id: parseInt(word.id), // Convert string ID to integer for database
        deck_id: currentDeck.id,
        repetitions: newRepetitions,
        interval: newInterval,
        ease_factor: newEaseFactor,
        next_review_date: nextReviewDate.toISOString(),
        again_count: newAgainCount
      }
      
      console.log('Attempting to save progress with data:', progressData)
      console.log('Data types:', {
        user_id: typeof progressData.user_id,
        word_id: typeof progressData.word_id,
        deck_id: typeof progressData.deck_id,
        repetitions: typeof progressData.repetitions,
        interval: typeof progressData.interval,
        ease_factor: typeof progressData.ease_factor,
        next_review_date: typeof progressData.next_review_date,
        again_count: typeof progressData.again_count
      })

      // Upsert progress
      const { error } = await supabase
        .from('user_progress')
        .upsert(progressData, { onConflict: 'user_id,word_id,deck_id' })

      if (error) {
        console.error('Error saving word progress:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        console.error('Full error object:', JSON.stringify(error, null, 2))
        
        // Fallback: try insert, then update if that fails
        console.log('Attempting fallback strategy...')
        const { error: insertError } = await supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
            word_id: word.id,
            deck_id: currentDeck.id,
            repetitions: newRepetitions,
            interval: newInterval,
            ease_factor: newEaseFactor,
            next_review_date: nextReviewDate.toISOString(),
            again_count: newAgainCount
          })
        
        if (insertError) {
          console.error('Insert also failed:', insertError)
          // Try update as last resort
          const { error: updateError } = await supabase
            .from('user_progress')
            .update({
              repetitions: newRepetitions,
              interval: newInterval,
              ease_factor: newEaseFactor,
              next_review_date: nextReviewDate.toISOString(),
              again_count: newAgainCount
            })
            .eq('user_id', user.id)
            .eq('word_id', word.id)
            .eq('deck_id', currentDeck.id)
          
          if (updateError) {
            console.error('Update also failed:', updateError)
          } else {
            console.log('Update succeeded as fallback')
          }
        } else {
          console.log('Insert succeeded as fallback')
        }
      }
    } catch (error) {
      console.error('Error in saveWordProgress:', error)
    }
  }

  const saveSessionSummary = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !currentDeck) return

    try {
      const { error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          deck_id: currentDeck.id,
          session_type: sessionType,
          words_studied: sessionProgress.total,
          correct_answers: sessionProgress.good + sessionProgress.easy + sessionProgress.know,
          session_duration: 0, // TODO: Calculate actual duration
          completed_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error saving session summary:', error)
      }
    } catch (error) {
      console.error('Error in saveSessionSummary:', error)
    }
  }

  const handleUserAnswer = () => {
    const currentWord = sessionWords[currentWordIndex]
    const correctAnswer = cardType === 'recognition' ? currentWord.english_translation : currentWord.french_word
    
    const correct = checkAnswer(userAnswer, correctAnswer)
    setIsCorrect(correct)
    setShowAnswer(true)
  }

  const speakWord = (text: string, language: 'fr-FR' | 'en-US' = 'fr-FR') => {
    speakText(text, language)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading session...</div>
      </div>
    )
  }

  if (sessionWords.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No words available for this session</h2>
          <p className="text-gray-600 mb-4">
            {sessionType === 'review' 
              ? 'No words are due for review at this time.' 
              : 'This deck doesn\'t have any vocabulary words assigned yet.'}
          </p>
          <Button onClick={onBack}>Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  const currentWordData = sessionWords[currentWordIndex]
  const progressPercentage = ((currentWordIndex + 1) / sessionWords.length) * 100

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            End Session
          </Button>
          <div className="text-sm text-gray-600">
            {currentWordIndex + 1} / {sessionWords.length}
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Session
        </h1>
        <p className="text-gray-600">
          {currentDeck?.name} • {sessionProgress.total} completed
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Dynamic Session Progress Visualization */}
      {sessionType === 'review' && (
        <div className="mb-8">
          {/* Overall Statistics */}
          <div className="grid grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">{sessionWords.length - currentWordIndex}</div>
              <div className="text-sm text-gray-500">Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{sessionProgress.again}</div>
              <div className="text-sm text-gray-500">Again</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{sessionProgress.hard}</div>
              <div className="text-sm text-gray-500">Hard</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{sessionProgress.good}</div>
              <div className="text-sm text-gray-500">Good</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{sessionProgress.easy}</div>
              <div className="text-sm text-gray-500">Easy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{sessionProgress.total}</div>
              <div className="text-sm text-gray-500">Reviewed</div>
            </div>
          </div>
        </div>
      )}

      {/* Session Type Specific Interface */}
      {sessionType === 'review' ? (
        <ReviewCard 
          word={currentWordData}
          currentWord={currentWord}
          cardType={cardType}
          showAnswer={showAnswer}
          userAnswer={userAnswer}
          setUserAnswer={setUserAnswer}
          isCorrect={isCorrect}
          onShowAnswer={handleShowAnswer}
          onAnswer={handleAnswer}
          onUserAnswer={handleUserAnswer}
          speakWord={speakWord}
          sessionSettings={sessionSettings}
        />
      ) : sessionType === 'discovery' ? (
        <DiscoveryCard 
          word={currentWordData}
          onAnswer={handleAnswer}
          speakWord={speakWord}
          sessionProgress={sessionProgress}
        />
      ) : (
        <DeepDiveCard 
          word={currentWordData}
          onAnswer={handleAnswer}
          speakWord={speakWord}
        />
      )}


    </div>
  )
}

// Review Card Component
function ReviewCard({ 
  word, 
  currentWord,
  cardType, 
  showAnswer, 
  userAnswer, 
  setUserAnswer, 
  isCorrect, 
  onShowAnswer, 
  onAnswer, 
  onUserAnswer,
  speakWord,
  sessionSettings
}: any) {
  const prompt = cardType === 'recognition' 
    ? 'Translate this French word:' 
    : cardType === 'production' 
    ? 'Translate this English word:' 
    : 'Listen and translate:'
  
  const promptText = cardType === 'recognition' 
    ? word.french_word 
    : cardType === 'production' 
    ? word.english_translation 
    : ''

  // Auto-play audio for listening mode
  useEffect(() => {
    if (cardType === 'listening') {
      const timer = setTimeout(() => {
        speakWord(word.french_word, 'fr-FR')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [cardType, word.french_word, speakWord])

  return (
    <Card className="mb-8">
      <CardContent className="p-8">
        <div className={`flash-card ${showAnswer ? 'flipped' : ''}`} style={{ minHeight: '500px' }}>
          <div className="flash-card-inner">
            {/* Front of Card - Question */}
            <div className="flash-card-front">
              <div className="flex flex-col h-full">
                {/* Status on top */}
                <div className="text-center mb-8">
                  <p className="text-sm text-gray-500">{prompt}</p>
                </div>

                {/* Main content */}
                <div className="flex-1 flex flex-col justify-center items-center">
                  {cardType === 'listening' ? (
                    <div className="text-center space-y-6">
                      <div className="text-6xl">🎧</div>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => speakWord(word.french_word, 'fr-FR')}
                        className="text-xl px-8 py-4"
                      >
                        <Volume2 className="h-8 w-8 mr-3" />
                        Listen
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center space-y-6">
                      <div className="flex items-center justify-center gap-4 mb-8">
                        <div className="text-6xl font-bold text-gray-900">
                          {promptText}
                        </div>
                        {cardType === 'recognition' && (
                          <Button
                            variant="ghost"
                            size="lg"
                            onClick={() => speakWord(word.french_word, 'fr-FR')}
                            className="p-3"
                          >
                            <Volume2 className="h-8 w-8" />
                          </Button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && onUserAnswer()}
                        placeholder="Type your answer..."
                        className="w-full max-w-md p-4 border-2 border-gray-300 rounded-lg text-center text-2xl focus:border-blue-500 focus:outline-none"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* Reveal Answer Button */}
                <div className="text-center mt-8">
                  <Button 
                    onClick={onUserAnswer} 
                    className="px-12 py-4 text-xl bg-blue-600 hover:bg-blue-700"
                  >
                    Reveal Answer
                  </Button>
                </div>
              </div>
            </div>

            {/* Back of Card - Answer */}
            <div className="flash-card-back">
              <div className="flex flex-col h-full">
                {/* Status on top */}
                <div className="text-center mb-6">
                  <p className={`text-2xl font-semibold ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                    {isCorrect ? 'Correct! 🎉' : 'Not quite...'}
                  </p>
                </div>

                {/* Main content */}
                <div className="flex-1 flex flex-col justify-center items-center space-y-6">
                  {/* French Word with Pronunciation */}
                  <div className="flex items-center justify-center gap-4">
                    <p className="text-6xl font-bold text-gray-900">{word.french_word}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => speakWord(word.french_word, 'fr-FR')}
                      className="p-2"
                    >
                      <Volume2 className="h-8 w-8" />
                    </Button>
                  </div>

                  {/* English Translation with Pronunciation */}
                  <div className="flex items-center justify-center gap-4">
                    <p className="text-4xl font-medium text-gray-700">{word.english_translation}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => speakWord(word.english_translation, 'en-US')}
                      className="p-2"
                    >
                      <Volume2 className="h-6 w-6" />
                    </Button>
                  </div>

                  {/* Example Sentence with Pronunciation */}
                  {word.example_sentence && (
                    <div className="p-6 bg-gray-50 rounded-lg">
                      <p className="text-lg text-gray-600 mb-3">Example:</p>
                      <div className="flex items-center justify-center gap-4">
                        <p className="text-xl italic">{word.example_sentence}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => speakWord(word.example_sentence, 'fr-FR')}
                        >
                          <Volume2 className="h-5 w-5" />
                        </Button>
                      </div>
                      {word.sentence_translation && (
                        <div className="flex items-center justify-center gap-4 mt-3">
                          <p className="text-lg text-gray-500">
                            {word.sentence_translation}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => speakWord(word.sentence_translation, 'en-US')}
                          >
                            <Volume2 className="h-5 w-5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom section */}
                <div className="mt-8 space-y-6">
                  {/* SRS Rating Buttons */}
                  <div className="grid grid-cols-4 gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => onAnswer('again')}
                      className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 text-lg"
                    >
                      Again
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => onAnswer('hard')}
                      className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 text-lg"
                    >
                      Hard
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => onAnswer('good')}
                      className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 text-lg"
                    >
                      Good
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => onAnswer('easy')}
                      className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 text-lg"
                    >
                      Easy
                    </Button>
                  </div>

                  {/* Add/Remove from Leeches Option */}
                  <div className="text-center pt-6 border-t-2 border-gray-300">
                    {currentWord?.again_count >= SRS.LEECH_THRESHOLD ? (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => onAnswer('remove-leech')}
                        className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100 text-xl py-4"
                      >
                        <Check className="h-6 w-6 mr-3" />
                        Remove from Leeches
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => onAnswer('leech')}
                        className="w-full bg-red-50 border-red-200 text-red-700 hover:bg-red-100 text-xl py-4"
                      >
                        <AlertTriangle className="h-6 w-6 mr-3" />
                        Add to Leeches
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Discovery Card Component
function DiscoveryCard({ word, onAnswer, speakWord, sessionProgress }: any) {
  return (
    <Card className="mb-8">
      <CardContent className="p-8">
        {/* Progress Visualization */}
        <div className="mb-8">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">{sessionProgress.total - sessionProgress.reviewed}</div>
              <div className="text-sm text-blue-600">Remaining Unseen</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">{sessionProgress.reviewed}</div>
              <div className="text-sm text-green-600">Reviewed</div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* French Word with Pronunciation */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <h1 className="text-6xl font-bold text-gray-900">{word.french_word}</h1>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => speakWord(word.french_word, 'fr-FR')}
                className="p-3"
              >
                <Volume2 className="h-8 w-8" />
              </Button>
            </div>
          </div>

          {/* English Translation with Pronunciation */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <p className="text-4xl font-medium text-gray-700">{word.english_translation}</p>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => speakWord(word.english_translation, 'en-US')}
                className="p-3"
              >
                <Volume2 className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Example Sentence with Pronunciation */}
          {word.example_sentence && (
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <p className="text-2xl italic text-gray-800">{word.example_sentence}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speakWord(word.example_sentence, 'fr-FR')}
                  >
                    <Volume2 className="h-5 w-5" />
                  </Button>
                </div>
                {word.sentence_translation && (
                  <div className="flex items-center justify-center gap-4">
                    <p className="text-xl text-gray-600">
                      {word.sentence_translation}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => speakWord(word.sentence_translation, 'en-US')}
                    >
                      <Volume2 className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Choice Buttons */}
          <div className="text-center pt-6">
            <div className="flex gap-6 justify-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => onAnswer('learn')}
                className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 text-xl px-12 py-6"
              >
                Learn This
              </Button>
              <Button
                size="lg"
                onClick={() => onAnswer('know')}
                className="bg-green-600 hover:bg-green-700 text-xl px-12 py-6"
              >
                I Know This
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Deep Dive Card Component
function DeepDiveCard({ word, onAnswer, speakWord }: any) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-center text-4xl font-bold">
          {word.french_word}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Audio Button */}
          <div className="text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => speakWord(word.french_word, 'fr-FR')}
              className="mb-6"
            >
              <Volume2 className="h-6 w-6 mr-2" />
              Listen to Pronunciation
            </Button>
          </div>

          <div className="space-y-6">
            {/* Translation */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-4">
                <p className="text-2xl font-medium text-blue-600">{word.english_translation}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => speakWord(word.english_translation, 'en-US')}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Example Sentence */}
            {word.example_sentence && (
              <div className="p-6 bg-gray-50 rounded-lg text-center">
                <p className="text-lg text-gray-600 mb-3">Example:</p>
                <div className="flex items-center justify-center gap-4">
                  <p className="text-lg italic">{word.example_sentence}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speakWord(word.example_sentence, 'fr-FR')}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
                {word.sentence_translation && (
                  <div className="flex items-center justify-center gap-4 mt-3">
                    <p className="text-base text-gray-500">
                      {word.sentence_translation}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => speakWord(word.sentence_translation, 'en-US')}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-center">
            <Button onClick={() => onAnswer('good')} className="px-12 py-4 text-lg">
              Continue
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
