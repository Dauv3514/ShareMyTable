import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { InscriptionDto, ConnexionDto, ForgotPasswordDto, ResetPasswordDto } from '../auth/auth.dto';

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
  @Post('deconnexion')
  async deconnexion() {
    return {
      success: true,
      message: 'Deconnecté avec succès',
    };
  }
}
