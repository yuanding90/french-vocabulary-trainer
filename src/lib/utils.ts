import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// SRS (Spaced Repetition System) calculations
export const SRS = {
  AGAIN_INTERVAL: 0,
  NEW_WORD_INTERVAL: 1,
  MASTERED_INTERVAL: 365,
  EASE_FACTOR_DEFAULT: 2.5,
  MIN_EASE_FACTOR: 1.3,
  LEECH_THRESHOLD: 4,
  NEAR_FUTURE_THRESHOLD: 3, // Days ahead to pull forward for review
}

export function calculateNextReview(
  currentInterval: number,
  easeFactor: number,
  rating: 'again' | 'hard' | 'good' | 'easy'
): { interval: number; easeFactor: number } {
  let newInterval: number
  let newEaseFactor: number

  switch (rating) {
    case 'again':
      newInterval = SRS.AGAIN_INTERVAL
      newEaseFactor = Math.max(SRS.MIN_EASE_FACTOR, easeFactor - 0.2)
      break
    case 'hard':
      newInterval = Math.max(1, Math.floor(currentInterval * 0.6))
      newEaseFactor = Math.max(SRS.MIN_EASE_FACTOR, easeFactor - 0.15)
      break
    case 'good':
      newInterval = Math.floor(currentInterval * easeFactor)
      newEaseFactor = easeFactor
      break
    case 'easy':
      newInterval = Math.floor(currentInterval * easeFactor * 1.3)
      newEaseFactor = easeFactor + 0.15
      break
    default:
      newInterval = currentInterval
      newEaseFactor = easeFactor
  }

  return { interval: newInterval, easeFactor: newEaseFactor }
}

export function isDueForReview(nextReviewDate: string): boolean {
  return new Date(nextReviewDate) <= new Date()
}

export function getDaysUntilReview(nextReviewDate: string): number {
  const now = new Date()
  const reviewDate = new Date(nextReviewDate)
  const diffTime = reviewDate.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function isNearFuture(nextReviewDate: string): boolean {
  const daysUntil = getDaysUntilReview(nextReviewDate)
  return daysUntil > 0 && daysUntil <= SRS.NEAR_FUTURE_THRESHOLD
}

// Text-to-speech utility
export function speakText(text: string, language: 'fr-FR' | 'en-US' = 'fr-FR') {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    utterance.rate = 0.8
    speechSynthesis.speak(utterance)
  }
}

// Date utilities
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function isToday(date: string | Date): boolean {
  const today = new Date()
  const checkDate = new Date(date)
  return (
    today.getFullYear() === checkDate.getFullYear() &&
    today.getMonth() === checkDate.getMonth() &&
    today.getDate() === checkDate.getDate()
  )
}

// Session utilities
export function getCardType(): 'recognition' | 'production' | 'listening' {
  const types = ['recognition', 'production', 'listening']
  return types[Math.floor(Math.random() * types.length)] as 'recognition' | 'production' | 'listening'
}

export function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

export function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  const normalizedUser = normalizeText(userAnswer.trim())
  const normalizedCorrect = normalizeText(correctAnswer)
  return normalizedUser === normalizedCorrect
}
