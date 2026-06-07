import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Meal } from '../meals/meal.entity';
import { Utilisateur } from '../users/users.entity';

export enum MealReminderType {
  DAY_BEFORE = 'day_before',
  TWO_HOURS_BEFORE = 'two_hours_before',
}

@Entity('meal_reminder_notifications')
@Unique(['meal', 'user', 'type'])
export class MealReminderNotification {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Meal, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meal_id', referencedColumnName: 'id' })
  meal!: Meal;

  @ManyToOne(() => Utilisateur, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user!: Utilisateur;

  @Column({
    name: 'reminder_type',
    type: 'enum',
    enum: MealReminderType,
    enumName: 'meal_reminder_type_enum',
  })
  type!: MealReminderType;

  @Column({ name: 'target_date_time', type: 'timestamp' })
  targetDateTime!: Date;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt!: Date;
}
