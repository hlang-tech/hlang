/**
 * The signature edge: a connection rendered as a living stream. A base bezier
 * conduit plus a silver overlay that marches from output (O) to input (I) —
 * exactly what an hlang RxJS port does; a cold spark lights it while flowing.
 *
 * When the SOURCE node carries a semantic `role` param (e.g. Character,
 * Background), a small glass label pill rides the edge midpoint — naming what
 * the connection carries, the way nover labels its wires. The role is read from
 * the source node's params (no change to editor-react's edge data).
 */

import type { ReactElement } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useInternalNode } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import type { HlangRFEdge } from '@hlang-org/editor-react';
import { useEdgeFlowing } from '../live/LiveSignalContext';
import './FlowEdge.css';

/** Read a string `role` param off the source node, if any. */
function useSourceRole(sourceId: string): string | undefined {
  const node = useInternalNode(sourceId);
  const editorNode = (node?.data as { editorNode?: { params?: Record<string, unknown> } } | undefined)
    ?.editorNode;
  const role = editorNode?.params?.role;
  return typeof role === 'string' && role.length > 0 ? role : undefined;
}

export function FlowEdge(props: EdgeProps<HlangRFEdge>): ReactElement {
  const { id, source, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } =
    props;
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  // Bias the semantic label toward the TARGET (0.62 along the run), off the
  // source card into open canvas — the geometric midpoint of a short edge lands
  // on the source node and gets clipped. Labels name what a wire carries; they
  // must stay legible, not tuck behind a photo.
  const t = 0.62;
  const labelX = sourceX + (targetX - sourceX) * t;
  const labelY = sourceY + (targetY - sourceY) * t;

  const isError = data?.isError ?? false;
  const isValue = data?.stream === 'value';
  const flowing = useEdgeFlowing(id);
  const role = useSourceRole(source);
  const className = [
    'hl-edge',
    isError ? 'is-error' : '',
    isValue ? 'is-value' : 'is-live',
    flowing ? 'is-flowing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <g className={className}>
        <BaseEdge id={id} path={path} className="hl-edge-base" />
        <path d={path} className="hl-edge-flow" />
      </g>
      {role !== undefined && (
        <EdgeLabelRenderer>
          <div
            className="hl-edge-label hl-mono"
            style={{ transform: `translate(-50%, -50%) translate(${String(labelX)}px, ${String(labelY)}px)` }}
          >
            {role}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
