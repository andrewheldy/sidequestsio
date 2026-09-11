import type { TriviaQuestion } from '../data/types.ts'

/**
 * City Trivia game engine — a pure reducer so scoring and flow are unit-testable.
 * Scoring: 50 points per correct answer plus a small streak bonus
 * (+10 per consecutive correct answer already banked, capped at +30).
 */
export const BASE_POINTS = 50
export const STREAK_BONUS_STEP = 10
export const STREAK_BONUS_CAP = 30

export function pointsFor(correct: boolean, streakBefore: number): number {
  if (!correct) return 0
  return BASE_POINTS + Math.min(streakBefore * STREAK_BONUS_STEP, STREAK_BONUS_CAP)
}

export type TriviaPhase = 'question' | 'feedback' | 'complete'

export interface TriviaState {
  questionIndex: number
  score: number
  streak: number
  bestStreak: number
  correctCount: number
  /** Option chosen for the current question, present during feedback. */
  selectedIndex: number | null
  lastAwarded: number
  phase: TriviaPhase
}

export type TriviaAction =
  | { type: 'answer'; optionIndex: number }
  | { type: 'next' }
  | { type: 'restart' }

export const initialTriviaState: TriviaState = {
  questionIndex: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  correctCount: 0,
  selectedIndex: null,
  lastAwarded: 0,
  phase: 'question',
}

export function triviaReducer(
  state: TriviaState,
  action: TriviaAction,
  questions: readonly TriviaQuestion[],
): TriviaState {
  switch (action.type) {
    case 'answer': {
      if (state.phase !== 'question') return state
      const question = questions[state.questionIndex]
      if (!question) return state
      const correct = action.optionIndex === question.correctIndex
      const awarded = pointsFor(correct, state.streak)
      const streak = correct ? state.streak + 1 : 0
      return {
        ...state,
        phase: 'feedback',
        selectedIndex: action.optionIndex,
        score: state.score + awarded,
        lastAwarded: awarded,
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        correctCount: state.correctCount + (correct ? 1 : 0),
      }
    }
    case 'next': {
      if (state.phase !== 'feedback') return state
      const nextIndex = state.questionIndex + 1
      if (nextIndex >= questions.length) {
        return { ...state, phase: 'complete', selectedIndex: null }
      }
      return { ...state, phase: 'question', questionIndex: nextIndex, selectedIndex: null }
    }
    case 'restart':
      return initialTriviaState
  }
}

export function maxPossibleScore(questionCount: number): number {
  let total = 0
  for (let i = 0; i < questionCount; i++) total += pointsFor(true, i)
  return total
}
