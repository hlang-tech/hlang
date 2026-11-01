import Image from 'next/image';

interface PlateProps {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly sizes: string;
  readonly className?: string;
  readonly imageClassName?: string;
}

/**
 * A screenshot set in a bezel: a tinted plate with a hairline edge, and the
 * picture inset with its own rounded corners and hairline. The plate's tint is
 * taken from the current text color, so it reads on every band in both themes.
 */
export function Plate({ src, alt, width, height, sizes, className = '', imageClassName = '' }: PlateProps) {
  return (
    <figure
      className={`rounded-panel bg-[color-mix(in_oklab,currentColor_6%,transparent)] p-2 ring-1 ring-[color-mix(in_oklab,currentColor_12%,transparent)] ring-inset sm:p-2.5 ${className}`}
    >
      <div className="relative overflow-hidden rounded-[calc(var(--radius-panel)-8px)] sm:rounded-[calc(var(--radius-panel)-10px)]">
        <Image src={src} alt={alt} width={width} height={height} sizes={sizes} quality={92} className={`block w-full ${imageClassName}`} />
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-[color-mix(in_oklab,currentColor_14%,transparent)] ring-inset" />
      </div>
    </figure>
  );
}
