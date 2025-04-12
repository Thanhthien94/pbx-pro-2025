// src/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { BypassAuthGuard } from '../auth/guards/bypass-auth.guard';

@Controller('dashboard')
@UseGuards(BypassAuthGuard) // Thay thế JwtAuthGuard bằng BypassAuthGuard
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboardData() {
    return this.dashboardService.getDashboardData();
  }
}