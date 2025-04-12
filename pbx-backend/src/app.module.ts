// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { ExtensionsModule } from './extensions/extensions.module';
import { TrunksModule } from './trunks/trunks.module';
import { QueuesModule } from './queues/queues.module';
import { RoutesModule } from './routes/routes.module';
import { CdrModule } from './cdr/cdr.module';
import { AsteriskModule } from './asterisk/asterisk.module';
import { SipLoggerModule } from './sip-logger/sip-logger.module';
import { CrmIntegrationModule } from './crm-integration/crm-integration.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigService],
    }),
    ExtensionsModule,
    TrunksModule,
    QueuesModule,
    RoutesModule,
    CdrModule,
    AsteriskModule,
    SipLoggerModule,
    CrmIntegrationModule,
    DashboardModule,
  ],
})
export class AppModule {}