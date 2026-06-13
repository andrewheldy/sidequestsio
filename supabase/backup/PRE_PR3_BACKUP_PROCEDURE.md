# Pre-PR#3 Backup Procedure — SideQuests.io

> **Why this exists.** The Phase 0 Reality Report came back **NO-GO**, blocked
> *solely* by **Stop condition S6**: the project is on **Supabase Free** with
> **no scheduled backups and no PITR**. The safety contract forbids running any
> write-bearing PR (#2 additive schema, #3 backfill, #4 trigger/view) without a
> verified restore point — even though the dataset is tiny (6 users, empty
> ledger). This procedure produces that restore point and **clears S6**.
>
> **Scope of this change:** documentation + read-only helper SQL only. Nothing
> here connects to, or writes to, the database. You run the steps manually.

---

## 0. What you are backing up

The 15 identity/gameplay-critical tables **+ `auth.users`** (the identity root),
in parent-first order:

`auth.users` → `users` → `partners` → `venues` → `quests` → `qr_codes` →
`user_profiles` → `privacy_preferences` → `profiles` → `rewards` →
`scan_events` → `quest_completions` → `points_ledger` → `reward_redemptions` →
`community_notes` → `note_reports`

Helper files in this folder:
- `export_identity_tables.sql` — read-only export (psql `\copy` **or** SQL-Editor
  `SELECT *` + Download CSV).
- `verify_backup_exports.sql` — read-only fingerprint (row counts + checksums) +
  referential sanity.
- `RESTORE_PROCEDURE.md` — how to put the data back (documented, **not**
  auto-runnable).

> ⚠ **Sensitive data.** `auth.users` holds password hashes/tokens; `profiles`/
> `users` hold emails & PII. Treat every export as a secret (see §6).

---

## 1. Choose a method (do BOTH 1A and 1B for belt-and-suspenders)

At 6 users this is trivial; capture two independent copies.

### 1A. Full logical dump (GOLD STANDARD — do this first)

A single self-contained file that can rebuild everything. Run from **your
machine** (requires the DB connection string from
**Dashboard → Project Settings → Database → Connection string → URI**; use the
**session/direct** connection, not the pooler, for `pg_dump`).

Pick ONE of:

```sh
# (i) Supabase CLI — schema + data of the public schema
supabase db dump --db-url "<CONNECTION_STRING>" -f backup/sidequests_full_pre_pr3.sql --data-only=false

# (ii) pg_dump — data-only, just the tables we care about (smallest, cleanest
#      for a row-level restore). --column-inserts makes restore order-tolerant.
pg_dump "<CONNECTION_STRING>" \
  --data-only --column-inserts --no-owner --no-privileges \
  -t auth.users \
  -t public.users -t public.partners -t public.venues -t public.quests \
  -t public.qr_codes -t public.user_profiles -t public.privacy_preferences \
  -t public.profiles -t public.rewards -t public.scan_events \
  -t public.quest_completions -t public.points_ledger \
  -t public.reward_redemptions -t public.community_notes -t public.note_reports \
  -f backup/sidequests_data_pre_pr3.sql

# (iii) pg_dump — full custom-format snapshot (schema+data, best for whole-DB DR)
pg_dump "<CONNECTION_STRING>" -Fc --no-owner --no-privileges \
  -f backup/sidequests_pre_pr3.dump
```

> These commands are **documented for you to run** — this task does **not**
> execute them. `pg_dump`/`supabase db dump` are read-only on the source DB.
> `auth.users` export requires a privileged connection (service/`postgres`
> role); if `-t auth.users` is denied, capture it via 1B step 01 instead.

### 1B. CSV-per-table (independent, GUI/editor-friendly)

Two equivalent ways — use either:

**Editor route (no tooling):** open `export_identity_tables.sql` in the Supabase
**SQL Editor**, run each `SELECT *` **one at a time**, and click **Download CSV**
for each (the editor only returns the last result if you run the whole file).

**psql route:** un-comment the `\copy` block at the top of
`export_identity_tables.sql` and run:
```sh
mkdir -p backup
psql "<CONNECTION_STRING>" -f supabase/backup/export_identity_tables.sql
```

**Dashboard Table Editor route (per table):**
1. Dashboard → **Table Editor** → select schema `public` → pick the table.
2. Top-right **⋯ / Export** → **Export to CSV** → save as `backup/<table>.csv`.
3. Repeat for all 15 public tables.
4. `auth.users` is **not** in the Table Editor — capture it via the SQL-Editor
   `SELECT * from auth.users` (statement 01) → Download CSV.

---

## 2. CSV export checklist

Tick every file as you capture it (`backup/<name>.csv`):

- [ ] `auth_users.csv`  *(sensitive)*
- [ ] `users.csv`
- [ ] `partners.csv`
- [ ] `venues.csv`
- [ ] `quests.csv`
- [ ] `qr_codes.csv`
- [ ] `user_profiles.csv`
- [ ] `privacy_preferences.csv`
- [ ] `profiles.csv`
- [ ] `rewards.csv`
- [ ] `scan_events.csv`
- [ ] `quest_completions.csv`
- [ ] `points_ledger.csv`  *(expected: 0 data rows — header only)*
- [ ] `reward_redemptions.csv`
- [ ] `community_notes.csv`
- [ ] `note_reports.csv`
- [ ] At least one **1A full dump** file also captured.

Every CSV must have a **header row**. An empty table = header line only (that is
correct, e.g. `points_ledger`).

---

## 3. Verification checklist (do not skip)

1. [ ] Run `verify_backup_exports.sql` **SECTION 1** in the SQL Editor. Save the
   result (the fingerprint table) into the **Fingerprint** block below.
2. [ ] For each table, confirm **`row_count` == CSV data rows** (CSV lines − 1
   header). At 6 users this is eyeball-checkable.
3. [ ] Run **SECTION 3** (referential sanity). Confirm it matches the Reality
   Report expectation: `auth_without_profiles = 1`, **all others = 0**. Anything
   else ⇒ STOP and investigate before relying on the backup.
4. [ ] Confirm the **1A dump file** is non-empty and contains the expected
   `INSERT`/`COPY` blocks for each table (open it; at this size it's readable).
5. [ ] **Rehearse the restore** on a throwaway target (a scratch Supabase project
   or a local Postgres) per `RESTORE_PROCEDURE.md` §"Dry run", then re-run
   `verify_backup_exports.sql` SECTION 1 there and confirm **every
   `content_md5` matches** the source fingerprint. A backup you have never
   restored is not a backup.

### Fingerprint (paste SECTION 1 output here on the day of backup)
```
table_name                  | row_count | content_md5
----------------------------+-----------+-------------------------------------
auth.users                  | <fill>    | <fill>
public.users                | <fill>    | <fill>
public.partners             | <fill>    | <fill>
public.venues               | <fill>    | <fill>
public.quests               | <fill>    | <fill>
public.qr_codes             | <fill>    | <fill>
public.user_profiles        | <fill>    | <fill>
public.privacy_preferences  | <fill>    | <fill>
public.profiles             | <fill>    | <fill>
public.rewards              | <fill>    | <fill>
public.scan_events          | <fill>    | <fill>
public.quest_completions    | <fill>    | <fill>
public.points_ledger        | 0         | <fill>
public.reward_redemptions   | <fill>    | <fill>
public.community_notes      | <fill>    | <fill>
public.note_reports         | <fill>    | <fill>
```
Backup taken (UTC): `<fill>` · by: `<fill>` · stored at: `<fill, see §6>`

---

## 4. Go / No-Go criteria (this is what clears S6)

Flip Phase 0 to **GO** only when **all** are true:

- [ ] **G1** — A **1A full dump** exists AND the **16 CSVs** (§2) exist.
- [ ] **G2** — Verification §3 steps 1–4 pass (counts match; referential sanity
  as expected; dump readable).
- [ ] **G3** — A **restore dry-run** succeeded on a throwaway target and its
  fingerprint **matches** the source (§3 step 5).
- [ ] **G4** — Exports are stored **encrypted and off-Supabase**, in ≥1 location,
  and **not** committed to git (§6).
- [ ] **G5** — `RESTORE_PROCEDURE.md` has been read by whoever will run PR #3, so
  the rollback path is understood *before* the forward change.
- [ ] **G6** — (Optional but recommended) the **D2 sub-decision** is recorded:
  what to do with the lone 100-XP `rentwithheldy` value (default: canonical 0 /
  ledger-as-truth). This isn't a backup gate, but PR #3 needs it.

**When G1–G5 are checked:** S6 → cleared, Reality Report **D8 = ✅, D9 = ✅**,
verdict flips to **GO**, and the next step is **PR #2 (additive schema)**.

> **Re-take the backup immediately before PR #3 runs**, not just now. A backup is
> only a restore point for the state at capture time; if any data changes between
> now and the migration, refresh the dump + fingerprint first.

---

## 5. Recommended sequence at a glance

1. Capture 1A dump → 2. Capture 16 CSVs → 3. Run verification SECTION 1 + 3 and
record the fingerprint → 4. Store encrypted off-Supabase → 5. Rehearse restore on
a scratch target and match fingerprints → 6. Tick G1–G5 → 7. Proceed to PR #2,
then **re-dump right before PR #3**.

---

## 6. Where to store the exports (and where NOT to)

- ✅ A private, encrypted location: password manager vault, an encrypted disk
  image, or a **private** object store. Keep at least two copies.
- ✅ Record the storage location + date in §3 above.
- ❌ **Never** commit dumps/CSVs to this repo or any git history — they contain
  password hashes and PII. This `supabase/backup/` directory is for **scripts
  only**.
- 🔒 Recommended guard: add these lines to the repo `.gitignore` so a stray dump
  can't be committed (do this as a separate, reviewed change — it is **not** part
  of this read-only deliverable):
  ```
  supabase/backup/*.csv
  supabase/backup/*.dump
  supabase/backup/*.sql.gz
  supabase/backup/sidequests_*pre_pr3*.sql
  ```
  (The two tracked helper scripts — `export_identity_tables.sql`,
  `verify_backup_exports.sql` — are deliberately **not** matched by those
  patterns.)

---

## 7. Safety contract (restated)

- `export_identity_tables.sql` → read-only (SELECT / client-side `\copy` only).
- `verify_backup_exports.sql` → read-only (SELECT only).
- `RESTORE_PROCEDURE.md` → **documentation**; contains destructive steps that are
  clearly labelled and **cannot run by accident** (it is Markdown, not a runnable
  script).
- Nothing in this folder modifies schema, migrations, app code, RLS, functions,
  or triggers.
