import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';
import { UsersModule } from '../users/users.module';
import { Utilisateur } from '../users/users.entity';
import { HostProfile } from './host-profile.entity';
import { HostProfilesController } from './host-profiles.controller';
import { HostProfilesService } from './host-profiles.service';

// Module de candidature et moderation des hotes.
@Module({
  imports: [
    TypeOrmModule.forFeature([HostProfile, Utilisateur]),
    AuthModule,
    UsersModule,
  ],
  controllers: [HostProfilesController],
  providers: [HostProfilesService, RolesGuard],
  exports: [HostProfilesService],
})
export class HostProfilesModule {}
