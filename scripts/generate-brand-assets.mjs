/**
 * Regenerates the shipped brand rasters in `public/` from the vector sources in
 * `brand/`. Run it whenever a logo source changes:
 *
 *   node scripts/generate-brand-assets.mjs
 *
 * Rendering goes through the Chromium that Playwright installs (see
 * scripts/brand/chromium.mjs) — no extra npm dependency. Point CHROMIUM_BIN at
 * a Chrome/Chromium binary if it lives somewhere unusual.
 *
 * Outputs, all committed because the browser fetches them as static files:
 *   favicon.ico · favicon.svg · favicon-16.png · favicon-32.png · mask-icon.svg
 *   apple-touch-icon.png · icon-192.png · icon-512.png · icon-maskable-512.png
 *   og-image.png
 *
 * It also re-exports the brand-kit PNGs in `brand/` from their SVG siblings, so
 * the kit can't drift from the vectors the way it did before.
 */
import {
  mkdirSync, mkdtempSync, copyFileSync, readFileSync, writeFileSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChromium } from './brand/chromium.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const work = mkdtempSync(join(tmpdir(), 'sq-brand-'));
const rel = (p) => p.replace(`${root}/`, '');

/** The OG headline needs Manrope/Inter; the wordmark itself is vector artwork. */
const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Inter:wght@400;600;700&display=swap';

/**
 * The brand-kit PNG exports and the sizes they ship at. Each one sits next to
 * the SVG it comes from; see brand/assets/export-list.md.
 */
const KIT_EXPORTS = [
  ['brand/social/open-graph-template', 1200, 630],
  ['brand/social/twitter-template', 1600, 900],
  ['brand/social/social-avatar', 1080, 1080],
  ['brand/assets/presentation-cover', 1920, 1080],
  ['brand/assets/app-splash', 1290, 2796],
  ['brand/assets/partner-badge', 720, 240],
  ['brand/assets/email-header', 1200, 360],
];

/** Renders an SVG at an exact width×height (the icons are square; kit art isn't). */
async function renderSvgBox(browser, svgPath, out, width, height) {
  const page = join(work, `kit-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(page, `<!doctype html><meta charset="utf-8">
<style>*{margin:0;padding:0}html,body{width:${width}px;height:${height}px;background:transparent}
img{width:${width}px;height:${height}px;display:block}</style>
<img src="file://${svgPath}" alt="">`);
  const png = await browser.shot(`file://${page}`, { width, height, transparent: true, settleMs: 200 });
  writeFileSync(out, png);
  console.log(`  ✓ ${rel(out)} (${width}×${height})`);
}

/** Renders an SVG at an exact pixel size on a transparent canvas. */
async function renderSvg(browser, svgPath, out, size) {
  const page = join(work, `icon-${size}.html`);
  writeFileSync(page, `<!doctype html><meta charset="utf-8">
<style>*{margin:0;padding:0}html,body{width:${size}px;height:${size}px;background:transparent}
img{width:${size}px;height:${size}px;display:block}</style>
<img src="file://${svgPath}" alt="">`);
  const png = await browser.shot(`file://${page}`, { width: size, height: size, transparent: true, settleMs: 150 });
  writeFileSync(out, png);
  console.log(`  ✓ ${rel(out)} (${size}×${size})`);
}

/** Minimal ICO writer — each entry is a whole PNG, which every current browser reads. */
function writeIco(images, out) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);            // type: icon
  header.writeUInt16LE(images.length, 4);

  const dir = Buffer.alloc(16 * images.length);
  let offset = header.length + dir.length;
  images.forEach(({ size, data }, i) => {
    const e = i * 16;
    dir[e] = size >= 256 ? 0 : size;     // width  (0 means 256)
    dir[e + 1] = size >= 256 ? 0 : size; // height
    dir.writeUInt16LE(1, e + 4);         // colour planes
    dir.writeUInt16LE(32, e + 6);        // bits per pixel
    dir.writeUInt32LE(data.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });

  writeFileSync(out, Buffer.concat([header, dir, ...images.map((i) => i.data)]));
  console.log(`  ✓ ${rel(out)} (${images.map((i) => i.size).join(', ')})`);
}

