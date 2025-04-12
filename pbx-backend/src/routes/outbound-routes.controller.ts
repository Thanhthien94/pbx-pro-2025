// src/routes/outbound-routes.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { OutboundRoutesService } from './outbound-routes.service';
import { CreateOutboundRouteDto } from './dto/create-outbound-route.dto';
import { UpdateOutboundRouteDto } from './dto/update-outbound-route.dto';
import { ApiKeyGuard } from 'src/auth/guards/api-key.guard';

@Controller('routes/outbound')
@UseGuards(ApiKeyGuard)
export class OutboundRoutesController {
  constructor(private readonly outboundRoutesService: OutboundRoutesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createOutboundRouteDto: CreateOutboundRouteDto) {
    return this.outboundRoutesService.create(createOutboundRouteDto);
  }

  @Get()
  findAll() {
    return this.outboundRoutesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.outboundRoutesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOutboundRouteDto: UpdateOutboundRouteDto,
  ) {
    return this.outboundRoutesService.update(id, updateOutboundRouteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.outboundRoutesService.remove(id);
  }
}
