import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import NodeService from './service/node';
import NodeController from './controller/node';
import Node from './entity/node';
import NodeGroup from './entity/nodeGroup';
import OperateRecord from './entity/operateRecord';
import WorkSpaceNodeRelation from './entity/workspaceNodeRelation'


@Module({
    imports: [TypeOrmModule.forFeature([OperateRecord, NodeGroup, Node, WorkSpaceNodeRelation])],
    controllers: [NodeController],
    providers: [NodeService],
    exports: [NodeService]
})
export default class NodeModule {}
