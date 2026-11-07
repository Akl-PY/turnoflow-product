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
import { AppointmentStatus } from '@turnoflow/shared';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.appointments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: true })
  leadId: string;

  @Column({ length: 150 })
  customerName: string;

  @Column({ length: 50 })
  customerPhone: string;

  @Column({ length: 100 })
  serviceId: string;

  @Column({ length: 150 })
  serviceName: string;

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime' })
  endTime: Date;

  @Column({
    type: 'varchar',
    default: AppointmentStatus.CONFIRMED
  })
  status: AppointmentStatus;

  @Column({ length: 255, nullable: true })
  externalCalendarEventId: string;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
