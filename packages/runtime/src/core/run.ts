import { IPortDesc  } from '../type';
import Graph from './graph';
import Node from '../node';
import Flow from '../base/flow';

export interface ISortedNodeMap {
  r: Node[];
  w: Node[];
  t: Node[];
}

const run = (G: Graph<IPortDesc, Node>) => {
  return (sortedNodes: ISortedNodeMap, flow: Flow) => {
    const adjList = G.adjList;

    const edges = (id) => {
      return adjList.getRow(id);
    };

    const pipe = (edge) => {
      const { src: _src, dst: _dst } = edge;
      const _cacheKey = `${_src.id}@${_dst.id}`;

      // 相同的边不能重复订阅
      if (flow.cache.has(_cacheKey)) return;

      _src.on((msg) => {
        _dst.send(msg);
      });

      flow.cache.set(_cacheKey, edge);
    };

    const pipeWithEdges = (_pipe) => (_edges: Map<string, IPortDesc>) => {
      for (const [_k, edge] of _edges) {
        _pipe(edge);
      }
    };

    const _p = pipeWithEdges(pipe);

    // W
    sortedNodes.w.forEach((node) => {
      node.attach(flow);

      const executeOnce = node.executeOnce.bind(node, 'write', node.I);

      executeOnce();
    });

    // T
    sortedNodes.t.forEach((node) => {
      node.attach(flow);

      _p(edges(node.id) as Map<string, IPortDesc>);

      const executeOnce = node.executeOnce.bind(
        node,
        'transform',
        node.I,
        node.O,
      );

      executeOnce();
    });

    // R
    sortedNodes.r.forEach((node) => {
      node.attach(flow);

      _p(edges(node.id) as Map<string, IPortDesc>);

      const executeOnce = node.executeOnce.bind(node, 'read', node.O);

      executeOnce();
    });
  };
};

export default run;
