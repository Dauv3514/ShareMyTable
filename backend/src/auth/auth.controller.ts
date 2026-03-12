import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { InscriptionDto, ConnexionDto } from '../auth/auth.dto';

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
  @Post('deconnexion')
  async deconnexion() {
    return {
      success: true,
      message: 'Deconnecté avec succès',
    };
  }
}
