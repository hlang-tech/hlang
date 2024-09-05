import { Entity, Unique, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, ManyToMany, Index, JoinTable } from 'typeorm';
import Flow from './flow';

enum FlowStatus {
  WAITING = 0,
  DEPLOYING = 1,
  RUNNING = 2,
}

@Entity('xlang_flow_ops')
export default class FlowOps {
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
  status: FlowStatus;
  @Index()
  @Column()
  serviceName: string;
  @Column()
  rsCount: number;
  @Column()
  flowId: number;
}