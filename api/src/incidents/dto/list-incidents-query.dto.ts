import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TripIncidentType, TripIncidentStatus } from '@prisma/client';
import { TripIncidentResponseDto } from './incident-response.dto.js';

export class ListIncidentsQueryDto {
  @ApiPropertyOptional({ type: Boolean, description: 'Chỉ sự cố còn cần đúng admin xử lý.' })
  @IsOptional() @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value) @IsBoolean() actionable?: boolean;
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: TripIncidentType })
  @IsOptional()
  @IsEnum(TripIncidentType)
  type?: TripIncidentType;

  @ApiPropertyOptional({ enum: TripIncidentStatus })
  @IsOptional()
  @IsEnum(TripIncidentStatus)
  status?: TripIncidentStatus;

  @ApiPropertyOptional({ example: '2026-10-27', description: 'Lọc theo ngày xảy ra (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trường học (Chỉ SYSTEM_ADMIN)', example: 'school-uuid-1' })
  @IsOptional()
  @IsUUID()
  schoolId?: string;
}

export class ListMineIncidentsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: TripIncidentType })
  @IsOptional()
  @IsEnum(TripIncidentType)
  type?: TripIncidentType;

  @ApiPropertyOptional({ enum: TripIncidentStatus })
  @IsOptional()
  @IsEnum(TripIncidentStatus)
  status?: TripIncidentStatus;

  @ApiPropertyOptional({ example: '2026-10-27', description: 'Lọc theo ngày (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  date?: string;
}

export class PaginatedIncidentsResponseDto {
  @ApiProperty({ type: [TripIncidentResponseDto] })
  items: TripIncidentResponseDto[];

  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
