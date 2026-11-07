import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn
} from 'typeorm';
import { Organization } from './organization.entity';
import { BusinessVertical, ServiceItem, BusinessHoursDay, FAQItem } from '@turnoflow/shared';

@Entity('business_profiles')
export class BusinessProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @OneToOne(() => Organization, (org) => org.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ length: 150, default: 'Mi Negocio de Belleza' })
  businessName: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'varchar', default: BusinessVertical.BEAUTY_SALON })
  vertical: BusinessVertical;

  @Column({ length: 255, default: 'Av. Principal 123' })
  location: string;

  @Column({ length: 100, default: 'America/Argentina/Buenos_Aires' })
  timezone: string;

  @Column({ length: 50, default: '+5491112345678' })
  contactPhone: string;

  @Column({ length: 100, default: 'contacto@negocio.com' })
  contactEmail: string;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'text', default: 'Cancelaciones con al menos 24 horas de antelación sin cargo.' })
  cancellationPolicy: string;

  @Column({ type: 'simple-json', default: '[]' })
  services: ServiceItem[];

  @Column({ type: 'simple-json', default: '[]' })
  businessHours: BusinessHoursDay[];

  @Column({ type: 'simple-json', default: '[]' })
  faqs: FAQItem[];

  @Column({ type: 'text', nullable: true })
  specialInstructions: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
