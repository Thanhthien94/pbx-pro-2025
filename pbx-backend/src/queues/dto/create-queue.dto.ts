// src/queues/dto/create-queue.dto.ts
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsArray,
} from 'class-validator';

export class CreateQueueDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum([
    'ringall',
    'leastrecent',
    'fewestcalls',
    'random',
    'rrmemory',
    'linear',
    'wrandom',
  ])
  strategy?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timeout?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wrapuptime?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxlen?: number;

  @IsOptional()
  @IsString()
  announce?: string;

  @IsOptional()
  @IsArray()
  members?: string[];

  @IsOptional()
  @IsString()
  musicClass?: string;
}
