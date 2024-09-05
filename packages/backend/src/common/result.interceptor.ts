import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import * as moment from 'moment';
import { Result } from './dto/base';
import { map } from 'rxjs/operators';

@Injectable()
export default class TransformInterceptor<T> implements NestInterceptor<T, Result<T>> {
  constructor(private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Result<T>> {
    return next.handle()
      .pipe(
        map(data => { 
          const ctx = context.switchToHttp(); // 获取请求上下文中的request对象
          const request = ctx.getRequest();
          const { method, path, url, query = {}, params = {}, body = {} } = request;
          const nowTime = moment().format('YYYY-MM-DD HH:mm:ss');
          this.logger.log(
            `【${nowTime}】${method} ${url} query:${JSON.stringify(query)} params:${JSON.stringify(params)} body:${JSON.stringify(body)}`,
            `response: ${JSON.stringify(data)}`,
          );
          if (path !== '/') {
            return { success: true, data }
          } else {
            return data;
          }
        })
    );
  }
}