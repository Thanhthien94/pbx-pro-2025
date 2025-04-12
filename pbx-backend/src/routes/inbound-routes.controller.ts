// src/routes/inbound-routes.controller.ts
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
import { InboundRoutesService } from './inbound-routes.service';
import { CreateInboundRouteDto } from './dto/create-inbound-route.dto';
import { UpdateInboundRouteDto } from './dto/update-inbound-route.dto';
import { ApiKeyGuard } from 'src/auth/guards/api-key.guard';

@Controller('routes/inbound')
@UseGuards(ApiKeyGuard)
export class InboundRoutesController {
  constructor(private readonly inboundRoutesService: InboundRoutesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createInboundRouteDto: CreateInboundRouteDto) {
    return this.inboundRoutesService.create(createInboundRouteDto);
  }

  @Get()
  findAll() {
    return this.inboundRoutesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inboundRoutesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInboundRouteDto: UpdateInboundRouteDto,
  ) {
    return this.inboundRoutesService.update(id, updateInboundRouteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.inboundRoutesService.remove(id);
  }
}
