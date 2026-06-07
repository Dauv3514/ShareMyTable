import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Utilisateur } from '../users/users.entity';
import { MessageConversation } from './message-conversation.entity';

export enum MessageConversationMemberRole {
  HOST = 'host',
  GUEST = 'guest',
  PARTICIPANT = 'participant',
}

// Membre rattache a une conversation.
// Le role aide a presenter correctement la conversation cote client.
@Entity('message_conversation_members')
@Unique(['conversation', 'user'])
export class MessageConversationMember {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => MessageConversation, (conversation) => conversation.members, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id', referencedColumnName: 'id' })
  conversation: MessageConversation;

  @ManyToOne(() => Utilisateur, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: Utilisateur;

  @Column({
    type: 'enum',
    enum: MessageConversationMemberRole,
    enumName: 'message_conversation_member_role_enum',
    default: MessageConversationMemberRole.PARTICIPANT,
  })
  role: MessageConversationMemberRole;

  @Column({ name: 'last_read_at', type: 'timestamp', nullable: true })
  lastReadAt: Date | null;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
