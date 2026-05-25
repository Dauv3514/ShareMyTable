import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsletterSubscription } from './newsletter-subscription.entity';
import { NewsletterSubscriptionsController } from './newsletter-subscriptions.controller';
import { NewsletterSubscriptionsService } from './newsletter-subscriptions.service';

@Module({
  imports: [TypeOrmModule.forFeature([NewsletterSubscription])],
  controllers: [NewsletterSubscriptionsController],
  providers: [NewsletterSubscriptionsService],
})
export class NewsletterSubscriptionsModule {}
