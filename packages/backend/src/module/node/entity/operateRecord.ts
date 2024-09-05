import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum OperateType {
  PUBLISH = 1,
}

@Entity('xlang_node_operate_records')
export default class NodeOperateRecord {
  @PrimaryGeneratedColumn()
  id: number;
  @CreateDateColumn()
  gmtCreate: Date;
  @UpdateDateColumn()
  gmtModified: Date;
  @Index()
  @Column({
    type: 'tinyint'
  })
  type: OperateType;
  @Index()
  @Column()
  operatorId: string;
  @Index()
  @Column()
  operatorName: string;
  @Index()
  @Column()
  nodeId: number;
}