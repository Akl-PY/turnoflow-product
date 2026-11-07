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
import { AgentRoleType, AIProviderType } from '@turnoflow/shared';

@Entity('agent_configs')
export class AgentConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.agents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({
    type: 'varchar',
    default: AgentRoleType.RECEPTIONIST
  })
  role: AgentRoleType;

  @Column({ length: 100 })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'varchar',
    default: AIProviderType.ANTHROPIC
  })
  provider: AIProviderType;

  @Column({ length: 100, default: 'claude-3-5-sonnet-20241022' })
  model: string;

  @Column({ type: 'float', default: 0.2 })
  temperature: number;

  @Column({ default: 1000 })
  maxTokens: number;

  @Column({ type: 'text' })
  systemPrompt: string;

  @Column({ type: 'simple-json', default: '[]' })
  allowedTools: string[];

  @Column({ type: 'simple-json', default: '[]' })
  handoffKeywords: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
