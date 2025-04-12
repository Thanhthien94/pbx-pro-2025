// src/routes/dto/create-inbound-route.dto.ts
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
  Matches,
} from 'class-validator';

export class CreateInboundRouteDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message:
      'Tên route chỉ được chứa ký tự chữ số, chữ cái, gạch dưới, dấu chấm và gạch ngang',
  })
  name: string;

  @IsOptional()
  @IsString()
  did?: string;

  @IsNotEmpty()
  @IsString()
  destination: string;

  @IsNotEmpty()
  @IsEnum(['extension', 'queue', 'ivr'], {
    message:
      'Kiểu đích đến phải là một trong các giá trị: extension, queue, ivr',
  })
  destinationType: string;

  @IsOptional()
  @IsString()
  callerIdName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;
}
