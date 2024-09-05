import { Controller, Get, Post, Body, Put, Param, Delete, Request, Query } from '@nestjs/common';
import { ParamValidateError } from '../../../common/error';
import { FlowVo, GraphVo } from '../dto/flow';
import FlowService from '../service/flow';

@Controller('flow')
export default class ChannelController {
  constructor(private readonly flowService: FlowService) {}  
  @Get('get')
  async get(@Query('id') flowId: number) {
    return await this.flowService.getById(flowId);
  }


  @Post('')
  async create(@Body() flow: FlowVo) {
    const { name, code, workspace = "public" } = flow;
    if (!name) throw new ParamValidateError('必须指定流程名称!');
    if (!code) throw new ParamValidateError('必须指定流程编码!');
    return await this.flowService.create(flow);
  }

  @Post('updateNodeVersion')
  async updateVersion(@Body('flowId') flowId: number) {
    if (!flowId) throw new ParamValidateError('必须指定流程 id !');
    return await this.flowService.updateNodeVersion(flowId);
  }


  @Delete(':id')
  async remove(@Param() id: number) {
    return await this.flowService.delete(id);
  }

  @Post('deploy')
  async deploy(@Body('flowId') flowId: number) {
    if (!flowId) throw new ParamValidateError('必须指定流程 id!');
    return await this.flowService.deploy(flowId);
  }


  @Post('/arrange')
  async arrange(@Body() graph: GraphVo, @Request() req) {
    const { flowId } = graph;
    const { session = {} } = req;
    const { user = { empNo: "1", realName: "浮白" } } = session;
    if (!flowId) throw new ParamValidateError('必须指定流程 id');
    return await this.flowService.arrange(flowId, graph, user);
  }

  @Get('')
  async list(@Query() query) {
    return await this.flowService.list(query);
  }
}
