// src/extensions/extensions.service.ts
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
import { Extension, ExtensionDocument } from './schemas/extension.schema';
import { CreateExtensionDto } from './dto/create-extension.dto';
import { UpdateExtensionDto } from './dto/update-extension.dto';
import { AsteriskService } from '../asterisk/asterisk.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExtensionsService {
  private readonly logger = new Logger(ExtensionsService.name);
  private readonly configDir: string;

  constructor(
    @InjectModel(Extension.name)
    private extensionModel: Model<ExtensionDocument>,
    private asteriskService: AsteriskService,
    private configService: ConfigService,
  ) {
    this.configDir = this.configService.get<string>(
      'asterisk.configDir',
      '/etc/asterisk',
    );
  }

  async create(createExtensionDto: CreateExtensionDto): Promise<Extension> {
    // Kiểm tra xem extension đã tồn tại chưa
    const existingExtension = await this.extensionModel.findOne({
      extension: createExtensionDto.extension,
    });

    if (existingExtension) {
      throw new ConflictException(
        `Extension ${createExtensionDto.extension} đã tồn tại`,
      );
    }

    // Tạo extension mới
    const createdExtension = new this.extensionModel(createExtensionDto);
    const savedExtension = await createdExtension.save();

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return savedExtension;
  }

  async findAll(): Promise<Extension[]> {
    return this.extensionModel.find().exec();
  }

  async findOne(id: string): Promise<Extension> {
    const extension = await this.extensionModel.findById(id).exec();
    if (!extension) {
      throw new NotFoundException(`Không tìm thấy extension với id ${id}`);
    }
    return extension;
  }

  async findByExtensionNumber(extensionNumber: string): Promise<Extension> {
    const extension = await this.extensionModel
      .findOne({
        extension: extensionNumber,
      })
      .exec();

    if (!extension) {
      throw new NotFoundException(
        `Không tìm thấy extension với số ${extensionNumber}`,
      );
    }

    return extension;
  }

  async update(
    id: string,
    updateExtensionDto: UpdateExtensionDto,
  ): Promise<Extension> {
    // Kiểm tra xem extension có tồn tại không
    const existingExtension = await this.extensionModel.findById(id).exec();
    if (!existingExtension) {
      throw new NotFoundException(`Không tìm thấy extension với id ${id}`);
    }

    // Kiểm tra xem extension mới có trùng với extension khác không
    if (
      updateExtensionDto.extension &&
      updateExtensionDto.extension !== existingExtension.extension
    ) {
      const extensionExists = await this.extensionModel.findOne({
        extension: updateExtensionDto.extension,
        _id: { $ne: id },
      });

      if (extensionExists) {
        throw new ConflictException(
          `Extension ${updateExtensionDto.extension} đã tồn tại`,
        );
      }
    }

    // Cập nhật extension
    const updatedExtension = await this.extensionModel
      .findByIdAndUpdate(id, updateExtensionDto, { new: true })
      .exec();

    if (!updatedExtension) {
      throw new NotFoundException(`Không tìm thấy extension với id ${id}`);
    }

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return updatedExtension;
  }

  async remove(id: string): Promise<Extension> {
    const deletedExtension = await this.extensionModel
      .findByIdAndDelete(id)
      .exec();
    if (!deletedExtension) {
      throw new NotFoundException(`Không tìm thấy extension với id ${id}`);
    }

    // Cập nhật cấu hình Asterisk
    await this.updateAsteriskConfig();

    return deletedExtension;
  }

  private async updateAsteriskConfig(): Promise<void> {
    try {
      // Lấy tất cả extension từ database
      const extensions = await this.extensionModel.find().exec();

      // Tạo nội dung cho file sip.conf
      let sipConfContent = `[general]
  context=default
  allowoverlap=no
  udpbindaddr=0.0.0.0
  tcpbindaddr=0.0.0.0
  tcpenable=yes
  transport=udp,tcp
  srvlookup=yes
  realm=pbx.local
  useragent=NestPBX
  alwaysauthreject=yes
  rtcachefriends=yes
  rtsavesysname=yes
  rtupdate=yes
  rtautoclear=yes
  ignoreregexpire=no
  registertimeout=20
  registerattempts=10
  notifyringing=yes
  notifyhold=yes
  notifycid=yes
  callevents=yes
  allowsubscribe=yes
  subscribecontext=default
  language=en
  videosupport=yes
  disallow=all
  allow=alaw
  allow=ulaw
  allow=gsm
  allow=g722
  allow=h264
  allow=h263
  allow=h263p
  nat=force_rport,comedia
  directmedia=no
  
  ; Mẫu SIP client
  [template-internal](!)
  type=friend
  host=dynamic
  context=internal
  disallow=all
  allow=alaw
  allow=ulaw
  allow=gsm
  nat=force_rport,comedia
  qualify=yes
  directmedia=no
  dtmfmode=auto
  call-limit=5
  videosupport=yes
  
  ; Extension được tạo bởi NestJS API
  `;

      // Thêm các extension vào file cấu hình
      extensions.forEach((ext) => {
        sipConfContent += `
  [${ext.extension}](template-internal)
  callerid="${ext.name}" <${ext.extension}>
  secret=${ext.secret}
  mailbox=${ext.mailbox || ext.extension}
  ${ext.email ? `email=${ext.email}` : ''}
  ${ext.callGroup ? `callgroup=${ext.callGroup}` : ''}
  ${ext.pickupGroup ? `pickupgroup=${ext.pickupGroup}` : ''}
  host=${ext.host || 'dynamic'}
  dtmfmode=${ext.dtmfMode || 'rfc2833'}
  transport=${ext.transport || 'udp'}
  nat=${ext.nat || 'yes'}
  call-limit=${ext.callLimit || 5}
  disallow=${ext.disallow || 'all'}
  allow=${ext.allow || 'ulaw,alaw,g722'}
  `;
      });

      // Ghi file sip.conf
      const sipConfPath = path.join(this.configDir, 'sip.conf');
      fs.writeFileSync(sipConfPath, sipConfContent);
      this.logger.log(`Đã cập nhật file ${sipConfPath}`);

      // Cập nhật file extensions.conf nếu cần
      this.updateExtensionsConf(extensions);

      // Reload SIP module trong Asterisk
      await this.asteriskService.reloadModule('sip');
      this.logger.log('Đã reload module SIP trong Asterisk');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Lỗi khi cập nhật cấu hình Asterisk: ${err.message}`);
      throw error;
    }
  }

  private updateExtensionsConf(extensions: Extension[]): void {
    try {
      // Đường dẫn đến file extensions.conf
      const extensionsConfPath = path.join(this.configDir, 'extensions.conf');

      // Kiểm tra xem file có tồn tại không, nếu không thì tạo mới
      let extensionsConfContent = '';

      if (fs.existsSync(extensionsConfPath)) {
        // Đọc nội dung file hiện tại
        extensionsConfContent = fs.readFileSync(extensionsConfPath, 'utf8');
      } else {
        // Tạo nội dung mặc định cho file mới
        extensionsConfContent = `[general]
  static=yes
  writeprotect=no
  autofallthrough=yes
  extenpatternmatchnew=yes
  clearglobalvars=no
  
  [globals]
  CONSOLE=Console/dsp
  IAXINFO=guest
  TRUNK=DAHDI/G2
  TRUNKMSD=1
  
  [default]
  exten => s,1,Verbose(1,Unrouted call handler)
  exten => s,n,Answer()
  exten => s,n,Wait(1)
  exten => s,n,Playback(tt-weasels)
  exten => s,n,Hangup()
  
  exten => _.,1,Verbose(1,Catch-all extension)
  exten => _.,n,Answer()
  exten => _.,n,Wait(1)
  exten => _.,n,Playback(invalid)
  exten => _.,n,Hangup()
  
  `;
      }

      // Tìm hoặc tạo context [internal]
      const internalContextMarker = '[internal]';
      let internalContextContent = `
  ; Internal extensions pattern
  `;

      // Thêm pattern cho mỗi extension dựa vào các extension hiện có
      extensions.forEach((ext) => {
        internalContextContent += `exten => ${ext.extension},1,NoOp(Dialing extension ${ext.extension})
  exten => ${ext.extension},n,Dial(SIP/${ext.extension},20)
  exten => ${ext.extension},n,Hangup()
  
  `;
      });

      // Thêm các tính năng nâng cao
      internalContextContent += `
  ; Voicemail access
  exten => *98,1,NoOp(Voicemail)
  exten => *98,n,VoiceMailMain(\${CALLERID(num)}@default)
  exten => *98,n,Hangup()
  
  ; Echo Test
  exten => *43,1,NoOp(Echo Test)
  exten => *43,n,Answer()
  exten => *43,n,Playback(demo-echotest)
  exten => *43,n,Echo()
  exten => *43,n,Playback(demo-echodone)
  exten => *43,n,Hangup()
  
  ; Time
  exten => *60,1,NoOp(Time)
  exten => *60,n,Answer()
  exten => *60,n,Wait(1)
  exten => *60,n,SayUnixTime()
  exten => *60,n,Hangup()
  
  ; Call Pickup
  exten => *8,1,NoOp(Call Pickup)
  exten => *8,n,PickUp()
  exten => *8,n,Hangup()
  
  `;

      // Kiểm tra xem context internal đã tồn tại chưa
      let newExtensionsConfContent = '';
      const internalContextStart = extensionsConfContent.indexOf(
        internalContextMarker,
      );

      if (internalContextStart !== -1) {
        // Tìm điểm kết thúc của context internal
        let internalContextEnd = extensionsConfContent.indexOf(
          '[',
          internalContextStart + 1,
        );

        if (internalContextEnd === -1) {
          // Context internal là context cuối cùng
          internalContextEnd = extensionsConfContent.length;
        }

        // Thay thế nội dung của context internal
        newExtensionsConfContent =
          extensionsConfContent.substring(0, internalContextStart) +
          internalContextMarker +
          internalContextContent +
          extensionsConfContent.substring(internalContextEnd);
      } else {
        // Thêm context internal vào cuối file
        newExtensionsConfContent =
          extensionsConfContent +
          internalContextMarker +
          internalContextContent;
      }

      // Tìm hoặc tạo context [from-trunk]
      const fromTrunkContextMarker = '[from-trunk]';
      const fromTrunkContent = `
  ; Inbound calls from trunks will be handled by this context
  exten => _X.,1,NoOp(Inbound call from trunk)
  exten => _X.,n,Set(CALLERID(name)=\${CALLERID(num)})
  exten => _X.,n,Goto(internal,100,1)  ; Redirect to the operator/receptionist
  `;

      // Kiểm tra xem context from-trunk đã tồn tại chưa
      const fromTrunkContextStart = newExtensionsConfContent.indexOf(
        fromTrunkContextMarker,
      );

      if (fromTrunkContextStart === -1) {
        // Thêm context from-trunk vào cuối file
        newExtensionsConfContent += fromTrunkContextMarker + fromTrunkContent;
      }

      // Ghi file
      fs.writeFileSync(extensionsConfPath, newExtensionsConfContent);
      this.logger.log(`Đã cập nhật file ${extensionsConfPath}`);

      // Reload dialplan
      this.asteriskService
        .reloadModule('dialplan')
        .then(() => {
          this.logger.log('Đã reload module Dialplan trong Asterisk');
        })
        .catch((err) => {
          this.logger.error(`Lỗi khi reload dialplan: ${err.message}`);
        });
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Lỗi khi cập nhật file extensions.conf: ${err.message}`,
      );
      throw error;
    }
  }
}
