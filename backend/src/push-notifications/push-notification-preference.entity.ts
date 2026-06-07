import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Utilisateur } from '../users/users.entity';

@Entity('push_notification_preferences')
@Unique(['user'])
export class PushNotificationPreference {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Utilisateur, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user!: Utilisateur;

  @Column({ name: 'messages_enabled', type: 'boolean', default: true })
  messagesEnabled!: boolean;

  @Column({ name: 'reservations_enabled', type: 'boolean', default: true })
  reservationsEnabled!: boolean;

  @Column({ name: 'meal_reminders_enabled', type: 'boolean', default: true })
  mealRemindersEnabled!: boolean;

  @Column({ name: 'host_status_enabled', type: 'boolean', default: true })
  hostStatusEnabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
