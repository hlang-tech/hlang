/** The published packages, read from each package.json in the repository. */

import fs from 'node:fs';
import path from 'node:path';

export interface PackageFact {
  readonly name: string;
  readonly short: string;
  readonly version: string;
  readonly description: string;
  readonly group: 'Language' | 'Lumen editor';
}

const ORDER = ['runtime', 'ir', 'interpreter', 'compiler', 'editor-core', 'editor-react', 'editor-ui'] as const;

function readManifest(short: string): { name: string; version: string; description: string } {
  const file = path.join(process.cwd(), '..', 'packages', short, 'package.json');
  const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('name' in parsed) ||
    !('version' in parsed) ||
    !('description' in parsed) ||
    typeof parsed.name !== 'string' ||
    typeof parsed.version !== 'string' ||
    typeof parsed.description !== 'string'
  ) {
    throw new Error(`${file}: expected name, version and description`);
  }
  return { name: parsed.name, version: parsed.version, description: parsed.description };
}

export function getPackages(): readonly PackageFact[] {
  return ORDER.map(short => ({
    ...readManifest(short),
    short,
    group: short.startsWith('editor-') ? 'Lumen editor' : 'Language',
  }));
}
