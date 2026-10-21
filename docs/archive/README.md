# Documentation archive

**Status: historical reference only.** These documents are excluded from the default working instructions. Do not execute archived prompts or treat old architecture descriptions as current requirements.

## Preserved sources

The following files were preserved byte-for-byte from commit `4c30e5d5302490261b0c560d07b69be9ec052078` during the pre-mobile documentation cleanup. Short forwarding files remain at the original paths so file-level references still resolve.

| Original path | Archived source | Why archived |
| --- | --- | --- |
| `ARCHITECTURE.md` | [Legacy MVP architecture](architecture/ARCHITECTURE_OLD_MVP_BUILD.md) | Already identified as a legacy snapshot by the operating manual and system-state record. |
| `docs/CLAUDE_DESIGN_PROMPT.md` | [Website redesign prompt](prompts/CLAUDE_DESIGN_PROMPT.md) | One-off execution prompt, not a standing specification. Active design references are indexed separately. |

File-level forwarding does not guarantee that old heading-anchor links still resolve. The preserved source is available above for historical section references. Relative links inside archived source text retain their original spelling; interpret them relative to the original file location and commit.

## Consolidation record

Removed numbered copies only after comparison:

- `AGENTS 2.md`, `.codex/config 2.toml`, and `docs/CLAUDE_DESIGN_PROMPT 2.md` had the same Git blob IDs as their unnumbered counterparts.
- `docs/design/REUSABLE_FINDINGS 2.md` differed only by one extra trailing newline; the unnumbered file remains unchanged.
- `CLAUDE.md` duplicated `AGENTS.md` except for tool names. It now points to the shared manual.
- `docs/engineering/ROADMAP.md` duplicated `DEVELOPMENT_ROADMAP.md` exactly. It now points to that roadmap.

No unique historical content was discarded. Audit records, decision logs, legal documents, design reference images, the active web design brief, brand assets, application code, migrations, and dependency files were not changed by this cleanup.

## Using historical material

Follow [AGENTS.md](../../AGENTS.md) and the [active documentation map](../README.md). Revalidate any useful historical requirement against current code and the relevant authoritative document before promoting it. Make that promotion explicit rather than silently reviving an old prompt.

This cleanup is not a new production audit, a mobile architecture decision, or a claim that dated status documents are current.
