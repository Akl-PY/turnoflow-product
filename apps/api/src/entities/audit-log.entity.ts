import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  organizationId: string;

  @Column({ length: 100 })
  action: string;

  @Column({ length: 100, nullable: true })
  actor: string;

  @Column({ length: 100, nullable: true })
  targetEntity: string;

  @Column({ length: 150, nullable: true })
  targetId: string;

  @Column({ type: 'simple-json', nullable: true })
  details: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
