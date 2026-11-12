# Privacy Policy

**Version:** 1.2.0
**Effective Date:** October 27, 2026
**Last Updated:** October 27, 2026

SideQuests ("SideQuests," "we," "our," or "us") operates a mobile-first platform that turns
real-world exploration into a game: you discover quests at partner venues, verify your visit,
complete a short objective, capture the moment, and earn XP and Points. This Privacy Policy
explains what information we collect when you use SideQuests, why we collect it, how it's used
and shared, and the choices you have. It applies to the SideQuests website and the SideQuests mobile
app (collectively, the "Service").

If you don't agree with this Policy, please don't use the Service. If you have questions, contact
us at [support@miamisidequests.io](mailto:support@miamisidequests.io).

## Table of Contents

- [1. Information We Collect](#1-information-we-collect)
- [2. How We Use Your Information](#2-how-we-use-your-information)
- [3. Cookies and Similar Technologies](#3-cookies-and-similar-technologies)
- [4. Analytics](#4-analytics)
- [5. Communications and Marketing](#5-communications-and-marketing)
- [6. Third-Party Providers](#6-third-party-providers)
- [7. How We Share Information](#7-how-we-share-information)
- [8. Data Storage and Retention](#8-data-storage-and-retention)
- [9. Security](#9-security)
- [10. International Users](#10-international-users)
- [11. Children's Privacy](#11-childrens-privacy)
- [12. Your Rights and Choices](#12-your-rights-and-choices)
- [13. Data Deletion](#13-data-deletion)
- [14. Changes to This Policy](#14-changes-to-this-policy)
- [15. Contact Us](#15-contact-us)

---

## 1. Information We Collect

We collect the following categories of information. We do not collect more than we need to run
the Service.

**Account information.** When you create an account, we collect your email address and password
(stored securely by our authentication provider, never in plain text). A display name and
username are optional and shown publicly only if you choose to make your profile public.

**Authentication data.** We use Supabase Auth to manage sign-in sessions. This includes session
tokens stored in your browser and standard authentication metadata (account creation date, last
sign-in time).

**Profile and progression data.** Your quest history, completions, XP, Points balance, level,
streaks, interests, and Adventure Log are stored so the app can show your progress and let you
pick up where you left off.

**Uploaded photos and videos.** When you complete a quest and use "Capture the Moment," any photo
or video you upload is stored in our media storage and associated with your account and the
relevant quest completion.

**Location information.** Location features are optional, and we never store your device's
coordinates. What each feature uses, what we keep, and how to turn it off are described in
[Location Data](#location-data) below.

**QR scan history.** When you scan a venue's QR code, we record a scan event (which quest, which
venue, and a timestamp) so we can verify quest attempts and give partner venues aggregate,
privacy-safe traffic analytics. Like a quest completion, a scan record shows that you were at that
venue at that time.

**Usage events (only if you opt in).** If you turn on Analytics in
[Cookie Preferences](/cookie-preferences), the website records what you do in it, such as quest
pages viewed and buttons tapped. See [Analytics](#4-analytics).

**Device and browser information.** Standard technical information sent by your browser or device
— browser type, operating system, device type (mobile/tablet/desktop), and screen size — is
collected to keep the app working correctly across devices.

**IP address.** Our hosting provider (Vercel) and backend provider (Supabase) log IP addresses as
part of normal infrastructure operation (e.g., abuse prevention, request routing). We do not use
IP addresses to build advertising profiles.

**Community Notes.** If you post a Community Note, we store the text you write, your user ID, and
the quest it's attached to.

**Communications.** If you contact us (e.g., support, partnership inquiries), we keep a record of
that correspondence so we can respond and follow up.

### Location Data

You can use SideQuests without sharing your device's location: browse quests by neighborhood or
on the map, and complete quests verified by QR code, venue code, or staff. We **never** sell
location information, share it for advertising, or keep a history of where you go. Some features
below exist only in the mobile app, and nearby alerts may not be enabled in every version of it.

| Feature | Where | When your location is used | What we keep |
|---|---|---|---|
| **Choose an area** | App | Never — you pick a neighborhood. | Your chosen area, on your device only. |
| **Show my location** on the map | Website | Only when you tap the location button. | Nothing. Your position stays in your browser to center the map and show distances. |
| **Explore near me** | App | While the app is open, after you allow location access. | Nothing. Your coordinates are sent with each search to sort quests by distance and are not written to our database. |
| **GPS check-in** | Website and app | Only when you tap to check in at a quest that uses GPS verification. | The result (inside, outside, or uncertain, with a reason such as "low accuracy"), which quest, and when — for 30 days. Never your coordinates or their accuracy. |
| **Nearby alerts** ("Adventure") | App | In the background, only after you turn it on, sign in, and allow "Always" location and notifications. | A record of each alert we approved: which quest, its venue area, when, and whether the alert was scheduled or opened — for 30 days. Never your coordinates or route. |

**How GPS check-in works.** When you tap to check in, your device takes one fresh location reading.
Our server compares it with the quest's location and immediately discards it, keeping only the
result. Only an "inside" result can complete a GPS quest; an uncertain result lets you retry or use
another verification method.

**How nearby alerts work.** When you turn on nearby alerts, your device sends its current location
once so we can choose up to 15 nearby quest areas (these are public venue locations); the
coordinates are used for that request and not saved. Your phone's operating system then watches for
you entering one of those areas — SideQuests does not receive your location continuously. When you
enter an area, the app asks our server whether an alert is allowed, so the alert record shows that
you were near that quest at that time. Alerts are limited: at most 2 a day (you can lower this to 1
or 0), at least 3 hours apart, never between 9 PM and 10 AM in your time zone, and not for the same
quest twice in a week. Alerts are created on your device; we don't use a push-notification service
for them.

**Proximity never counts as a visit.** Entering an area, receiving an alert, or opening one never
completes a quest, never earns XP or Points, and is never reported to partner venues as a visit.

**Stored on your device.** The mobile app keeps your location mode, chosen area, alert pause
setting, a random installation ID, the list of nearby quest areas, whether you are inside each, and
which quests recently triggered an alert. It does not store your coordinates. Signing out clears the
nearby-alert data; uninstalling the app removes all of it.

**Settings and consent records.** We store your nearby-alert preferences (daily limit, quiet hours,
time zone, pause) and each device's on/off and pause setting, so a pause on one device is honored
by our server. When you change a location or marketing choice in website Settings, or
turn on nearby alerts in the app, we record what you chose, when, and — for nearby alerts — which
version of the disclosure you saw.

## 2. How We Use Your Information

We use the information described above to:

- Create and maintain your account and authenticate you securely.
- Operate the core quest loop: discovery, QR/GPS verification, quest completion, XP and Points
  awards, and your Adventure Log.
- If you choose, sort quests by distance from you and send nearby alerts, as described in
  [Location Data](#location-data).
- Display Community Notes and moderate them for safety and quality.
- Generate aggregate, privacy-safe analytics for partner venues (e.g., "this venue had 120 scans
  last week") — never analytics tied to an identifiable individual outside SideQuests.
- Send account-related communications (e.g., password resets, security notices) and, only with
  your consent, marketing emails about new quests, rewards, launches, and events.
- Maintain the security and integrity of the Service, including detecting fraud, fake check-ins,
  and abuse.
- Improve the Service through aggregate usage analysis.

## 3. Cookies and Similar Technologies

We use browser local storage and essential cookies to keep you signed in and to remember your
cookie preferences. Analytics is optional and off unless you turn it on in our
[Cookie Preferences](/cookie-preferences) center (see [Analytics](#4-analytics)). The marketing
and additional-preferences categories are not used today. Full detail lives in our
[Cookie Policy](/cookies).

## 4. Analytics

**Off unless you opt in.** The website sends usage events only if you turn on **Analytics** in
[Cookie Preferences](/cookie-preferences) (or choose "Accept all" in the cookie banner). That
choice is stored in your browser, so it applies per browser and device, and turning it off stops
new events from being sent. It is the only analytics control; there is no separate account
setting. The mobile app does not send usage events.

**What an event contains.** The event type (for example, quest page viewed, website link tapped,
or quest completed), when it happened, the page path without any query string, your device type
(mobile, tablet, or desktop) and screen width, a random ID stored in your browser and a
per-visit session ID, and the quest, venue, partner, or button it relates to. For outbound links
we record only the destination's domain. Events never include your location, email address,
photos, or anything you type.

**Linked to your account when you're signed in.** If you're signed in, our server adds your user
ID to each event. If you aren't signed in, the event is tied only to the random browser ID.

**Where it goes and how it's used.** Events are stored in our own database, hosted by Supabase.
We do not use a third-party analytics or advertising service. We use events to improve the
Service and to produce aggregate quest reports for partner venues (for example, how many people
viewed a quest page or tapped through to the venue's website). Partners receive aggregate
figures, not events tied to you.

**On your device.** Whether or not you opt in, the website keeps a short list of recent events in
your browser's local storage. It is never sent to us, and clearing your browser data removes it.

**Retention.** Usage events are kept for up to 24 months, like scan events. If you delete your
account, events are unlinked from your user ID (see [Delete Account](/delete-account)).

If we introduce a third-party analytics provider in the future, it will only initialize for users
who have opted in, and this Policy will be updated to name the provider before it goes live.

## 5. Communications and Marketing

We'll send you account-related emails (password resets, security notices, and similar
transactional messages) regardless of marketing preferences, because they're necessary to operate
your account. We will only send marketing emails — updates about new quests, rewards, launches,
city updates, events, and promotions — if you opt in, either at signup or later in your account
settings. You can opt out of marketing emails at any time via the unsubscribe link in any
marketing email or your account settings.

## 6. Third-Party Providers

We rely on a small number of infrastructure providers to run SideQuests. We do not sell your data
to any of them, and we only share what's needed for them to provide their service to us.

| Provider | What it does | Their privacy policy |
|---|---|---|
| **Supabase** | Database, authentication, and file storage — effectively our entire backend. | [supabase.com/privacy](https://supabase.com/privacy) |
| **Mapbox** | Renders the interactive quest map on the website. Your map viewport is sent to Mapbox to load map tiles — including the area around you if you center the map on your location. | [mapbox.com/legal/privacy](https://www.mapbox.com/legal/privacy) |
| **Apple / Google** | Your phone's operating system provides location, geofencing, and notifications to the mobile app. The app's map uses Apple Maps on iOS and, where enabled, Google Maps on Android, which load map tiles for the area shown. | [apple.com/legal/privacy](https://www.apple.com/legal/privacy/) · [policies.google.com/privacy](https://policies.google.com/privacy) |
| **Vercel** | Hosts the SideQuests website and app. Standard infrastructure access logs (including IP address) are generated as part of serving requests. | [vercel.com/legal/privacy-policy](https://vercel.com/legal/privacy-policy) |

We do not currently use a dedicated marketing/CRM vendor, a payment processor, or a third-party
analytics provider (our own analytics are stored in Supabase; see [Analytics](#4-analytics)).
If that changes, this Policy will be updated to name the new provider before
it's integrated — we won't add data-sharing relationships silently.

## 7. How We Share Information

**We do not sell your personal data.** We will never sell or share your location information
with anyone for advertising purposes.

We share **aggregated, anonymized** analytics with partner venues — for example, total scans or
completions for their quest over a period. This data cannot reasonably be linked back to an
individual user. Partners never receive your location, GPS check-in results, or nearby-alert
records.

We may disclose information if required by law, subpoena, or court order, or where necessary to
protect the safety of our users, partners, or the integrity of the Service (for example,
investigating fraud or fake check-ins).

If SideQuests is ever involved in a merger, acquisition, or sale of assets, user information may
be transferred as part of that transaction, subject to this Policy or a policy offering
comparable protections.

## 8. Data Storage and Retention

Your account and profile data is retained for as long as your account is active. Scan events and
aggregate analytics derived from them are retained for up to 24 months to support partner
reporting; usage events (if you opted into analytics) are kept on the same basis. GPS check-in
results and nearby-alert records are deleted after 30 days. Your device's
coordinates are never stored. Location settings and consent records are kept while your account is
active. Community Notes are retained until you delete them or your account. When you delete
your account, we remove your personal data as described in our
[Delete Account policy](/delete-account), generally within 30 days.

## 9. Security

We use industry-standard safeguards to protect your information, including encrypted connections
(HTTPS), database-level access controls (Row Level Security), and scoped API permissions. No
system is perfectly secure, and we can't guarantee absolute security, but we work to protect your
data and will notify affected users as required by law in the event of a breach affecting
personal data.

## 10. International Users

SideQuests currently operates as a Miami-focused, U.S. product, and our infrastructure providers
process data in the United States (and other regions where they operate data centers). If you use
the Service from outside the United States, your information may be transferred to and processed
in the United States. By using the Service, you consent to this transfer.

## 11. Children's Privacy

SideQuests is not directed at children under 13, and you must be at least 13 years old to create
an account. We do not knowingly collect personal information from anyone under 13. If you believe
a child under 13 has provided us with personal information, contact us at
[support@miamisidequests.io](mailto:support@miamisidequests.io) and we'll promptly delete it.

## 12. Your Rights and Choices

Depending on where you live, you may have rights to access, correct, export, or delete your
personal data, and to object to or restrict certain processing. Whether or not local law grants
these rights, we make the following available to every SideQuests user:

- **Access & correct** — update your display name, bio, and social links anytime in Settings; for
  data not editable in-app, email [support@miamisidequests.io](mailto:support@miamisidequests.io).
- **Control visibility** — toggle your profile's public visibility, leaderboard visibility, and
  what's shown on your public profile from Settings.
- **Manage consent** — adjust marketing and location consent anytime from Settings. Analytics
  is controlled per browser in [Cookie Preferences](/cookie-preferences) (Settings links there).
- **Control location** — every location feature can be turned off without losing access to the
  rest of the Service:
  - **Website:** "Location for verification" in Settings turns GPS check-in on or off (we ask
    before turning it on). Your browser's site permission controls all location access.
  - **App:** Settings → Location & nearby alerts lets you choose an area instead of using your
    location, use your location only while the app is open, or turn nearby alerts on, pause them,
    or limit them to 1 or 0 a day. Your phone's location and notification permissions control
    all access, and signing out stops nearby alerts on that device.
- **Delete** — request full account deletion at any time; see [Section 13](#13-data-deletion).

## 13. Data Deletion

You can request deletion of your account and associated personal data at any time. The full
process, timeline, and what may remain after deletion (e.g., anonymized aggregate analytics or
records we're legally required to retain) is described in our
[Delete Account policy](/delete-account).

## 14. Changes to This Policy

We may update this Policy as SideQuests evolves. When we do, we'll update the "Last Updated" date
above and, for material changes, notify you by email or an in-app notice. Continuing to use the
Service after a change takes effect means you accept the revised Policy. A full history of
changes is maintained in our
[Legal Version History](https://github.com/andrewheldy/sidequestsio/blob/main/docs/legal/Legal-Version-History.md).

## 15. Contact Us

Questions, requests, or concerns about this Policy or your data:

**Email:** [support@miamisidequests.io](mailto:support@miamisidequests.io)
We aim to respond within 5 business days.

---

*This document is part of the SideQuests legal framework. See also our
[Terms of Service](/terms), [Cookie Policy](/cookies), [Community Guidelines](/community-guidelines),
and [Delete Account policy](/delete-account).*
