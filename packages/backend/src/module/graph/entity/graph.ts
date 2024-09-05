import { Entity, Unique, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany, JoinTable, ManyToOne, Index } from 'typeorm';
import Flow from '../../flow/entity/flow';

@Entity('xlang_flow_graph')
export default class Graph {
  @PrimaryGeneratedColumn()
  id: number;
  @CreateDateColumn()
  gmtCreate: Date;
  @UpdateDateColumn()
  gmtModified: Date;
  @Index()
  @Column()
  version: number;
  @Column({
    type: 'json'
  })
  connections: {[key: string]: any}[];
  @Column({
    type: 'json'
  })
  nodeDeps: {[key: string]: any}[];
  @Index()
  @Column()
  flowId: number;
}