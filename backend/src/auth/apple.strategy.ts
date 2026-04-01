import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(config: ConfigService) {
    const privateKeyPath = config.get<string>('APPLE_PRIVATE_KEY_PATH');
    const privateKey = config.get<string>('APPLE_PRIVATE_KEY');
    super({
      clientID: config.get<string>('APPLE_CLIENT_ID')!,
      teamID: config.get<string>('APPLE_TEAM_ID')!,
      keyID: config.get<string>('APPLE_KEY_ID')!,
      callbackURL: config.get<string>('APPLE_CALLBACK_URL')!,
      privateKeyLocation: privateKeyPath,
      privateKeyString: privateKey ? privateKey.replace(/\\n/g, '\n') : undefined,
      scope: ['name', 'email'],
      response_mode: 'form_post',
      passReqToCallback: true,
    } as any);
  }

  validate(...args: unknown[]) {
    // passport-apple may pass (req, accessToken, refreshToken, idToken, profile)
    // or (req, accessToken, refreshToken, profile). Find profile object safely.
    const profile =
      args.find(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          ('id' in item || 'emails' in item || 'name' in item),
      ) ?? args[args.length - 1];
    return profile as unknown;
  }
}