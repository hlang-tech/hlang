/**
 * Generate the cover sources for the "Built on hlang" showcase.
 *
 * Every cover is 1200 × 750 (16:10) on the brand surface, so the README table
 * lines up. Screenshots are framed like product shots: rounded corners, a
 * hairline silver edge, and a soft shadow. The AStack cover uses AStack's
 * published mark (`astack-logo.svg`, from astack-tech/astack, assets/brand).
 *
 * Usage (from the repository root): node media/showcase/generate.cjs
 * Then render each SVG at 1200 × 750, at 2x, in a browser to the PNG of the same name.
 */
const fs = require('node:fs');
const path = require('node:path');

const W = 1200;
const H = 750;
const C = { void: '#08090b', surface: '#0f1114', text: '#eef1f6', silver: '#c8ccd4', silverLo: '#7d828c' };
const SANS = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

const svg = (body, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title"><title id="title">${label}</title>${body}</svg>\n`;

const backdrop =
  `<defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${C.silver}" stroke-opacity=".06"/></pattern>` +
  `<radialGradient id="glow" cx=".5" cy=".42" r=".62"><stop stop-color="${C.silver}" stop-opacity=".09"/><stop offset="1" stop-color="${C.silver}" stop-opacity="0"/></radialGradient>` +
  `<filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity=".6"/></filter></defs>` +
  `<rect width="${W}" height="${H}" fill="${C.void}"/><rect width="${W}" height="${H}" fill="url(#grid)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>`;

/**
 * A screenshot framed on the backdrop. The frame takes the screenshot's own
 * aspect ratio and the whole screenshot is shown: nothing is cropped, so no
 * edge of the interface looks cut off.
 */
function framedShot(href, label, imageWidth, imageHeight) {
  const inset = 56;
  const scale = Math.min((W - inset * 2) / imageWidth, (H - inset * 2) / imageHeight);
  const w = Math.round(imageWidth * scale);
  const h = Math.round(imageHeight * scale);
  const x = Math.round((W - w) / 2);
  const y = Math.round((H - h) / 2);
  const rx = 18;
  return svg(
    backdrop +
      `<defs><clipPath id="shot"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/></clipPath></defs>` +
      `<g filter="url(#shadow)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${C.surface}"/></g>` +
      `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" clip-path="url(#shot)"/>` +
      `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${rx}" fill="none" stroke="${C.silver}" stroke-opacity=".28"/>`,
    label,
  );
}

/** AStack: its published mark and lowercase wordmark, centred. */
function astackCover() {
  const source = fs.readFileSync(path.join(__dirname, 'astack-logo.svg'), 'utf8');
  const defs = source.match(/<defs>[\s\S]*?<\/defs>/)?.[0];
  const mark = source.match(/<g fill="url\(#metal\)">[\s\S]*?<\/g>/)?.[0];
  if (defs === undefined || mark === undefined) {
    throw new Error('astack-logo.svg: expected the metal gradient and the mark group');
  }
  const scale = 2.6;
  const markW = 128 * scale;
  const markX = (W - markW) / 2;
  return svg(
    backdrop +
      defs +
      `<g transform="translate(${markX} 150) scale(${scale})">${mark}</g>` +
      `<text x="${W / 2}" y="560" text-anchor="middle" fill="${C.text}" font-family="${SANS}" font-weight="600" font-size="76" letter-spacing="-3">astack</text>` +
      `<text x="${W / 2}" y="612" text-anchor="middle" fill="${C.silverLo}" font-family="${SANS}" font-size="26">Everything is a component.</text>`,
    'AStack, a composable TypeScript framework for AI agents and workflows',
  );
}

const outputs = {
  'chinashop-2020.svg': framedShot('../ui.png', 'A node development tool built on hlang for a retail store operations solution, CHINASHOP 2020', 1680, 1050),
  'prism.svg': framedShot('../prism.png', 'Prism, a node-based tool for image and video creators, built on Lumen', 2000, 1250),
  'astack.svg': astackCover(),
};

for (const [name, data] of Object.entries(outputs)) {
  fs.writeFileSync(path.join(__dirname, name), data);
  console.log(`wrote media/showcase/${name}`);
}
