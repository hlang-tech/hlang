import Graph from '../../graph/entity/graph';
import FlowOps from '../entity/flowOps';
import OperateRecord from '../entity/operateRecord';
import Flow from '../entity/flow';


export class FlowDto extends Flow {
  ops?: FlowOps;
  operateRecords: OperateRecord[];
  graph: Graph;
}

export interface FlowVo {
  id?: number;
  name: string;
  code: string;
  description?: string;
  workspace: string;
  config: {[key: string]: any};
}

export interface GraphVo {
  flowId: number;
  connections: {[key: string]:any}[];
  nodeDeps: {[key: string]: any}[];
}