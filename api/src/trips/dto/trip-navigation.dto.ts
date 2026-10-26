import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsDefined, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export const LOCATION_SOURCES = ['LIVE', 'TEST_AUTO', 'TEST_JOYSTICK'] as const;
export type LocationSource = typeof LOCATION_SOURCES[number];

export class NavigationSampleDto {
  @ApiProperty({ minimum: -90, maximum: 90 })
  @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @ApiProperty({ minimum: -180, maximum: 180 })
  @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @ApiProperty({ format: 'date-time', description: 'Fresh device sample, at most 15 seconds old; never an offline backlog.' })
  @IsDateString() capturedAt!: string;
  @ApiPropertyOptional({ nullable: true, description: 'GPS accuracy in metres; LIVE requires <=50m.' })
  @IsOptional() @IsNumber() @Min(0) @Max(10000) accuracyMeters?: number | null;
}

export class NavigationSessionDto {
  @ApiProperty({ enum: ['START', 'STOP', 'SWITCH', 'RESUME'] })
  @IsIn(['START', 'STOP', 'SWITCH', 'RESUME']) action!: 'START' | 'STOP' | 'SWITCH' | 'RESUME';
  @ApiPropertyOptional({ enum: LOCATION_SOURCES, description: 'TEST uses simulation only, LIVE uses GPS only. Required for START/SWITCH.' })
  @IsOptional() @IsIn(LOCATION_SOURCES) source?: LocationSource;
  @ApiPropertyOptional({ nullable: true, description: 'Compare-and-set run from the latest navigation response; null for first START.' })
  @IsOptional() @IsString() @MaxLength(80) expectedRunId?: string | null;
}

export class PublishPositionDto extends NavigationSampleDto {
  @ApiProperty() @IsString() @MaxLength(80) runId!: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Max(2147483647) sequence!: number;
}

export class NavigationSegmentDto {
  @ApiProperty({ enum: ['CURRENT', 'ADVANCE'] }) @IsIn(['CURRENT', 'ADVANCE']) action!: 'CURRENT' | 'ADVANCE';
  @ApiProperty() @IsString() @MaxLength(80) runId!: string;
  @ApiProperty() @IsString() @MaxLength(80) routeVersion!: string;
  @ApiProperty() @IsString() @MaxLength(80) expectedTargetStopId!: string;
  @ApiProperty({ type: NavigationSampleDto })
  @IsDefined() @Type(() => NavigationSampleDto) @ValidateNested() position!: NavigationSampleDto;
}

export class LocationHistoryQueryDto {
  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(2147483647) afterSequence?: number;
  @ApiPropertyOptional({ default: 500, maximum: 1000 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) limit?: number;
  @ApiPropertyOptional({ description: 'Use the first response boundary for every later page.' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(2147483647) snapshotMaxSequence?: number;
}

export class LocationPointDto {
  @ApiProperty() sequence!: number;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
  @ApiProperty({ format: 'date-time', description: 'Server acceptance timestamp, not reconstructed device history.' }) recordedAt!: Date;
  @ApiProperty({ description: 'Opaque continuity token; break the rendered line when it changes.' }) runId!: string;
}
export class NavigationCheckpointDto {
  @ApiProperty() runId!: string;
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ enum: LOCATION_SOURCES }) activeSource!: LocationSource;
  @ApiProperty({ nullable: true, type: String }) targetStopId!: string | null;
  @ApiProperty() routeVersion!: string;
}
export class NavigationStateDto {
  @ApiProperty() status!: string;
  @ApiProperty() routeVersion!: string;
  @ApiProperty({ type: LocationPointDto, nullable: true }) latestPosition!: LocationPointDto | null;
  @ApiProperty({ enum: ['NONE', 'FRESH', 'STALE'] }) freshness!: string;
  @ApiProperty({ format: 'date-time' }) serverNow!: Date;
  @ApiProperty() canPublish!: boolean;
  @ApiProperty() testMode!: boolean;
  @ApiProperty({ type: NavigationCheckpointDto, nullable: true, description: 'Only current owner receives a resumable checkpoint; no Session ID exposed.' }) checkpoint!: NavigationCheckpointDto | null;
  @ApiProperty() nextSequence!: number;
  @ApiProperty({ type: String, nullable: true, description: 'Assigned Driver only: opaque CAS token for an explicit START; never a Session ID.' }) controlRunId!: string | null;
  @ApiProperty({ default: 5000 }) publishIntervalMs!: number;
}
export class LocationHistoryDto {
  @ApiProperty({ type: [LocationPointDto] }) points!: LocationPointDto[];
  @ApiProperty() nextCursor!: number;
  @ApiProperty() snapshotMaxSequence!: number;
  @ApiProperty() hasMore!: boolean;
}
export class NavigationInstructionDto {
  @ApiProperty() text!: string;
  @ApiProperty() streetName!: string;
  @ApiProperty() sign!: number;
  @ApiProperty({ type: [Number], description: '[start,end] indices in the geometry in this same response.' }) interval!: [number, number];
  @ApiProperty({ description: 'Metres until next instruction' }) distance!: number;
}
export class NavigationRouteDto {
  @ApiProperty() segmentVersion!: string;
  @ApiProperty({ nullable: true, type: String }) targetStopId!: string | null;
  @ApiProperty() routeVersion!: string;
  @ApiProperty({ description: 'Polyline5; empty only when finished=true.' }) geometry!: string;
  @ApiProperty({ type: [NavigationInstructionDto] }) instructions!: NavigationInstructionDto[];
  @ApiProperty() distanceMeters!: number;
  @ApiProperty() durationSeconds!: number;
  @ApiProperty() finished!: boolean;
}
export class PositionAckDto {
  @ApiProperty() sequence!: number;
  @ApiProperty() nextSequence!: number;
  @ApiProperty({ format: 'date-time' }) recordedAt!: Date;
}
