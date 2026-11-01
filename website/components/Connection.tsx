/**
 * The site's one motif, taken from the hlang mark: an output terminal, a trace,
 * and an input terminal — one connection. It is drawn at many scales: the hero
 * band, button ends, list bullets, the band that splits the page, and the mark
 * in the footer.
 */

import { svgPath } from '@/lib/svg-path';

interface ConnectionProps {
  /** Width of the drawing in px; the height follows from `rise`. */
  readonly width: number;
  /** Vertical distance between the two terminals, in px. 0 draws a straight wire. */
  readonly rise?: number;
  /** Stroke width of the trace, in px. Terminals scale with it. */
  readonly weight?: number;
  readonly className?: string;
  /** Accessible label. Decorative when omitted. */
  readonly label?: string;
}

export function Connection({ width, rise = 0, weight = 2, className, label }: ConnectionProps) {
  const r = weight * 2.6;
  const pad = r + weight;
  const height = rise + pad * 2;
  const x0 = pad;
  const x1 = width - pad;
  const y0 = pad;
  const y1 = pad + rise;
  const bend = Math.min(rise / 2, (x1 - x0) / 6);
  const mid = (x0 + x1) / 2;
  const d =
    rise === 0
      ? svgPath('M', x0, y0, 'H', x1)
      : svgPath('M', x0, y0, 'H', mid - bend, 'Q', mid, y0, mid, y0 + bend, 'V', y1 - bend, 'Q', mid, y1, mid + bend, y1, 'H', x1);
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={svgPath(0, 0, width, height)}
      fill="none"
      role={label === undefined ? undefined : 'img'}
      aria-hidden={label === undefined ? true : undefined}
      aria-label={label}
    >
      <path d={d} stroke="currentColor" strokeWidth={weight} strokeLinecap="round" />
      <circle cx={x0} cy={y0} r={r} fill="var(--color-ground)" stroke="currentColor" strokeWidth={weight} />
      <circle cx={x1} cy={y1} r={r} fill="currentColor" />
    </svg>
  );
}

/** A port terminal on its own: the motif at text size. */
export function Terminal({ filled = false, className }: { readonly filled?: boolean; readonly className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2.5 shrink-0 rounded-full border-2 border-current ${filled ? 'bg-current' : ''} ${className ?? ''}`}
    />
  );
}
