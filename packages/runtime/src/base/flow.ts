import build from '../core/build';
import Graph from '../core/graph';
import run from '../core/run';
import type { AnyNode } from '../node';
import { NODE_TYPE } from '../type';
import type { IPortDesc } from '../type';
import sort from '../utils/sort';

/** Options a flow is created with; nodes can read them through `node.flow`. */
export type FlowOptions = Readonly<Record<string, unknown>>;

/** Runs a graph of nodes from a Readable root. */
export default class Flow {
  readonly opts: FlowOptions;
  /** The connections already wired, by output and input port id. */
  readonly cache = new Map<string, IPortDesc>();

  constructor(opts: FlowOptions = {}) {
    this.opts = opts;
  }

  /** Builds the graph downstream of `root`, wires it, and starts every node once. */
  run(root: AnyNode): void {
    if (root.type !== NODE_TYPE.READABLE) {
      throw new Error('Flow must run with a READABLE node.');
    }
    const graph = new Graph<IPortDesc, AnyNode>();
    build(graph)(root);
    run(graph)(sort(graph), this);
  }
}
