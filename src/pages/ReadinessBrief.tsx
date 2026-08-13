import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Cloud,
  Code2,
  Compass,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  Flag,
  Layers3,
  MapPinned,
  Menu,
  Moon,
  Network,
  Route,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import "./readiness-brief.css";

type Theme = "light" | "dark";
type ArchitectureView = "system" | "risk";
type CostMode = "pilot" | "launch" | "funded";

const navigation = [
  ["Stage", "stage"],
  ["Architecture", "architecture"],
  ["Economy", "economy"],
  ["Experience", "experience"],
  ["Readiness", "readiness"],
  ["GTM", "gtm"],
  ["Costs", "costs"],
  ["Legal", "legal"],
  ["Plan", "plan"],
] as const;

const maturity = [
  { name: "Architecture", score: 75, note: "Clear SPA and repository boundary; production truth is split across profile tables." },
  { name: "UX + onboarding", score: 60, note: "Six-step identity flow is polished; the first quest and reward handoff still use mock logic." },
  { name: "Core quest loop", score: 55, note: "Discovery, scan, completion and proof surfaces exist; end-to-end verification remains incomplete." },
  { name: "Miami content", score: 55, note: "A meaningful quest and venue pipeline exists; field permissions and live density are unproven." },
  { name: "XP + points", score: 45, note: "The mental model is sound; storage ownership and initial level values disagree." },
  { name: "Legal + compliance", score: 45, note: "Policy drafts exist; entity, rights, request handling and launch review need completion." },
  { name: "Marketing + GTM", score: 35, note: "The neighborhood wedge is credible; acquisition instrumentation and proof are not live." },
  { name: "Partner operations", score: 35, note: "Playbooks and CRM structure exist; contracting, training and renewal cadence need field testing." },
  { name: "Launch operations", score: 20, note: "No verified production runbook, incident rehearsal or measured closed pilot yet." },
];

const costs = {
  pilot: {
    label: "Closed pilot",
    oneTime: "$1.5k–$5k",
    monthly: "$250–$1k / mo",
    summary: "One dense neighborhood, founder-led sales and a small invited cohort.",
    bars: [
      ["Formation + legal", 58, "$600–$2k"],
      ["Field materials", 40, "$300–$1k"],
      ["Software + tools", 18, "$250–$500"],
      ["Contingency", 30, "$350–$1.5k"],
    ],
  },
  launch: {
    label: "Miami launch",
    oneTime: "$8k–$25k",
    monthly: "$1.5k–$6k / mo",
    summary: "A repeatable partner operation, local creator support and launch-ready trust systems.",
    bars: [
      ["Legal + insurance", 54, "$2k–$6k"],
      ["Field production", 76, "$2.5k–$8k"],
      ["Growth + creators", 88, "$3k–$9k"],
      ["Software + ops", 28, "$500–$2k"],
    ],
  },
  funded: {
    label: "Funded push",
    oneTime: "$35k–$90k",
    monthly: "$12k–$35k / mo",
    summary: "Paid acquisition, dedicated operations and enough runway to test more than one cluster.",
    bars: [
      ["Product + QA", 82, "$12k–$30k"],
      ["Growth + creative", 100, "$15k–$38k"],
      ["Field operations", 74, "$6k–$16k"],
      ["Legal + reserves", 48, "$2k–$6k"],
    ],
  },
} as const;

const levelForXp = (xp: number) => {
  let level = 1;
  const threshold = (n: number) => (100 * n * (n - 1)) / 2;
  while (threshold(level + 1) <= xp) level += 1;
  const current = threshold(level);
  const next = threshold(level + 1);
  return {
    level,
    current,
    next,
    into: xp - current,
    remaining: next - xp,
    progress: ((xp - current) / Math.max(1, next - current)) * 100,
  };
};

