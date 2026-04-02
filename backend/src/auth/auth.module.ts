import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { AuthGuard } from './auth.guard';
import { MailService } from '../mail/mail.service';
import { GoogleStrategy } from './google.strategy';
import { AppleStrategy } from './apple.strategy';
import { GoogleAuthGuard } from './google-auth.guard';

@Module({
  imports: [
    forwardRef(() => UsersModule),
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
    GoogleStrategy,
    AppleStrategy,
  ],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard, JwtModule],
})
export class AuthModule {}