/**
 * A small, clean starter flow the playground loads on start, so there is a real
 * creative scene on the canvas. This is DATA — the editor only ever sees an
 * IGraph. Two image assets (a character + a backdrop) and a numeric control
 * feed a compose transform into an output. The images are real photographs
 * (Unsplash) so the asset nodes have genuine media, not gray blocks.
 *
 * Node coordinates come from the layered auto-layout at load time.
 */

import type { IGraph, INodeInfo, IConnection, ParamValue } from '@hlang-org/interpreter';

/** Real Unsplash photos (stable ids, sized for a node card). */
const IMG = (id: string): string =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=480&q=70`;

function node(
  nodeId: string,
  code: string,
  type: 'R' | 'T' | 'W',
  position: { x: number; y: number },
  params: Record<string, ParamValue> = {},
): INodeInfo {
  return { code, name: nodeId, type, nodeId, bizData: { params }, position };
}

function link(fromId: string, toId: string, toPort = 'Input', fromPort = 'Output'): IConnection {
  return {
    Output: { nodeId: fromId, portConf: { id: fromPort } },
    Input: { nodeId: toId, portConf: { id: toPort } },
  };
}

/**
 * Build the starter scene: a character portrait + a location backdrop (image
 * assets) merge, a tone control scales, and the result lands in a preview sink.
 *
 * Positions are CURATED (not auto-laid-out) so the first impression is a clean
 * left-to-right creative narrative: two media inputs on the left, an intent
 * chain flowing rightward, with `compose` centred between its two inputs. A
 * curated template ships curated coordinates; auto-layout (`layoutLayered`)
 * still governs user-added nodes and arbitrary imported graphs. The scene is
 * kept compact (~1100×430) so the canvas frames it at a readable zoom rather
 * than shrinking a sparse, wide DAG.
 */
export function buildStarterFlow(): IGraph {
  const nodeList: INodeInfo[] = [
    node(
      'character',
      'image-source',
      'R',
      { x: 0, y: 0 },
      { imageUrl: IMG('1503342217505-b0a15ec3261c'), caption: 'Portrait', role: 'Character' },
    ),
    node(
      'backdrop',
      'image-source',
      'R',
      { x: 0, y: 260 },
      { imageUrl: IMG('1470071459604-3b5ec3a7fe05'), caption: 'Location', role: 'Background' },
    ),
    node('tone', 'map-scale', 'T', { x: 380, y: 330 }, { factor: 2 }),
    node('compose', 'merge', 'T', { x: 600, y: 160 }),
    node('grade', 'scan-sum', 'T', { x: 800, y: 160 }),
    node('preview', 'console-sink', 'W', { x: 990, y: 160 }),
  ];
  const connections: IConnection[] = [
    link('character', 'compose', 'A'),
    link('backdrop', 'tone'),
    link('tone', 'compose', 'B'),
    link('compose', 'grade'),
    link('grade', 'preview'),
  ];
  return { nodeList, connections };
}
