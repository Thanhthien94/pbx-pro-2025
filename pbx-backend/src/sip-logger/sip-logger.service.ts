// src/sip-logger/sip-logger.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SipLog, SipLogDocument } from './schemas/sip-log.schema';
import { CreateSipLogDto } from './dto/create-sip-log.dto';
import { ConfigService } from '@nestjs/config';

export interface SipLogQueryParams {
  startDate?: string;
  endDate?: string;
  method?: string;
  source_ip?: string;
  limit?: number;
  page?: number;
}

@Injectable()
export class SipLoggerService {
  private readonly logger = new Logger(SipLoggerService.name);
  private readonly enabled: boolean;

  constructor(
    @InjectModel(SipLog.name)
    private sipLogModel: Model<SipLogDocument>,
    private configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>('heplify.enabled', false);
  }

  async create(createSipLogDto: CreateSipLogDto): Promise<SipLog> {
    if (!this.enabled) {
      this.logger.debug('SIP logging is disabled. Skipping log creation.');
      throw new Error('SIP logging is disabled. Log creation is not allowed.');
    }

    try {
      // Nếu không có timestamp, sử dụng thời gian hiện tại
      if (!createSipLogDto.timestamp) {
        createSipLogDto.timestamp = new Date();
      }

      const createdLog = new this.sipLogModel(createSipLogDto);
      return createdLog.save();
    } catch (error) {
      this.logger.error(`Failed to create SIP log: ${error.message}`);
      throw error;
    }
  }

  async findAll(params: SipLogQueryParams) {
    const {
      startDate,
      endDate,
      method,
      source_ip,
      limit = 50,
      page = 1,
    } = params;
    const skip = (page - 1) * limit;

    // Xây dựng query filter
    const filter: any = {};

    if (startDate) {
      filter.timestamp = { ...filter.timestamp, $gte: new Date(startDate) };
    }

    if (endDate) {
      filter.timestamp = { ...filter.timestamp, $lte: new Date(endDate) };
    }

    if (method) {
      filter.method = { $regex: method, $options: 'i' };
    }

    if (source_ip) {
      filter.source_ip = source_ip;
    }

    // Thực hiện query với filter và pagination
    const [logs, total] = await Promise.all([
      this.sipLogModel
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.sipLogModel.countDocuments(filter).exec(),
    ]);

    // Tính toán thông tin phân trang
    const totalPages = Math.ceil(total / limit);

    return {
      logs,
      pagination: {
        total,
        page,
        pages: totalPages,
      },
    };
  }

  async findOne(id: string): Promise<SipLog | null> {
    return this.sipLogModel.findById(id).exec();
  }

  async findByCallId(callId: string): Promise<SipLog[]> {
    return this.sipLogModel
      .find({ call_id: callId })
      .sort({ timestamp: 1 })
      .exec();
  }
}
