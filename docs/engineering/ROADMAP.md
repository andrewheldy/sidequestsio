# SideQuests Development Roadmap

**Last Updated:** 2026-07-06

---

# Purpose

This roadmap defines the engineering priorities for SideQuests based on the verified production state of the application.

It is intentionally grounded in audited reality rather than aspirational planning.

This document describes what needs to happen, not who will do it or when.

---

# Roadmap Principles

Engineering priorities should always follow this order:

1. Launch a reliable MVP.
2. Improve the player experience.
3. Increase measurable value for partner businesses.
4. Scale only after product-market fit is demonstrated.

Avoid adding new product scope until the core quest loop is stable and enjoyable.

---

# Phase 1 — Launch Blockers

These issues prevent a credible public MVP launch.

## Authentication & Profiles

Resolve inconsistencies that prevent reliable account creation.

Goals:

- New users always receive a profile.
- Authentication redirects correctly.
- Users return to their intended destination after signing in.

## Public Data Access

Ensure publicly available quest and business information is accessible through the intended anonymous client without compromising security.

## Quest Schema Alignment

Unify the database schema, application types, and UI so that every quest shares one consistent structure.

This includes fields such as:

- funky_action
- action_type
- proof_method
- estimated_time
- business links
- social prompts

## Media Uploads

Ensure proof-photo uploads function correctly.

Goals:

- Storage bucket exists.
- Permissions are correct.
- Upload failures are surfaced to users.

## Profile Visibility

Use one consistent visibility model across profiles and public views.

## Navigation

Remove or mount every linked route.

Users should never encounter dead navigation.

## Quest Verification

Determine the MVP verification model.

Current options include:

- Trust the client for low-value rewards.
- Introduce stronger verification where reward value justifies the added complexity.

The chosen approach should balance security with a smooth player experience.

---

# Phase 2 — MVP Polish

Once the platform is functionally complete, improve consistency and usability.

## Data Consistency

Unify demo and live data behavior.

Every surface should clearly follow one defined policy.

## UI Consistency

Remove duplicate layouts.

Ensure navigation and page structure remain consistent throughout the application.

## Code Quality

Resolve:

- lint errors
- dependency issues
- outdated documentation

The codebase should be stable enough for new contributors to understand quickly.

## Performance

Improve:

- bundle size
- route loading
- image optimization
- Map rendering

Performance work should focus on improving perceived responsiveness on mobile devices.

## Security Hardening

Review:

- Authentication settings
- Storage permissions
- RPC permissions
- Public access policies

The goal is a secure public launch without unnecessary complexity.

---

# Phase 3 — Scale

Once the Miami MVP demonstrates repeat engagement and business value, begin expanding the platform.

## Community Guide Program

Develop curated quest collections in collaboration with trusted community members.

Examples include:

- Food creators
- Neighborhood experts
- Historians
- Artists
- Fitness communities
- University ambassadors
- Festival organizers

Community Guides do not independently publish quests.

Instead, SideQuests collaborates with guides to design, review, and launch high-quality quest lines that meet the platform's standards.

Purpose:

- Leverage trusted local expertise.
- Maintain consistent quest quality.
- Strengthen community engagement.
- Expand organically through authentic local voices.

## Partnership Dashboard

Expand the partner portal.

Businesses should be able to:

- View analytics.
- Update business information.
- Manage rewards.
- Review quest performance.

Quest publishing remains a collaborative workflow with SideQuests.

## Analytics Expansion

Provide richer reporting for:

- Businesses
- Community Guides
- Internal product decisions

Focus on actionable insights rather than vanity metrics.

## Verification Improvements

As rewards become more valuable, introduce stronger verification where appropriate.

Possible improvements include:

- Enhanced QR validation
- GPS confirmation
- Staff approval workflows

These enhancements should be driven by real fraud risk rather than assumptions.

## Performance Optimization

As usage grows:

- Split large bundles.
- Optimize asset loading.
- Improve map performance.
- Reduce page load times.

Optimize based on real production usage rather than theoretical scale.

---

# Phase 4 — Future Exploration

The following ideas are intentionally outside the current roadmap.

They should not influence MVP engineering decisions.

Examples include:

- Advanced AR experiences
- Large-scale gamification systems
- Dedicated backend services
- Multi-region deployments
- Enterprise infrastructure beyond current operational needs

These ideas may be revisited after sustained product-market fit.

---

# Release Criteria

The MVP is considered launch-ready when a user can:

1. Create an account.
2. Discover nearby quests.
3. Visit a partner location.
4. Scan a QR code.
5. Complete the quest objective.
6. Capture proof of completion.
7. Earn XP and Points.
8. View the completion in their Adventure Log.
9. Leave a Community Note.
10. Generate measurable engagement for the partner business.

Partner businesses should simultaneously be able to measure meaningful customer engagement through the platform.

---

# Development North Star

Every engineering decision should strengthen the core SideQuests loop:

**Discover → Visit → Scan → Experience → Capture → Progress → Share → Return**

If a feature does not improve this loop, improve partner value, or strengthen long-term product quality, it should remain in the backlog until the core experience has been perfected.
