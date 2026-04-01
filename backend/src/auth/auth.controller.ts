import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { InscriptionDto, ConnexionDto, ForgotPasswordDto, ResetPasswordDto, OAuthCompleteDto } from '../auth/auth.dto';
import { AuthProvider } from '../users/users.entity';

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
  @UseGuards(PassportAuthGuard('google'))
  async googleAuth() {
    return;
  }

  @Public()
  @Get('google/callback')
  @UseGuards(PassportAuthGuard('google'))
  async googleCallback(@Req() req: Request & { user?: any }, @Res() res: Response) {
    const result = await this.authService.oauthLogin(
      AuthProvider.GOOGLE,
      req.user as any,
    );
    if (result.type === 'pending') {
      const redirectUrl = this.authService.buildOAuthPendingRedirect({
        pendingToken: result.pendingToken,
        missing: result.missing,
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
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('deconnexion')
  async deconnexion() {
    return {
      success: true,
      message: 'Deconnecté avec succès',
    };
  }
}
