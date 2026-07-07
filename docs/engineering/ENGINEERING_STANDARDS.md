# SideQuests Engineering Standards

## Purpose

This document defines the coding standards, architectural conventions, and engineering practices for the SideQuests codebase.

Every contributor—human or AI—should follow these standards when modifying the application.

Consistency is more valuable than cleverness.

---

# Engineering Philosophy

The codebase should be:

- Easy to understand
- Easy to modify
- Easy to review
- Easy to test
- Easy to ship

Favor readable code over clever abstractions.

Optimize for long-term maintainability.

---

# General Principles

## Build for Today

Solve the current problem.

Do not introduce abstractions for features that do not yet exist.

Avoid speculative engineering.

## Readability First

Code is read far more often than it is written.

Prefer descriptive names.

Prefer explicit logic.

Prefer small functions.

Avoid unnecessary indirection.

## Keep It Simple

If two solutions work equally well, choose the simpler one.

Complexity is a cost.

---

# TypeScript Standards

Always use strict typing.

Avoid:

- any
- unnecessary type assertions
- duplicated interfaces

Prefer:

- reusable types
- shared interfaces
- discriminated unions where appropriate

Types should communicate intent.

---

# React Standards

Prefer:

Functional components

React Hooks

Composition over inheritance

Avoid:

Large monolithic components

Deep prop drilling

Excessive nesting

A component should ideally have one responsibility.

---

# Component Organization

Recommended structure:

features/
    quests/
        components/
        hooks/
        services/
        types/

    profile/
        ...

    map/
        ...

shared/
    components/
    hooks/
    utils/

Group code by feature rather than file type.

---

# State Management

Use the smallest amount of state necessary.

Priority:

1. Local component state
2. Context
3. Global state

Avoid global state unless multiple unrelated features require the same data.

---

# Naming Conventions

Variables should be descriptive.

Good examples:

questCompletion
businessProfile
userProgress

Functions should describe actions.

Examples:

createQuest()
completeQuest()
calculateXP()
fetchBusiness()

Boolean variables should read naturally.

Examples:

isCompleted
hasVisited
canRedeem

---

# Database Access

Database access should be centralized.

Avoid scattered queries throughout the application.

Repositories or service layers should encapsulate data access.

---

# Supabase Standards

Every migration should:

- Be idempotent where practical
- Be reversible when possible
- Avoid destructive operations
- Include comments explaining intent

Never modify production directly without backups.

---

# Error Handling

Never silently ignore errors.

Handle:

Network failures

Permission errors

Validation failures

Unexpected exceptions

Provide meaningful logs for developers and actionable messages for users.

---

# Logging

Log information that helps diagnose issues.

Avoid excessive logging in production.

Never log:

Passwords

Authentication tokens

Sensitive user information

Private media

---

# Security

Never trust client input.

Always validate:

Authentication

Authorization

Ownership

Quest completion requests

Reward redemption

Business permissions

Security is enforced on the server.

---

# Testing Philosophy

Test behavior—not implementation details.

Critical paths include:

Authentication

Quest completion

Reward calculations

QR verification

Analytics

Regression testing should focus on the primary user journey.

---

# Pull Request Standards

Every pull request should:

- Solve one clearly defined problem
- Be easy to review
- Include documentation updates when necessary
- Avoid unrelated changes

Small pull requests are preferred over large ones.

---

# AI Contributor Guidelines

AI-generated code should:

- Match existing conventions
- Avoid unnecessary dependencies
- Respect current architecture
- Preserve backwards compatibility
- Update documentation when appropriate

Do not rewrite large portions of the codebase without a clear justification.

---

# Anti-Patterns

Avoid:

- Premature optimization
- Massive components
- Business logic inside UI components
- Duplicate code
- Duplicate data models
- Unused abstractions
- Magic numbers
- Hidden side effects

If something feels overly clever, it probably is.

---

# Engineering North Star

The best code is code that a new engineer can understand six months from now without needing additional explanation.

Every contribution should leave the codebase simpler, more consistent, and easier to extend than it was before.
