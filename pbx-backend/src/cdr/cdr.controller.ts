// src/cdr/cdr.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CDRService } from './cdr.service';
import { ApiKeyGuard } from 'src/auth/guards/api-key.guard';

@Controller('cdr')
@UseGuards(ApiKeyGuard)
export class CDRController {
  constructor(private readonly cdrService: CDRService) {}

  @Get()
  async findAll(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('src') src?: string,
    @Query('dst') dst?: string,
    @Query('disposition') disposition?: string,
  ) {
    return this.cdrService.findAll({
      limit: limit ? parseInt(limit.toString(), 10) : undefined,
      page: page ? parseInt(page.toString(), 10) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      src,
      dst,
      disposition,
    });
  }

  @Get('stats')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy')
    groupBy?: 'day' | 'hour' | 'source' | 'destination' | 'disposition',
  ) {
    return this.cdrService.getStats({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      groupBy,
    });
  }

  @Get('recent')
  async getRecentCalls(@Query('limit') limit?: number) {
    return this.cdrService.getRecentCalls(
      limit ? parseInt(limit.toString(), 10) : undefined,
    );
  }

  @Get('today')
  async getTodayCalls() {
    return this.cdrService.getTodayCalls();
  }

  @Get('most-called')
  async getMostCalledDestinations(@Query('limit') limit?: number) {
    return this.cdrService.getMostCalledDestinations(
      limit ? parseInt(limit.toString(), 10) : undefined,
    );
  }

  @Get('most-active-callers')
  async getMostActiveCallers(@Query('limit') limit?: number) {
    return this.cdrService.getMostActiveCallers(
      limit ? parseInt(limit.toString(), 10) : undefined,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.cdrService.findOne(id);
  }

  @Get('uniqueid/:uniqueid')
  async findByUniqueId(@Param('uniqueid') uniqueid: string) {
    return this.cdrService.findByUniqueId(uniqueid);
  }

  @Post()
  async create(@Body() cdrData: any) {
    return this.cdrService.create(cdrData);
  }
}
