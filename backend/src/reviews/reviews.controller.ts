import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { IAuthInfoRequest } from '../auth/auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('hosts/:hostId')
  async getPublicHostReviews(@Param('hostId', ParseIntPipe) hostId: number) {
    return this.reviewsService.findPublicReviewsForHost(hostId);
  }

  @UseGuards(AuthGuard)
  @Get('bookings/:bookingId')
  async getReviewState(
    @Req() req: IAuthInfoRequest,
    @Param('bookingId', ParseIntPipe) bookingId: number,
  ) {
    return this.reviewsService.getReviewStateForBooking(
      Number(req.user.sub),
      bookingId,
    );
  }

  @UseGuards(AuthGuard)
  @Post('bookings/:bookingId')
  async createReview(
    @Req() req: IAuthInfoRequest,
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.createForBooking(
      Number(req.user.sub),
      bookingId,
      createReviewDto,
    );
  }

  @UseGuards(AuthGuard)
  @Patch('bookings/:bookingId')
  async updateReview(
    @Req() req: IAuthInfoRequest,
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateForBooking(
      Number(req.user.sub),
      bookingId,
      updateReviewDto,
    );
  }

  @UseGuards(AuthGuard)
  @Post('tips/:tipId/confirm')
  async confirmTip(
    @Req() req: IAuthInfoRequest,
    @Param('tipId', ParseIntPipe) tipId: number,
  ) {
    return this.reviewsService.confirmTip(Number(req.user.sub), tipId);
  }
}