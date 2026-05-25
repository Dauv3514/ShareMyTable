import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meal } from './meal.entity';

export enum MealMenuItemCategory {
  STARTER = 'starter',
  MAIN = 'main',
  DESSERT = 'dessert',
  SAVORY = 'savory',
  SWEET = 'sweet',
  DRINKS = 'drinks',
  SNACKS = 'snacks',
  SHARING = 'sharing',
  BREADS = 'breads',
  FRUITS = 'fruits',
}

@Entity('meal_menu_items')
export class MealMenuItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Meal, (meal) => meal.menuItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meal_id' })
  meal!: Meal;

  @Column({
    type: 'enum',
    enum: MealMenuItemCategory,
    enumName: 'meal_menu_item_category_enum',
  })
  category!: MealMenuItemCategory;

  @Column({ type: 'varchar', length: 120 })
  label!: string;

  @Column({ type: 'int' })
  position!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
