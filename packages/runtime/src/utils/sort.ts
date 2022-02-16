import { NODE_TYPE, IPortDesc } from '../type';
import Graph from '../core/graph';
import Node from '../node';

export default (G: Graph<IPortDesc, Node>) => {
  const r: Node[] = [];
  const t: Node[] = [];
  const w: Node[] = [];

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
    r: r,
    t: t,
    w: w,
  };
};
