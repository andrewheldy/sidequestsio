import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  Check,
  Footprints,
  MapPin,
  MessageSquareText,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import QuestCard from '@/components/cards/QuestCard';
import heroImage from '../../brand/mockups/photography-hero-reference.png';
import doorwayIcon from '../../brand/logos/icon.svg';

const featuredQuests = [
  {
    questId: '30000000-0000-0000-0000-000000000003',
    title: 'Find the mural that sees you back',
    location: 'Wynwood · Miami',
    category: 'Art after dark',
    duration: '25 min',
    concept: 'Choose one wall, notice the detail everyone walks past, and leave a clue for the next explorer.',
    xp: 130,
    points: 25,
    image: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=1200&h=900&fit=crop',
  },
  {
    questId: '30000000-0000-0000-0000-000000000001',
    title: 'Trace a cup back to its origin',
    location: 'Wynwood · Miami',
    category: 'Food & drink',
    duration: '20 min',
    concept: 'Taste one single-origin coffee, ask where it began, and earn a reward for following the story.',
    xp: 100,
    points: 20,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&h=900&fit=crop',
  },
  {
    questId: '30000000-0000-0000-0000-000000000005',
    title: 'Claim a skyline nobody frames',
    location: 'Brickell Key · Miami',
    category: 'Outdoors',
    duration: '35 min',
    concept: 'Walk the long way around the key and capture the city from the quiet side of the water.',
    xp: 115,
    points: 20,
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&h=900&fit=crop',
  },
];

const loop = [
  { step: '01', title: 'Spot something worth the detour', body: 'Browse a short, curated list—not an endless feed.', icon: MapPin },
  { step: '02', title: 'Go there', body: 'The real place is the game. Directions get you to the starting point.', icon: Footprints },
  { step: '03', title: 'Scan and do the quest', body: 'A QR code confirms you arrived. The objective tells you what to notice, ask, or try.', icon: QrCode },
  { step: '04', title: 'Keep the memory', body: 'Earn XP and Points, capture the moment, and leave a useful note behind.', icon: Camera },
];

