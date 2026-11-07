import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { MessageSender, ToolExecutionRecord } from '@turnoflow/shared';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  conversationId: string;

  @ManyToOne(() => Conversation, (conv) => conv.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column({
    type: 'varchar',
    default: MessageSender.USER
  })
  sender: MessageSender;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-json', nullable: true })
  toolCalls: ToolExecutionRecord[];

  @Index()
  @Column({ length: 150, nullable: true })
  externalMessageId: string;

  @CreateDateColumn()
  createdAt: Date;
}
