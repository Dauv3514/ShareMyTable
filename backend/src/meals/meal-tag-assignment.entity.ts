import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { Meal } from './meal.entity';
import { MealTag } from './meal-tag.entity';

@Entity('meal_tag_assignments')
@Unique(['mealId', 'tagId'])
export class MealTagAssignment {
  @PrimaryColumn({ name: 'meal_id', type: 'int' })
  mealId!: number;

  @PrimaryColumn({ name: 'tag_id', type: 'int' })
  tagId!: number;

  @ManyToOne(() => Meal, (meal) => meal.tagAssignments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meal_id' })
  meal!: Meal;

  @ManyToOne(() => MealTag, (tag) => tag.assignments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tag_id' })
  tag!: MealTag;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
