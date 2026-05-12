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
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(AuthGuard)
  @Post()
  async createBooking(
    @Req() req: IAuthInfoRequest,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.create(
      Number(req.user.sub),
      createBookingDto,
    );
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async findMyBookings(@Req() req: IAuthInfoRequest) {
    return this.bookingsService.findMine(Number(req.user.sub));
  }

  @UseGuards(AuthGuard)
  @Get('me/:id')
  async findMyBooking(
    @Req() req: IAuthInfoRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bookingsService.findOneMine(Number(req.user.sub), id);
  }
}