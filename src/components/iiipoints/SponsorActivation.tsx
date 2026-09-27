import { SPONSOR_QUESTS } from './data';
import { Reveal, SectionHead } from './shared';
import { SponsorQuestCard } from './SponsorQuestCard';

export function SponsorQuests() {
  return (
    <section id="brands" className="iii-section iii-sponsors" aria-labelledby="iii-sponsors-title">
      <div className="iii-wrap">
        <div className="iii-sponsors__head">
          <SectionHead
            kicker="CONCEPT SPONSOR QUESTS"
            tone="paper"
            title={
              <span id="iii-sponsors-title">
                SPONSORS BECOME
                <br />
                <em>PART OF THE ADVENTURE.</em>
              </span>
            }
          >
            <p>
              Three sample activations using III Points sponsors as illustrative examples. Destinations, rituals,
              secrets — not logo placements. Play them.
            </p>
          </SectionHead>
          <p className="iii-disclaim-chip">
            MOCK CONCEPTS ONLY · NOT LIVE CAMPAIGNS · NOT CREATED WITH OR APPROVED BY THESE BRANDS
          </p>
        </div>
        <div className="iii-sponsors__grid">
          {SPONSOR_QUESTS.map((q) => (
            <SponsorQuestCard key={q.id} quest={q} />
          ))}
        </div>
      </div>
    </section>
  );
}

const CHAIN = ['LOGO', 'ACTIVATION', 'QUEST', 'PARTICIPATION', 'REWARD', 'MEMORY'];

const SIGNALS = [
  { name: 'DISCOVERY', line: 'How attendees found the activation — and which quest sent them.' },
  { name: 'ATTENDEE PARTICIPATION', line: 'Who chose to start the quest, not just walk past.' },
  { name: 'QUEST COMPLETION', line: 'How many finished every objective, and where they dropped off.' },
  { name: 'PHYSICAL FOOT TRAFFIC', line: 'Verified on-site check-ins at the activation, by hour.' },
  { name: 'REWARD REDEMPTION', line: 'Which perks were claimed, and when.' },
  { name: 'POST-EVENT ENGAGEMENT', line: 'Who kept playing in Miami after the gates closed.' },
];

/** "Why sponsor quests matter": the logo → memory transformation. */
export function SponsorActivation() {
  return (
    <section className="iii-section iii-why" aria-labelledby="iii-why-title">
      <div className="iii-wrap">
        <h2 id="iii-why-title" className="iii-why__statement">
          <span className="iii-why__a">
            DON'T JUST PUT A <s>LOGO</s>
            <br />
            IN FRONT OF THEM.
          </span>
          <span className="iii-why__b">
            GIVE THEM SOMETHING
            <br />
            WORTH DISCOVERING.
          </span>
        </h2>
        <div className="iii-why__lede">
          <p>Traditional sponsorship asks attendees to notice a brand.</p>
          <p>
            <strong>sidequests gives them a reason to interact with it.</strong>
          </p>
        </div>

        <Reveal as="ol" className="iii-chain" threshold={0.3}>
          {CHAIN.map((c, i) => (
            <li key={c} style={{ ['--i' as string]: i }}>
              <span className="iii-chain__node">{c}</span>
              {i < CHAIN.length - 1 && (
                <span className="iii-chain__arrow" aria-hidden="true">
                  ↓
                </span>
              )}
            </li>
          ))}
        </Reveal>

        <div className="iii-signals">
          <p className="iii-kicker">
            <span className="iii-kicker__node" aria-hidden="true" />
            POTENTIAL MEASURABLE INTERACTION CATEGORIES
          </p>
          <ul className="iii-signals__grid">
            {SIGNALS.map((s, i) => (
              <li key={s.name}>
                <span className="iii-signals__num">{String(i + 1).padStart(2, '0')}</span>
                <span className="iii-signals__name">{s.name}</span>
                <span className="iii-signals__line">{s.line}</span>
              </li>
            ))}
          </ul>
          <p className="iii-footnote">
            Categories sidequests could measure for a partner. Illustrative — no outcomes are implied or guaranteed.
          </p>
        </div>
      </div>
    </section>
  );
}
