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
import { RoleName } from '../users/role.entity';
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
    return this.hostProfilesService.requestHostProfile(
      Number(req.user.sub),
      createHostProfileDto,
    );
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getMyHostProfile(@Req() req: IAuthInfoRequest) {
    return this.hostProfilesService.findMine(Number(req.user.sub));
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  async updateMyHostProfile(
    @Req() req: IAuthInfoRequest,
    @Body() updateHostProfileDto: UpdateHostProfileDto,
  ) {
    return this.hostProfilesService.updateMine(
      Number(req.user.sub),
      updateHostProfileDto,
    );
  }

  @UseGuards(AuthGuard)
  @Patch('me/resubmit')
  async resubmitMyHostProfile(@Req() req: IAuthInfoRequest) {
    return this.hostProfilesService.resubmitMine(Number(req.user.sub));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get('pending')
  async findPendingHostProfiles() {
    return this.hostProfilesService.findPending();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get()
  async findAllHostProfiles() {
    return this.hostProfilesService.findAll();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get(':id')
  async findHostProfileById(@Param('id', ParseIntPipe) id: number) {
    return this.hostProfilesService.findById(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id/approve')
  async approveHostProfile(@Param('id', ParseIntPipe) id: number) {
    return this.hostProfilesService.approve(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id/reject')
  async rejectHostProfile(@Param('id', ParseIntPipe) id: number) {
    return this.hostProfilesService.reject(id);
  }
}
