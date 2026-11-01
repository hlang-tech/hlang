import type { Metadata } from 'next';
import Link from 'next/link';
import { DocArticle } from '@/components/docs/DocArticle';
import { getChangelogMarkdown } from '@/lib/changelog';
import { renderMarkdown } from '@/lib/markdown';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Every release of every hlang package, from the changelogs Changesets writes.',
};

export default async function ChangelogPage() {
  const { html, toc } = await renderMarkdown(getChangelogMarkdown());
  return (
    <div className="frame pb-24 pt-8 lg:pt-12">
      <DocArticle
        title="Changelog"
        description="Every release of every package, newest first. Each entry links to its commit."
        html={html}
        toc={toc.filter(entry => entry.depth === 2)}
        source={
          <>
            From each package&apos;s CHANGELOG.md, written by Changesets on release.{' '}
            <Link href={`${SITE.repository}/releases`} target="_blank" rel="noreferrer" className="underline decoration-silver-lo underline-offset-4 hover:text-ink">
              Releases on GitHub
            </Link>
          </>
        }
      />
    </div>
  );
}
