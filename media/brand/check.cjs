/**
 * Verify that every brand SVG embeds the unmodified mark from media/logo.png.
 *
 * Usage (from the repository root): node media/brand/check.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const logo = fs.readFileSync(path.join(root, 'media/logo.png')).toString('base64');
const href = `href="data:image/png;base64,${logo}"`;

const files = ['readme-banner.svg', 'social-card.svg', 'logo-construction.svg', 'avatar.svg'];
for (const name of files) {
  const svg = fs.readFileSync(path.join(__dirname, name), 'utf8');
  assert.ok(svg.includes(href), `media/brand/${name}: the embedded mark differs from media/logo.png`);
  const embedded = svg.match(/data:image\/png;base64,/g) ?? [];
  assert.equal(embedded.length, 1, `media/brand/${name}: expected exactly one embedded mark`);
}
console.log(`All ${files.length} brand SVGs embed the unmodified media/logo.png.`);
