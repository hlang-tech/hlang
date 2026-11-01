/**
 * The motif at its largest: one connection across the whole page, cropped by
 * the viewport, separating the language half of the page from the ecosystem.
 */
export function Band() {
  return (
    <div aria-hidden className="overflow-hidden py-24 text-silver">
      <svg viewBox="0 0 1600 300" className="block h-auto w-[118vw] -translate-x-[9vw]" fill="none">
        <path
          d="M60 60 H760 Q800 60 800 100 V200 Q800 240 840 240 H1540"
          stroke="currentColor"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <circle cx="60" cy="60" r="44" strokeWidth="18" stroke="currentColor" className="fill-ground" />
        <circle cx="1540" cy="240" r="54" fill="currentColor" />
      </svg>
    </div>
  );
}
