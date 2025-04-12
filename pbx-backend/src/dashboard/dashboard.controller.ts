// src/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboardData() {
    return this.dashboardService.getDashboardData();
  }
}

// src/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AsteriskService } from '../asterisk/asterisk.service';
import { Extension } from '../extensions/schemas/extension.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Extension.name) private extensionModel: Model<Extension>,
    private asteriskService: AsteriskService,
  ) {}

  async getDashboardData() {
    // Lấy trạng thái Asterisk
    let status = null;
    let channels = null;

    try {
      status = await this.asteriskService.getStatus();
    } catch (error) {
      status = { error: error.message };
    }

    try {
      channels = await this.asteriskService.getChannels();
    } catch (error) {
      channels = { error: error.message };
    }

    // Đếm số lượng các thành phần
    const extensionsCount = await this.extensionModel.countDocuments();

    // Tính số lượng cuộc gọi đang diễn ra (dựa vào channels)
    let activeCallsCount = 0;
    if (channels && !channels.error && channels.length) {
      activeCallsCount = channels.length;
    }

    return {
      status,
      channels,
      counts: {
        extensions: extensionsCount,
        trunks: 0, // Sẽ cập nhật khi module Trunk được hoàn thiện
        queues: 0, // Sẽ cập nhật khi module Queue được hoàn thiện
        activeCalls: activeCallsCount,
        cdrsToday: 0, // Sẽ cập nhật khi module CDR được hoàn thiện
      },
    };
  }
}

// src/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AsteriskModule } from '../asterisk/asterisk.module';
import {
  Extension,
  ExtensionSchema,
} from '../extensions/schemas/extension.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Extension.name, schema: ExtensionSchema },
    ]),
    AsteriskModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
