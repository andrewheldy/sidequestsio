# SideQuests Technical Architecture

## Purpose

This document defines the architectural philosophy, technology stack, and engineering principles that guide the SideQuests platform.

It is intended for engineers and AI coding assistants contributing to the project.

This document explains how the system is organized rather than documenting individual files.

---

# Engineering Philosophy

The architecture should optimize for:

- Simplicity
- Maintainability
- Fast iteration
- Reliability
- Developer experience

The MVP should avoid unnecessary abstractions and premature optimization.

Every new dependency, service, and layer of complexity should have a clear justification.

---

# Core Principles

## Build the Simplest Thing That Works

The MVP should solve today's problems.

Do not introduce infrastructure for hypothetical future features.

Avoid speculative engineering.

## One Source of Truth

Every piece of data should have one authoritative location.

Examples:

- User profiles belong in the database.
- Quest content belongs in the database.
- Business information belongs in the database.
- Documentation belongs in the docs directory.

Avoid duplicated state whenever possible.

## API First

The frontend should communicate with clearly defined backend services.

Business logic should not be duplicated across multiple clients.

## Mobile-First Performance

Users primarily interact with SideQuests from mobile devices.

Prioritize:

- Small payloads
- Fast rendering
- Efficient image loading
- Responsive interactions

Performance is a feature.

---

# Recommended Stack

Frontend:

- React
- TypeScript
- Vite

Backend:

- Supabase

Database:

- PostgreSQL (Supabase)

Authentication:

- Supabase Auth

Storage:

- Supabase Storage

Maps:

- Mapbox

Deployment:

- Vercel

This stack is intentionally simple and supports rapid iteration.

---

# Application Layers

## Presentation Layer

Responsible for:

- Screens
- Components
- User interactions
- Visual state

No business rules.

## Domain Layer

Responsible for:

- Quest logic
- Progression
- Rewards
- Validation
- Business rules

This layer should remain framework-independent whenever possible.

## Data Layer

Responsible for:

- Database communication
- API requests
- Caching
- Persistence

No UI logic.

---

# State Management

Keep state as local as possible.

Prefer:

Component state

↓

Context

↓

Global state

Global state should be introduced only when genuinely necessary.

---

# Data Flow

Preferred flow:

Database

↓

Backend

↓

API

↓

Frontend

↓

User Interface

Avoid bypassing application layers.

---

# Authentication

Authentication should support:

- Email/password
- Persistent sessions
- Protected routes
- Secure authorization

Never expose privileged operations on the client.

---

# Security Principles

Always validate:

- User identity
- Permissions
- Business ownership
- Quest completion requests

Assume client input can be manipulated.

---

# File Organization

Organize code by feature rather than file type whenever practical.

Example:

features/
    quests/
    profile/
    map/
    analytics/
    partners/

Avoid large miscellaneous folders.

---

# Component Philosophy

Components should:

- Have one responsibility
- Be reusable
- Be easy to test
- Remain small

If a component exceeds a few hundred lines, consider splitting it.

---

# Database Philosophy

Normalize where appropriate.

Avoid unnecessary joins.

Prefer readable schemas over clever schemas.

Document every migration.

Never modify production data without backups.

---

# Analytics Philosophy

Measure meaningful events.

Track actions that answer business questions.

Avoid collecting data without a clear purpose.

---

# Scalability

Design for growth, but optimize for today's users.

The current architecture should comfortably support:

- Thousands of users
- Thousands of quests
- Thousands of businesses

Larger scaling concerns should be addressed when supported by real usage.

---

# Engineering North Star

Every technical decision should improve at least one of the following:

- Simplicity
- Reliability
- Performance
- Maintainability
- Developer productivity

If a solution increases complexity without providing meaningful value, it should be reconsidered.
