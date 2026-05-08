import {
  Controller,
  Dependencies,
  Get,
  NotFoundException,
  Param,
  Req,
  UseGuards,
  Patch,
  Body,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import type { IAuthInfoRequest } from '../auth/auth.guard';
import { UsersService } from './users.service';
import {
  CompleteProfileDto,
  UpdateProfileDto,
  UpdateUserPreferencesDto,
} from './users.dto';
import { buildProfilePhotoUrl, profilePhotoUploadOptions } from '../uploads/profile-photo-upload';

@Controller('users')
@Dependencies(UsersService)
export class UsersController {
  usersService: UsersService;

  constructor(usersService: UsersService) {
    this.usersService = usersService;
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

    @UseGuards(AuthGuard)
    @Get('me')
    async getProfile(@Req() req: IAuthInfoRequest) {
        const user = await this.usersService.findOneUser(req.user.sub);
        if (!user) throw new NotFoundException('Utilisateur non trouvé');
        return {
            userId: user.id,
            phone: user.phone,
            pseudo: user.pseudo,
            pays: user.country,
            prenom: user.firstName,
            nom: user.lastName,
            email: user.email,
            profilePhotoUrl: user.profilePhotoUrl,
            role: user.role.name,
            authProvider: user.authProvider,
            biographie: user.bio,
            birthDate: user.birthDate,
            ville: user.city,
            isProfileComplete: user.isProfileComplete,
        };
    }

    @UseGuards(AuthGuard)
    @Get('me/preferences')
    async getMyPreferences(@Req() req: IAuthInfoRequest) {
        const preferences = await this.usersService.getUserPreferenceSummary(req.user.sub, {
            initializeDefaults: true,
        });

        return {
            dietaryTags: preferences.dietaryTags,
            ambianceTags: preferences.ambianceTags,
        };
    }

    @UseGuards(AuthGuard)
    @UseInterceptors(FileInterceptor('profile_photo', profilePhotoUploadOptions))
    @Patch('me')
    async updateProfile(
        @Req() req: IAuthInfoRequest,
        @Body() body: UpdateProfileDto,
        @UploadedFile() file?: { filename: string },
    ) {
        const updatedUser = await this.usersService.updateProfile(req.user.sub, {
            firstName: body.first_name,
            lastName: body.last_name,
            phone: body.phone,
            pseudo: body.pseudo,
            country: body.country,
            city: body.city,
            bio: body.bio,
            birthDate: new Date(body.birth_date),
            profilePhotoUrl: this.getProfilePhotoUpdate(body, file),
        });

        return {
            success: true,
            user: {
                userId: updatedUser.id,
                phone: updatedUser.phone,
                pseudo: updatedUser.pseudo,
                pays: updatedUser.country,
                prenom: updatedUser.firstName,
                nom: updatedUser.lastName,
                email: updatedUser.email,
                profilePhotoUrl: updatedUser.profilePhotoUrl,
                role: updatedUser.role.name,
                authProvider: updatedUser.authProvider,
                biographie: updatedUser.bio,
                birthDate: updatedUser.birthDate,
                ville: updatedUser.city,
                isProfileComplete: updatedUser.isProfileComplete,
            },
        };
    }

    @UseGuards(AuthGuard)
    @Patch('me/preferences')
    async updateMyPreferences(
        @Req() req: IAuthInfoRequest,
        @Body() body: UpdateUserPreferencesDto,
    ) {
        const preferences = await this.usersService.updateUserPreferenceSummary(req.user.sub, {
            dietaryTags: body.dietary_tags ?? [],
            ambianceTags: body.ambiance_tags ?? [],
        });

        return {
            success: true,
            preferences: {
                dietaryTags: preferences.dietaryTags,
                ambianceTags: preferences.ambianceTags,
            },
        };
    }

    @UseGuards(AuthGuard)
    @UseInterceptors(FileInterceptor('profile_photo', profilePhotoUploadOptions))
    @Patch('me/complete-profile')
    async completeProfile(
        @Req() req: IAuthInfoRequest,
        @Body() body: CompleteProfileDto,
        @UploadedFile() file?: { filename: string },
    ) {
        const updatedUser = await this.usersService.completeProfile(req.user.sub, {
            country: body.country,
            city: body.city,
            birthDate: new Date(body.birth_date),
            pseudo: body.pseudo,
            bio: body.bio,
            profilePhotoUrl: this.getProfilePhotoUpdate(body, file),
        });
        return {
            success: true,
            user: {
                country: updatedUser.country,
                city: updatedUser.city,
                birthDate: updatedUser.birthDate,
                isProfileComplete: updatedUser.isProfileComplete,
            },
        };
    }

  @Get(':userId')
  async getUser(@Param('userId') userId: number) {
    const user = await this.usersService.findOneUser(Number(userId));
    if (!user) throw new NotFoundException('Utilisateur non trouvÃ©');
    return {
      userId: user.id,
      username: user.pseudo,
    };
  }

  @Get(':userId/preferences')
  async getUserPreferences(@Param('userId') userId: number) {
    const preferences = await this.usersService.getUserPreferenceSummary(Number(userId), {
      initializeDefaults: true,
    });

    return {
      dietaryTags: preferences.dietaryTags,
      ambianceTags: preferences.ambianceTags,
    };
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
