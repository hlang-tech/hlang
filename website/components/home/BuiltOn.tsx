import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowUpRight } from '@/components/icons';
import { SectionHeader } from '@/components/SectionHeader';

interface Case {
  readonly name: string;
  readonly context: string;
  readonly image: { readonly src: string; readonly width: number; readonly height: number; readonly alt: string };
  readonly description: string;
  readonly link: { readonly href: string; readonly label: string };
}

/** Real products built on hlang: a commercial deployment, a framework, and a product in development. */
const CASES: readonly Case[] = [
  {
    name: 'Retail store operations',
    context: 'Freshippo Rex · CHINASHOP 2020',
    image: {
      src: '/media/ui.png',
      width: 1680,
      height: 1050,
      alt: 'A node development tool built on hlang, with Readable, Transform and Writable nodes, a property panel and a run log',
    },
    description:
      'At CHINASHOP 2020, the 22nd China Retail Expo, Rex, the commercial platform of Freshippo, presented a solution for store operations with hlang as its logic engine. Store logic was built, demonstrated and debugged as flows.',
    link: { href: 'https://www.xiaoa.name/events/hlang-chinashop-2020/', label: 'Read about the event' },
  },
  {
    name: 'AStack',
    context: 'AI agents and workflows',
    image: { src: '/media/showcase/astack.png', width: 2400, height: 1500, alt: 'The AStack mark' },
    description:
      'A composable TypeScript framework for AI agents, workflows and RAG. Models, tools and agents share one component interface and connect through ports into pipelines. AStack has its own implementation; hlang provides its computational model.',
    link: { href: 'https://github.com/astack-tech/astack', label: 'AStack on GitHub' },
  },
  {
    name: 'Prism',
    context: 'Image and video creation · in development',
    image: {
      src: '/media/prism.png',
      width: 2000,
      height: 1250,
      alt: 'Prism: image sources, a tone control, compose, grade and a preview on a live graph, with the render panel',
    },
    description:
      'A node-based tool for image and video creators, built on Lumen. Its image sources, intent nodes and render preview are hlang nodes, and what a creator builds is an IGraph.',
    link: { href: 'https://github.com/hlang-tech/hlang/tree/main/examples/editor-react-playground', label: 'See the Prism example' },
  },
];

/**
 * Each folder's color; the tab, its shoulder and its sheet share it, so they
 * read as one piece. `strip` is the same color for the row beside the next
 * folder's tab, where the folder behind shows.
 */
const TONES: readonly { readonly sheet: string; readonly fill: string; readonly strip: string }[] = [
  { sheet: 'bg-surface', fill: 'fill-surface', strip: 'md:bg-surface' },
  { sheet: 'bg-surface-2', fill: 'fill-surface-2', strip: 'md:bg-surface-2' },
  { sheet: 'bg-surface-3', fill: 'fill-surface-3', strip: 'md:bg-surface-3' },
];

/** Height of a folder's tab row, in px. */
const TAB_HEIGHT = 48;
/** Header height plus a gap: where the first folder sticks. */
const STACK_TOP = 77;

type StackStyle = CSSProperties & Record<'--stack-top' | '--tab-height' | '--tuck' | '--overlap' | '--sheet-height', string>;

/**
 * The height of every sheet: most of the viewport, at most 760px, and never
 * less than the tallest case's text needs at md width.
 */
const SHEET_HEIGHT = 'max(min(78svh, 760px), 420px)';

/**
 * Geometry of the stack, from md up.
 *
 * Folder `index` sticks exactly one tab row below the folder before it, so its
 * tab row lies on that folder's sheet top. The strip beside its tab takes the
 * color of the folder behind and rounds its top-right corner like that sheet,
 * so the two outlines coincide and every corner left open shows the color
 * directly above it.
 *
 * Every sheet has the same height, and each runs on under the folders after it
 * by one tab row per folder (`--tuck`). The next folder gives that length back
 * with a negative top margin (`--overlap`), so the flow is unchanged. A sticky
 * box releases when its margin box meets the end of the stack, and stuck, every
 * folder's box then ends on the same line: the stack leaves as one piece, and
 * behind the last folder's rounded bottom lie the same rounded bottoms. In
 * flow, the tucked sheet fills whatever the next folder's corners leave open.
 */
