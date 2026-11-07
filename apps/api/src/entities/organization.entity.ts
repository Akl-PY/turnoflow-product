import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne
} from 'typeorm';
import { User } from './user.entity';
import { BusinessProfile } from './business-profile.entity';
import { Lead } from './lead.entity';
import { Appointment } from './appointment.entity';
import { Conversation } from './conversation.entity';
import { AgentConfigEntity } from './agent-config.entity';
import { AutomationEntity } from './automation.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ unique: true, length: 100 })
  slug: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToOne(() => BusinessProfile, (profile) => profile.organization)
  profile: BusinessProfile;

  @OneToMany(() => Lead, (lead) => lead.organization)
  leads: Lead[];

  @OneToMany(() => Appointment, (appointment) => appointment.organization)
  appointments: Appointment[];

  @OneToMany(() => Conversation, (conversation) => conversation.organization)
  conversations: Conversation[];

  @OneToMany(() => AgentConfigEntity, (agent) => agent.organization)
  agents: AgentConfigEntity[];

  @OneToMany(() => AutomationEntity, (auto) => auto.organization)
  automations: AutomationEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
