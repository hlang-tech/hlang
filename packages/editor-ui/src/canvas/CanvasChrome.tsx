/**
 * `CanvasChrome` — themed React Flow canvas furniture. Now just the dotted
 * background: React Flow's default MiniMap and Controls are intentionally NOT
 * rendered — a creation studio replaces them with our own centred `CanvasDock`
 * (pan/zoom/add) so the canvas isn't cluttered with a stock topology-editor
 * toolbar. Rendered as children of <ReactFlow>.
 */

import type { ReactElement } from 'react';
import { Background, BackgroundVariant } from '@xyflow/react';
import './CanvasChrome.css';

export interface CanvasChromeProps {
  readonly background?: boolean;
}

export function CanvasChrome({ background = true }: CanvasChromeProps): ReactElement {
  return <>{background && <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="#242830" />}</>;
}
