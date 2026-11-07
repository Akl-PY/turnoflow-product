import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { Organization } from './organization.entity';
import { Message } from './message.entity';
import { ConversationStatus, AgentRoleType } from '@turnoflow/shared';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.conversations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: true })
  leadId: string;

  @Column({ length: 50, default: 'whatsapp' })
  channel: string;

  @Index()
  @Column({ length: 150 })
  channelConversationId: string;

  @Column({
    type: 'varchar',
    default: ConversationStatus.AI_HANDLED
  })
  status: ConversationStatus;

  @Column({
    type: 'varchar',
    default: AgentRoleType.RECEPTIONIST
  })
  assignedAgent: AgentRoleType;

  @Column({ length: 255, nullable: true })
  lastMessagePreview: string;

  @Column({ default: 0 })
  messagesCount: number;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
