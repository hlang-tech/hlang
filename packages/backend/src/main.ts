import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './root.module';
import { join } from 'path';
import ResultInterceptor from './common/result.interceptor';

async function bootstrap() {
  const logger = new Logger();
  
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, 'public'));
  app.setBaseViewsDir(join(__dirname, './views'));
  app.setViewEngine('hbs');
  app.useGlobalInterceptors(new ResultInterceptor(logger));
  await app.listen(7002);
}
bootstrap();
