import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meal } from '../meals/meal.entity';
import { MessageConversationMember } from './message-conversation-member.entity';
import { MessageEntry } from './message-entry.entity';

export enum MessageConversationType {
  BOOKING_DIRECT = 'booking_direct',
  MEAL_GROUP = 'meal_group',
  MEAL_DIRECT = 'meal_direct',
}

// Conversation de messagerie liee a un repas.
// Le type permet de distinguer un chat reservation, un groupe de repas
// ou un direct entre participants deja acceptes.
@Entity('message_conversations')
export class MessageConversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: MessageConversationType,
    enumName: 'message_conversation_type_enum',
  })
  type: MessageConversationType;

  @Column({ type: 'varchar', length: 160, nullable: true })
  title: string | null;

  @ManyToOne(() => Meal, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'meal_id', referencedColumnName: 'id' })
  meal: Meal | null;

  @OneToMany(
    () => MessageConversationMember,
    (messageConversationMember) => messageConversationMember.conversation,
  )
  members: MessageConversationMember[];

  @OneToMany(
    () => MessageEntry,
    (messageEntry) => messageEntry.conversation,
  )
  messages: MessageEntry[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
