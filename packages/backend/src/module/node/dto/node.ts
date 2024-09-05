import Node from '../entity/node';
import NodeGroup from '../entity/nodeGroup';
import OperateRecord from '../entity/operateRecord';

export interface PortConf {
  id: string;
  name: string;
  dto: {[key: string]: any}
}

export interface PortInfo {
  Input: PortConf[];
  Output: PortConf[];
}

export interface NodeVo {
  name: string;
  code: string;
  icon: string; 
  description: string;
  type: string;
  groupCode: string;
  editorResource: {[key: string]: string};
  runtimeResource: string;
  portInfo: PortInfo;
  workspace?: string;
}

export interface QueryNodeVo {
  workspaceId: number; 
}

export interface NodeGroupVo {
  id?: number;
  name: string;
  code: string;
  description: string;
}

export class GroupedNodeDto extends NodeGroup {
  nodes: Node[];
}

export class NodeDto extends Node {
  group: NodeGroup;
  operateRecords?: OperateRecord[];
}