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
import { ApiKeyGuard } from 'src/auth/guards/api-key.guard';

@Controller('queues')
@UseGuards(ApiKeyGuard)
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

  @Get('status')
  getAllQueueStatuses() {
    return this.queuesService.getAllQueueStatuses();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.queuesService.findOne(id);
  }

  @Get(':name/status')
  getQueueStatus(@Param('name') name: string) {
    return this.queuesService.getQueueStatus(name);
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

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body('member') member: string) {
    return this.queuesService.addMemberToQueue(id, member);
  }

  @Delete(':id/members/:member')
  removeMember(@Param('id') id: string, @Param('member') member: string) {
    return this.queuesService.removeMemberFromQueue(id, member);
  }

  @Post(':name/members/:member/pause')
  pauseMember(
    @Param('name') name: string,
    @Param('member') member: string,
    @Body('reason') reason?: string,
  ) {
    return this.queuesService.pauseQueueMember(name, member, reason);
  }

  @Post(':name/members/:member/unpause')
  unpauseMember(@Param('name') name: string, @Param('member') member: string) {
    return this.queuesService.unpauseQueueMember(name, member);
  }

  @Post(':name/members/:member/dynamic-add')
  addDynamicMember(
    @Param('name') name: string,
    @Param('member') member: string,
    @Body('penalty') penalty?: number,
  ) {
    return this.queuesService.addDynamicMember(name, member, penalty);
  }

  @Delete(':name/members/:member/dynamic-remove')
  removeDynamicMember(
    @Param('name') name: string,
    @Param('member') member: string,
  ) {
    return this.queuesService.removeDynamicMember(name, member);
  }

  @Post(':name/reset-stats')
  resetStats(@Param('name') name: string) {
    return this.queuesService.resetQueueStats(name);
  }
}
