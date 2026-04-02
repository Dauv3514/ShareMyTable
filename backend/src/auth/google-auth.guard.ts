import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const flow = typeof req.query.flow === 'string' ? req.query.flow : undefined;
    if (flow === 'login' || flow === 'register') {
      return { state: flow };
    }
    return {};
  }
}
