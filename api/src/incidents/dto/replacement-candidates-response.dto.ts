import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IncidentCandidateDto {
  @ApiProperty({ example: 'user-uuid-1' })
  id: string;

  @ApiProperty({ example: 'Nguyễn Văn B' })
  fullName: string;

  @ApiPropertyOptional({ example: '0987654321', nullable: true })
  phone?: string | null;

  @ApiPropertyOptional({ example: 'b@example.com', nullable: true })
  email?: string | null;

  @ApiProperty({ example: 'BUS_ATTENDANT' })
  role: string;
}

export class ReplacementCandidatesResponseDto {
  @ApiProperty({ type: [IncidentCandidateDto] })
  candidates: IncidentCandidateDto[];

  @ApiProperty({ example: 3 })
  total: number;
}
