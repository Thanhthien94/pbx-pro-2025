// src/queues/queues.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Queue, QueueDocument } from './schemas/queue.schema';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { AsteriskService } from '../asterisk/asterisk.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QueuesService {
  private readonly logger = new Logger(QueuesService.name);
  private readonly configDir: string;

  constructor(
    @InjectModel(Queue.name)
    private queueModel: Model<QueueDocument>,
    private asteriskService: AsteriskService,
    private configService: ConfigService,
  ) {
    this.configDir = this.configService.get<string>(
      'asterisk.configDir',
      '/etc/asterisk',
    );
  }

  async create(createQueueDto: CreateQueueDto): Promise<Queue> {
    // Kiểm tra xem queue đã tồn tại chưa
    const existingQueue = await this.queueModel.findOne({
      name: createQueueDto.name,
    });

    if (existingQueue) {
      throw new ConflictException(`Queue ${createQueueDto.name} đã tồn tại`);
    }

    // Tạo queue mới
    const createdQueue = new this.queueModel(createQueueDto);
    const savedQueue = await createdQueue.save();

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return savedQueue;
  }

  async findAll(): Promise<Queue[]> {
    return this.queueModel.find().exec();
  }

  async findOne(id: string): Promise<Queue> {
    const queue = await this.queueModel.findById(id).exec();
    if (!queue) {
      throw new NotFoundException(`Không tìm thấy queue với id ${id}`);
    }
    return queue;
  }

  async update(id: string, updateQueueDto: UpdateQueueDto): Promise<Queue> {
    // Kiểm tra xem queue có tồn tại không
    const existingQueue = await this.queueModel.findById(id).exec();
    if (!existingQueue) {
      throw new NotFoundException(`Không tìm thấy queue với id ${id}`);
    }

    // Kiểm tra xem tên mới có trùng với queue khác không
    if (updateQueueDto.name && updateQueueDto.name !== existingQueue.name) {
      const queueExists = await this.queueModel.findOne({
        name: updateQueueDto.name,
        _id: { $ne: id },
      });

      if (queueExists) {
        throw new ConflictException(`Queue ${updateQueueDto.name} đã tồn tại`);
      }
    }

    // Cập nhật queue
    const updatedQueue = await this.queueModel
      .findByIdAndUpdate(id, updateQueueDto, { new: true })
      .exec();

    if (!updatedQueue) {
      throw new NotFoundException(`Không tìm thấy queue với id ${id}`);
    }

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return updatedQueue;
  }

  async remove(id: string): Promise<Queue> {
    const deletedQueue = await this.queueModel.findByIdAndDelete(id).exec();
    if (!deletedQueue) {
      throw new NotFoundException(`Không tìm thấy queue với id ${id}`);
    }

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return deletedQueue;
  }

  async addMemberToQueue(queueId: string, member: string): Promise<Queue> {
    const queue = await this.queueModel.findById(queueId).exec();
    if (!queue) {
      throw new NotFoundException(`Không tìm thấy queue với id ${queueId}`);
    }

    // Kiểm tra nếu member đã tồn tại trong queue
    if (queue.members.includes(member)) {
      return queue;
    }

    // Thêm member vào queue
    queue.members.push(member);
    const updatedQueue = await queue.save();

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return updatedQueue;
  }

  async removeMemberFromQueue(queueId: string, member: string): Promise<Queue> {
    const queue = await this.queueModel.findById(queueId).exec();
    if (!queue) {
      throw new NotFoundException(`Không tìm thấy queue với id ${queueId}`);
    }

    // Kiểm tra nếu member tồn tại trong queue
    const index = queue.members.indexOf(member);
    if (index === -1) {
      return queue;
    }

    // Xóa member khỏi queue
    queue.members.splice(index, 1);
    const updatedQueue = await queue.save();

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return updatedQueue;
  }

  private async updateAsteriskConfig(): Promise<void> {
    try {
      // Lấy tất cả queue từ database
      const queues = await this.queueModel.find().exec();

      // Tạo nội dung cho file queues.conf
      let queuesConfContent = `[general]
  persistentmembers = yes
  autofill = yes
  monitor-type = MixMonitor
  shared_lastcall = yes
  
  `;

      // Thêm các queue vào file cấu hình
      queues.forEach((queue) => {
        queuesConfContent += `[${queue.name}]
  strategy = ${queue.strategy || 'ringall'}
  timeout = ${queue.timeout || 15}
  wrapuptime = ${queue.wrapuptime || 0}
  maxlen = ${queue.maxlen || 0}
  ${queue.announce ? `announce = ${queue.announce}` : ''}
  musicclass = ${queue.musicClass || 'default'}
  `;

        // Thêm các member vào queue
        if (queue.members && queue.members.length > 0) {
          queue.members.forEach((member) => {
            queuesConfContent += `member = SIP/${member}\n`;
          });
        }

        queuesConfContent += '\n';
      });

      // Ghi file queues.conf
      const queuesConfPath = path.join(this.configDir, 'queues.conf');
      fs.writeFileSync(queuesConfPath, queuesConfContent);
      this.logger.log(`Đã cập nhật file ${queuesConfPath}`);

      // Reload Queues module trong Asterisk
      await this.asteriskService.reloadModule('queues');
      this.logger.log('Đã reload module Queues trong Asterisk');

      // Cập nhật file extensions.conf cho queues nếu cần
      await this.updateExtensionsConfForQueues(queues);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Lỗi khi cập nhật cấu hình Asterisk Queue: ${err.message}`,
      );
      throw error;
    }
  }

  private async updateExtensionsConfForQueues(queues: Queue[]): Promise<void> {
    try {
      // Kiểm tra xem file extensions.conf đã tồn tại chưa
      const extensionsConfPath = path.join(this.configDir, 'extensions.conf');
      let extensionsConfContent = '';

      if (fs.existsSync(extensionsConfPath)) {
        // Đọc nội dung file hiện tại
        extensionsConfContent = fs.readFileSync(extensionsConfPath, 'utf8');
      } else {
        // Tạo file mới với nội dung cơ bản
        extensionsConfContent = `[general]
  static=yes
  writeprotect=no
  autofallthrough=yes
  extenpatternmatchnew=yes
  clearglobalvars=no
  
  [globals]
  
  `;
      }

      // Tìm hoặc tạo context cho queues
      let queuesContextFound = false;
      const queuesContextMarker = '[queues]';
      const queuesContextStart =
        extensionsConfContent.indexOf(queuesContextMarker);

      if (queuesContextStart !== -1) {
        // Tìm điểm kết thúc của context queues
        const nextContextStart = extensionsConfContent.indexOf(
          '[',
          queuesContextStart + 1,
        );

        if (nextContextStart !== -1) {
          // Cắt phần context queues cũ
          extensionsConfContent =
            extensionsConfContent.substring(0, queuesContextStart) +
            extensionsConfContent.substring(nextContextStart);
        } else {
          // Đây là context cuối cùng, cắt phần còn lại
          extensionsConfContent = extensionsConfContent.substring(
            0,
            queuesContextStart,
          );
        }

        queuesContextFound = true;
      }

      // Tạo nội dung mới cho context queues
      let newQueuesContext = `[queues]\n`;

      // Thêm các queue vào context
      queues.forEach((queue) => {
        newQueuesContext += `exten => ${queue.name},1,Answer()\n`;
        newQueuesContext += `exten => ${queue.name},n,Queue(${queue.name})\n`;
        newQueuesContext += `exten => ${queue.name},n,Hangup()\n\n`;
      });

      // Thêm context queues vào file
      if (queuesContextFound) {
        // Chèn vào vị trí cũ
        extensionsConfContent =
          extensionsConfContent.substring(0, queuesContextStart) +
          newQueuesContext +
          extensionsConfContent.substring(queuesContextStart);
      } else {
        // Thêm vào cuối file
        extensionsConfContent += '\n' + newQueuesContext;
      }

      // Ghi file
      fs.writeFileSync(extensionsConfPath, extensionsConfContent);
      this.logger.log(
        `Đã cập nhật context queues trong file ${extensionsConfPath}`,
      );

      // Reload dialplan
      await this.asteriskService.reloadModule('dialplan');
      this.logger.log('Đã reload module Dialplan trong Asterisk');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Lỗi khi cập nhật extensions.conf cho queues: ${err.message}`,
      );
      throw error;
    }
  }

  async getQueueStatus(queueName: string): Promise<any> {
    try {
      // Kiểm tra xem queue có tồn tại trong cơ sở dữ liệu không
      const queue = await this.queueModel.findOne({ name: queueName }).exec();
      if (!queue) {
        throw new NotFoundException(
          `Không tìm thấy queue với tên ${queueName}`,
        );
      }

      // Gọi AMI để lấy trạng thái queue
      const response = await this.asteriskService.executeCommand(
        `queue show ${queueName}`,
      );

      return {
        queue: queue,
        status: response,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Lỗi khi lấy trạng thái queue ${queueName}: ${err.message}`,
      );
      throw error;
    }
  }

  async getAllQueueStatuses(): Promise<any> {
    try {
      // Gọi AMI để lấy trạng thái tất cả queue
      const response = await this.asteriskService.executeCommand('queue show');

      // Lấy tất cả queue từ cơ sở dữ liệu
      const queues = await this.queueModel.find().exec();

      return {
        queues: queues,
        status: response,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Lỗi khi lấy trạng thái tất cả queue: ${err.message}`);
      throw error;
    }
  }

  async pauseQueueMember(
    queueName: string,
    member: string,
    reason?: string,
  ): Promise<any> {
    try {
      // Kiểm tra xem queue có tồn tại không
      const queue = await this.queueModel.findOne({ name: queueName }).exec();
      if (!queue) {
        throw new NotFoundException(
          `Không tìm thấy queue với tên ${queueName}`,
        );
      }

      // Kiểm tra xem member có trong queue không
      if (!queue.members.includes(member)) {
        throw new NotFoundException(
          `Không tìm thấy member ${member} trong queue ${queueName}`,
        );
      }

      // Gọi AMI để tạm dừng member
      let command = `queue pause member SIP/${member} queue ${queueName}`;
      if (reason) {
        command += ` reason ${reason}`;
      }

      const response = await this.asteriskService.executeCommand(command);

      return {
        queue: queueName,
        member: member,
        status: 'paused',
        reason: reason,
        response: response,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Lỗi khi tạm dừng member ${member} trong queue ${queueName}: ${err.message}`,
      );
      throw error;
    }
  }

  async unpauseQueueMember(queueName: string, member: string): Promise<any> {
    try {
      // Kiểm tra xem queue có tồn tại không
      const queue = await this.queueModel.findOne({ name: queueName }).exec();
      if (!queue) {
        throw new NotFoundException(
          `Không tìm thấy queue với tên ${queueName}`,
        );
      }

      // Kiểm tra xem member có trong queue không
      if (!queue.members.includes(member)) {
        throw new NotFoundException(
          `Không tìm thấy member ${member} trong queue ${queueName}`,
        );
      }

      // Gọi AMI để bỏ tạm dừng member
      const command = `queue unpause member SIP/${member} queue ${queueName}`;
      const response = await this.asteriskService.executeCommand(command);

      return {
        queue: queueName,
        member: member,
        status: 'unpaused',
        response: response,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Lỗi khi bỏ tạm dừng member ${member} trong queue ${queueName}: ${err.message}`,
      );
      throw error;
    }
  }

  async removeDynamicMember(queueName: string, member: string): Promise<any> {
    try {
      // Kiểm tra xem queue có tồn tại không
      const queue = await this.queueModel.findOne({ name: queueName }).exec();
      if (!queue) {
        throw new NotFoundException(
          `Không tìm thấy queue với tên ${queueName}`,
        );
      }

      // Gọi AMI để xóa member động
      const command = `queue remove member SIP/${member} from ${queueName}`;
      const response = await this.asteriskService.executeCommand(command);

      return {
        queue: queueName,
        member: member,
        status: 'removed',
        response: response,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Lỗi khi xóa member động ${member} khỏi queue ${queueName}: ${err.message}`,
      );
      throw error;
    }
  }

  async addDynamicMember(
    queueName: string,
    member: string,
    penalty?: number,
  ): Promise<any> {
    try {
      // Kiểm tra xem queue có tồn tại không
      const queue = await this.queueModel.findOne({ name: queueName }).exec();
      if (!queue) {
        throw new NotFoundException(
          `Không tìm thấy queue với tên ${queueName}`,
        );
      }

      // Gọi AMI để thêm member động
      let command = `queue add member SIP/${member} to ${queueName}`;
      if (penalty !== undefined) {
        command += ` penalty ${penalty}`;
      }

      const response = await this.asteriskService.executeCommand(command);

      return {
        queue: queueName,
        member: member,
        penalty: penalty,
        status: 'added',
        response: response,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Lỗi khi thêm member động ${member} vào queue ${queueName}: ${err.message}`,
      );
      throw error;
    }
  }

  async resetQueueStats(queueName: string): Promise<any> {
    try {
      // Kiểm tra xem queue có tồn tại không
      const queue = await this.queueModel.findOne({ name: queueName }).exec();
      if (!queue) {
        throw new NotFoundException(
          `Không tìm thấy queue với tên ${queueName}`,
        );
      }

      // Gọi AMI để xóa thống kê của queue
      const command = `queue reset stats ${queueName}`;
      const response = await this.asteriskService.executeCommand(command);

      return {
        queue: queueName,
        status: 'reset',
        response: response,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Lỗi khi reset thống kê của queue ${queueName}: ${err.message}`,
      );
      throw error;
    }
  }
}
