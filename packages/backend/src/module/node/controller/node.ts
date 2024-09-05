import { Controller, Get, Post, Body, Put, Param, Delete, Request, Query } from '@nestjs/common';
import { ParamValidateError } from '../../../common/error';
import { NodeVo, NodeGroupVo } from '../dto/node';
import NodeService from '../service/node';

@Controller('node')
export default class ChannelController {
  constructor(private readonly nodeService: NodeService) {}  

  @Post('publish')
  async publish(@Body() node: NodeVo, @Request() req) {
    const { session = {} } = req;
    const { user = { empNo: "1", realName: "浮白" } } = session;
    const { name, code, type, editorResource, groupCode, runtimeResource, portInfo } = node;

    if (!name) throw new ParamValidateError('必须指定节点名称!');
    if (!code) throw new ParamValidateError('必须指定节点编码!');
    if (!type) throw new ParamValidateError('必须指定节点类型!');
    if (!groupCode) throw new ParamValidateError('必须指定节点分组!');
    if (!editorResource) throw new ParamValidateError('必须指定编辑器资源!');
    if (!runtimeResource) throw new ParamValidateError('必须指定运行时资源!');
    if (!portInfo) throw new ParamValidateError('必须指定节点端口信息!');

    return await this.nodeService.publish(node, user);
  }


  @Get('')
  async list(@Query('workspaceCode') workspaceCode: string) {
    return await this.nodeService.list(workspaceCode || 'public');
  }

  @Get('getByCode')
  async getByCode(@Query('code') code: string) {
    return await this.nodeService.getByCode(code);
  }


  @Post('/group/add')
  async addGroup(@Body() nodeGroup: NodeGroupVo) {
    const { name, code } = nodeGroup;
    if (!name) throw new ParamValidateError('必须指定节点名称!');
    if (!code) throw new ParamValidateError('必须指定节点编码!');
    return await this.nodeService.addGroup(nodeGroup);
  }

  @Delete('/group/remove/:id')
  async removeGroup(@Param() id: number) {
    return await this.nodeService.removeGroup(id);
  }

  @Put('/group/update/:id')
  async updateGroup(@Param() id: number, @Body() nodeGroup: Partial<NodeGroupVo>) {
    if (!id) throw new ParamValidateError('必须指定要更新的分组 id!');
    nodeGroup.id = id;
    return await this.nodeService.updateGroup(nodeGroup);
  }

  @Get('group')
  async listGroup() {
    return await this.nodeService.listGroup();
  }
}
