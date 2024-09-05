import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import WorkspaceController from './controller/workspace';
import WorkspaceService from './service/workspace';
import WorkSpace from './entity/workspace';
import MyWorkSpaceRecord from './entity/myWorkspaceRecord';

@Module({
    imports: [TypeOrmModule.forFeature([WorkSpace, MyWorkSpaceRecord])],
    controllers: [WorkspaceController],
    providers: [WorkspaceService],
    exports: [WorkspaceService]
})
export default class WorkspaceModule {}
