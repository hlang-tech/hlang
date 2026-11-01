import { Terminal } from '@/components/Terminal';

/**
 * The three node kinds as one straight pipeline: a Readable's output, a
 * Transform with an input and an output, and a Writable's input. A value
 * travels it from end to end, the way a value moves through an hlang program.
 * Ports follow the site's convention: hollow where a value leaves, filled where
 * it arrives.
 */
export function Pipeline() {
  return (
    <figure aria-label="Readable, Transform, Writable: the three node kinds of an hlang program" className="text-silver">
      <div aria-hidden className="flex items-center">
        <Terminal />
        <Wire pulse="pipeline-pulse-a" />
        <span className="flex shrink-0 items-center gap-2 rounded-full border-2 border-current px-1.5 py-1">
          <Terminal filled />
          <Terminal />
        </span>
        <Wire pulse="pipeline-pulse-b" />
        <Terminal filled />
      </div>
      <figcaption aria-hidden className="mt-3 flex justify-between font-mono text-[11px] uppercase leading-none tracking-[0.12em] text-muted">
        <span>Readable</span>
        <span>Transform</span>
        <span>Writable</span>
      </figcaption>
    </figure>
  );
}

/** A straight wire between two ports, with a lit segment that travels it. */
function Wire({ pulse }: { readonly pulse: 'pipeline-pulse-a' | 'pipeline-pulse-b' }) {
  return (
    <span className="relative h-0.5 min-w-6 flex-1 overflow-hidden bg-current">
      <span className={`${pulse} absolute inset-y-0 left-0 w-10 rounded-full bg-spark motion-reduce:hidden`} />
    </span>
  );
}
