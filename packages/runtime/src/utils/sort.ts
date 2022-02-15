import { NODE_TYPE } from "../type";
import { IPortDesc  } from "../type";
import Graph from "../core/graph";
import Node from '../node';

export default (G: Graph<IPortDesc, Node>) => {
  let r: Node[] = [],
    t: Node[] = [],
    w: Node[] = [];

  const vertices = G.vertices;
  for (const [_, v] of vertices) {
    const node = v.data;
    if (node.type === NODE_TYPE.READABLE) {
      r.push(node);
    } else if (node.type === NODE_TYPE.TRANSFORM) {
      t.push(node);
    } else if (node.type === NODE_TYPE.WRITABLE) {
      w.push(node);
    }
  }

  return {
    r,
    t,
    w,
  };
};

