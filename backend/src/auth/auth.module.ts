import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HostProfilesModule } from '../host-profiles/host-profiles.module';
import { UsersModule } from '../users/users.module';
import { AuthGuard } from './auth.guard';
import { MailService } from '../mail/mail.service';
import { GoogleStrategy } from './google.strategy';
import { AppleStrategy } from './apple.strategy';
import { GoogleAuthGuard } from './google-auth.guard';

function hasConfigValue(config: ConfigService, key: string) {
  return Boolean(config.get<string>(key)?.trim());
}

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => HostProfilesModule),
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN')! as '1h' },
      }),
    }),
  ],
  providers: [
    AuthService,
    AuthGuard,
    GoogleAuthGuard,
    MailService,
    {
      provide: GoogleStrategy,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        if (
          !hasConfigValue(config, 'GOOGLE_CLIENT_ID') ||
          !hasConfigValue(config, 'GOOGLE_CLIENT_SECRET') ||
          !hasConfigValue(config, 'GOOGLE_CALLBACK_URL')
        ) {
          return null;
        }

        return new GoogleStrategy(config);
      },
    },
    {
      provide: AppleStrategy,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const hasPrivateKey =
          hasConfigValue(config, 'APPLE_PRIVATE_KEY_PATH') ||
          hasConfigValue(config, 'APPLE_PRIVATE_KEY');

        if (
          !hasConfigValue(config, 'APPLE_CLIENT_ID') ||
          !hasConfigValue(config, 'APPLE_TEAM_ID') ||
          !hasConfigValue(config, 'APPLE_KEY_ID') ||
          !hasConfigValue(config, 'APPLE_CALLBACK_URL') ||
          !hasPrivateKey
        ) {
          return null;
        }

        return new AppleStrategy(config);
      },
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard, JwtModule],
})
export class AuthModule {}
