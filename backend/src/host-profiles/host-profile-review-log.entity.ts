import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Utilisateur } from '../users/users.entity';
import { HostProfile } from './host-profile.entity';

export enum HostProfileReviewDecision {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('host_profile_review_logs')
export class HostProfileReviewLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HostProfile, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_profile_id', referencedColumnName: 'id' })
  hostProfile: HostProfile;

  @ManyToOne(() => Utilisateur, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'admin_user_id', referencedColumnName: 'id' })
  admin: Utilisateur | null;

  @Column({
    type: 'enum',
    enum: HostProfileReviewDecision,
    enumName: 'host_profile_review_decision_enum',
  })
  decision: HostProfileReviewDecision;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
