import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { VietMapVRPService, VRPJobInput, VRPVehicleInput } from './vietmap-vrp.service.js';
import { Prisma, Role, RouteDirection, RoutePlanStatus, RouteStopType, StudentStatus, User } from '@prisma/client';
import { buildTripRouteSnapshot } from '../trips/utils/trip-snapshot-resolver.js';
import {
  EligibleStudentItemDto,
  IneligibleStudentItemDto,
  AvailableVehicleItemDto,
  UnavailableVehicleItemDto,
  RoutePreparationDto,
} from './dto/route-preparation.dto.js';
import { OptimizeRouteDto } from './dto/optimize-route.dto.js';
import {
  PreviewRouteDto,
  PreviewRouteStopDto,
  RoutePreviewResponseDto,
} from './dto/route-preview-response.dto.js';
import { ConfirmRoutePlanDto } from './dto/confirm-route-plan.dto.js';
import { RoutePlanResponseDto } from './dto/route-plan-response.dto.js';
import { RouteResponseDto } from './dto/route-response.dto.js';
import { StudentDerivedRoutingStatus, StudentRoutingDetailDto } from './dto/student-routing-status.dto.js';
import { ResourceAvailabilityService } from './resource-availability.service.js';
import { ApprovalReadinessResponseDto } from './dto/approval-readiness.dto.js';
import { createHash, randomUUID } from 'node:crypto';
import { TripStatus, LeaveNoticeStatus, LeaveNoticeKind } from '@prisma/client';
import { RoutePlanCancellationImpactDto } from './dto/route-plan-cancellation-impact.dto.js';
import {
  StudentInsertionOptionsResponseDto,
  PreviewStudentInsertionDto,
  PreviewStudentInsertionResponseDto,
  ConfirmStudentInsertionDto,
  RoutePairOptionDto,
  RouteInsertionResultDto,
} from './dto/student-insertion.dto.js';
import { metresBetween } from '../trips/utils/navigation-state.js';
import { AssignVehicleGroupDto } from './dto/assign-vehicle-group.dto.js';
import { AssignDriverGroupDto } from './dto/assign-driver-group.dto.js';
import { AssignBusAttendantGroupDto } from './dto/assign-bus-attendant-group.dto.js';

