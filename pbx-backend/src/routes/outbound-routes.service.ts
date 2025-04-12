// src/routes/outbound-routes.service.ts
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
  OutboundRoute,
  OutboundRouteDocument,
} from './schemas/outbound-route.schema';
import { CreateOutboundRouteDto } from './dto/create-outbound-route.dto';
import { UpdateOutboundRouteDto } from './dto/update-outbound-route.dto';
import { AsteriskService } from '../asterisk/asterisk.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OutboundRoutesService {
  private readonly logger = new Logger(OutboundRoutesService.name);
  private readonly configDir: string;

  constructor(
    @InjectModel(OutboundRoute.name)
    private outboundRouteModel: Model<OutboundRouteDocument>,
    private asteriskService: AsteriskService,
    private configService: ConfigService,
  ) {
    this.configDir = this.configService.get<string>(
      'asterisk.configDir',
      '/etc/asterisk',
    );
  }

  async create(
    createOutboundRouteDto: CreateOutboundRouteDto,
  ): Promise<OutboundRoute> {
    // Kiểm tra xem route đã tồn tại chưa
    const existingRoute = await this.outboundRouteModel.findOne({
      name: createOutboundRouteDto.name,
    });

    if (existingRoute) {
      throw new ConflictException(
        `Route ${createOutboundRouteDto.name} đã tồn tại`,
      );
    }

    // Tạo route mới
    const createdRoute = new this.outboundRouteModel(createOutboundRouteDto);
    const savedRoute = await createdRoute.save();

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return savedRoute;
  }

  async findAll(): Promise<OutboundRoute[]> {
    return this.outboundRouteModel.find().sort({ priority: 1 }).exec();
  }

  async findOne(id: string): Promise<OutboundRoute> {
    const route = await this.outboundRouteModel.findById(id).exec();
    if (!route) {
      throw new NotFoundException(`Không tìm thấy route với id ${id}`);
    }
    return route;
  }

  async update(
    id: string,
    updateOutboundRouteDto: UpdateOutboundRouteDto,
  ): Promise<OutboundRoute> {
    // Kiểm tra xem route có tồn tại không
    const existingRoute = await this.outboundRouteModel.findById(id).exec();
    if (!existingRoute) {
      throw new NotFoundException(`Không tìm thấy route với id ${id}`);
    }

    // Kiểm tra xem tên mới có trùng với route khác không
    if (
      updateOutboundRouteDto.name &&
      updateOutboundRouteDto.name !== existingRoute.name
    ) {
      const routeExists = await this.outboundRouteModel.findOne({
        name: updateOutboundRouteDto.name,
        _id: { $ne: id },
      });

      if (routeExists) {
        throw new ConflictException(
          `Route ${updateOutboundRouteDto.name} đã tồn tại`,
        );
      }
    }

    // Cập nhật route
    const updatedRoute = await this.outboundRouteModel
      .findByIdAndUpdate(id, updateOutboundRouteDto, { new: true })
      .exec();

    if (!updatedRoute) {
      throw new NotFoundException(`Không tìm thấy route với id ${id}`);
    }

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return updatedRoute;
  }

  async remove(id: string): Promise<OutboundRoute> {
    const deletedRoute = await this.outboundRouteModel
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
      const routes = await this.outboundRouteModel
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

      // Tìm hoặc tạo context cho outbound routes
      let outboundContextFound = false;
      const outboundContextMarker = '[outbound]';
      const outboundContextStart = extensionsConfContent.indexOf(
        outboundContextMarker,
      );

      if (outboundContextStart !== -1) {
        // Tìm điểm kết thúc của context outbound
        const nextContextStart = extensionsConfContent.indexOf(
          '[',
          outboundContextStart + 1,
        );

        if (nextContextStart !== -1) {
          // Cắt phần context outbound cũ
          extensionsConfContent =
            extensionsConfContent.substring(0, outboundContextStart) +
            extensionsConfContent.substring(nextContextStart);
        } else {
          // Đây là context cuối cùng, cắt phần còn lại
          extensionsConfContent = extensionsConfContent.substring(
            0,
            outboundContextStart,
          );
        }

        outboundContextFound = true;
      }

      // Tạo nội dung mới cho context outbound
      let newOutboundContext = `[outbound]\n; Outbound Routes\n`;

      // Thêm exten => _. để xử lý khi không có route nào khớp
      newOutboundContext += `exten => _.,1,NoOp(No matching outbound route)\n`;
      newOutboundContext += `exten => _.,n,Hangup()\n\n`;

      // Thêm các route vào context
      routes.forEach((route) => {
        const pattern = route.pattern.startsWith('_')
          ? route.pattern
          : `_${route.pattern}`;

        newOutboundContext += `exten => ${pattern},1,NoOp(Matched outbound route: ${route.name})\n`;

        // Thêm bước chuẩn bị Caller ID nếu có
        if (route.callerIdName || route.callerIdNumber) {
          newOutboundContext += `exten => ${pattern},n,Set(CALLERID(name)=${route.callerIdName || route.callerIdNumber || '${CALLERID(name)}'})\n`;
          if (route.callerIdNumber) {
            newOutboundContext += `exten => ${pattern},n,Set(CALLERID(num)=${route.callerIdNumber})\n`;
          }
        }

        // Thêm bước prepend nếu có
        if (route.prepend) {
          newOutboundContext += `exten => ${pattern},n,Set(OUTNUM=${route.prepend}\${EXTEN:${route.prefix ? route.prefix.length : 0}})\n`;
        } else if (route.prefix) {
          newOutboundContext += `exten => ${pattern},n,Set(OUTNUM=\${EXTEN:${route.prefix.length}})\n`;
        } else {
          newOutboundContext += `exten => ${pattern},n,Set(OUTNUM=\${EXTEN})\n`;
        }

        // Dial qua trunk
        newOutboundContext += `exten => ${pattern},n,Dial(SIP/\${OUTNUM}@${route.trunk},60)\n`;
        newOutboundContext += `exten => ${pattern},n,Hangup()\n\n`;
      });

      // Thêm context outbound vào file
      if (outboundContextFound) {
        // Chèn vào vị trí cũ
        extensionsConfContent =
          extensionsConfContent.substring(0, outboundContextStart) +
          newOutboundContext +
          extensionsConfContent.substring(outboundContextStart);
      } else {
        // Thêm vào cuối file
        extensionsConfContent += '\n' + newOutboundContext;
      }

      // Ghi file
      fs.writeFileSync(extensionsConfPath, extensionsConfContent);
      this.logger.log(
        `Đã cập nhật context outbound trong file ${extensionsConfPath}`,
      );

      // Đảm bảo rằng context [internal] có thể gọi đến context [outbound]
      this.updateInternalDialPlan(extensionsConfContent, extensionsConfPath);

      // Reload dialplan
      await this.asteriskService.reloadModule('dialplan');
      this.logger.log('Đã reload module Dialplan trong Asterisk');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Lỗi khi cập nhật cấu hình outbound routes: ${err.message}`,
      );
      throw error;
    }
  }

  private updateInternalDialPlan(confContent: string, confPath: string): void {
    // Tìm context [internal]
    const internalContextMarker = '[internal]';
    const internalContextStart = confContent.indexOf(internalContextMarker);

    if (internalContextStart === -1) {
      // Không tìm thấy context internal, không cần cập nhật
      return;
    }

    // Kiểm tra xem trong context internal đã có _X. pattern để gọi đến context outbound chưa
    const outboundPatternRegex =
      /exten\s*=>\s*_X\.\s*,\s*1\s*,\s*Goto\s*\(\s*outbound\s*,\s*\$\{EXTEN\}\s*,\s*1\s*\)/i;

    if (outboundPatternRegex.test(confContent)) {
      // Đã có pattern, không cần cập nhật
      return;
    }

    // Tìm vị trí kết thúc của context internal
    let internalContextEnd = confContent.indexOf('[', internalContextStart + 1);
    if (internalContextEnd === -1) {
      internalContextEnd = confContent.length;
    }

    // Thêm pattern vào cuối context internal
    const outboundPattern = `\n; Route to outbound context for external calls
  exten => _X.,1,Goto(outbound,\${EXTEN},1)\n`;

    const newConfContent =
      confContent.substring(0, internalContextEnd) +
      outboundPattern +
      confContent.substring(internalContextEnd);

    // Ghi file
    fs.writeFileSync(confPath, newConfContent);
    this.logger.log(`Đã cập nhật context internal để gọi đến context outbound`);
  }
}
