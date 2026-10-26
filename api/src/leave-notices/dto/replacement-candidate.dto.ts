import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReplacementCandidateDto {
  @ApiProperty({ example: 'user-uuid-1' })
  id: string;

  @ApiProperty({ example: 'Nguyễn Văn Dự Bị' })
  fullName: string;

  @ApiPropertyOptional({ example: '0901234567', nullable: true })
  phone?: string | null;

  @ApiPropertyOptional({ example: 'dubi@gmail.com', nullable: true })
  email?: string | null;

  @ApiProperty({ example: true })
  isAvailable: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
  unavailableReason?: string | null;
}

export class ReplacementCandidatesResponseDto {
  @ApiProperty({ type: [ReplacementCandidateDto] })
  candidates: ReplacementCandidateDto[];
}
