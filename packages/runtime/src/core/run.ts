import type Flow from '../base/flow';
import type { AnyNode } from '../node';
import type { IPortDesc } from '../type';
import type { ISortedNodeMap } from '../utils/sort';
import type Graph from './graph';

/**
 * Runs the sorted nodes of `graph`: every connection becomes a subscription
 * from its output to its input, then each node starts once. Writables start
 * first and Readables last, so every subscriber exists before a source sends.
 */
const run = (graph: Graph<IPortDesc, AnyNode>): ((sorted: ISortedNodeMap, flow: Flow) => void) => {
  return (sorted: ISortedNodeMap, flow: Flow): void => {
    const pipe = (edge: IPortDesc): void => {
      const { src, dst } = edge;
      const key = `${src.id}@${dst.id}`;

      // The same connection is never subscribed twice.
      if (flow.cache.has(key)) return;

      src.receive((message) => {
        dst.send(message);
      });

      flow.cache.set(key, edge);
    };

    const pipeFrom = (node: AnyNode): void => {
      for (const edge of graph.edgesFrom(node.id)) {
        pipe(edge);
      }
    };

    // W
    for (const node of sorted.w) {
      node.attach(flow);
      node.executeOnce(() => {
        node._write(node.I);
      });
    }

    // T
    for (const node of sorted.t) {
      node.attach(flow);
      pipeFrom(node);
      node.executeOnce(() => {
        node._transform(node.I, node.O);
      });
    }

    // R
    for (const node of sorted.r) {
      node.attach(flow);
      pipeFrom(node);
      node.executeOnce(() => {
        node._read(node.O);
      });
    }
  };
};

export default run;
