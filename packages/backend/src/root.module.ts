import { Module } from '@nestjs/common';
import config from './config';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import NodeModule from './module/node';
import WorkspaceMmodule from './module/workspace';
import FlowModule from './module/flow';
import ConsoleModule from './module/console';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';



const { mysql } = config();
const { host, port, user, password, database } = mysql;
const OrmModule = TypeOrmModule.forRoot({
  type: 'mysql',
  host,
  port,
  username: user,
  password,
  database,
  // entities: ["dist/**/*.entity{.ts,.js}"],
  namingStrategy: new SnakeNamingStrategy(),
  autoLoadEntities: true,
  synchronize: true,
});

@Module({
  imports: [ 
    ConfigModule.forRoot({
      load: [config],
    }),
    OrmModule,
    NodeModule,
    FlowModule,
    WorkspaceMmodule,
    ConsoleModule
   ],
})
export class AppModule {
}
