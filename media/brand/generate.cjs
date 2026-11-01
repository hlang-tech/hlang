/**
 * Generate the hlang brand SVGs from the hand-designed mark in media/logo.png.
 *
 * The mark is a raster original and is never redrawn. Every output embeds the
 * exact bytes of media/logo.png, so all variants stay identical to the source.
 * `check.cjs` verifies that invariant.
 *
 * Usage (from the repository root): node media/brand/generate.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const out = (name) => path.join(__dirname, name);

const LOGO = fs.readFileSync(path.join(root, 'media/logo.png')).toString('base64');
const LOGO_HREF = `data:image/png;base64,${LOGO}`;

// Palette: shared with the Lumen editor tokens (packages/editor-ui/src/tokens/tokens.css).
const C = {
  void: '#08090b',
  surface: '#0f1114',
  text: '#eef1f6',
  silver: '#c8ccd4',
  silverLo: '#7d828c',
  grid: '#c8ccd4',
};
const SANS = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

const svg = (w, h, body, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title"><title id="title">${label}</title>${body}</svg>\n`;

/**
 * The mark presented as an app icon: the unmodified PNG clipped to a rounded
 * square, with a hairline silver edge and a soft shadow. `rx` is 22% of the
 * size, the usual app-icon corner ratio.
 */
const logo = (x, y, size) => {
  const rx = Math.round(size * 0.22);
  return (
    `<defs><clipPath id="mark-clip"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${rx}"/></clipPath>` +
    `<filter id="mark-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="${Math.round(size * 0.04)}" stdDeviation="${Math.round(size * 0.06)}" flood-color="#000" flood-opacity=".55"/></filter></defs>` +
    `<g filter="url(#mark-shadow)"><image x="${x}" y="${y}" width="${size}" height="${size}" href="${LOGO_HREF}" clip-path="url(#mark-clip)"/></g>` +
    `<rect x="${x + 0.5}" y="${y + 0.5}" width="${size - 1}" height="${size - 1}" rx="${rx}" fill="none" stroke="${C.silver}" stroke-opacity=".22"/>`
  );
};

const grid = (w, h) =>
  `<defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${C.grid}" stroke-opacity=".06"/></pattern>` +
  `<radialGradient id="glow" cx=".26" cy=".5" r=".5"><stop stop-color="${C.silver}" stop-opacity=".10"/><stop offset="1" stop-color="${C.silver}" stop-opacity="0"/></radialGradient></defs>` +
  `<rect width="${w}" height="${h}" fill="${C.void}"/><rect width="${w}" height="${h}" fill="url(#grid)"/><rect width="${w}" height="${h}" fill="url(#glow)"/>`;

/**
 * A wide banner: the mark, a wordmark (optionally followed by a package name),
 * a headline, two lines of detail, and a monospace footer.
 */
function banner(w, h, label, content) {
  const mark = Math.round(h * 0.62);
  const mx = Math.round(w * 0.06);
  const my = Math.round((h - mark) / 2);
  const tx = mx + mark + Math.round(w * 0.035);
  const cy = Math.round(h / 2);
  const suffix =
    content.suffix === undefined
      ? ''
      : `<tspan fill="${C.silverLo}" font-weight="300" dx="18">${content.suffix}</tspan>`;
  return svg(
    w,
    h,
    grid(w, h) +
      `<path d="M0 ${h - 1}H${w}" stroke="${C.silver}" stroke-opacity=".22"/>` +
      logo(mx, my, mark) +
      `<text x="${tx}" y="${cy - 58}" fill="${C.text}" font-family="${SANS}" font-weight="600" font-size="56" letter-spacing="-2">hlang${suffix}</text>` +
      `<text x="${tx}" y="${cy + 6}" fill="${C.text}" font-family="${SANS}" font-size="${content.headlineSize ?? 34}" letter-spacing="-1">${content.headline}</text>` +
      `<text x="${tx}" y="${cy + 46}" fill="${C.silverLo}" font-family="${SANS}" font-size="19">${content.lines[0]}</text>` +
      `<text x="${tx}" y="${cy + 74}" fill="${C.silverLo}" font-family="${SANS}" font-size="19">${content.lines[1]}</text>` +
      `<text x="${tx}" y="${h - 54}" fill="${C.silver}" font-family="${MONO}" font-size="14" letter-spacing="1">${content.footer}</text>`,
    label,
  );
}

/** The owner's tagline, verbatim. Do not reword it. */
const HLANG = {
  headline: 'A FBP-Inspired language for building universal applications.',
  // Sized so the full tagline keeps the left margin on the right (measured).
  headlineSize: 29,
  lines: ['Hlang aims to make programming easier, faster and more comfortable.', 'It avoids coding, repetition and frustration.'],
  footer: 'READABLE  →  TRANSFORM  →  WRITABLE',
};

/**
 * One banner per published package. Banners never show an npm scope, because
 * the same image appears on both the @hlang-org and the @hlang-tech pages.
 */
