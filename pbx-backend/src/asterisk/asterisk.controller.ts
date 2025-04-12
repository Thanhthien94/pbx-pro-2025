// src/asterisk/asterisk.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
  Param,
} from '@nestjs/common';
import { AsteriskService } from './asterisk.service';
import { ExtensionAuthGuard } from '../auth/guards/extension-auth.guard';
import { AmiResponse } from './interfaces/ami-response.interface';
import { OriginateParams } from './interfaces/originate-params.interface';

@Controller('asterisk')
@UseGuards(ExtensionAuthGuard)
export class AsteriskController {
  constructor(private readonly asteriskService: AsteriskService) {}

  @Get('status')
  async getStatus(): Promise<AmiResponse> {
    try {
      return await this.asteriskService.getStatus();
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        `Không thể lấy trạng thái Asterisk: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('channels')
  async getChannels(): Promise<AmiResponse> {
    try {
      return await this.asteriskService.getChannels();
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        `Không thể lấy danh sách kênh: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('extension/:extension/status')
  async getExtensionStatus(
    @Param('extension') extension: string,
  ): Promise<AmiResponse> {
    try {
      return await this.asteriskService.getExtensionStatus(extension);
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        `Không thể lấy trạng thái extension: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('peers')
  async getActivePeers(): Promise<AmiResponse> {
    try {
      return await this.asteriskService.getActivePeers();
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        `Không thể lấy danh sách SIP peers: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cli')
  async executeCliCommand(
    @Body('command') command: string,
  ): Promise<AmiResponse> {
    if (!command) {
      throw new HttpException(
        'Lệnh không được để trống',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.asteriskService.executeCommand(command);
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        `Không thể thực thi lệnh: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('reload')
  async reloadModule(@Body('module') module?: string): Promise<AmiResponse> {
    try {
      return await this.asteriskService.reloadModule(module);
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        `Không thể tải lại module: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('originate')
  async originateCall(@Body() params: OriginateParams): Promise<AmiResponse> {
    if (!params.channel || !params.extension) {
      throw new HttpException(
        'Channel và Extension không được để trống',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.asteriskService.originateCall(params);
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        `Không thể thực hiện cuộc gọi: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('hangup')
  async hangupChannel(@Body('channel') channel: string): Promise<AmiResponse> {
    if (!channel) {
      throw new HttpException(
        'Channel không được để trống',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.asteriskService.hangupChannel(channel);
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        `Không thể ngắt kênh: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
