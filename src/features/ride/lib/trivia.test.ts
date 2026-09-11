import { describe, expect, it } from 'vitest'
import { cityTriviaQuestions } from '../data/games.ts'
import {
  BASE_POINTS,
  initialTriviaState,
  maxPossibleScore,
  pointsFor,
  triviaReducer,
} from './trivia.ts'
import type { TriviaState } from './trivia.ts'

const questions = cityTriviaQuestions

function answerCorrectly(state: TriviaState): TriviaState {
  const q = questions[state.questionIndex]!
  return triviaReducer(state, { type: 'answer', optionIndex: q.correctIndex }, questions)
}

function answerWrong(state: TriviaState): TriviaState {
  const q = questions[state.questionIndex]!
  const wrong = ((q.correctIndex + 1) % 4) as 0 | 1 | 2 | 3
  return triviaReducer(state, { type: 'answer', optionIndex: wrong }, questions)
}

describe('pointsFor', () => {
  it('awards nothing for a wrong answer', () => {
    expect(pointsFor(false, 5)).toBe(0)
  })

  it('awards base points with no streak', () => {
    expect(pointsFor(true, 0)).toBe(BASE_POINTS)
  })

  it('adds +10 per banked streak answer', () => {
    expect(pointsFor(true, 1)).toBe(60)
    expect(pointsFor(true, 2)).toBe(70)
    expect(pointsFor(true, 3)).toBe(80)
  })

  it('caps the streak bonus at +30', () => {
    expect(pointsFor(true, 10)).toBe(BASE_POINTS + 30)
  })
})

describe('triviaReducer', () => {
  it('scores a correct answer and enters feedback', () => {
    const s = answerCorrectly(initialTriviaState)
    expect(s.phase).toBe('feedback')
    expect(s.score).toBe(BASE_POINTS)
    expect(s.streak).toBe(1)
    expect(s.bestStreak).toBe(1)
    expect(s.correctCount).toBe(1)
    expect(s.lastAwarded).toBe(BASE_POINTS)
  })

  it('resets the streak on a wrong answer but keeps the score', () => {
    let s = answerCorrectly(initialTriviaState)
    s = triviaReducer(s, { type: 'next' }, questions)
    s = answerWrong(s)
    expect(s.streak).toBe(0)
    expect(s.bestStreak).toBe(1)
    expect(s.score).toBe(BASE_POINTS)
    expect(s.lastAwarded).toBe(0)
  })

  it('compounds streak bonuses across consecutive correct answers', () => {
    let s = initialTriviaState
    for (let i = 0; i < 3; i++) {
      s = answerCorrectly(s)
      s = triviaReducer(s, { type: 'next' }, questions)
    }
    // 50 + 60 + 70
    expect(s.score).toBe(180)
    expect(s.streak).toBe(3)
  })

  it('ignores answers while showing feedback', () => {
    const once = answerCorrectly(initialTriviaState)
    const twice = triviaReducer(once, { type: 'answer', optionIndex: 0 }, questions)
    expect(twice).toBe(once)
  })

  it('ignores next while a question is open', () => {
    const s = triviaReducer(initialTriviaState, { type: 'next' }, questions)
    expect(s).toBe(initialTriviaState)
  })

  it('completes after the final question and restarts cleanly', () => {
    let s = initialTriviaState
    for (let i = 0; i < questions.length; i++) {
      s = answerCorrectly(s)
      s = triviaReducer(s, { type: 'next' }, questions)
    }
    expect(s.phase).toBe('complete')
    expect(s.correctCount).toBe(questions.length)
    expect(s.score).toBe(maxPossibleScore(questions.length))

    const restarted = triviaReducer(s, { type: 'restart' }, questions)
    expect(restarted).toEqual(initialTriviaState)
  })
})

describe('maxPossibleScore', () => {
  it('matches a perfect run', () => {
    // 50 + 60 + 70 + 80 + 80 + ... (capped at +30 bonus)
    expect(maxPossibleScore(1)).toBe(50)
    expect(maxPossibleScore(2)).toBe(110)
    expect(maxPossibleScore(4)).toBe(260)
    expect(maxPossibleScore(5)).toBe(340)
  })
})
