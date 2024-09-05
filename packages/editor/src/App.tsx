import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  Controls,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  MiniMap,
  Panel,
  Node,
  Edge,
} from '@xyflow/react';

import '@xyflow/react/dist/base.css';
import Nav from './components/nav';
import TurboNode, { TurboNodeData } from './components/node/TurboNode';
import NodeList from './components/node-list';
import NodePanel from './components/node-panel';
import TurboEdge from './edges/TurboEdge';


export enum RuntimeStatus {
  ONLINE = 'online',
  OFFLINE = 'offline'
};

export enum NodeType {
  W = 'W',
  R = 'R',
  T = 'T'
}
export interface PortConf {
  id: string;
  name: string;
  dto?: {[key: string]: any}
}

export interface PortInfo {
  Input?: PortConf[];
  Output?: PortConf[];
}

export interface IPosition {
  x: number;
  y: number;
}

export interface INode {
  id: string;
  version: number;
  description: string;
  name: string;
  code: string;
  icon: string;
  type: NodeType;
  groupCode: string;
  editorResource: {[key: string]: string};
  runtimeResource: string;
  portInfo: PortInfo;
}

export interface INodeGroup {
  name: string;
  code: string;
  description: string;
  children: INode[];
}

export interface IGraphConnection {
  source: string;
  target: string;
  id: string;
}

export interface INodeInstance extends INode {
  position: IPosition;
  nodeData: { [key: string]: any };
}

export interface IGraph {
  connections: IGraphConnection[];
  nodeList: Partial<INodeInstance>[];
}

export interface IEditorProps {
  flowId: number;
  status?: RuntimeStatus;
  nodes: INodeGroup[];
  graph: IGraph;
  onSave?: () => void;
  onDeploy?: () => void;
}
const nodeTypes = {
  turbo: TurboNode,
};

const edgeTypes = {
  turbo: TurboEdge,
};

const defaultEdgeOptions = {
  type: 'turbo',
  markerEnd: 'edge-circle',
};

const Flow = (props: IEditorProps) => {
  const { nodes: nodePanel, graph, onSave, onDeploy } = props;
  const { connections = [] } = graph;
  const [currentNode, setCurrentNode] = useState<Node>();
  const [loading, setLoading] = useState({
    visible: false,
    tip: ''
  });
  const initialNodes = graph.nodeList.map(el => {
    const { id, position, nodeData } = el;
    return {
      id,
      position: {
        ...position,
        x: (position?.x || 0) + 240,
      },
      data: nodeData,
      type: 'turbo',
    }
  });
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(connections);
  const onNodeClick = useCallback(function (_event: React.MouseEvent, node: Node) {
    setCurrentNode(node);
  }, [ setCurrentNode ])
  const onConnect = useCallback(
    (params) => setEdges((els) => addEdge(params, els)),
    [],
  );
  const onPaneClick = useCallback(function() {
    setCurrentNode(undefined)
  }, [ setCurrentNode ])

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
    <ReactFlowProvider>
      <NodeList nodes={nodePanel}/>      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        fitView
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
      >
        <Panel position="top-left"><Nav onSave={onSave} onPublish={onDeploy}/></Panel>
        <Controls showInteractive={false} />
        <MiniMap zoomable pannable />
        <svg>
          <defs>
            <linearGradient id="edge-gradient">
              <stop offset="0%" stopColor="#ae53ba" />
              <stop offset="100%" stopColor="#2a8af6" />
            </linearGradient>

            <marker
              id="edge-circle"
              viewBox="-5 -5 10 10"
              refX="0"
              refY="0"
              markerUnits="strokeWidth"
              markerWidth="10"
              markerHeight="10"
              orient="auto"
            >
              <circle stroke="#2a8af6" strokeOpacity="0.75" r="2" cx="0" cy="0" />
            </marker>
          </defs>
        </svg>
      </ReactFlow>
      {
        currentNode && (
          <NodePanel
            nodeList={graph.nodeList}
            flow_id={1}
            currentNode={currentNode}
            setLoading={setLoading}
          />  
        )
      }
    
    </ReactFlowProvider>
    </div>
  );
};

export default Flow;
