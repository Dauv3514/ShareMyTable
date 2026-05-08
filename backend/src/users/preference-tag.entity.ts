import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Utilisateur } from './users.entity';
import { UserPreferenceTag } from './user-preference-tag.entity';

export enum PreferenceTagCategory {
  DIETARY = 'dietary',
  MEAL_AMBIANCE = 'meal_ambiance',
}

@Entity('preference_tags')
@Index(['slug', 'category', 'ownerUserId'], { unique: true })
export class PreferenceTag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 120 })
  slug!: string;

  @Column({ type: 'varchar', length: 120 })
  label!: string;

  @Column({
    type: 'enum',
    enum: PreferenceTagCategory,
    enumName: 'preference_tag_category_enum',
  })
  category!: PreferenceTagCategory;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'owner_user_id', type: 'int', nullable: true })
  ownerUserId!: number | null;

  @ManyToOne(() => Utilisateur, (user) => user.ownedPreferenceTags, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'owner_user_id', referencedColumnName: 'id' })
  ownerUser!: Utilisateur | null;

  @OneToMany(() => UserPreferenceTag, (userPreferenceTag) => userPreferenceTag.tag)
  userPreferenceTags!: UserPreferenceTag[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
