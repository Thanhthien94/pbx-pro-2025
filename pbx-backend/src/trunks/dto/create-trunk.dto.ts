// src/trunks/dto/create-trunk.dto.ts
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Matches,
} from 'class-validator';

export class CreateTrunkDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message:
      'Tên trunk chỉ được chứa ký tự chữ số, chữ cái, gạch dưới, dấu chấm và gạch ngang',
  })
  name: string;

  @IsNotEmpty()
  @IsEnum(['sip', 'pjsip', 'iax'])
  type: string;

  @IsNotEmpty()
  @IsString()
  host: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsEnum(['rfc2833', 'info', 'inband', 'auto'])
  dtmfMode?: string;

  @IsOptional()
  @IsEnum(['udp', 'tcp', 'tls', 'ws', 'wss'])
  transport?: string;

  @IsOptional()
  @IsString()
  insecure?: string;

  @IsOptional()
  @IsEnum(['yes', 'no', 'force_rport', 'comedia'])
  nat?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  qualifyFreq?: number;

  @IsOptional()
  @IsString()
  disallow?: string;

  @IsOptional()
  @IsString()
  allow?: string;
}
