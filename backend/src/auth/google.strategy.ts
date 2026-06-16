import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { normalizeAuthCallbackUrl } from './auth-url.util';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL: normalizeAuthCallbackUrl(
        config.get<string>('GOOGLE_CALLBACK_URL')!,
        config,
      ),
      scope: ['email', 'profile'],
    } as StrategyOptions);
  }

  validate(accessToken: string, refreshToken: string, profile: unknown) {
    return profile;
  }
}
