# SideQuests Quest Design Guide

## Purpose

This document establishes the standards for creating quests on the SideQuests platform.

Every quest should be:

- Fun
- Memorable
- Easy to understand
- Valuable for the player
- Valuable for the partner business

The objective is not to create difficult challenges.

The objective is to create memorable real-world experiences.

---

# Core Philosophy

A quest should encourage someone to do something they probably wouldn't have done otherwise.

Good quests inspire curiosity.

Great quests create stories people tell later.

---

# The Four Pillars of a Great Quest

Every quest should satisfy at least three of these principles.

## Discovery

Introduce users to something new.

Examples:

- Hidden menu item
- Secret room
- Historic landmark
- Local artist
- Scenic view
- Signature product

The player should leave having learned something.

---

## Interaction

Require meaningful engagement.

Examples:

- Speak with staff
- Order a featured item
- Solve a clue
- Explore the venue
- Visit multiple locations

Avoid passive experiences.

---

## Memory

Create a moment worth remembering.

Examples:

- Take a photo
- Watch a sunset
- Find a mural
- Ring a bell
- Sign a guest book
- Try something unique

The goal is an experience—not simply task completion.

---

## Business Value

Every quest should create measurable value for the partner.

Examples:

- Website visit
- Review page visit
- Store visit
- Product discovery
- Event attendance
- Repeat visitation

If the player benefits but the business does not, redesign the quest.

---

# Quest Structure

Every quest should include the following.

## Title

Short.

Interesting.

Action-oriented.

Good examples:

The Hidden Latte

Secret Garden Escape

Find the Flamingo

Taste Little Havana

Bad examples:

Coffee Quest

Restaurant Visit

Quest #17

---

## Hero Image

Use authentic imagery whenever possible.

Priority:

Business photography

Venue photography

Food

Experience

Neighborhood

Avoid generic stock photos.

---

## Description

The description should answer:

Why is this worth doing?

Focus on excitement rather than instructions.

Keep descriptions under 100 words.

---

## Objective

Objectives should be extremely clear.

A user should understand the task in under 30 seconds.

Good examples:

Ask the barista for today's featured roast.

Find the hidden mural inside the courtyard.

Order the house specialty and capture a photo.

Locate the rooftop observation deck.

Avoid vague instructions.

---

## Completion Method

Each quest should have a clearly defined completion requirement.

Examples:

QR verification

Photo capture

Staff confirmation

Location visit

Product purchase (optional where appropriate)

The completion method should match the experience.

---

# Difficulty Guidelines

Difficulty measures effort—not physical ability.

## Easy

Target time:

2–5 minutes

Examples:

Check in

Take a photo

Find an object

Order a featured drink

Ideal reward:

50 XP

25 Points

---

## Medium

Target time:

5–15 minutes

Examples:

Solve a clue

Explore multiple rooms

Talk with staff

Complete two objectives

Ideal reward:

150 XP

75 Points

---

## Hard

Target time:

15–30 minutes

Examples:

Visit multiple nearby locations

Complete a scavenger hunt

Attend a scheduled activity

Ideal reward:

400 XP

200 Points

---

## Legendary

Reserved for special activations.

Examples:

Festivals

City-wide experiences

Major events

Convention activations

Brand campaigns

Legendary quests should feel genuinely unique.

---

# Business Guidelines

Quests should never feel like advertisements.

Instead:

Create experiences that naturally introduce customers to the business.

Users should leave thinking:

"I'm glad I found this place."

Not:

"I just completed a marketing campaign."

---

# Community Notes

Every quest should encourage conversation.

Good prompts include:

What surprised you?

Did you discover something interesting?

Any tips for future adventurers?

Community Notes should add value for future visitors.

---

# Reward Design

Rewards should reinforce participation without becoming the sole motivation.

Examples:

Discounts

Free samples

Exclusive menu items

Collectibles

Merchandise

Event perks

The experience should always be more memorable than the reward.

---

# Quest Quality Checklist

Before publishing, verify that the quest answers "yes" to the following:

- Is the objective immediately understandable?
- Does the quest encourage exploration?
- Does the business benefit?
- Can the quest be completed without frustration?
- Is the reward proportional to the effort?
- Will players want to tell someone about this experience?
- Does the quest showcase something unique?

If the answer to any question is "no," revise the quest before publishing.

---

# Things to Avoid

Do not create quests that:

- Require excessive waiting
- Depend on unavailable staff
- Feel like advertisements
- Require unnecessary purchases
- Are confusing
- Have hidden completion criteria
- Can be completed without visiting the location
- Are impossible during normal business hours

Consistency builds trust with players.

---

# Content Standards

Tone should be:

- Encouraging
- Curious
- Friendly
- Adventurous

Avoid:

- Clickbait
- Overly promotional language
- Corporate jargon
- Long instructions

The quest should sound like an invitation from a knowledgeable local.

---

# Quest Frameworks

A framework lets one quest produce a different objective on each visit. Write it like a normal quest, then mark the parts that can vary as `{slots}` and list the options for each.

## Writing a good framework

- Every combination of options must pass the Quest Quality Checklist on its own. Read a few out loud before publishing.
- Keep options interchangeable: each one should fit the sentence and take about the same effort.
- Two or three frameworks per quest, with three to five options per slot, is plenty. The next visit always prefers a different framework.
- Only use actions the venue has agreed to. A framework changes what the user does at the partner's venue, so the partner should approve it the same way they approve the quest.
- Leave reward overrides empty unless a framework is clearly harder or easier than the quest's default.

## Example

```sql
-- Let the quest repeat weekly, then add a framework to it.
update public.quests set repeat_cooldown_days = 7 where id = '<quest id>';

insert into public.quest_frameworks
  (quest_id, name, objective_template, prompt_template, proof_method,
   staff_phrase_template, share_template, estimated_time, slots)
values (
  '<quest id>',
  'Secret order',
  'Order a {drink} and ask for it {style}',
  'Walk up to the counter and order a {drink}, {style}. Snap it before the first sip.',
  'staff_phrase',
  'One {drink}, {style}, for the quest',
  'Ordered a {drink} {style} on a SideQuest ☕ #sidequests',
  '10 min',
  '{"drink": ["cortado", "cold brew", "cafecito"], "style": ["in Spanish", "with extra foam"]}'
);
```

The database rejects a framework whose templates use a `{slot}` that has no options. Frameworks are authored in the Supabase SQL editor until the partner portal supports them.

---

# The SideQuests Test

Before approving any quest, ask one question:

**"If this business disappeared tomorrow, would someone remember this experience?"**

If the answer is yes, the quest has likely created something meaningful.

That is the standard every SideQuest should strive to meet.
