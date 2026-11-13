/**
 * Technology attribution, the "how it's powered" overview, and the footer.
 *
 * The analytics preview is sample data, labelled as such. Real partner numbers
 * live in Partner Insights (/partner), which needs a partner account.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BarChart3, Gift, Layers, MailCheck, MapPinned, Palette, Store } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Logo } from '@/components/brand/Logo';
import { useCampaign } from './CampaignState';
import { Reveal } from './shared';

const CAPABILITIES = [
  { icon: Palette, title: 'Custom-branded campaigns', detail: 'This page is one configuration file: name, theme, artwork, missions and disclosures.' },
  { icon: MapPinned, title: 'Location-based missions', detail: 'Server-verified GPS check-ins and QR scans at the places a brand chooses.' },
  { icon: Store, title: 'Multi-venue participation', detail: 'Partners and venues each get their own quests, codes and reporting.' },
  { icon: BarChart3, title: 'Engagement analytics', detail: 'Scans, starts, completions and repeat visits per quest and venue.' },
  { icon: MailCheck, title: 'Opt-in marketing', detail: 'Players choose analytics, marketing and location consent separately.' },
  { icon: Gift, title: 'Reward configuration', detail: 'XP and Points tiers per mission, with partner rewards redeemable in-app.' },
  { icon: Layers, title: 'Reusable infrastructure', detail: 'The same quest engine runs every activation. A new campaign is content, not a rebuild.' },
];

/** Illustrative funnel, relative to mission views. Not measured from any campaign. */
const SAMPLE_FUNNEL = [
  { label: 'Mission views', value: 100 },
  { label: 'Missions started', value: 46 },
  { label: 'Check-ins verified', value: 31 },
  { label: 'Missions completed', value: 27 },
];

export function PoweredBy() {
  const { log } = useCampaign();
  const [open, setOpen] = useState(false);

  return (
    <Reveal as="section" id="powered" className="vice-section vice-powered" labelledBy="powered-title">
      <p className="vice-kicker">Powered by</p>
      <h2 id="powered-title" className="vice-powered__title">
        <Logo tone="reverse" size="lg" />
      </h2>
      <p className="vice-powered__line">Real-world experiences. Built for any brand, venue, or event.</p>
      <div className="vice-powered__actions">
        <button
          type="button"
          className="vice-btn vice-btn--ghost"
          onClick={() => {
            setOpen(true);
            log('powered_open');
          }}
        >
          See how this experience is powered
        </button>
        <Link to="/partnerships" className="vice-btn vice-btn--primary" onClick={() => log('partner_link_click', 'partnerships')}>
          Partner with SideQuests
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="vice vice-sheet vice-sheet--wide">
          <div className="vice-sheet__body">
            <p className="vice-kicker">Under the hood</p>
            <DialogTitle className="vice-sheet__title">One quest engine, any campaign</DialogTitle>
            <DialogDescription className="vice-sheet__objective">
              VICE is a themed layer over the SideQuests platform. Missions, check-ins, XP and Points are the same
              systems live quests use across Miami.
            </DialogDescription>

            <ul className="vice-caps">
              {CAPABILITIES.map(({ icon: Icon, title, detail }) => (
                <li key={title}>
                  <Icon size={20} aria-hidden="true" />
                  <div>
                    <strong>{title}</strong>
                    <p>{detail}</p>
                  </div>
                </li>
              ))}
            </ul>

            <figure className="vice-sample">
              <figcaption>
                <strong>Partner analytics preview</strong>
                <span className="vice-pill vice-pill--concept">Sample data</span>
              </figcaption>
              <ul>
                {SAMPLE_FUNNEL.map((row) => (
                  <li key={row.label}>
                    <span>{row.label}</span>
                    <span className="vice-sample__track" aria-hidden="true">
                      <span style={{ width: `${row.value}%` }} />
                    </span>
                    <span>{row.value}%</span>
                  </li>
                ))}
              </ul>
              <p>
                Illustrative numbers showing the shape of a campaign funnel. They are not results from this or any
                campaign. Partners see their real figures in Partner Insights.
              </p>
            </figure>

            <Link to="/partnerships" className="vice-btn vice-btn--primary" onClick={() => log('partner_link_click', 'overview')}>
              Talk to SideQuests
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}

export function CampaignFooter() {
  const { campaign } = useCampaign();
  return (
    <footer className="vice-footer">
      <p className="vice-footer__disclosure">{campaign.disclosure}</p>
      <p>
        Missions, rewards and sample analytics on this page are concept content. Locations are public places; no venue,
        brand or sponsor has agreed to take part, and no prize is offered.
      </p>
      <nav aria-label="Legal">
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/cookie-preferences">Cookie preferences</Link>
        <Link to="/">sidequests home</Link>
      </nav>
    </footer>
  );
}
