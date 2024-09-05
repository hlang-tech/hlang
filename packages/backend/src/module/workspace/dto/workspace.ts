import { Pagination } from '../../../common/dto/base';

export interface WorkSpaceVo {
  name: string;
  code: string;
  description: string;
  ownerId: string;
}

export interface SearchVo extends Pagination {
  name: string;
}