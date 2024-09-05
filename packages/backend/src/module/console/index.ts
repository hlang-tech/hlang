import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import config from '../../config';
import ConsoleController from './controller/console';

@Module({
  imports: [ 
    ConfigModule.forRoot({
      load: [config],
    }),
   ],
    controllers: [ConsoleController],
    providers: [],
    exports: []
})
export default class ConsoleModule {}
