import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';
import { UsersModule } from '../users/users.module';
import { Utilisateur } from '../users/users.entity';
import { HostProfile } from './host-profile.entity';
import { HostProfileVisionService } from './host-profile-vision.service';
import { HostProfileVerificationService } from './host-profile-verification.service';
import { HostProfilesController } from './host-profiles.controller';
import { HostProfilesService } from './host-profiles.service';

// Module de candidature, auto-review niveau 1 et moderation des hotes.
@Module({
  imports: [
    TypeOrmModule.forFeature([HostProfile, Utilisateur]),
    AuthModule,
    UsersModule,
  ],
  controllers: [HostProfilesController],
  providers: [
    HostProfilesService,
    HostProfileVisionService,
    HostProfileVerificationService,
    RolesGuard,
  ],
  exports: [HostProfilesService],
})
export class HostProfilesModule {}
