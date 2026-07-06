/**
 * smoke-supabase.ts — anon-client production smoke test.
 *
 * Exercises the exact read paths the SPA depends on, using only the public
 * anon key (no auth, no writes — the one RPC called, get_leaderboard, is a
 * read). Run it before/after applying migrations and after every deploy:
 *
 *   npm run smoke:supabase
 *
 * Credentials come from VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in the
 * environment or from ./.env (simple KEY=VALUE lines; never committed).
 * Exits non-zero if any check fails, so it can gate CI/deploy steps.
 */

import { readFileSync } from "node:fs";

// --- env -------------------------------------------------------------------

function loadDotEnv(path = ".env"): Record<string, string> {
  try {
    const out: Record<string, string> = {};
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const dotenv = loadDotEnv();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? dotenv.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? dotenv.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (set in env or .env).",
  );
  process.exit(2);
}

const HEADERS = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  "Content-Type": "application/json",
};

// --- checks ------------------------------------------------------------------

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

async function rest(path: string, init?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...HEADERS, ...(init?.headers ?? {}) },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, body };
}

function rows(body: unknown): unknown[] {
  return Array.isArray(body) ? body : [];
}

async function run(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    results.push({ name, pass, detail });

  // 1. Active quest discovery — the core catalog read (QuestBrowser/Explore).
  {
    const r = await rest("quests?select=id,title,status&status=eq.active&limit=20");
    const n = rows(r.body).length;
    add("anon reads active quests", r.status === 200 && n > 0, `HTTP ${r.status}, ${n} rows`);
  }

  // 2. Quest detail join shape (QuestDetail: quest + partner + venue).
  {
    const r = await rest("quests?select=id,title,partner:partners(name),venue:venues(name,latitude,longitude)&limit=1");
    add("anon reads quest→partner/venue join", r.status === 200 && rows(r.body).length > 0, `HTTP ${r.status}`);
  }

  // 3. QR resolution (/scan/:code) — resolve a real seeded code.
  {
    const one = await rest("qr_codes?select=code&limit=1");
    const code = (rows(one.body)[0] as { code?: string } | undefined)?.code;
    if (!code) {
      add("anon resolves QR code", false, `HTTP ${one.status}, no qr_codes readable`);
    } else {
      const r = await rest(`qr_codes?select=id,code,quest_id&code=eq.${encodeURIComponent(code)}`);
      add("anon resolves QR code", r.status === 200 && rows(r.body).length === 1, `HTTP ${r.status}, code=${code}`);
    }
  }

  // 4. Rewards discovery.
  {
    const r = await rest("rewards?select=id,title&limit=5");
    add("anon reads rewards", r.status === 200, `HTTP ${r.status}, ${rows(r.body).length} rows`);
  }

  // 5. Community notes view (quest detail + notes surfaces).
  {
    const r = await rest("community_notes_with_author?select=id&limit=1");
    add("anon reads notes-with-author view", r.status === 200, `HTTP ${r.status}`);
  }

  // 6. Leaderboard RPC (read-only aggregate over points_ledger).
  {
    const r = await rest("rpc/get_leaderboard", {
      method: "POST",
      body: JSON.stringify({ p_scope: "global", p_scope_id: null, p_period: "all_time", p_limit: 5 }),
    });
    add("anon calls get_leaderboard RPC", r.status === 200, `HTTP ${r.status}`);
  }

  // 7. Public profiles view (may legitimately be empty — all profiles opt-in).
  {
    const r = await rest("public_profiles?select=username&limit=1");
    add("anon reads public_profiles view", r.status === 200, `HTTP ${r.status}, ${rows(r.body).length} rows`);
  }

  // 8. Least-privilege spot check — ledger must NOT be anon-readable.
  {
    const r = await rest("points_ledger?select=id&limit=1");
    add("anon blocked from points_ledger", r.status !== 200, `HTTP ${r.status} (non-200 expected)`);
  }

  return results;
}

// --- report -------------------------------------------------------------------

const results = await run();
const width = Math.max(...results.map((r) => r.name.length));
console.log(`\nSupabase anon smoke — ${SUPABASE_URL}\n`);
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name.padEnd(width)}  ${r.detail}`);
}
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed\n`);
process.exit(failed.length === 0 ? 0 : 1);
