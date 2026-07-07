# SideQuests Analytics Specification

## Purpose

This document defines the analytics strategy for SideQuests.

Every tracked event should answer a business, product, or operational question.

Analytics exist to improve the platform—not simply to collect data.

---

# Analytics Philosophy

Every event should support one or more of the following:

- Improve user experience
- Demonstrate value to businesses
- Measure platform health
- Support product decisions
- Guide future development

If an event does not answer a meaningful question, it should not be tracked.

---

# Analytics Layers

The platform measures four categories of activity:

1. User Behavior
2. Business Performance
3. Product Health
4. Platform Growth

---

# User Analytics

## Account Metrics

Track:

- Account created
- Onboarding completed
- Profile completed
- Returning users

Purpose:

Measure user acquisition and onboarding success.

## Discovery Metrics

Track:

- Home page viewed
- Quest card viewed
- Quest page opened
- Search performed
- Map interactions
- Filter usage

Questions answered:

How are users finding quests?

Which discovery methods perform best?

## Quest Metrics

Track:

- Quest started
- QR scanned
- Quest completed
- Quest abandoned
- Completion time
- Difficulty

Questions answered:

Which quests are engaging?

Where are users dropping off?

How long does a quest take?

## Progression Metrics

Track:

- XP earned
- Level reached
- Points earned
- Points redeemed

Questions answered:

Is progression motivating users?

Are rewards being used?

## Community Metrics

Track:

- Community Notes created
- Notes viewed
- Notes reported (future)
- Notes deleted (admin)

Questions answered:

Are users contributing knowledge?

Which quests generate conversation?

---

# Business Analytics

Every partner business should receive meaningful, actionable reporting.

## QR Performance

Track:

- Total scans
- Unique scans
- Repeat scans
- Scan time
- Scan location (if applicable)

Purpose:

Measure physical engagement.

## Quest Performance

Track:

- Quest starts
- Quest completions
- Completion rate
- Average completion time

Purpose:

Evaluate quest quality.

## Website Engagement

Track:

- Website clicks
- Click-through rate

Purpose:

Measure referral traffic.

## Review Engagement

Track:

- Google Review clicks
- Review conversion rate (when measurable)

Purpose:

Measure customer advocacy.

## Social Engagement

Track clicks to:

- Instagram
- TikTok
- Facebook
- X

Purpose:

Measure interest in the business beyond the visit.

## Reward Analytics

Track:

- Rewards viewed
- Rewards redeemed
- Redemption rate

Purpose:

Understand which offers motivate participation.

---

# Platform Health

Key operational metrics:

Daily Active Users (DAU)

Weekly Active Users (WAU)

Monthly Active Users (MAU)

New users

Returning users

Session length

Quests per session

Completion rate

Repeat completion rate

These metrics provide a high-level view of platform engagement.

---

# Marketplace Health

Track:

Active businesses

Active quests

Published quests

Inactive quests

Average quests per business

Businesses with recent activity

Purpose:

Measure ecosystem growth.

---

# Growth Metrics

Track:

User acquisition source

Referral source

Invitation acceptance

Organic growth

Business acquisition

City expansion

Purpose:

Understand how SideQuests grows over time.

---

# Retention Metrics

Measure:

Day 1 retention

Day 7 retention

Day 30 retention

Monthly retention

Business renewal rate

Partner retention

Retention is a stronger indicator of product-market fit than downloads alone.

---

# Event Naming

Event names should be:

Consistent

Descriptive

Past tense or action-based

Examples:

quest_started

quest_completed

qr_scanned

reward_redeemed

community_note_created

Avoid ambiguous event names.

---

# Dashboard Requirements

## Executive Dashboard

High-level KPIs:

- Active users
- Active businesses
- Monthly recurring revenue
- Quest completions
- Retention
- Platform growth

Audience:

Founders

Leadership

Investors

## Business Dashboard

Per-business metrics:

- QR scans
- Quest completions
- Website clicks
- Review clicks
- Reward redemptions
- Repeat visitors

Audience:

Partner businesses

## Product Dashboard

Product metrics:

- Funnel conversion
- Drop-off points
- Feature usage
- User journeys
- Performance trends

Audience:

Product team

---

# Privacy Principles

Collect only the information necessary to improve the product and demonstrate value.

Avoid unnecessary personal data.

Where possible:

Aggregate

Anonymize

Minimize

Respect user privacy while still delivering meaningful business insights.

---

# Analytics Review Cadence

Weekly:

Review product engagement.

Monthly:

Review business performance and customer success.

Quarterly:

Evaluate product-market fit, retention, monetization, and roadmap priorities.

---

# Success Metrics

The MVP is considered successful when:

Users consistently complete quests.

Users return to complete additional quests.

Businesses receive measurable engagement.

Businesses renew subscriptions.

Founding partners recommend the platform.

Growth occurs through repeat usage rather than one-time curiosity.

---

# Analytics North Star

The primary success metric for SideQuests is:

**Completed real-world adventures that create measurable value for both the player and the partner business.**

Every dashboard, report, and event should ultimately help improve that outcome.
