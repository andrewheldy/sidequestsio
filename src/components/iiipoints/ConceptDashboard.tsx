import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';
import { DASHBOARD_KPIS, HOURLY_CHECKINS, ORGANIZER_SIGNALS } from './data';
import { SectionHead } from './shared';
import { useCountUp } from './useCountUp';

function Kpi({ value, label, decimals = 0, active }: { value: number; label: string; decimals?: number; active: boolean }) {
  const n = useCountUp(value, active);
  return (
    <div className="iii-kpi">
      <p className="iii-kpi__value">
        {n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      </p>
      <p className="iii-kpi__label">{label}</p>
    </div>
  );
}

const MAX = 1500;
const GRID = [0, 500, 1000, 1500];

/** Single-series bar chart of fictional check-ins by hour; hover or focus a bar for its value. */
function HourlyChart({ active }: { active: boolean }) {
  const peak = HOURLY_CHECKINS.reduce((a, b) => (b.value > a.value ? b : a));
  return (
    <figure className="iii-chart">
      <figcaption className="iii-chart__title">
        QUEST CHECK-INS BY HOUR · FRIDAY <span>(FICTIONAL)</span>
      </figcaption>
      <div className="iii-chart__plot">
        {GRID.map((g) => (
          <span key={g} className="iii-chart__grid" style={{ bottom: `${(g / MAX) * 100}%` }}>
            <span>{g === 0 ? '0' : `${g / 1000}K`}</span>
          </span>
        ))}
        <div className="iii-chart__bars">
          {HOURLY_CHECKINS.map((h) => (
            <div
              key={h.hour}
              className={cn('iii-chart__col', h === peak && 'is-peak')}
              tabIndex={0}
              aria-label={`${h.label}: ${h.value.toLocaleString('en-US')} check-ins`}
            >
              <span
                className="iii-chart__bar"
                style={{ height: active ? `${(h.value / MAX) * 100}%` : '0%' }}
              >
                <span className="iii-chart__tip">
                  {h.label} · {h.value.toLocaleString('en-US')}
                </span>
              </span>
              <span className="iii-chart__x" aria-hidden="true">
                {h.hour}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="iii-sr">
        <table>
          <caption>Fictional quest check-ins by hour, Friday</caption>
          <thead>
            <tr>
              <th scope="col">Hour</th>
              <th scope="col">Check-ins</th>
            </tr>
          </thead>
          <tbody>
            {HOURLY_CHECKINS.map((h) => (
              <tr key={h.hour}>
                <td>{h.label}</td>
                <td>{h.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

export function ConceptDashboard() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section id="dashboard" className="iii-section iii-dash" aria-labelledby="iii-dash-title">
      <div className="iii-wrap">
        <SectionHead
          kicker="ORGANIZER DASHBOARD CONCEPT"
          tone="paper"
          title={<span id="iii-dash-title">SEE THE FESTIVAL MOVE.</span>}
        >
          <p>A live read on where people go, what they play and which activations they choose.</p>
        </SectionHead>

        <div ref={ref} className="iii-console">
          <div className="iii-console__bar">
            <span className="iii-console__dot" aria-hidden="true" />
            <span>SIDEQUESTS ORGANIZER CONSOLE</span>
            <span className="iii-console__concept">CONCEPT DATA</span>
          </div>
          <p className="iii-console__warn">
            THESE NUMBERS ARE FICTIONAL CONCEPT DATA — NOT REAL III POINTS STATISTICS.
          </p>

          <div className="iii-kpis">
            {DASHBOARD_KPIS.map((k) => (
              <Kpi key={k.label} {...k} active={isVisible} />
            ))}
          </div>

          <div className="iii-console__split">
            <HourlyChart active={isVisible} />
            <dl className="iii-highlights">
              <div>
                <dt>MOST DISCOVERED AREA</dt>
                <dd className="is-huge">444</dd>
              </div>
              <div>
                <dt>TRENDING QUEST</dt>
                <dd>WINGS AFTER DARK</dd>
              </div>
              <div>
                <dt>MOST COMPLETED SPONSOR QUEST</dt>
                <dd>THE PERFECT POUR</dd>
              </div>
            </dl>
          </div>

          <div className="iii-understand">
            <p className="iii-understand__label">WHAT ORGANIZERS COULD UNDERSTAND</p>
            <ul>
              {ORGANIZER_SIGNALS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
