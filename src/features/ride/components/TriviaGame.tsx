import { useCallback, useEffect, useReducer, useState } from 'react'
import { cta } from '../brand'
import { cityTriviaQuestions } from '../data'
import { track } from '../lib/analytics.ts'
import { usePrefs } from '../lib/prefs.tsx'
import {
  initialTriviaState,
  maxPossibleScore,
  triviaReducer,
} from '../lib/trivia.ts'
import type { TriviaAction, TriviaState } from '../lib/trivia.ts'
import { Button } from './Button.tsx'
import { Icon } from './Icon.tsx'

const LETTERS = ['A', 'B', 'C', 'D'] as const
const AUTO_ADVANCE_SECONDS = 4

function reducer(state: TriviaState, action: TriviaAction): TriviaState {
  return triviaReducer(state, action, cityTriviaQuestions)
}

function ScorePill({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="min-w-20 rounded-xl border border-border-thin bg-feed-black/60 px-4 py-2 text-center">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-static-gray uppercase">{label}</p>
      <p className="font-display text-2xl leading-tight font-bold text-pulse-lime" data-testid={testId}>
        {value}
      </p>
    </div>
  )
}

/**
 * City Trivia — the genuinely playable JOYRIDE game. Pure engine lives in
 * lib/trivia.ts; this component renders question flow, feedback, scoring,
 * completion, and restart. Auto-advance is disabled under reduced motion.
 */
