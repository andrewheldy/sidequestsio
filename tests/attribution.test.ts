// Image attribution tests: the display model, and the Miami Essentials dataset's coverage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { attributionText, readAttribution } from "../src/lib/app/attribution";

const full = {
  creator: "Jane Doe",
  source_url: "https://commons.wikimedia.org/wiki/File:Example.jpg",
  license: "CC BY 2.0",
  license_url: "https://creativecommons.org/licenses/by/2.0",
  source_name: "Wikimedia Commons",
  modified: true,
};

test("readAttribution accepts a complete credit", () => {
  assert.deepEqual(readAttribution(full), full);
});

test("readAttribution rejects incomplete or unsafe credit", () => {
  assert.equal(readAttribution(null), null);
  assert.equal(readAttribution({ ...full, creator: " " }), null);
  assert.equal(readAttribution({ ...full, license: "" }), null);
  assert.equal(readAttribution({ ...full, source_url: "javascript:alert(1)" }), null);
  assert.equal(readAttribution({ ...full, license_url: undefined }), null);
});

test("attributionText names creator, source, license and changes", () => {
  assert.equal(attributionText(full), "Photo: Jane Doe / Wikimedia Commons, CC BY 2.0, cropped");
  assert.equal(
    attributionText({ ...full, source_name: null, modified: false }),
    "Photo: Jane Doe, CC BY 2.0",
  );
});

// Every published CC BY / BY-SA hero in the dataset must carry a complete credit.
const DATASET = "data/generated/miami-essentials/miami-essentials.csv";

test("every attribution-required dataset hero has a complete credit", { skip: !existsSync(DATASET) }, () => {
  const [header, ...rows] = parseCsv(readFileSync(DATASET, "utf8")).filter((r) => r.some((c) => c !== ""));
  const col = (name: string) => header.indexOf(name);
  for (const name of ["image_creator", "image_source_url", "image_license", "image_license_url"]) {
    assert.ok(col(name) !== -1, `dataset is missing column ${name}`);
  }
  let credited = 0;
  for (const row of rows) {
    const license = row[col("image_license")];
    if (!row[col("hero_image_url")] || !/^CC BY/.test(license)) continue;
    const credit = readAttribution({
      creator: row[col("image_creator")],
      source_url: row[col("image_source_url")],
      license,
      license_url: row[col("image_license_url")],
    });
    assert.ok(credit, `${row[col("slug")]}: incomplete credit for ${license}`);
    credited++;
  }
  assert.ok(credited > 0);
});

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}
