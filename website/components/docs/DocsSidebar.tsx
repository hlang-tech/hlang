'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavGroup } from '@/lib/docs';

function Groups({ groups, pathname }: { readonly groups: readonly NavGroup[]; readonly pathname: string }) {
  return (
    <div className="space-y-8">
      {groups.map(group => (
        <div key={group.title}>
          <p className="px-3 text-xs text-muted">{group.title}</p>
          <ul className="mt-2 space-y-px">
            {group.links.map(link => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-inner px-3 py-1.5 text-[15px] transition-colors ${
                      active ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {link.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** The docs navigation: a column on wide screens, a disclosure above the page on narrow ones. */
export function DocsSidebar({ groups }: { readonly groups: readonly NavGroup[] }) {
  const pathname = usePathname();
  const current = groups.flatMap(group => group.links).find(link => link.href === pathname);
  return (
    <>
      <nav aria-label="Documentation" className="sticky top-[89px] hidden max-h-[calc(100svh-101px)] overflow-y-auto pb-10 lg:block">
        <Groups groups={groups} pathname={pathname} />
      </nav>
      <details className="group rounded-card bg-surface ring-1 ring-line ring-inset lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 text-s [&::-webkit-details-marker]:hidden">
          <span className="truncate">{current?.title ?? 'Documentation'}</span>
          <span aria-hidden className="text-xs text-muted transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <nav aria-label="Documentation" className="border-t border-line px-1 py-5">
          <Groups groups={groups} pathname={pathname} />
        </nav>
      </details>
    </>
  );
}
