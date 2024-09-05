import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToMany } from 'typeorm';

@Entity('xlang_workspace')
export default class WorkSpace {
  @PrimaryGeneratedColumn()
  id: number;
  @CreateDateColumn()
  gmtCreate: Date;
  @UpdateDateColumn()
  gmtModified: Date;
  @Index()
  @Column()
  name: string;
  @Index({ unique: true })
  @Column()
  code: string;
  @Column()
  description: string;
  @Index()
  @Column()
  creatorId: string;
  @Column()
  creatorName: string;
}