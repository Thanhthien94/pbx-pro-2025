// src/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AsteriskModule } from '../asterisk/asterisk.module';
import { ExtensionsModule } from '../extensions/extensions.module';
import { TrunksModule } from '../trunks/trunks.module';
import { QueuesModule } from '../queues/queues.module';
import { CdrModule } from '../cdr/cdr.module';

@Module({
  imports: [
    AsteriskModule,
    ExtensionsModule,
    TrunksModule,
    QueuesModule,
    CdrModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
