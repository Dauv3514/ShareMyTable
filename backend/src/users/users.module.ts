import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Role } from './role.entity';
import { RolesSeedService } from './roles-seed.service';
import { Utilisateur } from './users.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utilisateur, Role]),
    forwardRef(() => AuthModule),
  ],
  providers: [UsersService, RolesSeedService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