const PACKAGES = {
  runtime: {
    headline: 'Nodes, ports, and flows on RxJS.',
    lines: ['Readable, Transform, and Writable nodes.', 'Every port is a live RxJS stream.'],
    footer: 'OUTPUT.CONNECT(INPUT)  →  FLOW.RUN(READABLE)',
  },
  ir: {
    headline: 'One program format. One set of rules.',
    lines: ['IGraph types and planGraph, the front end', 'shared by the interpreter and the compiler.'],
    footer: 'IGRAPH  →  PLANGRAPH  →  EXECUTION PLAN',
  },
  interpreter: {
    headline: 'Run a graph in process.',
    lines: ['Construct, connect, and run an IGraph', 'in Node.js or a browser. No code generation.'],
    footer: 'PLAN  →  CONSTRUCT  →  CONNECT  →  RUN',
  },
  compiler: {
    headline: 'Compile a graph to an ES module.',
    lines: ['The same behavior as the interpreter,', 'printed from an ESTree program.'],
    footer: 'PLAN  →  ESTREE  →  ES MODULE',
  },
  'editor-core': {
    headline: 'The headless core of Lumen.',
    lines: ['Commands with undo and redo, validation,', 'diagnostics, and IGraph serialization.'],
    footer: 'NO REACT  ·  NO DOM  ·  EVERY EDIT IS A COMMAND',
  },
  'editor-react': {
    headline: 'Lumen, bound to React Flow.',
    lines: ['Hooks that connect the headless core', 'to a React Flow canvas.'],
    footer: 'CORE  →  HOOKS  →  REACT FLOW',
  },
  'editor-ui': {
    headline: 'The Lumen design system.',
    lines: ['Image and intent nodes, live edges,', 'panels, and the editor shell.'],
    footer: 'NODES  ·  EDGES  ·  PANELS  ·  SHELL',
  },
};

/**
 * Construction sheet. Callout anchors are measured on the 400 × 400 source:
 * cube top-right corner (318,128), output terminal (153,157), input
 * terminal (243,250), trace along the crossbar at y ≈ 200.
 */
function construction() {
  const W = 1400;
  const H = 850;
  const S = 1.45; // scale of the 400 px source
  const ox = 100;
  const oy = 140;
  const p = (x, y) => [Math.round(ox + x * S), Math.round(oy + y * S)];
  const [tox, toy] = p(153, 157);
  const [tix, tiy] = p(243, 250);
  const [trx, try_] = p(200, 199);
  const [cbx, cby] = p(318, 128);
  const labelX = 860;
  const callout = (ax, ay, ly, n, title, body) =>
    `<circle cx="${ax}" cy="${ay}" r="5" fill="none" stroke="${C.silver}" stroke-width="1.5"/>` +
    `<path d="M${ax + 6} ${ay}H${labelX - 140}L${labelX - 40} ${ly - 8}H${labelX - 16}" fill="none" stroke="${C.silver}" stroke-opacity=".55"/>` +
    `<text x="${labelX}" y="${ly}" fill="${C.text}" font-family="${SANS}" font-size="24">${n} / ${title}</text>` +
    `<text x="${labelX}" y="${ly + 32}" fill="${C.silverLo}" font-family="${SANS}" font-size="17">${body}</text>`;
  const body =
    `<rect width="${W}" height="${H}" fill="${C.void}"/>` +
    `<defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${C.grid}" stroke-opacity=".06"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#g)"/>` +
    `<text x="64" y="66" fill="${C.text}" font-family="${SANS}" font-size="30">One node. One connection.</text>` +
    `<text x="64" y="98" fill="${C.silverLo}" font-family="${SANS}" font-size="16">hlang / mark construction and rationale</text>` +
    logo(ox, oy, Math.round(400 * S)) +
    callout(cbx, cby, 250, '01', 'Node', 'The cube is a closed unit of computation.') +
    callout(tox, toy, 390, '02', 'Output port', 'The upper terminal is where a stream leaves.') +
    callout(trx, try_, 530, '03', 'Stream', 'The trace forms the H. A connection is a live stream.') +
    callout(tix, tiy, 670, '04', 'Input port', 'The lower terminal is where the stream arrives.') +
    `<text x="64" y="${H - 52}" fill="${C.silver}" font-family="${MONO}" font-size="15">400 × 400 source / O.connect(I) / outputs connect only to inputs</text>`;
  return svg(W, H, body, 'hlang mark construction: a node, an output port, a stream, and an input port');
}

/** Square avatar: the mark centred on the brand surface. */
function avatar() {
  const S = 512;
  const m = 400;
  return svg(
    S,
    S,
    `<rect width="${S}" height="${S}" fill="${C.void}"/>${logo((S - m) / 2, (S - m) / 2, m)}`,
    'hlang organization avatar',
  );
}

const outputs = {
  'readme-banner.svg': banner(1280, 480, 'hlang — A FBP-Inspired language for building universal applications.', HLANG),
  // The social card's larger mark moves the text right, so the tagline is smaller.
  'social-card.svg': banner(1280, 640, 'hlang — A FBP-Inspired language for building universal applications.', { ...HLANG, headlineSize: 26 }),
  ...Object.fromEntries(
    Object.entries(PACKAGES).map(([name, content]) => [
      `packages/${name}.svg`,
      banner(1280, 480, `hlang ${name} — ${content.headline}`, { ...content, suffix: name }),
    ]),
  ),
  'logo-construction.svg': construction(),
  'avatar.svg': avatar(),
};

fs.mkdirSync(out('packages'), { recursive: true });
for (const [name, data] of Object.entries(outputs)) {
  fs.writeFileSync(out(name), data);
  console.log(`wrote media/brand/${name}`);
}
