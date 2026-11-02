#!/usr/bin/env node
/**
 * Attach to every `@hlang-org/*` GitHub Release the package it released and
 * the provenance npm recorded for it, so a release can be verified from
 * GitHub alone (and OpenSSF Scorecard's Signed-Releases check can see it).
 *
 * For `@hlang-org/x@1.2.3` the release gets:
 *   x-1.2.3.tgz           the tarball on the registry, checked against the
 *                         registry's integrity hash (nothing is rebuilt)
 *   x-1.2.3.sigstore.json the Sigstore bundle of its SLSA provenance, as npm
 *                         recorded it when the release workflow published it
 *   x-1.2.3.intoto.jsonl  the in-toto attestation (DSSE envelope) inside that
 *                         bundle, one JSON object per line
 *
 * Versions published before trusted publishing have no provenance; their
 * releases are left as they are, and the script says so. Nothing is signed
 * here: every file comes from the registry.
 *
 * It is idempotent: a release that has all three files is skipped, so the
 * release workflow runs it on every push to main and it completes any release
 * a previous run did not.
 *
 * Usage:
 *   node scripts/release/attach-assets.mjs            # attach what is missing
 *   node scripts/release/attach-assets.mjs --dry-run  # fetch and verify only
 * Needs the `gh` CLI with a token (GH_TOKEN in CI).
 */

import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, run, SOURCE_SCOPE } from './lib.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const REGISTRY = 'https://registry.npmjs.org';
const PROVENANCE_PREDICATE = 'https://slsa.dev/provenance/v1';
/** Right after a publish the registry's CDN may not serve the version yet. */
const ATTEMPTS = 12;
const RETRY_DELAY_MS = 10_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetch a URL, retrying while the registry does not have it yet. */
async function fetchRetrying(url) {
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) return response;
    if (response.status !== 404 || attempt === ATTEMPTS) {
      throw new Error(`GET ${url}: ${String(response.status)} ${response.statusText}`);
    }
    await sleep(RETRY_DELAY_MS);
  }
}

/** `@hlang-org/x@1.2.3` → { name, version }, or undefined for any other tag. */
function parseTag(tag) {
  const at = tag.lastIndexOf('@');
  const name = tag.slice(0, at);
  return at > 0 && name.startsWith(`${SOURCE_SCOPE}/`) ? { name, version: tag.slice(at + 1) } : undefined;
}

/** The three asset file names of a version. */
function assetNames(name, version) {
  const base = `${name.slice(SOURCE_SCOPE.length + 1)}-${version}`;
  return { tarball: `${base}.tgz`, bundle: `${base}.sigstore.json`, envelope: `${base}.intoto.jsonl` };
}

/**
 * Download a version's tarball and provenance into `dir`, verifying the
 * tarball against the registry's integrity hash. Returns the file paths, or
 * undefined when the version has no provenance.
 */
async function download(name, version, dir) {
  const meta = await (await fetchRetrying(`${REGISTRY}/${name}/${version}`)).json();
  const { dist } = meta;
  if (dist?.attestations?.provenance?.predicateType !== PROVENANCE_PREDICATE) {
    return undefined;
  }

  const tarball = Buffer.from(await (await fetchRetrying(dist.tarball)).arrayBuffer());
  const [algorithm, expected] = dist.integrity.split('-');
  const actual = createHash(algorithm).update(tarball).digest('base64');
  if (actual !== expected) {
    throw new Error(`${name}@${version}: the tarball does not match the registry's integrity ${dist.integrity}`);
  }

  const { attestations } = await (await fetchRetrying(dist.attestations.url)).json();
  const provenance = attestations.find((attestation) => attestation.predicateType === PROVENANCE_PREDICATE);
  if (provenance?.bundle?.dsseEnvelope === undefined) {
    throw new Error(`${name}@${version}: the registry lists provenance but serves no ${PROVENANCE_PREDICATE} bundle`);
  }

  const names = assetNames(name, version);
  const paths = { tarball: join(dir, names.tarball), bundle: join(dir, names.bundle), envelope: join(dir, names.envelope) };
  writeFileSync(paths.tarball, tarball);
  writeFileSync(paths.bundle, `${JSON.stringify(provenance.bundle)}\n`);
  writeFileSync(paths.envelope, `${JSON.stringify(provenance.bundle.dsseEnvelope)}\n`);
  return paths;
}

const releases = JSON.parse(run('gh', ['release', 'list', '--limit', '1000', '--json', 'tagName'], { cwd: ROOT }));
const workDir = mkdtempSync(join(tmpdir(), 'hlang-assets-'));
let attached = 0;
try {
  for (const { tagName } of releases) {
    const parsed = parseTag(tagName);
    if (parsed === undefined) continue;
    const { name, version } = parsed;

    const present = new Set(
      JSON.parse(run('gh', ['release', 'view', tagName, '--json', 'assets'], { cwd: ROOT })).assets.map((asset) => asset.name),
    );
    if (Object.values(assetNames(name, version)).every((file) => present.has(file))) {
      continue;
    }

    const dir = mkdtempSync(join(workDir, 'v-'));
    const paths = await download(name, version, dir);
    if (paths === undefined) {
      console.log(`- ${tagName}: published without provenance, left as it is`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`~ ${tagName}: verified, would attach ${Object.values(assetNames(name, version)).join(', ')}`);
      continue;
    }
    run('gh', ['release', 'upload', tagName, paths.tarball, paths.bundle, paths.envelope, '--clobber'], { cwd: ROOT, stdio: 'inherit' });
    console.log(`+ ${tagName}: attached the tarball and its provenance`);
    attached += 1;
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
console.log(`${DRY_RUN ? 'checked' : `attached to ${String(attached)} release(s)`}`);
