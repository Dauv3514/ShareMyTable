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
import { Review } from './review.entity';

export enum TipStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

@Entity('tips')
export class Tip {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Booking, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id', referencedColumnName: 'id' })
  booking!: Booking;

  @OneToOne(() => Review, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_id', referencedColumnName: 'id' })
  review!: Review;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents!: number;

  @Column({ name: 'payment_id', type: 'varchar', length: 255, nullable: true })
  paymentId!: string | null;

  @Column({
    type: 'enum',
    enum: TipStatus,
    enumName: 'tip_status_enum',
    default: TipStatus.PENDING,
  })
  status!: TipStatus;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}