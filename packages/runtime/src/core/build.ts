import type { IPortDesc } from '../type';
import { NODE_TYPE, STREAM_TYPE } from '../type';
import type { AnyNode } from '../node';
import { Edge, Vertex } from './graph';
import type Graph from './graph';

/**
 * Adds `root` and everything downstream of it to `graph`: a vertex per node
 * and an edge per connection. A connection that closes a cycle is recorded
 * but not followed again, so Transform feedback loops terminate.
 */
const build = (graph: Graph<IPortDesc, AnyNode>): ((root: AnyNode) => void) => {
  const visit = (root: AnyNode): void => {
    graph.addVertex(new Vertex(root));

    for (const out of Object.values(root.portMap.get(STREAM_TYPE.O))) {
      for (const peer of out.peers) {
        const target = peer.node;
        if (target === null) {
          throw new Error(`Port "${peer.name}" is connected but not attached to a node.`);
        }
        graph.addVertex(new Vertex(target));
        graph.addEdge(new Edge(root, target, { src: out, dst: peer }));

        // T <-> T
        if (graph.isCircled(root, target)) {
          continue;
        }

        if (target.type === NODE_TYPE.TRANSFORM) {
          visit(target);
        }
      }
    }
  };
  return visit;
};

export default build;
