import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('xlang_workspace_flow_relation')
export default class FlowWorkSpaceRelation {
  @PrimaryGeneratedColumn()
  id: number;
  @CreateDateColumn()
  gmtCreate: Date;
  @UpdateDateColumn()
  gmtModified: Date;
  @Index()
  @Column()
  workspaceCode: string;
  @Index()
  @Column()
  flowId: number;
}