import Graph from '../core/graph';
import run from '../core/run';
import build from '../core/build';
import sort from "../utils/sort";
import { IPortDesc } from "../type";
import Node from '../node';
import { NODE_TYPE } from "../type";

const Runner = (node, flow) => {
  const graph = new Graph<IPortDesc, Node>(true);

  return {
    run() {
      // step 1: build graph with root-node
      build(graph)(node);
      // step 2: run graph with sorted nodes
      run(graph)(sort(graph), flow);
    },
  };
};

export default class Flow {
  opts: {[key: string]:any};
  cache: Map<string, any>;
  

  constructor(opts = {}) {
    this.opts = opts;
    this.cache = new Map();
  }

  run(rootNode) {
    if (rootNode.type !== NODE_TYPE.READABLE) {
      throw new Error("Flow must run with a READABLE node.");
    }

    const runner = Runner(rootNode, this);
    runner.run();
  }
}

