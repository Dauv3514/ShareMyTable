import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Meal } from '../meals/meal.entity';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';
import { Utilisateur } from '../users/users.entity';
import { MessageConversationMember } from './message-conversation-member.entity';
import { MessageConversation } from './message-conversation.entity';
import { MessageEntry } from './message-entry.entity';
import { MessagingController } from './messaging.controller';
import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessageConversation,
      MessageConversationMember,
      MessageEntry,
      Meal,
      Utilisateur,
    ]),
    AuthModule,
    PushNotificationsModule,
  ],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService],
})
export class MessagingModule {}
