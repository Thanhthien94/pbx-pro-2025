// src/routes/dto/create-outbound-route.dto.ts
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Matches,
} from 'class-validator';

export class CreateOutboundRouteDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message:
      'Tên route chỉ được chứa ký tự chữ số, chữ cái, gạch dưới, dấu chấm và gạch ngang',
  })
  name: string;

  @IsNotEmpty()
  @IsString()
  pattern: string;

  @IsNotEmpty()
  @IsString()
  trunk: string;

  @IsOptional()
  @IsString()
  prepend?: string;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsString()
  callerIdName?: string;

  @IsOptional()
  @IsString()
  callerIdNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;
}
