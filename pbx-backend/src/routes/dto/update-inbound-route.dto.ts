// src/routes/dto/update-inbound-route.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateInboundRouteDto } from './create-inbound-route.dto';

export class UpdateInboundRouteDto extends PartialType(CreateInboundRouteDto) {}
