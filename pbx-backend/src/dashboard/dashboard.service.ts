// src/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Extension,
  ExtensionDocument,
} from '../extensions/schemas/extension.schema';
import { Trunk, TrunkDocument } from '../trunks/schemas/trunk.schema';
import { Queue, QueueDocument } from '../queues/schemas/queue.schema';
import { CDR, CDRDocument } from '../cdr/schemas/cdr.schema';
import { AsteriskService } from '../asterisk/asterisk.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Extension.name)
    private extensionModel: Model<ExtensionDocument>,
    @InjectModel(Trunk.name)
    private trunkModel: Model<TrunkDocument>,
    @InjectModel(Queue.name)
    private queueModel: Model<QueueDocument>,
    @InjectModel(CDR.name)
    private cdrModel: Model<CDRDocument>,
    private asteriskService: AsteriskService,
  ) {}

  async getDashboardData() {
    // Lấy trạng thái Asterisk
    const asteriskStatus = await this.getAsteriskStatus();

    // Lấy thông tin các kênh đang hoạt động
    const channels = await this.getActiveChannels();

    // Lấy số lượng extensions, trunks, queues
    const counts = await this.getCounts();

    return {
      status: asteriskStatus,
      channels: channels,
      counts: counts,
    };
  }

  private async getAsteriskStatus() {
    try {
      const status = await this.asteriskService.getStatus();
      return status;
    } catch (error) {
      console.error('Lỗi khi lấy trạng thái Asterisk:', error);
      return { error: 'Không thể kết nối với Asterisk' };
    }
  }

  private async getActiveChannels() {
    try {
      const channels = await this.asteriskService.getChannels();
      return channels;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách kênh Asterisk:', error);
      return { error: 'Không thể lấy thông tin kênh' };
    }
  }

  private async getCounts() {
    // Lấy ngày bắt đầu của hôm nay (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Đếm số lượng các thực thể
    const [extensions, trunks, queues, activeCalls, cdrsToday] =
      await Promise.all([
        this.extensionModel.countDocuments().exec(),
        this.trunkModel.countDocuments().exec(),
        this.queueModel.countDocuments().exec(),
        this.getActiveCallsCount(),
        this.cdrModel.countDocuments({ start: { $gte: today } }).exec(),
      ]);

    return {
      extensions,
      trunks,
      queues,
      activeCalls,
      cdrsToday,
    };
  }

  private async getActiveCallsCount(): Promise<number> {
    try {
      const channels = await this.asteriskService.getChannels();

      // Phân tích kết quả từ Asterisk để lấy số lượng cuộc gọi đang hoạt động
      if (channels && channels.events) {
        // Lọc các sự kiện CoreShowChannel để đếm các kênh đang hoạt động
        const activeChannels = channels.events.filter(
          (event) =>
            event.event === 'CoreShowChannel' && event.channelstate !== '6', // 6 là trạng thái "Up"
        );

        return activeChannels.length;
      }

      return 0;
    } catch (error) {
      console.error('Lỗi khi đếm cuộc gọi đang hoạt động:', error);
      return 0;
    }
  }
}