interface PreviewSession {
  token: string;
  createdAt: number;
  schoolId: string;
  schoolName: string;
  constraints: any;
  outboundRoutes: PreviewRouteDto[];
  returnRoutes: PreviewRouteDto[];
  summary: any;
}

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);
  private readonly previewSessions = new Map<string, PreviewSession>();
  private readonly insertionSessions = new Map<string, any>();

  // Default Central Parking Lot coordinates (Suối Tiên Depot, Thủ Đức, TP.HCM)
  private readonly defaultParking = {
    addressText: 'Bãi xe trung tâm RoadToSchool (Bến xe Suối Tiên, TP. Thủ Đức)',
    latitude: 10.866123,
    longitude: 106.802345,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly vietmapVRPService: VietMapVRPService,
    private readonly resourceAvailabilityService: ResourceAvailabilityService,
  ) {
    // Periodic cleanup of expired preview sessions (TTL 30 minutes)
    setInterval(() => {
      const now = Date.now();
      for (const [token, session] of this.previewSessions.entries()) {
        if (now - session.createdAt > 30 * 60 * 1000) {
          this.previewSessions.delete(token);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Helper: Lấy cấu hình bãi đỗ xe trung tâm từ SystemSettings (PARKING_LOT)
   */
  private async getParkingLotConfig(): Promise<{ addressText: string; latitude: number; longitude: number }> {
    let setting: any = null;
    try {
      if (typeof this.prisma.systemSetting.findUnique === 'function') {
        setting = await this.prisma.systemSetting.findUnique({
          where: { key: 'PARKING_LOT' },
        });
        if (!setting) {
          setting = await this.prisma.systemSetting.findUnique({
            where: { key: 'parking_lot' },
          });
        }
      } else if (typeof (this.prisma.systemSetting as any).findFirst === 'function') {
        setting = await (this.prisma.systemSetting as any).findFirst({
          where: {
            OR: [{ key: 'PARKING_LOT' }, { key: 'parking_lot' }],
          },
        });
      }
    } catch {
      // Ignore if table/key is not queried
    }

    if (!setting || !setting.value) {
      return this.defaultParking;
    }

    const val = setting.value as any;
    const lat = Number(val.latitude);
    const lng = Number(val.longitude);
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      return this.defaultParking;
    }

    return {
      addressText: val.addressText || val.address || this.defaultParking.addressText,
      latitude: lat,
      longitude: lng,
    };
  }

  /**
   * Helper: Chuyển đổi "HH:mm" thành số giây tính từ 00:00
   */
  private parseTimeToSeconds(timeStr?: string): number {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 3600 + (m || 0) * 60;
  }

  /**
   * Helper: Xác định thời gian dừng phục vụ cho từng học sinh và chiều tuyến
   */
  private resolveStudentServiceSeconds(
    studentId: string,
    direction: RouteDirection,
    defaultSeconds: number,
    overrides?: any[],
  ): number {
    if (overrides && overrides.length > 0) {
      const match = overrides.find(
        (o) =>
          o.studentId === studentId &&
          (!o.direction || o.direction === direction),
      );
      if (match && typeof match.serviceSeconds === 'number' && match.serviceSeconds > 0) {
        return Math.round(match.serviceSeconds);
      }
    }
    return defaultSeconds > 0 ? Math.round(defaultSeconds) : 60;
  }

  // ==========================================
  // 1. ROUTE PREPARATION DATA
  // ==========================================

  async getPreparationData(schoolId: string): Promise<RoutePreparationDto> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học đối tác');
    }
    if (!school.isActive) {
      throw new BadRequestException('Trường học này hiện đang tạm ngưng hoạt động');
    }

    // Parking lot from system settings (Unified Source of Truth - RM-004)
    const parkingLot = await this.getParkingLotConfig();

    // 1. Students Eligibility Partition
    // Active / Draft plans for this school
    const activeOrDraftPlans = await this.prisma.routePlan.findMany({
      where: {
        schoolId,
        status: { in: [RoutePlanStatus.DRAFT, RoutePlanStatus.ACTIVE] },
      },
      select: { id: true, status: true, name: true },
    });
    const planIds = activeOrDraftPlans.map((p) => p.id);

    // Find student IDs already assigned to DRAFT or ACTIVE routes for this school
    const assignedStudentRows = await this.prisma.routeStop.findMany({
      where: {
        route: {
          routePlanId: { in: planIds },
        },
        studentId: { not: null },
      },
      select: {
        studentId: true,
        route: {
          select: {
            routePlan: {
              select: { status: true, name: true },
            },
          },
        },
      },
    });

    const assignedStudentMap = new Map<string, { status: RoutePlanStatus; planName: string }>();
    for (const r of assignedStudentRows) {
      if (r.studentId && !assignedStudentMap.has(r.studentId)) {
        assignedStudentMap.set(r.studentId, {
          status: r.route?.routePlan?.status || RoutePlanStatus.DRAFT,
          planName: r.route?.routePlan?.name || 'Phương án tuyến',
        });
      }
    }

    const allStudents = await this.prisma.student.findMany({
      where: { schoolId },
      orderBy: { fullName: 'asc' },
    });

    const eligibleStudents: EligibleStudentItemDto[] = [];
    const ineligibleStudents: IneligibleStudentItemDto[] = [];

    for (const s of allStudents) {
      if (s.status !== StudentStatus.AVAILABLE) {
        ineligibleStudents.push({
          id: s.id,
          code: s.code,
          fullName: s.fullName,
          guardianPhone: s.guardianPhone,
          addressText: s.addressText,
          latitude: s.latitude,
          longitude: s.longitude,
          reasonCode: 'INACTIVE_STATUS',
          reasonMessage: 'Hồ sơ học sinh đang ở trạng thái ngưng hoạt động (DISABLED)',
        });
      } else if (!s.latitude || !s.longitude) {
        ineligibleStudents.push({
          id: s.id,
          code: s.code,
          fullName: s.fullName,
          guardianPhone: s.guardianPhone,
          addressText: s.addressText,
          latitude: s.latitude,
          longitude: s.longitude,
          reasonCode: 'MISSING_COORDINATES',
          reasonMessage: 'Chưa cập nhật tọa độ điểm đón/trả',
        });
      } else if (assignedStudentMap.has(s.id)) {
        const planInfo = assignedStudentMap.get(s.id)!;
        const planType = planInfo.status === RoutePlanStatus.ACTIVE ? 'đang hoạt động' : 'chờ duyệt';
        ineligibleStudents.push({
          id: s.id,
          code: s.code,
          fullName: s.fullName,
          guardianPhone: s.guardianPhone,
          addressText: s.addressText,
          latitude: s.latitude,
          longitude: s.longitude,
          reasonCode: 'ALREADY_ASSIGNED',
          reasonMessage: `Đã được phân vào phương án tuyến ${planType} ("${planInfo.planName}")`,
        });
      } else {
        eligibleStudents.push({
          id: s.id,
          code: s.code,
          fullName: s.fullName,
          guardianPhone: s.guardianPhone,
          avatarUrl: s.avatarUrl,
          addressText: s.addressText || 'Chưa cập nhật địa chỉ',
          latitude: s.latitude!,
          longitude: s.longitude!,
        });
      }
    }

    // 2. Vehicles Classification (Available vs Unavailable - Gate 1 / BR-V01, BR-V02, BR-V03)
    const vehicleConflicts = await this.resourceAvailabilityService.findConflictingVehicles(
      undefined,
      schoolId,
    );

    const allVehicles = await this.prisma.vehicle.findMany({
      orderBy: { seatCount: 'desc' },
    });

    const availableVehicles: AvailableVehicleItemDto[] = [];
    const unavailableVehicles: UnavailableVehicleItemDto[] = [];

    for (const v of allVehicles) {
      if (v.seatCount <= 0 || !v.licensePlate) {
        unavailableVehicles.push({
          id: v.id,
          brand: v.brand,
          seatCount: v.seatCount,
          licensePlate: v.licensePlate,
          color: v.color,
          reasonCode: 'INVALID_VEHICLE_DATA',
          reasonMessage: 'Dữ liệu phương tiện không hợp lệ (thiếu biển số hoặc số chỗ <= 0)',
        });
      } else if (vehicleConflicts.has(v.id)) {
        const conflict = vehicleConflicts.get(v.id)!;
        unavailableVehicles.push({
          id: v.id,
          brand: v.brand,
          seatCount: v.seatCount,
          licensePlate: v.licensePlate,
          color: v.color,
          reasonCode: conflict.reasonCode,
          reasonMessage: conflict.reasonMessage,
        });
      } else {
        availableVehicles.push({
          id: v.id,
          brand: v.brand,
          seatCount: v.seatCount,
          licensePlate: v.licensePlate,
          color: v.color,
        });
      }
    }

    return {
      school: {
        id: school.id,
        name: school.name,
        addressText: school.addressText,
        latitude: school.latitude,
        longitude: school.longitude,
        weeklySchedule: school.weeklySchedule,
        contractStartDate: school.contractStartDate.toISOString().split('T')[0],
        contractEndDate: school.contractEndDate.toISOString().split('T')[0],
      },
      parkingLot: {
        addressText: parkingLot.addressText,
        latitude: parkingLot.latitude,
        longitude: parkingLot.longitude,
      },
      eligibleStudents,
      ineligibleStudents,
      availableVehicles,
      unavailableVehicles,
    };
  }

  // ==========================================
  // 2. ROUTE OPTIMIZATION PREVIEW (VRP)
  // ==========================================

  async optimizePreview(
    dto: OptimizeRouteDto,
    currentUser: User,
  ): Promise<RoutePreviewResponseDto> {
    const school = await this.prisma.school.findUnique({
      where: { id: dto.schoolId },
    });
    if (!school || !school.isActive) {
      throw new BadRequestException('Trường học không tồn tại hoặc đã ngừng hoạt động');
    }

    // Parking lot from system settings (RM-004)
    const parkingLot = await this.getParkingLotConfig();
    const parkingCoord: [number, number] = [parkingLot.longitude, parkingLot.latitude];
    const schoolCoord: [number, number] = [school.longitude, school.latitude];

    // Verify selected students
    const students = await this.prisma.student.findMany({
      where: {
        id: { in: dto.studentIds },
        schoolId: dto.schoolId,
        status: StudentStatus.AVAILABLE,
        latitude: { not: null },
        longitude: { not: null },
      },
    });

    if (students.length === 0) {
      throw new BadRequestException('Không có học sinh hợp lệ nào được chọn để lập tuyến');
    }

    // Verify selected vehicles
    const vehicles = await this.prisma.vehicle.findMany({
      where: { id: { in: dto.vehicleIds } },
      orderBy: { seatCount: 'desc' },
    });

    if (vehicles.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một phương tiện để chạy tuyến');
    }

    // Gate 2: Revalidate vehicle reservation exclusivity before calling VietMap VRP (BR-V01, BR-V02, BR-V03)
    const vehicleConflicts = await this.resourceAvailabilityService.findConflictingVehicles(
      dto.vehicleIds,
      dto.schoolId,
    );

    if (vehicleConflicts.size > 0) {
      const conflictList = Array.from(vehicleConflicts.values());
      const firstConflict = conflictList[0];
      throw new ConflictException(
        `Không thể tối ưu hóa tuyến: ${firstConflict.reasonMessage}`,
      );
    }

    // Capacity Check: SUM(seatCount) vs students.length
    const totalCapacity = vehicles.reduce((sum, v) => sum + v.seatCount, 0);
    if (totalCapacity < students.length) {
      this.logger.warn(
        `Tổng số ghế đã chọn (${totalCapacity} chỗ) không đủ cho ${students.length} học sinh. Hệ thống sẽ tối ưu một phần theo quy tắc BR-02.`,
      );
    }

    const studentMap = new Map(students.map((s) => [s.id, s]));
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

    // Resolve base school start and end times from School.weeklySchedule or explicit constraints (RM-005)
    const weeklySchedule = (school.weeklySchedule as Record<string, { start?: string; end?: string }>) || {};
    const activeDays = Object.entries(weeklySchedule).filter(([_, v]) => v && v.start && v.end);

    let baseStartSec = 25200; // default 07:00
    let baseEndSec = 61200; // default 17:00

    if (dto.constraints?.latestSchoolArrival) {
      baseStartSec = this.parseTimeToSeconds(dto.constraints.latestSchoolArrival);
    } else if (activeDays.length > 0) {
      const startTimes = activeDays.map(([_, v]) => this.parseTimeToSeconds(v.start!));
      baseStartSec = Math.min(...startTimes);
    }

    if (dto.constraints?.returnDepartureTime) {
      baseEndSec = this.parseTimeToSeconds(dto.constraints.returnDepartureTime);
    } else if (activeDays.length > 0) {
      const endTimes = activeDays.map(([_, v]) => this.parseTimeToSeconds(v.end!));
      baseEndSec = Math.min(...endTimes);
    }

    const latestArrivalSeconds = baseStartSec;
    const returnDepSeconds = baseEndSec;
    const defaultStopServiceSeconds = dto.constraints?.defaultStopServiceSeconds || 60;
    const stopServiceOverrides = dto.constraints?.stopServiceOverrides || [];
    const maxRouteDurationMinutes = (dto.constraints?.maxRouteDurationMinutes && dto.constraints.maxRouteDurationMinutes > 0)
      ? dto.constraints.maxRouteDurationMinutes
      : 60;
    const maxRouteDurationSeconds = maxRouteDurationMinutes * 60;

    // -------------------------------------------------------------
    // PHASE 1: OUTBOUND VRP (Bãi xe -> Học sinh -> Trường)
    // Relative Time Window [0, maxRouteDurationSeconds] (BR-02 / Section 3.2)
    // -------------------------------------------------------------
    const outboundJobs: VRPJobInput[] = students.map((s) => ({
      id: s.id,
      location: [s.longitude!, s.latitude!],
      serviceSeconds: this.resolveStudentServiceSeconds(
        s.id,
        RouteDirection.TO_SCHOOL,
        defaultStopServiceSeconds,
        stopServiceOverrides,
      ),
      pickupAmount: 1,
      timeWindowSeconds: [0, maxRouteDurationSeconds],
    }));

    const outboundVehicles: VRPVehicleInput[] = vehicles.map((v) => ({
      id: v.id,
      start: parkingCoord,
      end: schoolCoord,
      capacity: v.seatCount,
      timeWindowSeconds: [0, maxRouteDurationSeconds],
    }));

    const outboundSolution = await this.vietmapVRPService.solveVRP(outboundJobs, outboundVehicles);

    // Identify vehicles used in Outbound
    const outboundUsedVehicleIds = new Set(
      outboundSolution.routes.map((r) => String(r.vehicleId)),
    );

    // Identify assigned students in Outbound
    const outboundAssignedStudentIds = new Set<string>();
    for (const r of outboundSolution.routes) {
      for (const s of r.steps) {
        if (s.id && studentMap.has(String(s.id))) {
          outboundAssignedStudentIds.add(String(s.id));
        }
      }
    }

    if (outboundAssignedStudentIds.size === 0) {
      throw new BadRequestException(
        'Thuật toán VietMap không tìm được phương án phân bổ khả thi cho chiều đi.',
      );
    }

    // -------------------------------------------------------------
    // PHASE 2: RETURN VRP (Trường -> Học sinh -> Bãi xe)
    // ReturnVehicles ⊆ OutboundUsedVehicles
    // ReturnJobs = OutboundAssignedStudents
    // Relative Time Window [0, maxRouteDurationSeconds]
    // -------------------------------------------------------------
    const returnJobs: VRPJobInput[] = Array.from(outboundAssignedStudentIds).map((id) => {
      const s = studentMap.get(id)!;
      return {
        id: s.id,
        location: [s.longitude!, s.latitude!],
        serviceSeconds: this.resolveStudentServiceSeconds(
          s.id,
          RouteDirection.TO_PARKING,
          defaultStopServiceSeconds,
          stopServiceOverrides,
        ),
        deliveryAmount: 1,
        timeWindowSeconds: [0, maxRouteDurationSeconds],
      };
    });

    const returnVehicles: VRPVehicleInput[] = vehicles
      .filter((v) => outboundUsedVehicleIds.has(v.id))
      .map((v) => ({
        id: v.id,
        start: schoolCoord,
        end: parkingCoord,
        capacity: v.seatCount,
        timeWindowSeconds: [0, maxRouteDurationSeconds],
      }));

    const returnSolution = await this.vietmapVRPService.solveVRP(returnJobs, returnVehicles);

    // Identify assigned students in Return
    const returnAssignedStudentIds = new Set<string>();
    for (const r of returnSolution.routes) {
      for (const s of r.steps) {
        if (s.id && studentMap.has(String(s.id))) {
          returnAssignedStudentIds.add(String(s.id));
        }
      }
    }

    // -------------------------------------------------------------
    // PHASE 3: TWO-DIRECTION CONSISTENCY (BR-02)
    // FinalStudents = Outbound ∩ Return
    // -------------------------------------------------------------
    const finalStudentIds = new Set(
      Array.from(outboundAssignedStudentIds).filter((id) =>
        returnAssignedStudentIds.has(id),
      ),
    );

    // Check if any student was dropped in Return
    const droppedFromReturn = Array.from(outboundAssignedStudentIds).filter(
      (id) => !finalStudentIds.has(id),
    );

    // If any student missing return, remove them from outbound routes and recalculate
    if (droppedFromReturn.length > 0) {
      for (const r of outboundSolution.routes) {
        const initialCount = r.steps.length;
        r.steps = r.steps.filter((s) => !s.id || finalStudentIds.has(String(s.id)));
        if (r.steps.length < initialCount) {
          // Recalculate route geometry and ETAs
          const points = r.steps.map((s) => ({
            latitude: s.location[1],
            longitude: s.location[0],
          }));
          const recomputed = await this.vietmapVRPService.solveTSP(points);
          if (recomputed) {
            r.geometry = recomputed.geometry;
            r.distanceMeters = recomputed.distanceMeters;
            r.durationSeconds = recomputed.durationSeconds;
          }
        }
      }
      // Clean up empty routes
      outboundSolution.routes = outboundSolution.routes.filter(
        (r) => r.steps.some((s) => s.type === 'job' && s.id && finalStudentIds.has(String(s.id))),
      );
    }

    // Filter return routes to ensure only final students
    for (const r of returnSolution.routes) {
      const initialCount = r.steps.length;
      r.steps = r.steps.filter((s) => !s.id || finalStudentIds.has(String(s.id)));
      if (r.steps.length < initialCount) {
        const points = r.steps.map((s) => ({
          latitude: s.location[1],
          longitude: s.location[0],
        }));
        const recomputed = await this.vietmapVRPService.solveTSP(points);
        if (recomputed) {
          r.geometry = recomputed.geometry;
          r.distanceMeters = recomputed.distanceMeters;
          r.durationSeconds = recomputed.durationSeconds;
        }
      }
    }
    returnSolution.routes = returnSolution.routes.filter(
      (r) => r.steps.some((s) => s.type === 'job' && s.id && finalStudentIds.has(String(s.id))),
    );

    if (finalStudentIds.size === 0) {
      throw new BadRequestException(
        'Không tìm thấy học sinh nào có thể được phục vụ trọn vẹn cả hai chiều đi và về với các ràng buộc hiện tại.',
      );
    }

    // -------------------------------------------------------------
    // BUILD PREVIEW ROUTES WITH NORMALIZED ELAPSED TIME (RM-007)
    // -------------------------------------------------------------
    const outboundPreviewRoutes: PreviewRouteDto[] = [];
    let obIndex = 1;
    for (const r of outboundSolution.routes) {
      const v = vehicleMap.get(String(r.vehicleId));
      if (!v) continue;

      const routeStudents: { id: string; fullName: string }[] = [];
      const stops: PreviewRouteStopDto[] = [];
      let order = 1;

      const startStep = r.steps.find((s) => s.type === 'start') || r.steps[0];
      const endStep = r.steps.find((s) => s.type === 'end') || r.steps[r.steps.length - 1];

      let routeElapsedDuration = 0;
      const hasProviderArrivals =
        endStep?.arrivalSeconds !== undefined &&
        startStep?.arrivalSeconds !== undefined &&
        endStep.arrivalSeconds > startStep.arrivalSeconds;

      if (hasProviderArrivals) {
        routeElapsedDuration = endStep.arrivalSeconds! - startStep.arrivalSeconds!;
      } else {
        routeElapsedDuration =
          r.durationSeconds + r.steps.reduce((sum, st) => sum + (st.serviceSeconds || 0), 0);
      }

      const depSec = latestArrivalSeconds - routeElapsedDuration;
      const arrSec = latestArrivalSeconds;

      let runningElapsed = 0;
      for (let i = 0; i < r.steps.length; i++) {
        const s = r.steps[i];
        let stopType: RouteStopType = RouteStopType.PICKUP;
        let studentId: string | null = null;
        let studentName: string | null = null;
        let addressText = '';

        if (s.type === 'start') {
          stopType = RouteStopType.PARKING_START;
          addressText = parkingLot.addressText;
        } else if (s.type === 'end') {
          stopType = RouteStopType.SCHOOL_ARRIVAL;
          addressText = school.addressText;
        } else if (s.id && studentMap.has(String(s.id))) {
          const st = studentMap.get(String(s.id))!;
          stopType = RouteStopType.PICKUP;
          studentId = st.id;
          studentName = st.fullName;
          addressText = st.addressText || 'Điểm đón học sinh';
          routeStudents.push({ id: st.id, fullName: st.fullName });
        }

        const resolvedService = studentId
          ? this.resolveStudentServiceSeconds(
              studentId,
              RouteDirection.TO_SCHOOL,
              defaultStopServiceSeconds,
              stopServiceOverrides,
            )
          : (s.serviceSeconds || 0);

        let stopElapsed = 0;
        if (i === 0) {
          stopElapsed = 0;
          runningElapsed = 0;
        } else if (i === r.steps.length - 1) {
          stopElapsed = routeElapsedDuration;
        } else if (hasProviderArrivals && s.arrivalSeconds !== undefined) {
          stopElapsed = Math.max(0, s.arrivalSeconds - startStep.arrivalSeconds!);
        } else {
          runningElapsed += (s.durationSeconds || 0) + (s.serviceSeconds || 0);
          stopElapsed = runningElapsed;
        }

        const stopSec = depSec + stopElapsed;
        stops.push({
          stopOrder: order++,
          stopType,
          studentId,
          studentName,
          addressText,
          latitude: s.location[1],
          longitude: s.location[0],
          plannedArrivalSeconds: stopSec,
          plannedArrivalTime: this.secondsToTimeString(stopSec),
          elapsedArrivalSeconds: stopElapsed,
          serviceDurationSeconds: resolvedService,
        });
      }

      // Build derived weekly schedule for this outbound route
      const derivedWeeklySchedule: Record<string, { departureTime: string; arrivalTime: string }> = {};
      for (const [day, sched] of activeDays) {
        if (sched.start) {
          const dayStartSec = this.parseTimeToSeconds(sched.start);
          const dayDepSec = dayStartSec - routeElapsedDuration;
          derivedWeeklySchedule[day] = {
            departureTime: this.secondsToTimeString(dayDepSec),
            arrivalTime: sched.start,
          };
        }
      }

      outboundPreviewRoutes.push({
        name: `Tuyến Đi 0${obIndex++} (${v.licensePlate})`,
        direction: RouteDirection.TO_SCHOOL,
        proposedVehicleId: v.id,
        proposedVehiclePlate: v.licensePlate,
        proposedVehicleBrand: v.brand,
        seatCount: v.seatCount,
        totalDistanceMeters: r.distanceMeters,
        estimatedDurationSeconds: routeElapsedDuration,
        departureTime: this.secondsToTimeString(depSec),
        arrivalTime: this.secondsToTimeString(arrSec),
        polylineGeometry: r.geometry,
        studentCount: routeStudents.length,
        students: routeStudents,
        stops,
        derivedWeeklySchedule,
      });
    }

    const returnPreviewRoutes: PreviewRouteDto[] = [];
    let retIndex = 1;
    for (const r of returnSolution.routes) {
      const v = vehicleMap.get(String(r.vehicleId));
      if (!v) continue;

      const routeStudents: { id: string; fullName: string }[] = [];
      const stops: PreviewRouteStopDto[] = [];
      let order = 1;

      const startStep = r.steps.find((s) => s.type === 'start') || r.steps[0];
      const endStep = r.steps.find((s) => s.type === 'end') || r.steps[r.steps.length - 1];

      let routeElapsedDuration = 0;
      const hasProviderArrivals =
        endStep?.arrivalSeconds !== undefined &&
        startStep?.arrivalSeconds !== undefined &&
        endStep.arrivalSeconds > startStep.arrivalSeconds;

      if (hasProviderArrivals) {
        routeElapsedDuration = endStep.arrivalSeconds! - startStep.arrivalSeconds!;
      } else {
        routeElapsedDuration =
          r.durationSeconds + r.steps.reduce((sum, st) => sum + (st.serviceSeconds || 0), 0);
      }

      const depSec = returnDepSeconds;
      const arrSec = returnDepSeconds + routeElapsedDuration;

      let runningElapsed = 0;
      for (let i = 0; i < r.steps.length; i++) {
        const s = r.steps[i];
        let stopType: RouteStopType = RouteStopType.DROPOFF;
        let studentId: string | null = null;
        let studentName: string | null = null;
        let addressText = '';

        if (s.type === 'start') {
          stopType = RouteStopType.SCHOOL_DEPARTURE;
          addressText = school.addressText;
        } else if (s.type === 'end') {
          stopType = RouteStopType.PARKING_END;
          addressText = parkingLot.addressText;
        } else if (s.id && studentMap.has(String(s.id))) {
          const st = studentMap.get(String(s.id))!;
          stopType = RouteStopType.DROPOFF;
          studentId = st.id;
          studentName = st.fullName;
          addressText = st.addressText || 'Điểm trả học sinh';
          routeStudents.push({ id: st.id, fullName: st.fullName });
        }

        const resolvedService = studentId
          ? this.resolveStudentServiceSeconds(
              studentId,
              RouteDirection.TO_PARKING,
              defaultStopServiceSeconds,
              stopServiceOverrides,
            )
          : (s.serviceSeconds || 0);

        let stopElapsed = 0;
        if (i === 0) {
          stopElapsed = 0;
          runningElapsed = 0;
        } else if (i === r.steps.length - 1) {
          stopElapsed = routeElapsedDuration;
        } else if (hasProviderArrivals && s.arrivalSeconds !== undefined) {
          stopElapsed = Math.max(0, s.arrivalSeconds - startStep.arrivalSeconds!);
        } else {
          runningElapsed += (s.durationSeconds || 0) + (s.serviceSeconds || 0);
          stopElapsed = runningElapsed;
        }

        const stopSec = depSec + stopElapsed;
        stops.push({
          stopOrder: order++,
          stopType,
          studentId,
          studentName,
          addressText,
          latitude: s.location[1],
          longitude: s.location[0],
          plannedArrivalSeconds: stopSec,
          plannedArrivalTime: this.secondsToTimeString(stopSec),
          elapsedArrivalSeconds: stopElapsed,
          serviceDurationSeconds: resolvedService,
        });
      }

      // Build derived weekly schedule for this return route
      const derivedWeeklySchedule: Record<string, { departureTime: string; arrivalTime: string }> = {};
      for (const [day, sched] of activeDays) {
        if (sched.end) {
          const dayDepSec = this.parseTimeToSeconds(sched.end);
          const dayArrSec = dayDepSec + routeElapsedDuration;
          derivedWeeklySchedule[day] = {
            departureTime: sched.end,
            arrivalTime: this.secondsToTimeString(dayArrSec),
          };
        }
      }

      returnPreviewRoutes.push({
        name: `Tuyến Về 0${retIndex++} (${v.licensePlate})`,
        direction: RouteDirection.TO_PARKING,
        proposedVehicleId: v.id,
        proposedVehiclePlate: v.licensePlate,
        proposedVehicleBrand: v.brand,
        seatCount: v.seatCount,
        totalDistanceMeters: r.distanceMeters,
        estimatedDurationSeconds: routeElapsedDuration,
        departureTime: this.secondsToTimeString(depSec),
        arrivalTime: this.secondsToTimeString(arrSec),
        polylineGeometry: r.geometry,
        studentCount: routeStudents.length,
        students: routeStudents,
        stops,
        derivedWeeklySchedule,
      });
    }

    // Build unassigned student info with missingDirection classification (BR-02 & BR-03)
    const unassignedStudents: {
      id: string;
      fullName: string;
      reason?: string;
      missingDirection?: 'RETURN' | 'OUTBOUND' | 'BOTH';
      addressText?: string;
    }[] = [];

    for (const s of students) {
      if (!finalStudentIds.has(s.id)) {
        let missingDirection: 'RETURN' | 'OUTBOUND' | 'BOTH' = 'BOTH';
        let reason = 'Vượt quá ràng buộc thời gian hoặc sức chứa xe của toàn bộ đội xe';

        if (outboundAssignedStudentIds.has(s.id) && !returnAssignedStudentIds.has(s.id)) {
          missingDirection = 'RETURN';
          reason = 'Học sinh được xếp tuyến đi nhưng không tìm được xe phù hợp cho chiều về';
        } else if (returnAssignedStudentIds.has(s.id) && !outboundAssignedStudentIds.has(s.id)) {
          missingDirection = 'OUTBOUND';
          reason = 'Học sinh được xếp tuyến về nhưng không tìm được xe phù hợp cho chiều đi';
        }

        unassignedStudents.push({
          id: s.id,
          fullName: s.fullName,
          reason,
          missingDirection,
          addressText: s.addressText || undefined,
        });
      }
    }

    const coverageRate = Number((finalStudentIds.size / dto.studentIds.length).toFixed(3));

    // Create Preview Token & Cache Session
    const previewToken = `prev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const session: PreviewSession = {
      token: previewToken,
      createdAt: Date.now(),
      schoolId: school.id,
      schoolName: school.name,
      constraints: {
        ...dto.constraints,
        defaultStopServiceSeconds,
        maxRouteDurationMinutes,
        stopServiceOverrides,
      },
      outboundRoutes: outboundPreviewRoutes,
      returnRoutes: returnPreviewRoutes,
      summary: {
        totalSelectedStudents: dto.studentIds.length,
        assignedBothWaysCount: finalStudentIds.size,
        unassignedCount: unassignedStudents.length,
        coverageRate,
        unassignedStudents,
        excludedByAdminCount: 0,
        outboundVehiclesUsed: outboundPreviewRoutes.length,
        returnVehiclesUsed: returnPreviewRoutes.length,
      },
    };

    this.previewSessions.set(previewToken, session);

    return {
      previewToken,
      schoolId: school.id,
      schoolName: school.name,
      outboundRoutes: outboundPreviewRoutes,
      returnRoutes: returnPreviewRoutes,
      summary: session.summary,
    };
  }

  // ==========================================
  // 3. PREVIEW ADJUSTMENT: CANCEL RETURN ROUTE
  // ==========================================

  async cancelReturnRoute(
    previewToken: string,
    returnRouteIndex: number,
  ): Promise<RoutePreviewResponseDto> {
    const session = this.previewSessions.get(previewToken);
    if (!session) {
      throw new NotFoundException('Phiên xem trước (Preview) không tồn tại hoặc đã hết hạn (TTL 30m). Vui lòng tạo lại.');
    }

    if (returnRouteIndex < 0 || returnRouteIndex >= session.returnRoutes.length) {
      throw new BadRequestException('Chỉ số tuyến về không hợp lệ');
    }

    const targetReturnRoute = session.returnRoutes[returnRouteIndex];
    const removedStudentIds = new Set(targetReturnRoute.students.map((s) => s.id));

    // CHECK INVARIANT 14.4: Check if removing these students causes ANY outbound route to become empty!
    for (const obRoute of session.outboundRoutes) {
      const remainingInThisRoute = obRoute.students.filter((s) => !removedStudentIds.has(s.id));
      if (remainingInThisRoute.length === 0) {
        throw new BadRequestException(
          `Không thể hủy tuyến về này vì sẽ khiến "${obRoute.name}" không còn học sinh nào. Theo quy định nghiệp vụ, vui lòng Hủy toàn bộ phương án để lập lại.`,
        );
      }
    }

    // 1. Remove the return route
    session.returnRoutes.splice(returnRouteIndex, 1);

    // 2. Remove those students from corresponding outbound routes and recompute geometries
    for (const obRoute of session.outboundRoutes) {
      const initialCount = obRoute.students.length;
      obRoute.students = obRoute.students.filter((s) => !removedStudentIds.has(s.id));

      if (obRoute.students.length < initialCount) {
        obRoute.studentCount = obRoute.students.length;
        obRoute.stops = obRoute.stops.filter(
          (stop) => !stop.studentId || !removedStudentIds.has(stop.studentId),
        );
        // Re-index stops
        obRoute.stops.forEach((s, idx) => {
          s.stopOrder = idx + 1;
        });

        // Recalculate route points
        const points = obRoute.stops.map((s) => ({
          latitude: s.latitude,
          longitude: s.longitude,
        }));
        const recomputed = await this.vietmapVRPService.solveTSP(points);
        if (recomputed) {
          obRoute.polylineGeometry = recomputed.geometry;
          obRoute.totalDistanceMeters = recomputed.distanceMeters;

          // Recalculate total service seconds for remaining stops
          const totalServiceSeconds = obRoute.stops.reduce(
            (sum, stop) => sum + (stop.serviceDurationSeconds || 0),
            0,
          );
          const newRouteElapsed = recomputed.durationSeconds + totalServiceSeconds;
          obRoute.estimatedDurationSeconds = newRouteElapsed;

          // Recompute departure and stop arrival times
          const schoolArrSec = this.parseTimeToSeconds(obRoute.arrivalTime || '07:00');
          const newDepSec = schoolArrSec - newRouteElapsed;
          obRoute.departureTime = this.secondsToTimeString(newDepSec);

          let cumulativeElapsed = 0;
          for (let i = 0; i < obRoute.stops.length; i++) {
            const stop = obRoute.stops[i];
            if (i === 0) {
              stop.elapsedArrivalSeconds = 0;
            } else if (i === obRoute.stops.length - 1) {
              stop.elapsedArrivalSeconds = newRouteElapsed;
            } else {
              cumulativeElapsed +=
                (stop.serviceDurationSeconds || 60) +
                Math.round(recomputed.durationSeconds / Math.max(1, obRoute.stops.length - 1));
              stop.elapsedArrivalSeconds = Math.min(cumulativeElapsed, newRouteElapsed);
            }
            const stopArrivalSec = newDepSec + stop.elapsedArrivalSeconds;
            stop.plannedArrivalSeconds = stopArrivalSec;
            stop.plannedArrivalTime = this.secondsToTimeString(stopArrivalSec);
          }

          // Also update derived weekly schedule
          if (obRoute.derivedWeeklySchedule) {
            for (const [day, sched] of Object.entries(obRoute.derivedWeeklySchedule)) {
              if (sched.arrivalTime) {
                const dayArrSec = this.parseTimeToSeconds(sched.arrivalTime);
                const dayDepSec = dayArrSec - newRouteElapsed;
                sched.departureTime = this.secondsToTimeString(dayDepSec);
              }
            }
          }
        }
      }
    }

    // 3. Update summary
    session.summary.assignedBothWaysCount -= removedStudentIds.size;
    session.summary.unassignedCount += removedStudentIds.size;
    for (const s of targetReturnRoute.students) {
      session.summary.unassignedStudents.push({
        id: s.id,
        fullName: s.fullName,
        reason: 'Bị loại do hủy tuyến về tương ứng trong Preview',
      });
    }
    session.summary.returnVehiclesUsed = session.returnRoutes.length;

    return {
      previewToken,
      schoolId: session.schoolId,
      schoolName: session.schoolName,
      outboundRoutes: session.outboundRoutes,
      returnRoutes: session.returnRoutes,
      summary: session.summary,
    };
  }

  // ==========================================
  // 4. CONFIRM PREVIEW (ATOMIC COMMIT)
  // ==========================================

  async confirmPreview(
    dto: ConfirmRoutePlanDto,
    currentUser: User,
  ): Promise<RoutePlanResponseDto> {
    const session = this.previewSessions.get(dto.previewToken);
    if (!session) {
      throw new NotFoundException('Phiên xem trước (Preview) không tồn tại hoặc đã hết hiệu lực');
    }

    const { schoolId, schoolName, constraints, outboundRoutes, returnRoutes, summary } = session;

    // Revalidate Mandatory Two-Direction Invariant (BR-02)
    const outboundAssigned = new Set<string>();
    for (const r of outboundRoutes) {
      for (const st of r.students) {
        if (outboundAssigned.has(st.id)) {
          throw new BadRequestException(`Phát hiện học sinh "${st.fullName}" bị trùng lặp ở nhiều tuyến chiều đi.`);
        }
        outboundAssigned.add(st.id);
      }
    }
    const returnAssigned = new Set<string>();
    for (const r of returnRoutes) {
      for (const st of r.students) {
        if (returnAssigned.has(st.id)) {
          throw new BadRequestException(`Phát hiện học sinh "${st.fullName}" bị trùng lặp ở nhiều tuyến chiều về.`);
        }
        returnAssigned.add(st.id);
      }
    }
    if (outboundAssigned.size !== returnAssigned.size || [...outboundAssigned].some((id) => !returnAssigned.has(id))) {
      throw new BadRequestException('Vi phạm ràng buộc hai chiều (BR-02): Danh sách học sinh chiều đi và chiều về không đồng nhất.');
    }
    if (outboundAssigned.size !== summary.assignedBothWaysCount) {
      throw new BadRequestException('Vi phạm ràng buộc: Số lượng học sinh phân công không khớp với bản tóm tắt Preview.');
    }

    const planName =
      dto.planName?.trim() ||
      `Phương án tuyến ${schoolName} - ${new Date().toLocaleDateString('vi-VN')}`;

    // Execute ATOMIC TRANSACTION with Concurrency Protection (Gate 3 - BR-V01, BR-V02, BR-V03, BR-V04)
    try {
      const createdPlan = await this.prisma.$transaction(async (tx) => {
        // 1. Concurrency Re-validation: Verify no active DRAFT plan exists for this school
        const activeDraft = await tx.routePlan.findFirst({
          where: {
            schoolId,
            status: RoutePlanStatus.DRAFT,
          },
        });

        if (activeDraft) {
          throw new ConflictException(
            `Trường "${schoolName}" hiện đã có một phương án tuyến DRAFT (${activeDraft.name}). Vui lòng hủy phương án cũ trước khi tạo phương án mới.`,
          );
        }

        // 2. Vehicle Schedule Conflict Re-validation INSIDE TRANSACTION (BR-V01, BR-V02, BR-V03)
        const proposedVehicleIds = Array.from(
          new Set(
            [...outboundRoutes, ...returnRoutes]
              .map((r) => r.proposedVehicleId)
              .filter(Boolean) as string[],
          ),
        );

        const vehicleConflicts = await this.resourceAvailabilityService.findConflictingVehicles(
          proposedVehicleIds,
          schoolId,
          undefined,
          tx,
        );

        if (vehicleConflicts.size > 0) {
          const first = Array.from(vehicleConflicts.values())[0];
          throw new ConflictException(
            `Không thể xác nhận phương án: ${first.reasonMessage}`,
          );
        }

        // 3. Bất biến: Tuyệt đối không cho phép tuyến không có học sinh nào
        for (const r of outboundRoutes) {
          const studentStops = (r.stops || []).filter((s) => s.studentId);
          if (studentStops.length === 0) {
            throw new BadRequestException(
              `Tuyến chiều đi "${r.name}" không có học sinh nào. Mọi tuyến phải có ít nhất 1 học sinh.`,
            );
          }
        }
        for (const r of returnRoutes) {
          const studentStops = (r.stops || []).filter((s) => s.studentId);
          if (studentStops.length === 0) {
            throw new BadRequestException(
              `Tuyến chiều về "${r.name}" không có học sinh nào. Mọi tuyến phải có ít nhất 1 học sinh.`,
            );
          }
        }

        // 4. Create RoutePlan
        const plan = await tx.routePlan.create({
        data: {
          schoolId,
          name: planName,
          status: RoutePlanStatus.DRAFT,
          scheduleScope: {
            createdAt: new Date().toISOString(),
            constraints,
            summary,
          },
          routingConstraints: constraints,
          totalStudents: summary.assignedBothWaysCount,
          totalOutboundRoutes: outboundRoutes.length,
          totalReturnRoutes: returnRoutes.length,
          createdById: currentUser.id,
        },
      });

      // 2. Create Outbound Routes & Stops
      for (const r of outboundRoutes) {
        const createdRoute = await tx.route.create({
          data: {
            routePlanId: plan.id,
            schoolId,
            name: r.name,
            direction: RouteDirection.TO_SCHOOL,
            proposedVehicleId: r.proposedVehicleId,
            totalDistanceMeters: r.totalDistanceMeters,
            estimatedDurationSeconds: r.estimatedDurationSeconds,
            departureTime: r.departureTime,
            arrivalTime: r.arrivalTime,
            polylineGeometry: r.polylineGeometry,
          },
        });

        for (const stop of r.stops) {
          await tx.routeStop.create({
            data: {
              routeId: createdRoute.id,
              stopOrder: stop.stopOrder,
              stopType: stop.stopType,
              studentId: stop.studentId || null,
              addressText: stop.addressText,
              latitude: stop.latitude,
              longitude: stop.longitude,
              plannedArrivalSeconds: stop.plannedArrivalSeconds || null,
              plannedArrivalTime: stop.plannedArrivalTime || null,
            },
          });
        }
      }

      // 3. Create Return Routes & Stops
      for (const r of returnRoutes) {
        const createdRoute = await tx.route.create({
          data: {
            routePlanId: plan.id,
            schoolId,
            name: r.name,
            direction: RouteDirection.TO_PARKING,
            proposedVehicleId: r.proposedVehicleId,
            totalDistanceMeters: r.totalDistanceMeters,
            estimatedDurationSeconds: r.estimatedDurationSeconds,
            departureTime: r.departureTime,
            arrivalTime: r.arrivalTime,
            polylineGeometry: r.polylineGeometry,
          },
        });

        for (const stop of r.stops) {
          await tx.routeStop.create({
            data: {
              routeId: createdRoute.id,
              stopOrder: stop.stopOrder,
              stopType: stop.stopType,
              studentId: stop.studentId || null,
              addressText: stop.addressText,
              latitude: stop.latitude,
              longitude: stop.longitude,
              plannedArrivalSeconds: stop.plannedArrivalSeconds || null,
              plannedArrivalTime: stop.plannedArrivalTime || null,
            },
          });
        }
      }

      return plan;
    });

    // Remove preview session after successful commitment
    this.previewSessions.delete(dto.previewToken);
    this.logger.log(`RoutePlan confirmed successfully: ${createdPlan.id} (${createdPlan.name})`);

    return this.getRoutePlanDetail(createdPlan.id, currentUser);
  } catch (err: any) {
    if (err?.code === 'P2034') {
      throw new ConflictException(
        'Xung đột dữ liệu đồng thời: Một phương án khác vừa được xác nhận với phương tiện trùng lặp. Vui lòng kiểm tra lại.',
      );
    }
    throw err;
  }
}

  // ==========================================
  // 5. ROUTEPLAN MANAGEMENT (LIST, DETAIL, CANCEL)
  // ==========================================

  async listRoutePlans(
    query: { search?: string; schoolId?: string; status?: RoutePlanStatus; page?: number; limit?: number },
    currentUser: User,
  ): Promise<{ items: RoutePlanResponseDto[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (currentUser.role === Role.SCHOOL_ADMIN) {
      where.schoolId = currentUser.schoolId;
    } else if (query.schoolId) {
      where.schoolId = query.schoolId;
    }
    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const searchTrimmed = query.search.trim();
      if (searchTrimmed) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { name: { contains: searchTrimmed, mode: 'insensitive' } },
              { school: { name: { contains: searchTrimmed, mode: 'insensitive' } } },
            ],
          },
        ];
      }
    }

    const [plans, total] = await Promise.all([
      this.prisma.routePlan.findMany({
        where,
        include: {
          school: { select: { name: true } },
          routes: {
            select: {
              direction: true,
              stops: { select: { studentId: true } },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.routePlan.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items: plans.map((p) => {
        let totalStudents = p.totalStudents;
        let totalOutboundRoutes = p.totalOutboundRoutes;
        let totalReturnRoutes = p.totalReturnRoutes;

        if (p.routes && p.routes.length > 0) {
          if (!totalStudents) {
            const studentSet = new Set<string>();
            for (const r of p.routes) {
              for (const s of r.stops) {
                if (s.studentId) studentSet.add(s.studentId);
              }
            }
            if (studentSet.size > 0) totalStudents = studentSet.size;
          }
          if (!totalOutboundRoutes) {
            totalOutboundRoutes = p.routes.filter((r) => r.direction === RouteDirection.TO_SCHOOL).length;
          }
          if (!totalReturnRoutes) {
            totalReturnRoutes = p.routes.filter((r) => r.direction === RouteDirection.TO_PARKING).length;
          }
        }

        return {
          id: p.id,
          schoolId: p.schoolId,
          schoolName: p.school.name,
          name: p.name,
          status: p.status,
          totalStudents,
          totalOutboundRoutes,
          totalReturnRoutes,
          createdAt: p.createdAt,
          cancelledAt: p.cancelledAt,
          cancellationReason: p.cancellationReason,
        };
      }),
      total,
      page,
      totalPages,
    };
  }

  async getRoutePlanDetail(id: string, currentUser: User): Promise<RoutePlanResponseDto> {
    const plan = await this.prisma.routePlan.findUnique({
      where: { id },
      include: {
        school: { select: { name: true, weeklySchedule: true, latitude: true, longitude: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true } },
        routes: {
          include: {
            proposedVehicle: { select: { licensePlate: true, brand: true, seatCount: true } },
            defaultDriver: { select: { id: true, fullName: true, phone: true } },
            defaultBusAttendant: { select: { id: true, fullName: true, phone: true } },
            stops: {
              include: {
                student: { select: { fullName: true } },
              },
              orderBy: { stopOrder: 'asc' },
            },
          },
          orderBy: [{ direction: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Không tìm thấy phương án tuyến');
    }

    if (currentUser.role === Role.SCHOOL_ADMIN && plan.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Bạn không có quyền xem phương án tuyến của trường khác');
    }

    const constraints = (plan.routingConstraints as any) || {};
    const weeklySched = (plan.school.weeklySchedule as Record<string, { start?: string; end?: string }>) || {};

    let totalStudents = plan.totalStudents;
    let totalOutboundRoutes = plan.totalOutboundRoutes;
    let totalReturnRoutes = plan.totalReturnRoutes;

    if (plan.routes && plan.routes.length > 0) {
      if (!totalStudents) {
        const studentSet = new Set<string>();
        for (const r of plan.routes) {
          for (const s of r.stops) {
            if (s.studentId) studentSet.add(s.studentId);
          }
        }
        if (studentSet.size > 0) totalStudents = studentSet.size;
      }
      if (!totalOutboundRoutes) {
        totalOutboundRoutes = plan.routes.filter((r) => r.direction === RouteDirection.TO_SCHOOL).length;
      }
      if (!totalReturnRoutes) {
        totalReturnRoutes = plan.routes.filter((r) => r.direction === RouteDirection.TO_PARKING).length;
      }
    }

    const scheduleScope = (plan.scheduleScope as any) || {};
    const savedSummary = scheduleScope.summary;
    const coverage = savedSummary
      ? {
          totalSelected: savedSummary.totalSelectedStudents || totalStudents,
          assignedCount: savedSummary.assignedBothWaysCount || totalStudents,
          unassignedCount: savedSummary.unassignedCount || 0,
          coverageRate: typeof savedSummary.coverageRate === 'number'
            ? savedSummary.coverageRate
            : (savedSummary.totalSelectedStudents ? Number((savedSummary.assignedBothWaysCount / savedSummary.totalSelectedStudents).toFixed(3)) : 1),
        }
      : undefined;
    const unassignedStudents = savedSummary?.unassignedStudents || [];

    return {
      id: plan.id,
      schoolId: plan.schoolId,
      schoolName: plan.school.name,
      name: plan.name,
      status: plan.status,
      totalStudents,
      totalOutboundRoutes,
      totalReturnRoutes,
      createdAt: plan.createdAt,
      cancelledAt: plan.cancelledAt,
      cancellationReason: plan.cancellationReason,
      activatedAt: plan.activatedAt,
      approvedById: plan.approvedById,
      approvedByName: plan.approvedBy?.fullName || null,
      createdByName: plan.createdBy?.fullName || plan.createdBy?.email || null,
      routes: plan.routes.map((r) => {
        const routeDepSec = this.parseTimeToSeconds(r.departureTime || '07:00');
        const derivedWeeklySchedule: Record<string, { departureTime: string; arrivalTime: string }> = {};

        for (const [day, sched] of Object.entries(weeklySched)) {
          if (r.direction === RouteDirection.TO_SCHOOL && sched?.start) {
            const dayStartSec = this.parseTimeToSeconds(sched.start);
            const dayDepSec = dayStartSec - r.estimatedDurationSeconds;
            derivedWeeklySchedule[day] = {
              departureTime: this.secondsToTimeString(dayDepSec),
              arrivalTime: sched.start,
            };
          } else if (r.direction === RouteDirection.TO_PARKING && sched?.end) {
            const dayDepSec = this.parseTimeToSeconds(sched.end);
            const dayArrSec = dayDepSec + r.estimatedDurationSeconds;
            derivedWeeklySchedule[day] = {
              departureTime: sched.end,
              arrivalTime: this.secondsToTimeString(dayArrSec),
            };
          }
        }

        const parkingStop = r.stops.find(
          (s) => s.stopType === RouteStopType.PARKING_START || s.stopType === RouteStopType.PARKING_END,
        );
        const schoolStop = r.stops.find(
          (s) => s.stopType === RouteStopType.SCHOOL_ARRIVAL || s.stopType === RouteStopType.SCHOOL_DEPARTURE,
        );
        const parkingLocation = parkingStop
          ? {
              latitude: parkingStop.latitude,
              longitude: parkingStop.longitude,
              addressText: parkingStop.addressText,
            }
          : undefined;
        const schoolLocation = {
          latitude: schoolStop?.latitude ?? plan.school.latitude,
          longitude: schoolStop?.longitude ?? plan.school.longitude,
          name: plan.school.name,
        };

        return {
          id: r.id,
          routePlanId: r.routePlanId,
          routePlanName: plan.name,
          schoolId: r.schoolId,
          schoolName: plan.school.name,
          name: r.name,
          direction: r.direction,
          proposedVehicleId: r.proposedVehicleId,
          proposedVehiclePlate: r.proposedVehicle?.licensePlate || null,
          proposedVehicleBrand: r.proposedVehicle?.brand || null,
          proposedVehicleSeats: r.proposedVehicle?.seatCount || null,
          defaultDriverId: r.defaultDriverId,
          defaultDriverName: r.defaultDriver?.fullName || null,
          defaultDriverPhone: r.defaultDriver?.phone || null,
          defaultBusAttendantId: r.defaultBusAttendantId,
          defaultBusAttendantName: r.defaultBusAttendant?.fullName || null,
          defaultBusAttendantPhone: r.defaultBusAttendant?.phone || null,
          totalDistanceMeters: r.totalDistanceMeters,
          estimatedDurationSeconds: r.estimatedDurationSeconds,
          departureTime: r.departureTime,
          arrivalTime: r.arrivalTime,
          polylineGeometry: r.polylineGeometry,
          status: plan.status,
          planStatus: plan.status,
          studentCount: r.stops.filter((s) => s.studentId).length,
          derivedWeeklySchedule,
          parkingLocation,
          schoolLocation,
          stops: r.stops.map((s) => {
            const elapsedArrivalSeconds = s.plannedArrivalSeconds
              ? Math.max(0, s.plannedArrivalSeconds - routeDepSec)
              : 0;
            const serviceDurationSeconds = s.studentId
              ? this.resolveStudentServiceSeconds(
                  s.studentId,
                  r.direction,
                  constraints.defaultStopServiceSeconds || 60,
                  constraints.stopServiceOverrides,
                )
              : 0;

            return {
              id: s.id,
              stopOrder: s.stopOrder,
              stopType: s.stopType,
              studentId: s.studentId,
              studentName: s.student?.fullName || null,
              addressText: s.addressText,
              latitude: s.latitude,
              longitude: s.longitude,
              plannedArrivalSeconds: s.plannedArrivalSeconds,
              plannedArrivalTime: s.plannedArrivalTime,
              elapsedArrivalSeconds,
              serviceDurationSeconds,
            };
          }),
        };
      }),
      coverage,
      unassignedStudents,
    };
  }

  /**
   * Đánh giá tác động trước khi hủy phương án tuyến (DRAFT hoặc ACTIVE)
   */
  async getCancellationImpact(id: string, currentUser: User): Promise<RoutePlanCancellationImpactDto> {
    const plan = await this.prisma.routePlan.findUnique({
      where: { id },
      include: {
        school: { select: { id: true, name: true } },
        routes: {
          include: {
            proposedVehicle: { select: { id: true } },
            defaultDriver: { select: { id: true } },
            defaultBusAttendant: { select: { id: true } },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Không tìm thấy phương án tuyến');
    }

    if (currentUser.role === Role.SCHOOL_ADMIN && plan.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Bạn chỉ có quyền xem phương án của trường mình');
    }

    const routeIds = plan.routes.map((r) => r.id);
    let scheduledTripsCount = 0;
    let inProgressTripsCount = 0;
    let completedTripsCount = 0;

    if (routeIds.length > 0) {
      scheduledTripsCount = await this.prisma.trip.count({
        where: {
          routeId: { in: routeIds },
          status: TripStatus.SCHEDULED,
        },
      });
      inProgressTripsCount = await this.prisma.trip.count({
        where: {
          routeId: { in: routeIds },
          status: TripStatus.IN_PROGRESS,
        },
      });
      completedTripsCount = await this.prisma.trip.count({
        where: {
          routeId: { in: routeIds },
          status: TripStatus.COMPLETED,
        },
      });
    }

    const assignedVehicles = new Set(plan.routes.map((r) => r.proposedVehicleId).filter(Boolean));
    const assignedDrivers = new Set(plan.routes.map((r) => r.defaultDriverId).filter(Boolean));
    const assignedBusAttendants = new Set(plan.routes.map((r) => r.defaultBusAttendantId).filter(Boolean));

    const expectedFingerprint = createHash('sha256')
      .update(
        JSON.stringify([
          plan.id,
          plan.updatedAt.toISOString(),
          plan.status,
          scheduledTripsCount,
          inProgressTripsCount,
        ]),
      )
      .digest('hex');

    return {
      planId: plan.id,
      planName: plan.name,
      status: plan.status,
      schoolId: plan.school.id,
      schoolName: plan.school.name,
      scheduledTripsCount,
      inProgressTripsCount,
      completedTripsCount,
      routesCount: plan.routes.length,
      assignedVehiclesCount: assignedVehicles.size,
      assignedDriversCount: assignedDrivers.size,
      assignedBusAttendantsCount: assignedBusAttendants.size,
      expectedFingerprint,
    };
  }

  /**
   * Hủy toàn bộ phương án tuyến RoutePlan (DRAFT hoặc ACTIVE)
   * - SYSTEM_ADMIN có quyền hủy toàn hệ thống
   * - SCHOOL_ADMIN có quyền hủy phương án thuộc trường mình
   * - Cascade hủy tất cả các chuyến xe SCHEDULED liên quan và đóng pending staff leave notices
   * - Giữ nguyên các chuyến xe IN_PROGRESS và COMPLETED trong lịch sử
   */
  async cancelRoutePlan(
    id: string,
    reason: string,
    currentUser: User,
    expectedFingerprint?: string,
  ): Promise<{ message: string; cancelledTripsCount?: number }> {
    const plan = await this.prisma.routePlan.findUnique({
      where: { id },
      include: {
        routes: { select: { id: true } },
      },
    });

    if (!plan) {
      throw new NotFoundException('Không tìm thấy phương án tuyến');
    }

    if (currentUser.role === Role.SCHOOL_ADMIN) {
      if (plan.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException('Bạn chỉ có quyền hủy phương án tuyến thuộc trường học của mình');
      }
    } else if (currentUser.role !== Role.SYSTEM_ADMIN) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    if (plan.status === RoutePlanStatus.CANCELLED) {
      throw new BadRequestException('Phương án tuyến này đã được hủy trước đó');
    }

    if (plan.status === RoutePlanStatus.EXPIRED) {
      throw new BadRequestException('Phương án tuyến này đã hết hạn hợp đồng');
    }

    const routeIds = (plan.routes || []).map((r) => r.id);
    let cancelledTripsCount = 0;

    await this.prisma.$transaction(async (tx) => {
      // 1. Cascade hủy các chuyến xe SCHEDULED liên quan
      if (routeIds.length > 0) {
        const scheduledTrips = await tx.trip.findMany({
          where: {
            routeId: { in: routeIds },
            status: TripStatus.SCHEDULED,
          },
          select: { id: true },
        });

        cancelledTripsCount = scheduledTrips.length;
        const scheduledTripIds = scheduledTrips.map((t) => t.id);

        if (scheduledTripIds.length > 0) {
          await tx.trip.updateMany({
            where: { id: { in: scheduledTripIds } },
            data: {
              status: TripStatus.CANCELLED,
              cancellationReason: reason,
              cancelledAt: new Date(),
              cancelledById: currentUser.id,
            },
          });

          await tx.leaveNotice.updateMany({
            where: {
              tripId: { in: scheduledTripIds },
              status: LeaveNoticeStatus.PENDING_REPLACEMENT,
            },
            data: {
              status: LeaveNoticeStatus.TRIP_CANCELLED,
              processedAt: new Date(),
              processedById: currentUser.id,
            },
          });
        }
      }

      // 2. Chuyển trạng thái RoutePlan sang CANCELLED
      await tx.routePlan.update({
        where: { id },
        data: {
          status: RoutePlanStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledById: currentUser.id,
          cancellationReason: reason,
        },
      });
    });

    this.logger.log(`RoutePlan cancelled: ${id} by user ${currentUser.id}. Reason: ${reason}. Cancelled ${cancelledTripsCount} scheduled trips.`);
    return {
      message: `Hủy phương án tuyến thành công. Đã hủy ${cancelledTripsCount} chuyến xe đã lập lịch và giải phóng tài nguyên.`,
      cancelledTripsCount,
    };
  }

  /**
   * Đối soát và cập nhật các phương án hết hạn hợp đồng
   */
  async reconcileExpiredContracts(): Promise<{ expiredPlansCount: number; cancelledTripsCount: number }> {
    const todayVn = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const expiredSchools = await this.prisma.school.findMany({
      where: {
        contractEndDate: { lt: new Date(`${todayVn}T00:00:00.000Z`) },
      },
      select: { id: true },
    });

    if (expiredSchools.length === 0) {
      return { expiredPlansCount: 0, cancelledTripsCount: 0 };
    }

    const schoolIds = expiredSchools.map((s) => s.id);
    const plansToExpire = await this.prisma.routePlan.findMany({
      where: {
        schoolId: { in: schoolIds },
        status: { in: [RoutePlanStatus.DRAFT, RoutePlanStatus.ACTIVE] },
      },
      include: {
        routes: { select: { id: true } },
      },
    });

    if (plansToExpire.length === 0) {
      return { expiredPlansCount: 0, cancelledTripsCount: 0 };
    }

    const planIds = plansToExpire.map((p) => p.id);
    const routeIds = plansToExpire.flatMap((p) => p.routes.map((r) => r.id));
    let cancelledTripsCount = 0;

    await this.prisma.$transaction(async (tx) => {
      if (routeIds.length > 0) {
        const scheduledTrips = await tx.trip.findMany({
          where: {
            routeId: { in: routeIds },
            status: TripStatus.SCHEDULED,
          },
          select: { id: true },
        });

        cancelledTripsCount = scheduledTrips.length;
        const tripIds = scheduledTrips.map((t) => t.id);

        if (tripIds.length > 0) {
          await tx.trip.updateMany({
            where: { id: { in: tripIds } },
            data: {
              status: TripStatus.CANCELLED,
              cancellationReason: 'Hợp đồng trường học đã hết hạn',
              cancelledAt: new Date(),
            },
          });

          await tx.leaveNotice.updateMany({
            where: {
              tripId: { in: tripIds },
              status: LeaveNoticeStatus.PENDING_REPLACEMENT,
            },
            data: {
              status: LeaveNoticeStatus.TRIP_CANCELLED,
              processedAt: new Date(),
            },
          });
        }
      }

      await tx.routePlan.updateMany({
        where: { id: { in: planIds } },
        data: {
          status: RoutePlanStatus.EXPIRED,
          updatedAt: new Date(),
        },
      });
    });

    this.logger.log(`Reconciled expired contracts: ${planIds.length} plans expired, ${cancelledTripsCount} scheduled trips cancelled.`);
    return { expiredPlansCount: planIds.length, cancelledTripsCount };
  }

  /**
   * Lấy danh sách các cặp tuyến khả dụng để thêm học sinh vào phương án có sẵn (Chỉ SYSTEM_ADMIN)
   */
  async getInsertionOptions(studentId: string, currentUser: User): Promise<StudentInsertionOptionsResponseDto> {
    if (currentUser.role !== Role.SYSTEM_ADMIN) {
      throw new ForbiddenException('Chỉ Quản trị viên hệ thống (SYSTEM_ADMIN) mới có quyền thực hiện thao tác này');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Không tìm thấy học sinh');
    }

    if (student.status !== StudentStatus.AVAILABLE) {
      throw new BadRequestException('Học sinh đang bị vô hiệu hóa (DISABLED)');
    }

    if (student.latitude == null || student.longitude == null) {
      throw new BadRequestException('Học sinh chưa có tọa độ địa chỉ đón trả hợp lệ');
    }

    // Kiểm tra học sinh đã thuộc bất kỳ Route nào của RoutePlan DRAFT hoặc ACTIVE chưa
    const existingActiveStop = await this.prisma.routeStop.findFirst({
      where: {
        studentId,
        route: {
          routePlan: {
            status: { in: [RoutePlanStatus.DRAFT, RoutePlanStatus.ACTIVE] },
          },
        },
      },
    });

    if (existingActiveStop) {
      return {
        studentId: student.id,
        studentName: student.fullName,
        addressText: student.addressText || '',
        latitude: student.latitude,
        longitude: student.longitude,
        student: {
          id: student.id,
          fullName: student.fullName,
          addressText: student.addressText || '',
          latitude: student.latitude,
          longitude: student.longitude,
        },
        hasActiveMembership: true,
        candidatePairs: [],
        pairs: [],
      };
    }

    // Tìm các phương án DRAFT hoặc ACTIVE của trường này
    const plans = await this.prisma.routePlan.findMany({
      where: {
        schoolId: student.schoolId,
        status: { in: [RoutePlanStatus.DRAFT, RoutePlanStatus.ACTIVE] },
      },
      include: {
        routes: {
          include: {
            proposedVehicle: { select: { id: true, licensePlate: true, seatCount: true } },
            stops: { select: { studentId: true } },
          },
        },
      },
    });

    const pairs: RoutePairOptionDto[] = [];

    for (const plan of plans) {
      const planConstraints = (plan.routingConstraints as any) || {};
      const outboundRoutes = plan.routes.filter((r) => r.direction === RouteDirection.TO_SCHOOL);
      const returnRoutes = plan.routes.filter((r) => r.direction === RouteDirection.TO_PARKING);

      for (const ob of outboundRoutes) {
        const obStudents = ob.stops.filter((s) => Boolean(s.studentId)).length;
        const obSeats = ob.proposedVehicle?.seatCount || 0;
        const obAvail = Math.max(0, obSeats - obStudents);
        const obRouteConstraints = (ob.routingConstraints as any) || planConstraints;
        const obMaxDur = Number(obRouteConstraints.maxRouteDurationMinutes ?? planConstraints.maxRouteDurationMinutes ?? 90);
        const obStopSec = Number(obRouteConstraints.defaultStopServiceSeconds ?? planConstraints.defaultStopServiceSeconds ?? 60);

        for (const ret of returnRoutes) {
          const retStudents = ret.stops.filter((s) => Boolean(s.studentId)).length;
          const retSeats = ret.proposedVehicle?.seatCount || 0;
          const retAvail = Math.max(0, retSeats - retStudents);
          const retRouteConstraints = (ret.routingConstraints as any) || planConstraints;
          const retMaxDur = Number(retRouteConstraints.maxRouteDurationMinutes ?? planConstraints.maxRouteDurationMinutes ?? 90);
          const retStopSec = Number(retRouteConstraints.defaultStopServiceSeconds ?? planConstraints.defaultStopServiceSeconds ?? 60);

          pairs.push({
            planId: plan.id,
            planName: plan.name,
            planStatus: plan.status,
            defaultMaxRouteDurationMinutes: obMaxDur,
            defaultStopServiceSeconds: obStopSec,
            outboundRoute: {
              id: ob.id,
              name: ob.name,
              direction: RouteDirection.TO_SCHOOL,
              vehiclePlate: ob.proposedVehicle?.licensePlate || 'Chưa gán',
              seatCount: obSeats,
              vehicleCapacity: obSeats,
              currentStudents: obStudents,
              currentStudentsCount: obStudents,
              availableSeats: obAvail,
              maxRouteDurationMinutes: obMaxDur,
              defaultStopServiceSeconds: obStopSec,
            },
            returnRoute: {
              id: ret.id,
              name: ret.name,
              direction: RouteDirection.TO_PARKING,
              vehiclePlate: ret.proposedVehicle?.licensePlate || 'Chưa gán',
              seatCount: retSeats,
              vehicleCapacity: retSeats,
              currentStudents: retStudents,
              currentStudentsCount: retStudents,
              availableSeats: retAvail,
              maxRouteDurationMinutes: retMaxDur,
              defaultStopServiceSeconds: retStopSec,
            },
          });
        }
      }
    }

    return {
      studentId: student.id,
      studentName: student.fullName,
      addressText: student.addressText || '',
      latitude: student.latitude,
      longitude: student.longitude,
      student: {
        id: student.id,
        fullName: student.fullName,
        addressText: student.addressText || '',
        latitude: student.latitude,
        longitude: student.longitude,
      },
      hasActiveMembership: false,
      candidatePairs: pairs,
      pairs,
    };
  }

  /**
   * Kiểm tra tính hợp lệ của cấu trúc điểm dừng hiện có trên tuyến trước khi chèn thêm.
   * Chặn hoàn toàn việc chèn thêm nếu tuyến đã bị sai cấu trúc endpoints hoặc trùng stopOrder.
   */
  private validateExistingRouteStops(
    stops: { id: string; stopOrder: number; stopType: RouteStopType; studentId?: string | null }[],
    direction: RouteDirection,
    routeName: string,
    routeId: string,
  ): void {
    if (stops.length < 2) {
      throw new BadRequestException(
        `Tuyến ${routeName} (${routeId}) không có đủ điểm dừng tối thiểu (hiện có ${stops.length} điểm).`,
      );
    }
    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];

    if (direction === RouteDirection.TO_SCHOOL) {
      if (firstStop.stopType !== RouteStopType.PARKING_START || lastStop.stopType !== RouteStopType.SCHOOL_ARRIVAL) {
        throw new BadRequestException(
          `Tuyến đi ${routeName} (${routeId}) có cấu trúc điểm dừng hiện tại không hợp lệ (điểm đầu phải là Bãi xe, điểm cuối phải là Trường học). Tuyến này đã bị ghi sai trước đó, vui lòng liên hệ quản trị viên để xử lý dữ liệu trước khi thêm học sinh mới.`,
        );
      }
    } else {
      if (firstStop.stopType !== RouteStopType.SCHOOL_DEPARTURE || lastStop.stopType !== RouteStopType.PARKING_END) {
        throw new BadRequestException(
          `Tuyến về ${routeName} (${routeId}) có cấu trúc điểm dừng hiện tại không hợp lệ (điểm đầu phải là Trường học, điểm cuối phải là Bãi xe). Tuyến này đã bị ghi sai trước đó, vui lòng liên hệ quản trị viên để xử lý dữ liệu trước khi thêm học sinh mới.`,
        );
      }
    }

    const orders = stops.map((s) => s.stopOrder);
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      throw new BadRequestException(
        `Tuyến ${routeName} (${routeId}) có thứ tự điểm dừng bị trùng lặp. Vui lòng liên hệ quản trị viên để xử lý dữ liệu trước khi thêm học sinh mới.`,
      );
    }
  }

  /**
   * Đánh giá và định tuyến chi tiết khi chèn một học sinh vào một chiều tuyến.
   * Dựng mảng canonicalStops duy nhất, tìm vị trí chèn giữa 2 endpoints, tính thời gian tích lũy từng chặng và service seconds.
   */
  private async evaluateRouteInsertion(params: {
    route: any;
    student: {
      id: string;
      fullName: string;
      addressText?: string | null;
      latitude: number;
      longitude: number;
    };
    direction: RouteDirection;
    maxRouteDurationMinutes: number;
    defaultStopServiceSeconds: number;
    stopServiceOverrides: any[];
    weeklySchedule: Record<string, { start?: string; end?: string }>;
  }): Promise<{
    status: 'FEASIBLE' | 'INFEASIBLE' | 'UNAVAILABLE';
    reason?: string;
    canonicalStops: {
      existingStopId?: string;
      stopOrder: number;
      stopType: RouteStopType;
      studentId?: string | null;
      studentName?: string | null;
      addressText: string;
      latitude: number;
      longitude: number;
      serviceSeconds: number;
      plannedArrivalSeconds: number;
      plannedArrivalTime: string;
      isNew: boolean;
    }[];
    totalDistanceMeters: number;
    estimatedDurationSeconds: number;
    polylineGeometry: string;
    departureTime: string;
    arrivalTime: string;
    derivedWeeklySchedule: Record<string, { departureTime: string; arrivalTime: string }>;
    studentStopOrder: number;
    studentPlannedArrivalTime: string;
  }> {
    const {
      route,
      student,
      direction,
      maxRouteDurationMinutes,
      defaultStopServiceSeconds,
      stopServiceOverrides,
      weeklySchedule,
    } = params;

    const existingStops = route.stops || [];
    this.validateExistingRouteStops(existingStops, direction, route.name, route.id);

    // Kiểm tra sức chứa xe
    const currentStudentCount = existingStops.filter((s: any) => Boolean(s.studentId)).length;
    const vehicle = route.proposedVehicle || route.vehicle;
    const seatCount = vehicle?.seatCount || 0;
    const isCapacityOk = seatCount > 0 ? currentStudentCount + 1 <= seatCount : true;

    // Tìm vị trí chèn tốt nhất giữa endpoints (chỉ chèn từ index 1 đến M - 1)
    const M = existingStops.length;
    const studentPoint = { latitude: student.latitude, longitude: student.longitude };
    let bestIndex = 1;
    let minDetour = Infinity;

    for (let i = 1; i <= M - 1; i++) {
      const prev = existingStops[i - 1];
      const next = existingStops[i];
      const curDist = metresBetween(prev, next);
      const newDist = metresBetween(prev, studentPoint) + metresBetween(studentPoint, next);
      const detour = newDist - curDist;
      if (detour < minDetour) {
        minDetour = detour;
        bestIndex = i;
      }
    }

    // Dựng mảng canonicalStops duy nhất với stopOrder tuần tự 1..N
    const canonicalStops: {
      existingStopId?: string;
      stopOrder: number;
      stopType: RouteStopType;
      studentId?: string | null;
      studentName?: string | null;
      addressText: string;
      latitude: number;
      longitude: number;
      serviceSeconds: number;
      plannedArrivalSeconds: number;
      plannedArrivalTime: string;
      isNew: boolean;
    }[] = [];

    const newStudentServiceSec = this.resolveStudentServiceSeconds(
      student.id,
      direction,
      defaultStopServiceSeconds,
      stopServiceOverrides,
    );

    for (let i = 0; i < M; i++) {
      if (i === bestIndex) {
        canonicalStops.push({
          stopOrder: canonicalStops.length + 1,
          stopType: direction === RouteDirection.TO_SCHOOL ? RouteStopType.PICKUP : RouteStopType.DROPOFF,
          studentId: student.id,
          studentName: student.fullName,
          addressText:
            student.addressText || (direction === RouteDirection.TO_SCHOOL ? 'Điểm đón học sinh' : 'Điểm trả học sinh'),
          latitude: student.latitude,
          longitude: student.longitude,
          serviceSeconds: newStudentServiceSec,
          plannedArrivalSeconds: 0,
          plannedArrivalTime: '',
          isNew: true,
        });
      }

      const st = existingStops[i];
      const isEndpoint =
        st.stopType === RouteStopType.PARKING_START ||
        st.stopType === RouteStopType.PARKING_END ||
        st.stopType === RouteStopType.SCHOOL_ARRIVAL ||
        st.stopType === RouteStopType.SCHOOL_DEPARTURE;
      const sSec = isEndpoint
        ? 0
        : st.studentId
        ? this.resolveStudentServiceSeconds(st.studentId, direction, defaultStopServiceSeconds, stopServiceOverrides)
        : 0;

      canonicalStops.push({
        existingStopId: st.id,
        stopOrder: canonicalStops.length + 1,
        stopType: st.stopType,
        studentId: st.studentId,
        studentName: st.student?.fullName || null,
        addressText: st.addressText,
        latitude: st.latitude,
        longitude: st.longitude,
        serviceSeconds: sSec,
        plannedArrivalSeconds: 0,
        plannedArrivalTime: '',
        isNew: false,
      });
    }

    const N = canonicalStops.length;

    // Gọi solver VietMap Route v4 với các điểm của mảng canonicalStops
    const points = canonicalStops.map((s) => ({ latitude: s.latitude, longitude: s.longitude }));
    const calcResult = await this.vietmapVRPService.calculateRoute(points);

    if (calcResult.status === 'UNAVAILABLE') {
      return {
        status: 'UNAVAILABLE',
        reason: calcResult.reason,
        canonicalStops,
        totalDistanceMeters: route.totalDistanceMeters,
        estimatedDurationSeconds: route.estimatedDurationSeconds,
        polylineGeometry: route.polylineGeometry,
        departureTime: route.departureTime || '',
        arrivalTime: route.arrivalTime || '',
        derivedWeeklySchedule: {},
        studentStopOrder: bestIndex + 1,
        studentPlannedArrivalTime: '',
      };
    }

    // Tính tổng thời gian: driving + service
    const totalServiceSec = canonicalStops.slice(1, N - 1).reduce((sum, s) => sum + s.serviceSeconds, 0);
    const totalElapsedSec = calcResult.durationSeconds + totalServiceSec;

    let status: 'FEASIBLE' | 'INFEASIBLE' | 'UNAVAILABLE' = 'FEASIBLE';
    let reason: string | undefined;

    if (!isCapacityOk) {
      status = 'INFEASIBLE';
      const vehiclePlate = vehicle?.licensePlate ? ` ${vehicle.licensePlate}` : '';
      reason = `Xe${vehiclePlate} không đủ sức chứa (Sức chứa: ${seatCount}, Hiện tại: ${currentStudentCount}, Cần: ${currentStudentCount + 1})`;
    } else if (totalElapsedSec > maxRouteDurationMinutes * 60) {
      status = 'INFEASIBLE';
      reason = `Thời gian tuyến (${Math.round(totalElapsedSec / 60)} phút) vượt quá giới hạn tối đa (${maxRouteDurationMinutes} phút)`;
    }

    // Tính toán ETA cho toàn bộ các điểm dừng (đảm bảo không giảm theo stopOrder)
    let departureTime = '';
    let arrivalTime = '';
    const derivedWeeklySchedule: Record<string, { departureTime: string; arrivalTime: string }> = {};

    if (direction === RouteDirection.TO_SCHOOL) {
      const anchorArrSec = this.parseTimeToSeconds(route.arrivalTime || '07:15');
      const depSec = anchorArrSec - totalElapsedSec;

      canonicalStops[0].plannedArrivalSeconds = depSec;
      canonicalStops[0].plannedArrivalTime = this.secondsToTimeString(depSec);

      let runningSec = depSec;
      for (let i = 1; i < N; i++) {
        const legDur = calcResult.legs[i - 1]?.durationSeconds ?? 0;
        const prevService = canonicalStops[i - 1].serviceSeconds;
        runningSec += prevService + legDur;
        canonicalStops[i].plannedArrivalSeconds = runningSec;
        canonicalStops[i].plannedArrivalTime = this.secondsToTimeString(runningSec);
      }

      departureTime = this.secondsToTimeString(depSec);
      arrivalTime = this.secondsToTimeString(anchorArrSec);

      for (const [day, sched] of Object.entries(weeklySchedule)) {
        if (sched?.start) {
          const dayArr = this.parseTimeToSeconds(sched.start);
          const dayDep = dayArr - totalElapsedSec;
          derivedWeeklySchedule[day] = {
            departureTime: this.secondsToTimeString(dayDep),
            arrivalTime: sched.start,
          };
        }
      }
    } else {
      const anchorDepSec = this.parseTimeToSeconds(route.departureTime || '16:30');

      canonicalStops[0].plannedArrivalSeconds = anchorDepSec;
      canonicalStops[0].plannedArrivalTime = this.secondsToTimeString(anchorDepSec);

      let runningSec = anchorDepSec;
      for (let i = 1; i < N; i++) {
        const legDur = calcResult.legs[i - 1]?.durationSeconds ?? 0;
        const prevService = canonicalStops[i - 1].serviceSeconds;
        runningSec += prevService + legDur;
        canonicalStops[i].plannedArrivalSeconds = runningSec;
        canonicalStops[i].plannedArrivalTime = this.secondsToTimeString(runningSec);
      }

      departureTime = this.secondsToTimeString(anchorDepSec);
      arrivalTime = this.secondsToTimeString(anchorDepSec + totalElapsedSec);

      for (const [day, sched] of Object.entries(weeklySchedule)) {
        if (sched?.end) {
          const dayDep = this.parseTimeToSeconds(sched.end);
          const dayArr = dayDep + totalElapsedSec;
          derivedWeeklySchedule[day] = {
            departureTime: sched.end,
            arrivalTime: this.secondsToTimeString(dayArr),
          };
        }
      }
    }

    const studentStop = canonicalStops.find((s) => s.studentId === student.id)!;

    return {
      status,
      reason,
      canonicalStops,
      totalDistanceMeters: calcResult.distanceMeters,
      estimatedDurationSeconds: totalElapsedSec,
      polylineGeometry: calcResult.geometry,
      departureTime,
      arrivalTime,
      derivedWeeklySchedule,
      studentStopOrder: studentStop.stopOrder,
      studentPlannedArrivalTime: studentStop.plannedArrivalTime,
    };
  }

  /**
   * Kiểm tra khả thi (Preview) khi thêm học sinh vào cặp tuyến (Chỉ SYSTEM_ADMIN)
   * Sử dụng routing solver thực tế và hai tiêu chí tối ưu (Thời gian tối đa tuyến & Thời gian dừng tại điểm)
   */
  async previewStudentInsertion(
    dto: PreviewStudentInsertionDto,
    currentUser: User,
  ): Promise<PreviewStudentInsertionResponseDto> {
    if (currentUser.role !== Role.SYSTEM_ADMIN) {
      throw new ForbiddenException('Chỉ Quản trị viên hệ thống (SYSTEM_ADMIN) mới có quyền kiểm tra thêm học sinh');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student || student.latitude == null || student.longitude == null) {
      throw new BadRequestException('Học sinh không tồn tại hoặc chưa có tọa độ');
    }

    const [outboundRoute, returnRoute] = await Promise.all([
      this.prisma.route.findUnique({
        where: { id: dto.outboundRouteId },
        include: {
          routePlan: true,
          proposedVehicle: true,
          school: true,
          stops: {
            orderBy: { stopOrder: 'asc' },
            include: { student: { select: { fullName: true } } },
          },
        },
      }),
      this.prisma.route.findUnique({
        where: { id: dto.returnRouteId },
        include: {
          routePlan: true,
          proposedVehicle: true,
          school: true,
          stops: {
            orderBy: { stopOrder: 'asc' },
            include: { student: { select: { fullName: true } } },
          },
        },
      }),
    ]);

    if (!outboundRoute || !returnRoute) {
      throw new NotFoundException('Không tìm thấy một trong hai tuyến xe được chọn');
    }

    if (outboundRoute.routePlanId !== returnRoute.routePlanId) {
      throw new BadRequestException('Hai tuyến được chọn bắt buộc phải thuộc cùng một phương án tuyến (RoutePlan)');
    }

    if (
      outboundRoute.routePlan.status !== RoutePlanStatus.DRAFT &&
      outboundRoute.routePlan.status !== RoutePlanStatus.ACTIVE
    ) {
      throw new BadRequestException('Phương án tuyến này đã bị hủy hoặc hết hạn');
    }

    if (outboundRoute.direction !== RouteDirection.TO_SCHOOL) {
      throw new BadRequestException('Tuyến chiều đi phải có hướng TO_SCHOOL');
    }

    if (returnRoute.direction !== RouteDirection.TO_PARKING) {
      throw new BadRequestException('Tuyến chiều về phải có hướng TO_PARKING');
    }

    // Tiêu chí tối ưu: Ưu tiên tham số truyền vào -> Route constraints -> RoutePlan constraints -> Defaults (90m, 60s)
    const obPlanConstraints = (outboundRoute.routePlan.routingConstraints as any) || {};
    const obRouteConstraints = (outboundRoute.routingConstraints as any) || {};
    const obMaxDurationMinutes = Math.max(
      10,
      Number(
        dto.routingConstraints?.maxRouteDurationMinutes ??
          obRouteConstraints.maxRouteDurationMinutes ??
          obPlanConstraints.maxRouteDurationMinutes ??
          90,
      ),
    );
    const obDefaultStopServiceSeconds = Math.max(
      10,
      Math.min(
        300,
        Number(
          dto.routingConstraints?.defaultStopServiceSeconds ??
            obRouteConstraints.defaultStopServiceSeconds ??
            obPlanConstraints.defaultStopServiceSeconds ??
            60,
        ),
      ),
    );
    const obStopOverrides =
      dto.routingConstraints?.stopServiceOverrides ??
      obRouteConstraints.stopServiceOverrides ??
      obPlanConstraints.stopServiceOverrides ??
      [];

    const retPlanConstraints = (returnRoute.routePlan.routingConstraints as any) || {};
    const retRouteConstraints = (returnRoute.routingConstraints as any) || {};
    const retMaxDurationMinutes = Math.max(
      10,
      Number(
        dto.routingConstraints?.maxRouteDurationMinutes ??
          retRouteConstraints.maxRouteDurationMinutes ??
          retPlanConstraints.maxRouteDurationMinutes ??
          90,
      ),
    );
    const retDefaultStopServiceSeconds = Math.max(
      10,
      Math.min(
        300,
        Number(
          dto.routingConstraints?.defaultStopServiceSeconds ??
            retRouteConstraints.defaultStopServiceSeconds ??
            retPlanConstraints.defaultStopServiceSeconds ??
            60,
        ),
      ),
    );
    const retStopOverrides =
      dto.routingConstraints?.stopServiceOverrides ??
      retRouteConstraints.stopServiceOverrides ??
      retPlanConstraints.stopServiceOverrides ??
      [];

    const weeklySchedule = (outboundRoute.school.weeklySchedule as Record<string, { start?: string; end?: string }>) || {};

    // Đánh giá định tuyến chiều đi (TO_SCHOOL)
    const obEval = await this.evaluateRouteInsertion({
      route: outboundRoute,
      student: {
        id: student.id,
        fullName: student.fullName,
        addressText: student.addressText,
        latitude: student.latitude,
        longitude: student.longitude,
      },
      direction: RouteDirection.TO_SCHOOL,
      maxRouteDurationMinutes: obMaxDurationMinutes,
      defaultStopServiceSeconds: obDefaultStopServiceSeconds,
      stopServiceOverrides: obStopOverrides,
      weeklySchedule,
    });

    // Đánh giá định tuyến chiều về (TO_PARKING)
    const retEval = await this.evaluateRouteInsertion({
      route: returnRoute,
      student: {
        id: student.id,
        fullName: student.fullName,
        addressText: student.addressText,
        latitude: student.latitude,
        longitude: student.longitude,
      },
      direction: RouteDirection.TO_PARKING,
      maxRouteDurationMinutes: retMaxDurationMinutes,
      defaultStopServiceSeconds: retDefaultStopServiceSeconds,
      stopServiceOverrides: retStopOverrides,
      weeklySchedule,
    });

    const allFeasible = obEval.status === 'FEASIBLE' && retEval.status === 'FEASIBLE';
    const unavailabilityReason =
      obEval.status === 'UNAVAILABLE'
        ? obEval.reason
        : retEval.status === 'UNAVAILABLE'
        ? retEval.reason
        : undefined;

    let previewToken: string | null = null;
    const expectedFingerprint = createHash('sha256')
      .update(
        JSON.stringify([
          student.id,
          outboundRoute.id,
          returnRoute.id,
          outboundRoute.updatedAt ? new Date(outboundRoute.updatedAt).toISOString() : '',
          returnRoute.updatedAt ? new Date(returnRoute.updatedAt).toISOString() : '',
          outboundRoute.stops.length,
          returnRoute.stops.length,
          obMaxDurationMinutes,
          obDefaultStopServiceSeconds,
          retMaxDurationMinutes,
          retDefaultStopServiceSeconds,
        ]),
      )
      .digest('hex');

    if (allFeasible) {
      previewToken = `ins_${randomUUID()}`;
      this.insertionSessions.set(previewToken, {
        previewToken,
        studentId: student.id,
        studentName: student.fullName,
        studentAddress: student.addressText || '',
        studentCoords: { latitude: student.latitude, longitude: student.longitude },
        outboundRouteId: outboundRoute.id,
        returnRouteId: returnRoute.id,
        outboundRoute: {
          routeId: outboundRoute.id,
          routeName: outboundRoute.name,
          direction: RouteDirection.TO_SCHOOL,
          stops: obEval.canonicalStops,
          totalDistanceMeters: obEval.totalDistanceMeters,
          estimatedDurationSeconds: obEval.estimatedDurationSeconds,
          polylineGeometry: obEval.polylineGeometry,
          departureTime: obEval.departureTime,
          arrivalTime: obEval.arrivalTime,
          derivedWeeklySchedule: obEval.derivedWeeklySchedule,
          routingConstraints: {
            maxRouteDurationMinutes: obMaxDurationMinutes,
            defaultStopServiceSeconds: obDefaultStopServiceSeconds,
          },
          studentStopOrder: obEval.studentStopOrder,
          studentPlannedArrivalTime: obEval.studentPlannedArrivalTime,
        },
        returnRoute: {
          routeId: returnRoute.id,
          routeName: returnRoute.name,
          direction: RouteDirection.TO_PARKING,
          stops: retEval.canonicalStops,
          totalDistanceMeters: retEval.totalDistanceMeters,
          estimatedDurationSeconds: retEval.estimatedDurationSeconds,
          polylineGeometry: retEval.polylineGeometry,
          departureTime: retEval.departureTime,
          arrivalTime: retEval.arrivalTime,
          derivedWeeklySchedule: retEval.derivedWeeklySchedule,
          routingConstraints: {
            maxRouteDurationMinutes: retMaxDurationMinutes,
            defaultStopServiceSeconds: retDefaultStopServiceSeconds,
          },
          studentStopOrder: retEval.studentStopOrder,
          studentPlannedArrivalTime: retEval.studentPlannedArrivalTime,
        },
        appliedConstraints: {
          outbound: {
            maxRouteDurationMinutes: obMaxDurationMinutes,
            defaultStopServiceSeconds: obDefaultStopServiceSeconds,
          },
          return: {
            maxRouteDurationMinutes: retMaxDurationMinutes,
            defaultStopServiceSeconds: retDefaultStopServiceSeconds,
          },
        },
        createdAt: Date.now(),
        userId: currentUser.id,
        expectedFingerprint,
      });
    }

    const obStudentCount = outboundRoute.stops.filter((s) => Boolean(s.studentId)).length;
    const retStudentCount = returnRoute.stops.filter((s) => Boolean(s.studentId)).length;

    const outboundResult: RouteInsertionResultDto = {
      routeId: outboundRoute.id,
      routeName: outboundRoute.name,
      direction: RouteDirection.TO_SCHOOL,
      status: obEval.status,
      feasibility: obEval.status,
      reason: obEval.reason,
      infeasibilityReason: obEval.reason,
      currentStudentsCount: obStudentCount,
      newStudentsCount: obStudentCount + 1,
      oldDurationSeconds: outboundRoute.estimatedDurationSeconds,
      newDurationSeconds: obEval.estimatedDurationSeconds,
      oldDistanceMeters: outboundRoute.totalDistanceMeters,
      newDistanceMeters: obEval.totalDistanceMeters,
      newPolylineGeometry: obEval.polylineGeometry || outboundRoute.polylineGeometry,
      stopOrder: obEval.studentStopOrder,
      plannedArrivalTime: obEval.studentPlannedArrivalTime,
      departureTime: obEval.departureTime,
      arrivalTime: obEval.arrivalTime,
      stops: obEval.canonicalStops.map((s) => ({
        stopOrder: s.stopOrder,
        stopType: s.stopType,
        studentId: s.studentId,
        studentName: s.studentName,
        addressText: s.addressText,
        latitude: s.latitude,
        longitude: s.longitude,
        plannedArrivalSeconds: s.plannedArrivalSeconds,
        plannedArrivalTime: s.plannedArrivalTime,
        serviceDurationSeconds: s.serviceSeconds,
      })),
    };

    const returnResult: RouteInsertionResultDto = {
      routeId: returnRoute.id,
      routeName: returnRoute.name,
      direction: RouteDirection.TO_PARKING,
      status: retEval.status,
      feasibility: retEval.status,
      reason: retEval.reason,
      infeasibilityReason: retEval.reason,
      currentStudentsCount: retStudentCount,
      newStudentsCount: retStudentCount + 1,
      oldDurationSeconds: returnRoute.estimatedDurationSeconds,
      newDurationSeconds: retEval.estimatedDurationSeconds,
      oldDistanceMeters: returnRoute.totalDistanceMeters,
      newDistanceMeters: retEval.totalDistanceMeters,
      newPolylineGeometry: retEval.polylineGeometry || returnRoute.polylineGeometry,
      stopOrder: retEval.studentStopOrder,
      plannedArrivalTime: retEval.studentPlannedArrivalTime,
      departureTime: retEval.departureTime,
      arrivalTime: retEval.arrivalTime,
      stops: retEval.canonicalStops.map((s) => ({
        stopOrder: s.stopOrder,
        stopType: s.stopType,
        studentId: s.studentId,
        studentName: s.studentName,
        addressText: s.addressText,
        latitude: s.latitude,
        longitude: s.longitude,
        plannedArrivalSeconds: s.plannedArrivalSeconds,
        plannedArrivalTime: s.plannedArrivalTime,
        serviceDurationSeconds: s.serviceSeconds,
      })),
    };

    return {
      previewToken,
      feasible: allFeasible,
      isFeasible: allFeasible,
      unavailabilityReason,
      outbound: outboundResult,
      return: returnResult,
      returnRoute: returnResult,
      expectedFingerprint,
    };
  }

  /**
   * Xác nhận thêm học sinh vào hai tuyến (Route-Only Transaction)
   * Không sửa bất kỳ Trip đã sinh nào!
   * Tự động bảo toàn routeSnapshot cho các chuyến xe cũ có snapshot null trước khi cập nhật Route.
   * Cập nhật đồng bộ toàn bộ stopOrder (1..N), plannedArrivalTime, departureTime, arrivalTime, geometry từ Preview Session.
   */
  async confirmStudentInsertion(
    dto: ConfirmStudentInsertionDto,
    currentUser: User,
  ): Promise<{ success: boolean; message: string; outboundRouteId: string; returnRouteId: string }> {
    if (currentUser.role !== Role.SYSTEM_ADMIN) {
      throw new ForbiddenException('Chỉ Quản trị viên hệ thống (SYSTEM_ADMIN) mới có quyền xác nhận thêm học sinh');
    }

    const session = this.insertionSessions.get(dto.previewToken);
    if (!session || Date.now() - session.createdAt > 10 * 60 * 1000) {
      throw new ConflictException('Phiên kiểm tra đã hết hạn hoặc không tồn tại. Vui lòng chạy lại kiểm tra.');
    }

    if (session.userId !== currentUser.id) {
      throw new ForbiddenException('Bạn không phải người tạo phiên kiểm tra này.');
    }

    if (dto.expectedFingerprint && dto.expectedFingerprint !== session.expectedFingerprint) {
      throw new ConflictException('Dữ liệu tuyến hoặc học sinh đã thay đổi kể từ khi kiểm tra. Vui lòng kiểm tra lại.');
    }

    const { studentId, outboundRouteId, returnRouteId, outboundRoute, returnRoute } = session;

    await this.prisma.$transaction(async (tx) => {
      // 1. Revalidate student
      const student = await tx.student.findUnique({ where: { id: studentId } });
      if (!student || student.status !== StudentStatus.AVAILABLE) {
        throw new ConflictException('Trạng thái học sinh đã thay đổi. Vui lòng kiểm tra lại.');
      }

      // Revalidate không thuộc tuyến khác
      const activeStop = await tx.routeStop.findFirst({
        where: {
          studentId,
          route: {
            routePlan: { status: { in: [RoutePlanStatus.DRAFT, RoutePlanStatus.ACTIVE] } },
          },
        },
      });
      if (activeStop) {
        throw new ConflictException('Học sinh đã được thêm vào tuyến bởi một thao tác khác.');
      }

      // 2. Revalidate routes & check server fingerprint
      const [freshObRoute, freshRetRoute] = await Promise.all([
        tx.route.findUnique({
          where: { id: outboundRouteId },
          include: { stops: true },
        }),
        tx.route.findUnique({
          where: { id: returnRouteId },
          include: { stops: true },
        }),
      ]);

      if (!freshObRoute || !freshRetRoute) {
        throw new NotFoundException('Không tìm thấy một trong hai tuyến xe được chọn.');
      }

      const currentFingerprint = createHash('sha256')
        .update(
          JSON.stringify([
            studentId,
            outboundRouteId,
            returnRouteId,
            freshObRoute.updatedAt ? new Date(freshObRoute.updatedAt).toISOString() : '',
            freshRetRoute.updatedAt ? new Date(freshRetRoute.updatedAt).toISOString() : '',
            freshObRoute.stops.length,
            freshRetRoute.stops.length,
            session.appliedConstraints.outbound.maxRouteDurationMinutes,
            session.appliedConstraints.outbound.defaultStopServiceSeconds,
            session.appliedConstraints.return.maxRouteDurationMinutes,
            session.appliedConstraints.return.defaultStopServiceSeconds,
          ]),
        )
        .digest('hex');

      if (currentFingerprint !== session.expectedFingerprint) {
        throw new ConflictException(
          'Tuyến xe hoặc học sinh đã bị thay đổi trong quá trình xem trước. Vui lòng kiểm tra lại tính khả thi trước khi xác nhận.',
        );
      }

      // 3. Bảo toàn Trip cũ: Nếu có chuyến xe nào của 2 tuyến này chưa có routeSnapshot (null),
      // đóng băng dữ liệu tuyến cũ vào snapshot trước khi sửa Route để không ảnh hưởng chuyến cũ.
      const uncapturedTrips = await tx.trip.findMany({
        where: {
          routeId: { in: [outboundRouteId, returnRouteId] },
          routeSnapshot: { equals: Prisma.DbNull },
        },
        include: {
          route: {
            include: {
              school: true,
              stops: {
                include: { student: { select: { fullName: true } } },
                orderBy: { stopOrder: 'asc' },
              },
            },
          },
        },
      });

      for (const trip of uncapturedTrips) {
        const r = trip.route;
        const parkingStop = r.stops.find(
          (s) => s.stopType === RouteStopType.PARKING_START || s.stopType === RouteStopType.PARKING_END,
        );
        const schoolStop = r.stops.find(
          (s) => s.stopType === RouteStopType.SCHOOL_ARRIVAL || s.stopType === RouteStopType.SCHOOL_DEPARTURE,
        );

        const snapshot = buildTripRouteSnapshot({
          routeId: r.id,
          routeName: r.name,
          direction: r.direction,
          schoolId: r.schoolId,
          schoolName: r.school.name,
          schoolCoords: {
            latitude: schoolStop?.latitude ?? r.school.latitude,
            longitude: schoolStop?.longitude ?? r.school.longitude,
            addressText: schoolStop?.addressText || r.school.addressText,
          },
          parkingCoords: {
            latitude: parkingStop?.latitude ?? this.defaultParking.latitude,
            longitude: parkingStop?.longitude ?? this.defaultParking.longitude,
            addressText: parkingStop?.addressText || this.defaultParking.addressText,
          },
          polylineGeometry: r.polylineGeometry,
          totalDistanceMeters: r.totalDistanceMeters,
          estimatedDurationSeconds: r.estimatedDurationSeconds,
          departureTime: r.departureTime,
          arrivalTime: r.arrivalTime,
          routingConstraints: r.routingConstraints,
          stops: r.stops.map((s) => ({
            id: s.id,
            stopOrder: s.stopOrder,
            stopType: s.stopType,
            studentId: s.studentId,
            student: s.student,
            addressText: s.addressText,
            latitude: s.latitude,
            longitude: s.longitude,
            plannedArrivalSeconds: s.plannedArrivalSeconds,
            plannedArrivalTime: s.plannedArrivalTime,
          })),
          snapshotReason: 'PRE_UPDATE_CAPTURE',
        });

        await tx.trip.update({
          where: { id: trip.id },
          data: { routeSnapshot: snapshot as any },
        });
      }

      // 4. Cập nhật outboundRoute và toàn bộ điểm dừng theo canonical preview
      for (const st of outboundRoute.stops) {
        if (st.isNew) {
          await tx.routeStop.create({
            data: {
              routeId: outboundRouteId,
              stopOrder: st.stopOrder,
              stopType: st.stopType,
              studentId,
              addressText: st.addressText,
              latitude: st.latitude,
              longitude: st.longitude,
              plannedArrivalSeconds: st.plannedArrivalSeconds,
              plannedArrivalTime: st.plannedArrivalTime,
            },
          });
        } else if (st.existingStopId) {
          await tx.routeStop.update({
            where: { id: st.existingStopId },
            data: {
              stopOrder: st.stopOrder,
              plannedArrivalSeconds: st.plannedArrivalSeconds,
              plannedArrivalTime: st.plannedArrivalTime,
            },
          });
        }
      }

      await tx.route.update({
        where: { id: outboundRouteId },
        data: {
          totalDistanceMeters: outboundRoute.totalDistanceMeters,
          estimatedDurationSeconds: outboundRoute.estimatedDurationSeconds,
          polylineGeometry: outboundRoute.polylineGeometry,
          departureTime: outboundRoute.departureTime,
          arrivalTime: outboundRoute.arrivalTime,
          derivedWeeklySchedule: outboundRoute.derivedWeeklySchedule || undefined,
          routingConstraints: outboundRoute.routingConstraints,
        },
      });

      // 5. Cập nhật returnRoute và toàn bộ điểm dừng theo canonical preview
      for (const st of returnRoute.stops) {
        if (st.isNew) {
          await tx.routeStop.create({
            data: {
              routeId: returnRouteId,
              stopOrder: st.stopOrder,
              stopType: st.stopType,
              studentId,
              addressText: st.addressText,
              latitude: st.latitude,
              longitude: st.longitude,
              plannedArrivalSeconds: st.plannedArrivalSeconds,
              plannedArrivalTime: st.plannedArrivalTime,
            },
          });
        } else if (st.existingStopId) {
          await tx.routeStop.update({
            where: { id: st.existingStopId },
            data: {
              stopOrder: st.stopOrder,
              plannedArrivalSeconds: st.plannedArrivalSeconds,
              plannedArrivalTime: st.plannedArrivalTime,
            },
          });
        }
      }

      await tx.route.update({
        where: { id: returnRouteId },
        data: {
          totalDistanceMeters: returnRoute.totalDistanceMeters,
          estimatedDurationSeconds: returnRoute.estimatedDurationSeconds,
          polylineGeometry: returnRoute.polylineGeometry,
          departureTime: returnRoute.departureTime,
          arrivalTime: returnRoute.arrivalTime,
          derivedWeeklySchedule: returnRoute.derivedWeeklySchedule || undefined,
          routingConstraints: returnRoute.routingConstraints,
        },
      });

      // 6. Tăng tổng số học sinh của RoutePlan
      await tx.routePlan.update({
        where: { id: freshObRoute.routePlanId },
        data: { totalStudents: { increment: 1 } },
      });

      // Xóa session khỏi bộ nhớ tạm
      this.insertionSessions.delete(dto.previewToken);
    });

    this.logger.log(`Thêm học sinh ${studentId} vào hai tuyến ${outboundRouteId} & ${returnRouteId} thành công.`);

    return {
      success: true,
      message: 'Đã thêm học sinh vào hai tuyến thành công. Thay đổi sẽ áp dụng cho các chuyến xe được tạo sau.',
      outboundRouteId,
      returnRouteId,
    };
  }

  // ==========================================
  // 5. ROUTEPLAN APPROVAL & ASSIGNMENT GROUPING
  // ==========================================

  async getApprovalReadiness(planId: string, currentUser: User): Promise<ApprovalReadinessResponseDto> {
    const plan = await this.prisma.routePlan.findUnique({
      where: { id: planId },
      select: { id: true, schoolId: true },
    });
    if (!plan) {
      throw new NotFoundException('Không tìm thấy phương án tuyến');
    }
    if (currentUser.role === Role.SCHOOL_ADMIN && plan.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Bạn không có quyền xem thông tin của trường khác');
    }
    return this.resourceAvailabilityService.getApprovalReadiness(planId);
  }

  async approveRoutePlan(planId: string, currentUser: User): Promise<RoutePlanResponseDto> {
    // STRICT RBAC: SYSTEM_ADMIN is NEVER allowed to approve
    if (currentUser.role === Role.SYSTEM_ADMIN) {
      throw new ForbiddenException(
        'Chỉ Quản trị viên trường học (SCHOOL_ADMIN) mới có thẩm quyền phê duyệt kích hoạt phương án tuyến.',
      );
    }
    if (currentUser.role !== Role.SCHOOL_ADMIN) {
      throw new ForbiddenException('Bạn không có quyền phê duyệt phương án tuyến');
    }

    const plan = await this.prisma.routePlan.findUnique({
      where: { id: planId },
      include: { school: true },
    });
    if (!plan) {
      throw new NotFoundException('Không tìm thấy phương án tuyến');
    }
    if (plan.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Bạn chỉ có quyền phê duyệt phương án thuộc trường của mình');
    }
    if (plan.status !== RoutePlanStatus.DRAFT) {
      throw new BadRequestException(`Phương án hiện đang ở trạng thái ${plan.status}. Chỉ có thể phê duyệt phương án DRAFT.`);
    }

    // Validate all readiness rules
    const readiness = await this.resourceAvailabilityService.getApprovalReadiness(planId);
    if (!readiness.isReadyForApproval) {
      const firstMsg = readiness.blockers[0]?.message || 'Phương án chưa đủ điều kiện kích hoạt';
      throw new BadRequestException(`Không thể phê duyệt phương án: ${firstMsg}`);
    }

    // Atomic Transaction
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.routePlan.findUnique({
        where: { id: planId },
        select: { status: true },
      });
      if (current?.status !== RoutePlanStatus.DRAFT) {
        throw new BadRequestException('Trạng thái phương án đã bị thay đổi đồng thời');
      }

      await tx.routePlan.update({
        where: { id: planId },
        data: {
          status: RoutePlanStatus.ACTIVE,
          activatedAt: new Date(),
          approvedById: currentUser.id,
        },
      });
    });

    this.logger.log(`RoutePlan ${planId} activated by SchoolAdmin ${currentUser.id} for school ${plan.schoolId}`);
    return this.getRoutePlanDetail(planId, currentUser);
  }

  async replaceVehicleGroup(
    planId: string,
    dto: AssignVehicleGroupDto,
    currentUser: User,
  ): Promise<RoutePlanResponseDto> {
    if (currentUser.role !== Role.SYSTEM_ADMIN) {
      throw new ForbiddenException('Chỉ SYSTEM_ADMIN mới có quyền thay đổi phương tiện mặc định');
    }

    const { routesInGroup } = await this.resourceAvailabilityService.validateVehicleForGroup(
      planId,
      dto.currentVehicleId,
      dto.newVehicleId,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.route.updateMany({
        where: {
          routePlanId: planId,
          proposedVehicleId: dto.currentVehicleId,
        },
        data: {
          proposedVehicleId: dto.newVehicleId,
        },
      });
    });

    this.logger.log(`RoutePlan ${planId}: Replaced vehicle ${dto.currentVehicleId} with ${dto.newVehicleId} on ${routesInGroup.length} routes.`);
    return this.getRoutePlanDetail(planId, currentUser);
  }

  async assignDriverGroup(
    planId: string,
    dto: AssignDriverGroupDto,
    currentUser: User,
  ): Promise<RoutePlanResponseDto> {
    if (currentUser.role !== Role.SYSTEM_ADMIN) {
      throw new ForbiddenException('Chỉ SYSTEM_ADMIN mới có quyền gán tài xế mặc định');
    }

    const { plan, routesInGroup } = await this.resourceAvailabilityService.validateDriverForGroup(
      planId,
      dto.vehicleId,
      dto.driverId,
    );

    if (plan.status === RoutePlanStatus.ACTIVE && !dto.driverId) {
      throw new BadRequestException('Không thể hủy phân công tài xế của phương án đã ACTIVE');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.route.updateMany({
        where: {
          routePlanId: planId,
          proposedVehicleId: dto.vehicleId,
        },
        data: {
          defaultDriverId: dto.driverId,
        },
      });
    });

    this.logger.log(`RoutePlan ${planId}: Assigned driver ${dto.driverId} to vehicle ${dto.vehicleId} on ${routesInGroup.length} routes.`);
    return this.getRoutePlanDetail(planId, currentUser);
  }

  async assignBusAttendantGroup(
    planId: string,
    dto: AssignBusAttendantGroupDto,
    currentUser: User,
  ): Promise<RoutePlanResponseDto> {
    if (currentUser.role !== Role.SCHOOL_ADMIN) {
      throw new ForbiddenException('Chỉ Quản trị viên trường học (SCHOOL_ADMIN) mới có quyền phân công giáo viên giám sát');
    }

    const { plan, routesInGroup } = await this.resourceAvailabilityService.validateBusAttendantForGroup(
      planId,
      dto.vehicleId,
      dto.busAttendantId,
      currentUser.schoolId || undefined,
    );

    if (plan.status === RoutePlanStatus.ACTIVE && !dto.busAttendantId) {
      throw new BadRequestException('Không thể hủy phân công giáo viên giám sát của phương án đã ACTIVE');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.route.updateMany({
        where: {
          routePlanId: planId,
          proposedVehicleId: dto.vehicleId,
        },
        data: {
          defaultBusAttendantId: dto.busAttendantId,
        },
      });
    });

    this.logger.log(`RoutePlan ${planId}: Assigned bus attendant ${dto.busAttendantId} to vehicle ${dto.vehicleId} on ${routesInGroup.length} routes.`);
    return this.getRoutePlanDetail(planId, currentUser);
  }

  // ==========================================
  // 6. ROUTE QUERIES (LIST, DETAIL)
  // ==========================================

  async listRoutes(
    query: {
      schoolId?: string;
      direction?: RouteDirection;
      status?: RoutePlanStatus;
      search?: string;
      page?: number;
      limit?: number;
    },
    currentUser: User,
  ): Promise<{ items: RouteResponseDto[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (currentUser.role === Role.SCHOOL_ADMIN) {
      where.schoolId = currentUser.schoolId;
    } else if (query.schoolId) {
      where.schoolId = query.schoolId;
    }

    if (query.direction) {
      where.direction = query.direction;
    }

    if (query.status) {
      where.routePlan = { status: query.status };
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { school: { name: { contains: s, mode: 'insensitive' } } },
        { proposedVehicle: { licensePlate: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [routes, total] = await Promise.all([
      this.prisma.route.findMany({
        where,
        include: {
          school: { select: { name: true } },
          routePlan: { select: { id: true, status: true, name: true } },
          proposedVehicle: { select: { licensePlate: true, brand: true, seatCount: true } },
          stops: { select: { studentId: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { direction: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.route.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items: routes.map((r) => ({
        id: r.id,
        routePlanId: r.routePlanId,
        routePlanName: r.routePlan.name,
        schoolId: r.schoolId,
        schoolName: r.school.name,
        name: r.name,
        direction: r.direction,
        proposedVehicleId: r.proposedVehicleId,
        proposedVehiclePlate: r.proposedVehicle?.licensePlate || null,
        proposedVehicleBrand: r.proposedVehicle?.brand || null,
        proposedVehicleSeats: r.proposedVehicle?.seatCount || null,
        totalDistanceMeters: r.totalDistanceMeters,
        estimatedDurationSeconds: r.estimatedDurationSeconds,
        departureTime: r.departureTime,
        arrivalTime: r.arrivalTime,
        polylineGeometry: r.polylineGeometry,
        status: r.routePlan.status,
        planStatus: r.routePlan.status,
        studentCount: r.stops.filter((s) => s.studentId).length,
      })),
      total,
      page,
      totalPages,
    };
  }

  async getRouteDetail(id: string, currentUser: User): Promise<RouteResponseDto> {
    const route = await this.prisma.route.findUnique({
      where: { id },
      include: {
        school: { select: { name: true, weeklySchedule: true, latitude: true, longitude: true } },
        routePlan: { select: { status: true, name: true, routingConstraints: true } },
        proposedVehicle: { select: { licensePlate: true, brand: true, seatCount: true } },
        stops: {
          include: {
            student: { select: { fullName: true } },
          },
          orderBy: { stopOrder: 'asc' },
        },
      },
    });

    if (!route) {
      throw new NotFoundException('Không tìm thấy tuyến đường');
    }

    if (currentUser.role === Role.SCHOOL_ADMIN && route.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Bạn không có quyền xem tuyến đường của trường khác');
    }

    const constraints = (route.routePlan.routingConstraints as any) || {};
    const weeklySched = (route.school.weeklySchedule as Record<string, { start?: string; end?: string }>) || {};
    const routeDepSec = this.parseTimeToSeconds(route.departureTime || '07:00');
    const derivedWeeklySchedule: Record<string, { departureTime: string; arrivalTime: string }> = {};

    for (const [day, sched] of Object.entries(weeklySched)) {
      if (route.direction === RouteDirection.TO_SCHOOL && sched?.start) {
        const dayStartSec = this.parseTimeToSeconds(sched.start);
        const dayDepSec = dayStartSec - route.estimatedDurationSeconds;
        derivedWeeklySchedule[day] = {
          departureTime: this.secondsToTimeString(dayDepSec),
          arrivalTime: sched.start,
        };
      } else if (route.direction === RouteDirection.TO_PARKING && sched?.end) {
        const dayDepSec = this.parseTimeToSeconds(sched.end);
        const dayArrSec = dayDepSec + route.estimatedDurationSeconds;
        derivedWeeklySchedule[day] = {
          departureTime: sched.end,
          arrivalTime: this.secondsToTimeString(dayArrSec),
        };
      }
    }

    const parkingStop = route.stops.find(
      (s) => s.stopType === RouteStopType.PARKING_START || s.stopType === RouteStopType.PARKING_END,
    );
    const schoolStop = route.stops.find(
      (s) => s.stopType === RouteStopType.SCHOOL_ARRIVAL || s.stopType === RouteStopType.SCHOOL_DEPARTURE,
    );
    const parkingLocation = parkingStop
      ? {
          latitude: parkingStop.latitude,
          longitude: parkingStop.longitude,
          addressText: parkingStop.addressText,
        }
      : undefined;
    const schoolLocation = {
      latitude: schoolStop?.latitude ?? route.school.latitude,
      longitude: schoolStop?.longitude ?? route.school.longitude,
      name: route.school.name,
    };

    return {
      id: route.id,
      routePlanId: route.routePlanId,
      routePlanName: route.routePlan.name,
      schoolId: route.schoolId,
      schoolName: route.school.name,
      name: route.name,
      direction: route.direction,
      proposedVehicleId: route.proposedVehicleId,
      proposedVehiclePlate: route.proposedVehicle?.licensePlate || null,
      proposedVehicleBrand: route.proposedVehicle?.brand || null,
      proposedVehicleSeats: route.proposedVehicle?.seatCount || null,
      totalDistanceMeters: route.totalDistanceMeters,
      estimatedDurationSeconds: route.estimatedDurationSeconds,
      departureTime: route.departureTime,
      arrivalTime: route.arrivalTime,
      polylineGeometry: route.polylineGeometry,
      status: route.routePlan.status,
      planStatus: route.routePlan.status,
      studentCount: route.stops.filter((s) => s.studentId).length,
      derivedWeeklySchedule,
      parkingLocation,
      schoolLocation,
      stops: route.stops.map((s) => {
        const elapsedArrivalSeconds = s.plannedArrivalSeconds
          ? Math.max(0, s.plannedArrivalSeconds - routeDepSec)
          : 0;
        const serviceDurationSeconds = s.studentId
          ? this.resolveStudentServiceSeconds(
              s.studentId,
              route.direction,
              constraints.defaultStopServiceSeconds || 60,
              constraints.stopServiceOverrides,
            )
          : 0;

        return {
          id: s.id,
          stopOrder: s.stopOrder,
          stopType: s.stopType,
          studentId: s.studentId,
          studentName: s.student?.fullName || null,
          addressText: s.addressText,
          latitude: s.latitude,
          longitude: s.longitude,
          plannedArrivalSeconds: s.plannedArrivalSeconds,
          plannedArrivalTime: s.plannedArrivalTime,
          elapsedArrivalSeconds,
          serviceDurationSeconds,
        };
      }),
    };
  }

  // ==========================================
  // 7. STUDENT ROUTING INTEGRATION & PRIVACY
  // ==========================================

  async getStudentRoutingDetail(
    studentId: string,
    currentUser: User,
  ): Promise<StudentRoutingDetailDto> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { school: true },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy học sinh');
    }

    // Role-based authorization
    if (currentUser.role === Role.PARENT) {
      const link = await this.prisma.parentStudentLink.findUnique({
        where: {
          parentId_studentId: {
            parentId: currentUser.id,
            studentId,
          },
        },
      });
      if (!link) {
        throw new ForbiddenException('Bạn không có quyền truy cập dữ liệu học sinh này');
      }
    } else if (currentUser.role === Role.SCHOOL_ADMIN) {
      if (student.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException('Học sinh không thuộc trường của bạn');
      }
    }

    // Check if student has valid address
    if (!student.latitude || !student.longitude) {
      return {
        studentId: student.id,
        studentName: student.fullName,
        routingStatus: 'MISSING_ADDRESS',
      };
    }

    // Find active DRAFT route stops for this student (include route stops for snapshot fidelity)
    const studentStops = await this.prisma.routeStop.findMany({
      where: {
        studentId,
        route: {
          routePlan: { status: RoutePlanStatus.DRAFT },
        },
      },
      include: {
        route: {
          include: {
            routePlan: true,
            proposedVehicle: true,
            stops: true,
          },
        },
      },
    });

    if (studentStops.length === 0) {
      // Check if school has any draft plan
      const schoolPlan = await this.prisma.routePlan.findFirst({
        where: { schoolId: student.schoolId, status: RoutePlanStatus.DRAFT },
      });
      return {
        studentId: student.id,
        studentName: student.fullName,
        routingStatus: schoolPlan ? 'NOT_ASSIGNED' : 'NO_ROUTE_PLAN',
      };
    }

    // Default parking configuration fallback if route snapshot lacks parking stop
    const fallbackParking = await this.getParkingLotConfig();

    const resolveParkingLocation = (routeStops?: any[]) => {
      const parkingStop = routeStops?.find(
        (s) => s.stopType === RouteStopType.PARKING_START || s.stopType === RouteStopType.PARKING_END,
      );
      if (parkingStop) {
        return {
          latitude: parkingStop.latitude,
          longitude: parkingStop.longitude,
          addressText: parkingStop.addressText,
        };
      }
      return {
        latitude: fallbackParking.latitude,
        longitude: fallbackParking.longitude,
        addressText: fallbackParking.addressText,
      };
    };

    const resolveSchoolLocation = (routeStops?: any[]) => {
      const schoolStop = routeStops?.find(
        (s) => s.stopType === RouteStopType.SCHOOL_ARRIVAL || s.stopType === RouteStopType.SCHOOL_DEPARTURE,
      );
      return {
        latitude: schoolStop?.latitude ?? student.school.latitude,
        longitude: schoolStop?.longitude ?? student.school.longitude,
        name: student.school.name,
      };
    };

    const outboundStop = studentStops.find((s) => s.route.direction === RouteDirection.TO_SCHOOL);
    const returnStop = studentStops.find((s) => s.route.direction === RouteDirection.TO_PARKING);

    const plan = studentStops[0].route.routePlan;

    return {
      studentId: student.id,
      studentName: student.fullName,
      routingStatus: 'ASSIGNED_DRAFT',
      routePlanId: plan.id,
      routePlanName: plan.name,
      routePlanStatus: plan.status,
      outboundRoute: outboundStop
        ? {
            id: outboundStop.route.id,
            name: outboundStop.route.name,
            proposedVehiclePlate: outboundStop.route.proposedVehicle?.licensePlate || null,
            plannedArrivalTime: outboundStop.plannedArrivalTime,
            pickupAddressText: outboundStop.addressText,
            pickupLatitude: outboundStop.latitude,
            pickupLongitude: outboundStop.longitude,
            polylineGeometry: outboundStop.route.polylineGeometry,
            schoolLocation: resolveSchoolLocation(outboundStop.route.stops),
            parkingLocation: resolveParkingLocation(outboundStop.route.stops),
          }
        : null,
      returnRoute: returnStop
        ? {
            id: returnStop.route.id,
            name: returnStop.route.name,
            proposedVehiclePlate: returnStop.route.proposedVehicle?.licensePlate || null,
            plannedArrivalTime: returnStop.plannedArrivalTime,
            dropoffAddressText: returnStop.addressText,
            dropoffLatitude: returnStop.latitude,
            dropoffLongitude: returnStop.longitude,
            polylineGeometry: returnStop.route.polylineGeometry,
            schoolLocation: resolveSchoolLocation(returnStop.route.stops),
            parkingLocation: resolveParkingLocation(returnStop.route.stops),
          }
        : null,
    };
  }

  private secondsToTimeString(totalSec: number): string {
    const normSec = Math.max(0, totalSec) % 86400;
    const hours = Math.floor(normSec / 3600);
    const minutes = Math.floor((normSec % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
}
