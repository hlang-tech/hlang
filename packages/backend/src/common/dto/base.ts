export interface Result<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

export interface Timestamp {
  gmtCreate: Date;
  gmtModified: Date;
}

export interface Account {
  name: string;
  id: string;
}

export interface Pagination {
  pageNo: number;
  pageSize: number;
}

export interface ListDto<T> extends Pagination {
  list: T[];
  totalCount: number;
} 

export interface List<T> extends ListDto<T> {
  success: boolean;
  message?: string;
  code?: string;
}