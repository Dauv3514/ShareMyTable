import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Utilisateur } from '../users/users.entity';

export enum HostValidationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('host_profiles')
export class HostProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  @Column({ name: 'home_photo_url', type: 'text', nullable: true })
  homePhotoUrl: string | null;

  @Column({
    name: 'validation_status',
    type: 'varchar',
    length: 20,
    default: HostValidationStatus.PENDING,
  })
  validationStatus: HostValidationStatus;

  @Column({ name: 'host_level', type: 'int', default: 1 })
  hostLevel: number;

  @Column({ name: 'activated_at', type: 'timestamp', nullable: true })
  activatedAt: Date | null;

  @Column({ type: 'double precision', nullable: true })
  lat: number | null;

  @Column({ type: 'double precision', nullable: true })
  lng: number | null;

  @Column({ type: 'varchar', length: 50 })
  country: string;

  @Column({ type: 'varchar', length: 50 })
  city: string;

  @Column({ name: 'district_label', type: 'varchar', length: 50 })
  districtLabel: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @OneToOne(() => Utilisateur, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: Utilisateur;
}
