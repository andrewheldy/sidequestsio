#!/usr/bin/env tsx
/**
 * One-time geocoding script for the Miami CRM JSON.
 * Run with: npm run geocode:miami
 * Requires: MAPBOX_ACCESS_TOKEN environment variable
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Types ──────────────────────────────────────────────────────────────────

interface CRMRow {
  'Business Name': string;
  Neighborhood: string;
  'Address / Mapbox Coordinates': string;
  'Quest Name': string;
  'Suggested Quest Concept': string;
  'Suggested Reward': string;
  'Thumbnail Image URL': string;
}

interface GeocodedRow extends CRMRow {
  coordinates: {
    lat: number | null;
    lng: number | null;
  };
  geocoding: {
    status: 'matched' | 'no_match' | 'error';
    confidence: 'high' | 'medium' | 'low' | null;
    mapboxPlaceName: string | null;
    mapboxFeatureType: string | null;
    mapboxId: string | null;
  };
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  /** e.g. "amenity", "shop", "tourism", "leisure" */
  class: string;
  /** e.g. "cafe", "restaurant", "museum", "neighbourhood" */
  type: string;
  place_id: number;
}

// ── Constants ─────────────────────────────────────────────────────────────

const MIAMI_AREA_CITIES = [
  'miami',
  'miami beach',
  'coral gables',
  'doral',
  'pinecrest',
  'cutler bay',
  'hialeah',
  'key biscayne',
  'coconut grove',
  'brickell',
  'wynwood',
  'little havana',
  'little haiti',
  'allapattah',
  'edgewater',
  'south beach',
];

const BROAD_FEATURE_TYPES = new Set([
  'neighborhood',
  'locality',
  'district',
  'place',
  'region',
  'country',
]);

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this',
  'miami', 'florida', 'fl', 'usa', 'st', 'ave', 'blvd',
  'dr', 'rd', 'nw', 'ne', 'sw', 'se', 'north', 'south',
  'east', 'west',
]);

// Nominatim policy: max 1 request/second
const DELAY_MS = 1100;

// ── Helpers ───────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
}

const BROAD_OSM_TYPES = new Set([
  'neighbourhood', 'suburb', 'quarter', 'city', 'town',
  'village', 'county', 'state', 'country', 'administrative',
]);

function determineConfidence(
  result: NominatimResult,
  businessName: string,
  address: string,
): 'high' | 'medium' | 'low' {
  const displayName = result.display_name.toLowerCase();
  const osmType = result.type;

  // Broad/generic result → low
  if (BROAD_OSM_TYPES.has(osmType) || BROAD_FEATURE_TYPES.has(osmType)) return 'low';

  // Not in Miami metro → low
  const isInMiami = MIAMI_AREA_CITIES.some(city => displayName.includes(city));
  if (!isInMiami) return 'low';

  // Business name or address words appear in display name → high
  const bizWords = significantWords(businessName);
  const addrWords = significantWords(address);

  const nameHit = bizWords.some(w => displayName.includes(w));
  const addrHit = addrWords.some(w => displayName.includes(w));

  return nameHit || addrHit ? 'high' : 'medium';
}

// ── Geocode one location via Nominatim (OpenStreetMap) ───────────────────

