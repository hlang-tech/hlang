import { enter } from '@/lib/enter';

type Kind = 'R' | 'T' | 'W';

/** Inter's cap height, in em: the mark spans exactly from the baseline to the top of a capital. */
const CAP_HEIGHT = '0.727em';

/**
 * A node drawn at text size, the way it is wired: a Readable has only an
 * output port (hollow, right), a Transform an input (filled, left) and an
 * output, a Writable only an input. As an inline SVG its bottom edge sits on
 * the baseline, so at cap height it lines up with the capitals around it.
 */
function NodeMark({ kind }: { readonly kind: Kind }) {
  const input = kind !== 'R';
  const output = kind !== 'W';
  // Room for a port only on the sides that have one, so the spaces either side read equal.
  const left = input ? -14 : 0;
  const right = output ? 190 : 176;
  return (
    <svg
      aria-hidden
      viewBox={`${String(left)} 0 ${String(right - left)} 100`}
      // Preflight sets svg to block and middle; a mark in running text sits on the baseline.
      className="inline-block w-auto overflow-visible align-baseline"
      style={{ height: CAP_HEIGHT }}
    >
      <rect x="1.5" y="1.5" width="173" height="97" rx="48.5" strokeWidth="3" className="fill-surface-2 stroke-line-strong" />
      <text x="88" y="52" textAnchor="middle" dominantBaseline="central" className="fill-silver" style={{ fontSize: '50px', fontWeight: 600 }}>
        {kind}
      </text>
      {input ? <circle cx="1.5" cy="50" r="12" className="fill-silver" /> : null}
      {output ? <circle cx="174.5" cy="50" r="10.5" strokeWidth="6" className="fill-ground stroke-silver" /> : null}
    </svg>
  );
}

export function Intro() {
  return (
    <section className="frame py-20 md:py-36" aria-labelledby="intro-title">
      <h2 id="intro-title" className="sr-only">
        What an hlang program is
      </h2>
      <p className="mx-auto max-w-[24ch] text-center text-[clamp(28px,8.2vw,38px)] leading-[1.06] font-semibold tracking-[-0.035em] text-balance sm:text-l" data-enter style={enter(0)}>
        A Readable <NodeMark kind="R" /> sends, a Transform <NodeMark kind="T" /> maps, a Writable <NodeMark kind="W" />{' '}
        receives, <span className="text-muted">and every port between them is a live stream.</span>
      </p>
    </section>
  );
}
