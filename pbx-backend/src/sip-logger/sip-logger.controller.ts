// src/sip-logger/sip-logger.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SipLoggerService } from './sip-logger.service';
import { CreateSipLogDto } from './dto/create-sip-log.dto';
import { ApiKeyGuard } from 'src/auth/guards/api-key.guard';

@Controller('sip-logs')
@UseGuards(ApiKeyGuard)
export class SipLoggerController {
  constructor(private readonly sipLoggerService: SipLoggerService) {}

  @Post()
  async create(@Body() createSipLogDto: CreateSipLogDto) {
    try {
      return await this.sipLoggerService.create(createSipLogDto);
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        `Không thể tạo bản ghi SIP: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('method') method?: string,
    @Query('source_ip') sourceIp?: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    try {
      return await this.sipLoggerService.findAll({
        startDate,
        endDate,
        method,
        source_ip: sourceIp,
        limit: limit ? +limit : 50,
        page: page ? +page : 1,
      });
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        `Không thể lấy dữ liệu SIP logs: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const log = await this.sipLoggerService.findOne(id);
      if (!log) {
        throw new HttpException(
          `Không tìm thấy SIP log với id ${id}`,
          HttpStatus.NOT_FOUND,
        );
      }
      return log;
    } catch (error) {
      const err = error as Error;
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        `Không thể lấy dữ liệu SIP log: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('call/:callId')
  async findByCallId(@Param('callId') callId: string) {
    try {
      return await this.sipLoggerService.findByCallId(callId);
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        `Không thể lấy dữ liệu SIP logs cho cuộc gọi ${callId}: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
