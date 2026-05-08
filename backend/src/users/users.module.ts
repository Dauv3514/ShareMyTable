import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PreferenceTag } from './preference-tag.entity';
import { Role } from './role.entity';
import { RolesSeedService } from './roles-seed.service';
import { UserPreferenceTag } from './user-preference-tag.entity';
import { Utilisateur } from './users.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utilisateur, Role, PreferenceTag, UserPreferenceTag]),
    forwardRef(() => AuthModule),
  ],
  providers: [UsersService, RolesSeedService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
