import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { validateEnvConfig } from './config/env.validation';
import { HostProfilesModule } from './host-profiles/host-profiles.module';
import { MealsModule } from './meals/meals.module';
import { PaymentsModule } from './payments/payments.module';
import { MessagingModule } from './messaging/messaging.module';
import { NewsletterSubscriptionsModule } from './newsletter-subscriptions/newsletter-subscriptions.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PushNotificationsModule } from './push-notifications/push-notifications.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const synchronizeDatabase =
  process.env.TYPEORM_SYNCHRONIZE !== undefined
    ? process.env.TYPEORM_SYNCHRONIZE === 'true'
    : !isProduction;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvConfig }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      entities: [],
      synchronize: synchronizeDatabase,
    }),
    AuthModule,
    UsersModule,
    HostProfilesModule,
    MealsModule,
    BookingsModule,
    PaymentsModule,
    MessagingModule,
    NewsletterSubscriptionsModule,
    ReviewsModule,
    PushNotificationsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
