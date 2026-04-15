import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Utilisateur } from '../users/users.entity';

// Etats possibles d'une demande de profil hote.
export enum HostValidationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export type HostPhotoVisionLabel = {
  description: string;
  score: number | null;
};

export type HostPhotoSafeSearch = {
  adult?: string | null;
  spoof?: string | null;
  medical?: string | null;
  violence?: string | null;
  racy?: string | null;
} | null;

// Profil hote rattache en one-to-one a un utilisateur.
// Il porte l'etat de validation et les informations d'adresse necessaires
// pour la future publication de repas par les hotes actifs.
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
    type: 'enum',
    enum: HostValidationStatus,
    enumName: 'host_validation_status_enum',
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

  @Column({ name: 'address_verified', type: 'boolean', default: false })
  addressVerified: boolean;

  @Column({ name: 'home_photo_verified', type: 'boolean', default: false })
  homePhotoVerified: boolean;

  @Column({ name: 'verification_score', type: 'int', default: 0 })
  verificationScore: number;

  @Column({ name: 'auto_review_notes', type: 'text', nullable: true })
  autoReviewNotes: string | null;

  @Column({ name: 'last_auto_reviewed_at', type: 'timestamp', nullable: true })
  lastAutoReviewedAt: Date | null;

  @Column({
    name: 'home_photo_vision_labels',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  homePhotoVisionLabels: HostPhotoVisionLabel[];

  @Column({ name: 'home_photo_safe_search', type: 'jsonb', nullable: true })
  homePhotoSafeSearch: HostPhotoSafeSearch;

  @Column({
    name: 'verification_risk_flags',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  verificationRiskFlags: string[];

  @Column({
    name: 'manual_review_required',
    type: 'boolean',
    default: false,
  })
  manualReviewRequired: boolean;

  @OneToOne(() => Utilisateur, (user) => user.hostProfile, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: Utilisateur;
}
