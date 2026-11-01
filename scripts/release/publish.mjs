#!/usr/bin/env node
/**
 * Publish every `@hlang-org/*` version that is not on the registry yet, then
 * tag it and create its GitHub Release from the package's changelog.
 *
 * Each package is packed with `pnpm pack` (workspace ranges become real
 * versions) and the tarball is published with `npm publish`. In the release
 * workflow npm authenticates with GitHub's OIDC token (trusted publishing), so
 * no npm token or one-time password is involved, and it attaches a provenance
 * attestation that ties the package to the commit and workflow that built it.
 * Publishing is idempotent: versions already on the registry are skipped.
 *
 * Usage (after `pnpm build`):
 *   node scripts/release/publish.mjs            # publish, tag, release
 *   node scripts/release/publish.mjs --dry-run  # pack and verify only
 *   node scripts/release/publish.mjs --pending  # print `pending=true|false` and exit;
 *                                               # true if either scope lacks a version
 * Creating GitHub Releases needs the `gh` CLI with a token (GH_TOKEN in CI).
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dependencyOrder, isPublished, publishArgs, readPackages, ROOT, run } from './lib.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const PENDING_ONLY = process.argv.includes('--pending');

/** The changelog section for `version`, without its heading. */
function releaseNotes(dir, version) {
  const changelog = readFileSync(join(dir, 'CHANGELOG.md'), 'utf8');
  const start = changelog.indexOf(`\n## ${version}\n`);
  if (start === -1) {
    return `See [CHANGELOG.md](https://github.com/hlang-tech/hlang/blob/main/${dir.slice(ROOT.length + 1)}/CHANGELOG.md).`;
  }
  const body = changelog.slice(start + `\n## ${version}\n`.length);
  const end = body.search(/\n## /);
  const short = dir.slice(dir.lastIndexOf('/') + 1);
  const install = `Install: \`npm install @hlang-org/${short}@${version}\` (identical build: \`@hlang-tech/${short}@${version}\`).`;
  return `${(end === -1 ? body : body.slice(0, end)).trim()}\n\n${install}`;
}

function tagExists(tag) {
  return run('git', ['tag', '--list', tag], { cwd: ROOT }) === tag;
}

function releaseExists(tag) {
  try {
    run('gh', ['release', 'view', tag], { cwd: ROOT, stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch {
    return false;
  }
}

const packages = readPackages();
const pending = dependencyOrder(packages).filter((name) => !isPublished(name, packages.get(name).manifest.version));

if (PENDING_ONLY) {
  const mirrorPending = [...packages.values()].some(
    ({ manifest }) => !isPublished(manifest.name.replace('@hlang-org/', '@hlang-tech/'), manifest.version),
  );
  console.log(`pending=${String(pending.length > 0 || mirrorPending)}`);
  process.exit(0);
}

const workDir = mkdtempSync(join(tmpdir(), 'hlang-publish-'));
try {
  for (const name of dependencyOrder(packages)) {
    const { dir, manifest } = packages.get(name);
    const { version } = manifest;
    const tag = `${name}@${version}`;

    if (pending.includes(name)) {
      const packDir = join(workDir, manifest.name.replace('/', '__'));
      run('pnpm', ['pack', '--pack-destination', packDir], { cwd: dir });
      const tarball = join(packDir, readdirSync(packDir).find((file) => file.endsWith('.tgz')));
      run('npm', publishArgs(tarball, version, DRY_RUN), { stdio: 'inherit' });
      console.log(`${DRY_RUN ? '~' : '+'} ${tag}`);
    } else {
      console.log(`= ${tag} already published, skipped`);
    }
    if (DRY_RUN) continue;

    // Tag and release every published version, so a run that stopped half way
    // is completed by the next one.
    if (!tagExists(tag)) {
      run('git', ['tag', tag], { cwd: ROOT });
      run('git', ['push', 'origin', `refs/tags/${tag}`], { cwd: ROOT, stdio: 'inherit' });
    }
    if (!releaseExists(tag)) {
      const prerelease = version.includes('-') ? ['--prerelease'] : ['--latest=false'];
      run('gh', ['release', 'create', tag, '--title', tag, '--notes', releaseNotes(dir, version), '--verify-tag', ...prerelease], {
        cwd: ROOT,
        stdio: 'inherit',
      });
    }
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
