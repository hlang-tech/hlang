import { Entity, Unique, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne, Index, JoinTable } from 'typeorm';
import Graph from '../../graph/entity/graph';
import FlowOps from './flowOps';
import OperateRecord from './operateRecord';

@Unique('uk_code', ['code'])
@Entity('xlang_flow')
export default class Flow {
  @PrimaryGeneratedColumn()
  id: number;
  @CreateDateColumn()
  gmtCreate: Date;
  @UpdateDateColumn()
  gmtModified: Date;
  @Column()
  code: string;
  @Index()
  @Column()
  name: string;
  @Column({
    default: () => null
  })
  description: string;

  @Column({
    type: 'json'
  })
  config: {[key: string]: any};

  // @OneToMany(() => Graph, (g: Graph) => g.flow, { onDelete: "CASCADE", onUpdate: "CASCADE" })
  // graphs: Graph;
  // @OneToOne(() => FlowOps, (o: FlowOps) => o.flow, { onDelete: "CASCADE", onUpdate: "CASCADE" })
  // ops: FlowOps;
  // @OneToMany(() => OperateRecord, (r: OperateRecord) => r.flow, { onDelete: "CASCADE", onUpdate: "CASCADE" })
  // operateRecords: OperateRecord[];
}