import { Body, Controller, Post } from '@nestjs/common';
import { CreateNewsletterSubscriptionDto } from './dto/create-newsletter-subscription.dto';
import { NewsletterSubscriptionsService } from './newsletter-subscriptions.service';

@Controller('newsletter-subscriptions')
export class NewsletterSubscriptionsController {
  constructor(
    private readonly newsletterSubscriptionsService: NewsletterSubscriptionsService,
  ) {}

  @Post()
  async subscribe(@Body() dto: CreateNewsletterSubscriptionDto) {
    const subscription = await this.newsletterSubscriptionsService.subscribe(dto);

    return {
      id: subscription.id,
      email: subscription.email,
      isActive: subscription.isActive,
      createdAt: subscription.createdAt,
      unsubscribedAt: subscription.unsubscribedAt,
    };
  }
}
