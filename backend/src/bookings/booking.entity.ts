import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meal } from '../meals/meal.entity';
import { Utilisateur } from '../users/users.entity';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REFUSED = 'refused',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum BookingPaymentMethod {
  CARD = 'card',
  APPLE_PAY = 'apple-pay',
  PAYPAL = 'paypal',
}

export enum BookingPaymentState {
  AUTHORIZED = 'authorized',
  AWAITING_HOST = 'awaiting_host',
  REFUNDED = 'refunded',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Utilisateur, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'guest_user_id', referencedColumnName: 'id' })
  guestUser!: Utilisateur;

  @ManyToOne(() => Meal, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'meal_id', referencedColumnName: 'id' })
  meal!: Meal;

  @Column({ type: 'int' })
  seats!: number;

  @Column({
    name: 'booking_status',
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status_enum',
    default: BookingStatus.PENDING,
  })
  bookingStatus!: BookingStatus;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: BookingPaymentMethod,
    enumName: 'booking_payment_method_enum',
  })
  paymentMethod!: BookingPaymentMethod;

  @Column({
    name: 'payment_state',
    type: 'enum',
    enum: BookingPaymentState,
    enumName: 'booking_payment_state_enum',
  })
  paymentState!: BookingPaymentState;

  @Column({ name: 'unit_price_cents', type: 'int' })
  unitPriceCents!: number;

  @Column({ name: 'total_price_cents', type: 'int' })
  totalPriceCents!: number;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt!: Date | null;

  @Column({ name: 'refused_at', type: 'timestamp', nullable: true })
  refusedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'refusal_reason', type: 'text', nullable: true })
  refusalReason!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}