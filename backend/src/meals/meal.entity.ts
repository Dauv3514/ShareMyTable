import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Utilisateur } from '../users/users.entity';
import { MealMenuItem } from './meal-menu-item.entity';
import { MealTagAssignment } from './meal-tag-assignment.entity';

export enum MealStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  DONE = 'done',
}

// Événement créé par un host approuve et actif.
@Entity('meals')
export class Meal {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Utilisateur, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'host_id', referencedColumnName: 'id' })
  host!: Utilisateur;

  @Column({ type: 'varchar', length: 120, nullable: true })
  title!: string | null;

  @Column({ name: 'meal_type', type: 'varchar', length: 20, nullable: true })
  mealType!: string | null;

  @Column({ name: 'menu_description', type: 'text', nullable: true })
  menuDescription!: string | null;

  @OneToMany(() => MealMenuItem, (menuItem) => menuItem.meal)
  menuItems!: MealMenuItem[];

  @Column({ name: 'date_time', type: 'timestamp', nullable: true })
  dateTime!: Date | null;

  @Column({ name: 'seats_total', type: 'int' })
  seatsTotal!: number;

  @Column({ name: 'price_per_seat_cents', type: 'int' })
  pricePerSeatCents!: number;

  @Column({ name: 'house_rules', type: 'text', nullable: true })
  houseRules!: string | null;

  @OneToMany(() => MealTagAssignment, (assignment) => assignment.meal)
  tagAssignments!: MealTagAssignment[];

  @Column({
    type: 'enum',
    enum: MealStatus,
    enumName: 'meal_status_enum',
    default: MealStatus.DRAFT,
  })
  status!: MealStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
