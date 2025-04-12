// src/trunks/trunks.controller.ts
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
import { TrunksService } from './trunks.service';
import { CreateTrunkDto } from './dto/create-trunk.dto';
import { UpdateTrunkDto } from './dto/update-trunk.dto';
import { ApiKeyGuard } from 'src/auth/guards/api-key.guard';

@Controller('trunks')
@UseGuards(ApiKeyGuard)
export class TrunksController {
  constructor(private readonly trunksService: TrunksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTrunkDto: CreateTrunkDto) {
    return this.trunksService.create(createTrunkDto);
  }

  @Get()
  findAll() {
    return this.trunksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trunksService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTrunkDto: UpdateTrunkDto) {
    return this.trunksService.update(id, updateTrunkDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.trunksService.remove(id);
  }
}
