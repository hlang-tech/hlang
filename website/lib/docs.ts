/**
 * The documentation's content, read at build time: guides from content/docs
 * (Markdown with frontmatter) and the API reference TypeDoc generates into
 * .generated/api (see scripts/generate.mjs). Navigation is derived from both,
 * so adding a guide or a package needs no change here.
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const DOCS_DIR = path.join(process.cwd(), 'content', 'docs');
const API_DIR = path.join(process.cwd(), '.generated', 'api');

/** Navigation groups, in order. A guide names its group in frontmatter. */
export const GUIDE_GROUPS = ['Start', 'Language', 'Lumen'] as const;
export type GuideGroup = (typeof GUIDE_GROUPS)[number];

export interface Guide {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly group: GuideGroup;
  readonly order: number;
  /** The package whose API reference this guide introduces, if any. */
  readonly package?: string;
  readonly body: string;
}

export interface ApiPackage {
  readonly short: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly exports: number;
}

export interface NavLink {
  readonly href: string;
  readonly title: string;
}

export interface NavGroup {
  readonly title: string;
  readonly links: readonly NavLink[];
}

function isGroup(value: unknown): value is GuideGroup {
  return typeof value === 'string' && (GUIDE_GROUPS as readonly string[]).includes(value);
}

function requireString(data: Readonly<Record<string, unknown>>, key: string, file: string): string {
  const value = data[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${file}: frontmatter "${key}" must be a non-empty string`);
  }
  return value;
}

function readGuide(file: string): Guide {
  const source = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8');
  const { data, content } = matter(source);
  const fields: Readonly<Record<string, unknown>> = data;
  const group = fields['group'];
  const order = fields['order'];
  if (!isGroup(group)) {
    throw new Error(`${file}: frontmatter "group" must be one of ${GUIDE_GROUPS.join(', ')}`);
  }
  if (typeof order !== 'number') {
    throw new Error(`${file}: frontmatter "order" must be a number`);
  }
  const pkg = fields['package'];
  return {
    slug: file.replace(/\.md$/, ''),
    title: requireString(fields, 'title', file),
    description: requireString(fields, 'description', file),
    group,
    order,
    ...(typeof pkg === 'string' ? { package: pkg } : {}),
    body: content,
  };
}

/** Every guide, in reading order. */
export function getGuides(): readonly Guide[] {
  return fs
    .readdirSync(DOCS_DIR)
    .filter(file => file.endsWith('.md'))
    .map(readGuide)
    .sort((a, b) => a.order - b.order);
}

export function getGuide(slug: string): Guide | undefined {
  return getGuides().find(guide => guide.slug === slug);
}

function isApiPackage(value: unknown): value is ApiPackage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry: Readonly<Record<string, unknown>> = { ...value };
  return (
    typeof entry['short'] === 'string' &&
    typeof entry['name'] === 'string' &&
    typeof entry['version'] === 'string' &&
    typeof entry['description'] === 'string' &&
    typeof entry['exports'] === 'number'
  );
}

/** The packages in the API reference, from the manifest scripts/generate.mjs writes. */
export function getApiPackages(): readonly ApiPackage[] {
  const parsed: unknown = JSON.parse(fs.readFileSync(path.join(API_DIR, 'manifest.json'), 'utf8'));
  if (!Array.isArray(parsed) || !parsed.every(isApiPackage)) {
    throw new Error('.generated/api/manifest.json: unexpected shape; run scripts/generate.mjs');
  }
  return parsed;
}

/** The generated Markdown of one package's API. */
export function getApiMarkdown(short: string): string | undefined {
  const file = path.join(API_DIR, short, 'index.md');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : undefined;
}

/** The sidebar: guide groups, then the API reference. */
export function getNavigation(): readonly NavGroup[] {
  const guides = getGuides();
  return [
    ...GUIDE_GROUPS.map(group => ({
      title: group,
      links: guides.filter(guide => guide.group === group).map(guide => ({ href: `/docs/${guide.slug}`, title: guide.title })),
    })),
    {
      title: 'API reference',
      links: [
        { href: '/docs/api', title: 'Overview' },
        ...getApiPackages().map(item => ({ href: `/docs/api/${item.short}`, title: item.short })),
      ],
    },
  ];
}

/** The page before and after `href` in sidebar order. */
export function getNeighbours(href: string): { readonly previous?: NavLink; readonly next?: NavLink } {
  const links = getNavigation().flatMap(group => group.links);
  const index = links.findIndex(link => link.href === href);
  const previous = index > 0 ? links[index - 1] : undefined;
  const next = index >= 0 ? links[index + 1] : undefined;
  return { ...(previous === undefined ? {} : { previous }), ...(next === undefined ? {} : { next }) };
}
