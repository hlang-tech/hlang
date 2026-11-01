import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DocArticle } from '@/components/docs/DocArticle';
import { renderMarkdown } from '@/lib/markdown';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Brand',
  description: 'The hlang mark, its construction, its colors and the files to use.',
};

/** The brand guide is the repository's own: media/brand/README.md. */
const SOURCE = 'media/brand/README.md';

export default async function BrandPage() {
  const markdown = fs.readFileSync(path.join(process.cwd(), '..', SOURCE), 'utf8').replace(/^# .*\n/, '');
  const { html, toc } = await renderMarkdown(markdown, { sourcePath: SOURCE });
  return (
    <div className="frame pb-24 pt-8 lg:pt-12">
      <DocArticle
        title="Brand"
        description="The hlang mark, how it is built, the colors it is shown in, and the files to use."
        html={html}
        toc={toc}
        source={
          <>
            From{' '}
            <Link href={`${SITE.repository}/blob/main/${SOURCE}`} target="_blank" rel="noreferrer" className="underline decoration-silver-lo underline-offset-4 hover:text-ink">
              {SOURCE}
            </Link>
            , the brand guide in the repository.
          </>
        }
      />
    </div>
  );
}
