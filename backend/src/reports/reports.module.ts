import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Booking } from '../bookings/booking.entity';
import { Meal } from '../meals/meal.entity';
import { MessageConversation } from '../messaging/message-conversation.entity';
import { MessageConversationMember } from '../messaging/message-conversation-member.entity';
import { Utilisateur } from '../users/users.entity';
import { Report } from './report.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Report,
      Utilisateur,
      Meal,
      Booking,
      MessageConversation,
      MessageConversationMember,
    ]),
    AuthModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
