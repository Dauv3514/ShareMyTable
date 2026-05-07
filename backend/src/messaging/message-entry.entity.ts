import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Utilisateur } from '../users/users.entity';
import { MessageConversation } from './message-conversation.entity';

// Message envoye dans une conversation.
@Entity('message_entries')
export class MessageEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => MessageConversation, (conversation) => conversation.messages, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id', referencedColumnName: 'id' })
  conversation: MessageConversation;

  @ManyToOne(() => Utilisateur, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_user_id', referencedColumnName: 'id' })
  sender: Utilisateur;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
