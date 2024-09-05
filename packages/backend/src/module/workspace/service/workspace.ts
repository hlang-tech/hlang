import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import WorkSpace from '../entity/workspace';
import MyWorkSpaceRecord from '../entity/myWorkspaceRecord';
import { WorkSpaceVo, SearchVo } from '../dto/workspace';
import { ListDto } from '../../../common/dto/base';
import { User } from '../../../common/dto/user';


@Injectable()
export default class WorkeSpaceService {

  constructor(
    @InjectRepository(WorkSpace) private workSpaceRepository: Repository<WorkSpace>,
    @InjectRepository(MyWorkSpaceRecord) private myWorkspaceRepository: Repository<MyWorkSpaceRecord>,
    ) {
  }

  async create(workspace: WorkSpace): Promise<WorkSpace> {
    // 为 ownerId 分配 acl    
    const record = await this.workSpaceRepository.save(workspace);
    // this.aclService.create(record.id, ownerId)

    return record;
  }

  async update(workspace: Partial<WorkSpaceVo & { id: number }>): Promise<WorkSpace> {
    const { id, name, description } = workspace;
    const wsExists = await this.workSpaceRepository.findOne({ where: { id } });
    if (!wsExists) throw new Error(`工作空间 ${id} 不存在!`);

    if (name) {
      wsExists.name = name;
    }
    if (description) {
      wsExists.description = description;
    }
    return await this.workSpaceRepository.save(wsExists);
  }

  public async list(queryOptions: SearchVo): Promise<ListDto<WorkSpace>> {
    const { name, pageNo = 1, pageSize = 10 } = queryOptions;
    const query: {[key: string]: any} = {};

    if (name) {
      query.name =  Like(`%${name}%`);
    }
    const [ workspaceDtos, count ] = await this.workSpaceRepository.findAndCount({
      where: query,
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });

    return {
      list: workspaceDtos,
      totalCount: count,
      pageNo,
      pageSize
    }
  }

  public async getUserSpace(user: User): Promise<WorkSpace> {
    const { empNo, realName } = user;
    const exists = await this.myWorkspaceRepository.findOne({
      where: {
        userId: empNo,
      },
      cache: true,
      relations: ['workSpace']
    });
    if (!exists) {

      const workSpaceDto = new WorkSpace();
      workSpaceDto.code = `${empNo}_${realName}_private_space`;
      workSpaceDto.name = `${realName}的个人空间`;
      workSpaceDto.description = `${realName}的个人空间`;
      workSpaceDto.creatorId = empNo;
      workSpaceDto.creatorName = realName;
      const workspace = await this.create(workSpaceDto);
      const myRecord = new MyWorkSpaceRecord();
      myRecord.userId = empNo;
      myRecord.workSpaceId = workspace.id;

      await this.myWorkspaceRepository.save(myRecord);

      return workspace;
    }

    return await this.getById(exists.workSpaceId);
  }

  public async getById(id: number): Promise<WorkSpace> {
    return await this.workSpaceRepository.findOne({
      where: { id }
    })
  }

  public async delete(id) {
    return await this.workSpaceRepository.delete(id);
  }
}
