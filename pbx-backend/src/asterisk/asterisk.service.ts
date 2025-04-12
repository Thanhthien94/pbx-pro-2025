// src/asterisk/asterisk.service.ts
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AmiClient from 'asterisk-manager';
import { AmiResponse } from './interfaces/ami-response.interface';
import { OriginateParams } from './interfaces/originate-params.interface';
@Injectable()
export class AsteriskService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AsteriskService.name);
  private ami: any | null = null;
  private connected = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;

  constructor(private configService: ConfigService) {}

  onModuleInit(): void {
    this.connect();
  }

  onModuleDestroy(): void {
    this.disconnect();
  }

  private connect(): void {
    const host = this.configService.get<string>(
      'asterisk.ami.host',
      'localhost',
    );
    const port = this.configService.get<number>('asterisk.ami.port', 5038);
    const username = this.configService.get<string>(
      'asterisk.ami.username',
      'admin',
    );
    const password = this.configService.get<string>(
      'asterisk.ami.password',
      'password',
    );

    this.logger.log(`Đang kết nối tới Asterisk AMI: ${host}:${port}`);

    try {
      this.ami = AmiClient(port, host, username, password, true);

      this.ami.keepConnected();

      this.ami.on('connect', () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.logger.log('Đã kết nối thành công với Asterisk AMI');
      });

      this.ami.on('disconnect', () => {
        this.connected = false;
        this.logger.warn('Mất kết nối với Asterisk AMI');
        this.scheduleReconnect();
      });

      this.ami.on('error', (err: Error) => {
        this.logger.error(`Lỗi AMI: ${err.message}`);
      });

      // Đăng ký nhận sự kiện từ Asterisk
      this.registerEvents();
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Lỗi khi khởi tạo kết nối AMI: ${err.message}`);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(30000, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
      this.logger.log(
        `Sẽ thử kết nối lại sau ${delay / 1000} giây (lần thử ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      );

      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      this.logger.error(
        `Đã đạt đến số lần thử kết nối tối đa (${this.maxReconnectAttempts}). Dừng kết nối.`,
      );
    }
  }

  private disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ami) {
      this.ami.disconnect();
      this.connected = false;
      this.logger.log('Đã ngắt kết nối với Asterisk AMI');
    }
  }

  private registerEvents(): void {
    if (!this.ami) return;

    // Đăng ký nhận các sự kiện từ Asterisk
    this.ami.on('managerevent', (evt: Record<string, any>) => {
      if (evt.event === 'Reload') {
        this.logger.log(`Asterisk đã reload: ${evt.message}`);
      }
    });

    // Đăng ký sự kiện cuộc gọi để ghi log
    this.ami.on('managerevent', (evt: Record<string, any>) => {
      if (['Newchannel', 'Hangup', 'Dial', 'Bridge'].includes(evt.event)) {
        this.logger.debug(`Call Event: ${evt.event} - Channel: ${evt.channel}`);
      }
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  async executeCommand(command: string): Promise<AmiResponse> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Không có kết nối tới Asterisk AMI'));
        return;
      }

      this.ami.action(
        {
          Action: 'Command',
          Command: command,
        },
        (err: Error | null, res: AmiResponse) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        },
      );
    });
  }

  async getStatus(): Promise<AmiResponse> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Không có kết nối tới Asterisk AMI'));
        return;
      }

      this.ami.action(
        {
          Action: 'CoreStatus',
        },
        (err: Error | null, res: AmiResponse) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        },
      );
    });
  }

  async getChannels(): Promise<AmiResponse> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Không có kết nối tới Asterisk AMI'));
        return;
      }

      this.ami.action(
        {
          Action: 'CoreShowChannels',
        },
        (err: Error | null, res: AmiResponse) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        },
      );
    });
  }

  async getExtensionStatus(extension: string): Promise<AmiResponse> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Không có kết nối tới Asterisk AMI'));
        return;
      }

      this.ami.action(
        {
          Action: 'ExtensionState',
          Exten: extension,
          Context: 'internal',
        },
        (err: Error | null, res: AmiResponse) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        },
      );
    });
  }

  async originateCall(params: OriginateParams): Promise<AmiResponse> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Không có kết nối tới Asterisk AMI'));
        return;
      }

      const {
        channel,
        extension,
        context = 'internal',
        priority = 1,
        variables,
        callerid,
      } = params;

      const actionParams: Record<string, any> = {
        Action: 'Originate',
        Channel: channel,
        Exten: extension,
        Context: context,
        Priority: priority,
        Async: 'true',
      };

      if (callerid) {
        actionParams.CallerID = callerid;
      }

      if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
          actionParams[`Variable: ${key}`] = value;
        });
      }

      this.ami.action(actionParams, (err: Error | null, res: AmiResponse) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  async hangupChannel(channel: string): Promise<AmiResponse> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Không có kết nối tới Asterisk AMI'));
        return;
      }

      this.ami.action(
        {
          Action: 'Hangup',
          Channel: channel,
        },
        (err: Error | null, res: AmiResponse) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        },
      );
    });
  }

  async reloadModule(module?: string): Promise<AmiResponse> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Không có kết nối tới Asterisk AMI'));
        return;
      }

      const actionParams: Record<string, any> = {
        Action: 'Reload',
      };

      if (module) {
        actionParams.Module = module;
      }

      this.ami.action(actionParams, (err: Error | null, res: AmiResponse) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  async getActivePeers(): Promise<AmiResponse> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Không có kết nối tới Asterisk AMI'));
        return;
      }

      this.ami.action(
        {
          Action: 'SIPpeers',
        },
        (err: Error | null, res: AmiResponse) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        },
      );
    });
  }

  async createSipConfig(extensions: any[]): Promise<boolean> {
    try {
      // Gửi lệnh tạo cấu hình SIP đến CLI
      const command = `sip reload`;
      await this.executeCommand(command);
      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Lỗi khi tạo cấu hình SIP: ${err.message}`);
      return false;
    }
  }
}
