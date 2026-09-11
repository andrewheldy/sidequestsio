import { useState } from 'react'
import { homePrompt, modules } from '../brand'
import { featuredStory, sponsorForSlot } from '../data'
import type { NewsStory } from '../data/types.ts'
import { sendToPhone } from '../lib/handoffClient.ts'
import type { HandoffRecord } from '../lib/handoff.ts'
import { DestinationTile } from '../components/DestinationTile.tsx'
import { EditorialHero } from '../components/EditorialHero.tsx'
import { LivePulseRow } from '../components/LivePulseRow.tsx'
import { MusicPlayer } from '../components/MusicPlayer.tsx'
import { QrModal } from '../components/QrModal.tsx'
import { SponsoredCard } from '../components/SponsoredCard.tsx'
import { StoryDetailModal } from '../components/StoryDetailModal.tsx'
import { TopNav } from '../components/TopNav.tsx'
import type { IconName } from '../components/Icon.tsx'

const MODULE_ICONS: Record<string, IconName> = {
  news: 'globe',
  music: 'musicNote',
  entertainment: 'sparkle',
  joyride: 'controller',
}

/**
 * THE FEED home — hero, four destinations, Live Pulse, player, and one labeled
 * sponsored banner. Composed to fit 1280×800 without page scrolling.
 */
export function HomeScreen() {
  const [openStory, setOpenStory] = useState<NewsStory | null>(null)
  const [handoff, setHandoff] = useState<HandoffRecord | null>(null)
  const sponsor = sponsorForSlot('home')

  return (
    <div className="anim-fade-in flex h-full flex-col gap-2.5 p-4" data-testid="home-screen">
      <TopNav />

      <div className="min-h-0 flex-1">
        <EditorialHero story={featuredStory} onOpen={() => setOpenStory(featuredStory)} />
      </div>

      <nav aria-label={homePrompt} className="grid shrink-0 grid-cols-4 gap-2.5">
        {Object.values(modules).map((m) => (
          <DestinationTile
            key={m.key}
            moduleKey={m.key}
            name={m.name}
            description={m.description}
            route={m.route}
            icon={MODULE_ICONS[m.key] ?? 'sparkle'}
          />
        ))}
      </nav>

      <LivePulseRow />

      <MusicPlayer variant="bar" />

      <SponsoredCard
        placement={sponsor}
        onSendToPhone={() =>
          setHandoff(
            sendToPhone({
              kind: 'offer',
              slug: sponsor.id,
              title: `${sponsor.advertiser} — ${sponsor.offer}`,
              detail: sponsor.headline,
              sponsorLabel: 'Sponsored · Demo sponsored placement',
            }),
          )
        }
      />

      <StoryDetailModal
        story={openStory}
        onClose={() => setOpenStory(null)}
        onSendToPhone={(story) =>
          setHandoff(
            sendToPhone({
              kind: 'story',
              slug: story.slug,
              title: story.headline,
              detail: story.summary,
            }),
          )
        }
      />
      <QrModal record={handoff} onClose={() => setHandoff(null)} />
    </div>
  )
}
