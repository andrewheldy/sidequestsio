# SideQuests documentation map

Start with [AGENTS.md](../AGENTS.md) for the shared operating rules, required reading, scope, and source-of-truth hierarchy. [CLAUDE.md](../CLAUDE.md) is a tool entry point to the same manual, not a second policy document.

Read the documents relevant to the task, not the entire repository. Update the existing owner of a topic instead of creating another master context, duplicate roadmap, or numbered copy.

## Foundations and product

| Topic | Authoritative document |
| --- | --- |
| Foundational principles | [Project Constitution](PROJECT_CONSTITUTION.md) |
| Product vision and MVP context | [Master Context](MASTER_CONTEXT.md) |
| Product strategy | [Product Direction](PRODUCT_DIRECTION.md) |
| MVP requirements | [Product Specification](product/PRODUCT_SPEC.md) |
| Quest quality and structure | [Quest Design Guide](product/QUEST_DESIGN_GUIDE.md) |
| Product decisions | [Product Decision Log](product/PRODUCT_DECISION_LOG.md) |
| Standing decisions | [Decisions](DECISIONS.md) |

## Design: distinct scopes, not competing redesign prompts

| Scope | Reference |
| --- | --- |
| Brand implementation specifications | [Brand design system](../brand/design-system.md) |
| Product interaction and UX principles | [Product design system](product/DESIGN_SYSTEM.md) |
| Existing website rebuild direction | [Web design brief](../DESIGN_BRIEF.md) |
| Native-app visual references | [Mobile reference images](design/mobile/) |
| Design evidence and motion specifications | [Design directory](design/) |

Keep the web brief and mobile reference images: they are not duplicates of the historical redesign prompt. A visual reference is not, by itself, a complete implementation specification. Surface conflicts between references instead of choosing a new visual direction during housekeeping.

## Engineering and operations

| Topic | Owner |
| --- | --- |
| Architecture guidance | [Technical Architecture](architecture/TECHNICAL_ARCHITECTURE.md) |
| Logical database design | [Database Specification](architecture/DATABASE_SPEC.md) |
| Technical decisions | [Architecture Decision Record](architecture/ARCHITECTURE_DECISION_RECORD.md) |
| Coding conventions | [Engineering Standards](engineering/ENGINEERING_STANDARDS.md) |
| Engineering priorities | [Development Roadmap](engineering/DEVELOPMENT_ROADMAP.md) |
| Execution planning | [Production Sprint Plan](engineering/PRODUCTION_SPRINT_PLAN.md) |
| System verification record | [System State](engineering/SYSTEM_STATE.md) |
| Operational history | [Changelog](engineering/CHANGELOG.md) |
| Measurement requirements | [Analytics Specification](engineering/ANALYTICS_SPEC.md) |
| Quest content import | [Quest Content Import](QUEST_CONTENT_IMPORT.md) |
| CRM import | [CRM Import Runbook](CRM_IMPORT_RUNBOOK.md) |

**Freshness matters.** The system-state document's header is dated `2026-07-06`; this cleanup does not reverify its deployment, database, route, or security claims. Read the dates and evidence attached to individual entries. Inspect current code and migrations, and verify the live environment when needed. A file in the active index can still contain an old snapshot or intended behavior rather than shipped behavior.

`engineering/ROADMAP.md` is only a compatibility pointer to `engineering/DEVELOPMENT_ROADMAP.md`. Do not maintain two sets of priorities.

## Business and legal

Business model and partnership guidance live in [business/](business/). Policies live in [legal/](legal/) and are not archival clutter; they may be rendered by the application. Do not relocate or remove them as part of general documentation cleanup.

This index does not change pricing, monetization, product scope, or the project constitution. Strategy changes require an explicit update to their owning documents.

## History and archives

[Audits](audits/), decision logs, and dated verification records retain their evidence and dates; do not silently rewrite history.

[Archive index](archive/README.md) identifies the legacy architecture snapshot and one-off redesign prompt, their original paths, and the duplicate-file consolidation. Archived prompts are reference material, not active tasks. Root `ARCHITECTURE.md` and `CLAUDE_DESIGN_PROMPT.md` retain short forwarding notices rather than competing specifications.

Before mobile implementation, establish a current technical baseline and record approved mobile scope in the existing product and architecture documents. Cleaning documentation does not establish production readiness or authorize restructuring the working web app.
