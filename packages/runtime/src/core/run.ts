// import * as assert from "assert";
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
    // const { traceManager } = flow;

    const edges = id => {
      return adjList.getRow(id);
    };

    const pipe = edge => {
      const { src: _src, dst: _dst } = edge;
      const _cacheKey = `${_src.id}@${_dst.id}`;

      // 相同的边不能重复订阅
      if (flow.cache.has(_cacheKey)) return;

      _src.on(msg => {
        // assert(typeof msg === "object", "msg must be object.");

        // flow.asyncLocalStorage.enterWith({
        //   src: _src.node,
        //   dst: _dst.node
        // });

        // const { _traceId, payload, ...args } = msg;

        // if (_traceId && traceManager) {
        //   msg._traceId = traceManager.exchangeTraceId(_traceId, {
        //     in_cn: _src._node.constructor.name,
        //     in_n: _src._name,
        //     in_cid: _src._node.opts.nodeId,
        //     out_cn: _dst._node.constructor.name,
        //     out_n: _dst._name,
        //     out_cid: _dst._node.opts.nodeId,
        //     payload,
        //     extraArg: args,
        //     _timestamp: moment().format("YYYY_MM_D HH:mm:ss"),
        //   });

        //   _dst._node._orginTraceId = msg._traceId;
        // }
        _dst.send(msg);
      });

      flow.cache.set(_cacheKey, edge);
    };

    const pipeWithEdges = _pipe => (_edges: Map<string, IPortDesc>) => {
      for (const [_k, edge] of _edges) {
        _pipe(edge);
      }
    };

    const _p = pipeWithEdges(pipe);

    // W
    sortedNodes.w.forEach(node => {
      node.attach(flow);

      const executeOnce = node.executeOnce.bind(node, 'write', node.I);

      executeOnce();
    });

    // T
    sortedNodes.t.forEach(node => {
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
    sortedNodes.r.forEach(node => {
      node.attach(flow);

      _p(edges(node.id) as Map<string, IPortDesc>);

      const executeOnce = node.executeOnce.bind(node, 'read', node.O);

      executeOnce();
    });
  };
};

export default run;
