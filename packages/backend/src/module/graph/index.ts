import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import GraphService from './service/graph';
import Graph from './entity/graph';



@Module({
    imports: [TypeOrmModule.forFeature([Graph])],
    providers: [GraphService],
    exports: [GraphService]
})
export default class NodeModule {}
