import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as moment from 'moment';
import { Result } from './dto/base';

@Catch()
export default class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp(); // 获取请求上下文
    const request = ctx.getRequest(); // 获取请求上下文中的request对象
    const response = ctx.getResponse(); // 获取请求上下文中的response对象
    const status = HttpStatus.OK; // 获取异常状态码
    // 设置错误信息
    const message = exception.message
      ? exception.message
      : `${status >= 500 ? '服务器错误（Service Error）' : '客户端错误（Client Error）'}`;

    const nowTime = moment().format('YYYY-MM-DD HH:mm:ss');
    const errorResponse: Result<{}> = {
      success: false,
      data: {},
      message,
      code: exception.code || -1,
    };
    // 将异常记录到logger中
    this.logger.error(exception.stack);

    this.logger.error(
      `【${nowTime}】${request.method} ${request.url} query:${JSON.stringify(request.query)} params:${JSON.stringify(
        request.params,
      )} body:${JSON.stringify(request.body)}`,
      JSON.stringify(errorResponse),
      'HttpExceptionFilter',
    );
    // 设置返回的状态码， 请求头，发送错误信息
    response.status(status);
    response.header('Content-Type', 'application/json; charset=utf-8');
    response.send(errorResponse);
  }
}