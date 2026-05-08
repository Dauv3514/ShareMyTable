import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { PreferenceTag } from './preference-tag.entity';
import { Utilisateur } from './users.entity';

@Entity('user_preference_tags')
export class UserPreferenceTag {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId!: number;

  @PrimaryColumn({ name: 'tag_id', type: 'int' })
  tagId!: number;

  @ManyToOne(() => Utilisateur, (user) => user.userPreferenceTags, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user!: Utilisateur;

  @ManyToOne(() => PreferenceTag, (tag) => tag.userPreferenceTags, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tag_id', referencedColumnName: 'id' })
  tag!: PreferenceTag;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
