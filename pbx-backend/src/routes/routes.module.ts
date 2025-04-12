// src/routes/routes.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutboundRoutesController } from './outbound-routes.controller';
import { InboundRoutesController } from './inbound-routes.controller';
import { OutboundRoutesService } from './outbound-routes.service';
import { InboundRoutesService } from './inbound-routes.service';
import {
  OutboundRoute,
  OutboundRouteSchema,
} from './schemas/outbound-route.schema';
import {
  InboundRoute,
  InboundRouteSchema,
} from './schemas/inbound-route.schema';
import { AsteriskModule } from '../asterisk/asterisk.module';
import { TrunksModule } from '../trunks/trunks.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OutboundRoute.name, schema: OutboundRouteSchema },
      { name: InboundRoute.name, schema: InboundRouteSchema },
    ]),
    AsteriskModule,
    TrunksModule,
  ],
  controllers: [OutboundRoutesController, InboundRoutesController],
  providers: [OutboundRoutesService, InboundRoutesService],
  exports: [OutboundRoutesService, InboundRoutesService],
})
export class RoutesModule {}
