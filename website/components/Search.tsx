'use client';

import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { isEditableTarget } from '@/lib/editable';
import { SearchIcon } from '@/components/icons';

interface Entry {
  readonly href: string;
  readonly title: string;
  readonly page: string;
  readonly text: string;
}

function isEntry(value: unknown): value is Entry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry: Readonly<Record<string, unknown>> = { ...value };
  return ['href', 'title', 'page', 'text'].every(key => typeof entry[key] === 'string');
}

const LIMIT = 20;

/** Every word of the query must appear; a word in the heading counts most. */
function rank(entries: readonly Entry[], query: string): readonly Entry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const scored: { readonly entry: Entry; readonly score: number }[] = [];
  for (const entry of entries) {
    const title = entry.title.toLowerCase();
    const page = entry.page.toLowerCase();
    const text = entry.text.toLowerCase();
    let score = 0;
    let all = true;
    for (const word of words) {
      if (title.startsWith(word)) {
        score += 10;
      } else if (title.includes(word)) {
        score += 6;
      } else if (page.includes(word)) {
        score += 3;
      } else if (text.includes(word)) {
        score += 1;
      } else {
        all = false;
        break;
      }
    }
    if (all) {
      scored.push({ entry, score });
    }
  }
  return scored
    .sort((a, b) => b.score - a.score || a.entry.title.length - b.entry.title.length)
    .slice(0, LIMIT)
    .map(item => item.entry);
}

/** Opens with ⌘K, Ctrl+K or `/`; the index loads on first open. */
export function Search() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<readonly Entry[] | undefined>(undefined);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const results = useMemo(() => rank(entries ?? [], query), [entries, query]);

  const show = useCallback((): void => {
    setOpen(true);
    if (entries === undefined) {
      void fetch('/search-index.json')
        .then(async response => (await response.json()) as unknown)
        .then(data => { setEntries(Array.isArray(data) ? data.filter(isEntry) : []); });
    }
  }, [entries]);

  const close = useCallback((): void => {
    setOpen(false);
    setQuery('');
    setActive(0);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (open) {
          close();
        } else {
          show();
        }
      } else if (event.key === '/' && !open && !isEditableTarget(event.target)) {
        event.preventDefault();
        show();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [open, show, close]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    input.current?.focus();
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = previous; };
  }, [open]);

  const go = (entry: Entry): void => {
    close();
    router.push(entry.href);
  };

  const onInputKey = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(index => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      const entry = results[active];
      if (entry !== undefined) {
        go(entry);
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label="Search the documentation"
        className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink lg:flex lg:h-9 lg:w-52 lg:items-center lg:justify-start lg:gap-2 lg:rounded-full lg:bg-surface lg:px-3 lg:ring-1 lg:ring-line lg:ring-inset"
      >
        <SearchIcon />
        <span className="hidden text-[14px] lg:inline">Search docs</span>
        <kbd className="ml-auto hidden rounded-[6px] px-1.5 font-sans text-[12px] text-muted ring-1 ring-line ring-inset lg:inline">⌘K</kbd>
      </button>

      {/* Portaled to <body>: the header's backdrop filter would make it the containing block of a fixed overlay. */}
      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-ground/60 px-4 pt-[12vh] backdrop-blur-md" onClick={close}>
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Search the documentation"
                className="w-full max-w-[640px] overflow-hidden rounded-panel bg-surface ring-1 ring-line-strong ring-inset"
                onClick={event => { event.stopPropagation(); }}
              >
                <div className="flex items-center gap-3 border-b border-line px-5">
                  <SearchIcon className="shrink-0 text-muted" />
                  <input
                    ref={input}
                    value={query}
                    onChange={event => { setQuery(event.target.value); setActive(0); }}
                    onKeyDown={onInputKey}
                    placeholder="Search guides and the API reference"
                    role="combobox"
                    aria-expanded={results.length > 0}
                    aria-controls={listId}
                    aria-activedescendant={results[active] === undefined ? undefined : `${listId}-${String(active)}`}
                    aria-label="Search"
                    className="h-14 min-w-0 flex-1 bg-transparent text-s text-ink outline-none placeholder:text-muted"
                  />
                  <kbd className="hidden rounded-[6px] px-1.5 text-[12px] text-muted ring-1 ring-line ring-inset sm:inline">Esc</kbd>
                </div>
                <ul id={listId} role="listbox" aria-label="Results" className="max-h-[min(60vh,520px)] overflow-y-auto p-2">
                  {results.map((entry, index) => (
                    <li
                      key={entry.href}
                      id={`${listId}-${String(index)}`}
                      role="option"
                      aria-selected={index === active}
                      onMouseEnter={() => { setActive(index); }}
                      onClick={() => { go(entry); }}
                      className={`cursor-pointer rounded-card px-3 py-2.5 ${index === active ? 'bg-surface-2' : ''}`}
                    >
                      <p className="truncate text-[15px] font-medium text-ink">{entry.title}</p>
                      <p className="mt-0.5 truncate text-[13px] text-muted">
                        {entry.page}
                        {entry.text.length > 0 ? ` · ${entry.text}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
                {results.length === 0 ? (
                  <p className="px-5 pb-6 pt-2 text-[14px] text-muted">
                    {entries === undefined ? 'Loading the index' : query.trim().length === 0 ? 'Type to search the guides and the API reference.' : `No results for “${query.trim()}”.`}
                  </p>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