function stackStyle(index: number, count: number): StackStyle {
  return {
    '--stack-top': `${String(STACK_TOP + index * TAB_HEIGHT)}px`,
    '--tab-height': `${String(TAB_HEIGHT)}px`,
    '--tuck': `${String((count - 1 - index) * TAB_HEIGHT)}px`,
    '--overlap': `${String(index === 0 ? 0 : (count - index) * TAB_HEIGHT)}px`,
    '--sheet-height': SHEET_HEIGHT,
    zIndex: index + 1,
  };
}

export function BuiltOn() {
  return (
    <section id="built-on-hlang" aria-labelledby="built-on-title" className="frame scroll-mt-20 py-20 md:py-36">
      <SectionHeader
        id="built-on-title"
        title="Built on hlang"
        lead="Anything that produces an IGraph can run it with the interpreter or ship it with the compiler, so each product builds its own surface on the same engine."
      />
      <div className="mt-14 space-y-3 md:space-y-0">
        {CASES.map((item, index) => {
          const tone = TONES[index % TONES.length] ?? { sheet: 'bg-surface', fill: 'fill-surface', strip: 'md:bg-surface' };
          const behind = index > 0 ? TONES[(index - 1) % TONES.length] : undefined;
          const external = item.link.href.startsWith('http');
          return (
            <article
              key={item.name}
              aria-labelledby={`case-${String(index)}`}
              // The offsets apply only where the folders stack; in normal flow they would shift them.
              className="relative md:sticky md:top-(--stack-top) md:mt-[calc(var(--overlap)*-1)]"
              style={stackStyle(index, CASES.length)}
            >
              {/* The folder tab: a rounded top-left corner and a curved shoulder into the
                  sheet. The row beside it is the folder behind, in that folder's color. */}
              <div className={`flex items-end ${behind === undefined ? '' : `${behind.strip} md:rounded-tr-panel`}`}>
                <h3
                  id={`case-${String(index)}`}
                  className={`flex h-(--tab-height) items-center whitespace-nowrap rounded-tl-[18px] pl-5 pr-1 text-[clamp(18px,5vw,24px)] font-semibold tracking-[-0.02em] sm:pl-6 ${tone.sheet}`}
                >
                  {item.name}
                </h3>
                <svg aria-hidden viewBox="0 0 44 48" preserveAspectRatio="none" className={`-ml-px h-(--tab-height) w-11 shrink-0 ${tone.fill}`}>
                  <path d="M0 0 C 18 0 22 48 44 48 L 0 48 Z" />
                </svg>
                {/* Inset like the sheet's content, so the context lines up with it instead of the sheet's edge. */}
                <p className="ml-auto hidden min-w-0 truncate pb-3.5 pl-6 text-xs text-muted sm:block sm:pr-4 md:pr-6">{item.context}</p>
              </div>
              {/* Every sheet is the same height and runs on under the folders after it (see stackStyle). */}
              <div className={`rounded-b-panel rounded-tr-panel md:pb-(--tuck) ${tone.sheet}`}>
                <div className="grid gap-8 p-3 pb-7 sm:p-4 sm:pb-8 md:h-(--sheet-height) md:grid-cols-12 md:items-center md:gap-6 md:p-6">
                  <figure className="min-w-0 md:col-span-7">
                    <div className="relative overflow-hidden rounded-[calc(var(--radius-panel)-8px)]">
                      <Image
                        src={item.image.src}
                        alt={item.image.alt}
                        width={item.image.width}
                        height={item.image.height}
                        sizes="(min-width: 768px) 56vw, 100vw"
                        quality={92}
                        className="block aspect-[16/10] w-full object-cover md:max-h-[calc(var(--sheet-height)-3rem)]"
                      />
                      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-line ring-inset" />
                    </div>
                  </figure>
                  <div className="min-w-0 px-2 sm:px-3 md:col-span-4 md:col-start-9 md:px-0">
                    <p className="text-xs text-muted sm:hidden">{item.context}</p>
                    <p className="mt-3 text-s sm:mt-0">{item.description}</p>
                    <Link
                      href={item.link.href}
                      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
                      className="group mt-6 inline-flex items-center gap-1.5 text-s font-medium underline decoration-silver-lo underline-offset-4 transition-colors hover:decoration-ink"
                    >
                      {item.link.label}
                      {external ? <ArrowUpRight className="text-muted transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /> : null}
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
