#!/usr/bin/env npx tsx
/**
 * scripts/import-crm.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Imports src/data/miami/miamiQuestLocations.geocoded.json into Supabase.
 *
 * Each CRM row produces 5 database rows:
 *   partners → venues → quests → qr_codes → rewards
 * UUIDs are deterministic (index-based) so the script is idempotent.
 *
 * USAGE
 *   npx tsx scripts/import-crm.ts --dry-run          # preview; no writes
 *   npx tsx scripts/import-crm.ts --import           # insert to Supabase
 *   npx tsx scripts/import-crm.ts --sql              # print SQL to stdout
 *   npx tsx scripts/import-crm.ts --mapping          # print JSON mapping
 *
 * ENV (required for --import)
 *   SUPABASE_URL              your project URL (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY service-role key (bypasses RLS for seeding)
 *
 * The env vars are read from .env.local if dotenv is available, otherwise
 * from process.env directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CRMRow {
  'Business Name': string;
  Neighborhood: string;
  'Address / Mapbox Coordinates': string;
  'Quest Name': string;
  'Suggested Quest Concept': string;
  'Suggested Reward': string;
  'Thumbnail Image URL': string;
  coordinates?: { lat: number | null; lng: number | null };
  geocoding?: {
    status: 'matched' | 'no_match' | 'error';
    confidence: 'high' | 'medium' | 'low' | null;
  };
}

type QuestCategory = 'art' | 'food' | 'outdoors' | 'culture' | 'nightlife' | 'shopping' | 'fitness' | 'hidden_gem';
type Difficulty = 'easy' | 'medium' | 'hard';
type PartnerType = 'venue' | 'brand' | 'event' | 'nonprofit' | 'other';

interface ImportedRow {
  index: number;
  businessName: string;
  neighborhood: string;
  address: string | null;
  city: string;
  lat: number;
  lng: number;
  questName: string;
  concept: string;
  rewardText: string;
  imageUrl: string | null;
  category: QuestCategory;
  difficulty: Difficulty;
  partnerType: PartnerType;
  xpReward: number;
  pointsReward: number;
  qrCode: string;
  // IDs
  partnerId: string;
  venueId: string;
  questId: string;
  qrId: string;
  rewardId: string;
}

interface ValidationError {
  index: number;
  businessName: string;
  errors: string[];
}

// ── UUID helpers ──────────────────────────────────────────────────────────────

// UUID ranges reserved for CRM import:
//   Partners  70000000-0000-0000-0000-NNNNNNNNNNNN
//   Venues    80000000-0000-0000-0000-NNNNNNNNNNNN
//   Quests    90000000-0000-0000-0000-NNNNNNNNNNNN
//   QR codes  a0000000-0000-0000-0000-NNNNNNNNNNNN
//   Rewards   b0000000-0000-0000-0000-NNNNNNNNNNNN

function crmUuid(prefix: string, index: number): string {
  const n = String(index + 1).padStart(12, '0');
  return `${prefix}-0000-0000-0000-${n}`;
}

const P = (i: number) => crmUuid('70000000', i);  // partner
const V = (i: number) => crmUuid('80000000', i);  // venue
const Q = (i: number) => crmUuid('90000000', i);  // quest
const QR = (i: number) => crmUuid('a0000000', i); // qr_code
const R = (i: number) => crmUuid('b0000000', i);  // reward

// ── Address normalization ─────────────────────────────────────────────────────

function parseAddress(raw: string): { address: string | null; city: string } {
  const trimmed = raw.trim();

  // A proper street address starts with one or more digits then a space.
  if (/^\d+\s/.test(trimmed)) {
    // "123 Main St, City, FL 33XXX"  →  city is the part before "FL"
    const m = trimmed.match(/,\s*([A-Za-z][^,]+?)\s*,\s*FL/);
    return {
      address: trimmed,
      city: m ? m[1].trim() : 'Miami',
    };
  }

  // Neighborhood-level address: "BusinessName, Neighborhood, City, FL"
  // Split on commas, find "FL" segment, city is the token before it.
  const parts = trimmed.split(',').map(s => s.trim());
  const flIdx = parts.findIndex(p => /^FL(\s|$)/.test(p));
  if (flIdx > 0) {
    let city = parts[flIdx - 1] ?? 'Miami';
    // Normalise composite neighborhoods: "Edgewater / Wynwood" → "Miami"
    if (/\/|→/.test(city)) city = 'Miami';
    // Strip parenthetical qualifiers: "Coral Gables (south edge)" → "Coral Gables"
    city = city.replace(/\s*\(.*\)\s*$/, '').trim();
    // Map known neighborhoods that are sub-areas of Miami proper
    const MiamiNeighborhoods = new Set([
      'Wynwood', 'Edgewater', 'Midtown', 'Allapattah', 'Brickell',
      'Downtown', 'Little Havana', 'Little Haiti', 'Little River',
      'Design District', 'Buena Vista', 'South Beach', 'MiMo',
      'Watson Island', 'Mid Beach', 'Pinecrest', 'South Miami',
      'Cutler Bay',
    ]);
    if (MiamiNeighborhoods.has(city)) city = 'Miami';
    if (city === 'Coconut Grove' || city === 'South Coconut Grove') city = 'Miami';
    if (!city) city = 'Miami';
    return { address: null, city };
  }

  return { address: null, city: 'Miami' };
}

// ── Category inference (mirrors toQuest.ts) ───────────────────────────────────

function inferCategory(questName: string): QuestCategory {
  const CATEGORY_MAP: Record<string, QuestCategory> = {
    Foodie: 'food',
    Culture: 'culture',
    Nightlife: 'nightlife',
    'Hidden Gems': 'hidden_gem',
    Wellness: 'fitness',
    Outdoor: 'outdoors',
    Community: 'culture',
  };

  function appCategory(name: string): string {
    if (/caffeine chronicles|sweet tooth|taco quest/i.test(name)) return 'Foodie';
    if (/brews & views/i.test(name)) {
      if (/vizcaya|museum|garden/i.test(name)) return 'Culture';
      if (/tea room|la mar/i.test(name)) return 'Foodie';
      return 'Nightlife';
    }
    if (/literary escape|vinyl vibes|retro treasures/i.test(name)) return 'Culture';

    const place = name.replace(/^discover\s+/i, '').toLowerCase();

    if (/park|garden|trail|beach|boardwalk|hammock|river walk|underline|brickell key|south pointe|margaret pace|jungle island|kampong|fairchild|matheson|bayfront|lummus/i.test(place))
      return 'Outdoor';
    if (/museum|art complex|gallery|theater|cinema|church|wolfsonian|bass |rubell|cubaocho|pamm|ica miami|superblue|el espacio|bakehouse|locust project|zine|moore building|española way|tower theater|coral gables museum|jewish museum|world erotic/i.test(place))
      return 'Culture';
    if (/brewing|brewery|shaker|rum bar|e11even|club deuce|mac's|broken shaker|wakefield|veza sur|swizzle|over under|mana wynwood|wynwood garage/i.test(place))
      return 'Nightlife';
    if (/sugar \(|swan|komodo|sexy fish|astra|mila|joia|versailles|azucar|ice cream|phuc|mignonette|cake thai|boia de|glass & vine|greenstreet cafe|atchana|lulu|monty's|bulla|caja|news cafe|stone crab|pubbelly|estefan|otl caf|coyo|kyu|bakan|time out market|chimi|b bistro|walls caffe|rosetta bakery|under the mango|all day|miam caf|el carajo|morelia/i.test(place))
      return 'Foodie';
    if (/standard spa|wellness/i.test(place)) return 'Wellness';
    if (/mall|marketplace|citadel|bayside|brickell city centre|midtown miami|worldcenter|miracle mile|kaseya|miamicentral|giralda|government center|regatta|wynwood marketplace|the webster/i.test(place))
      return 'Community';

    return 'Hidden Gems';
  }

  return CATEGORY_MAP[appCategory(questName)] ?? 'hidden_gem';
}

// ── XP / points per category ──────────────────────────────────────────────────

const XP_BY_CATEGORY: Record<QuestCategory, number> = {
  food: 100,
  culture: 130,
  nightlife: 120,
  hidden_gem: 110,
  fitness: 110,
  outdoors: 115,
  art: 130,
  shopping: 100,
};

function xpFor(cat: QuestCategory): number {
  return XP_BY_CATEGORY[cat] ?? 100;
}

// ── Other helpers ─────────────────────────────────────────────────────────────

function inferDifficulty(confidence: string | null | undefined): Difficulty {
  if (confidence === 'high') return 'easy';
  if (confidence === 'medium') return 'medium';
  return 'easy';
}

function inferPartnerType(category: QuestCategory): PartnerType {
  if (['fitness', 'outdoors'].includes(category)) return 'venue';
  return 'venue'; // default; update after contract signing
}

function cleanImageUrl(raw: string): string | null {
  if (!raw || raw.startsWith('[Insert') || raw.startsWith('[insert')) return null;
  if (raw.startsWith('http')) return raw;
  return null;
}

function makeQRCode(businessName: string, index: number): string {
  const slug = businessName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X');
  return `${slug}${String(index + 1).padStart(4, '0')}`;
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(row: CRMRow, index: number): string[] {
  const errors: string[] = [];
  if (!row['Business Name']?.trim()) errors.push('missing Business Name');
  if (!row['Quest Name']?.trim()) errors.push('missing Quest Name');
  if (!row['Suggested Quest Concept']?.trim()) errors.push('missing Suggested Quest Concept');
  if (!row['Suggested Reward']?.trim()) errors.push('missing Suggested Reward');
  if (row.coordinates?.lat == null) errors.push('missing latitude');
  if (row.coordinates?.lng == null) errors.push('missing longitude');
  if (row['Suggested Quest Concept']?.length > 1000) errors.push('Concept exceeds 1000 chars');
  return errors;
}

// ── Transform ─────────────────────────────────────────────────────────────────

function transform(row: CRMRow, index: number): ImportedRow {
  const { address, city } = parseAddress(row['Address / Mapbox Coordinates'] ?? '');
  const category = inferCategory(row['Quest Name']);
  const xpReward = xpFor(category);

  return {
    index,
    businessName: row['Business Name'].trim(),
    neighborhood: row.Neighborhood.trim(),
    address,
    city,
    lat: row.coordinates!.lat as number,
    lng: row.coordinates!.lng as number,
    questName: row['Quest Name'].trim(),
    concept: row['Suggested Quest Concept'].trim(),
    rewardText: row['Suggested Reward'].trim(),
    imageUrl: cleanImageUrl(row['Thumbnail Image URL'] ?? ''),
    category,
    difficulty: inferDifficulty(row.geocoding?.confidence),
    partnerType: inferPartnerType(category),
    xpReward,
    pointsReward: xpReward * 2,
    qrCode: makeQRCode(row['Business Name'], index),
    partnerId: P(index),
    venueId: V(index),
    questId: Q(index),
    qrId: QR(index),
    rewardId: R(index),
  };
}

// ── SQL generator ─────────────────────────────────────────────────────────────

function sql(s: string | null): string {
  if (s === null || s === undefined) return 'NULL';
  return `'${s.replace(/'/g, "''")}'`;
}

function generateSQL(rows: ImportedRow[]): string {
  const ts = new Date().toISOString();
  const lines: string[] = [
    '-- ==========================================================================',
    `-- SideQuests.io — CRM import (generated ${ts})`,
    '-- Run in Supabase SQL Editor or with psql.',
    '-- Idempotent: all inserts use ON CONFLICT DO NOTHING.',
    '-- ==========================================================================',
    '',
    'BEGIN;',
    '',
    '-- ── Partners ──────────────────────────────────────────────────────────────',
    'INSERT INTO public.partners (id, name, type, contact_email, status, created_at) VALUES',
  ];

  // partners
  lines.push(
    rows
      .map(r =>
        `  (${sql(r.partnerId)}::uuid, ${sql(r.businessName)}, ${sql(r.partnerType)}::partner_type, '', 'active', '2024-01-20T00:00:00Z')`
      )
      .join(',\n') + '\nON CONFLICT (id) DO NOTHING;',
  );
  lines.push('');

  // venues
  lines.push('-- ── Venues ───────────────────────────────────────────────────────────────');
  lines.push('INSERT INTO public.venues (id, partner_id, name, address, city, latitude, longitude, status) VALUES');
  lines.push(
    rows
      .map(r =>
        `  (${sql(r.venueId)}::uuid, ${sql(r.partnerId)}::uuid, ${sql(r.businessName)}, ${sql(r.address)}, ${sql(r.city)}, ${r.lat}, ${r.lng}, 'active')`
      )
      .join(',\n') + '\nON CONFLICT (id) DO NOTHING;',
  );
  lines.push('');

  // quests
  lines.push('-- ── Quests ───────────────────────────────────────────────────────────────');
  lines.push('INSERT INTO public.quests (id, partner_id, venue_id, title, description, category, difficulty, xp_reward, points_reward, status, verification_type, image_url, created_at) VALUES');
  lines.push(
    rows
      .map(r =>
        `  (${sql(r.questId)}::uuid, ${sql(r.partnerId)}::uuid, ${sql(r.venueId)}::uuid, ${sql(r.questName)}, ${sql(r.concept)}, ${sql(r.category)}::quest_category, ${sql(r.difficulty)}::difficulty, ${r.xpReward}, ${r.pointsReward}, 'active', 'qr'::verification_type, ${sql(r.imageUrl)}, '2024-01-20T00:00:00Z')`
      )
      .join(',\n') + '\nON CONFLICT (id) DO NOTHING;',
  );
  lines.push('');

  // qr_codes
  lines.push('-- ── QR Codes ─────────────────────────────────────────────────────────────');
  lines.push('INSERT INTO public.qr_codes (id, quest_id, venue_id, partner_id, code, destination_url, status, created_at) VALUES');
  lines.push(
    rows
      .map(r =>
        `  (${sql(r.qrId)}::uuid, ${sql(r.questId)}::uuid, ${sql(r.venueId)}::uuid, ${sql(r.partnerId)}::uuid, ${sql(r.qrCode)}, ${sql('/q/' + r.questId)}, 'active', '2024-01-20T00:00:00Z')`
      )
      .join(',\n') + '\nON CONFLICT (id) DO NOTHING;',
  );
  lines.push('');

  // rewards
  lines.push('-- ── Rewards ──────────────────────────────────────────────────────────────');
  lines.push('INSERT INTO public.rewards (id, partner_id, title, description, points_cost, status) VALUES');
  lines.push(
    rows
      .map(r =>
        `  (${sql(r.rewardId)}::uuid, ${sql(r.partnerId)}::uuid, ${sql(r.rewardText.slice(0, 120))}, ${sql(r.rewardText)}, ${r.pointsReward}, 'active')`
      )
      .join(',\n') + '\nON CONFLICT (id) DO NOTHING;',
  );
  lines.push('');
  lines.push('COMMIT;');
  lines.push('');
  lines.push(`-- ${rows.length} partners, venues, quests, QR codes, rewards inserted.`);

  return lines.join('\n');
}

// ── Dry-run summary ───────────────────────────────────────────────────────────

function printDryRun(rows: ImportedRow[], errors: ValidationError[]): void {
  const categoryCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});

  const neighborhoods = [...new Set(rows.map(r => r.neighborhood))].sort();
  const noAddressCount = rows.filter(r => r.address === null).length;
  const noImageCount = rows.filter(r => r.imageUrl === null).length;

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  SideQuests CRM Import — Dry Run Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\n  Total records  : ${rows.length}`);
  console.log(`  Validation errors: ${errors.length}`);
  console.log(`\n  Records per entity:`);
  console.log(`    partners   : ${rows.length}`);
  console.log(`    venues     : ${rows.length}`);
  console.log(`    quests     : ${rows.length}`);
  console.log(`    qr_codes   : ${rows.length}`);
  console.log(`    rewards    : ${rows.length}`);
  console.log(`\n  Category breakdown:`);
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, n]) => console.log(`    ${cat.padEnd(12)} : ${n}`));
  console.log(`\n  Address quality:`);
  console.log(`    Full street address : ${rows.length - noAddressCount}`);
  console.log(`    Neighborhood-only   : ${noAddressCount} (address stored as NULL)`);
  console.log(`\n  Image URLs:`);
  console.log(`    Real URLs  : ${rows.length - noImageCount}`);
  console.log(`    NULL (placeholder) : ${noImageCount}`);
  console.log(`\n  Neighborhoods covered (${neighborhoods.length}):`);
  neighborhoods.forEach(n => console.log(`    • ${n}`));

  if (errors.length > 0) {
    console.log('\n  ⚠ Validation errors:');
    errors.forEach(e =>
      console.log(`    [${e.index}] ${e.businessName}: ${e.errors.join(', ')}`)
    );
  }

  console.log('\n  Sample first 3 rows:');
  rows.slice(0, 3).forEach(r => {
    console.log(`\n    [${r.index}] ${r.businessName}`);
    console.log(`      partner_id : ${r.partnerId}`);
    console.log(`      venue_id   : ${r.venueId}`);
    console.log(`      quest_id   : ${r.questId}`);
    console.log(`      qr_code    : ${r.qrCode}`);
    console.log(`      reward_id  : ${r.rewardId}`);
    console.log(`      category   : ${r.category}`);
    console.log(`      difficulty : ${r.difficulty}`);
    console.log(`      city       : ${r.city}`);
    console.log(`      address    : ${r.address ?? '(neighborhood only)'}`);
    console.log(`      image      : ${r.imageUrl ?? '(none)'}`);
  });

  console.log('\n  Run with --import to write to Supabase.');
  console.log('  Run with --sql to generate SQL for the SQL Editor.\n');
}

// ── Mapping output ────────────────────────────────────────────────────────────

function buildMapping(rows: ImportedRow[]): object {
  const mapping: Record<string, object> = {};
  rows.forEach(r => {
    mapping[r.businessName] = {
      index: r.index + 1,
      neighborhood: r.neighborhood,
      partnerId: r.partnerId,
      venueId: r.venueId,
      questId: r.questId,
      qrId: r.qrId,
      qrCode: r.qrCode,
      rewardId: r.rewardId,
      category: r.category,
      difficulty: r.difficulty,
    };
  });
  return {
    _meta: {
      source: 'src/data/miami/miamiQuestLocations.geocoded.json',
      totalRecords: rows.length,
      uuidRanges: {
        partners: '70000000-0000-0000-0000-000000000001 → 70000000-0000-0000-0000-000000000150',
        venues:   '80000000-0000-0000-0000-000000000001 → 80000000-0000-0000-0000-000000000150',
        quests:   '90000000-0000-0000-0000-000000000001 → 90000000-0000-0000-0000-000000000150',
        qrCodes:  'a0000000-0000-0000-0000-000000000001 → a0000000-0000-0000-0000-000000000150',
        rewards:  'b0000000-0000-0000-0000-000000000001 → b0000000-0000-0000-0000-000000000150',
      },
    },
    businesses: mapping,
  };
}

// ── Supabase import ───────────────────────────────────────────────────────────

async function importToSupabase(rows: ImportedRow[]): Promise<void> {
  // Load env vars — try .env.local first, then process.env
  let url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!url || !key) {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
      lines.forEach(line => {
        const [k, ...rest] = line.split('=');
        const v = rest.join('=').trim().replace(/^["']|["']$/g, '');
        if (k?.trim() === 'SUPABASE_URL' || k?.trim() === 'VITE_SUPABASE_URL') url = url || v;
        if (k?.trim() === 'SUPABASE_SERVICE_ROLE_KEY') key = key || v;
      });
    }
  }

  if (!url) {
    console.error('ERROR: SUPABASE_URL (or VITE_SUPABASE_URL) is not set.');
    process.exit(1);
  }
  if (!key) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set.');
    console.error('  Use the service-role key (not the anon key) to bypass RLS during seeding.');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const BATCH = 50; // insert in batches of 50 to avoid request size limits

  async function batchInsert(table: string, data: object[]): Promise<void> {
    for (let i = 0; i < data.length; i += BATCH) {
      const chunk = data.slice(i, i + BATCH);
      const { error } = await sb.from(table).upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });
      if (error) {
        console.error(`  ✗ ${table} [batch ${Math.floor(i / BATCH) + 1}]: ${error.message}`);
        throw error;
      }
      process.stdout.write('.');
    }
    console.log(` ${table}: ${data.length} rows OK`);
  }

  console.log('\nImporting to Supabase…');

  const partners = rows.map(r => ({
    id: r.partnerId,
    name: r.businessName,
    type: r.partnerType,
    contact_email: '',
    status: 'active',
    created_at: '2024-01-20T00:00:00Z',
  }));

  const venues = rows.map(r => ({
    id: r.venueId,
    partner_id: r.partnerId,
    name: r.businessName,
    address: r.address,
    city: r.city,
    latitude: r.lat,
    longitude: r.lng,
    status: 'active',
  }));

  const quests = rows.map(r => ({
    id: r.questId,
    partner_id: r.partnerId,
    venue_id: r.venueId,
    title: r.questName,
    description: r.concept,
    category: r.category,
    difficulty: r.difficulty,
    xp_reward: r.xpReward,
    points_reward: r.pointsReward,
    status: 'active',
    verification_type: 'qr',
    image_url: r.imageUrl,
    created_at: '2024-01-20T00:00:00Z',
  }));

  const qrCodes = rows.map(r => ({
    id: r.qrId,
    quest_id: r.questId,
    venue_id: r.venueId,
    partner_id: r.partnerId,
    code: r.qrCode,
    destination_url: `/q/${r.questId}`,
    status: 'active',
    created_at: '2024-01-20T00:00:00Z',
  }));

  const rewards = rows.map(r => ({
    id: r.rewardId,
    partner_id: r.partnerId,
    title: r.rewardText.slice(0, 120),
    description: r.rewardText,
    points_cost: r.pointsReward,
    status: 'active',
  }));

  await batchInsert('partners', partners);
  await batchInsert('venues', venues);
  await batchInsert('quests', quests);
  await batchInsert('qr_codes', qrCodes);
  await batchInsert('rewards', rewards);

  console.log(`\n✓ Import complete — ${rows.length * 5} rows written across 5 tables.`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const mode = args.find(a => ['--dry-run', '--import', '--sql', '--mapping'].includes(a)) ?? '--dry-run';

  // Load CRM data
  const CRM_PATH = path.resolve(
    process.cwd(),
    'src/data/miami/miamiQuestLocations.geocoded.json',
  );
  if (!fs.existsSync(CRM_PATH)) {
    console.error(`CRM file not found: ${CRM_PATH}`);
    process.exit(1);
  }

  const raw: CRMRow[] = JSON.parse(fs.readFileSync(CRM_PATH, 'utf-8'));

  // Validate + transform
  const validationErrors: ValidationError[] = [];
  const importedRows: ImportedRow[] = [];

  raw.forEach((row, index) => {
    const errors = validate(row, index);
    if (errors.length > 0) {
      validationErrors.push({ index, businessName: row['Business Name'] ?? `row-${index}`, errors });
    }
    // Skip rows with no coordinates
    if (row.coordinates?.lat == null || row.coordinates?.lng == null) return;
    importedRows.push(transform(row, index));
  });

  switch (mode) {
    case '--dry-run':
      printDryRun(importedRows, validationErrors);
      break;

    case '--sql':
      if (validationErrors.length > 0) {
        process.stderr.write(`Warning: ${validationErrors.length} validation errors (see --dry-run)\n`);
      }
      process.stdout.write(generateSQL(importedRows));
      break;

    case '--mapping':
      process.stdout.write(JSON.stringify(buildMapping(importedRows), null, 2) + '\n');
      break;

    case '--import':
      printDryRun(importedRows, validationErrors);
      if (validationErrors.length > 0) {
        console.error(`Aborting: fix the ${validationErrors.length} validation error(s) first.`);
        process.exit(1);
      }
      await importToSupabase(importedRows);
      break;

    default:
      console.error('Usage: npx tsx scripts/import-crm.ts --dry-run | --import | --sql | --mapping');
      process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
