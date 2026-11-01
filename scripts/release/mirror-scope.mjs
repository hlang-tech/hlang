#!/usr/bin/env node
/**
 * Publish identical builds of every public `@hlang-org/*` package under the
 * `@hlang-tech/*` scope.
 *
 * For each package, in dependency order:
 *   1. `pnpm pack` the built package (workspace ranges become real versions);
 *   2. rename the package and its internal dependencies to `@hlang-tech/*`;
 *   3. rewrite internal module specifiers in the shipped JavaScript, type
 *      declarations, and source maps, so the mirror family imports itself and
 *      never loads a second copy of a `@hlang-org/*` package;
 *   4. swap the two scope names in the README, so its install commands and
 *      "also published as" note are correct for the mirror;
 *   5. verify the result (no `@hlang-org/` reference left in code, publint,
 *      attw) and publish it. Versions that already exist are skipped.
 *
 * Usage (after `pnpm build`):
 *   node scripts/release/mirror-scope.mjs            # publish
 *   node scripts/release/mirror-scope.mjs --dry-run  # verify only
 * The registry comes from the usual npm configuration (`npm_config_registry`).
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_SCOPE = '@hlang-org';
const MIRROR_SCOPE = '@hlang-tech';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DRY_RUN = process.argv.includes('--dry-run');
const CODE_FILE = /\.(?:c|m)?js$|\.d\.(?:c|m)?ts$|\.map$/;
const DEPENDENCY_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'];

/** Run a command; returns trimmed stdout, or '' when output is inherited. */
function run(command, args, options = {}) {
  const output = execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...options });
  return typeof output === 'string' ? output.trim() : '';
}

/** Public workspace packages in the source scope, keyed by name. */
function readPackages() {
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

/** Packages ordered so every package follows its internal dependencies. */
function dependencyOrder(packages) {
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

function mirrorName(name) {
  return name.replace(`${SOURCE_SCOPE}/`, `${MIRROR_SCOPE}/`);
}

function isPublished(name, version) {
  try {
    // A 404 (not yet published) is the expected answer, so its output is discarded.
    return run('npm', ['view', `${name}@${version}`, 'version'], { stdio: ['ignore', 'pipe', 'ignore'] }) === version;
  } catch {
    return false;
  }
}

function filesUnder(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

/**
 * Rewrite every reference to an internal `@hlang-org/<name>` package: import
 * specifiers (including subpaths such as `/styles.css`) and doc comments alike,
 * so the mirror family only ever names itself.
 */
function rewriteSpecifiers(text, internal) {
  return text.replace(/@hlang-org\/([a-z][a-z-]*)(?![\w-])/g, (match, name) =>
    internal.has(`${SOURCE_SCOPE}/${name}`) ? `${MIRROR_SCOPE}/${name}` : match,
  );
}

/** Whether `text` still names an internal package in the source scope. */
function referencesSourceScope(text, internal) {
  return [...text.matchAll(/@hlang-org\/([a-z][a-z-]*)(?![\w-])/g)].some(([, name]) =>
    internal.has(`${SOURCE_SCOPE}/${name}`),
  );
}

/** Exchange the two scope names (README text). */
function swapScopes(text) {
  const placeholder = '\u0000HLANG_SCOPE\u0000';
  return text
    .replaceAll(MIRROR_SCOPE, placeholder)
    .replaceAll(SOURCE_SCOPE, MIRROR_SCOPE)
    .replaceAll(placeholder, SOURCE_SCOPE);
}

function mirrorPackage(name, packages, workDir) {
  const { dir, manifest } = packages.get(name);
  const target = mirrorName(name);
  const internal = new Set(packages.keys());

  // 1. Pack the published form of the source package.
  const packDir = join(workDir, 'pack');
  rmSync(packDir, { recursive: true, force: true });
  run('pnpm', ['pack', '--pack-destination', packDir], { cwd: dir });
  const tarball = join(packDir, readdirSync(packDir).find((file) => file.endsWith('.tgz')));
  const unpacked = join(workDir, 'unpacked');
  rmSync(unpacked, { recursive: true, force: true });
  run('mkdir', ['-p', unpacked]);
  run('tar', ['-xzf', tarball, '-C', unpacked]);
  const pkgDir = join(unpacked, 'package');

  // 2. Rename the package and its internal dependencies.
  const packed = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
  packed.name = target;
  for (const field of DEPENDENCY_FIELDS) {
    if (packed[field] === undefined) continue;
    packed[field] = Object.fromEntries(
      Object.entries(packed[field]).map(([dependency, range]) => [
        internal.has(dependency) ? mirrorName(dependency) : dependency,
        range,
      ]),
    );
  }
  writeFileSync(join(pkgDir, 'package.json'), `${JSON.stringify(packed, null, 2)}\n`);

  // 3. Rewrite module specifiers in code, declarations, and source maps.
  for (const file of filesUnder(pkgDir)) {
    if (!CODE_FILE.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    const rewritten = rewriteSpecifiers(text, internal);
    if (rewritten !== text) writeFileSync(file, rewritten);
    if (referencesSourceScope(rewritten, internal)) {
      throw new Error(`${target}: ${file} still references ${SOURCE_SCOPE}`);
    }
  }

  // 4. README: install commands and cross-scope note point the other way.
  const readme = join(pkgDir, 'README.md');
  writeFileSync(readme, swapScopes(readFileSync(readme, 'utf8')));

  // 5. Verify, then publish.
  run('npx', ['--no-install', 'publint', pkgDir], { cwd: dir, stdio: 'inherit' });
  const mirrorTarball = join(workDir, run('npm', ['pack', '--silent', '--pack-destination', workDir], { cwd: pkgDir }).split('\n').pop());
  const attwArgs = ['--no-install', 'attw', mirrorTarball];
  if (manifest.exports?.['./styles.css'] !== undefined) {
    attwArgs.push('--exclude-entrypoints', './styles.css', './tokens.css');
  }
  run('npx', attwArgs, { cwd: dir, stdio: 'inherit' });

  if (isPublished(target, manifest.version)) {
    console.log(`= ${target}@${manifest.version} already published, skipped`);
    return;
  }
  const publishArgs = ['publish', mirrorTarball, '--access', 'public'];
  if (manifest.version.includes('-')) publishArgs.push('--tag', 'next');
  if (DRY_RUN) publishArgs.push('--dry-run');
  run('npm', publishArgs, { stdio: 'inherit' });
  console.log(`${DRY_RUN ? '~' : '+'} ${target}@${manifest.version}`);
}

const packages = readPackages();
const workDir = mkdtempSync(join(tmpdir(), 'hlang-mirror-'));
try {
  for (const name of dependencyOrder(packages)) {
    mirrorPackage(name, packages, workDir);
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
