
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('xlang_workspace_node_relation')
export default class WorkSpaceNodeRelation {
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
  nodeId: number;
}