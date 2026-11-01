import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DocArticle } from '@/components/docs/DocArticle';
import { getGuide, getGuides, getNeighbours } from '@/lib/docs';
import { renderMarkdown } from '@/lib/markdown';
import { SITE } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return getGuides().map(guide => ({ slug: guide.slug }));
}

interface Params {
  readonly params: Promise<{ readonly slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  return guide === undefined ? {} : { title: guide.title, description: guide.description };
}

export default async function GuidePage({ params }: Params) {
  const guide = getGuide((await params).slug);
  if (guide === undefined) {
    notFound();
  }
  const { html, toc } = await renderMarkdown(guide.body);
  const { previous, next } = getNeighbours(`/docs/${guide.slug}`);
  return (
    <DocArticle
      title={guide.title}
      description={guide.description}
      html={html}
      toc={toc}
      previous={previous}
      next={next}
      source={
        <>
          The examples on this page run in CI.{' '}
          <Link
            href={`${SITE.repository}/blob/main/website/content/docs/${guide.slug}.md`}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-silver-lo underline-offset-4 hover:text-ink"
          >
            Edit this page on GitHub
          </Link>
        </>
      }
    />
  );
}
