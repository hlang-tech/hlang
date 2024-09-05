import { Controller, Get, Post, Body, Put, Param, Delete, Request, Query } from '@nestjs/common';
import { ParamValidateError } from '../../../common/error';
import { WorkSpaceVo } from '../dto/workspace';
import WorkSpace from '../entity/workspace';
import WorkspaceService from '../service/workspace';

@Controller('workspace')
export default class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}  

  @Post('')
  async create(@Body() workspaceVo: WorkSpaceVo, @Request() req) {
    const { name, code, description = '', ownerId } = workspaceVo;
    const { session = {} } = req;
    const { user = {} } = session;
    const { empNo = "1", realName = "浮白" } = user; 
    if (!name) throw new ParamValidateError('name 不存在!');
    if (!code) throw new ParamValidateError('code 不存在!');
    if (!ownerId) throw new ParamValidateError('必须指定创建者!');
    const workSpaceDo = new WorkSpace();
    workSpaceDo.code = code;
    workSpaceDo.name = name;
    workSpaceDo.description = description;
    workSpaceDo.creatorId = empNo;
    workSpaceDo.creatorName = realName;

    return await this.workspaceService.create(workSpaceDo);
  }

  @Put(':id')
  async update(@Param('id') id, @Body() workspaceVo: WorkSpaceVo) {
    if (!id) new ParamValidateError('更新应用 id 不存在!');

    return await this.workspaceService.update(workspaceVo);
  }

  @Delete(':id')
  async delete(@Param('id') id) {
    if (!id) new ParamValidateError('删除应用 id 不存在!');

    return await this.workspaceService.delete(id);
  }

  @Get('')
  async list(@Query() searchParams) {
    return await this.workspaceService.list(searchParams);
  }

  @Get('getMyWorkSpace')
  async getMySpace(@Request() request) {
    const { session } = request;
    const { empNo } = session;

    return await this.workspaceService.getUserSpace(session);
  }
}
