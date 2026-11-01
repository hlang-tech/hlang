import type { ReactNode } from 'react';
import { DocsSidebar } from '@/components/docs/DocsSidebar';
import { getNavigation } from '@/lib/docs';

export default function DocsLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="frame grid gap-8 pb-24 pt-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:pt-12">
      <DocsSidebar groups={getNavigation()} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
