import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API server health' })
  @ApiResponse({ status: 200, description: 'API server is running normally' })
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('db')
  @ApiOperation({ summary: 'Check PostgreSQL database connectivity' })
  @ApiResponse({ status: 200, description: 'Database is reachable and responsive' })
  getDbHealth() {
    return this.healthService.getDbHealth();
  }
}
