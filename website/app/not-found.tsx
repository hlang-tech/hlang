import type { Metadata } from 'next';
import Link from 'next/link';
import { PortButton } from '@/components/PortButton';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <section className="frame flex min-h-[calc(100svh-65px)] flex-col justify-center py-24" aria-labelledby="not-found-title">
      <p className="text-xs text-muted">404</p>
      <h1 id="not-found-title" className="mt-4 max-w-[16ch] text-l font-semibold tracking-[-0.035em]">
        This port has no connection.
      </h1>
      <p className="mt-6 max-w-[52ch] text-s text-muted">
        The page you asked for does not exist. It may have moved when the documentation was generated from source.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
        <PortButton href="/">Home</PortButton>
        <Link href="/docs" className="text-s underline decoration-silver-lo underline-offset-4 hover:decoration-ink">
          Documentation
        </Link>
        <Link href="/docs/api" className="text-s underline decoration-silver-lo underline-offset-4 hover:decoration-ink">
          API reference
        </Link>
      </div>
    </section>
  );
}
