import Image from 'next/image';
import Link from 'next/link';
import { LiveGraph } from '@/components/live/LiveGraph';
import type { ProgramViews } from '@/components/live/LiveGraph';
import { Pipeline } from '@/components/home/Pipeline';
import { PortButton } from '@/components/PortButton';
import { highlight } from '@/lib/highlight';
import { liveGraph, TRANSFORM_CODES } from '@/lib/live-graph';
import type { TransformCode } from '@/lib/live-graph';
import { compileProgram } from '@/lib/program';
import { SITE } from '@/lib/site';
import { enter } from '@/lib/enter';

async function viewsOf(code: TransformCode): Promise<ProgramViews> {
  return {
    igraph: await highlight(JSON.stringify(liveGraph(code), null, 2), 'json'),
    compiled: await highlight(compileProgram(code).code, 'js'),
  };
}

async function programViews(): Promise<Record<TransformCode, ProgramViews>> {
  const [uppercase, reverse, length] = await Promise.all(TRANSFORM_CODES.map(viewsOf));
  if (uppercase === undefined || reverse === undefined || length === undefined) {
    throw new Error('program views: expected one view per transform');
  }
  return { uppercase, reverse, length };
}

export async function Hero() {
  const views = await programViews();
  return (
    <section className="frame grid gap-3 py-3 lg:grid-cols-2" aria-labelledby="hero-title">
      <div className="flex min-w-0 flex-col overflow-hidden rounded-panel bg-surface ring-1 ring-line ring-inset lg:min-h-[calc(100svh-89px)]">
        <div className="px-6 pt-6 sm:px-10 sm:pt-8">
          <Pipeline />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center sm:px-10">
          <h1 id="hero-title" className="flex items-center gap-[clamp(10px,3vw,16px)] text-[clamp(44px,14vw,64px)] font-semibold leading-none tracking-[-0.05em]" data-enter>
            <Image src="/media/logo.png" alt="" width={88} height={88} className="size-[clamp(60px,19vw,88px)] rounded-[22%]" priority />
            <span>hlang</span>
          </h1>
          <p className="mt-12 max-w-[24ch] text-m font-medium tracking-[-0.02em]" data-enter style={enter(1)}>
            {SITE.tagline}
          </p>
          <p className="mt-6 max-w-[44ch] text-s text-muted" data-enter style={enter(2)}>
            {SITE.taglineDetail}
          </p>
          <div className="mt-10" data-enter style={enter(3)}>
            <PortButton href="/docs/getting-started">Get started</PortButton>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 px-6 pb-8 text-xs">
          <Link href="/docs" className="text-muted transition-colors hover:text-ink">Documentation</Link>
          <a href={SITE.repository} target="_blank" rel="noreferrer" className="text-muted transition-colors hover:text-ink">GitHub</a>
          <a href={SITE.npm} target="_blank" rel="noreferrer" className="text-muted transition-colors hover:text-ink">npm</a>
        </div>
      </div>
      <div className="h-[640px] min-w-0 lg:sticky lg:top-[77px] lg:h-[calc(100svh-89px)]">
        <LiveGraph views={views} />
      </div>
    </section>
  );
}
