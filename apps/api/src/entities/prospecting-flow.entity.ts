import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { Organization } from './organization.entity';
import { FlowTriggerType, ProspectingStep } from '@turnoflow/shared';

@Entity('prospecting_flows')
export class ProspectingFlowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'varchar',
    length: 50,
    default: FlowTriggerType.KEYWORD
  })
  triggerType: FlowTriggerType;

  @Column({ type: 'simple-json', nullable: true })
  triggerKeywords: string[];

  @Column({ type: 'simple-json' })
  steps: ProspectingStep[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
