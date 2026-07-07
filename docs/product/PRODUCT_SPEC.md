# SideQuests Product Specification (MVP)

## Purpose

This document defines the complete feature set, user experience, and functional requirements for the SideQuests MVP.

It is the authoritative specification for product development.

If a feature is not described here, it should be considered out of scope until formally added.

---

# Product Goal

Build a polished, mobile-first platform that allows users to discover real-world quests, complete them at physical locations, earn progression, and provide measurable value to partner businesses.

Success is defined by:

- Users completing quests.
- Users returning to complete additional quests.
- Businesses receiving measurable engagement.
- A product simple enough that a new user can complete their first quest in under five minutes.

---

# Target Users

## Explorers

People looking for fun things to do nearby.

Motivations:

- Discover hidden places
- Explore cities
- Earn rewards
- Track adventures

---

## Partner Businesses

Businesses looking to increase customer engagement.

Examples:

- Coffee shops
- Restaurants
- Breweries
- Retail stores
- Museums
- Attractions
- Entertainment venues

Goals:

- Increase foot traffic
- Generate reviews
- Increase website visits
- Improve social engagement
- Measure customer activity

---

# Core User Flow

1. User creates an account.
2. User discovers a quest.
3. User visits the location.
4. User scans the quest QR code.
5. User views the quest page.
6. User completes the objective.
7. User captures the experience.
8. User earns XP and Points.
9. User optionally shares to social media.
10. User leaves a Community Note.
11. Progress updates across the platform.

---

# Functional Requirements

## Authentication

Users can:

- Create an account
- Log in
- Log out
- Reset password

Required:

- Secure authentication
- Persistent sessions
- Profile creation

---

## Home Screen

Displays:

- Featured quests
- Nearby quests
- Categories
- Search
- User progression summary

Each quest card includes:

- Hero image
- Title
- Difficulty
- XP reward
- Point reward
- Estimated time
- Distance

---

## Quest Discovery

Users can browse by:

- Nearby
- Featured
- Category
- Difficulty
- Partner

Future filtering should not be implemented until required.

---

## Quest Page

Each quest includes:

### Overview

- Hero image
- Title
- Description
- Difficulty
- Estimated completion time

### Rewards

- XP
- Points
- Business reward (if applicable)

### Objective

Clear instructions describing how to complete the quest.

Objectives should be understandable in less than 30 seconds.

### Business Information

- Business name
- Website
- Google Reviews
- Social links
- Hours
- Address

### Completion

Primary CTA:

Complete Quest

Secondary CTA:

Capture the Moment

---

## QR Verification

Scanning a valid QR code:

- Confirms physical presence
- Opens the associated quest
- Prevents accidental completion elsewhere

---

## Quest Completion

Completing a quest awards:

- XP
- Points

Completion creates a permanent entry in the user's Adventure Log.

---

## Capture the Moment

Supports:

- Photo upload
- Video upload

Captured media is attached to the quest completion record.

---

## Community Notes

Users may leave:

- Tips
- Recommendations
- Fun discoveries
- Helpful advice

Community Notes should remain positive, useful, and tied to the completed quest.

---

## Adventure Log

Displays completed quests chronologically.

Each entry includes:

- Quest
- Date
- XP earned
- Points earned
- Captured media

The Adventure Log serves as the user's personal record of exploration.

---

## Profile

Displays:

- Avatar
- Username
- Current level
- XP
- Points balance
- Completed quests
- Achievements (placeholder)
- Adventure statistics

---

## Personal Map

Each completed location creates a single persistent pin.

Repeat completions update the existing pin rather than creating duplicates.

Pins display:

- Quest title
- Completion count
- First visit
- Most recent visit
- Photos

---

# Progression System

## XP

XP represents long-term progression.

XP is earned by completing quests.

XP cannot be spent.

Suggested rewards:

Easy

50 XP

Medium

150 XP

Hard

400 XP

Legendary

1000+ XP

---

## Levels

Levels unlock:

- Cosmetic rewards
- Special quests
- Recognition
- Future platform benefits

Level balancing may evolve over time.

---

## Points

Points are earned by completing quests.

Points may be redeemed for:

- Food
- Drinks
- Merchandise
- Discounts
- Event rewards

Points should always have visible utility.

---

# Business Experience

Partner businesses receive:

- Dedicated business profile
- Quest page
- QR code
- Analytics dashboard

Businesses control:

- Website link
- Google Review link
- Social links
- Reward description
- Business information

---

# Analytics Requirements

The platform records:

User Metrics

- Quest starts
- Quest completions
- XP earned
- Points earned
- Repeat visits

Business Metrics

- QR scans
- Website clicks
- Google Review clicks
- Social clicks
- Reward redemptions

Platform Metrics

- Daily active users
- Weekly active users
- Monthly active users
- Quest completion rate
- User retention
- Average quests completed

---

# Non-Functional Requirements

The application should be:

- Mobile-first
- Responsive
- Fast to load
- Easy to navigate
- Accessible
- Privacy-conscious

---

# Out of Scope

The following are intentionally excluded from the MVP:

- User-generated quests
- Messaging
- Friend systems
- Guilds
- Leaderboards
- Marketplace trading
- Complex moderation tools
- AR features
- AI-generated quest creation
- Dynamic QR generation
- Cryptocurrency or blockchain integrations

These ideas may be revisited in future planning documents but should not influence MVP implementation.

---

# MVP Completion Criteria

The MVP is considered complete when a new user can:

1. Create an account.
2. Discover a quest.
3. Visit a location.
4. Scan a QR code.
5. Complete the quest.
6. Capture a photo or video.
7. Earn XP and Points.
8. View the completion in their Adventure Log.
9. Leave a Community Note.
10. Generate measurable engagement for the partner business.

Any feature that does not directly support this end-to-end experience should be considered lower priority than polishing and refining the existing flow.
