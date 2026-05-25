import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { MealTagAssignment } from './meal-tag-assignment.entity';

export enum MealTagCategory {
  HOUSE_RULE = 'house_rule',
  DIETARY_PREFERENCE = 'dietary_preference',
  MEAL_AMBIANCE = 'meal_ambiance',
}

@Entity('meal_tags')
@Unique(['code'])
export class MealTag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 80 })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  label!: string;

  @Column({
    type: 'enum',
    enum: MealTagCategory,
    enumName: 'meal_tag_category_enum',
  })
  category!: MealTagCategory;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => MealTagAssignment, (assignment) => assignment.tag)
  assignments!: MealTagAssignment[];
}
