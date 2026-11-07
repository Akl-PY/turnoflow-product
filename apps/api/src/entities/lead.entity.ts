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
import { LeadStatus, LeadIntent, LeadPriority } from '@turnoflow/shared';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.leads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ length: 150 })
  name: string;

  @Index()
  @Column({ length: 50 })
  phone: string;

  @Column({ length: 150, nullable: true })
  email: string;

  @Column({ length: 150, nullable: true })
  requestedService: string;

  @Column({
    type: 'varchar',
    default: LeadStatus.NEW
  })
  status: LeadStatus;

  @Column({
    type: 'varchar',
    default: LeadIntent.INFORMATIONAL
  })
  intent: LeadIntent;

  @Column({
    type: 'varchar',
    default: LeadPriority.WARM
  })
  priority: LeadPriority;

  @Column({ length: 50, default: 'whatsapp' })
  source: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  lastInteractionAt: Date;

  @Column({ type: 'datetime', nullable: true })
  nextFollowUpAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
