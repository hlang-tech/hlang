import { NODE_TYPE, STREAM_TYPE, IPortDesc } from '../type';
import Node from '../node';
import Graph, { Vertex, Edge } from './graph';

const build = (G: Graph<IPortDesc, Node>) => {
  return (_rootNode) => {
    G.addVertex(new Vertex(_rootNode));

    const outs = _rootNode.portMap.get(STREAM_TYPE.O);

    for (const outPortName in outs) {
      const outPort = _rootNode.O(outPortName);
      const peers = outPort.peers;

      for (let k = 0, len = peers.length; k < len; k++) {
        const peer = peers[k];

        G.addVertex(new Vertex(peer.node));
        G.addEdge(new Edge(_rootNode, peer.node, { src: outPort, dst: peer }));

        // T <-> T
        if (G.isCircled(_rootNode, peer.node)) {
          continue;
        }

        if (peer.node.type === NODE_TYPE.TRANSFORM) {
          build(G)(peer.node);
        }
      }
    }
  };
};

export default build;
