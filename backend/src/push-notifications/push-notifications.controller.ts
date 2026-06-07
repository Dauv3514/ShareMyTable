import { Body, Controller, Delete, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type IAuthInfoRequest } from '../auth/auth.guard';
import { DeletePushSubscriptionDto } from './dto/delete-push-subscription.dto';
import { SavePushSubscriptionDto } from './dto/save-push-subscription.dto';
import { PushNotificationsService } from './push-notifications.service';

@Controller('push-notifications')
export class PushNotificationsController {
  constructor(
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  @Get('public-key')
  getPublicKey() {
    return this.pushNotificationsService.getPublicKey();
  }

  @UseGuards(AuthGuard)
  @Post('subscriptions')
  saveSubscription(
    @Req() req: IAuthInfoRequest,
    @Headers('user-agent') userAgent: string | undefined,
    @Body() dto: SavePushSubscriptionDto,
  ) {
    return this.pushNotificationsService.saveSubscription(
      Number(req.user.sub),
      dto,
      userAgent,
    );
  }

  @UseGuards(AuthGuard)
  @Delete('subscriptions')
  deleteSubscription(
    @Req() req: IAuthInfoRequest,
    @Body() dto: DeletePushSubscriptionDto,
  ) {
    return this.pushNotificationsService.deleteSubscription(
      Number(req.user.sub),
      dto.endpoint,
    );
  }
}
