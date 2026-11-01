/**
 * `ToolCluster` — the centred group of canvas tools in the top bar (nover-style):
 * a row of icon buttons with optional separators, in the black/silver glass
 * language. Purely presentational: the host supplies the items and their
 * actions. Kept generic (no business/media concepts) so it stays an editor-ui
 * primitive — a "frame", "add", or "view" tool is just an item with an icon.
 */

import type { ReactElement, ReactNode } from 'react';
import './ToolCluster.css';

export interface ToolItem {
  readonly id: string;
  readonly icon: ReactNode;
  readonly title: string;
  readonly onClick?: () => void;
  readonly active?: boolean;
  readonly disabled?: boolean;
  /** Draw a thin divider before this item. */
  readonly separatorBefore?: boolean;
}

export interface ToolClusterProps {
  readonly items: readonly ToolItem[];
}

export function ToolCluster({ items }: ToolClusterProps): ReactElement {
  return (
    <div className="hl-toolcluster" role="toolbar" aria-label="Canvas tools">
      {items.map(item => (
        <span key={item.id} className="hl-toolcluster-slot">
          {item.separatorBefore === true && <span className="hl-toolcluster-sep" aria-hidden />}
          <button
            type="button"
            className={'hl-toolcluster-btn' + (item.active === true ? ' is-active' : '')}
            onClick={item.onClick}
            disabled={item.disabled}
            title={item.title}
            aria-label={item.title}
            aria-pressed={item.active}
          >
            {item.icon}
          </button>
        </span>
      ))}
    </div>
  );
}
