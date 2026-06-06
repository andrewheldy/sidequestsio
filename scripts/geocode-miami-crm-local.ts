#!/usr/bin/env tsx
/**
 * Offline fallback: generates miamiQuestLocations.geocoded.json using a
 * hardcoded coordinate lookup. Run this when the network-dependent
 * geocode-miami-crm.ts script cannot reach external APIs.
 *
 *   npm run geocode:miami:local
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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
  coordinates: { lat: number | null; lng: number | null };
  geocoding: {
    status: 'matched' | 'no_match' | 'error';
    confidence: 'high' | 'medium' | 'low' | null;
    mapboxPlaceName: string | null;
    mapboxFeatureType: string | null;
    mapboxId: string | null;
  };
}

// ── Coordinate lookup ─────────────────────────────────────────────────────
// Keyed by "Business Name". High-confidence entries have street-level coords.
// Neighborhood-centroid entries are marked medium.

type CoordEntry = { lat: number; lng: number; confidence: 'high' | 'medium' };

const COORDS: Record<string, CoordEntry> = {
  'Panther Coffee':                           { lat: 25.8002, lng: -80.1982, confidence: 'high' },
  'Vice City Bean':                           { lat: 25.7888, lng: -80.1952, confidence: 'high' },
  'The Salty Donut':                          { lat: 25.8024, lng: -80.2000, confidence: 'high' },
  'Threefold Cafe':                           { lat: 25.7491, lng: -80.2575, confidence: 'high' },
  'Imperial Moto Café':                       { lat: 25.8022, lng: -80.2028, confidence: 'high' },
  'Honey Veil Co.':                           { lat: 25.8149, lng: -80.1866, confidence: 'medium' },
  'B Bistro + Bakery':                        { lat: 25.7637, lng: -80.1925, confidence: 'high' },
  'Brewing Buddha Café':                      { lat: 25.6654, lng: -80.3298, confidence: 'high' },
  'Sweat Records':                            { lat: 25.8275, lng: -80.1843, confidence: 'high' },
  'Books & Books':                            { lat: 25.7494, lng: -80.2601, confidence: 'high' },
  'Macondo Coffee Roasters':                  { lat: 25.8081, lng: -80.3507, confidence: 'high' },
  'Rosetta Bakery':                           { lat: 25.7839, lng: -80.1305, confidence: 'high' },
  'Walls Caffe':                              { lat: 25.8012, lng: -80.1975, confidence: 'medium' },
  'Boxelder Craft Beer':                      { lat: 25.7763, lng: -80.1944, confidence: 'medium' },
  'Under the Mango Tree':                     { lat: 25.7712, lng: -80.1355, confidence: 'high' },
  'Dasher & Crank':                           { lat: 25.7988, lng: -80.1982, confidence: 'high' },
  'All Day':                                  { lat: 25.7874, lng: -80.1952, confidence: 'high' },
  'Small Tea':                                { lat: 25.7496, lng: -80.2591, confidence: 'high' },
  'Morelia Gourmet Paletas':                  { lat: 25.7618, lng: -80.1909, confidence: 'high' },
  'Midorie Miami':                            { lat: 25.7283, lng: -80.2381, confidence: 'medium' },
  'The Corner':                               { lat: 25.7877, lng: -80.1949, confidence: 'high' },
  'Miam Café':                                { lat: 25.8057, lng: -80.2001, confidence: 'high' },
  'El Carajo':                                { lat: 25.7619, lng: -80.2178, confidence: 'high' },
  'The Salty Donut (SB)':                     { lat: 25.7854, lng: -80.1303, confidence: 'medium' },
  'Pasion del Cielo':                         { lat: 25.7616, lng: -80.1935, confidence: 'medium' },
  'Wynwood Walls':                            { lat: 25.8048, lng: -80.1987, confidence: 'high' },
  'PAMM (Pérez Art Museum)':                  { lat: 25.7845, lng: -80.1862, confidence: 'high' },
  'ICA Miami':                                { lat: 25.8155, lng: -80.1883, confidence: 'high' },
  'Bachour':                                  { lat: 25.7496, lng: -80.2583, confidence: 'high' },
  'The Temple House':                         { lat: 25.7840, lng: -80.1320, confidence: 'medium' },
  'Faena Hotel (The Golden Myth)':            { lat: 25.7907, lng: -80.1278, confidence: 'medium' },
  'E11EVEN':                                  { lat: 25.7799, lng: -80.1939, confidence: 'high' },
  'Swan':                                     { lat: 25.8148, lng: -80.1893, confidence: 'high' },
  'Sugar (East Hotel)':                       { lat: 25.7608, lng: -80.1909, confidence: 'high' },
  'Lagniappe':                                { lat: 25.8094, lng: -80.1882, confidence: 'high' },
  "Dante's HiFi":                             { lat: 25.8019, lng: -80.1916, confidence: 'high' },
  'Superblue Miami':                          { lat: 25.8018, lng: -80.2118, confidence: 'high' },
  'The Standard Spa':                         { lat: 25.7766, lng: -80.1450, confidence: 'high' },
  'Vizcaya Museum & Gardens':                 { lat: 25.7443, lng: -80.2064, confidence: 'high' },
  'Frost Science Museum':                     { lat: 25.7841, lng: -80.1862, confidence: 'high' },
  'Komodo':                                   { lat: 25.7608, lng: -80.1912, confidence: 'high' },
  'Joia Beach':                               { lat: 25.7890, lng: -80.1671, confidence: 'medium' },
  'Sexy Fish':                                { lat: 25.7601, lng: -80.1978, confidence: 'high' },
  'Astra':                                    { lat: 25.8010, lng: -80.1995, confidence: 'medium' },
  'Mandolin Aegean Bistro':                   { lat: 25.8170, lng: -80.1882, confidence: 'high' },
  'The Bass Museum':                          { lat: 25.7938, lng: -80.1310, confidence: 'medium' },
  'Ball & Chain':                             { lat: 25.7695, lng: -80.2225, confidence: 'high' },
  'Mila':                                     { lat: 25.7860, lng: -80.1310, confidence: 'medium' },
  'Rubell Museum':                            { lat: 25.8020, lng: -80.2130, confidence: 'medium' },
  'Chimi @ The Oasis':                        { lat: 25.8002, lng: -80.1978, confidence: 'medium' },
  'Brickell City Centre':                     { lat: 25.7637, lng: -80.1937, confidence: 'high' },
  'Lincoln Road Mall':                        { lat: 25.7900, lng: -80.1390, confidence: 'high' },
  'Bayside Marketplace':                      { lat: 25.7763, lng: -80.1863, confidence: 'high' },
  'The Oasis Wynwood':                        { lat: 25.8005, lng: -80.1980, confidence: 'medium' },
  'Time Out Market':                          { lat: 25.7900, lng: -80.1350, confidence: 'medium' },
  '1-800-LUCKY':                              { lat: 25.8002, lng: -80.1993, confidence: 'medium' },
  'Midtown Miami Shops':                      { lat: 25.8094, lng: -80.1900, confidence: 'medium' },
  'Mary Brickell Village':                    { lat: 25.7617, lng: -80.1927, confidence: 'medium' },
  'Bayfront Park':                            { lat: 25.7763, lng: -80.1863, confidence: 'high' },
  'Lummus Park':                              { lat: 25.7880, lng: -80.1302, confidence: 'high' },
  'Miami Design District Plaza':              { lat: 25.8149, lng: -80.1886, confidence: 'medium' },
  'Miami Worldcenter':                        { lat: 25.7802, lng: -80.1939, confidence: 'medium' },
  'South Pointe Park Pier':                   { lat: 25.7639, lng: -80.1370, confidence: 'high' },
  'Miracle Mile':                             { lat: 25.7494, lng: -80.2591, confidence: 'medium' },
  'Kaseya Center Plaza':                      { lat: 25.7812, lng: -80.1957, confidence: 'medium' },
  'Jungle Island':                            { lat: 25.7874, lng: -80.1668, confidence: 'high' },
  'The Wharf Miami':                          { lat: 25.7706, lng: -80.1990, confidence: 'medium' },
  'Brickell Key Park':                        { lat: 25.7637, lng: -80.1880, confidence: 'medium' },
  'Giralda Plaza':                            { lat: 25.7494, lng: -80.2575, confidence: 'medium' },
  'Jungle Plaza':                             { lat: 25.8149, lng: -80.1876, confidence: 'medium' },
  'Citizens MiamiCentral':                    { lat: 25.7802, lng: -80.1939, confidence: 'medium' },
  'Museum Park (Maurice Ferré)':              { lat: 25.7845, lng: -80.1862, confidence: 'medium' },
  'Española Way':                             { lat: 25.7876, lng: -80.1365, confidence: 'high' },
  'Regatta Harbour':                          { lat: 25.7258, lng: -80.2370, confidence: 'medium' },
  'Government Center Station':               { lat: 25.7763, lng: -80.1975, confidence: 'medium' },
  'Tea Room (EAST Miami)':                    { lat: 25.7610, lng: -80.1912, confidence: 'medium' },
  'The Kampong':                              { lat: 25.7283, lng: -80.2395, confidence: 'medium' },
  'Swizzle Rum Bar & Drinkery':              { lat: 25.7873, lng: -80.1375, confidence: 'medium' },
  'Supercar Rooms Miami':                     { lat: 25.8010, lng: -80.1985, confidence: 'medium' },
  'Dale Zine':                                { lat: 25.8360, lng: -80.1943, confidence: 'medium' },
  "Naomi's Garden":                           { lat: 25.8272, lng: -80.1975, confidence: 'medium' },
  'Broken Shaker':                            { lat: 25.7863, lng: -80.1378, confidence: 'medium' },
  "Mac's Club Deuce":                         { lat: 25.7820, lng: -80.1392, confidence: 'medium' },
  'Warehouse 44':                             { lat: 25.8010, lng: -80.1978, confidence: 'medium' },
  'Plant the Future':                         { lat: 25.8149, lng: -80.1876, confidence: 'medium' },
  'The Moore Building (Elastika)':            { lat: 25.8143, lng: -80.1880, confidence: 'medium' },
  'Under the Ground Records':                 { lat: 25.8094, lng: -80.1882, confidence: 'medium' },
  'Coral Gables Congregational Church':       { lat: 25.7491, lng: -80.2583, confidence: 'medium' },
  'El Espacio 23':                            { lat: 25.8018, lng: -80.2188, confidence: 'medium' },
  'Mid Beach Boardwalk (Secret Section)':     { lat: 25.8180, lng: -80.1270, confidence: 'medium' },
  'Over Under':                               { lat: 25.7763, lng: -80.1960, confidence: 'medium' },
  'Lost Boy & Co.':                           { lat: 25.7763, lng: -80.1956, confidence: 'medium' },
  'Books & Books (Arsht Center)':             { lat: 25.7845, lng: -80.1873, confidence: 'medium' },
  'The Standard Mudroom':                     { lat: 25.7766, lng: -80.1450, confidence: 'medium' },
  'Fairchild Tropical Botanic Garden':        { lat: 25.7068, lng: -80.2756, confidence: 'high' },
  'Bodega Speakeasy':                         { lat: 25.7873, lng: -80.1365, confidence: 'medium' },
  'Wynwood Garage Rooftop':                   { lat: 25.8010, lng: -80.1980, confidence: 'medium' },
  'Miami River Walk (Hidden Trail)':          { lat: 25.7706, lng: -80.1987, confidence: 'medium' },
  'Assembly Concept Space':                   { lat: 25.8094, lng: -80.1890, confidence: 'medium' },
  'Margot Natural Wine Bar':                  { lat: 25.7763, lng: -80.1950, confidence: 'medium' },
  'Concrete Beach Brewery':                   { lat: 25.8010, lng: -80.2010, confidence: 'medium' },
  'Wynwood Brewing Company':                  { lat: 25.7991, lng: -80.2016, confidence: 'medium' },
  'J. Wakefield Brewing':                     { lat: 25.7985, lng: -80.2013, confidence: 'medium' },
  'Veza Sur Brewing Co.':                     { lat: 25.7984, lng: -80.2008, confidence: 'medium' },
  'Gramps Bar':                               { lat: 25.8009, lng: -80.1979, confidence: 'medium' },
  'Coyo Taco':                                { lat: 25.8007, lng: -80.1997, confidence: 'medium' },
  'KYU':                                      { lat: 25.8010, lng: -80.1985, confidence: 'medium' },
  'Bakan':                                    { lat: 25.8006, lng: -80.1993, confidence: 'medium' },
  'R House Wynwood':                          { lat: 25.8012, lng: -80.1980, confidence: 'medium' },
  'Beaker & Gray':                            { lat: 25.8002, lng: -80.1982, confidence: 'medium' },
  'Versailles Restaurant':                    { lat: 25.7631, lng: -80.2340, confidence: 'high' },
  'Azucar Ice Cream Company':                 { lat: 25.7693, lng: -80.2225, confidence: 'high' },
  'Cubaocho Museum & Performing Arts':        { lat: 25.7693, lng: -80.2178, confidence: 'medium' },
  'Domino Park (Máximo Gómez Park)':          { lat: 25.7693, lng: -80.2200, confidence: 'medium' },
  'Tower Theater':                            { lat: 25.7694, lng: -80.2183, confidence: 'medium' },
  'The Anderson':                             { lat: 25.8406, lng: -80.1870, confidence: 'medium' },
  'Phuc Yea':                                 { lat: 25.8396, lng: -80.1873, confidence: 'medium' },
  'Mignonette':                               { lat: 25.7940, lng: -80.1896, confidence: 'medium' },
  'Cake Thai':                                { lat: 25.7953, lng: -80.1963, confidence: 'medium' },
  'Boia De':                                  { lat: 25.8170, lng: -80.1890, confidence: 'medium' },
  'Glass & Vine':                             { lat: 25.7292, lng: -80.2375, confidence: 'medium' },
  'Greenstreet Cafe':                         { lat: 25.7283, lng: -80.2395, confidence: 'medium' },
  "Atchana's Homegrown Thai":                 { lat: 25.7295, lng: -80.2377, confidence: 'medium' },
  'Lulu in the Grove':                        { lat: 25.7290, lng: -80.2385, confidence: 'medium' },
  "Monty's Coconut Grove":                    { lat: 25.7258, lng: -80.2388, confidence: 'medium' },
  'Bulla Gastrobar':                          { lat: 25.7491, lng: -80.2588, confidence: 'medium' },
  'Caja Caliente':                            { lat: 25.7488, lng: -80.2591, confidence: 'medium' },
  'Coral Gables Museum':                      { lat: 25.7494, lng: -80.2561, confidence: 'medium' },
  'Coral Gables Art Cinema':                  { lat: 25.7494, lng: -80.2591, confidence: 'medium' },
  "Joe's Stone Crab":                         { lat: 25.7636, lng: -80.1402, confidence: 'medium' },
  'Wolfsonian-FIU':                           { lat: 25.7829, lng: -80.1362, confidence: 'medium' },
  'World Erotic Art Museum (WEAM)':           { lat: 25.7893, lng: -80.1371, confidence: 'medium' },
  'Jewish Museum of Florida–FIU':             { lat: 25.7740, lng: -80.1362, confidence: 'medium' },
  'News Cafe':                                { lat: 25.7827, lng: -80.1304, confidence: 'medium' },
  'Sweet Liberty Drinks & Supply Co.':        { lat: 25.7876, lng: -80.1382, confidence: 'medium' },
  'Locust Projects':                          { lat: 25.8360, lng: -80.1953, confidence: 'medium' },
  'The Bakehouse Art Complex':                { lat: 25.8002, lng: -80.1993, confidence: 'medium' },
  'Mana Wynwood':                             { lat: 25.8012, lng: -80.2016, confidence: 'medium' },
  'The Citadel':                              { lat: 25.8360, lng: -80.1960, confidence: 'medium' },
  'Wynwood Marketplace':                      { lat: 25.8002, lng: -80.1989, confidence: 'medium' },
  'The Webster':                              { lat: 25.8149, lng: -80.1886, confidence: 'medium' },
  'OTL Café':                                 { lat: 25.8143, lng: -80.1890, confidence: 'medium' },
  'Estefan Kitchen Express':                  { lat: 25.8149, lng: -80.1876, confidence: 'medium' },
  'Pubbelly Sushi':                           { lat: 25.7610, lng: -80.1912, confidence: 'medium' },
  'La Mar by Gastón Acurio':                  { lat: 25.7618, lng: -80.1909, confidence: 'medium' },
  'Pinecrest Gardens':                        { lat: 25.6667, lng: -80.3040, confidence: 'high' },
  'Matheson Hammock Park & Atoll Pool':       { lat: 25.6906, lng: -80.2756, confidence: 'high' },
  'The Underline':                            { lat: 25.7616, lng: -80.1927, confidence: 'medium' },
  'Margaret Pace Park':                       { lat: 25.7940, lng: -80.1862, confidence: 'high' },
  'Deering Estate':                           { lat: 25.6073, lng: -80.2828, confidence: 'high' },
};

async function main(): Promise<void> {
  const inputPath = path.join(ROOT, 'src/data/miami/miamiQuestLocations.json');
  const outputPath = path.join(ROOT, 'src/data/miami/miamiQuestLocations.geocoded.json');
  const reportPath = path.join(ROOT, 'src/data/miami/miamiQuestLocations.geocoding-report.json');

  const rawData: CRMRow[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const total = rawData.length;

  console.log(`\nGeocoding ${total} Miami CRM locations (local lookup)...\n`);

  const results: GeocodedRow[] = [];
  let matched = 0;
  let noMatch = 0;

  for (const row of rawData) {
    const name = row['Business Name'];
    const coord = COORDS[name];

    if (coord) {
      matched++;
      results.push({
        ...row,
        coordinates: { lat: coord.lat, lng: coord.lng },
        geocoding: {
          status: 'matched',
          confidence: coord.confidence,
          mapboxPlaceName: `${name}, ${row['Address / Mapbox Coordinates']}`,
          mapboxFeatureType: 'local-lookup',
          mapboxId: null,
        },
      });
      process.stdout.write(`✓ ${name.padEnd(45)} ${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)} [${coord.confidence}]\n`);
    } else {
      noMatch++;
      results.push({
        ...row,
        coordinates: { lat: null, lng: null },
        geocoding: {
          status: 'no_match',
          confidence: null,
          mapboxPlaceName: null,
          mapboxFeatureType: null,
          mapboxId: null,
        },
      });
      process.stdout.write(`✗ ${name} — not in lookup table\n`);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

  const reportRows = results.filter(
    r => r.geocoding.status === 'no_match' || r.geocoding.confidence === 'low',
  );
  fs.writeFileSync(reportPath, JSON.stringify(reportRows, null, 2), 'utf-8');

  const line = '─'.repeat(50);
  console.log(`\n${line}`);
  console.log(`Total rows:   ${total}`);
  console.log(`Matched:      ${matched}`);
  console.log(`No match:     ${noMatch}`);
  console.log(`${line}`);
  console.log(`\nGeocoded output:  ${outputPath}`);
  console.log(`Geocoding report: ${reportPath}\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
