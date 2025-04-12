// src/extensions/dto/create-extension.dto.ts
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsNumber,
  Min,
  Matches,
} from 'class-validator';

export class CreateExtensionDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message:
      'Extension chỉ được chứa ký tự chữ số, chữ cái, gạch dưới, dấu chấm và gạch ngang',
  })
  extension: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  secret: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsString()
  callGroup?: string;

  @IsOptional()
  @IsString()
  pickupGroup?: string;

  @IsOptional()
  @IsString()
  mailbox?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(['rfc2833', 'info', 'inband', 'auto'])
  dtmfMode?: string;

  @IsOptional()
  @IsEnum(['udp', 'tcp', 'tls', 'ws', 'wss'])
  transport?: string;

  @IsOptional()
  @IsEnum(['yes', 'no', 'force_rport', 'comedia'])
  nat?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  callLimit?: number;

  @IsOptional()
  @IsString()
  disallow?: string;

  @IsOptional()
  @IsString()
  allow?: string;
}
