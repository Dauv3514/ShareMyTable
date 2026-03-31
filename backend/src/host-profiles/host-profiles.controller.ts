import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { IAuthInfoRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/users.entity';
import { CreateHostProfileDto } from './dto/create-host-profile.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';
import { HostProfilesService } from './host-profiles.service';

@Controller('host-profiles')
export class HostProfilesController {
  constructor(private readonly hostProfilesService: HostProfilesService) {}

  @UseGuards(AuthGuard)
  @Post('request')
  async requestHostProfile(
    @Req() req: IAuthInfoRequest,
    @Body() createHostProfileDto: CreateHostProfileDto,
  ) {
    const userId = req.user?.sub;
    // TODO: brancher la vraie auth si la structure du payload JWT evolue.
    return this.hostProfilesService.requestHostProfile(
      Number(userId),
      createHostProfileDto,
    );
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getMyHostProfile(@Req() req: IAuthInfoRequest) {
    const userId = req.user?.sub;
    // TODO: brancher la vraie auth si la structure du payload JWT evolue.
    return this.hostProfilesService.findMine(Number(userId));
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  async updateMyHostProfile(
    @Req() req: IAuthInfoRequest,
    @Body() updateHostProfileDto: UpdateHostProfileDto,
  ) {
    const userId = req.user?.sub;
    // TODO: brancher la vraie auth si la structure du payload JWT evolue.
    return this.hostProfilesService.updateMine(
      Number(userId),
      updateHostProfileDto,
    );
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/approve')
  async approveHostProfile(@Param('id', ParseIntPipe) id: number) {
    return this.hostProfilesService.approve(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/reject')
  async rejectHostProfile(@Param('id', ParseIntPipe) id: number) {
    return this.hostProfilesService.reject(id);
  }
}
