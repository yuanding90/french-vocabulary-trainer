import { supabase } from './supabase'
import { Vocabulary, UserProgress } from './supabase'
import { isDueForReview, isNearFuture, SRS } from './utils'

export interface QueueManager {
  buildQueues: (deckId: string, userId: string) => Promise<{
    unseen: Vocabulary[]
    review: Vocabulary[]
    practice: Vocabulary[]
    nearFuture: Vocabulary[]
  }>
  calculateMetrics: (userId: string, deckId: string) => Promise<{
    unseen: number
    leeches: number
    learning: number
    strengthening: number
    consolidating: number
    mastered: number
  }>
}

export class SessionQueueManager implements QueueManager {
  // Apply smart spacing for leeches to prevent fatigue
  private applyLeechSpacing(words: Vocabulary[], progressMap: Map<string, any>): Vocabulary[] {
    // Separate leeches from regular words
    const leeches: Vocabulary[] = []
    const regularWords: Vocabulary[] = []
    
    words.forEach(word => {
      const progress = progressMap.get(word.id)
      const isLeech = progress && progress.again_count >= 4
      
      if (isLeech) {
        leeches.push(word)
      } else {
        regularWords.push(word)
      }
    })
    
    // Shuffle both arrays
    leeches.sort(() => Math.random() - 0.5)
    regularWords.sort(() => Math.random() - 0.5)
    
    // Apply spacing: insert leeches every 3-5 regular words
    const spacedWords: Vocabulary[] = []
    const spacingRange = { min: 3, max: 5 }
    let leechIndex = 0
    let regularIndex = 0
    let wordsSinceLastLeech = 0
    
    while (leechIndex < leeches.length || regularIndex < regularWords.length) {
      // Decide whether to add a leech or regular word
      const shouldAddLeech = leechIndex < leeches.length && 
                           (wordsSinceLastLeech >= spacingRange.min || regularIndex >= regularWords.length)
      
      if (shouldAddLeech) {
        spacedWords.push(leeches[leechIndex])
        leechIndex++
        wordsSinceLastLeech = 0
      } else if (regularIndex < regularWords.length) {
        spacedWords.push(regularWords[regularIndex])
        regularIndex++
        wordsSinceLastLeech++
      }
    }
    
    return spacedWords
  }

  async buildQueues(deckId: string, userId: string) {
    try {
      // Get all vocabulary for the deck
      const { data: deckVocab, error: deckError } = await supabase
        .from('deck_vocabulary')
        .select('vocabulary_id')
        .eq('deck_id', deckId)
        .order('word_order')

      if (deckError) throw deckError

      const vocabIds = deckVocab.map(item => item.vocabulary_id)

      // Get vocabulary words
      const { data: words, error: wordsError } = await supabase
        .from('vocabulary')
        .select('*')
        .in('id', vocabIds)

      if (wordsError) throw wordsError

      // Get user progress for this deck
      const { data: userProgress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('deck_id', deckId)

      if (progressError) throw progressError

      const progressMap = new Map(userProgress?.map(p => [p.word_id, p]) || [])

      // Build queues
      const unseen: Vocabulary[] = []
      const review: Vocabulary[] = []
      const practice: Vocabulary[] = []
      const nearFuture: Vocabulary[] = []

      words?.forEach(word => {
        const progress = progressMap.get(word.id)
        
        if (!progress) {
          // No progress - unseen word
          unseen.push(word)
        } else {
          // Has progress - check if due for review
          if (isDueForReview(progress.next_review_date)) {
            review.push(word)
          } else if (isNearFuture(progress.next_review_date)) {
            nearFuture.push(word)
          } else {
            // Not due - available for practice
            practice.push(word)
          }
        }
      })

      // Apply leech spacing to review queue
      const spacedReview = this.applyLeechSpacing(review, progressMap)

      return { unseen, review: spacedReview, practice, nearFuture }
    } catch (error) {
      console.error('Error building queues:', error)
      return { unseen: [], review: [], practice: [], nearFuture: [] }
    }
  }

  async calculateMetrics(userId: string, deckId: string) {
    try {
      const { data: userProgress, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('deck_id', deckId)

      if (error) throw error

      const metrics = {
        unseen: 0,
        leeches: 0,
        learning: 0,
        strengthening: 0,
        consolidating: 0,
        mastered: 0
      }

      // Count words by progress state
      userProgress?.forEach(progress => {
        if (progress.again_count >= SRS.LEECH_THRESHOLD) {
          metrics.leeches++
        } else if (progress.interval < 7) {
          metrics.learning++
        } else if (progress.interval < 21) {
          metrics.strengthening++
        } else if (progress.interval < 60) {
          metrics.consolidating++
        } else {
          metrics.mastered++
        }
      })

      // Calculate unseen words
      const { data: deckVocab } = await supabase
        .from('deck_vocabulary')
        .select('vocabulary_id')
        .eq('deck_id', deckId)

      const totalWords = deckVocab?.length || 0
      const seenWords = userProgress?.length || 0
      metrics.unseen = Math.max(0, totalWords - seenWords)

      return metrics
    } catch (error) {
      console.error('Error calculating metrics:', error)
      return {
        unseen: 0,
        leeches: 0,
        learning: 0,
        strengthening: 0,
        consolidating: 0,
        mastered: 0
      }
    }
  }
}

export const sessionQueueManager = new SessionQueueManager()
