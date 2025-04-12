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
      this.logger.error(`Lỗi khi cập nhật cấu hình Asterisk: ${error.message}`);
      throw error;
    }
  }

  private updateExtensionsConf(extensions: Extension[]): void {
    try {
      // Đọc file extensions.conf nếu tồn tại
      const extensionsConfPath = path.join(this.configDir, 'extensions.conf');
      let extensionsConfContent = '';

      if (fs.existsSync(extensionsConfPath)) {
        extensionsConfContent = fs.readFileSync(extensionsConfPath, 'utf8');
      } else {
        // Nếu file không tồn tại, tạo file mặc định
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

[from-trunk]
; Inbound calls from trunks will be handled by this context
exten => _X.,1,NoOp(Inbound call from trunk)
exten => _X.,n,Set(CALLERID(name)=${CALLERID(num)})
exten => _X.,n,Goto(internal,100,1)  ; Redirect to the operator
`;
      }

      // Kiểm tra xem context internal đã tồn tại chưa
      if (!extensionsConfContent.includes('[internal]')) {
        // Thêm context internal
        extensionsConfContent += `
[internal]
; Internal extensions pattern
exten => _1XX,1,NoOp(Dialing extension ${EXTEN})
exten => _1XX,n,Dial(SIP/${EXTEN},20)
exten => _1XX,n,Hangup()

; Voicemail access
exten => *98,1,NoOp(Voicemail)
exten => *98,n,VoiceMailMain(${CALLERID(num)}@default)
exten => *98,n,Hangup()

; Echo Test
exten => *43,1,NoOp(Echo Test)
exten => *43,n,Answer()
exten => *43,n,Playback(demo-echotest)
exten => *43,n,Echo()
exten => *43,n,Playback(demo-echodone)
exten => *43,n,Hangup()
`;
      }

      // Ghi file extensions.conf
      fs.writeFileSync(extensionsConfPath, extensionsConfContent);
      this.logger.log(`Đã cập nhật file ${extensionsConfPath}`);
    } catch (error) {
      this.logger.error(
        `Lỗi khi cập nhật file extensions.conf: ${error.message}`,
      );
      throw error;
    }
  }
}
