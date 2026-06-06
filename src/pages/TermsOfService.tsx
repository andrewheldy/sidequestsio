import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
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
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: January 15, 2025</p>
        </header>

        {/* Intro */}
        <p className="mb-8 text-muted-foreground leading-relaxed">
          These Terms of Service ("Terms") govern your access to and use of the SideQuests platform
          ("Service"), operated by SideQuests.io. By using the Service, you agree to be bound by
          these Terms. If you do not agree, please do not use the Service.
        </p>

        {/* Section 1 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using SideQuests — whether by creating an account, scanning a QR code,
            or browsing the app — you confirm that you are at least 13 years of age, that you have
            read and understood these Terms, and that you agree to be bound by them. If you are
            using the Service on behalf of an organization, you represent that you have authority to
            bind that organization to these Terms.
          </p>
        </section>

        {/* Section 2 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. Use of the Service</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>You agree to use SideQuests only for lawful purposes. You must not:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Use the Service to harass, threaten, or harm other users</li>
              <li>Attempt to circumvent quest verification systems or earn rewards fraudulently</li>
              <li>Scrape, reverse-engineer, or copy our platform, data, or content</li>
              <li>Upload or transmit malicious code, spam, or unauthorized advertising</li>
              <li>Impersonate another person or create fake accounts</li>
              <li>
                Use the Service in any way that could damage, overburden, or impair our
                infrastructure
              </li>
            </ul>
            <p>
              We reserve the right to terminate or suspend access for any user who violates these
              responsibilities.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. Quest Participation Disclaimer</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              Quests listed on SideQuests are curated experiences at real Miami venues and locations.
              Participation is entirely voluntary and at your own risk.
            </p>
            <p>
              <strong className="text-foreground">
                SideQuests is not liable for any injury, loss, or damage
              </strong>{" "}
              that occurs while you are participating in or traveling to a quest location. We do not
              control the physical environment of any venue and make no representations about the
              safety conditions at any listed location.
            </p>
            <p>
              Quest descriptions are informational only. Venue hours, availability, and conditions
              may change without notice. Always exercise common sense and personal judgment when
              participating in any quest activity.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. Community Notes Moderation Policy</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              Community Notes are user-generated tips posted by questers who have completed a quest.
              By posting a Community Note, you grant SideQuests a non-exclusive, royalty-free license
              to display that content within the platform.
            </p>
            <p>
              All notes are subject to moderation. We reserve the right to remove, edit, or reject
              any Community Note that we determine, in our sole discretion, to be:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Offensive, hateful, or discriminatory</li>
              <li>Spam or promotional content not related to the quest</li>
              <li>False or misleading information that could harm other users</li>
              <li>Personal attacks on venue staff or other users</li>
              <li>Content that violates any applicable law</li>
            </ul>
            <p>
              Users who repeatedly post policy-violating notes may have their ability to post
              Community Notes suspended.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              SideQuests and all platform content — including quest designs, the scoring system, app
              interface, branding, and copy — are owned by SideQuests.io and protected by applicable
              intellectual property laws. You may not copy, reproduce, or distribute our platform
              content without express written permission.
            </p>
            <p>
              Content you create — such as Community Notes text — remains yours. By posting it, you
              grant us a license to display it within the Service as described above.
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. Account Suspension Rights</h2>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to suspend or terminate your account at any time, with or without
            notice, if we believe you have violated these Terms or engaged in conduct harmful to
            other users, our partner venues, or the integrity of the platform. Upon termination,
            your access to the Service and any accumulated points or rewards will be forfeited.
            Points and XP hold no monetary value and are not transferable.
          </p>
        </section>

        {/* Section 7 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            To the maximum extent permitted by applicable law, SideQuests.io and its affiliates,
            directors, employees, and partners shall not be liable for any indirect, incidental,
            special, consequential, or punitive damages — including loss of profits, data, or
            goodwill — arising out of or in connection with your use of the Service, even if we
            have been advised of the possibility of such damages. Our total liability to you for
            any claim arising from or related to the Service shall not exceed fifty US dollars
            ($50).
          </p>
        </section>

        {/* Section 8 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">8. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Service is provided "as is" and "as available" without warranties of any kind,
            either express or implied, including but not limited to warranties of merchantability,
            fitness for a particular purpose, and non-infringement. We do not warrant that the
            Service will be uninterrupted, error-free, or free of viruses or other harmful
            components. Your use of the Service is at your sole risk.
          </p>
        </section>

        {/* Section 9 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">9. Changes to Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update these Terms from time to time. When we do, we'll update the "Last
            updated" date at the top of this page and, for material changes, notify you via email
            or an in-app banner. Your continued use of the Service after the changes take effect
            constitutes acceptance of the revised Terms.
          </p>
        </section>

        {/* Section 10 */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For legal inquiries, questions about these Terms, or to report a violation, please
            contact us at{" "}
            <a href="mailto:legal@sidequests.io" className="underline underline-offset-2">
              legal@sidequests.io
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
