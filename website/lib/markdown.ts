/**
 * The one Markdown pipeline of the site. Guides (content/docs) and the API
 * reference TypeDoc generates (.generated/api) both render through it, so they
 * share one set of styles.
 *
 * Beyond GitHub-flavored Markdown it adds:
 * - example includes: a code block with `file=<name>` takes its body from
 *   content/examples/<name>, and `output=<name>` from <name>.out, the output
 *   that scripts/run-examples.mjs checks. A missing file fails the build.
 * - GitHub alerts: `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, `> [!IMPORTANT]`.
 * - heading ids and anchors, and a table of contents (h2 and h3).
 * - code blocks highlighted by Shiki in the site theme, framed with their
 *   language and a copy button.
 */

import fs from 'node:fs';
import path from 'node:path';
import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import type { Element, ElementContent, Root as HastRoot } from 'hast';
import { toString } from 'hast-util-to-string';
import type { Blockquote, Code, Root as MdastRoot } from 'mdast';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { getHighlighter } from '@/lib/highlight';
import { SITE } from '@/lib/site';

const REPOSITORY = SITE.repository;

export const EXAMPLES_DIR = path.join(process.cwd(), 'content', 'examples');

export interface TocEntry {
  readonly id: string;
  readonly text: string;
  readonly depth: 2 | 3;
}

export interface RenderOptions {
  /**
   * The Markdown file's path in the repository, such as `media/brand/README.md`.
   * Relative links and images then resolve against it: a file the site serves
   * from media/ (see scripts/generate.mjs) points to its served path, anything
   * else to the file on GitHub.
   */
  readonly sourcePath?: string;
}

export interface RenderedMarkdown {
  readonly html: string;
  readonly toc: readonly TocEntry[];
}

const LANGUAGE_LABELS: Readonly<Record<string, string>> = {
  ts: 'TypeScript',
  tsx: 'TSX',
  js: 'JavaScript',
  json: 'JSON',
  sh: 'Shell',
  bash: 'Shell',
  diff: 'Diff',
  text: 'Output',
};

/** `key=value` pairs from a code block's meta string. */
function metaOf(meta: string | null | undefined): Readonly<Record<string, string>> {
  const pairs: Record<string, string> = {};
  for (const match of (meta ?? '').matchAll(/(\w+)=("[^"]*"|\S+)/g)) {
    const [, key, raw] = match;
    if (key !== undefined && raw !== undefined) {
      pairs[key] = raw.replace(/^"|"$/g, '');
    }
  }
  return pairs;
}

/** Fill `file=` and `output=` code blocks from content/examples. */
function remarkExamples() {
  return (tree: MdastRoot): void => {
    visit(tree, 'code', (node: Code) => {
      const meta = metaOf(node.meta);
      const file = meta['file'];
      const output = meta['output'];
      if (file !== undefined) {
        node.value = fs.readFileSync(path.join(EXAMPLES_DIR, file), 'utf8').trimEnd();
        node.meta = `title="${file}"`;
      } else if (output !== undefined) {
        node.value = fs.readFileSync(path.join(EXAMPLES_DIR, `${output}.out`), 'utf8').trimEnd();
        node.lang = 'text';
        node.meta = `title="Output"`;
      }
    });
  };
}

const ALERTS = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'] as const;
type Alert = (typeof ALERTS)[number];

function isAlert(value: string): value is Alert {
  return (ALERTS as readonly string[]).includes(value);
}

/** Turn `> [!NOTE]` blockquotes into alert blocks. */
function remarkAlerts() {
  return (tree: MdastRoot): void => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      const first = node.children[0];
      if (first?.type !== 'paragraph') {
        return;
      }
      const lead = first.children[0];
      if (lead?.type !== 'text') {
        return;
      }
      const match = /^\[!(\w+)\]\s*/.exec(lead.value);
      const kind = match?.[1]?.toUpperCase();
      if (match === null || kind === undefined || !isAlert(kind)) {
        return;
      }
      lead.value = lead.value.slice(match[0].length);
      if (lead.value.length === 0) {
        first.children.shift();
      }
      node.data = { hProperties: { className: ['alert', `alert-${kind.toLowerCase()}`], 'data-alert': kind.toLowerCase() } };
    });
  };
}

/**
 * Wrap each code block in a frame with its label (title, or language) and a
 * copy button. Runs before Shiki, while the `code` element still carries its
 * language class and meta; Shiki then highlights the `pre` inside the frame.
 */
function rehypeCodeFrames() {
  return (tree: HastRoot): void => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'pre' || parent === undefined || index === undefined || parent.type === 'element' && parent.tagName === 'figure') {
        return;
      }
      const code = node.children.find((child): child is Element => child.type === 'element' && child.tagName === 'code');
      const classes = code?.properties.className;
      const languageClass = Array.isArray(classes) ? classes.find(name => typeof name === 'string' && name.startsWith('language-')) : undefined;
      const language = typeof languageClass === 'string' ? languageClass.slice('language-'.length) : 'text';
      const meta = code?.data && 'meta' in code.data && typeof code.data.meta === 'string' ? code.data.meta : '';
      const label = metaOf(meta)['title'] ?? LANGUAGE_LABELS[language] ?? language;
      const header: ElementContent[] = [
        { type: 'element', tagName: 'span', properties: { className: ['code-frame-label'] }, children: [{ type: 'text', value: label }] },
        {
          type: 'element',
          tagName: 'button',
          properties: { type: 'button', className: ['code-frame-copy'], dataCopy: '', ariaLabel: `Copy ${label}` },
          children: [{ type: 'text', value: 'Copy' }],
        },
      ];
      node.properties.tabIndex = 0;
      parent.children[index] = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['code-frame'], dataLanguage: language },
        children: [{ type: 'element', tagName: 'figcaption', properties: { className: ['code-frame-head'] }, children: header }, node],
      };
    });
  };
}

