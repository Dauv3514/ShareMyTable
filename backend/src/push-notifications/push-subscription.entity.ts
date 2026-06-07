import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Utilisateur } from '../users/users.entity';

@Entity('push_subscriptions')
@Unique(['endpoint'])
export class PushSubscriptionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Utilisateur, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user!: Utilisateur;

  @Column({ type: 'text' })
  endpoint!: string;

  @Column({ name: 'p256dh_key', type: 'text' })
  p256dhKey!: string;

  @Column({ name: 'auth_key', type: 'text' })
  authKey!: string;

  @Column({ name: 'expiration_time', type: 'timestamp', nullable: true })
  expirationTime!: Date | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
