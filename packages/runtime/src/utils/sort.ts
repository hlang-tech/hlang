import type Graph from '../core/graph';
import type { AnyNode, ReadableNode, TransformNode, WriteableNode } from '../node';
import { NODE_TYPE } from '../type';
import type { IPortDesc } from '../type';

/** The nodes of a graph, by kind. */
export interface ISortedNodeMap {
  readonly r: ReadableNode<object>[];
  readonly t: TransformNode<object>[];
  readonly w: WriteableNode<object>[];
}

export default (graph: Graph<IPortDesc, AnyNode>): ISortedNodeMap => {
  const sorted: ISortedNodeMap = { r: [], t: [], w: [] };
  for (const { data: node } of graph.vertices.values()) {
    switch (node.type) {
      case NODE_TYPE.READABLE:
        sorted.r.push(node);
        break;
      case NODE_TYPE.TRANSFORM:
        sorted.t.push(node);
        break;
      case NODE_TYPE.WRITABLE:
        sorted.w.push(node);
        break;
    }
  }
  return sorted;
};
