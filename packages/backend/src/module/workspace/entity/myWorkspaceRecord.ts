import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import WorkSpace from './workspace';

@Entity('xlang_my_workspace_record')
export default class MyWorkSpaceRecord {
  @PrimaryGeneratedColumn()
  id: number;
  @CreateDateColumn()
  gmtCreate: Date;
  @UpdateDateColumn()
  gmtModified: Date;
  @Index()
  @Column()
  userId: string;
  @Index()
  @Column()
  workSpaceId: number;
}