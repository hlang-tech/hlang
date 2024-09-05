import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection, In, EntityManager } from 'typeorm';
import Node, { NodeType } from '../entity/node';
import OperateRecord, { OperateType } from '../entity/operateRecord';
import NodeGroup from '../entity/nodeGroup';
import WorkSpaceNodeRelation from '../entity/workspaceNodeRelation';
import { NodeGroupVo, NodeVo, NodeDto, GroupedNodeDto } from '../dto/node';
import { User } from '../../../common/dto/user';
import { NotFoundError, ParamValidateError, TransactionError } from '../../../common/error';


@Injectable()
export default class NodeService {
  constructor(
    @InjectRepository(Node) private nodeRepository:  Repository<Node>,
    @InjectRepository(NodeGroup) private nodeGroupRepository: Repository<NodeGroup>,
    @InjectRepository(OperateRecord) private operateRecordRepository: Repository<OperateRecord>,
    @InjectRepository(WorkSpaceNodeRelation)  private workspaceNodeRelationRepository: Repository<WorkSpaceNodeRelation>,
    ) {
  }

  async addOperationRecord(nodeId: number, type: OperateType, user: User, manager: EntityManager): Promise<OperateRecord>{
    const { empNo, realName } = user;
    const record = new OperateRecord();
    record.nodeId = nodeId;
    record.type = type;
    record.operatorId = empNo;
    record.operatorName = realName;

    return await manager.save<OperateRecord>(record);
  }

  async publish(nodeVo: NodeVo, user: User): Promise<NodeDto> {
    const connection = getConnection();
    const queryRunner = connection.createQueryRunner();
    await queryRunner.startTransaction();
    const { code, name, icon = '', groupCode, description = '', type, 
      editorResource, runtimeResource, portInfo, workspace = "public" } = nodeVo;
    const exist = await this.nodeRepository.findOne({ where: { code }, cache: true });
    if (![NodeType.READABLE, NodeType.WRITABLE, NodeType.TRANFORTABLE].includes(type as NodeType)) throw new ParamValidateError(`类型${type}非法!`);
    const nodeGroup = await this.nodeGroupRepository.findOne({ where: { code: groupCode } });
    if (!nodeGroup) throw new NotFoundError(`未找到节点分组 ${nodeGroup}`);

    try {
      let node = exist;
      if (exist) {
        node.name = name;
        node.icon = icon;
        node.description = description;
        node.type = type as NodeType;
        node.editorResource = editorResource;
        node.runtimeResource = runtimeResource;
        node.portInfo = portInfo;
        node.groupCode = groupCode;
        node.version = exist.version + 1;
      } else {
        node = new Node();
        node.code = code;
        node.name = name;
        node.icon = icon;
        node.description = description;
        node.type = type as NodeType;
        node.editorResource = editorResource;
        node.runtimeResource = runtimeResource;
        node.portInfo = portInfo;
        node.groupCode = groupCode;
        node.version = 1;
      }


      console.log(node);
      const record = await queryRunner.manager.save<Node>(node);
      const relation = new WorkSpaceNodeRelation();
      relation.nodeId = record.id;
      relation.workspaceCode = workspace;

      await this.addOperationRecord(record.id, OperateType.PUBLISH, user, queryRunner.manager);
      await queryRunner.manager.save<WorkSpaceNodeRelation>(relation);
      await queryRunner.commitTransaction();
      
      const item = new NodeDto();
      item.id = record.id;
      item.code = record.code;
      item.group = nodeGroup;
      
      return item;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new TransactionError(err.message);
    } finally {
      await queryRunner.release();
    }
  }

  public async getByIds(ids: number[]) {
    return await this.nodeRepository.find({
      where: {
        id: In(ids),
      },
      cache: true
    })
  }

  public async list(workspaceCode: string): Promise<GroupedNodeDto[]> {
    const relations = await this.workspaceNodeRelationRepository.find({
      where: { workspaceCode },
      cache: true
    });
    const nodeGroup = await this.listGroup();
    const nodeIds = relations.map(el => el.nodeId);
    const nodes = await this.nodeRepository.find({
      where: { id: In(nodeIds) },
      cache: true
    });

    const groupedNodes: GroupedNodeDto[] = [];
    for (const group of nodeGroup) {
      const { code, name, description } = group;
      const groupDto = new GroupedNodeDto();
      groupDto.code = code;
      groupDto.name = name;
      groupDto.description = description;
      groupDto.nodes = nodes.filter(el => el.groupCode === code);

      groupedNodes.push(groupDto);
    }

    return groupedNodes;
  }

  async getByCode(code: string): Promise<Node> {
    return await this.nodeRepository.findOne({
      where: { code },
      cache: true
    })
  } 

  public async delete(id) {
    const connection = getConnection();
    const queryRunner = connection.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.delete(OperateRecord, { nodeId: id });
      await queryRunner.manager.delete(Node, id);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new TransactionError(err.message);
    } finally {
      await queryRunner.release();
    }
  }

  async listGroup(): Promise<NodeGroup[]> {
    return await this.nodeGroupRepository.find({
      cache: true
    });
  }

  async addGroup(group: NodeGroupVo) {
    const { code, name, description } = group;
    const nodeGroup = new NodeGroup();
    nodeGroup.code = code;
    nodeGroup.name = name;
    nodeGroup.description = description;

    return await this.nodeGroupRepository.save(nodeGroup);
  }

  async removeGroup(id: number) {
    await this.nodeGroupRepository.delete(id);
  }

  async updateGroup(group: Partial<NodeGroupVo>) {
    const { id, name, description } = group;
    const nodeGroup = await this.nodeGroupRepository.findOne({ where: { id }, cache: true });
    if (name) {
      nodeGroup.name = name;
    }
    if (description) {
      nodeGroup.description = description;
    }

    return await this.nodeGroupRepository.save(nodeGroup);
  }
}
