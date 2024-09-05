import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { PortInfo } from '../dto/node';

export enum NodeType {
  WRITABLE = 'W',
  READABLE = 'R',
  TRANFORTABLE = 'T'
}

@Entity('xlang_node')
export default class Node {
  @PrimaryGeneratedColumn()
  id: number;
  @CreateDateColumn()
  gmtCreate: Date;
  @UpdateDateColumn()
  gmtModified: Date;
  @Index()
  @Column()
  version: number;
  @Column()
  description: string;
  @Index()
  @Column()
  name: string;
  @Index({ unique: true })
  @Column()
  code: string;
  @Column()
  icon: string;
  @Index()
  @Column()
  type: NodeType;
  @Index()
  @Column()
  groupCode: string;
  @Column({
    type: 'json'
  })
  editorResource: {[key: string]: string};
  @Column()
  runtimeResource: string;
  @Column({
    type: 'json'
  })
  portInfo: PortInfo;
}