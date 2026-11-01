/**
 * The changelog page's content: each package's CHANGELOG.md, as Changesets
 * writes it on release. Nothing here is written by hand.
 */

import fs from 'node:fs';
import path from 'node:path';
import { getApiPackages } from '@/lib/docs';
import { SITE } from '@/lib/site';

const PACKAGES_DIR = path.join(process.cwd(), '..', 'packages');

/**
 * One package's changelog as a section of the page: its own title removed,
 * headings one level down, and the commit hashes Changesets writes linked.
 */
function section(short: string, name: string, version: string): string {
  const source = fs.readFileSync(path.join(PACKAGES_DIR, short, 'CHANGELOG.md'), 'utf8');
  const body = source
    .replace(/^# .*\n/, '')
    .replace(/^(#{2,5}) /gm, '#$1 ')
    .replace(/^(\s*- )([0-9a-f]{7,40}): /gm, (_match, lead: string, hash: string) => `${lead}[${hash.slice(0, 7)}](${SITE.repository}/commit/${hash}): `);
  return `## ${name}\n\nCurrent version: ${version}.\n${body}`;
}

/** Every package's changelog, in the order of the API reference. */
export function getChangelogMarkdown(): string {
  return getApiPackages()
    .map(item => section(item.short, item.name, item.version))
    .join('\n\n');
}
