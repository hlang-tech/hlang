import Image from 'next/image';
import Link from 'next/link';
import { SectionHeader } from '@/components/SectionHeader';
import { enter } from '@/lib/enter';

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

export function BuiltOn() {
  return (
    <section id="built-on-hlang" aria-labelledby="built-on-title" className="frame scroll-mt-20 py-28 md:py-36">
      <SectionHeader
        id="built-on-title"
        title="Built on hlang"
        lead="Anything that produces an IGraph can run it with the interpreter or ship it with the compiler, so each product builds its own surface on the same engine."
      />
      <ul className="mt-14 grid gap-3 lg:grid-cols-3">
        {CASES.map((item, index) => (
          <li
            key={item.name}
            className="grid min-w-0 overflow-hidden rounded-panel bg-surface ring-1 ring-line ring-inset md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:grid-cols-1 lg:grid-rows-[auto_1fr]"
            data-enter
            style={enter(index)}
          >
            <div className="p-2 sm:p-2.5 md:pr-0 lg:pr-2.5">
              <div className="relative overflow-hidden rounded-[calc(var(--radius-panel)-10px)]">
                <Image
                  src={item.image.src}
                  alt={item.image.alt}
                  width={item.image.width}
                  height={item.image.height}
                  sizes="(min-width: 1024px) 31vw, (min-width: 768px) 52vw, 100vw"
                  quality={92}
                  className="block aspect-[16/10] w-full object-cover"
                />
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-line ring-inset" />
              </div>
            </div>
            <div className="flex min-w-0 flex-col p-6 md:p-7">
              <p className="text-xs text-muted">{item.context}</p>
              <h3 className="mt-2 text-m font-semibold tracking-[-0.02em]">{item.name}</h3>
              <p className="mt-4 text-s">{item.description}</p>
              <p className="mt-auto pt-6">
                <Link
                  href={item.link.href}
                  {...(item.link.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                  className="text-s font-medium underline decoration-silver-lo underline-offset-4 transition-colors hover:decoration-ink"
                >
                  {item.link.label}
                </Link>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
