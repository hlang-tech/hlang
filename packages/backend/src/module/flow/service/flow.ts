import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection, In, EntityManager } from 'typeorm';
import Flow from '../entity/flow';
import OperateRecord from '../entity/operateRecord';
import FlowOps from '../entity/flowOps';
import Manager from '../../../common/manager';
import WorkSpaceFlowRelation from '../entity/workspaceFlowRelation';
import { FlowDto, GraphVo, FlowVo } from '../dto/flow';
import { User } from '../../../common/dto/user';
import GraphService from '../../graph/service/graph';
import NodeService from '../../node/service/node';
import Graph from '../../graph/entity/graph';
import { NotFoundError, ParamValidateError, TransactionError } from '../../../common/error';


@Injectable()
export default class FlowService {


  constructor(
    @InjectRepository(Flow) private flowRepository:  Repository<Flow>,
    @InjectRepository(OperateRecord) private operateRecordRepository: Repository<OperateRecord>,
    @InjectRepository(FlowOps)  private flowOpsRepository: Repository<FlowOps>,
    @InjectRepository(WorkSpaceFlowRelation)  private workspaceFlowRelationRepository: Repository<WorkSpaceFlowRelation>,
    @Inject(GraphService) private graphService: GraphService,
    @Inject(NodeService) private nodeService: NodeService,
    @Inject(Manager) private pm: Manager
    ) {
  }

  // async addOperationRecord(nodeId: number, type: string, user: User, manager: EntityManager): Promise<OperateRecord>{
  //   const { empNo, realName } = user;
  //   const record = new OperateRecord();
  //   record.nodeId = nodeId;
  //   record.type = type;
  //   record.operatorId = empNo;
  //   record.operatorName = realName;

  //   return await manager.save<OperateRecord>(record);
  // }


  async deploy(flowId: number) {
    const flow = await this.getById(flowId);
    if (!flow.graph) throw new NotFoundError(`流程不存在对应图！`);

    const graphInfo = {
      id: flowId,
      graphInfo: flow.graph
    }
    await this.pm.deploy(graphInfo);
  }

  async arrange(flowId: number, graphVo: GraphVo, user: User): Promise<FlowDto> {
    const connection = getConnection();
    const queryRunner = connection.createQueryRunner();
    await queryRunner.startTransaction();
    const { connections, nodeDeps } = graphVo;
    const flow = await this.flowRepository.findOne({ where: { id: flowId }, cache: true });
    if (!flow) throw new NotFoundError(`不存在 id 为${flowId}的流程!`);
    try {  
      const graph = new Graph();
      graph.flowId = flowId;
      graph.connections = connections;
      graph.nodeDeps = nodeDeps;
  
      const graphDo = await this.graphService.create(graph, queryRunner.manager);
      await queryRunner.commitTransaction();
      const flowDto = new FlowDto();
      flowDto.name = flow.name;
      flowDto.code = flow.code;
      flowDto.description = flow.description;
      flowDto.graph = graphDo;
      flowDto.operateRecords = [];
      
      return flowDto;


    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new TransactionError(err.message);
    } finally {
      await queryRunner.release();
    } 
  }

  async updateNodeVersion(id: number) {
    const flow = await this.flowRepository.findOne({
      where: { id },
    });
    if (!flow) throw new NotFoundError(`不存在 id 为${id}的流程!`);
    const graph = await this.graphService.getLatest(id);
    const { nodeDeps } = graph;
    const nodeIds = nodeDeps.map(el => el.id);
    const nodes = await this.nodeService.getByIds(nodeIds);
    for (const nodeDep of nodeDeps) {
      const { id } = nodeDep;
      const match = nodes.find(el => el.id === id);

      nodeDep.editorResource = match.editorResource;
      nodeDep.runtimeResource = match.runtimeResource;
    }

    await this.graphService.create(graph);
  }

  async create(flowVo: FlowVo): Promise<Flow> {
    const { code, name, description, config = {}, workspace = "public" } = flowVo;
    const flow = new Flow();
    flow.name = name;
    flow.code = code;
    flow.config = config;
    flow.description = description;
    const record = await this.flowRepository.save(flow);
    const relation = new WorkSpaceFlowRelation();
    relation.flowId = record.id;
    relation.workspaceCode = workspace;

    await this.workspaceFlowRelationRepository.save(relation)

    return record;
  }

  public async list(query): Promise<Flow[]> {
    const { workspace = "public" } = query;
    const relations = await this.workspaceFlowRelationRepository.find({
      where: { workspaceCode: workspace },
      cache: true
    });
    const flowIds = relations.map(el => el.flowId);
    const flows = await this.flowRepository.find({
      where: { id: In(flowIds) },
      cache: true
    });

    return flows;
  }

  async getById(id: number): Promise<FlowDto> {
    const flow = await this.flowRepository.findOne({
      where: { id }
    });
    if (!flow) throw new NotFoundError(`不存在 id 为${id}的流程!`);
    const graph = await this.graphService.getLatest(id);
    const flowDto = new FlowDto();
    flowDto.name = flow.name;
    flowDto.code = flow.code;
    flowDto.description = flow.description;
    flowDto.graph = graph;
    flowDto.operateRecords = [];
    
    return flowDto;
  } 

  public async delete(id) {
    const connection = getConnection();
    const queryRunner = connection.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.delete(WorkSpaceFlowRelation, { flowId: id });
      await queryRunner.manager.delete(Flow, id);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new TransactionError(err.message);
    } finally {
      await queryRunner.release();
    }
  }
}
