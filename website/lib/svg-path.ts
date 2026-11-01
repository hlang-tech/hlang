/**
 * Build an SVG path `d` attribute from commands and numbers, so callers never
 * interpolate numbers into strings by hand.
 */
export function svgPath(...parts: readonly (string | number)[]): string {
  return parts.map(part => (typeof part === 'number' ? String(Math.round(part * 100) / 100) : part)).join(' ');
}
