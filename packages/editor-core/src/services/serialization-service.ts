/**
 * `SerializationService` — the codec between the editor model and hlang's
 * `IGraph` IR.
 *
 * The direction invariant is enforced here: an `EditorEdge { source, target }`
 * becomes `{ Output: source, Input: target }`, and conversely an `IGraph`
 * connection's `Output` becomes the edge source and `Input` the edge target.
 */

import type {
  IConnection,
  IGraph,
  INodeInfo,
} from '@hlang-org/interpreter';
import type {
  EdgeBounds,
  EditorEdge,
  EditorNode,
  GraphSnapshot,
  ParamBag,
  PortDescriptor,
} from '../model/types';
import type { IGraphModel } from './interfaces';
import type { ISerializationService } from './serialization-interface';

export class SerializationService implements ISerializationService {
  toIGraph(model: IGraphModel): IGraph {
    const nodeList = model.getNodes().map(nodeToInfo);
    const connections = model.getEdges().map(edgeToConnection);
    return { nodeList, connections };
  }

  fromIGraph(graph: IGraph): GraphSnapshot {
    const nodes = graph.nodeList.map(infoToNode);
    const edges = graph.connections.map(connectionToEdge);
    return { nodes, edges };
  }
}

function nodeToInfo(node: EditorNode): INodeInfo {
  return {
    code: node.code,
    name: node.name,
    type: node.kind,
    nodeId: node.id,
    bizData: { params: node.params },
    position: node.position,
    portInfo: portInfoOf(node.ports),
  };
}

function portInfoOf(ports: readonly PortDescriptor[]): NonNullable<INodeInfo['portInfo']> {
  const input: Record<string, unknown>[] = [];
  const output: Record<string, unknown>[] = [];
  for (const port of ports) {
    const entry: Record<string, unknown> = { id: port.id, name: port.name };
    if (port.direction === 'I') {
      input.push(entry);
    } else {
      output.push(entry);
    }
  }
  return { Input: input, Output: output };
}

/** Edge -> connection: source is Output (upstream), target is Input (downstream). */
function edgeToConnection(edge: EditorEdge): IConnection {
  return {
    Output: { nodeId: edge.source.nodeId, portConf: { id: edge.source.portId } },
    Input: { nodeId: edge.target.nodeId, portConf: { id: edge.target.portId } },
    ...boundsOf(edge),
  };
}

/** A connection's or an edge's capacity and overflow, without absent fields. */
function boundsOf(from: { readonly capacity?: number; readonly overflow?: EditorEdge['overflow'] }): EdgeBounds {
  return {
    ...(from.capacity === undefined ? {} : { capacity: from.capacity }),
    ...(from.overflow === undefined ? {} : { overflow: from.overflow }),
  };
}

function infoToNode(info: INodeInfo): EditorNode {
  const params = paramsOf(info);
  return {
    id: info.nodeId,
    code: info.code,
    kind: info.type,
    name: info.name,
    position: info.position ?? { x: 0, y: 0 },
    params,
    ports: portsOf(info),
  };
}

function paramsOf(info: INodeInfo): ParamBag {
  const params = info.bizData?.params;
  return params ?? {};
}

function portsOf(info: INodeInfo): readonly PortDescriptor[] {
  const ports: PortDescriptor[] = [];
  const inputs = info.portInfo?.Input ?? [];
  const outputs = info.portInfo?.Output ?? [];
  for (const raw of inputs) {
    ports.push(portFromRaw(raw, 'I'));
  }
  for (const raw of outputs) {
    ports.push(portFromRaw(raw, 'O'));
  }
  return ports;
}

function portFromRaw(
  raw: Readonly<Record<string, unknown>>,
  direction: 'I' | 'O',
): PortDescriptor {
  const id = typeof raw.id === 'string' ? raw.id : direction === 'I' ? 'Input' : 'Output';
  const name = typeof raw.name === 'string' ? raw.name : id;
  return {
    id,
    direction,
    name,
    dataType: { name: 'DTO', kind: 'unknown', raw },
    isError: id === '@node/error',
  };
}

/** connection -> edge: Output is source, Input is target. */
function connectionToEdge(connection: IConnection, index: number): EditorEdge {
  const sourcePortId = connection.Output.portConf?.id ?? 'Output';
  const targetPortId = connection.Input.portConf?.id ?? 'Input';
  return {
    id: `edge-${String(index + 1)}`,
    source: { nodeId: connection.Output.nodeId, portId: sourcePortId },
    target: { nodeId: connection.Input.nodeId, portId: targetPortId },
    ...boundsOf(connection),
  };
}
