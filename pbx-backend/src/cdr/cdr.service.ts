// src/cdr/cdr.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CDR, CDRDocument } from './schemas/cdr.schema';

@Injectable()
export class CDRService {
  private readonly logger = new Logger(CDRService.name);

  constructor(@InjectModel(CDR.name) private cdrModel: Model<CDRDocument>) {}

  async findAll(params: {
    limit?: number;
    page?: number;
    startDate?: Date;
    endDate?: Date;
    src?: string;
    dst?: string;
    disposition?: string;
  }): Promise<{ data: CDR[]; total: number; page: number; pages: number }> {
    const {
      limit = 50,
      page = 1,
      startDate,
      endDate,
      src,
      dst,
      disposition,
    } = params;

    const query: Record<string, any> = {};

    // Thêm các điều kiện tìm kiếm
    if (startDate || endDate) {
      query.start = {};
      if (startDate) query.start.$gte = new Date(startDate);
      if (endDate) query.start.$lte = new Date(endDate);
    }

    if (src) query.src = { $regex: src, $options: 'i' };
    if (dst) query.dst = { $regex: dst, $options: 'i' };
    if (disposition) query.disposition = disposition;

    const skip = (page - 1) * limit;
    const total = await this.cdrModel.countDocuments(query);
    const pages = Math.ceil(total / limit);

    const data = await this.cdrModel
      .find(query)
      .sort({ start: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      data,
      total,
      page,
      pages,
    };
  }

  async findOne(id: string): Promise<CDR> {
    const cdr = await this.cdrModel.findById(id).exec();
    if (!cdr) {
      throw new NotFoundException(`Không tìm thấy CDR với ID ${id}`);
    }
    return cdr;
  }

  async findByUniqueId(uniqueid: string): Promise<CDR> {
    const cdr = await this.cdrModel.findOne({ uniqueid }).exec();
    if (!cdr) {
      throw new NotFoundException(
        `Không tìm thấy CDR với uniqueid ${uniqueid}`,
      );
    }
    return cdr;
  }

  async create(cdrData: Partial<CDR>): Promise<CDR> {
    const createdCDR = new this.cdrModel(cdrData);
    return createdCDR.save();
  }

  async getStats(params: {
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'day' | 'hour' | 'source' | 'destination' | 'disposition';
  }): Promise<any> {
    const { startDate, endDate, groupBy = 'day' } = params;

    const matchStage: Record<string, any> = {};

    // Thêm điều kiện thời gian
    if (startDate || endDate) {
      matchStage.start = {};
      if (startDate) matchStage.start.$gte = new Date(startDate);
      if (endDate) matchStage.start.$lte = new Date(endDate);
    }

    let groupStage: Record<string, any> = {};

    // Tạo stage nhóm theo tiêu chí
    switch (groupBy) {
      case 'day':
        groupStage = {
          _id: {
            year: { $year: '$start' },
            month: { $month: '$start' },
            day: { $dayOfMonth: '$start' },
          },
          date: { $first: '$start' },
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalBillsec: { $sum: '$billsec' },
          answered: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'ANSWERED'] }, 1, 0],
            },
          },
          noanswer: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'NO ANSWER'] }, 1, 0],
            },
          },
          busy: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'BUSY'] }, 1, 0],
            },
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'FAILED'] }, 1, 0],
            },
          },
        };
        break;
      case 'hour':
        groupStage = {
          _id: {
            year: { $year: '$start' },
            month: { $month: '$start' },
            day: { $dayOfMonth: '$start' },
            hour: { $hour: '$start' },
          },
          date: { $first: '$start' },
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalBillsec: { $sum: '$billsec' },
          answered: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'ANSWERED'] }, 1, 0],
            },
          },
          noanswer: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'NO ANSWER'] }, 1, 0],
            },
          },
          busy: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'BUSY'] }, 1, 0],
            },
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'FAILED'] }, 1, 0],
            },
          },
        };
        break;
      case 'source':
        groupStage = {
          _id: '$src',
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalBillsec: { $sum: '$billsec' },
          answered: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'ANSWERED'] }, 1, 0],
            },
          },
          noanswer: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'NO ANSWER'] }, 1, 0],
            },
          },
          busy: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'BUSY'] }, 1, 0],
            },
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'FAILED'] }, 1, 0],
            },
          },
        };
        break;
      case 'destination':
        groupStage = {
          _id: '$dst',
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalBillsec: { $sum: '$billsec' },
          answered: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'ANSWERED'] }, 1, 0],
            },
          },
          noanswer: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'NO ANSWER'] }, 1, 0],
            },
          },
          busy: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'BUSY'] }, 1, 0],
            },
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'FAILED'] }, 1, 0],
            },
          },
        };
        break;
      case 'disposition':
        groupStage = {
          _id: '$disposition',
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalBillsec: { $sum: '$billsec' },
        };
        break;
    }

    // Thực hiện aggregation query
    const result = await this.cdrModel.aggregate([
      { $match: matchStage },
      { $group: groupStage },
      {
        $sort:
          groupBy === 'day' || groupBy === 'hour' ? { date: 1 } : { count: -1 },
      },
    ]);

    return result;
  }

  async getRecentCalls(limit = 10): Promise<CDR[]> {
    return this.cdrModel.find().sort({ start: -1 }).limit(limit).exec();
  }

  async getTodayCalls(): Promise<{
    total: number;
    answered: number;
    noanswer: number;
    busy: number;
    failed: number;
    averageDuration: number;
  }> {
    // Lấy ngày hiện tại, đặt giờ về 00:00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Ngày mai, để làm giới hạn trên
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Query tất cả cuộc gọi của ngày hôm nay
    const calls = await this.cdrModel
      .find({
        start: {
          $gte: today,
          $lt: tomorrow,
        },
      })
      .exec();

    // Phân tích dữ liệu
    const total = calls.length;
    let answered = 0;
    let noanswer = 0;
    let busy = 0;
    let failed = 0;
    let totalDuration = 0;

    calls.forEach((call) => {
      switch (call.disposition) {
        case 'ANSWERED':
          answered++;
          totalDuration += call.duration;
          break;
        case 'NO ANSWER':
        case 'NOANSWER':
          noanswer++;
          break;
        case 'BUSY':
          busy++;
          break;
        case 'FAILED':
          failed++;
          break;
      }
    });

    const averageDuration = answered > 0 ? totalDuration / answered : 0;

    return {
      total,
      answered,
      noanswer,
      busy,
      failed,
      averageDuration,
    };
  }

  async getMostCalledDestinations(limit = 5): Promise<any[]> {
    return this.cdrModel.aggregate([
      { $group: { _id: '$dst', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
  }

  async getMostActiveCallers(limit = 5): Promise<any[]> {
    return this.cdrModel.aggregate([
      { $group: { _id: '$src', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
  }
}