function BrandMark() {
  return (
    <span className="sq-brand-mark" aria-hidden="true">
      <Sparkles size={13} strokeWidth={2.4} />
    </span>
  );
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? { opacity: 0.01 } : { opacity: 0.01, y: 12 }}
      whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -56px" }}
      transition={{ duration: reduceMotion ? 0.12 : 0.36, delay, ease: [0.22, 0.78, 0.22, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({ index, title, summary, inverse = false }: { index: string; title: string; summary: string; inverse?: boolean }) {
  return (
    <div className={`sq-section-heading${inverse ? " is-inverse" : ""}`}>
      <div className="sq-section-kicker"><span>{index}</span><i /></div>
      <h2>{title}</h2>
      <p>{summary}</p>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return window.sessionStorage.getItem("sidequests-readiness-theme") === "dark" ? "dark" : "light";
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMotion, setMenuMotion] = useState(true);
  const [menuOpenedByKeyboard, setMenuOpenedByKeyboard] = useState(false);
  const [architectureView, setArchitectureView] = useState<ArchitectureView>("system");
  const [costMode, setCostMode] = useState<CostMode>("pilot");
  const [xp, setXp] = useState(420);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 150, damping: 28, mass: 0.25 });
  const level = useMemo(() => levelForXp(xp), [xp]);
  const selectedCost = costs[costMode];

  useEffect(() => {
    document.title = "Sidequests — Development & launch readiness";
    document.documentElement.style.colorScheme = theme;
    document.documentElement.dataset.sqTheme = theme;
    window.sessionStorage.setItem("sidequests-readiness-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!menuOpen) return;
    if (menuOpenedByKeyboard) {
      requestAnimationFrame(() => menuPanelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus());
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    };
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuPanelRef.current?.contains(target) && !menuButtonRef.current?.contains(target)) setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOnOutside);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOnOutside);
    };
  }, [menuOpen, menuOpenedByKeyboard]);

  const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    const keyboard = event.detail === 0;
    setMenuOpenedByKeyboard(keyboard);
    setMenuMotion(!keyboard && !reduceMotion);
    setMenuOpen((open) => !open);
  };

  const jumpTo = () => setMenuOpen(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className="readiness-page" data-theme={theme}>
        <a className="sq-skip-link" href="#main">Skip to the brief</a>
        <motion.div className="sq-scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />

        <header className="sq-topbar" aria-label="Report navigation">
          <a className="sq-brand" href="#top" aria-label="Sidequests readiness brief home">
            <BrandMark /><span>sidequests</span>
          </a>
          <div className="sq-topbar-actions">
            <a className="sq-report-download" href="./readiness/sidequests-readiness-brief.pdf" download>
              <Download size={16} aria-hidden="true" /><span>PDF brief</span>
            </a>
            <button
              className="sq-icon-button"
              type="button"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              aria-pressed={theme === "dark"}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              ref={menuButtonRef}
              className="sq-menu-button"
              type="button"
              aria-label={menuOpen ? "Close section menu" : "Open section menu"}
              aria-expanded={menuOpen}
              aria-controls="readiness-menu"
              onClick={toggleMenu}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          <AnimatePresence initial={false}>
            {menuOpen && (
              <motion.nav
                ref={menuPanelRef}
                id="readiness-menu"
                className="sq-menu-panel"
                aria-label="Brief sections"
                initial={menuMotion ? { opacity: 0, y: -6 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={menuMotion ? { opacity: 0, y: -4 } : { opacity: 0 }}
                transition={{ duration: menuMotion ? 0.18 : 0.001, ease: [0.22, 0.78, 0.22, 1] }}
              >
                <p>Jump to</p>
                {navigation.map(([label, id], index) => (
                  <a key={id} href={`#${id}`} onClick={jumpTo}>
                    <span>{String(index + 1).padStart(2, "0")}</span>{label}<ChevronRight size={15} />
                  </a>
                ))}
              </motion.nav>
            )}
          </AnimatePresence>
        </header>

        <main id="main">
          <section className="sq-hero" id="top">
            <div className="sq-container sq-hero-layout">
              <div className="sq-hero-copy">
                <p className="sq-overline">Development & launch readiness · 12 Aug 2026</p>
                <h1><span>From working</span><span>alpha to a</span><span>credible pilot.</span></h1>
                <p className="sq-hero-lede">
                  Sidequests has a real product shape, a distinct identity and a practical city wedge. The next phase is stabilization: one player record, one observable quest loop and one dense field test.
                </p>
                <div className="sq-hero-actions">
                  <a className="sq-primary-link" href="#stage">Read the status <ArrowDown size={17} /></a>
                  <a className="sq-secondary-link" href="./readiness/sidequests-readiness-brief.pdf" download>Download presentation <Download size={16} /></a>
                </div>
              </div>
              <aside className="sq-stage-plate" aria-label="Current development stage">
                <div className="sq-stage-label"><span>Current stage</span><i>01</i></div>
                <strong>Integrated alpha</strong>
                <p>Pre-pilot. Core surfaces exist, but the live operating loop is not yet trustworthy enough for a public launch claim.</p>
                <div className="sq-stage-score">
                  <span>Analyst maturity</span><strong>46<small>/100</small></strong>
                </div>
                <div className="sq-stage-rule"><i style={{ width: "46%" }} /></div>
                <small>Score reflects mounted code, configuration and operational proof. It is not customer or revenue data.</small>
              </aside>
            </div>
            <div className="sq-hero-foot"><span>Architecture</span><span>Product economy</span><span>Go-to-market</span><span>Launch operations</span></div>
          </section>

          <section className="sq-section sq-section-light" id="stage">
            <div className="sq-container">
              <Reveal><SectionHeading index="01" title="Stabilization is the next development phase." summary="Three issues currently limit the confidence of every launch, growth and partnership claim." /></Reveal>
              <div className="sq-priority-layout">
                <Reveal className="sq-priority-main">
                  <span className="sq-priority-number">01</span>
                  <div><p className="sq-status-label is-blocker">Blocker</p><h3>Restore and verify live Supabase.</h3><p>The application has production adapters, migrations, RPCs and RLS policies. The last live verification found the project inactive, so database state and deployment claims remain provisional.</p><strong>Exit evidence: production sign-up, scan, completion and redemption all pass.</strong></div>
                </Reveal>
                <div className="sq-priority-stack">
                  <Reveal delay={0.04} className="sq-priority-row">
                    <span>02</span><div><p className="sq-status-label is-blocker">Blocker</p><h3>Choose one player record.</h3><p>Progression RPCs update <code>user_profiles</code>; important profile and wallet surfaces read <code>profiles</code>.</p></div>
                  </Reveal>
                  <Reveal delay={0.08} className="sq-priority-row">
                    <span>03</span><div><p className="sq-status-label is-gap">Gap</p><h3>Make the growth loop observable.</h3><p>Analytics are local and contact success is simulated. Acquisition, activation, repeat and partner value need a production sink.</p></div>
                  </Reveal>
                </div>
              </div>
              <Reveal className="sq-recommendation-line">
                <Target size={20} /><p><strong>Recommendation:</strong> freeze feature expansion for a short stabilization sprint, then run one measured neighborhood pilot.</p>
              </Reveal>
            </div>
          </section>

          <section className="sq-section sq-section-ink" id="architecture">
            <div className="sq-container">
              <Reveal><SectionHeading inverse index="02" title="A clear MVP stack with a split player record." summary="The repository boundary is a strong choice. The main architectural risk sits where identity, XP and balances cross that boundary." /></Reveal>
              <div className="sq-control-row" role="group" aria-label="Architecture view">
                <button className={architectureView === "system" ? "is-active" : ""} onClick={() => setArchitectureView("system")} type="button">System map</button>
                <button className={architectureView === "risk" ? "is-active" : ""} onClick={() => setArchitectureView("risk")} type="button">Risk seam</button>
              </div>
              {architectureView === "system" ? (
                <Reveal className="sq-architecture-map">
                  <div className="sq-architecture-node"><Code2 /><span>Experience</span><strong>Vite + React SPA</strong><p>Marketing, onboarding, map and player routes</p></div>
                  <ArrowRight className="sq-arch-arrow" />
                  <div className="sq-architecture-node is-accent"><Layers3 /><span>Domain boundary</span><strong>Repository interface</strong><p>Supabase, local and mock adapters</p></div>
                  <ArrowRight className="sq-arch-arrow" />
                  <div className="sq-architecture-node"><Database /><span>Data + operations</span><strong>Supabase</strong><p>Postgres, Auth, Storage, RPCs and RLS</p></div>
                </Reveal>
              ) : (
                <Reveal className="sq-risk-seam">
                  <div><Database /><span>Progression writes</span><strong>user_profiles</strong><p>Quest completion adds XP, level and points.</p></div>
                  <AlertTriangle size={38} />
                  <div><Eye /><span>Key UI reads</span><strong>profiles</strong><p>Wallet, onboarding and public identity use a different record.</p></div>
                  <p className="sq-risk-verdict"><strong>Consequence:</strong> a successful quest can be true in the database and still appear wrong to the player.</p>
                </Reveal>
              )}
              <Reveal className="sq-architecture-footer">
                <span>Present</span><p>Deep links · scans · completion · proof capture · rewards · notes · admin and partner code</p>
                <span>Not yet operational</span><p>Payments · production CRM · production analytics · mounted partner/admin workflow · verified incident runbook</p>
              </Reveal>
            </div>
          </section>

          <section className="sq-section sq-section-light" id="economy">
            <div className="sq-container">
              <Reveal><SectionHeading index="03" title="XP tracks mastery; points fund rewards." summary="The two-currency concept is easy to explain. Consistent values, ownership and feedback are the remaining product work." /></Reveal>
              <div className="sq-economy-layout">
                <Reveal className="sq-economy-primary">
                  <p className="sq-overline">Permanent progression</p><h3>Experience points</h3>
                  <p>XP never spends down. It records long-term exploration and determines level.</p>
                  <dl><div><dt>Easy</dt><dd>50 XP</dd></div><div><dt>Medium</dt><dd>150 XP</dd></div><div><dt>Hard target</dt><dd>400 XP</dd></div></dl>
                  <small>Product targets. Seed content currently varies and needs normalization.</small>
                </Reveal>
                <Reveal className="sq-economy-secondary" delay={0.06}>
                  <WalletCards /><p className="sq-overline">Spendable utility</p><h3>Points</h3>
                  <p>Points buy real rewards. The ledger should be the audit trail; the displayed balance is a cache.</p>
                  <ul><li><Check />Awarded atomically at completion</li><li><Check />Spent atomically at redemption</li><li><AlertTriangle />UI ownership needs consolidation</li></ul>
                </Reveal>
              </div>

              <Reveal className="sq-xp-lab">
                <div className="sq-xp-copy">
                  <p className="sq-overline">Interactive progression model</p><h3>Triangular level curve</h3>
                  <p><code>XP(level) = 100 × level × (level − 1) ÷ 2</code></p>
                  <label htmlFor="xp-range"><span>Test an XP total</span><strong>{xp.toLocaleString()} XP</strong></label>
                  <input id="xp-range" type="range" min="0" max="5000" step="25" value={xp} onChange={(event) => setXp(Number(event.target.value))} />
                  <small>Level 1 starts at 0; Level 2 at 100; Level 3 at 300; Level 4 at 600.</small>
                </div>
                <div className="sq-level-output" aria-live="polite">
                  <div className="sq-level-emblem"><span>Level</span><strong>{level.level}</strong></div>
                  <div className="sq-level-facts"><div><span>Current threshold</span><strong>{level.current.toLocaleString()} XP</strong></div><div><span>Next level</span><strong>{level.next.toLocaleString()} XP</strong></div><div><span>Still needed</span><strong>{level.remaining.toLocaleString()} XP</strong></div></div>
                  <div className="sq-level-track"><i style={{ transform: `scaleX(${level.progress / 100})` }} /></div>
                  <p>{Math.round(level.progress)}% through Level {level.level}</p>
                </div>
              </Reveal>
            </div>
          </section>

          <section className="sq-section sq-section-sand" id="experience">
            <div className="sq-container">
              <Reveal><SectionHeading index="04" title="The onboarding promise is stronger than its handoff." summary="Six steps create a distinctive explorer identity. The first live quest, earned value and return behavior still need an honest connection." /></Reveal>
              <Reveal className="sq-onboarding-line">
                {["Welcome", "Vibes", "Archetype", "Neighborhood", "First quest", "Starter profile"].map((label, index) => (
                  <div key={label}><span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong>{index < 5 && <ChevronRight aria-hidden="true" />}</div>
                ))}
              </Reveal>
              <div className="sq-experience-notes">
                <Reveal className="sq-note-column">
                  <p className="sq-overline">Already convincing</p>
                  <ul><li>Guest choices persist locally.</li><li>Account creation preserves destination.</li><li>Terms, privacy and marketing consent are separate.</li><li>Missing profiles have a repair path.</li></ul>
                </Reveal>
                <Reveal className="sq-note-column is-warning" delay={0.06}>
                  <p className="sq-overline">Trust gaps</p>
                  <ul><li>The first quest preview is generated from static mock data.</li><li>The starter profile writes 100 XP at Level 1, while the curve defines that as Level 2.</li><li>Earned value can land outside the record read by key UI.</li></ul>
                </Reveal>
              </div>
              <Reveal className="sq-product-loop">
                <div className="sq-loop-title"><Route /><div><span>Core product loop</span><strong>Discovery is mounted. Return behavior is not yet proven.</strong></div></div>
                {["Discover", "Choose", "Arrive", "Complete", "Progress", "Redeem", "Return"].map((label, index) => (
                  <div className={`sq-loop-step ${index < 2 ? "is-built" : index < 6 ? "is-partial" : "is-planned"}`} key={label}><span>{index + 1}</span><strong>{label}</strong></div>
                ))}
              </Reveal>
            </div>
          </section>

          <section className="sq-section sq-section-light" id="readiness">
            <div className="sq-container">
              <Reveal><SectionHeading index="05" title="Product surface area is ahead of operating maturity." summary="These scores are an audit rubric, not a vanity score. The lowest bars determine what should happen next." /></Reveal>
              <Reveal className="sq-maturity-table">
                {maturity.map((item) => (
                  <div className="sq-maturity-row" key={item.name}>
                    <strong>{item.name}</strong><div className="sq-maturity-meter" aria-hidden="true"><i style={{ transform: `scaleX(${item.score / 100})` }} /></div><b>{item.score}</b><p>{item.note}</p>
                  </div>
                ))}
              </Reveal>
              <Reveal className="sq-overlooked">
                <p className="sq-overline">Often overlooked before a pilot</p>
                <div><span><ShieldCheck />Threat model + access review</span><span><FileCheck2 />Content rights + release records</span><span><Users />Support and moderation ownership</span><span><BarChart3 />Metric definitions + data retention</span><span><Cloud />Backup, restore + incident rehearsal</span><span><Eye />Accessibility testing with real tasks</span></div>
              </Reveal>
            </div>
          </section>

          <section className="sq-section sq-section-ink" id="gtm">
            <div className="sq-container">
              <Reveal><SectionHeading inverse index="06" title="Win one walkable neighborhood first." summary="Density makes Sidequests legible. A small cohort should be able to encounter several worthwhile quests in one afternoon." /></Reveal>
              <div className="sq-gtm-layout">
                <Reveal className="sq-wedge">
                  <div className="sq-wedge-art" aria-hidden="true"><MapPinned /><i className="one" /><i className="two" /><i className="three" /></div>
                  <p className="sq-overline">Recommended wedge</p><h3>Wynwood + one adjacent cluster</h3>
                  <p>Concentrate the product, partner training, creator stories and field QA before spreading across Miami.</p>
                  <div className="sq-wedge-targets"><div><strong>8–12</strong><span>contracted venues</span></div><div><strong>3</strong><span>creator / community guides</span></div><div><strong>25–50</strong><span>founding explorers</span></div></div>
                </Reveal>
                <Reveal className="sq-acquisition" delay={0.06}>
                  <p className="sq-overline">Measurable acquisition loop</p>
                  {["Partner staff script + storefront QR", "Creator-led questline drop", "Explorer completes, shares and returns", "Evidence supports renewal or paid conversion"].map((text, index) => <div key={text}><span>{String(index + 1).padStart(2, "0")}</span><p>{text}</p></div>)}
                </Reveal>
              </div>
              <Reveal className="sq-gtm-metrics">
                <div><span>Activation</span><strong>First completion ≤ 7 days</strong></div><div><span>Retention</span><strong>Second quest ≤ 14 days</strong></div><div><span>Value</span><strong>Redemption + partner-reported traffic</strong></div><div><span>Revenue proof</span><strong>Willingness to renew or pay</strong></div>
              </Reveal>
            </div>
          </section>

          <section className="sq-section sq-section-light" id="costs">
            <div className="sq-container">
              <Reveal><SectionHeading index="07" title="Budget for credibility and field operations." summary="Software can stay lean. Legal setup, rights, partner enablement, QA and local activation carry the real cost to market." /></Reveal>
              <div className="sq-cost-tabs" role="group" aria-label="Cost scenario">
                {(Object.keys(costs) as CostMode[]).map((key) => <button type="button" key={key} className={costMode === key ? "is-active" : ""} aria-pressed={costMode === key} onClick={() => setCostMode(key)}>{costs[key].label}</button>)}
              </div>
              <Reveal className="sq-cost-frame">
                <div className="sq-cost-summary"><p className="sq-overline">{selectedCost.label}</p><h3>{selectedCost.oneTime}</h3><span>estimated one-time</span><strong>{selectedCost.monthly}</strong><span>estimated recurring run rate</span><p>{selectedCost.summary}</p></div>
                <div className="sq-cost-bars">
                  {selectedCost.bars.map(([label, width, amount]) => <div key={label}><div><span>{label}</span><strong>{amount}</strong></div><i><b style={{ transform: `scaleX(${width / 100})` }} /></i></div>)}
                </div>
              </Reveal>
              <Reveal className="sq-cost-baselines">
                <div><Cloud /><span>Supabase Pro</span><strong>$25 / mo baseline</strong></div><div><Zap /><span>Vercel Pro</span><strong>$20 / user / mo baseline</strong></div><div><MapPinned /><span>Mapbox</span><strong>usage based after free tier</strong></div><div><Building2 /><span>Florida LLC</span><strong>$125 state filing fees</strong></div><div><FileCheck2 /><span>EIN</span><strong>$0 direct from IRS</strong></div>
              </Reveal>
              <p className="sq-fine-print">Planning ranges are not quotes. Engineering labor, taxes and founder opportunity cost are excluded. Recheck vendor and filing prices at purchase time.</p>
            </div>
          </section>

          <section className="sq-section sq-section-sand" id="legal">
            <div className="sq-container">
              <Reveal><SectionHeading index="08" title="Turn policy drafts into operating practice." summary="The recommended structure depends on near-term financing. In both cases, the company must own the product, contracts and launch processes." /></Reveal>
              <div className="sq-entity-layout">
                <Reveal className="sq-entity-primary">
                  <span className="sq-choice-label">Default for a founder-funded Miami pilot</span><Building2 /><h3>Florida LLC</h3><p>Lower administrative complexity while ownership is simple and institutional financing is not imminent.</p>
                  <ul><li>Articles, registered agent and EIN</li><li>Operating agreement, bank and accounting</li><li>IP assignment and partner agreements in the entity name</li><li>Insurance and applicable county / city tax receipts</li></ul>
                </Reveal>
                <Reveal className="sq-entity-secondary" delay={0.06}>
                  <span className="sq-choice-label">Evaluate before launch if fundraising is near</span><Network /><h3>Delaware C-corp</h3><p>Better aligned with institutional capital, option grants and complex ownership, with higher legal and recurring administration.</p>
                  <ul><li>Counsel-led formation and stock issuance</li><li>Founder vesting, IP assignment and cap table</li><li>Option plan when hiring requires it</li><li>Florida foreign qualification if operating locally</li></ul>
                </Reveal>
              </div>
              <Reveal className="sq-compliance-list">
                <div><span>01</span><ShieldCheck /><p><strong>Policy accuracy</strong> Location, analytics, retention and deletion behavior must match the product.</p></div>
                <div><span>02</span><Users /><p><strong>Age boundary</strong> Enforce the stated 13+ posture and have counsel assess COPPA exposure.</p></div>
                <div><span>03</span><FileCheck2 /><p><strong>Content rights</strong> Record permission for partner logos, photos, offers and QR placement.</p></div>
                <div><span>04</span><Flag /><p><strong>UGC operations</strong> Name moderation, takedown, appeals and DMCA owners before inviting scale.</p></div>
                <div><span>05</span><Eye /><p><strong>Accessibility</strong> Test keyboard, screen reader, contrast, zoom and reduced motion on real flows.</p></div>
                <div><span>06</span><Cloud /><p><strong>Incident readiness</strong> Keep processor inventory, access review, backup and breach ownership current.</p></div>
              </Reveal>
              <p className="sq-legal-note">Operating recommendation only, not legal or tax advice. Confirm entity choice, consumer terms, privacy posture and local licensing with Florida startup counsel and a CPA.</p>
            </div>
          </section>

          <section className="sq-section sq-section-ink" id="plan">
            <div className="sq-container">
              <Reveal><SectionHeading inverse index="09" title="Ninety days to credible evidence." summary="Each phase ends with a gate that can be observed. Calendar dates should move if the gate does not pass." /></Reveal>
              <div className="sq-roadmap-list">
                <Reveal className="sq-roadmap-row"><div className="sq-roadmap-time"><span>Days</span><strong>0–14</strong></div><div><p className="sq-overline">Make it trustworthy</p><h3>Restore the system of record.</h3><ul><li>Restore Supabase and verify migrations + RLS</li><li>Unify profile, XP, level and point ownership</li><li>Fix onboarding progression consistency</li><li>Run full completion and redemption smoke tests</li></ul></div><aside><Check /><strong>Gate</strong><p>Complete, redeem and see the correct balance everywhere.</p></aside></Reveal>
                <Reveal className="sq-roadmap-row" delay={0.04}><div className="sq-roadmap-time"><span>Days</span><strong>15–45</strong></div><div><p className="sq-overline">Operationalize</p><h3>Prepare one neighborhood.</h3><ul><li>Mount the progress and reward surfaces</li><li>Connect CRM and production analytics</li><li>Contract and train 8–12 venues</li><li>Complete entity, insurance and counsel review</li></ul></div><aside><Check /><strong>Gate</strong><p>Every partner, quest and QR passes a shared field checklist.</p></aside></Reveal>
                <Reveal className="sq-roadmap-row" delay={0.08}><div className="sq-roadmap-time"><span>Days</span><strong>46–90</strong></div><div><p className="sq-overline">Run and learn</p><h3>Produce evidence, not reach.</h3><ul><li>Recruit 25–50 founding explorers</li><li>Run weekly field QA and support review</li><li>Measure activation, repeat and redemption</li><li>Ask partners to renew or pay</li></ul></div><aside><Check /><strong>Gate</strong><p>Repeat behavior and partner-reported value are both visible.</p></aside></Reveal>
              </div>
              <Reveal className="sq-final-gate">
                <BrandMark /><div><p className="sq-overline">Pilot-ready definition</p><h3>A real explorer discovers, scans, completes, progresses, redeems and returns. Every step is observable.</h3></div><a href="#top">Back to top <ArrowDown className="sq-back-arrow" /></a>
              </Reveal>
            </div>
          </section>

          <section className="sq-section sq-section-light sq-sources" id="sources">
            <div className="sq-container">
              <Reveal><SectionHeading index="10" title="Evidence and assumptions." summary="Product findings come from the repository. Business and compliance sections distinguish operating recommendations from professional advice." /></Reveal>
              <div className="sq-source-layout">
                <Reveal className="sq-source-primary">
                  <h3>Repository evidence</h3>
                  {["docs/audits/2026-07-06-codex-production-audit.md", "docs/audits/2026-07-06-mcp-production-verification.md", "docs/architecture/TECHNICAL_ARCHITECTURE.md", "docs/product/PRODUCT_SPEC.md", "docs/business/BUSINESS_MODEL.md", "src/lib/app/leveling.ts"].map((source) => <p key={source}><Code2 /><code>{source}</code></p>)}
                </Reveal>
                <Reveal className="sq-source-links" delay={0.06}>
                  <h3>Official baselines</h3>
                  <a href="https://supabase.com/pricing" target="_blank" rel="noreferrer">Supabase pricing <ExternalLink /></a>
                  <a href="https://vercel.com/pricing" target="_blank" rel="noreferrer">Vercel pricing <ExternalLink /></a>
                  <a href="https://www.mapbox.com/pricing" target="_blank" rel="noreferrer">Mapbox pricing <ExternalLink /></a>
                  <a href="https://dos.fl.gov/sunbiz/forms/fees/llc-fees/" target="_blank" rel="noreferrer">Florida LLC fees <ExternalLink /></a>
                  <a href="https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number" target="_blank" rel="noreferrer">IRS EIN guidance <ExternalLink /></a>
                  <a href="https://www.uspto.gov/trademarks/fees-payment-information/overview-trademark-fees" target="_blank" rel="noreferrer">USPTO trademark fees <ExternalLink /></a>
                </Reveal>
              </div>
              <Reveal className="sq-method-note"><Compass /><p><strong>Method:</strong> static code and document review, prior production audit evidence and planning assumptions. No usage analytics, signed partner agreements, bank records or current counsel opinion were available to this brief.</p></Reveal>
            </div>
          </section>
        </main>

        <footer className="sq-footer">
          <div className="sq-container"><a className="sq-brand" href="#top"><BrandMark /><span>sidequests</span></a><p>Development & launch readiness · 12 Aug 2026</p><a href="./readiness/sidequests-readiness-brief.pdf" download>PDF presentation <Download /></a></div>
        </footer>
      </div>
    </MotionConfig>
  );
}

export default App;
