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

@Entity('automations')
export class AutomationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.automations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 100 })
  type: string; // e.g. 'incoming-messages', 'lead-management', 'follow-up', 'booking', 'handoff'

  @Column({ default: true })
  isActive: boolean;

  @Column({ length: 50, default: 'healthy' })
  status: string; // 'healthy', 'error', 'paused'

  @Column({ length: 255, nullable: true })
  webhookUrl: string;

  @Column({ nullable: true })
  lastRunAt: Date;

  @Column({ default: 0 })
  totalRuns: number;

  @Column({ default: 0 })
  successRuns: number;

  @Column({ default: 0 })
  failedRuns: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
