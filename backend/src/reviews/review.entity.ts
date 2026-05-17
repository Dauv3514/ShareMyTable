import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking } from '../bookings/booking.entity';
import { Tip } from './tip.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Booking, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id', referencedColumnName: 'id' })
  booking!: Booking;

  @Column({ type: 'int' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @OneToOne(() => Tip, (tip) => tip.review, {
    nullable: true,
  })
  tip!: Tip | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}