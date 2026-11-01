'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { CloseIcon, GitHubMark, MenuIcon } from '@/components/icons';
import { ThemeToggle } from '@/components/ThemeProvider';
import { NAV, SITE } from '@/lib/site';

/** A section is current when the path is inside it; the home page anchor is never "current". */
function isCurrent(pathname: string, href: string): boolean {
  return !href.includes('#') && (pathname === href || pathname.startsWith(`${href}/`));
}

/**
 * The site bar: wordmark, sections, theme, GitHub. Below `md` the sections
 * move into a full-width panel behind a menu button, with the page locked
 * underneath; it closes on Escape and on navigation.
 */
export function SiteHeader() {
  const pathname = usePathname();
  // The panel remembers the path it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean): void => { setOpenOn(value ? pathname : null); };
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpenOn(null);
      }
    };
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-line bg-ground/80 backdrop-blur-xl backdrop-saturate-150">
      <nav className="frame flex h-16 items-center justify-between gap-6" aria-label="Main">
        <Link href="/" className="-ml-1 flex items-center gap-2.5 rounded-inner px-1 py-1" aria-label="hlang home">
          <Image src="/media/logo.png" alt="" width={28} height={28} className="rounded-[7px]" priority />
          <span className="text-[19px] font-semibold tracking-[-0.03em]">hlang</span>
        </Link>
        <div className="flex items-center gap-1">
          <ul className="mr-1 hidden items-center gap-0.5 md:flex">
            {NAV.map(item => {
              const current = isCurrent(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? 'page' : undefined}
                    className={`block rounded-full px-3 py-1.5 text-[14px] transition-colors ${
                      current ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <ThemeToggle />
          <a
            href={SITE.repository}
            target="_blank"
            rel="noreferrer"
            aria-label="hlang on GitHub"
            className="hidden h-9 items-center gap-2 rounded-full bg-surface-2 px-3.5 text-[14px] font-medium text-ink ring-1 ring-line ring-inset transition-colors hover:bg-surface-3 sm:inline-flex"
          >
            <GitHubMark />
            GitHub
          </a>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => { setOpen(!open); }}
            className="grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-surface-2 md:hidden"
          >
            {open ? <CloseIcon width={18} height={18} /> : <MenuIcon width={18} height={18} />}
          </button>
        </div>
      </nav>
    </header>

      {/* Outside the header: its backdrop filter would make it the containing block of a fixed panel. */}
      <div
        id={panelId}
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-[65px] z-30 overflow-y-auto bg-ground md:hidden"
      >
        <ul className="frame pt-2">
          {NAV.map(item => {
            const current = isCurrent(pathname, item.href);
            return (
              <li key={item.href} className="border-b border-line">
                <Link
                  href={item.href}
                  aria-current={current ? 'page' : undefined}
                  onClick={() => { setOpen(false); }}
                  className={`flex min-h-16 items-center text-m font-medium tracking-[-0.02em] ${current ? 'text-ink' : 'text-silver'}`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="frame mt-8 flex flex-wrap gap-3 pb-10">
          <a
            href={SITE.repository}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-surface-2 px-4 text-s font-medium ring-1 ring-line ring-inset"
          >
            <GitHubMark />
            GitHub
          </a>
          <a
            href={SITE.npm}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center rounded-full px-4 text-s font-medium text-muted ring-1 ring-line ring-inset"
          >
            npm
          </a>
        </div>
      </div>
    </>
  );
}
