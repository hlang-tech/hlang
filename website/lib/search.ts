/**
 * The documentation search index, built at build time from the same sources as
 * the pages: the guides and the TypeDoc reference. Each entry is a page or one
 * of its sections (h2, h3); section anchors use github-slugger, the algorithm
 * rehype-slug uses for the page headings, so a result lands on its section.
 */

import GithubSlugger from 'github-slugger';
import { getApiMarkdown, getApiPackages, getGuides } from '@/lib/docs';

export interface SearchEntry {
  readonly href: string;
  /** The section heading, or the page title for a page entry. */
  readonly title: string;
  /** The page the entry belongs to. */
  readonly page: string;
  /** A short excerpt of the section's text. */
  readonly text: string;
}

const EXCERPT = 160;

/** Markdown reduced to plain words for an excerpt. */
function plain(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Inline code keeps its words: drop the backticks, do not space them.
    .replace(/`/g, '')
    .replace(/[*_>#|]/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A page entry, then one entry per h2 and h3, in order. */
function entriesOf(markdown: string, href: string, page: string, lead: string): SearchEntry[] {
  const slugger = new GithubSlugger();
  const entries: SearchEntry[] = [{ href, title: page, page, text: lead.slice(0, EXCERPT) }];
  const lines = markdown.split('\n');
  let inCode = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (line.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    const heading = inCode ? null : /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading === null) {
      continue;
    }
    const depth = heading[1]?.length ?? 0;
    const text = (heading[2] ?? '').replace(/`/g, '').replace(/\\/g, '').trim();
    // Every heading takes a slug, so later anchors are numbered as on the page.
    const slug = slugger.slug(text);
    if (depth !== 2 && depth !== 3) {
      continue;
    }
    const next = lines.slice(index + 1).findIndex(candidate => /^#{1,6}\s/.test(candidate));
    const body = lines
      .slice(index + 1, next === -1 ? undefined : index + 1 + next)
      // Source links and table rules are not reading text.
      .filter(candidate => !candidate.startsWith('Defined in:') && !/^\s*\|?\s*:?-{3,}/.test(candidate))
      .join('\n');
    entries.push({ href: `${href}#${slug}`, title: text, page, text: plain(body).slice(0, EXCERPT) });
  }
  return entries;
}

export function buildSearchIndex(): readonly SearchEntry[] {
  const guides = getGuides().flatMap(guide => entriesOf(guide.body, `/docs/${guide.slug}`, guide.title, guide.description));
  const api = getApiPackages().flatMap(item => {
    const markdown = getApiMarkdown(item.short);
    return markdown === undefined ? [] : entriesOf(markdown, `/docs/api/${item.short}`, `${item.name} API`, item.description);
  });
  return [...guides, ...api];
}
