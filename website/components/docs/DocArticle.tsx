import Link from 'next/link';
import type { ReactNode } from 'react';
import { CodeCopy } from '@/components/docs/CodeCopy';
import type { NavLink } from '@/lib/docs';
import type { TocEntry } from '@/lib/markdown';

interface DocArticleProps {
  readonly title: string;
  readonly description: string;
  readonly html: string;
  readonly toc: readonly TocEntry[];
  readonly previous?: NavLink | undefined;
  readonly next?: NavLink | undefined;
  /** A line under the article saying where its content comes from. */
  readonly source: ReactNode;
}

export function DocArticle({ title, description, html, toc, previous, next, source }: DocArticleProps) {
  return (
    <div className="grid min-w-0 gap-12 xl:grid-cols-[minmax(0,1fr)_220px]">
      <article className="min-w-0">
        <header className="mb-12">
          <h1 className="text-l font-semibold tracking-[-0.035em]">{title}</h1>
          <p className="mt-5 max-w-[60ch] text-s text-muted">{description}</p>
        </header>
        <div className="prose-hlang" dangerouslySetInnerHTML={{ __html: html }} />
        <CodeCopy />
        <p className="mt-16 text-xs text-muted">{source}</p>
        <nav aria-label="Pages" className="mt-6 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
          {previous === undefined ? <span /> : (
            <Link href={previous.href} className="rounded-card px-4 py-3 ring-1 ring-line ring-inset transition-colors hover:bg-surface">
              <span className="block text-xs text-muted">Previous</span>
              <span className="block text-s text-ink">{previous.title}</span>
            </Link>
          )}
          {next === undefined ? null : (
            <Link href={next.href} className="rounded-card px-4 py-3 text-right ring-1 ring-line ring-inset transition-colors hover:bg-surface">
              <span className="block text-xs text-muted">Next</span>
              <span className="block text-s text-ink">{next.title}</span>
            </Link>
          )}
        </nav>
      </article>
      {toc.length === 0 ? null : (
        <aside className="hidden xl:block">
          <nav aria-label="On this page" className="sticky top-[89px] max-h-[calc(100svh-101px)] overflow-y-auto pb-10">
            <p className="text-xs text-muted">On this page</p>
            <ul className="mt-3 space-y-1.5 text-[14px]">
              {toc.map(entry => (
                <li key={entry.id} className={entry.depth === 3 ? 'pl-3' : ''}>
                  <a href={`#${entry.id}`} className="block truncate text-muted transition-colors hover:text-ink">
                    {entry.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      )}
    </div>
  );
}