const Index = () => (
  <Layout>
    <section className="overflow-hidden bg-[hsl(var(--midnight-900))] text-[hsl(var(--sand-50))]">
      <div className="sq-container grid min-h-[calc(100svh-72px)] items-center gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-16">
        <div className="relative z-10 max-w-xl">
          <div className="mb-7 flex items-center gap-3">
            <img src={doorwayIcon} alt="" className="h-9 w-9 brightness-0 invert" aria-hidden />
            <p className="sq-overline text-[hsl(var(--gold-500))]">Miami field guide · issue 01</p>
          </div>

          <h1 className="sq-display max-w-[10ch]">Miami has a hidden side. Go find it.</h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-white/72 md:text-xl">
            Curated quests turn local places into small adventures. Go there, scan in, complete the objective, and bring back a story.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-[hsl(var(--gold-500))] text-[hsl(var(--midnight-900))] hover:bg-[hsl(var(--sand-200))]">
              <Link to="/app/explore">
                Find a quest <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/25 text-white hover:border-white/45 hover:bg-white/8">
              <Link to="/partnerships">Bring quests to your place</Link>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/58">
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[hsl(var(--palm-500))]" /> Free for explorers</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[hsl(var(--palm-500))]" /> Curated in Miami</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[hsl(var(--palm-500))]" /> Real-world rewards</span>
          </div>
        </div>

        <div className="relative min-h-[430px] lg:min-h-[650px]">
          <div className="sq-threshold absolute inset-0 overflow-hidden border border-white/12">
            <img src={heroImage} alt="Two explorers arriving at a neighborhood venue" className="h-full w-full object-cover object-[68%_center]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--midnight-900)/0.72)] via-transparent to-transparent" />
          </div>

          <Link
            to="/quests/30000000-0000-0000-0000-000000000003"
            className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/20 bg-[hsl(var(--midnight-900)/0.88)] p-4 text-white backdrop-blur-md focus-visible:outline-none sm:left-auto sm:w-[330px] lg:bottom-7 lg:right-7"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="sq-overline text-[hsl(var(--gold-500))]">Quest nearby</span>
              <span className="sq-mono text-xs text-white/54">+130 XP</span>
            </div>
            <p className="font-display text-xl font-bold leading-tight tracking-[-0.035em]">Find the mural that sees you back</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-white/62"><MapPin className="h-4 w-4" /> Wynwood · 25 min</p>
          </Link>
        </div>
      </div>
    </section>

    <section aria-label="The sidequests loop" className="border-b border-border bg-card">
      <div className="sq-container grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        {['Discover', 'Arrive', 'Complete', 'Remember'].map((label, index) => (
          <div key={label} className="flex min-h-[86px] items-center gap-3 px-4 sm:px-6">
            <span className="sq-mono text-xs font-bold text-[hsl(var(--ocean-700))]">0{index + 1}</span>
            <span className="font-display text-sm font-bold">{label}</span>
          </div>
        ))}
      </div>
    </section>

    <section className="py-16 md:py-24 lg:py-28">
      <div className="sq-container">
        <AnimatedSection>
          <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="sq-overline mb-4 text-[hsl(var(--ocean-700))]">This week's waypoints</p>
              <h2 className="sq-section-title max-w-[13ch]">Three good reasons to leave the house.</h2>
            </div>
            <Button asChild variant="outline"><Link to="/quests">See every quest <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        </AnimatedSection>

        <div className="grid gap-5 lg:grid-cols-3">
          {featuredQuests.map((quest) => <QuestCard key={quest.questId} {...quest} />)}
        </div>
      </div>
    </section>

    <section id="how-it-works" className="relative overflow-hidden bg-[hsl(var(--sand-200))] py-16 md:py-24 lg:py-28">
      <div className="sq-container">
        <AnimatedSection>
          <p className="sq-overline mb-4 text-[hsl(var(--ocean-700))]">How a quest works</p>
          <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <h2 className="sq-section-title max-w-[10ch]">The screen is only the doorway.</h2>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              sidequests gets you moving quickly, then gets out of the way. Every step points back to the place, the people, and what is actually happening there.
            </p>
          </div>
        </AnimatedSection>

        <div className="relative mt-14 grid gap-4 md:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-[hsl(var(--midnight-900)/0.18)] lg:block" aria-hidden />
          {loop.map(({ step, title, body, icon: Icon }) => (
            <AnimatedSection key={step} className="relative">
              <article className="h-full rounded-2xl border border-[hsl(var(--midnight-900)/0.12)] bg-[hsl(var(--sand-50))] p-5 lg:border-0 lg:bg-transparent lg:p-0">
                <div className="relative z-10 mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-[hsl(var(--midnight-900)/0.16)] bg-[hsl(var(--sand-50))]">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <p className="sq-mono mb-3 text-xs font-bold text-[hsl(var(--ocean-700))]">{step}</p>
                <h3 className="text-xl leading-tight">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>

    <section className="py-16 md:py-24 lg:py-28">
      <div className="sq-container grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <AnimatedSection>
          <div className="relative overflow-hidden rounded-3xl bg-[hsl(var(--midnight-900))] p-7 text-white sm:p-10">
            <div className="mb-12 flex items-center justify-between">
              <MessageSquareText className="h-7 w-7 text-[hsl(var(--gold-500))]" aria-hidden />
              <span className="sq-overline text-white/42">Community Note · after completion</span>
            </div>
            <blockquote className="font-display text-2xl font-bold leading-snug tracking-[-0.035em] sm:text-3xl">
              “Take the path along the jetty. There’s a quiet bench where the skyline finally slows down.”
            </blockquote>
            <p className="mt-8 text-sm text-white/58">A useful clue for the next explorer—not a star rating.</p>
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <p className="sq-overline mb-4 text-[hsl(var(--ocean-700))]">Leave the map better</p>
          <h2 className="sq-section-title">Every completed quest adds local knowledge.</h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Capture the moment for your Adventure Log, then leave one specific thing worth knowing. Community Notes help other people notice more when they arrive.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
              <Camera className="mt-0.5 h-5 w-5 text-[hsl(var(--ocean-700))]" />
              <div><p className="font-bold">Keep the memory</p><p className="mt-1 text-sm text-muted-foreground">Your Adventure Log grows with every quest.</p></div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
              <Sparkles className="mt-0.5 h-5 w-5 text-[hsl(var(--gold-700))]" />
              <div><p className="font-bold">Help the next person</p><p className="mt-1 text-sm text-muted-foreground">Share a tip, detail, or discovery.</p></div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>

    <section className="pb-16 md:pb-24 lg:pb-28">
      <AnimatedSection className="sq-container">
        <div className="grid overflow-hidden rounded-3xl bg-[hsl(var(--ocean-700))] text-white lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-7 sm:p-10 lg:p-14">
            <p className="sq-overline mb-4 text-[hsl(var(--gold-500))]">For Miami businesses</p>
            <h2 className="sq-section-title max-w-[12ch]">Turn your place into somewhere people talk about.</h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/72">
              We collaborate on one memorable objective, place a simple QR entry point, and measure real visits and completions.
            </p>
            <Button asChild size="lg" className="mt-8 bg-[hsl(var(--gold-500))] text-[hsl(var(--midnight-900))] hover:bg-[hsl(var(--sand-200))]">
              <Link to="/partnerships">See the partner path <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 border-t border-white/15 lg:border-l lg:border-t-0">
            {[
              ['Scan', 'Verified arrival'],
              ['Do', 'Meaningful action'],
              ['Earn', 'Tangible reward'],
              ['Return', 'Repeat visit'],
            ].map(([title, body]) => (
              <div key={title} className="flex min-h-32 flex-col justify-end border-b border-r border-white/15 p-5">
                <p className="sq-overline text-[hsl(var(--gold-500))]">{title}</p>
                <p className="mt-2 text-sm text-white/64">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>
    </section>
  </Layout>
);

export default Index;
