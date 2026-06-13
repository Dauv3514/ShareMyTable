import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { InscriptionDto, ConnexionDto, ForgotPasswordDto, ResetPasswordDto, OAuthCompleteDto, ChangePasswordDto } from '../auth/auth.dto';
import { HostProfilesService } from '../host-profiles/host-profiles.service';
import { AuthProvider } from '../users/users.entity';
import { GoogleAuthGuard } from './google-auth.guard';
import { AuthGuard } from './auth.guard';
import type { IAuthInfoRequest } from './auth.guard';
import { buildProfilePhotoUrl, profilePhotoUploadOptions } from '../uploads/profile-photo-upload';
import {
  buildHostHomePhotoUrl,
  registrationImageUploadOptions,
} from '../uploads/registration-image-upload';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private hostProfilesService: HostProfilesService,
  ) {}

  private isTrue(value?: string | boolean) {
    return value === true || value === 'true';
  }

  private getProfilePhotoUpdate(
    body: { profile_photo_url?: string; remove_profile_photo?: string },
    file?: { filename: string },
  ) {
    if (file?.filename) {
      return buildProfilePhotoUrl(file.filename);
    }

    if (body.remove_profile_photo === 'true') {
      return null;
    }

    if (body.profile_photo_url !== undefined) {
      return body.profile_photo_url;
    }

    return undefined;
  }

  private getUploadedFile(
    files: Record<string, Array<{ filename: string }> | undefined> | undefined,
    fieldName: string,
  ) {
    return files?.[fieldName]?.[0];
  }

  @Public()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profile_photo', maxCount: 1 },
        { name: 'host_home_photo', maxCount: 5 },
      ],
      registrationImageUploadOptions,
    ),
  )
  @Post('inscription')
  async inscription(
    @Body() userDto: InscriptionDto,
    @UploadedFiles()
    files?: {
      profile_photo?: Array<{ filename: string }>;
      host_home_photo?: Array<{ filename: string }>;
    },
  ) {
    const requestHost = this.isTrue(userDto.request_host);
    const profilePhotoFile = this.getUploadedFile(files, 'profile_photo');
    const hostHomePhotoFiles = files?.host_home_photo ?? [];
    const hostHomePhotoUrls = hostHomePhotoFiles.map((file) =>
      buildHostHomePhotoUrl(file.filename),
    );

    if (requestHost) {
      const submittedHostHomePhotos = [
        ...hostHomePhotoUrls,
        userDto.host_home_photo_url?.trim(),
      ].filter((photoUrl): photoUrl is string => Boolean(photoUrl));

      if (!userDto.host_district_label?.trim()) {
        throw new BadRequestException(
          'Le quartier est obligatoire pour envoyer une demande hôte',
        );
      }

      if (!userDto.host_address?.trim()) {
        throw new BadRequestException(
          "L'adresse est obligatoire pour envoyer une demande hôte",
        );
      }

      if (submittedHostHomePhotos.length < 2) {
        throw new BadRequestException(
          'Au moins 2 photos du logement sont obligatoires pour envoyer une demande hote',
        );
      }
    }

    const inscriptionResult = await this.authService.inscription({
      ...userDto,
      profile_photo_url:
        this.getProfilePhotoUpdate(userDto, profilePhotoFile) ?? undefined,
    });

    if (!requestHost) {
      return inscriptionResult;
    }

    try {
      await this.hostProfilesService.requestHostProfile(inscriptionResult.userId, {
        country: userDto.country,
        city: userDto.city,
        districtLabel: userDto.host_district_label!.trim(),
        address: userDto.host_address!.trim(),
        homePhotoUrl:
          hostHomePhotoUrls[0] ?? userDto.host_home_photo_url?.trim() ?? undefined,
        homePhotoUrls:
          hostHomePhotoUrls.length > 0 ? hostHomePhotoUrls : undefined,
      });

      return {
        ...inscriptionResult,
        hostRequestCreated: true,
      };
    } catch (error) {
      const hostRequestError =
        error instanceof Error
          ? error.message
          : "La demande hôte n'a pas pu être envoyée";

      return {
        ...inscriptionResult,
        hostRequestCreated: false,
        hostRequestError,
      };
    }
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
  @UseInterceptors(FileInterceptor('profile_photo', profilePhotoUploadOptions))
  @Post('oauth/complete')
  async oauthComplete(@Body() body: OAuthCompleteDto, @UploadedFile() file?: { filename: string }) {
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
      profilePhotoUrl: this.getProfilePhotoUpdate(body, file) ?? undefined,
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
      message: 'Déconnecté avec succès',
    };
  }
}
