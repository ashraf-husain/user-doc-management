import { IsUUID, IsOptional, IsEnum, IsObject } from 'class-validator';
import { IngestionStatus } from '../entities/ingestion-process.entity';

export class CreateIngestionProcessDto {
  @IsUUID()
  documentId: string;

  @IsOptional()
  @IsObject()
  configuration?: any;
}

export class IngestionProcessQueryDto {
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsOptional()
  @IsEnum(IngestionStatus)
  status?: IngestionStatus;

  @IsOptional()
  sortBy?: string;

  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
