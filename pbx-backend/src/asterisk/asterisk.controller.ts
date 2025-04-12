// src/asterisk/asterisk.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
  Query,
  Param,
} from '@nestjs/common';
import { AsteriskService } from './asterisk.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('asterisk')
@UseGuards(JwtAuthGuard)
export class AsteriskController {
  constructor(private readonly asteriskService: AsteriskService) {}

  @Get('status')
  async getStatus() {
    try {
      return await this.asteriskService.getStatus();
    } catch (error) {
      throw new HttpException(
        `Không thể lấy trạng thái Asterisk: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('channels')
  async getChannels() {
    try {
      return await this.asteriskService.getChannels();
    } catch (error) {
      throw new HttpException(
        `Không thể lấy danh sách kênh: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('extension/:extension/status')
  async getExtensionStatus(@Param('extension') extension: string) {
    try {
      return await this.asteriskService.getExtensionStatus(extension);
    } catch (error) {
      throw new HttpException(
        `Không thể lấy trạng thái extension: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('peers')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getActivePeers() {
    try {
      return await this.asteriskService.getActivePeers();
    } catch (error) {
      throw new HttpException(
        `Không thể lấy danh sách SIP peers: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cli')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async executeCliCommand(@Body('command') command: string) {
    if (!command) {
      throw new HttpException(
        'Lệnh không được để trống',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.asteriskService.executeCommand(command);
    } catch (error) {
      throw new HttpException(
        `Không thể thực thi lệnh: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('reload')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async reloadModule(@Body('module') module?: string) {
    try {
      return await this.asteriskService.reloadModule(module);
    } catch (error) {
      throw new HttpException(
        `Không thể tải lại module: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('originate')
  async originateCall(
    @Body()
    params: {
      channel: string;
      extension: string;
      context?: string;
      priority?: number;
      variables?: Record<string, string>;
      callerid?: string;
    },
  ) {
    if (!params.channel || !params.extension) {
      throw new HttpException(
        'Channel và Extension không được để trống',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.asteriskService.originateCall(params);
    } catch (error) {
      throw new HttpException(
        `Không thể thực hiện cuộc gọi: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('hangup')
  async hangupChannel(@Body('channel') channel: string) {
    if (!channel) {
      throw new HttpException(
        'Channel không được để trống',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.asteriskService.hangupChannel(channel);
    } catch (error) {
      throw new HttpException(
        `Không thể ngắt kênh: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
