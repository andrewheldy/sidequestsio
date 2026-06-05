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

interface MapboxFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    mapbox_id?: string;
    feature_type?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
  };
}

interface MapboxResponse {
  features?: MapboxFeature[];
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

const DELAY_MS = 300;

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

function determineConfidence(
  feature: MapboxFeature,
  businessName: string,
  address: string,
): 'high' | 'medium' | 'low' {
  const featureType = feature.properties?.feature_type ?? '';
  const name = feature.properties?.name ?? '';
  const fullAddress =
    feature.properties?.full_address ??
    feature.properties?.place_formatted ??
    '';

  // Broad/generic result → low
  if (BROAD_FEATURE_TYPES.has(featureType)) return 'low';

  const fullAddressLower = fullAddress.toLowerCase();

  // Not in Miami metro → low
  const isInMiami = MIAMI_AREA_CITIES.some(city =>
    fullAddressLower.includes(city),
  );
  if (!isInMiami) return 'low';

  // Business name or address words appear in result → high
  const nameLower = name.toLowerCase();
  const bizWords = significantWords(businessName);
  const addrWords = significantWords(address);

  const nameHit = bizWords.some(
    w => nameLower.includes(w) || fullAddressLower.includes(w),
  );
  const addrHit = addrWords.some(w => fullAddressLower.includes(w));

  return nameHit || addrHit ? 'high' : 'medium';
}

// ── Geocode one location ──────────────────────────────────────────────────

async function geocodeOne(
  businessName: string,
  address: string,
  accessToken: string,
): Promise<{
  lat: number | null;
  lng: number | null;
  placeName: string | null;
  featureType: string | null;
  mapboxId: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
}> {
  const q = `${businessName}, ${address}, Miami, FL, USA`;

  const params = new URLSearchParams({
    q,
    country: 'us',
    limit: '1',
    access_token: accessToken,
    proximity: '-80.1918,25.7617',
    bbox: '-80.35,25.65,-80.10,25.90',
  });

  const url = `https://api.mapbox.com/search/geocode/v6/forward?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as MapboxResponse;
  const features = data.features ?? [];

  if (features.length === 0) {
    return {
      lat: null,
      lng: null,
      placeName: null,
      featureType: null,
      mapboxId: null,
      confidence: null,
    };
  }

  const feature = features[0];
  const [lng, lat] = feature.geometry?.coordinates ?? [null, null];
  const placeName =
    feature.properties?.full_address ??
    feature.properties?.name ??
    null;
  const featureType = feature.properties?.feature_type ?? null;
  const mapboxId = feature.properties?.mapbox_id ?? null;
  const confidence = determineConfidence(feature, businessName, address);

  return { lat: lat ?? null, lng: lng ?? null, placeName, featureType, mapboxId, confidence };
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('Error: MAPBOX_ACCESS_TOKEN environment variable is not set.');
    process.exit(1);
  }

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
