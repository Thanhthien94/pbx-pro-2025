// src/sip-logger/dto/create-sip-log.dto.ts
import {
  IsNotEmpty,
  IsString,
  IsIP,
  IsOptional,
  IsEnum,
  IsDate,
  IsObject,
  IsNumber,
} from 'class-validator';

export class CreateSipLogDto {
  @IsOptional()
  @IsDate()
  timestamp: Date;

  @IsNotEmpty()
  @IsIP()
  source_ip: string;

  @IsNotEmpty()
  @IsIP()
  destination_ip: string;

  @IsNotEmpty()
  @IsString()
  method: string;

  @IsOptional()
  @IsString()
  call_id?: string;

  @IsOptional()
  @IsString()
  from_user?: string;

  @IsOptional()
  @IsString()
  to_user?: string;

  @IsOptional()
  @IsNumber()
  status_code?: number;

  @IsOptional()
  @IsString()
  reason_phrase?: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, any>;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsEnum(['inbound', 'outbound'])
  direction?: string;
}
