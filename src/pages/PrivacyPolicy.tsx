import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Back link */}
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SideQuests
        </Link>

        {/* Header */}
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">
            SideQuests
          </p>
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: January 15, 2025</p>
        </header>

        {/* Intro */}
        <p className="mb-8 text-muted-foreground leading-relaxed">
          SideQuests ("we", "our", or "us") is committed to protecting your privacy. This Privacy
          Policy explains how we collect, use, and safeguard information when you use our
          location-based quest app at sidequests.io. Please read it carefully.
        </p>

        {/* Section 1 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Account information:</strong> When you create an
              account, we collect your email address and optional display name. We do not require
              your real name to use SideQuests.
            </p>
            <p>
              <strong className="text-foreground">QR scan analytics:</strong> When you scan a QR
              code, we record a scan event that includes a coarse location string (e.g., "Miami,
              FL"), device type, and anonymous session ID. We do not store precise GPS coordinates.
            </p>
            <p>
              <strong className="text-foreground">Location permissions:</strong> Some quests use GPS
              to verify you're at a venue. When you grant location permission, we use the coordinates
              only for that single verification check and discard them immediately — we never store
              your precise location.
            </p>
            <p>
              <strong className="text-foreground">Community Notes:</strong> If you post a Community
              Note, we store the text content you submit, your user ID, and the quest it's associated
              with. Notes are moderated before appearing publicly.
            </p>
            <p>
              <strong className="text-foreground">Cookies and local storage:</strong> We use browser
              local storage to preserve anonymous session state and your quest preferences. We use
              essential cookies for authentication sessions only.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Operate the SideQuests platform and deliver quest experiences</li>
              <li>Verify quest completions and award XP and points</li>
              <li>Display aggregate, privacy-safe analytics to our venue partners</li>
              <li>Moderate Community Notes and prevent abuse</li>
              <li>Send account-related emails (e.g., password reset) and, with your consent, marketing updates about new quests</li>
              <li>Improve the app through aggregate usage analysis</li>
            </ul>
          </div>
        </section>

        {/* Section 3 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. Third-Party Services</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Supabase:</strong> Our backend database and
              authentication provider. Your data is stored in Supabase's managed PostgreSQL
              infrastructure. See{" "}
              <a href="https://supabase.com/privacy" className="underline underline-offset-2">
                Supabase's Privacy Policy
              </a>.
            </p>
            <p>
              <strong className="text-foreground">Mapbox:</strong> We use Mapbox to render
              interactive maps. Your device's viewport data may be shared with Mapbox to load map
              tiles. See{" "}
              <a href="https://www.mapbox.com/legal/privacy" className="underline underline-offset-2">
                Mapbox's Privacy Policy
              </a>.
            </p>
            <p>
              <strong className="text-foreground">Vercel:</strong> Our hosting provider. Server
              access logs may capture your IP address in accordance with Vercel's standard
              infrastructure practices.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. Data Sharing</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">We do not sell your personal data</strong>, and
              we will never sell or share your location data with third parties for advertising
              purposes.
            </p>
            <p>
              We share aggregated, anonymized analytics with our venue partners — for example,
              "this venue had 120 scans last week." This data cannot be linked back to any
              individual user.
            </p>
            <p>
              We may disclose information if required by law, court order, or to protect the
              safety of our users and the integrity of the platform.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground">Access</strong> the personal data we hold about
                you by contacting us at{" "}
                <a href="mailto:privacy@sidequests.io" className="underline underline-offset-2">
                  privacy@sidequests.io
                </a>
              </li>
              <li>
                <strong className="text-foreground">Correct</strong> inaccurate data via your
                account settings
              </li>
              <li>
                <strong className="text-foreground">Delete</strong> your account and associated data
                — see Section 8
              </li>
              <li>
                <strong className="text-foreground">Opt out</strong> of analytics, marketing emails,
                and location consent at any time via your privacy settings
              </li>
            </ul>
          </div>
        </section>

        {/* Section 6 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            We retain your account data for as long as your account is active. Scan events and
            analytics are retained for up to 24 months for aggregate reporting. Community Notes are
            retained until you delete your account or request content removal. Upon account
            deletion, we remove your personal data within 30 days.
          </p>
        </section>

        {/* Section 7 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. Location Data</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              Location data is treated with special care at SideQuests.{" "}
              <strong className="text-foreground">
                We do not sell location data under any circumstances.
              </strong>
            </p>
            <p>
              When you enable GPS verification for a quest, your device sends a precise coordinate
              to our server for the single purpose of confirming you're at the venue. This coordinate
              is used for verification only and is never written to our database. Only the boolean
              result ("verified" or "not verified") is stored.
            </p>
            <p>
              QR scan events record only a coarse location string (city-level) derived from your
              IP address. You can disable this by revoking location consent in your settings.
            </p>
          </div>
        </section>

        {/* Section 8 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">8. Account Deletion</h2>
          <p className="text-muted-foreground leading-relaxed">
            You may request the deletion of your account and all associated personal data at any
            time by emailing{" "}
            <a href="mailto:privacy@sidequests.io" className="underline underline-offset-2">
              privacy@sidequests.io
            </a>{" "}
            with the subject line "Account Deletion Request." We will process your request within
            30 days. Note that anonymized analytics data derived from your usage may be retained
            in aggregate form after deletion.
          </p>
        </section>

        {/* Section 9 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">9. Children's Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            SideQuests is not directed at children under the age of 13. We do not knowingly
            collect personal information from children under 13. If you believe a child has
            provided us with personal information, please contact us and we will promptly delete it.
          </p>
        </section>

        {/* Section 10 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For privacy-related questions, requests, or concerns, please contact us at{" "}
            <a href="mailto:privacy@sidequests.io" className="underline underline-offset-2">
              privacy@sidequests.io
            </a>
            . We aim to respond within 5 business days.
          </p>
        </section>

        <hr className="border-border my-8" />
        <p className="text-xs text-muted-foreground text-center">
          &copy; {new Date().getFullYear()} SideQuests.io · All rights reserved
        </p>
      </div>
    </div>
  );
}
