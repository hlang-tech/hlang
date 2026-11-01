import { buildSearchIndex } from '@/lib/search';

/** The search index, written once at build time and served as a static file. */
export const dynamic = 'force-static';

export function GET(): Response {
  return Response.json(buildSearchIndex());
}
