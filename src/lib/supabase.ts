import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Vocabulary {
  id: number
  french_word: string
  english_translation: string
  example_sentence: string
  sentence_translation: string
  created_at: string
}

export interface UserProgress {
  id: number
  user_id: string
  word_id: number
  deck_id: string
  repetitions: number
  interval: number
  ease_factor: number
  next_review_date: string
  again_count: number
  created_at: string
  updated_at: string
}

export interface VocabularyDeck {
  id: string
  name: string
  description: string
  difficulty_level: string
  total_words: number
  created_at: string
  is_active: boolean
}

export interface UserDeckProgress {
  id: string
  user_id: string
  deck_id: string
  words_learned: number
  words_mastered: number
  total_reviews: number
  current_streak: number
  last_studied_at: string | null
  created_at: string
  updated_at: string
}

export interface StudySession {
  id: string
  user_id: string
  deck_id: string
  session_type: 'review' | 'discovery' | 'deep_dive'
  words_studied: number
  correct_answers: number
  session_duration: number
  started_at: string
  completed_at: string | null
  created_at: string
}

export interface DeckVocabulary {
  id: string
  deck_id: string
  vocabulary_id: number
  word_order: number
  created_at: string
}
