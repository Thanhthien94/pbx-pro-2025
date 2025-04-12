// src/trunks/trunks.service.ts
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
import { Trunk, TrunkDocument } from './schemas/trunk.schema';
import { CreateTrunkDto } from './dto/create-trunk.dto';
import { UpdateTrunkDto } from './dto/update-trunk.dto';
import { AsteriskService } from '../asterisk/asterisk.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TrunksService {
  private readonly logger = new Logger(TrunksService.name);
  private readonly configDir: string;

  constructor(
    @InjectModel(Trunk.name)
    private trunkModel: Model<TrunkDocument>,
    private asteriskService: AsteriskService,
    private configService: ConfigService,
  ) {
    this.configDir = this.configService.get<string>(
      'asterisk.configDir',
      '/etc/asterisk',
    );
  }

  async create(createTrunkDto: CreateTrunkDto): Promise<Trunk> {
    // Kiểm tra xem trunk đã tồn tại chưa
    const existingTrunk = await this.trunkModel.findOne({
      name: createTrunkDto.name,
    });

    if (existingTrunk) {
      throw new ConflictException(`Trunk ${createTrunkDto.name} đã tồn tại`);
    }

    // Tạo trunk mới
    const createdTrunk = new this.trunkModel(createTrunkDto);
    const savedTrunk = await createdTrunk.save();

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return savedTrunk;
  }

  async findAll(): Promise<Trunk[]> {
    return this.trunkModel.find().exec();
  }

  async findOne(id: string): Promise<Trunk> {
    const trunk = await this.trunkModel.findById(id).exec();
    if (!trunk) {
      throw new NotFoundException(`Không tìm thấy trunk với id ${id}`);
    }
    return trunk;
  }

  async update(id: string, updateTrunkDto: UpdateTrunkDto): Promise<Trunk> {
    // Kiểm tra xem trunk có tồn tại không
    const existingTrunk = await this.trunkModel.findById(id).exec();
    if (!existingTrunk) {
      throw new NotFoundException(`Không tìm thấy trunk với id ${id}`);
    }

    // Kiểm tra xem tên mới có trùng với trunk khác không
    if (updateTrunkDto.name && updateTrunkDto.name !== existingTrunk.name) {
      const trunkExists = await this.trunkModel.findOne({
        _id: { $ne: id },
      });

      if (trunkExists) {
        throw new ConflictException(`Trunk ${updateTrunkDto.name} đã tồn tại`);
      }
    }

    // Cập nhật trunk
    const updatedTrunk = await this.trunkModel
      .findByIdAndUpdate(id, updateTrunkDto, { new: true })
      .exec();

    if (!updatedTrunk) {
      throw new NotFoundException(`Không tìm thấy trunk với id ${id}`);
    }

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return updatedTrunk;
  }

  async remove(id: string): Promise<Trunk> {
    const deletedTrunk = await this.trunkModel.findByIdAndDelete(id).exec();
    if (!deletedTrunk) {
      throw new NotFoundException(`Không tìm thấy trunk với id ${id}`);
    }

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return deletedTrunk;
  }

  private async updateAsteriskConfig(): Promise<void> {
    try {
      // Lấy tất cả trunk từ database
      const trunks = await this.trunkModel.find().exec();

      // Tạo nội dung cho file sip.conf
      let sipConfContent = `; Trunks được tạo bởi NestJS API\n\n`;

      // Thêm các trunk vào file cấu hình
      trunks.forEach((trunk) => {
        if (trunk.type === 'sip') {
          sipConfContent += `[${trunk.name}](template-trunk)\n`;
          sipConfContent += `host=${trunk.host}\n`;

          if (trunk.username) {
            sipConfContent += `username=${trunk.username}\n`;
          }

          if (trunk.secret) {
            sipConfContent += `secret=${trunk.secret}\n`;
          }

          sipConfContent += `context=${trunk.context || 'from-trunk'}\n`;
          sipConfContent += `dtmfmode=${trunk.dtmfMode || 'rfc2833'}\n`;
          sipConfContent += `transport=${trunk.transport || 'udp'}\n`;
          sipConfContent += `insecure=${trunk.insecure || 'port,invite'}\n`;
          sipConfContent += `nat=${trunk.nat || 'yes'}\n`;
          sipConfContent += `qualify=yes\n`;
          sipConfContent += `qualifyfreq=${trunk.qualifyFreq || 60}\n`;
          sipConfContent += `disallow=${trunk.disallow || 'all'}\n`;
          sipConfContent += `allow=${trunk.allow || 'ulaw,alaw,g722'}\n\n`;
        }
      });

      // Đọc file sip.conf hiện tại
      const sipConfPath = path.join(this.configDir, 'sip.conf');
      let currentContent = '';

      if (fs.existsSync(sipConfPath)) {
        currentContent = fs.readFileSync(sipConfPath, 'utf8');
      }

      // Tìm vị trí để chèn cấu hình trunks
      const trunkMarkerStart = ';;; TRUNKS START ;;;';
      const trunkMarkerEnd = ';;; TRUNKS END ;;;';

      let newContent = '';

      if (
        currentContent.includes(trunkMarkerStart) &&
        currentContent.includes(trunkMarkerEnd)
      ) {
        // Nếu đã có markers, thay thế nội dung giữa chúng
        const beforeMarker = currentContent.split(trunkMarkerStart)[0];
        const afterMarker = currentContent.split(trunkMarkerEnd)[1];

        newContent =
          beforeMarker +
          trunkMarkerStart +
          '\n' +
          sipConfContent +
          trunkMarkerEnd +
          afterMarker;
      } else {
        // Nếu chưa có markers, thêm vào cuối file
        newContent =
          currentContent +
          '\n' +
          trunkMarkerStart +
          '\n' +
          sipConfContent +
          trunkMarkerEnd +
          '\n';
      }

      // Ghi file sip.conf
      fs.writeFileSync(sipConfPath, newContent);
      this.logger.log(`Đã cập nhật cấu hình trunks trong file ${sipConfPath}`);

      // Reload SIP module trong Asterisk
      await this.asteriskService.reloadModule('sip');
      this.logger.log('Đã reload module SIP trong Asterisk');
    } catch (error) {
      this.logger.error(`Lỗi khi cập nhật cấu hình Asterisk: ${error.message}`);
      throw error;
    }
  }
}
