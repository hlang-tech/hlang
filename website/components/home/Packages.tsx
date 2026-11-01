import Link from 'next/link';
import { SectionHeader } from '@/components/SectionHeader';
import { highlight } from '@/lib/highlight';
import { getPackages } from '@/lib/packages';
import { enter } from '@/lib/enter';

const INSTALL = 'npm install @hlang-org/runtime @hlang-org/interpreter';

function docsPath(short: string): string {
  if (short === 'ir') {
    return '/docs/igraph';
  }
  return short.startsWith('editor-') ? '/docs/lumen' : `/docs/${short}`;
}

export async function Packages() {
  const packages = getPackages();
  const groups = (['Language', 'Lumen editor'] as const).map(group => ({
    group,
    items: packages.filter(item => item.group === group),
  }));
  const install = await highlight(INSTALL, 'sh');

  return (
    <section aria-labelledby="packages-title" className="frame py-28 md:py-36">
      <SectionHeader
        id="packages-title"
        title="Seven packages"
        lead="Every package is published under @hlang-org, and with identical builds and versions under @hlang-tech. Use one scope in a project."
      />
      <div className="mt-14 grid gap-x-6 gap-y-14 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-6">
          {groups.map(({ group, items }, index) => (
            <div key={group} className={index === 0 ? '' : 'mt-10'} data-enter style={enter(index)}>
              <h3 className="text-xs text-muted">{group}</h3>
              <ul className="mt-2">
                {items.map(item => (
                  <li key={item.name} className="border-b border-line">
                    <Link href={docsPath(item.short)} className="group flex min-h-12 items-center gap-4 py-2">
                      <span className="min-w-0 truncate text-s text-ink transition-colors group-hover:text-silver">{item.name}</span>
                      <span className="ml-auto text-xs tabular-nums text-muted">{item.version}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="min-w-0 lg:col-span-6 lg:col-start-7" data-enter style={enter(1)}>
          <h3 className="text-m font-medium tracking-[-0.02em]">Start with the runtime and the interpreter.</h3>
          <div
            className="mt-6 [&_pre]:break-words [&_pre]:whitespace-pre-wrap [&_pre]:rounded-card [&_pre]:bg-surface! [&_pre]:px-5 [&_pre]:py-4 [&_pre]:font-mono [&_pre]:text-[14px] [&_pre]:ring-1 [&_pre]:ring-line [&_pre]:ring-inset"
            dangerouslySetInnerHTML={{ __html: install }}
          />
          <p className="mt-6 text-s text-muted">
            The Lumen packages are 0.x: they are in active development and can change in any minor release.
          </p>
        </div>
      </div>
    </section>
  );
}
