import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query, UseGuards, Req, Res, Patch } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { InscriptionDto, ConnexionDto, ForgotPasswordDto, ResetPasswordDto, OAuthCompleteDto, ChangePasswordDto } from '../auth/auth.dto';
import { AuthProvider } from '../users/users.entity';
import { GoogleAuthGuard } from './google-auth.guard';
import { AuthGuard } from './auth.guard';
import type { IAuthInfoRequest } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Post('inscription')
  async inscription(@Body() userDto: InscriptionDto) {
    return this.authService.inscription(userDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('connexion')
  async connexion(@Body() body: ConnexionDto) {
    return this.authService.connexion(body.email, body.password_hash);
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    return;
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request & { user?: any }, @Res() res: Response) {
    const result = await this.authService.oauthLogin(
      AuthProvider.GOOGLE,
      req.user as any,
    );
    const flow = typeof req.query.state === 'string' ? req.query.state : undefined;
    if (result.type === 'verify') {
      const baseUrl = process.env.FRONTEND_URL;
      const redirectUrl = new URL(flow === 'login' ? '/connexion' : '/inscription', baseUrl);
      redirectUrl.searchParams.set('verify', '1');
      return res.redirect(redirectUrl.toString());
    }
    if (result.type === 'pending') {
      if (result.reason === 'not_registered' && flow === 'login') {
        const baseUrl = process.env.FRONTEND_URL;
        const redirectUrl = new URL('/inscription', baseUrl);
        redirectUrl.searchParams.set('oauth', 'google');
        redirectUrl.searchParams.set('reason', 'not_registered');
        return res.redirect(redirectUrl.toString());
      }
      const redirectUrl = this.authService.buildOAuthPendingRedirect({
        pendingToken: result.pendingToken,
        missing: result.missing,
        reason: result.reason,
      });
      return res.redirect(redirectUrl);
    }

    const redirectUrl = this.authService.buildOAuthRedirect(
      result.access_token,
      result.isProfileComplete,
    );
    return res.redirect(redirectUrl);
  }

  @Public()
  @Get('apple')
  @UseGuards(PassportAuthGuard('apple'))
  async appleAuth() {
    return;
  }

  @Public()
  @Post('apple/callback')
  @UseGuards(PassportAuthGuard('apple'))
  async appleCallback(@Req() req: Request & { user?: any }, @Res() res: Response) {
    const result = await this.authService.oauthLogin(
      AuthProvider.APPLE,
      req.user as any,
    );
    const flow = typeof req.query.state === 'string' ? req.query.state : undefined;
    if (result.type === 'verify') {
      const baseUrl = process.env.FRONTEND_URL;
      const redirectUrl = new URL(flow === 'login' ? '/connexion' : '/inscription', baseUrl);
      redirectUrl.searchParams.set('verify', '1');
      return res.redirect(redirectUrl.toString());
    }
    if (result.type === 'pending') {
      const redirectUrl = this.authService.buildOAuthPendingRedirect({
        pendingToken: result.pendingToken,
        missing: result.missing,
        reason: result.reason,
      });
      return res.redirect(redirectUrl);
    }

    const redirectUrl = this.authService.buildOAuthRedirect(
      result.access_token,
      result.isProfileComplete,
    );
    return res.redirect(redirectUrl);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('oauth/complete')
  async oauthComplete(@Body() body: OAuthCompleteDto) {
    return this.authService.completeOAuthProfile({
      pendingToken: body.pending_token,
      email: body.email,
      firstName: body.first_name,
      lastName: body.last_name,
      country: body.country,
      city: body.city,
      birthDate: new Date(body.birth_date),
      pseudo: body.pseudo,
      bio: body.bio,
      profilePhotoUrl: body.profile_photo_url,
    });
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Patch('change-password')
  async changePassword(@Req() req: IAuthInfoRequest, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, body);
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('deconnexion')
  async deconnexion() {
    return {
      success: true,
      message: 'Deconnecté avec succès',
    };
  }
}
