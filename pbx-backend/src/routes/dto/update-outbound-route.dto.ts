// src/routes/dto/update-outbound-route.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateOutboundRouteDto } from './create-outbound-route.dto';

export class UpdateOutboundRouteDto extends PartialType(
  CreateOutboundRouteDto,
) {}
