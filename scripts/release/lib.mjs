/**
 * Shared by the release scripts: the public workspace packages, their order,
 * and what the registry already has.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_SCOPE = '@hlang-org';
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Run a command; returns trimmed stdout, or '' when output is inherited. */
export function run(command, args, options = {}) {
  const output = execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...options });
  return typeof output === 'string' ? output.trim() : '';
}

/** Public workspace packages in the source scope, keyed by name. */
export function readPackages() {
  const packagesDir = join(ROOT, 'packages');
  const packages = new Map();
  for (const entry of readdirSync(packagesDir)) {
    const dir = join(packagesDir, entry);
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    if (manifest.private !== true && manifest.name.startsWith(`${SOURCE_SCOPE}/`)) {
      packages.set(manifest.name, { dir, manifest });
    }
  }
  return packages;
}

/** Package names ordered so every package follows its internal dependencies. */
export function dependencyOrder(packages) {
  const ordered = [];
  const visiting = new Set();
  const done = new Set();
  const visit = (name) => {
    if (done.has(name)) return;
    if (visiting.has(name)) throw new Error(`Dependency cycle through ${name}`);
    visiting.add(name);
    const { manifest } = packages.get(name);
    for (const field of ['dependencies', 'peerDependencies']) {
      for (const dependency of Object.keys(manifest[field] ?? {})) {
        if (packages.has(dependency)) visit(dependency);
      }
    }
    visiting.delete(name);
    done.add(name);
    ordered.push(name);
  };
  [...packages.keys()].sort().forEach(visit);
  return ordered;
}

/** Whether `name@version` is on the registry. */
export function isPublished(name, version) {
  try {
    // A 404 (not yet published) is the expected answer, so its output is discarded.
    return run('npm', ['view', `${name}@${version}`, 'version'], { stdio: ['ignore', 'pipe', 'ignore'] }) === version;
  } catch {
    return false;
  }
}

/** `npm publish` arguments for a tarball: public, and prereleases on the `next` tag. */
export function publishArgs(tarball, version, dryRun) {
  const args = ['publish', tarball, '--access', 'public'];
  if (version.includes('-')) args.push('--tag', 'next');
  if (dryRun) args.push('--dry-run');
  return args;
}
