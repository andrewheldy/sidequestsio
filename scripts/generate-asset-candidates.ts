/**
 * generate-asset-candidates.ts — asset gap manifest → human-reviewable
 * sourcing sheet for launch hero images and venue logos.
 *
 * Reads the asset manifest (quest_assets.csv) and the CRM workbook
 * (miami-crm.csv), and writes asset_candidates.csv: one row per
 * (missing asset × permission-safe sourcing lead). It is deliberately
 * OFFLINE — it never touches Supabase, never fetches a URL, and never
 * downloads an image. Every image decision is made by a human reviewer.
 *
 * Source leads emitted, in preference order:
 *   official_website   — the venue's own site (URL verified in the workbook)
 *   official_instagram — the venue's own Instagram (URL verified in the workbook)
 *   royalty_free       — stock-photo search fallback, HERO IMAGES ONLY
 *                        (a venue logo must come from the venue itself)
 *   needs_manual_source — emitted only when an asset has no lead at all,
 *                        so the gap is visible in the sheet
 *
 * rights_status vocabulary:
 *   venue_owned_needs_permission — the venue owns the image; record their
 *                                  permission during partner onboarding
 *   license_review_required      — royalty-free candidates; verify the
 *                                  individual photo's license before use
 *   unknown                      — needs_manual_source rows
 *
 * Review workflow (docs/CRM_IMPORT_RUNBOOK.md § 10):
 *   for each quest_id + asset_type pick ONE winning row, paste the exact
 *   image URL into candidate_image_url, set approved=yes. Nothing consumes
 *   this file automatically.
 *
 * Usage:
 *   npm run assets:candidates                # Miami defaults (below)
 *   npx tsx scripts/generate-asset-candidates.ts \
 *     data/generated/miami/quest_assets.csv \
 *     data/generated/miami/miami-crm.csv \
 *     --out data/generated/miami/asset_candidates.csv
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// --- tiny RFC-4180 CSV parser (same as scripts/import-crm.ts) -----------------

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function toRecords(rows: string[][]): Array<Record<string, string>> {
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((cells) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => { rec[h] = (cells[i] ?? "").trim(); });
    return rec;
  });
}

// --- CSV emission ---------------------------------------------------------------

const csvField = (v: string) =>
  /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
const csvLine = (cells: string[]) => cells.map(csvField).join(",");

// --- candidate sheet ---------------------------------------------------------------

const HEADER = [
  "quest_id",
  "venue_name",
  "asset_type",
  "candidate_image_url", // human fills: the exact image URL chosen
  "source_url",
  "source_type",
  "rights_status",
  "confidence",
  "notes",
  "approved", // human sets "yes" on exactly one winning row per asset
] as const;

interface Candidate {
  questId: string;
  venueName: string;
  assetType: string;
  sourceUrl: string;
  sourceType: string;
  rightsStatus: string;
  confidence: string;
  notes: string;
}

function candidatesForAsset(
  asset: Record<string, string>,
  crm: Record<string, string>,
): Candidate[] {
  const questId = asset.quest_id;
  const assetType = asset.asset_type;
  const venueName = crm.location_name || crm.business_name; // importer's venue-name rule
  const spec = asset.spec ? `Spec: ${asset.spec}.` : "";
  const out: Candidate[] = [];

  if (crm.website_url) {
    out.push({
      questId, venueName, assetType,
      sourceUrl: crm.website_url,
      sourceType: "official_website",
      rightsStatus: "venue_owned_needs_permission",
      confidence: "high",
      notes:
        assetType === "venue_logo"
          ? `Look for the site's logo/brand or press/media page; ask the venue for the original file. ${spec}`.trim()
          : `Pick an authentic photo from the venue's own site (check for a press/media page first). ${spec}`.trim(),
    });
  }

  if (crm.instagram_url) {
    out.push({
      questId, venueName, assetType,
      sourceUrl: crm.instagram_url,
      sourceType: "official_instagram",
      rightsStatus: "venue_owned_needs_permission",
      confidence: "high",
      notes:
        assetType === "venue_logo"
          ? `Profile picture is usually the logo — ask the venue for the original file, do not screenshot. ${spec}`.trim()
          : `Venue's official Instagram — ask the venue for the original file, do not screenshot. ${spec}`.trim(),
    });
  }

  // Royalty-free fallback: hero images only. A logo is the venue's identity
  // and can only legitimately come from the venue.
  if (assetType === "hero_image") {
    const query = encodeURIComponent(`${venueName} miami`);
    out.push({
      questId, venueName, assetType,
      sourceUrl: `https://unsplash.com/s/photos/${query}`,
      sourceType: "royalty_free",
      rightsStatus: "license_review_required",
      confidence: "low",
      notes:
        `Fallback only if no venue-owned option works. Also try Pexels/Wikimedia Commons. ` +
        `Verify the individual photo's license allows commercial use before approving. ${spec}`.trim(),
    });
  }

  if (out.length === 0) {
    out.push({
      questId, venueName, assetType,
      sourceUrl: "",
      sourceType: "needs_manual_source",
      rightsStatus: "unknown",
      confidence: "low",
      notes: `No official source in the workbook — contact the venue directly. ${spec}`.trim(),
    });
  }

  return out;
}

// --- main ------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf("--out");
  const outPath = outIdx !== -1 ? args[outIdx + 1] : "data/generated/miami/asset_candidates.csv";
  if (outIdx !== -1 && !outPath) {
    console.error("--out requires an output path");
    process.exit(2);
  }
  const positional = args.filter((a, i) => !a.startsWith("--") && i !== outIdx + 1);
  const assetsPath = positional[0] ?? "data/generated/miami/quest_assets.csv";
  const crmPath = positional[1] ?? "data/generated/miami/miami-crm.csv";

  const assets = toRecords(parseCsv(readFileSync(resolve(assetsPath), "utf8")));
  const crmRows = toRecords(parseCsv(readFileSync(resolve(crmPath), "utf8")));
  const crmBySlug = new Map(crmRows.map((r) => [r.slug, r]));

  const errors: string[] = [];
  const lines: string[] = [csvLine([...HEADER])];
  const counts = new Map<string, number>();

  for (const asset of assets) {
    const crm = crmBySlug.get(asset.quest_slug);
    if (!crm) {
      errors.push(`asset row for "${asset.quest_slug}" has no matching slug in ${crmPath}`);
      continue;
    }
    for (const c of candidatesForAsset(asset, crm)) {
      counts.set(c.sourceType, (counts.get(c.sourceType) ?? 0) + 1);
      lines.push(csvLine([
        c.questId, c.venueName, c.assetType,
        "", // candidate_image_url — human fills
        c.sourceUrl, c.sourceType, c.rightsStatus, c.confidence, c.notes,
        "", // approved — human fills
      ]));
    }
  }

  if (errors.length > 0) {
    console.error(`✗ ${errors.length} join error(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    console.error("Nothing was written.");
    process.exit(1);
  }

  writeFileSync(resolve(outPath), lines.join("\n") + "\n");

  console.log(`\n✓ ${lines.length - 1} candidate row(s) for ${assets.length} missing asset(s) → ${outPath}`);
  for (const [type, n] of [...counts.entries()].sort()) console.log(`    ${type}: ${n}`);
  console.log(
    "\nNext (all manual, see docs/CRM_IMPORT_RUNBOOK.md § 10):\n" +
    "  1. Review the sheet; per quest_id + asset_type set approved=yes on ONE row\n" +
    "     and paste the chosen image URL into candidate_image_url.\n" +
    "  2. Upload approved files to Supabase Storage (user-run; no bucket exists yet).\n" +
    "  3. Heroes → miami-crm.csv hero_image_url + re-run import:crm;\n" +
    "     logos → import:quests with quest_id,profile_image_url.\n",
  );
}

main();
