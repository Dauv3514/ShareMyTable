import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Booking } from '../bookings/booking.entity';
import { HostProfile } from '../host-profiles/host-profile.entity';
import { Utilisateur } from '../users/users.entity';
import { MealMenuItem } from './meal-menu-item.entity';
import { MealTagAssignment } from './meal-tag-assignment.entity';
import { MealTag } from './meal-tag.entity';
import { Meal } from './meal.entity';
import { MealsController } from './meals.controller';
import { MealsService } from './meals.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Meal,
      MealMenuItem,
      MealTag,
      MealTagAssignment,
      Utilisateur,
      HostProfile,
      Booking,
    ]),
    AuthModule,
  ],
  controllers: [MealsController],
  providers: [MealsService],
  exports: [MealsService],
})
export class MealsModule {}
