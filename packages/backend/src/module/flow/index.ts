import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import FlowService from './service/flow';
import FlowController from './controller/flow';
import Flow from './entity/flow';
import Graph from '../graph';
import OperateRecord from './entity/operateRecord';
import Manager from '../../common/manager';
import FlowOps from './entity/flowOps';
import Node from '../node'
import WorkSpaceFlowRelation from './entity/workspaceFlowRelation';

const PM = new Manager();


@Module({
    imports: [TypeOrmModule.forFeature([OperateRecord, Flow, FlowOps, WorkSpaceFlowRelation]), Graph, Node],
    providers: [FlowService, { provide: Manager, useValue: PM } ],
    controllers: [FlowController],
    exports: [FlowService]
})
export default class NodeModule {}
