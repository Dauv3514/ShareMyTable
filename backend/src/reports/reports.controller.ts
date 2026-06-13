import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { IAuthInfoRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RoleName } from '../users/role.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  async createReport(
    @Req() req: IAuthInfoRequest,
    @Body() createReportDto: CreateReportDto,
  ) {
    return this.reportsService.createForUser(
      Number(req.user.sub),
      createReportDto,
    );
  }

  @Get('me')
  async getMyReports(@Req() req: IAuthInfoRequest) {
    return this.reportsService.findMine(Number(req.user.sub));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get('admin')
  async getAdminReports() {
    return this.reportsService.findAllForAdmin();
  }
}