/** TypeDoc's "Defined in:" lines are source references: mark them as secondary. */
function rehypeSourceLines() {
  return (tree: HastRoot): void => {
    visit(tree, 'element', (node: Element) => {
      const first = node.children[0];
      if (node.tagName === 'p' && first?.type === 'text' && first.value.startsWith('Defined in:')) {
        node.properties.className = ['source-line'];
      }
    });
  };
}

/** Wrap tables so a wide one scrolls on its own instead of widening the page. */
function rehypeTableScroll() {
  return (tree: HastRoot): void => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'table' || parent === undefined || index === undefined) {
        return;
      }
      if (parent.type === 'element' && parent.tagName === 'div') {
        return;
      }
      parent.children[index] = { type: 'element', tagName: 'div', properties: { className: ['table-scroll'], tabIndex: 0 }, children: [node] };
    });
  };
}

const MEDIA_MAP_FILE = path.join(process.cwd(), '.generated', 'media.json');

function mediaMap(): ReadonlyMap<string, string> {
  const parsed: unknown = JSON.parse(fs.readFileSync(MEDIA_MAP_FILE, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('.generated/media.json: unexpected shape; run scripts/generate.mjs');
  }
  return new Map(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

/** Resolve relative `src` and `href` values of a repository Markdown file. */
function rehypeRepositoryLinks(sourcePath: string | undefined) {
  return () =>
    (tree: HastRoot): void => {
      if (sourcePath === undefined) {
        return;
      }
      const served = mediaMap();
      const base = path.posix.dirname(sourcePath);
      visit(tree, 'element', (node: Element) => {
        const attribute = node.tagName === 'img' ? 'src' : node.tagName === 'a' ? 'href' : undefined;
        const value = attribute === undefined ? undefined : node.properties[attribute];
        if (attribute === undefined || typeof value !== 'string' || /^([a-z]+:|\/|#)/i.test(value)) {
          return;
        }
        const [file = '', hash] = value.split('#');
        const resolved = path.posix.normalize(path.posix.join(base, file));
        const target = served.get(resolved) ?? `${REPOSITORY}/blob/main/${resolved}`;
        node.properties[attribute] = hash === undefined ? target : `${target}#${hash}`;
      });
    };
}

/** Make ids unique across the page (TypeDoc's tables repeat property anchors). */
function rehypeUniqueIds() {
  return (tree: HastRoot): void => {
    const seen = new Map<string, number>();
    visit(tree, 'element', (node: Element) => {
      const id = node.properties.id;
      if (typeof id !== 'string') {
        return;
      }
      const count = seen.get(id) ?? 0;
      seen.set(id, count + 1);
      if (count > 0) {
        node.properties.id = `${id}-${String(count)}`;
      }
    });
  };
}

/** Headings link to themselves; external links open in a new tab. */
function rehypeLinks(toc: TocEntry[]) {
  return () =>
    (tree: HastRoot): void => {
      visit(tree, 'element', (node: Element) => {
        if ((node.tagName === 'h2' || node.tagName === 'h3') && typeof node.properties.id === 'string') {
          const id = node.properties.id;
          toc.push({ id, text: toString(node), depth: node.tagName === 'h2' ? 2 : 3 });
          node.children = [{ type: 'element', tagName: 'a', properties: { href: `#${id}`, className: ['heading-anchor'] }, children: node.children }];
        }
        const href = node.properties.href;
        if (node.tagName === 'a' && typeof href === 'string' && /^https?:\/\//.test(href)) {
          node.properties.target = '_blank';
          node.properties.rel = ['noreferrer'];
        }
      });
    };
}

/** Render Markdown to HTML with its table of contents. */
export async function renderMarkdown(markdown: string, options: RenderOptions = {}): Promise<RenderedMarkdown> {
  const highlighter = await getHighlighter();
  const toc: TocEntry[] = [];
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkExamples)
    .use(remarkAlerts)
    .use(remarkRehype, { allowDangerousHtml: true })
    // Raw HTML comes only from this repository: the guides and TypeDoc's output.
    .use(rehypeRaw)
    .use(rehypeRepositoryLinks(options.sourcePath))
    .use(rehypeCodeFrames)
    .use(rehypeShikiFromHighlighter, highlighter, {
      theme: 'hlang',
      fallbackLanguage: 'text',
      addLanguageClass: true,
    })
    .use(rehypeSlug)
    .use(rehypeSourceLines)
    .use(rehypeTableScroll)
    .use(rehypeUniqueIds)
    .use(rehypeLinks(toc))
    .use(rehypeStringify)
    .process(markdown);
  return { html: String(file), toc };
}
