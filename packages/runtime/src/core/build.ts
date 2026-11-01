import { portInternals } from '../base/port';
import type { AnyNode, ReadableNode, TransformNode, WriteableNode } from '../node';
import { nodeInternals } from '../node/node';
import { NODE_TYPE, STREAM_TYPE } from '../type';
import type { IPortDesc } from '../type';

/** The nodes reachable from a Readable root, by kind, and every connection between them. */
export interface FlowGraph {
  readonly readable: readonly ReadableNode<object>[];
  readonly transform: readonly TransformNode<object>[];
  readonly writable: readonly WriteableNode<object>[];
  /** The connections leaving each node, by node id, in the order they were made. */
  readonly connections: ReadonlyMap<string, readonly IPortDesc[]>;
}

/**
 * Collects everything downstream of `root`. A worklist visits each node once
 * and each connection once, so building is O(nodes + connections), uses no
 * recursion, and needs no cycle check: a node already seen is not expanded
 * again, which also ends Transform feedback loops.
 */
export default function build(root: AnyNode): FlowGraph {
  const readable: ReadableNode<object>[] = [];
  const transform: TransformNode<object>[] = [];
  const writable: WriteableNode<object>[] = [];
  const connections = new Map<string, readonly IPortDesc[]>();
  const seen = new Set<string>();
  const pending: AnyNode[] = [];

  const discover = (node: AnyNode): void => {
    if (seen.has(node.id)) {
      return;
    }
    seen.add(node.id);
    switch (node.type) {
      case NODE_TYPE.READABLE:
        readable.push(node);
        pending.push(node);
        break;
      case NODE_TYPE.TRANSFORM:
        transform.push(node);
        pending.push(node);
        break;
      case NODE_TYPE.WRITABLE:
        writable.push(node);
        break;
    }
  };

  discover(root);
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    const outgoing: IPortDesc[] = [];
    for (const src of nodeInternals.portsOf(node, STREAM_TYPE.O)) {
      for (const dst of portInternals.peersOf(src)) {
        const target = portInternals.ownerOf(dst);
        if (target === null) {
          throw new Error(`Port "${dst.name}" is connected but not attached to a node.`);
        }
        outgoing.push({ src, dst, source: node, target });
        discover(target);
      }
    }
    connections.set(node.id, outgoing);
  }

  return { readable, transform, writable, connections };
}
