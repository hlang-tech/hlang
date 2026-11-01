import Link from 'next/link';
import { SITE } from '@/lib/site';

const COLUMNS = [
  {
    title: 'Learn',
    links: [
      { href: '/docs', label: 'Introduction' },
      { href: '/docs/getting-started', label: 'Getting started' },
      { href: '/docs/igraph', label: 'IGraph' },
      { href: '/docs/api', label: 'API reference' },
    ],
  },
  {
    title: 'Packages',
    links: [
      { href: '/docs/runtime', label: 'runtime' },
      { href: '/docs/interpreter', label: 'interpreter' },
      { href: '/docs/compiler', label: 'compiler' },
      { href: '/docs/lumen', label: 'Lumen editor' },
    ],
  },
  {
    title: 'Project',
    links: [
      { href: SITE.repository, label: 'GitHub' },
      { href: SITE.npm, label: 'npm' },
      { href: '/changelog', label: 'Changelog' },
      { href: '/brand', label: 'Brand' },
    ],
  },
  {
    title: 'Community',
    links: [
      { href: `${SITE.repository}/issues`, label: 'Issues' },
      { href: `${SITE.repository}/blob/main/.github/CONTRIBUTING.md`, label: 'Contributing' },
      { href: `${SITE.repository}/security/policy`, label: 'Security' },
      { href: `${SITE.repository}/blob/main/CODE_OF_CONDUCT.md`, label: 'Code of conduct' },
    ],
  },
] as const;

/**
 * The page closes with the mark built large: the two stems of the H and the
 * trace between them, an output terminal at the top left and an input
 * terminal at the bottom right — flat shapes, drawn from the mark's geometry.
 */
function BuiltMark() {
  return (
    <svg viewBox="0 0 1200 340" className="h-auto w-full" role="img" aria-label="The hlang mark, built large">
      <rect x="0" y="0" width="150" height="340" rx="75" className="fill-surface-2" />
      <rect x="1050" y="0" width="150" height="340" rx="75" className="fill-surface-2" />
      <path
        d="M75 70 V128 Q75 170 117 170 H1083 Q1125 170 1125 212 V270"
        fill="none"
        strokeWidth="14"
        strokeLinecap="round"
        className="stroke-silver"
      />
      <circle cx="75" cy="70" r="24" strokeWidth="14" className="fill-ground stroke-silver" />
      <circle cx="1125" cy="270" r="31" className="fill-silver" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="frame bg-ground pb-10 pt-40">
      <BuiltMark />
      <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-12">
        {COLUMNS.map(column => (
          <div key={column.title} className="md:col-span-2">
            <p className="mb-3 text-xs text-muted">{column.title}</p>
            <ul className="space-y-2">
              {column.links.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                    className="text-xs text-ink transition-colors hover:text-silver"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="col-span-2 md:col-span-4">
          <p className="text-xs text-ink">{SITE.tagline}</p>
          <p className="mt-2 text-xs text-muted">{SITE.taglineDetail}</p>
        </div>
      </div>
      <div className="mt-16 flex flex-wrap items-center justify-between gap-4 text-xs text-muted">
        <p>© hlang-tech · MIT licensed</p>
        <a
          href={SITE.repository}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-surface-2 px-4 py-2 text-ink transition-colors hover:bg-surface-3"
        >
          Star on GitHub
        </a>
      </div>
    </footer>
  );
}
