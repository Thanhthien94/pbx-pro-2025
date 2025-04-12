// src/queues/queues.controller.ts
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
import { QueuesService } from './queues.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { BypassAuthGuard } from '../auth/guards/bypass-auth.guard';

@Controller('queues')
@UseGuards(BypassAuthGuard)
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createQueueDto: CreateQueueDto) {
    return this.queuesService.create(createQueueDto);
  }

  @Get()
  findAll() {
    return this.queuesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.queuesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateQueueDto: UpdateQueueDto) {
    return this.queuesService.update(id, updateQueueDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.queuesService.remove(id);
  }
}
