import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
}

export enum AccountStatus {
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
}

@Entity('users')
export class Utilisateur {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 50, unique: true, nullable: true })
    pseudo: string;

    @Column({ length: 150, unique: true })
    email: string;

    @Column({ length: 30, nullable: true })
    phone: string;

    @Column({ name: 'password_hash', length: 255 })
    passwordHash: string;

    @Column({ name: 'first_name', length: 50 })
    firstName: string;

    @Column({ name: 'last_name', length: 50 })
    lastName: string;

    @Column({ name: 'profile_photo_url', nullable: true })
    profilePhotoUrl: string;

    @Column({ nullable: true })
    city: string;

    @Column({ length: 100, nullable: true })
    country: string;

    @Column({ type: 'text', nullable: true })
    bio: string;

    @Column({ name: 'birth_date', type: 'date', nullable: true })
    birthDate: Date;

    @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
    emailVerifiedAt: Date;

    @Column({ name: 'email_verification_token_hash', type: 'varchar', length: 64, nullable: true })
    emailVerificationTokenHash: string | null;

    @Column({ name: 'email_verification_expires_at', type: 'timestamp', nullable: true })
    emailVerificationExpiresAt: Date | null;

    @Column({ name: 'password_reset_token_hash', type: 'varchar', length: 64, nullable: true })
    passwordResetTokenHash: string | null;

    @Column({ name: 'password_reset_expires_at', type: 'timestamp', nullable: true })
    passwordResetExpiresAt: Date | null;

    @Column({
        name: 'account_status',
        type: 'enum',
        enum: AccountStatus,
        default: AccountStatus.ACTIVE,
    })
    accountStatus: AccountStatus;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER,
    })
    roles: UserRole;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
