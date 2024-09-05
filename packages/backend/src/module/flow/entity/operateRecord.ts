import { Entity, Unique, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany, Index, JoinTable } from 'typeorm';
import Flow from './flow';

enum OperateType {
  MODIFY = 1,
  DEPLOY = 2,
  STOP = 3,
}

@Entity('xlang_flow_operate_records')
export default class FlowOperateRecord {
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
  @Column({
    type: 'bit'
  })
  success: boolean;
  @Index()
  @Column()
  operatorId: number;
  @Index()
  @Column()
  operatorName: string;
  @Index()
  @Column()
  flowId: number;
}