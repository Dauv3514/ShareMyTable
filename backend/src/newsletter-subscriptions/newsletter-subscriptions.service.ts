import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateNewsletterSubscriptionDto } from './dto/create-newsletter-subscription.dto';
import { NewsletterSubscription } from './newsletter-subscription.entity';

@Injectable()
export class NewsletterSubscriptionsService {
  constructor(
    @InjectRepository(NewsletterSubscription)
    private readonly newsletterSubscriptionsRepository: Repository<NewsletterSubscription>,
  ) {}

  async subscribe(dto: CreateNewsletterSubscriptionDto) {
    const email = dto.email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Adresse email invalide');
    }

    const existingSubscription =
      await this.newsletterSubscriptionsRepository.findOne({
        where: { email },
      });

    if (existingSubscription) {
      existingSubscription.isActive = true;
      existingSubscription.unsubscribedAt = null;
      return this.newsletterSubscriptionsRepository.save(existingSubscription);
    }

    return this.newsletterSubscriptionsRepository.save(
      this.newsletterSubscriptionsRepository.create({
        email,
        isActive: true,
        unsubscribedAt: null,
      }),
    );
  }
}
