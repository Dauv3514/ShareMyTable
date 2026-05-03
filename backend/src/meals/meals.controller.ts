import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { IAuthInfoRequest } from '../auth/auth.guard';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { MealsService } from './meals.service';

@Controller('meals')
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @UseGuards(AuthGuard)
  @Post()
  async createMeal(
    @Req() req: IAuthInfoRequest,
    @Body() createMealDto: CreateMealDto,
  ) {
    return this.mealsService.create(Number(req.user.sub), createMealDto);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async findMyMeals(@Req() req: IAuthInfoRequest) {
    return this.mealsService.findMine(Number(req.user.sub));
  }

  @UseGuards(AuthGuard)
  @Get('me/:id')
  async findMyMeal(
    @Req() req: IAuthInfoRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.mealsService.findOneMine(Number(req.user.sub), id);
  }

  @UseGuards(AuthGuard)
  @Patch('me/:id')
  async updateMyMeal(
    @Req() req: IAuthInfoRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMealDto: UpdateMealDto,
  ) {
    return this.mealsService.updateMine(Number(req.user.sub), id, updateMealDto);
  }

  @UseGuards(AuthGuard)
  @Patch('me/:id/publish')
  async publishMyMeal(
    @Req() req: IAuthInfoRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.mealsService.publishMine(Number(req.user.sub), id);
  }

  @UseGuards(AuthGuard)
  @Patch('me/:id/cancel')
  async cancelMyMeal(
    @Req() req: IAuthInfoRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.mealsService.cancelMine(Number(req.user.sub), id);
  }

  @UseGuards(AuthGuard)
  @Patch('me/:id/done')
  async markMyMealDone(
    @Req() req: IAuthInfoRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.mealsService.markDoneMine(Number(req.user.sub), id);
  }

  @Get()
  async findPublishedMeals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('hostId') hostId?: string,
    @Query('mealType') mealType?: string,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.mealsService.findAllPublished({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      hostId: hostId ? Number(hostId) : undefined,
      mealType,
      city,
      country,
      dateFrom,
      dateTo,
    });
  }

  @Get(':id')
  async findPublishedMeal(@Param('id', ParseIntPipe) id: number) {
    return this.mealsService.findOnePublished(id);
  }
}
