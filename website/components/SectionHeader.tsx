import type { ReactNode } from 'react';
import { enter } from '@/lib/enter';

interface SectionHeaderProps {
  readonly id: string;
  readonly title: string;
  /** One sentence directly under the title. */
  readonly lead?: ReactNode;
  readonly className?: string;
}

/**
 * The opening of every section: the title, and the sentence that explains it
 * directly under it. Both start on the frame's left edge.
 */
export function SectionHeader({ id, title, lead, className = '' }: SectionHeaderProps) {
  return (
    <header className={`max-w-[44rem] ${className}`}>
      <h2 id={id} className="text-l font-semibold tracking-[-0.035em]" data-enter>
        {title}
      </h2>
      {lead === undefined ? null : (
        <p className="mt-6 max-w-[52ch] text-s text-muted" data-enter style={enter(1)}>
          {lead}
        </p>
      )}
    </header>
  );
}
