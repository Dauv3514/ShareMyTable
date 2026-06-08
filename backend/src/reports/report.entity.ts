import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Booking } from '../bookings/booking.entity';
import { Meal } from '../meals/meal.entity';
import { MessageConversation } from '../messaging/message-conversation.entity';
import { Utilisateur } from '../users/users.entity';

export enum ReportTargetType {
  USER = 'user',
  MEAL = 'meal',
  BOOKING = 'booking',
  CONVERSATION = 'conversation',
}

export enum ReportReason {
  INAPPROPRIATE_BEHAVIOR = 'inappropriate_behavior',
  HARASSMENT = 'harassment',
  SAFETY = 'safety',
  FRAUD = 'fraud',
  SPAM = 'spam',
  WRONG_INFORMATION = 'wrong_information',
  PAYMENT = 'payment',
  HYGIENE = 'hygiene',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

@Entity('reports')
@Index(['targetType', 'targetId'])
@Index(['status', 'createdAt'])
export class Report {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Utilisateur, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_user_id', referencedColumnName: 'id' })
  reporter!: Utilisateur;

  @Column({
    name: 'target_type',
    type: 'enum',
    enum: ReportTargetType,
    enumName: 'report_target_type_enum',
  })
  targetType!: ReportTargetType;

  @Column({ name: 'target_id', type: 'int' })
  targetId!: number;

  @ManyToOne(() => Utilisateur, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reported_user_id', referencedColumnName: 'id' })
  reportedUser!: Utilisateur | null;

  @ManyToOne(() => Meal, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reported_meal_id', referencedColumnName: 'id' })
  reportedMeal!: Meal | null;

  @ManyToOne(() => Booking, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reported_booking_id', referencedColumnName: 'id' })
  reportedBooking!: Booking | null;

  @ManyToOne(() => MessageConversation, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'reported_conversation_id', referencedColumnName: 'id' })
  reportedConversation!: MessageConversation | null;

  @Column({
    type: 'enum',
    enum: ReportReason,
    enumName: 'report_reason_enum',
  })
  reason!: ReportReason;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    enumName: 'report_status_enum',
    default: ReportStatus.PENDING,
  })
  status!: ReportStatus;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote!: string | null;

  @ManyToOne(() => Utilisateur, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_user_id', referencedColumnName: 'id' })
  reviewedBy!: Utilisateur | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
