import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role, type User } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentSessionId, CurrentUser } from '../auth/decorators/auth-user.decorator.js';
import { TripNavigationService } from './trip-navigation.service.js';
import { LocationHistoryDto, LocationHistoryQueryDto, NavigationRouteDto, NavigationSegmentDto, NavigationSessionDto, NavigationStateDto, PositionAckDto, PublishPositionDto } from './dto/trip-navigation.dto.js';

@ApiTags('Trip Navigation & Location')
@ApiBearerAuth('JWT-auth')
@ApiParam({ name: 'id', description: 'Trip ID; authorization follows Trip Detail object scope.' })
@ApiResponse({ status: 400, description: 'Malformed position, stale sample, poor GPS accuracy, or invalid cursor.' })
@ApiResponse({ status: 401, description: 'Session expired/revoked.' })
@ApiResponse({ status: 403, description: 'Trip scope denied, not assigned Driver, or TEST source in LIVE.' })
@ApiResponse({ status: 404, description: 'Trip not found.' })
@ApiResponse({ status: 409, description: 'Trip terminal or stale owner/run/target/version/sequence.' })
@ApiResponse({ status: 429, description: 'Position cadence 5s or routing cooldown20s; retryAfterMs in body.' })
@ApiResponse({ status: 500, description: 'Internal error; operation is not confirmed successful.' })
@Controller('trips/:id')
@UseGuards(AuthGuard, RolesGuard)
export class TripNavigationController {
  constructor(private readonly navigation: TripNavigationService) {}

  @Get('navigation')
  @ApiOperation({ summary: 'Latest persisted vehicle position for five authorized roles; no synthetic initial marker.' })
  @ApiResponse({ status: 200, type: NavigationStateDto })
  state(@Param('id') id: string, @CurrentUser() user: User, @CurrentSessionId() sid: string) {
    return this.navigation.navigation(id, user, sid);
  }

  @Put('navigation/session') @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'START/STOP/SWITCH/RESUME foreground navigation; never starts/completes the Trip.' })
  @ApiBody({ type: NavigationSessionDto }) @ApiResponse({ status: 200, type: NavigationStateDto })
  session(@Param('id') id: string, @Body() dto: NavigationSessionDto, @CurrentUser() user: User, @CurrentSessionId() sid: string) {
    return this.navigation.session(id, dto, user, sid);
  }

  @Put('navigation/position') @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Append a fresh position at most every5s; same-sequence retry is idempotent. No offline backfill.' })
  @ApiBody({ type: PublishPositionDto }) @ApiResponse({ status: 200, type: PositionAckDto })
  position(@Param('id') id: string, @Body() dto: PublishPositionDto, @CurrentUser() user: User, @CurrentSessionId() sid: string) {
    return this.navigation.publish(id, dto, user, sid);
  }

  @Post('navigation/segment') @HttpCode(200) @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'VietMap P→current target only; ADVANCE changes navigation cursor, never business milestones.' })
  @ApiBody({ type: NavigationSegmentDto }) @ApiResponse({ status: 200, type: NavigationRouteDto })
  @ApiResponse({ status: 502, description: 'ROUTING_UNAVAILABLE: invalid geometry/instructions; no fallback guidance.' })
  @ApiResponse({ status: 503, description: 'VietMap missing configuration, quota, timeout or upstream failure.' })
  segment(@Param('id') id: string, @Body() dto: NavigationSegmentDto, @CurrentUser() user: User, @CurrentSessionId() sid: string) {
    return this.navigation.segment(id, dto, user, sid);
  }

  @Get('location-history')
  @ApiOperation({ summary: 'Recorded history ordered by sequence; split at run changes/gaps. Zero points means planned-line fallback.' })
  @ApiQuery({ name: 'afterSequence', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Default500, max1000.' })
  @ApiQuery({ name: 'snapshotMaxSequence', required: false, type: Number, description: 'Boundary returned on first page.' })
  @ApiResponse({ status: 200, type: LocationHistoryDto })
  history(@Param('id') id: string, @Query() dto: LocationHistoryQueryDto, @CurrentUser() user: User) {
    return this.navigation.history(id, dto, user);
  }
}
