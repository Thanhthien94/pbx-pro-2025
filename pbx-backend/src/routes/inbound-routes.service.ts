// src/routes/inbound-routes.service.ts
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
import {
  InboundRoute,
  InboundRouteDocument,
} from './schemas/inbound-route.schema';
import { CreateInboundRouteDto } from './dto/create-inbound-route.dto';
import { UpdateInboundRouteDto } from './dto/update-inbound-route.dto';
import { AsteriskService } from '../asterisk/asterisk.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InboundRoutesService {
  private readonly logger = new Logger(InboundRoutesService.name);
  private readonly configDir: string;

  constructor(
    @InjectModel(InboundRoute.name)
    private inboundRouteModel: Model<InboundRouteDocument>,
    private asteriskService: AsteriskService,
    private configService: ConfigService,
  ) {
    this.configDir = this.configService.get<string>(
      'asterisk.configDir',
      '/etc/asterisk',
    );
  }

  async create(
    createInboundRouteDto: CreateInboundRouteDto,
  ): Promise<InboundRoute> {
    // Kiểm tra xem route đã tồn tại chưa
    const existingRoute = await this.inboundRouteModel.findOne({
      name: createInboundRouteDto.name,
    });

    if (existingRoute) {
      throw new ConflictException(
        `Route ${createInboundRouteDto.name} đã tồn tại`,
      );
    }

    // Kiểm tra xem DID đã được sử dụng chưa (nếu có)
    if (createInboundRouteDto.did) {
      const existingDid = await this.inboundRouteModel.findOne({
        did: createInboundRouteDto.did,
      });

      if (existingDid) {
        throw new ConflictException(
          `DID ${createInboundRouteDto.did} đã được sử dụng bởi route ${existingDid.name}`,
        );
      }
    }

    // Tạo route mới
    const createdRoute = new this.inboundRouteModel(createInboundRouteDto);
    const savedRoute = await createdRoute.save();

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return savedRoute;
  }

  async findAll(): Promise<InboundRoute[]> {
    return this.inboundRouteModel.find().sort({ priority: 1 }).exec();
  }

  async findOne(id: string): Promise<InboundRoute> {
    const route = await this.inboundRouteModel.findById(id).exec();
    if (!route) {
      throw new NotFoundException(`Không tìm thấy route với id ${id}`);
    }
    return route;
  }

  async update(
    id: string,
    updateInboundRouteDto: UpdateInboundRouteDto,
  ): Promise<InboundRoute> {
    // Kiểm tra xem route có tồn tại không
    const existingRoute = await this.inboundRouteModel.findById(id).exec();
    if (!existingRoute) {
      throw new NotFoundException(`Không tìm thấy route với id ${id}`);
    }

    // Kiểm tra xem tên mới có trùng với route khác không
    if (
      updateInboundRouteDto.name &&
      updateInboundRouteDto.name !== existingRoute.name
    ) {
      const routeExists = await this.inboundRouteModel.findOne({
        name: updateInboundRouteDto.name,
        _id: { $ne: id },
      });

      if (routeExists) {
        throw new ConflictException(
          `Route ${updateInboundRouteDto.name} đã tồn tại`,
        );
      }
    }

    // Kiểm tra xem DID mới có trùng với route khác không
    if (
      updateInboundRouteDto.did &&
      updateInboundRouteDto.did !== existingRoute.did
    ) {
      const didExists = await this.inboundRouteModel.findOne({
        did: updateInboundRouteDto.did,
        _id: { $ne: id },
      });

      if (didExists) {
        throw new ConflictException(
          `DID ${updateInboundRouteDto.did} đã được sử dụng bởi route ${didExists.name}`,
        );
      }
    }

    // Cập nhật route
    const updatedRoute = await this.inboundRouteModel
      .findByIdAndUpdate(id, updateInboundRouteDto, { new: true })
      .exec();

    if (!updatedRoute) {
      throw new NotFoundException(`Không tìm thấy route với id ${id}`);
    }

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return updatedRoute;
  }

  async remove(id: string): Promise<InboundRoute> {
    const deletedRoute = await this.inboundRouteModel
      .findByIdAndDelete(id)
      .exec();
    if (!deletedRoute) {
      throw new NotFoundException(`Không tìm thấy route với id ${id}`);
    }

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return deletedRoute;
  }

  private async updateAsteriskConfig(): Promise<void> {
    try {
      // Lấy tất cả route từ database
      const routes = await this.inboundRouteModel
        .find()
        .sort({ priority: 1 })
        .exec();

      // Kiểm tra và cập nhật file extensions.conf
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

      // Tìm hoặc tạo context cho từ trunk
      let fromTrunkContextFound = false;
      const fromTrunkContextMarker = '[from-trunk]';
      const fromTrunkContextStart = extensionsConfContent.indexOf(
        fromTrunkContextMarker,
      );

      if (fromTrunkContextStart !== -1) {
        // Tìm điểm kết thúc của context from-trunk
        const nextContextStart = extensionsConfContent.indexOf(
          '[',
          fromTrunkContextStart + 1,
        );

        if (nextContextStart !== -1) {
          // Cắt phần context from-trunk cũ
          extensionsConfContent =
            extensionsConfContent.substring(0, fromTrunkContextStart) +
            extensionsConfContent.substring(nextContextStart);
        } else {
          // Đây là context cuối cùng, cắt phần còn lại
          extensionsConfContent = extensionsConfContent.substring(
            0,
            fromTrunkContextStart,
          );
        }

        fromTrunkContextFound = true;
      }

      // Tạo nội dung mới cho context from-trunk
      let newFromTrunkContext = `[from-trunk]\n; Inbound Routes\n`;

      // Mặc định cho các cuộc gọi không khớp với bất kỳ DID nào
      newFromTrunkContext += `exten => s,1,NoOp(Inbound call from trunk - default handler)\n`;
      newFromTrunkContext += `exten => s,n,Goto(internal,100,1) ; Chuyển hướng đến số mặc định\n\n`;

      // Thêm các route vào context
      routes.forEach((route) => {
        if (route.did) {
          newFromTrunkContext += `exten => ${route.did},1,NoOp(Inbound call for DID: ${route.did})\n`;

          // Đặt Caller ID nếu cần
          if (route.callerIdName) {
            newFromTrunkContext += `exten => ${route.did},n,Set(CALLERID(name)=${route.callerIdName})\n`;
          }

          // Chuyển hướng cuộc gọi đến đích đến tương ứng
          switch (route.destinationType) {
            case 'extension':
              newFromTrunkContext += `exten => ${route.did},n,Goto(internal,${route.destination},1)\n`;
              break;
            case 'queue':
              newFromTrunkContext += `exten => ${route.did},n,Goto(queues,${route.destination},1)\n`;
              break;
            case 'ivr':
              newFromTrunkContext += `exten => ${route.did},n,Goto(ivr-${route.destination},s,1)\n`;
              break;
            default:
              newFromTrunkContext += `exten => ${route.did},n,Goto(internal,${route.destination},1)\n`;
          }

          newFromTrunkContext += `exten => ${route.did},n,Hangup()\n\n`;
        }
      });

      // Thêm context from-trunk vào file
      if (fromTrunkContextFound) {
        // Chèn vào vị trí cũ
        extensionsConfContent =
          extensionsConfContent.substring(0, fromTrunkContextStart) +
          newFromTrunkContext +
          extensionsConfContent.substring(fromTrunkContextStart);
      } else {
        // Thêm vào cuối file
        extensionsConfContent += '\n' + newFromTrunkContext;
      }

      // Ghi file
      fs.writeFileSync(extensionsConfPath, extensionsConfContent);
      this.logger.log(
        `Đã cập nhật context from-trunk trong file ${extensionsConfPath}`,
      );

      // Reload dialplan
      await this.asteriskService.reloadModule('dialplan');
      this.logger.log('Đã reload module Dialplan trong Asterisk');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Lỗi khi cập nhật cấu hình inbound routes: ${err.message}`,
      );
      throw error;
    }
  }
}
