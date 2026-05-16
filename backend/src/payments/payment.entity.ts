import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Booking } from '../bookings/booking.entity';

export enum PaymentProvider {
  STRIPE = 'stripe',
}

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Booking, (booking) => booking.payment, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  
  @JoinColumn({ name: 'booking_id', referencedColumnName: 'id' })
  booking!: Booking;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
    enumName: 'payment_provider_enum',
    default: PaymentProvider.STRIPE,
  })
  provider!: PaymentProvider;

  @Column({ name: 'provider_intent_id', type: 'varchar', length: 255 })
  providerIntentId!: string;

  @Column({ name: 'amount_total_cents', type: 'int' })
  amountTotalCents!: number;

  @Column({ name: 'platform_fee_cents', type: 'int', default: 0 })
  platformFeeCents!: number;

  @Column({ name: 'host_amount_cents', type: 'int', default: 0 })
  hostAmountCents!: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status_enum',
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'released_at', type: 'timestamp', nullable: true })
  releasedAt!: Date | null;

  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}