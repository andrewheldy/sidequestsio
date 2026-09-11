import { useEffect, useState } from 'react'
import { cta, demoDisclosure } from '../brand'
import { track } from '../lib/analytics.ts'
import { timeAgo } from '../lib/format.ts'
import { useSaved } from '../lib/saved.ts'
import type { NewsStory } from '../data/types.ts'
import { Button } from './Button.tsx'
import { CardArt } from './CardArt.tsx'
import { EqualizerGlyph } from './PulseWave.tsx'
import { Modal } from './Modal.tsx'

interface StoryDetailModalProps {
  story: NewsStory | null
  onClose: () => void
  onSendToPhone: (story: NewsStory) => void
}

function StoryDetailContent({
  story,
  onSendToPhone,
}: {
  story: NewsStory
  onSendToPhone: (story: NewsStory) => void
}) {
  const [listening, setListening] = useState(false)
  const [saved, toggleSaved] = useSaved(story.id)

  return (
    <>
      <div className="relative h-40">
        <CardArt art={story.art} scrim />
        <p className="absolute bottom-3 left-6 text-[13px] font-semibold tracking-[0.18em] text-pulse-lime uppercase">
          {story.kicker}
        </p>
      </div>
      <div className="flex flex-col gap-4 p-6 pt-4">
        <h2
          id="story-title"
          className="font-display text-3xl leading-tight font-bold tracking-tight text-signal-white"
        >
          {story.headline}
        </h2>
        <p className="text-[15px] font-medium text-static-gray">
          {story.source} · {timeAgo(story.publishedAgoMinutes)} · {story.readMinutes} min read
        </p>
        <p className="max-w-2xl text-lg leading-relaxed text-signal-white/90">{story.summary}</p>
        <ul className="flex flex-col gap-2">
          {story.keyPoints.map((point) => (
            <li key={point} className="flex items-start gap-3 text-base text-static-gray">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-lime" />
              {point}
            </li>
          ))}
        </ul>
        {listening ? (
          <p
            className="flex items-center gap-2 text-sm font-medium text-pulse-lime"
            data-testid="listening-note"
          >
            <EqualizerGlyph size={12} />
            Playing audio summary — simulated in this demo, no live audio.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 border-t border-border-thin pt-4">
          <Button
            variant={listening ? 'secondary' : 'primary'}
            icon="headphones"
            onClick={() => setListening((v) => !v)}
            data-testid="listen-summary"
          >
            {listening ? 'Stop listening' : 'Listen to summary'}
          </Button>
          <Button
            variant="secondary"
            icon={saved ? 'check' : 'bookmark'}
            onClick={toggleSaved}
            data-testid="save-story"
          >
            {saved ? 'Saved' : cta.saveForLater}
          </Button>
          <Button variant="secondary" icon="phone" onClick={() => onSendToPhone(story)}>
            {cta.sendToPhone}
          </Button>
        </div>
        <p className="text-xs text-static-gray/70">{demoDisclosure.contentNote}</p>
      </div>
    </>
  )
}

/**
 * Story detail — a brief, glanceable summary (headline, key points, actions),
 * deliberately not a full-length article wall.
 */
export function StoryDetailModal({ story, onClose, onSendToPhone }: StoryDetailModalProps) {
  useEffect(() => {
    if (story) track('content_opened', { contentId: story.id, module: 'news' })
  }, [story])

  if (!story) return null

  return (
    <Modal open onClose={onClose} labelledBy="story-title" testId="story-detail">
      <StoryDetailContent key={story.id} story={story} onSendToPhone={onSendToPhone} />
    </Modal>
  )
}
