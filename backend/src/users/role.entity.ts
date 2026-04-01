import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Utilisateur } from './users.entity';

export enum RoleName {
  USER = 'USER',
  HOST = 'HOST',
  ADMIN = 'ADMIN',
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: RoleName,
    enumName: 'role_name_enum',
    unique: true,
  })
  name: RoleName;

  @OneToMany(() => Utilisateur, (user) => user.role)
  users: Utilisateur[];
}
