import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { IAuthInfoRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RoleName } from '../users/role.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import {
  OpenReservationDirectConversationDto,
  SyncMealConversationsDto,
} from './dto/sync-meal-conversations.dto';
import { MessagingService } from './messaging.service';

// Premiers endpoints backend de messagerie.
// Les routes "me" servent aux conversations visibles par l'utilisateur courant.
// Les routes admin permettent pour l'instant de simuler l'ouverture liee aux reservations.
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @UseGuards(AuthGuard)
  @Get('conversations')
  async listMyConversations(@Req() req: IAuthInfoRequest) {
    return this.messagingService.listMyConversations(Number(req.user.sub));
  }

  @UseGuards(AuthGuard)
  @Get('unread-count')
  async getUnreadCount(@Req() req: IAuthInfoRequest) {
    return this.messagingService.getUnreadMessagesCount(Number(req.user.sub));
  }

  @UseGuards(AuthGuard)
  @Get('conversations/:id/messages')
  async getConversationMessages(
    @Req() req: IAuthInfoRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.messagingService.getConversationMessages(Number(req.user.sub), id);
  }

  @UseGuards(AuthGuard)
  @Post('conversations/:id/read')
  async markConversationAsRead(
    @Req() req: IAuthInfoRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.messagingService.markConversationAsRead(Number(req.user.sub), id);
  }

  @UseGuards(AuthGuard)
  @Post('conversations/:id/messages')
  async sendMessage(
    @Req() req: IAuthInfoRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.messagingService.sendMessage(
      Number(req.user.sub),
      id,
      createMessageDto,
    );
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post('admin/meals/:mealId/reservation-direct')
  async openReservationDirectConversation(
    @Param('mealId', ParseIntPipe) mealId: number,
    @Body() body: OpenReservationDirectConversationDto,
  ) {
    return this.messagingService.openReservationDirectConversation(
      mealId,
      body.guestUserId,
    );
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post('admin/meals/:mealId/accepted-sync')
  async syncAcceptedMealConversations(
    @Param('mealId', ParseIntPipe) mealId: number,
    @Body() body: SyncMealConversationsDto,
  ) {
    return this.messagingService.syncAcceptedMealConversations(
      mealId,
      body.participantUserIds,
    );
  }
}
