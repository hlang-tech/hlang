import { redirect } from 'next/navigation';
import { getGuides } from '@/lib/docs';

/** /docs opens the first guide. */
export default function DocsIndex() {
  const first = getGuides()[0];
  redirect(first === undefined ? '/' : `/docs/${first.slug}`);
}
