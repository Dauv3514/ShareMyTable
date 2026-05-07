import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import type { IAuthInfoRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  buildHostHomePhotoUrl,
  registrationImageUploadOptions,
} from '../uploads/registration-image-upload';
import { RoleName } from '../users/role.entity';
import { CreateHostProfileDto } from './dto/create-host-profile.dto';
import { RejectHostProfileDto } from './dto/reject-host-profile.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';
import { HostProfilesService } from './host-profiles.service';

// Routes user et admin autour de la candidature hote.
// Les routes "me" manipulent uniquement le profil du user connecte.
// Les routes admin servent a la moderation et a la consultation globale.
@Controller('host-profiles')
export class HostProfilesController {
  constructor(private readonly hostProfilesService: HostProfilesService) {}

  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('host_home_photo', registrationImageUploadOptions),
  )
  @Post('request')
  async requestHostProfile(
    @Req() req: IAuthInfoRequest,
    @Body() createHostProfileDto: CreateHostProfileDto,
    @UploadedFile() file?: { filename: string },
  ) {
    return this.hostProfilesService.requestHostProfile(
      Number(req.user.sub),
      {
        ...createHostProfileDto,
        homePhotoUrl: file?.filename
          ? buildHostHomePhotoUrl(file.filename)
          : createHostProfileDto.homePhotoUrl,
      },
    );
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getMyHostProfile(@Req() req: IAuthInfoRequest) {
    return this.hostProfilesService.findMine(Number(req.user.sub));
  }

  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('host_home_photo', registrationImageUploadOptions),
  )
  @Patch('me')
  async updateMyHostProfile(
    @Req() req: IAuthInfoRequest,
    @Body() updateHostProfileDto: UpdateHostProfileDto,
    @UploadedFile() file?: { filename: string },
  ) {
    return this.hostProfilesService.updateMine(
      Number(req.user.sub),
      {
        ...updateHostProfileDto,
        homePhotoUrl: file?.filename
          ? buildHostHomePhotoUrl(file.filename)
          : updateHostProfileDto.homePhotoUrl,
      },
    );
  }

  @UseGuards(AuthGuard)
  @Patch('me/resubmit')
  async resubmitMyHostProfile(@Req() req: IAuthInfoRequest) {
    return this.hostProfilesService.resubmitMine(Number(req.user.sub));
  }

  @Get('public/user/:userId')
  async findPublicHostProfileByUserId(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.hostProfilesService.findPublicByUserId(userId);
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
  @Get('history')
  async findHostProfileReviewHistory() {
    return this.hostProfilesService.findHistory();
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
  async approveHostProfile(
    @Req() req: IAuthInfoRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.hostProfilesService.approve(id, Number(req.user.sub));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id/reject')
  async rejectHostProfile(
    @Req() req: IAuthInfoRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RejectHostProfileDto,
  ) {
    return this.hostProfilesService.reject(
      id,
      Number(req.user.sub),
      body.rejectionReason,
    );
  }
}
