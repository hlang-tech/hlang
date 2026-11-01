/**
 * The site's one motif, taken from the hlang mark: a port terminal. It is
 * hollow where a value leaves (an output) and filled where a value arrives
 * (an input). Buttons, the hero pipeline, and lists are built from it.
 */

/** A port terminal on its own: the motif at text size. */
export function Terminal({ filled = false, className }: { readonly filled?: boolean; readonly className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2.5 shrink-0 rounded-full border-2 border-current ${filled ? 'bg-current' : ''} ${className ?? ''}`}
    />
  );
}
