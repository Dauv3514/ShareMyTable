import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
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

  private normalizePhotoUrls(
    value?: string[] | string | null,
  ): string[] {
    if (value === undefined || value === null) {
      return [];
    }

    const values = Array.isArray(value) ? value : [value];

    return values
      .map((photoUrl) => photoUrl.trim())
      .filter((photoUrl) => photoUrl.length > 0);
  }

  private buildHomePhotoPayload(
    uploadedPhotoUrls: string[],
    bodyPhotoUrls?: string[] | string | null,
    bodyPhotoUrl?: string | null,
  ) {
    const normalizedBodyPhotoUrls = this.normalizePhotoUrls(bodyPhotoUrls);
    const normalizedBodyPhotoUrl = this.normalizePhotoUrls(bodyPhotoUrl);
    const homePhotoUrls = Array.from(
      new Set([
        ...normalizedBodyPhotoUrls,
        ...uploadedPhotoUrls,
        ...normalizedBodyPhotoUrl,
      ]),
    ).slice(0, 5);

    if (homePhotoUrls.length > 0) {
      return {
        homePhotoUrl: homePhotoUrls[0],
        homePhotoUrls,
      };
    }

    if (bodyPhotoUrls !== undefined || bodyPhotoUrl !== undefined) {
      return {
        homePhotoUrl: null,
        homePhotoUrls: [],
      };
    }

    return {
      homePhotoUrl: undefined,
      homePhotoUrls: undefined,
    };
  }

  @UseGuards(AuthGuard)
  @UseInterceptors(
    FilesInterceptor('host_home_photo', 5, registrationImageUploadOptions),
  )
  @Post('request')
  async requestHostProfile(
    @Req() req: IAuthInfoRequest,
    @Body() createHostProfileDto: CreateHostProfileDto,
    @UploadedFiles() files?: Array<{ filename: string }>,
  ) {
    const uploadedPhotoUrls =
      files?.map((file) => buildHostHomePhotoUrl(file.filename)) ?? [];
    const homePhotoPayload = this.buildHomePhotoPayload(
      uploadedPhotoUrls,
      createHostProfileDto.homePhotoUrls,
      createHostProfileDto.homePhotoUrl,
    );

    return this.hostProfilesService.requestHostProfile(
      Number(req.user.sub),
      {
        ...createHostProfileDto,
        ...homePhotoPayload,
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
    FilesInterceptor('host_home_photo', 5, registrationImageUploadOptions),
  )
  @Patch('me')
  async updateMyHostProfile(
    @Req() req: IAuthInfoRequest,
    @Body() updateHostProfileDto: UpdateHostProfileDto,
    @UploadedFiles() files?: Array<{ filename: string }>,
  ) {
    const uploadedPhotoUrls =
      files?.map((file) => buildHostHomePhotoUrl(file.filename)) ?? [];
    const homePhotoPayload = this.buildHomePhotoPayload(
      uploadedPhotoUrls,
      updateHostProfileDto.homePhotoUrls,
      updateHostProfileDto.homePhotoUrl,
    );

    return this.hostProfilesService.updateMine(
      Number(req.user.sub),
      {
        ...updateHostProfileDto,
        ...homePhotoPayload,
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
