/** Site-wide facts. The tagline lines are the hlang author's own copy; do not reword them. */
export const SITE = {
  name: 'hlang',
  tagline: 'A FBP-Inspired language for building universal applications.',
  taglineDetail: 'Hlang aims to make programming easier, faster and more comfortable. It avoids coding, repetition and frustration.',
  repository: 'https://github.com/hlang-tech/hlang',
  npm: 'https://www.npmjs.com/org/hlang-org',
} as const;

export const NAV = [
  { href: '/docs', label: 'Docs' },
  { href: '/#built-on-hlang', label: 'Showcase' },
  { href: '/brand', label: 'Brand' },
  { href: '/changelog', label: 'Changelog' },
] as const;

/**
 * The canonical origin. `SITE_URL` is set on the deployment once the domain is
 * bound; Vercel's production URL is the fallback, then localhost for development.
 */
export function siteUrl(): string {
  const explicit = process.env['SITE_URL'];
  if (explicit !== undefined && explicit.length > 0) {
    return explicit;
  }
  const vercel = process.env['VERCEL_PROJECT_PRODUCTION_URL'];
  if (vercel !== undefined && vercel.length > 0) {
    return `https://${vercel}`;
  }
  return 'http://localhost:3000';
}
