import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Footprints, QrCode, Sparkles } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import ContactForm from '@/components/ContactForm';
import { Button } from '@/components/ui/button';
import heroImage from '../../brand/mockups/photography-hero-reference.png';
import qrSign from '../../brand/assets/qr-sign.svg';

const outcomes = [
  {
    icon: Footprints,
    title: 'Qualified visits',
    body: 'A quest gives someone a specific reason to walk through your door, not just save your place to a list.',
  },
  {
    icon: Sparkles,
    title: 'Memorable engagement',
    body: 'The objective can spotlight a product, detail, story, or staff interaction that makes your place worth remembering.',
  },
  {
    icon: BarChart3,
    title: 'Measurable action',
    body: 'See scans, quest starts, completions, Community Notes, reward redemptions, and repeat visits—not vague impressions.',
  },
];

const measured = [
  'QR scans and authenticated visits',
  'Quest starts and completion rate',
  'Reward redemptions',
  'Community Notes and proof captures',
  'Repeat visits over time',
  'Website and review-link engagement',
];

export default function Partnerships() {
  return (
    <Layout>
      <section className="bg-[hsl(var(--midnight-900))] text-white">
        <div className="sq-container grid min-h-[680px] items-center gap-10 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:py-16">
          <div className="max-w-xl">
            <p className="sq-overline mb-5 text-[hsl(var(--gold-500))]">Founding partners · Miami</p>
            <h1 className="sq-display max-w-[11ch]">Turn your place into a destination.</h1>
            <p className="mt-7 max-w-lg text-lg leading-relaxed text-white/70">
              We design a memorable quest with you, give guests a simple way to check in, and measure the actions that happen next.
            </p>
            <Button asChild size="lg" className="mt-9 bg-[hsl(var(--gold-500))] text-[hsl(var(--midnight-900))] hover:bg-[hsl(var(--sand-200))]">
              <a href="#partner-form">Tell us about your place <ArrowRight className="h-4 w-4" /></a>
            </Button>
            <p className="mt-4 text-sm text-white/48">Curated together. No self-serve quest publishing.</p>
          </div>

          <div className="sq-threshold relative min-h-[440px] overflow-hidden border border-white/12 lg:min-h-[590px]">
            <img src={heroImage} alt="Guests arriving at a neighborhood venue" className="absolute inset-0 h-full w-full object-cover object-[69%_center]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--midnight-950)/0.74)] via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 bg-[hsl(var(--midnight-900)/0.86)] p-5 backdrop-blur-md">
              <p className="sq-overline text-[hsl(var(--gold-500))]">The simple promise</p>
              <p className="mt-2 font-display text-xl font-bold">Give people something worth showing up for.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 lg:py-28">
        <div className="sq-container">
          <AnimatedSection>
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div><p className="sq-overline mb-4 text-[hsl(var(--ocean-700))]">Why quests work</p><h2 className="sq-section-title">A visit with a reason behind it.</h2></div>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">Passive listings help someone notice you. A well-designed quest helps them arrive, interact, and remember what made your place different.</p>
            </div>
          </AnimatedSection>

          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-border bg-border lg:grid-cols-3">
            {outcomes.map(({ icon: Icon, title, body }) => (
              <AnimatedSection key={title}>
                <article className="h-full bg-card p-6 sm:p-8">
                  <Icon className="h-7 w-7 text-[hsl(var(--ocean-700))]" />
                  <h3 className="mt-8 text-2xl">{title}</h3>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">{body}</p>
                </article>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[hsl(var(--sand-200))] py-16 md:py-24 lg:py-28">
        <div className="sq-container grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <AnimatedSection>
            <div className="mx-auto max-w-md rounded-3xl bg-[hsl(var(--midnight-900))] p-8 sm:p-10">
              <img src={qrSign} alt="Example sidequests QR sign for a partner venue" className="mx-auto w-full max-w-[310px]" />
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <p className="sq-overline mb-4 text-[hsl(var(--ocean-700))]">Low friction at the venue</p>
            <h2 className="sq-section-title">One small sign. A complete guest journey.</h2>
            <ol className="mt-8 space-y-6">
              {[
                ['We shape the quest', 'You bring the place, story, and business goal. We turn them into one clear objective.'],
                ['Guests scan on arrival', 'The QR code opens the right quest and gives them the next action immediately.'],
                ['You see what happened', 'Completion and reward activity roll into a practical engagement view.'],
              ].map(([title, body], index) => (
                <li key={title} className="grid grid-cols-[2rem_1fr] gap-4">
                  <span className="sq-mono pt-1 text-xs font-bold text-[hsl(var(--ocean-700))]">0{index + 1}</span>
                  <div><h3 className="text-lg">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p></div>
                </li>
              ))}
            </ol>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-16 md:py-24 lg:py-28">
        <div className="sq-container grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <AnimatedSection>
            <p className="sq-overline mb-4 text-[hsl(var(--ocean-700))]">What you can measure</p>
            <h2 className="sq-section-title">Evidence from the real journey.</h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">The MVP focuses on behavior tied to a place and quest. We do not dress impressions up as foot traffic.</p>
          </AnimatedSection>
          <AnimatedSection>
            <ul className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
              {measured.map((item) => (
                <li key={item} className="flex min-h-24 items-start gap-3 bg-card p-5">
                  <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--palm-500))]" />
                  <span className="text-sm font-semibold leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </AnimatedSection>
        </div>
      </section>

      <section id="partner-form" className="pb-16 md:pb-24 lg:pb-28 scroll-mt-24">
        <div className="sq-container grid overflow-hidden rounded-3xl bg-[hsl(var(--midnight-900))] text-white lg:grid-cols-[0.8fr_1.2fr]">
          <div className="p-7 sm:p-10 lg:p-12">
            <p className="sq-overline mb-4 text-[hsl(var(--gold-500))]">Start a conversation</p>
            <h2 className="sq-section-title">What should people notice about your place?</h2>
            <p className="mt-5 text-base leading-relaxed text-white/64">Tell us what you run, where it is, and what a memorable visit could look like. We’ll respond with the right next step.</p>
            <Button asChild variant="outline" className="mt-7 border-white/25 text-white hover:bg-white/8">
              <Link to="/partner-terms">Read partner terms</Link>
            </Button>
          </div>
          <div className="bg-background p-6 text-foreground sm:p-10 lg:p-12">
            <ContactForm variant="full" />
          </div>
        </div>
      </section>
    </Layout>
  );
}
