/**
 * `PreviewPanel` — a framed preview of a result image. Generic: the host passes
 * an image URL + title (and optional status), and it renders a glass-framed
 * hero card. In the creator flow this is the "output" of the graph — the render
 * — completing the素材→intent→result narrative. editor-ui only draws it; what
 * the image IS (a render, a still, a mock) is the host's business.
 */

import type { ReactElement } from 'react';
import './PreviewPanel.css';

export interface PreviewPanelProps {
  readonly imageUrl?: string;
  readonly title?: string;
  readonly status?: string;
}

export function PreviewPanel({ imageUrl, title = 'Preview', status }: PreviewPanelProps): ReactElement {
  return (
    <section className="hl-preview" aria-label="Preview">
      <div className="hl-preview-head">
        <span className="hl-preview-title">{title}</span>
        {status !== undefined && <span className="hl-preview-status hl-mono">{status}</span>}
      </div>
      <div className="hl-preview-frame">
        {imageUrl !== undefined && imageUrl.length > 0 ? (
          <img className="hl-preview-img" src={imageUrl} alt={title} draggable={false} />
        ) : (
          <div className="hl-preview-placeholder hl-mono">no output yet</div>
        )}
      </div>
    </section>
  );
}
