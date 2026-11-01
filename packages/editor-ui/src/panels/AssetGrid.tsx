/**
 * `AssetGrid` — a thumbnail grid of render results / source images (the nover
 * "Renders" / "Assets" panel). Purely presentational: the host supplies image
 * URLs; clicking one calls back. editor-ui stays generic — an "asset" here is
 * just an image with an id, no media/model business concept.
 */

import type { ReactElement } from 'react';
import './AssetGrid.css';

export interface AssetItem {
  readonly id: string;
  readonly url: string;
  readonly label?: string;
}

export interface AssetGridProps {
  readonly items: readonly AssetItem[];
  readonly onSelect?: (id: string) => void;
  /** Shown when there are no assets yet. */
  readonly emptyHint?: string;
}

export function AssetGrid({ items, onSelect, emptyHint = 'No assets yet' }: AssetGridProps): ReactElement {
  if (items.length === 0) {
    return <p className="hl-assetgrid-empty hl-mono">{emptyHint}</p>;
  }
  return (
    <div className="hl-assetgrid">
      {items.map(item => (
        <button
          key={item.id}
          className="hl-assetgrid-cell"
          onClick={() => onSelect?.(item.id)}
          title={item.label}
        >
          <img className="hl-assetgrid-img" src={item.url} alt={item.label ?? ''} loading="lazy" />
        </button>
      ))}
    </div>
  );
}
