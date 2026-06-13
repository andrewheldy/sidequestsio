# Restore Procedure — SideQuests.io (Pre-PR#3 Backup)

> 🛑 **DANGER — DESTRUCTIVE OPERATIONS DOCUMENT.**
> This file is **documentation only**. It is intentionally **Markdown, not a
> runnable `.sql`/`.sh` script**, so nothing here executes by accident. The SQL
> blocks below **overwrite or delete live data**. Do **not** copy-paste them
> blindly. Read the whole file, work on a throwaway target first, and have a
> second person confirm before touching production.
>
> Companion to `PRE_PR3_BACKUP_PROCEDURE.md`, `export_identity_tables.sql`,
> `verify_backup_exports.sql`. Use when a write-bearing PR (#3 backfill, etc.)
> has gone wrong and you must return to the pre-PR#3 fingerprint.

---

## When to use which restore

| Situation | Restore path |
|---|---|
| PR #3 backfill corrupted rows; schema unchanged or compatible | **Path B — per-table CSV reload** (surgical) |
| Whole DB wedged; want the exact pre-PR#3 snapshot | **Path A — full dump restore** |
| Trying it out / building confidence before prod | **Dry run** (always do this first) |

**Golden rule:** the success criterion for *every* path is that
`verify_backup_exports.sql` **SECTION 1** run afterwards reproduces the
**fingerprint** recorded in `PRE_PR3_BACKUP_PROCEDURE.md` (matching `row_count`
**and** `content_md5` for all 16 tables).

---

## Pre-restore checklist (all paths)

- [ ] Identify the target connection string. **Triple-check** it is the intended
  project (prod vs scratch). Most accidents are "right command, wrong database."
- [ ] Take a **fresh dump of the current (broken) state first** — you may need it
  for forensics, and it guards against a bad restore making things worse.
- [ ] Put the app in a safe state if possible (maintenance/announcement) so no
  new writes race the restore.
- [ ] Locate the backup artifacts (full dump + 16 CSVs) and the recorded
  fingerprint.
- [ ] Confirm you have a **privileged** role (`postgres`/service) — restoring
  `auth.users` and bypassing RLS requires it.

---

## Dry run (REQUIRED before any production restore)

Rehearse on a **throwaway target** — a scratch Supabase project or local
Postgres — never on prod for the rehearsal.

1. Provision the scratch target with the **same schema** as prod at backup time
   (apply the same migrations, or restore the full dump from Path A(iii)).
2. Run the chosen restore path against the scratch target.
3. Run `verify_backup_exports.sql` SECTION 1 on the scratch target.
4. Confirm **every `content_md5` matches** the recorded fingerprint.
5. Only after a clean match do you consider running against production.

---

## Path A — Full dump restore (whole-snapshot)

Use the artifact from `PRE_PR3_BACKUP_PROCEDURE.md` §1A.

### A(iii) custom-format `.dump` (schema + data)
```sh
# 🛑 DESTRUCTIVE: replaces objects' data. Run against the INTENDED target only.
pg_restore \
  --no-owner --no-privileges \
  --clean --if-exists \              # drops objects before recreating — DANGEROUS
  --dbname "<TARGET_CONNECTION_STRING>" \
  backup/sidequests_pre_pr3.dump
```
- `--clean --if-exists` **drops then recreates** — only for a true whole-DB
  rollback on a target you intend to overwrite. Omit it to restore into an empty
  target instead.

### A(i)/(ii) plain-SQL dump (`.sql`)
```sh
# 🛑 DESTRUCTIVE depending on file contents (data-only INSERTs vs full).
psql "<TARGET_CONNECTION_STRING>" -f backup/sidequests_data_pre_pr3.sql
```
- The data-only `--column-inserts` dump from §1A(ii) inserts rows in captured
  order. If rows already exist you will hit PK conflicts — clear the affected
  tables first (see Path B step 2 truncation block) or restore into an empty
  target.

---

## Path B — Per-table CSV reload (surgical row-level restore)

Best for "undo PR #3's data changes" when the schema is intact. Restores the 16
tables from the CSVs captured in `PRE_PR3_BACKUP_PROCEDURE.md` §1B.

### B.1 — Load order (PARENTS FIRST)
`auth.users` → `users` → `partners` → `venues` → `quests` → `qr_codes` →
`user_profiles` → `privacy_preferences` → `profiles` → `rewards` →
`scan_events` → `quest_completions` → `points_ledger` → `reward_redemptions` →
`community_notes` → `note_reports`

### B.2 — Clear current rows (CHILDREN FIRST = reverse order)
> 🛑 **DESTRUCTIVE — deletes all rows in these tables.** Only run if you are
> intentionally replacing their contents with the backup. Do the **reverse** of
> the load order so foreign keys don't block you.
```sql
-- 🛑 DO NOT PASTE BLINDLY. Privileged role required. Wrap in a transaction.
-- begin;
-- truncate table public.note_reports        cascade;
-- truncate table public.community_notes      cascade;
-- truncate table public.reward_redemptions   cascade;
-- truncate table public.points_ledger        cascade;
-- truncate table public.quest_completions    cascade;
-- truncate table public.scan_events          cascade;
-- truncate table public.rewards              cascade;
-- truncate table public.profiles             cascade;
-- truncate table public.privacy_preferences  cascade;
-- truncate table public.user_profiles        cascade;
-- truncate table public.qr_codes             cascade;
-- truncate table public.quests               cascade;
-- truncate table public.venues               cascade;
-- truncate table public.partners             cascade;
-- truncate table public.users                cascade;
-- -- NOTE: do NOT truncate auth.users casually — it cascades to app data and is
-- -- managed by Supabase Auth. Restore auth.users only if it actually changed
-- -- (Phase 0 is forward-only and does NOT modify auth.users).
-- -- verify counts are 0, then proceed to B.3, then: commit;  (or rollback;)
```

### B.3 — Reload from CSV (parents first)
```sh
# 🛑 DESTRUCTIVE in combination with B.2. psql \copy reads your local CSV.
# Run each in load order; do auth.users only if you truncated/changed it.
psql "<TARGET_CONNECTION_STRING>" <<'SQL'
\copy public.users               from 'backup/users.csv'                with (format csv, header true)
\copy public.partners            from 'backup/partners.csv'             with (format csv, header true)
\copy public.venues              from 'backup/venues.csv'               with (format csv, header true)
\copy public.quests              from 'backup/quests.csv'               with (format csv, header true)
\copy public.qr_codes            from 'backup/qr_codes.csv'             with (format csv, header true)
\copy public.user_profiles       from 'backup/user_profiles.csv'        with (format csv, header true)
\copy public.privacy_preferences from 'backup/privacy_preferences.csv'  with (format csv, header true)
\copy public.profiles            from 'backup/profiles.csv'             with (format csv, header true)
\copy public.rewards             from 'backup/rewards.csv'              with (format csv, header true)
\copy public.scan_events         from 'backup/scan_events.csv'          with (format csv, header true)
\copy public.quest_completions   from 'backup/quest_completions.csv'    with (format csv, header true)
\copy public.points_ledger       from 'backup/points_ledger.csv'        with (format csv, header true)
\copy public.reward_redemptions  from 'backup/reward_redemptions.csv'   with (format csv, header true)
\copy public.community_notes     from 'backup/community_notes.csv'       with (format csv, header true)
\copy public.note_reports        from 'backup/note_reports.csv'         with (format csv, header true)
SQL
```
- Dashboard alternative: **Table Editor → table → Insert → Import data from CSV**
  (do it in the same parent-first order).
- `points_ledger.csv` is header-only (0 rows) — importing it is a no-op; fine.

---

## Special note: `auth.users`

- Phase 0 is **forward-only and does not modify `auth.users`**, so you normally
  do **not** restore it.
- If it ever must be restored: it lives in the `auth` schema, is managed by
  Supabase Auth, and cascades into all app data. Restore it **first** (it is the
  parent of everything), use a privileged role, and prefer the full dump (Path A)
  over CSV for it. Validate that logins still work afterward.

---

## Post-restore verification (REQUIRED)

1. [ ] Run `verify_backup_exports.sql` **SECTION 1** on the restored target.
2. [ ] Confirm **all 16** `(row_count, content_md5)` rows **match** the recorded
   fingerprint in `PRE_PR3_BACKUP_PROCEDURE.md`. Any mismatch ⇒ the restore is
   **not** complete — do not declare success.
3. [ ] Run **SECTION 3** (referential sanity): expect `auth_without_profiles = 1`,
   all others `= 0` (the pre-PR#3 state).
4. [ ] Smoke-test the app: sign in, load a profile, open `/u/:username`, list
   community notes — confirm nothing 500s.
5. [ ] Record the restore (date, operator, reason, fingerprint match Y/N) below.

### Restore log
```
date (UTC) | operator | reason | path (A/B) | fingerprint match (Y/N) | notes
-----------+----------+--------+------------+-------------------------+------
<fill>     | <fill>   | <fill> | <fill>     | <fill>                  | <fill>
```

---

## If something is wrong mid-restore

- You took a dump of the broken state in the pre-restore checklist — you can
  always return to it.
- Wrap Path B truncate+reload in a single `begin; … commit;` so a failure can
  `rollback;` cleanly (Supabase SQL Editor runs statements in a transaction per
  run; psql honors explicit `begin/commit`).
- Stop and escalate rather than improvising destructive fixes on production.
