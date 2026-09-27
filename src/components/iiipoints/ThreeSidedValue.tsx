import { Reveal, SectionHead } from './shared';

const SIDES = [
  {
    who: 'ATTENDEES',
    tone: 'lime',
    lines: ['Discover more.', 'Explore intentionally.', 'Unlock experiences.', 'Turn the festival into an adventure.'],
  },
  {
    who: 'III POINTS',
    tone: 'yellow',
    lines: [
      'Encourage exploration.',
      'Surface overlooked areas.',
      'Create additional digital engagement.',
      'Understand interaction patterns.',
    ],
  },
  {
    who: 'BRANDS',
    tone: 'coral',
    lines: [
      'Turn activations into experiences.',
      'Drive voluntary participation.',
      'Connect physical and digital engagement.',
      'Extend campaigns into Miami.',
    ],
  },
];

export function ThreeSidedValue() {
  return (
    <section className="iii-section iii-value" aria-labelledby="iii-value-title">
      <div className="iii-wrap">
        <SectionHead
          kicker="THREE-SIDED VALUE"
          title={
            <span id="iii-value-title">
              ONE EXPERIENCE.
              <br />
              THREE WINNERS.
            </span>
          }
        />
        <Reveal className="iii-value__grid">
          <span className="iii-value__hub" aria-hidden="true">
            ONE EXPERIENCE
          </span>
          {SIDES.map((s, i) => (
            <article key={s.who} className={`iii-value__block is-${s.tone}`} style={{ ['--i' as string]: i }}>
              <p className="iii-value__num">0{i + 1}</p>
              <h3 className="iii-value__who">{s.who}</h3>
              <ul>
                {s.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
