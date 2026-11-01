/**
 * The signature edge: a connection rendered as a living stream. A base bezier
 * conduit (or, from a node back into itself, a loop routed around the node) plus a silver overlay that marches from output (O) to input (I) —
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
import type { HlangRFEdge, HlangRFNode } from '@hlang-org/editor-react';
import { useEdgeFlowing, useEdgePulse } from '../live/LiveSignalContext';
import { selfLoopPath } from './self-loop';
import { capacityLabel } from './edge-bounds';
import './FlowEdge.css';

/** A string `role` param on the source node, if any. */
function roleOf(node: HlangRFNode | undefined): string | undefined {
  const role = node?.data.editorNode.params.role;
  return typeof role === 'string' && role.length > 0 ? role : undefined;
}

export function FlowEdge(props: EdgeProps<HlangRFEdge>): ReactElement {
  const { id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected } =
    props;
  const sourceNode = useInternalNode<HlangRFNode>(source);
  const role = roleOf(sourceNode);
  // An edge from a node back into itself (a Transform's iteration) is routed
  // around that node once it has been measured; any other edge is a curve.
  const width = sourceNode?.measured.width;
  const height = sourceNode?.measured.height;
  const loop =
    source === target && sourceNode !== undefined && width !== undefined && height !== undefined
      ? selfLoopPath({
          source: { x: sourceX, y: sourceY },
          target: { x: targetX, y: targetY },
          node: { ...sourceNode.internals.positionAbsolute, width, height },
        })
      : undefined;
  const [curve] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const path = loop?.path ?? curve;
  // Bias the semantic label toward the TARGET (0.62 along the run), off the
  // source card into open canvas — the geometric midpoint of a short edge lands
  // on the source node and gets clipped. Labels name what a wire carries; they
  // must stay legible, not tuck behind a photo. A self-loop's label sits under
  // its node.
  const t = 0.62;
  const labelX = loop?.labelX ?? sourceX + (targetX - sourceX) * t;
  const labelY = loop?.labelY ?? sourceY + (targetY - sourceY) * t;
  // A bounded connection carries its capacity in FBP notation, nearer its
  // source than the role label (or, on a loop, at the loop's label point).
  const capacity = capacityLabel(data ?? {});
  const capacityX = loop?.labelX ?? sourceX + (targetX - sourceX) * 0.38;
  const capacityY = loop?.labelY ?? sourceY + (targetY - sourceY) * 0.38;

  const isError = data?.isError ?? false;
  const isValue = data?.stream === 'value';
  const flowing = useEdgeFlowing(id);
  // One flash per message this edge carried; a new count mounts a new path, so it plays once.
  const pulse = useEdgePulse(id);
  const className = [
    'hl-edge',
    isError ? 'is-error' : '',
    isValue ? 'is-value' : 'is-live',
    flowing ? 'is-flowing' : '',
    selected === true ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <g className={className}>
        <BaseEdge id={id} path={path} className="hl-edge-base" />
        <path d={path} className="hl-edge-flow" />
        {pulse > 0 && <path key={pulse} d={path} className="hl-edge-pulse" />}
      </g>
      {capacity !== undefined && (
        <EdgeLabelRenderer>
          <div
            className={`hl-edge-capacity hl-mono${data?.overflow === 'drop-oldest' ? ' is-lossy' : ''}`}
            style={{ transform: `translate(-50%, -50%) translate(${String(capacityX)}px, ${String(capacityY)}px)` }}
          >
            {capacity}
          </div>
        </EdgeLabelRenderer>
      )}
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
