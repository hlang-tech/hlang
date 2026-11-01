import Link from 'next/link';
import type { ReactNode } from 'react';
import { Terminal } from './Terminal';

interface PortButtonProps {
  readonly href: string;
  readonly children: ReactNode;
  /** `solid` is the one primary action; `quiet` is everything else. */
  readonly tone?: 'solid' | 'quiet';
}

/**
 * The site's one button shape: a pill whose ends are port terminals, an output
 * on the left and an input on the right — a connection you can press.
 */
export function PortButton({ href, children, tone = 'solid' }: PortButtonProps) {
  const external = href.startsWith('http');
  const solid = tone === 'solid';
  return (
    <Link
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className={`group inline-flex h-12 items-center gap-3 rounded-full px-5 text-s font-medium transition-[transform,background-color] duration-150 active:scale-[0.98] ${
        solid ? 'bg-silver text-ground hover:bg-ink' : 'bg-surface-2 text-ink hover:bg-surface-3'
      }`}
    >
      <Terminal className="transition-transform duration-200 group-hover:-translate-x-0.5" />
      <span>{children}</span>
      <Terminal filled className="transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}