async function geocodeOne(
  businessName: string,
  address: string,
  _accessToken: string,
): Promise<{
  lat: number | null;
  lng: number | null;
  placeName: string | null;
  featureType: string | null;
  mapboxId: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
}> {
  const q = `${businessName}, ${address}, Miami, FL, USA`;

  // Nominatim (OpenStreetMap) — no token required, no URL restrictions.
  // viewbox: left(minLon),top(maxLat),right(maxLon),bottom(minLat)
  const params = new URLSearchParams({
    q,
    format: 'json',
    limit: '1',
    countrycodes: 'us',
    bounded: '1',
    viewbox: '-80.35,25.90,-80.10,25.65',
  });

  const url = `https://nominatim.openstreetmap.org/search?${params}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SideQuests-geocoder/1.0' },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const results = (await response.json()) as NominatimResult[];

  if (results.length === 0) {
    return {
      lat: null,
      lng: null,
      placeName: null,
      featureType: null,
      mapboxId: null,
      confidence: null,
    };
  }

  const result = results[0];
  const lat = parseFloat(result.lat);
  const lng = parseFloat(result.lon);
  const placeName = result.display_name;
  const featureType = `${result.class}/${result.type}`;
  const mapboxId = String(result.place_id);
  const confidence = determineConfidence(result, businessName, address);

  return { lat, lng, placeName, featureType, mapboxId, confidence };
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Token kept for future Mapbox usage; geocoding currently uses Nominatim.
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN ?? '';

  const inputPath = path.join(ROOT, 'src/data/miami/miamiQuestLocations.json');
  const outputPath = path.join(ROOT, 'src/data/miami/miamiQuestLocations.geocoded.json');
  const reportPath = path.join(ROOT, 'src/data/miami/miamiQuestLocations.geocoding-report.json');

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found:\n  ${inputPath}`);
    process.exit(1);
  }

  const rawData: CRMRow[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const total = rawData.length;

  console.log(`\nGeocoding ${total} Miami CRM locations...\n`);

  const results: GeocodedRow[] = [];
  let matched = 0;
  let noMatch = 0;
  let errors = 0;

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const businessName = row['Business Name'];
    const address = row['Address / Mapbox Coordinates'];

    const prefix = `[${String(i + 1).padStart(3)}/${total}]`;
    const label = businessName.length > 38
      ? businessName.slice(0, 36) + '..'
      : businessName;

    process.stdout.write(`${prefix} ${label.padEnd(40)} `);

    let geocodedRow: GeocodedRow;

    try {
      const result = await geocodeOne(businessName, address, accessToken);

      if (result.lat !== null && result.lng !== null) {
        matched++;
        process.stdout.write(
          `✓ ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)} [${result.confidence}]\n`,
        );
        geocodedRow = {
          ...row,
          coordinates: { lat: result.lat, lng: result.lng },
          geocoding: {
            status: 'matched',
            confidence: result.confidence,
            mapboxPlaceName: result.placeName,
            mapboxFeatureType: result.featureType,
            mapboxId: result.mapboxId,
          },
        };
      } else {
        noMatch++;
        process.stdout.write('✗ no match\n');
        geocodedRow = {
          ...row,
          coordinates: { lat: null, lng: null },
          geocoding: {
            status: 'no_match',
            confidence: null,
            mapboxPlaceName: null,
            mapboxFeatureType: null,
            mapboxId: null,
          },
        };
      }
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      process.stdout.write(`! error: ${msg}\n`);
      geocodedRow = {
        ...row,
        coordinates: { lat: null, lng: null },
        geocoding: {
          status: 'error',
          confidence: null,
          mapboxPlaceName: null,
          mapboxFeatureType: null,
          mapboxId: null,
        },
      };
    }

    results.push(geocodedRow);

    if (i < rawData.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // ── Write outputs ────────────────────────────────────────────────────────

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

  const reportRows = results.filter(
    r =>
      r.geocoding.status === 'no_match' ||
      r.geocoding.status === 'error' ||
      r.geocoding.confidence === 'low',
  );
  fs.writeFileSync(reportPath, JSON.stringify(reportRows, null, 2), 'utf-8');

  // ── Summary ──────────────────────────────────────────────────────────────

  const line = '─'.repeat(50);
  console.log(`\n${line}`);
  console.log(`Total rows:       ${total}`);
  console.log(`Matched:          ${matched}`);
  console.log(`No match:         ${noMatch}`);
  console.log(`Errors:           ${errors}`);
  console.log(
    `Report items:     ${reportRows.length}  (no_match + low confidence + errors)`,
  );
  console.log(`${line}`);
  console.log(`\nGeocoded output:  ${outputPath}`);
  console.log(`Geocoding report: ${reportPath}\n`);
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
