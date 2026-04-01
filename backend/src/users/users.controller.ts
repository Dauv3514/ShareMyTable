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
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { IAuthInfoRequest } from '../auth/auth.guard';
import { UsersService } from './users.service';
import { CompleteProfileDto } from './users.dto';

@Controller('users')
@Dependencies(UsersService)
export class UsersController {
  usersService: UsersService;

  constructor(usersService: UsersService) {
    this.usersService = usersService;
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
            biographie: user.bio,
            birthDate: user.birthDate,
            ville: user.city,
            isProfileComplete: user.isProfileComplete,
        };
    }

    @UseGuards(AuthGuard)
    @Patch('me/complete-profile')
    async completeProfile(@Req() req: IAuthInfoRequest, @Body() body: CompleteProfileDto) {
        const updatedUser = await this.usersService.completeProfile(req.user.sub, {
            country: body.country,
            city: body.city,
            birthDate: new Date(body.birth_date),
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

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
