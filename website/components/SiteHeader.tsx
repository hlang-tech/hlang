import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeProvider';
import { NAV, SITE } from '@/lib/site';

/** A plain bar: wordmark, a few links, one action. */
export function SiteHeader() {
  return (
    <header className="frame sticky top-0 z-40 border-b border-line bg-ground/80 backdrop-blur-xl backdrop-saturate-150">
      <nav className="flex h-16 items-center justify-between gap-6" aria-label="Main">
        <Link href="/" className="flex items-center gap-2.5" aria-label="hlang home">
          <Image src="/media/logo.png" alt="" width={28} height={28} className="rounded-[7px]" priority />
          <span className="text-[19px] font-semibold tracking-[-0.03em]">hlang</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="hidden rounded-full px-3 py-2 text-xs text-muted transition-colors hover:text-ink sm:block"
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
          <a
            href={SITE.repository}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-surface-2 px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-3"
          >
            GitHub
          </a>
        </div>
      </nav>
    </header>
  );
}
