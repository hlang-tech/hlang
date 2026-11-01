import Link from 'next/link';

/** The whole band is one link to the getting-started guide. */
export function Start() {
  return (
    <section aria-labelledby="start-title" className="frame">
      <h2 id="start-title" className="sr-only">Get started</h2>
      <Link
        href="/docs/getting-started"
        className="group relative flex min-h-[46svh] flex-col justify-between overflow-hidden rounded-t-[calc(var(--radius-panel)*2)] bg-silver p-6 text-ground transition-colors duration-150 hover:bg-ink focus-visible:bg-ink md:min-h-[60svh] md:p-10"
      >
        <span className="flex items-start justify-between gap-6">
          <span className="max-w-[30ch] text-s font-medium md:text-m">Write your first graph in the getting started guide.</span>
          <svg aria-hidden width="48" height="48" viewBox="0 0 48 48" fill="none" className="shrink-0 transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-1">
            <path d="M12 36 L36 12 M16 12 H36 V32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="block text-xl font-bold tracking-[-0.06em]">Start</span>
      </Link>
    </section>
  );
}