/** Inlines the latin subsets so the OG render is deterministic. */
async function buildFontCss() {
  const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
  const css = await (await fetch(FONT_CSS_URL, { headers: { 'User-Agent': ua } })).text();
  const out = [];
  for (const [, face] of css.matchAll(/@font-face\s*\{(.*?)\}/gs)) {
    if (!face.includes('U+0000-00FF')) continue; // latin only keeps this small
    const family = /font-family:\s*'([^']+)'/.exec(face)[1];
    const weight = /font-weight:\s*([^;]+);/.exec(face)[1].trim();
    const url = /url\((https:\/\/[^)]+)\)/.exec(face)[1];
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    out.push(
      `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};` +
      `font-display:block;src:url(data:font/woff2;base64,${buf.toString('base64')}) format('woff2');}`,
    );
  }
  if (!out.length) throw new Error('Could not fetch brand webfonts — is the network reachable?');
  writeFileSync(join(work, 'fonts.css'), out.join('\n'));
}

async function main() {
  mkdirSync(publicDir, { recursive: true });
  const browser = await launchChromium();

  try {
    console.log('Icons — brand/logos/app-icon.svg');
    const appIcon = join(root, 'brand/logos/app-icon.svg');
    const maskable = join(root, 'brand/logos/app-icon-maskable.svg');

    await renderSvg(browser, appIcon, join(publicDir, 'favicon-16.png'), 16);
    await renderSvg(browser, appIcon, join(publicDir, 'favicon-32.png'), 32);
    await renderSvg(browser, appIcon, join(publicDir, 'apple-touch-icon.png'), 180);
    await renderSvg(browser, appIcon, join(publicDir, 'icon-192.png'), 192);
    await renderSvg(browser, appIcon, join(publicDir, 'icon-512.png'), 512);
    await renderSvg(browser, maskable, join(publicDir, 'icon-maskable-512.png'), 512);

    const ico48 = join(work, 'ico-48.png');
    await renderSvg(browser, appIcon, ico48, 48);
    writeIco(
      [
        { size: 16, data: readFileSync(join(publicDir, 'favicon-16.png')) },
        { size: 32, data: readFileSync(join(publicDir, 'favicon-32.png')) },
        { size: 48, data: readFileSync(ico48) },
      ],
      join(publicDir, 'favicon.ico'),
    );

    // Vector icons ship as-is: modern browsers prefer the SVG favicon, and
    // Safari's pinned tab needs the flat silhouette.
    for (const [src, dest] of [
      ['brand/logos/app-icon.svg', 'favicon.svg'],
      ['brand/logos/mask-icon.svg', 'mask-icon.svg'],
    ]) {
      copyFileSync(join(root, src), join(publicDir, dest));
      console.log(`  ✓ public/${dest} (vector)`);
    }

    console.log('\nOpen Graph card — scripts/brand/og-image.html');
    await buildFontCss();
    copyFileSync(join(root, 'scripts/brand/og-image.html'), join(work, 'og-image.html'));
    copyFileSync(join(root, 'brand/logos/logo-reverse.svg'), join(work, 'logo-reverse.svg'));
    copyFileSync(join(root, 'brand/mockups/photography-hero-reference.png'), join(work, 'doorway.png'));
    const og = await browser.shot(`file://${join(work, 'og-image.html')}`, { width: 1200, height: 630, settleMs: 600 });
    writeFileSync(join(publicDir, 'og-image.png'), og);
    console.log('  ✓ public/og-image.png (1200×630)');

    console.log('\nBrand-kit PNG exports');
    for (const [base, width, height] of KIT_EXPORTS) {
      await renderSvgBox(browser, join(root, `${base}.svg`), join(root, `${base}.png`), width, height);
    }
  } finally {
    browser.close();
    rmSync(work, { recursive: true, force: true });
  }

  console.log('\nDone.');
}

main().catch((err) => {
  rmSync(work, { recursive: true, force: true });
  console.error(err);
  process.exit(1);
});