export function TriviaGame() {
  const [started, setStarted] = useState(false)
  const [state, dispatch] = useReducer(reducer, initialTriviaState)
  const [countdown, setCountdown] = useState<number | null>(null)
  const { prefs } = usePrefs()

  const question = cityTriviaQuestions[state.questionIndex]
  const total = cityTriviaQuestions.length
  const answeredCorrectly =
    state.selectedIndex !== null && question && state.selectedIndex === question.correctIndex

  const goNext = useCallback(() => {
    setCountdown(null)
    dispatch({ type: 'next' })
  }, [])

  // Auto-advance after feedback (skipped when the rider prefers reduced motion).
  const autoAdvancing = state.phase === 'feedback' && !prefs.reducedMotion
  useEffect(() => {
    if (!autoAdvancing) return
    const startedAt = Date.now()
    const id = setInterval(() => {
      const remaining = AUTO_ADVANCE_SECONDS - Math.round((Date.now() - startedAt) / 1000)
      if (remaining <= 0) {
        clearInterval(id)
        setCountdown(null)
        dispatch({ type: 'next' })
      } else {
        setCountdown(remaining)
      }
    }, 500)
    return () => {
      clearInterval(id)
      setCountdown(null)
    }
  }, [autoAdvancing, state.questionIndex])
  const shownCountdown = autoAdvancing ? (countdown ?? AUTO_ADVANCE_SECONDS) : null

  useEffect(() => {
    if (state.phase === 'complete') {
      track('game_completed', {
        game: 'city-trivia',
        score: state.score,
        correct: state.correctCount,
        total,
      })
    }
  }, [state.phase, state.score, state.correctCount, total])

  if (!started) {
    return (
      <section
        aria-label="City Trivia"
        data-testid="trivia-intro"
        className="flex h-full min-h-[420px] flex-col items-center justify-center gap-4 rounded-2xl border border-border-thin bg-carbon p-8 text-center"
      >
        <span className="text-pulse-lime">
          <Icon name="buildings" size={40} />
        </span>
        <h2 className="font-display text-4xl font-bold tracking-tight text-signal-white uppercase">
          City Trivia
        </h2>
        <p className="max-w-md text-lg text-static-gray">
          {total} quick questions about the city outside your window. Streaks earn bonus points.
        </p>
        <p className="text-[14px] font-medium text-static-gray/80">
          1–2 min · 1+ players · top score {maxPossibleScore(total)}
        </p>
        <Button
          variant="primary"
          size="lg"
          data-testid="trivia-start"
          onClick={() => {
            setStarted(true)
            track('game_started', { game: 'city-trivia' })
          }}
        >
          {cta.playNow}
        </Button>
      </section>
    )
  }

  if (state.phase === 'complete') {
    const accuracy = Math.round((state.correctCount / total) * 100)
    return (
      <section
        aria-label="City Trivia results"
        data-testid="trivia-complete"
        className="flex h-full min-h-[420px] flex-col items-center justify-center gap-4 rounded-2xl border border-border-thin bg-carbon p-8 text-center"
      >
        <span className="text-pulse-lime">
          <Icon name="trophy" size={44} />
        </span>
        <h2 className="font-display text-4xl font-bold tracking-tight text-signal-white">
          That is the ride!
        </h2>
        <p className="font-display text-6xl font-bold text-pulse-lime" data-testid="final-score">
          {state.score}
        </p>
        <p className="text-lg text-static-gray">
          {state.correctCount} of {total} correct · {accuracy}% · best streak {state.bestStreak}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button variant="primary" size="lg" data-testid="trivia-restart" onClick={() => dispatch({ type: 'restart' })}>
            Play again
          </Button>
        </div>
      </section>
    )
  }

  if (!question) return null

  return (
    <section
      aria-label="City Trivia"
      data-testid="trivia-game"
      className="flex h-full flex-col gap-4 rounded-2xl border border-border-thin bg-carbon p-6"
    >
      {/* Header: title, progress, score */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-signal-white uppercase">
            City Trivia
          </h2>
          <p className="text-[13px] font-semibold tracking-[0.16em] text-static-gray uppercase" data-testid="question-progress">
            Question {state.questionIndex + 1} of {total}
          </p>
        </div>
        <div className="flex gap-2.5">
          <ScorePill label="Score" value={String(state.score)} testId="trivia-score" />
          <ScorePill label="Streak" value={String(state.streak)} testId="trivia-streak" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-graphite" aria-hidden="true">
        <div
          className="h-full rounded-full bg-pulse-lime transition-[width] duration-300"
          style={{ width: `${((state.questionIndex + (state.phase === 'feedback' ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
        {/* Question + answers */}
        <div className="flex flex-col gap-4">
          <p className="font-display text-[1.7rem] leading-tight font-bold text-signal-white" data-testid="trivia-question">
            {question.prompt}
          </p>
          <div className="grid flex-1 grid-cols-1 content-start gap-2.5 md:grid-cols-2" role="group" aria-label="Answers">
            {question.options.map((option, i) => {
              const isSelected = state.selectedIndex === i
              const isCorrect = i === question.correctIndex
              const inFeedback = state.phase === 'feedback'
              let stateClasses =
                'border-border-thin bg-feed-black/50 text-signal-white hover:border-pulse-lime/60 hover:bg-lime-soft'
              if (inFeedback && isCorrect) {
                stateClasses = 'border-pulse-lime bg-lime-glow text-signal-white'
              } else if (inFeedback && isSelected && !isCorrect) {
                stateClasses = 'border-error/70 bg-error/10 text-signal-white'
              } else if (inFeedback) {
                stateClasses = 'border-border-thin bg-feed-black/30 text-static-gray'
              }
              return (
                <button
                  key={option}
                  type="button"
                  disabled={inFeedback}
                  data-testid={`answer-${i}`}
                  onClick={() => dispatch({ type: 'answer', optionIndex: i })}
                  className={`flex min-h-14 cursor-pointer items-center gap-3.5 rounded-xl border px-4 py-2 text-left text-lg font-semibold transition-colors disabled:cursor-default ${stateClasses}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] font-bold ${
                      inFeedback && isCorrect
                        ? 'bg-pulse-lime text-feed-black'
                        : 'bg-graphite text-signal-white'
                    }`}
                  >
                    {LETTERS[i]}
                  </span>
                  <span className="flex-1">{option}</span>
                  {inFeedback && isCorrect ? (
                    <span className="text-pulse-lime">
                      <Icon name="check" size={24} />
                    </span>
                  ) : null}
                  {inFeedback && isSelected && !isCorrect ? (
                    <span className="text-error">
                      <Icon name="close" size={22} />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right rail: hint or feedback */}
        <div className="flex flex-col justify-center rounded-xl border border-border-thin bg-feed-black/40 p-5 text-center">
          {state.phase === 'question' ? (
            <div className="flex flex-col items-center gap-2" data-testid="trivia-hint">
              <span className="text-static-gray">
                <Icon name="lightning" size={28} />
              </span>
              <p className="text-lg font-semibold text-signal-white">Tap an answer</p>
              <p className="text-[14px] text-static-gray">
                Streak {state.streak >= 2 ? `× ${state.streak} — keep it alive` : 'bonuses stack up to +30'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5" data-testid="trivia-feedback">
              {answeredCorrectly ? (
                <>
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pulse-lime text-feed-black">
                    <Icon name="check" size={30} />
                  </span>
                  <p className="font-display text-3xl font-bold text-pulse-lime uppercase">Correct!</p>
                  <p className="text-lg font-semibold text-signal-white" data-testid="points-awarded">
                    +{state.lastAwarded} points
                  </p>
                </>
              ) : (
                <>
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-error text-error">
                    <Icon name="close" size={28} />
                  </span>
                  <p className="font-display text-3xl font-bold text-signal-white">Not quite</p>
                  <p className="text-base text-static-gray">
                    It was {question.options[question.correctIndex]}.
                  </p>
                </>
              )}
              <p className="text-[14px] leading-snug text-static-gray">{question.funFact}</p>
              <Button variant="primary" onClick={goNext} data-testid="trivia-next" className="mt-1">
                {state.questionIndex + 1 >= total ? 'See results' : 'Next question'}
              </Button>
              {shownCountdown !== null ? (
                <p className="text-[13px] font-medium text-static-gray" data-testid="auto-advance">
                  {state.questionIndex + 1 >= total ? 'Results' : 'Next question'} in {shownCountdown}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
