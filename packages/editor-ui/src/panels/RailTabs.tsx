/**
 * `RailTabs` — the segmented tab strip at the top of a side rail (Outline /
 * Insert / Assets, nover-style), in the black/silver glass language. Purely
 * presentational and generic: the host supplies the tab ids/labels and owns the
 * active state, so this is an editor-ui primitive with no coupling to what the
 * tabs contain.
 */

import type { ReactElement } from 'react';
import './RailTabs.css';

export interface RailTab {
  readonly id: string;
  readonly label: string;
}

export interface RailTabsProps {
  readonly tabs: readonly RailTab[];
  readonly active: string;
  readonly onChange: (id: string) => void;
}

export function RailTabs({ tabs, active, onChange }: RailTabsProps): ReactElement {
  return (
    <div className="hl-railtabs" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === active}
          className={'hl-railtab' + (tab.id === active ? ' is-active' : '')}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
