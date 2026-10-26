import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RouteDirection, RoutePlanStatus, Role } from '@prisma/client';
import {
  ApprovalBlockerDto,
  ApprovalReadinessResponseDto,
} from './dto/approval-readiness.dto.js';
import {
  CandidateVehiclesResponseDto,
  CandidateDriversResponseDto,
  CandidateBusAttendantsResponseDto,
} from './dto/assignment-candidates.dto.js';

export function toDateString(d: Date | string): string {
  if (typeof d === 'string') {
    return d.slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export function isContractOverlap(
  startA: Date | string,
  endA: Date | string,
  startB: Date | string,
  endB: Date | string,
): boolean {
  const sA = toDateString(startA);
  const eA = toDateString(endA);
  const sB = toDateString(startB);
  const eB = toDateString(endB);
  // Date-only semantic overlap: startA <= endB && startB <= endA
  return sA <= eB && sB <= eA;
}

export interface VehicleReservationConflict {
  vehicleId: string;
  licensePlate: string;
  brand: string;
  seatCount: number;
  conflictingPlanId: string;
  conflictingPlanName: string;
  conflictingPlanStatus: RoutePlanStatus;
  conflictingSchoolId: string;
  conflictingSchoolName: string;
  conflictingContractStart: string;
  conflictingContractEnd: string;
  reasonCode: 'RESERVED_BY_DRAFT_PLAN' | 'RESERVED_BY_ACTIVE_PLAN';
  reasonMessage: string;
}

@Injectable()
export class ResourceAvailabilityService {
  private readonly logger = new Logger(ResourceAvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tra cứu các xung đột giữ chỗ xe theo thời hạn hợp đồng (BR-V01, BR-V02, BR-V03, BR-V04, BR-V05).
   * Xe được xem là đã được giữ chỗ nếu:
   * 1. Đang thuộc về một RoutePlan DRAFT hoặc ACTIVE (chưa CANCELLED).
   * 2. Thuộc một RoutePlan KHÁC (khác excludePlanId nếu có).
   * 3. Thời hạn hợp đồng của trường sở hữu phương án đó chồng lấn với trường mục tiêu:
   *    targetStart <= otherEnd && otherStart <= targetEnd (date-only semantics).
   */
  async findConflictingVehicles(
    vehicleIds?: string[],
    schoolId?: string,
    excludePlanId?: string,
    tx?: any,
  ): Promise<Map<string, VehicleReservationConflict>> {
    const db = tx || this.prisma;
    const conflicts = new Map<string, VehicleReservationConflict>();

    if (!schoolId) {
      return conflicts;
    }

    const targetSchool = await db.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        contractStartDate: true,
        contractEndDate: true,
      },
    });

    if (!targetSchool) {
      return conflicts;
    }

    const targetStart = toDateString(targetSchool.contractStartDate);
    const targetEnd = toDateString(targetSchool.contractEndDate);

    const assignedRoutes = await db.route.findMany({
      where: {
        proposedVehicleId: vehicleIds && vehicleIds.length > 0 ? { in: vehicleIds } : { not: null },
        ...(excludePlanId ? { routePlanId: { not: excludePlanId } } : {}),
        routePlan: {
          status: { in: [RoutePlanStatus.DRAFT, RoutePlanStatus.ACTIVE] },
        },
      },
      select: {
        proposedVehicleId: true,
        proposedVehicle: {
          select: {
            id: true,
            licensePlate: true,
            brand: true,
            seatCount: true,
          },
        },
        routePlan: {
          select: {
            id: true,
            name: true,
            status: true,
            schoolId: true,
            school: {
              select: {
                id: true,
                name: true,
                contractStartDate: true,
                contractEndDate: true,
              },
            },
          },
        },
      },
    });

    for (const r of assignedRoutes) {
      const vId = r.proposedVehicleId;
      if (!vId || !r.proposedVehicle || conflicts.has(vId)) {
        continue;
      }

      const otherSchool = r.routePlan.school;
      const otherStart = toDateString(otherSchool.contractStartDate);
      const otherEnd = toDateString(otherSchool.contractEndDate);

      if (isContractOverlap(targetStart, targetEnd, otherStart, otherEnd)) {
        const isDraft = r.routePlan.status === RoutePlanStatus.DRAFT;
        const planType = isDraft ? 'chờ duyệt (DRAFT)' : 'đang hoạt động (ACTIVE)';
        const sameSchool = r.routePlan.schoolId === targetSchool.id;
        const schoolContext = sameSchool ? 'cùng trường này' : `trường "${otherSchool.name}"`;

        const reasonCode: 'RESERVED_BY_DRAFT_PLAN' | 'RESERVED_BY_ACTIVE_PLAN' = isDraft
          ? 'RESERVED_BY_DRAFT_PLAN'
          : 'RESERVED_BY_ACTIVE_PLAN';

        const reasonMessage = `Xe [${r.proposedVehicle.licensePlate}] đã được giữ bởi phương án ${planType} ("${r.routePlan.name}") của ${schoolContext} trong thời gian hợp đồng chồng lấn (${otherStart} - ${otherEnd}).`;

        conflicts.set(vId, {
          vehicleId: vId,
          licensePlate: r.proposedVehicle.licensePlate,
          brand: r.proposedVehicle.brand,
          seatCount: r.proposedVehicle.seatCount,
          conflictingPlanId: r.routePlan.id,
          conflictingPlanName: r.routePlan.name,
          conflictingPlanStatus: r.routePlan.status,
          conflictingSchoolId: otherSchool.id,
          conflictingSchoolName: otherSchool.name,
          conflictingContractStart: otherStart,
          conflictingContractEnd: otherEnd,
          reasonCode,
          reasonMessage,
        });
      }
    }

    return conflicts;
  }

  /**
   * Kiểm tra điều kiện thay thế phương tiện mặc định cho một nhóm tuyến trong phương án.
   */
  async validateVehicleForGroup(
    planId: string,
    currentVehicleId: string,
    newVehicleId: string,
  ) {
    const plan = await this.prisma.routePlan.findUnique({
      where: { id: planId },
      include: {
        school: true,
        routes: {
          include: {
            stops: { select: { studentId: true } },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Không tìm thấy phương án tuyến');
    }

    const newVehicle = await this.prisma.vehicle.findUnique({
      where: { id: newVehicleId },
    });

    if (!newVehicle) {
      throw new NotFoundException('Phương tiện thay thế không tồn tại');
    }

    // Các tuyến đang dùng xe cũ trong phương án
    const routesInGroup = plan.routes.filter(
      (r) => r.proposedVehicleId === currentVehicleId,
    );

    if (routesInGroup.length === 0) {
      throw new BadRequestException(
        'Không tìm thấy tuyến nào trong phương án đang sử dụng phương tiện này',
      );
    }

    // Kiểm tra nếu xe mới đã nằm trong nhóm tuyến khác của cùng phương án -> từ chối gộp nhóm âm thầm
    const otherRoutesWithNewVehicle = plan.routes.filter(
      (r) =>
        r.proposedVehicleId === newVehicleId &&
        r.proposedVehicleId !== currentVehicleId,
    );
    if (otherRoutesWithNewVehicle.length > 0) {
      throw new BadRequestException(
        `Phương tiện ${newVehicle.licensePlate} đã được sử dụng trong nhóm tuyến khác của phương án. Hệ thống không hỗ trợ tự động gộp nhóm xe.`,
      );
    }

    // Kiểm tra sức chứa xe mới đủ cho từng tuyến trong nhóm
    for (const r of routesInGroup) {
      const studentIds = new Set(
        r.stops.map((s) => s.studentId).filter(Boolean),
      );
      if (newVehicle.seatCount < studentIds.size) {
        throw new BadRequestException(
          `Sức chứa của phương tiện ${newVehicle.licensePlate} (${newVehicle.seatCount} chỗ) không đủ cho ${r.name} (${studentIds.size} học sinh).`,
        );
      }
    }

    // Kiểm tra độc quyền phương tiện theo thời hạn hợp đồng (BR-V01, BR-V02, BR-V04)
    const conflicts = await this.findConflictingVehicles(
      [newVehicleId],
      plan.schoolId,
      plan.id,
    );
    if (conflicts.has(newVehicleId)) {
      const conflict = conflicts.get(newVehicleId)!;
      throw new ConflictException(
        `Không thể gán xe [${newVehicle.licensePlate}]: ${conflict.reasonMessage}`,
      );
    }

    return { plan, routesInGroup, newVehicle };
  }

  /**
   * Kiểm tra điều kiện gán tài xế mặc định cho một nhóm xe trong phương án.
   * Áp dụng quy tắc Đơn trường: Một tài xế chỉ phục vụ một trường trong thời gian hợp đồng chồng lấn.
   */
  async validateDriverForGroup(
    planId: string,
    vehicleId: string,
    driverId: string,
  ) {
    const plan = await this.prisma.routePlan.findUnique({
      where: { id: planId },
      include: {
        school: true,
        routes: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('Không tìm thấy phương án tuyến');
    }

    const driver = await this.prisma.user.findUnique({
      where: { id: driverId },
    });

    if (!driver || driver.role !== Role.DRIVER || !driver.isActive) {
      throw new BadRequestException(
        'Tài xế không tồn tại, không đúng vai trò hoặc tài khoản đã bị vô hiệu hóa',
      );
    }

    const routesInGroup = plan.routes.filter(
      (r) => r.proposedVehicleId === vehicleId,
    );
    if (routesInGroup.length === 0) {
      throw new BadRequestException(
        'Không tìm thấy nhóm tuyến nào sử dụng phương tiện này trong phương án',
      );
    }

    // Kiểm tra quy tắc Đơn trường (Single-School Driver Rule) trong thời hạn hợp đồng chồng lấn
    const targetStart = new Date(plan.school.contractStartDate);
    const targetEnd = new Date(plan.school.contractEndDate);

    const conflictingRoutes = await this.prisma.route.findMany({
      where: {
        defaultDriverId: driverId,
        routePlan: {
          status: RoutePlanStatus.ACTIVE,
          schoolId: { not: plan.schoolId },
        },
      },
      include: {
        routePlan: {
          include: { school: true },
        },
      },
    });

    for (const cr of conflictingRoutes) {
      const otherSchool = cr.routePlan.school;
      const otherStart = new Date(otherSchool.contractStartDate);
      const otherEnd = new Date(otherSchool.contractEndDate);

      // Overlap: targetStart <= otherEnd && otherStart <= targetEnd
      if (targetStart <= otherEnd && otherStart <= targetEnd) {
        throw new BadRequestException(
          `Tài xế "${driver.fullName}" hiện đang phục vụ tại trường "${otherSchool.name}" có thời hạn hợp đồng chồng lấn (${otherStart.toLocaleDateString('vi-VN')} - ${otherEnd.toLocaleDateString('vi-VN')}). Theo quy định, một tài xế chỉ phục vụ một trường trong thời gian hợp đồng chồng lấn.`,
        );
      }
    }

    return { plan, routesInGroup, driver };
  }

  /**
   * Kiểm tra điều kiện gán giáo viên giám sát mặc định cho một nhóm xe trong phương án.
   * Ràng buộc: Giáo viên phải thuộc biên chế của chính trường sở hữu phương án.
   */
  async validateBusAttendantForGroup(
    planId: string,
    vehicleId: string,
    busAttendantId: string,
    currentUserSchoolId?: string,
  ) {
    const plan = await this.prisma.routePlan.findUnique({
      where: { id: planId },
      include: {
        school: true,
        routes: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('Không tìm thấy phương án tuyến');
    }

    if (currentUserSchoolId && plan.schoolId !== currentUserSchoolId) {
      throw new ForbiddenException(
        'Bạn chỉ có quyền phân công giáo viên cho phương án thuộc trường của mình',
      );
    }

    const attendant = await this.prisma.user.findUnique({
      where: { id: busAttendantId },
    });

    if (
      !attendant ||
      attendant.role !== Role.BUS_ATTENDANT ||
      !attendant.isActive
    ) {
      throw new BadRequestException(
        'Giáo viên giám sát không tồn tại, không đúng vai trò hoặc đã bị vô hiệu hóa',
      );
    }

    if (attendant.schoolId !== plan.schoolId) {
      throw new BadRequestException(
        `Giáo viên "${attendant.fullName}" không thuộc biên chế trường "${plan.school.name}".`,
      );
    }

    const routesInGroup = plan.routes.filter(
      (r) => r.proposedVehicleId === vehicleId,
    );
    if (routesInGroup.length === 0) {
      throw new BadRequestException(
        'Không tìm thấy nhóm tuyến nào sử dụng phương tiện này trong phương án',
      );
    }

    return { plan, routesInGroup, attendant };
  }

  /**
   * Thẩm định toàn diện 8 điều kiện sẵn sàng phê duyệt (Approval Readiness Checklist).
   */
  async getApprovalReadiness(planId: string): Promise<ApprovalReadinessResponseDto> {
    const plan = await this.prisma.routePlan.findUnique({
      where: { id: planId },
      include: {
        school: true,
        routes: {
          include: {
            proposedVehicle: true,
            defaultDriver: true,
            defaultBusAttendant: true,
            stops: { select: { studentId: true } },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Không tìm thấy phương án tuyến');
    }

    const blockers: ApprovalBlockerDto[] = [];
    const totalRoutes = plan.routes.length;
    let routesWithVehicle = 0;
    let routesWithDriver = 0;
    let routesWithBusAttendant = 0;

    // 1. Trạng thái phương án
    if (plan.status !== RoutePlanStatus.DRAFT) {
      blockers.push({
        code: 'NOT_DRAFT_STATUS',
        message: `Phương án không ở trạng thái DRAFT (hiện tại: ${plan.status}). Không thể phê duyệt.`,
      });
    }

    // 2. Tồn tại ít nhất 1 tuyến đi và 1 tuyến về
    const outboundRoutes = plan.routes.filter(
      (r) => r.direction === RouteDirection.TO_SCHOOL,
    );
    const returnRoutes = plan.routes.filter(
      (r) => r.direction === RouteDirection.TO_PARKING,
    );

    if (outboundRoutes.length === 0) {
      blockers.push({
        code: 'MISSING_OUTBOUND_ROUTES',
        message: 'Phương án phải có ít nhất một tuyến chiều đi (TO_SCHOOL)',
      });
    }

    if (returnRoutes.length === 0) {
      blockers.push({
        code: 'MISSING_RETURN_ROUTES',
        message: 'Phương án phải có ít nhất một tuyến chiều về (TO_PARKING)',
      });
    }

    // 3. Kiểm tra từng tuyến: Vehicle, Driver, BusAttendant, Capacity
    for (const r of plan.routes) {
      const studentIds = new Set(
        r.stops.map((s) => s.studentId).filter(Boolean),
      );
      const studentCount = studentIds.size;

      // Bất biến: Tuyệt đối cấm tuyến không có học sinh nào
      if (studentCount === 0) {
        blockers.push({
          code: 'ROUTE_HAS_NO_STUDENTS',
          routeId: r.id,
          routeName: r.name,
          message: `Tuyến "${r.name}" không có học sinh nào. Quy tắc vận hành cấm phương án có tuyến rỗng.`,
        });
      }

      // Xe
      if (r.proposedVehicleId && r.proposedVehicle) {
        routesWithVehicle++;
        if (r.proposedVehicle.seatCount < studentCount) {
          blockers.push({
            code: 'INSUFFICIENT_VEHICLE_CAPACITY',
            routeId: r.id,
            routeName: r.name,
            message: `Xe ${r.proposedVehicle.licensePlate} (${r.proposedVehicle.seatCount} chỗ) không đủ cho ${r.name} (${studentCount} học sinh)`,
          });
        }
      } else {
        blockers.push({
          code: 'MISSING_VEHICLE',
          routeId: r.id,
          routeName: r.name,
          message: `${r.name} chưa được gán phương tiện`,
        });
      }

      // Tài xế
      if (r.defaultDriverId && r.defaultDriver) {
        routesWithDriver++;
        if (!r.defaultDriver.isActive) {
          blockers.push({
            code: 'INACTIVE_DRIVER',
            routeId: r.id,
            routeName: r.name,
            message: `Tài xế "${r.defaultDriver.fullName}" đã bị vô hiệu hóa`,
          });
        }
      } else {
        blockers.push({
          code: 'MISSING_DRIVER',
          routeId: r.id,
          routeName: r.name,
          message: `${r.name} chưa được gán tài xế mặc định`,
        });
      }

      // Giáo viên giám sát
      if (r.defaultBusAttendantId && r.defaultBusAttendant) {
        routesWithBusAttendant++;
        if (!r.defaultBusAttendant.isActive) {
          blockers.push({
            code: 'INACTIVE_BUS_ATTENDANT',
            routeId: r.id,
            routeName: r.name,
            message: `Giáo viên "${r.defaultBusAttendant.fullName}" đã bị vô hiệu hóa`,
          });
        }
        if (r.defaultBusAttendant.schoolId !== plan.schoolId) {
          blockers.push({
            code: 'INVALID_BUS_ATTENDANT_SCHOOL',
            routeId: r.id,
            routeName: r.name,
            message: `Giáo viên "${r.defaultBusAttendant.fullName}" không thuộc trường này`,
          });
        }
      } else {
        blockers.push({
          code: 'MISSING_BUS_ATTENDANT',
          routeId: r.id,
          routeName: r.name,
          message: `${r.name} chưa được gán giáo viên giám sát mặc định`,
        });
      }
    }

    // 4. Kiểm tra tính đồng bộ của nhóm xe (Group Pairing Consistency)
    const vehicleGroups = new Map<string, typeof plan.routes>();
    for (const r of plan.routes) {
      if (r.proposedVehicleId) {
        const existing = vehicleGroups.get(r.proposedVehicleId) || [];
        existing.push(r);
        vehicleGroups.set(r.proposedVehicleId, existing);
      }
    }

    for (const [vId, groupRoutes] of vehicleGroups.entries()) {
      const distinctDrivers = new Set(
        groupRoutes.map((r) => r.defaultDriverId).filter(Boolean),
      );
      if (distinctDrivers.size > 1) {
        const plate = groupRoutes[0].proposedVehicle?.licensePlate || vId;
        blockers.push({
          code: 'INCONSISTENT_GROUP_DRIVER',
          message: `Nhóm xe ${plate} đang bị gán nhiều tài xế khác nhau trên các tuyến`,
        });
      }

      const distinctAttendants = new Set(
        groupRoutes.map((r) => r.defaultBusAttendantId).filter(Boolean),
      );
      if (distinctAttendants.size > 1) {
        const plate = groupRoutes[0].proposedVehicle?.licensePlate || vId;
        blockers.push({
          code: 'INCONSISTENT_GROUP_ATTENDANT',
          message: `Nhóm xe ${plate} đang bị gán nhiều giáo viên khác nhau trên các tuyến`,
        });
      }
    }

    return {
      routePlanId: plan.id,
      status: plan.status,
      isReadyForApproval: blockers.length === 0,
      summary: {
        totalRoutes,
        routesWithVehicle,
        routesWithDriver,
        routesWithBusAttendant,
      },
      blockers,
    };
  }

  /**
   * Lấy danh sách phương tiện ứng viên khả dụng để thay thế cho một nhóm tuyến trong phương án.
   */
  async getCandidateVehicles(
    planId: string,
    currentVehicleId?: string,
  ): Promise<CandidateVehiclesResponseDto> {
    const plan = await this.prisma.routePlan.findUnique({
      where: { id: planId },
      include: {
        school: true,
        routes: {
          include: {
            stops: { select: { studentId: true } },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Không tìm thấy phương án tuyến');
    }

    let requiredCapacity = 0;
    if (currentVehicleId) {
      const routesInGroup = plan.routes.filter(
        (r) => r.proposedVehicleId === currentVehicleId,
      );
      if (routesInGroup.length > 0) {
        requiredCapacity = Math.max(
          ...routesInGroup.map(
            (r) => new Set(r.stops.map((s) => s.studentId).filter(Boolean)).size,
          ),
        );
      }
    }

    // Các xe đã được sử dụng ở nhóm khác của cùng phương án
    const otherVehiclesUsed = new Set(
      plan.routes
        .filter((r) => r.proposedVehicleId && r.proposedVehicleId !== currentVehicleId)
        .map((r) => r.proposedVehicleId as string),
    );

    // Tra cứu các xe bị xung đột giữ chỗ trong thời hạn hợp đồng với các phương án khác (BR-V01, BR-V02, BR-V04)
    const reservationConflicts = await this.findConflictingVehicles(
      undefined,
      plan.schoolId,
      plan.id,
    );

    const allVehicles = await this.prisma.vehicle.findMany({
      orderBy: { seatCount: 'desc' },
    });

    const candidates = allVehicles.map((v) => {
      let isEligible = true;
      let reason = `Khả dụng (${v.seatCount} chỗ >= ${requiredCapacity} chỗ yêu cầu)`;

      if (otherVehiclesUsed.has(v.id)) {
        isEligible = false;
        reason = 'Đã được sử dụng trong nhóm tuyến khác của phương án';
      } else if (reservationConflicts.has(v.id)) {
        isEligible = false;
        reason = reservationConflicts.get(v.id)!.reasonMessage;
      } else if (v.seatCount < requiredCapacity) {
        isEligible = false;
        reason = `Sức chứa không đủ (${v.seatCount} chỗ < ${requiredCapacity} chỗ yêu cầu)`;
      }

      return {
        id: v.id,
        licensePlate: v.licensePlate,
        brand: v.brand,
        seatCount: v.seatCount,
        color: v.color,
        isEligible,
        reason,
      };
    });

    return {
      currentVehicleId,
      requiredCapacity,
      candidates,
    };
  }

  /**
   * Lấy danh sách tài xế ứng viên khả dụng cho nhóm xe theo quy tắc Đơn trường.
   */
  async getCandidateDrivers(
    planId: string,
    vehicleId?: string,
  ): Promise<CandidateDriversResponseDto> {
    const plan = await this.prisma.routePlan.findUnique({
      where: { id: planId },
      include: {
        school: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('Không tìm thấy phương án tuyến');
    }

    const targetStart = new Date(plan.school.contractStartDate);
    const targetEnd = new Date(plan.school.contractEndDate);

    // Lấy các tuyến ACTIVE ở trường khác để xác định tài xế đang bị ràng buộc
    const conflictingRoutes = await this.prisma.route.findMany({
      where: {
        defaultDriverId: { not: null },
        routePlan: {
          status: RoutePlanStatus.ACTIVE,
          schoolId: { not: plan.schoolId },
        },
      },
      include: {
        routePlan: {
          include: { school: true },
        },
      },
    });

    const conflictMap = new Map<string, string>();
    for (const cr of conflictingRoutes) {
      if (!cr.defaultDriverId) continue;
      const otherSchool = cr.routePlan.school;
      const otherStart = new Date(otherSchool.contractStartDate);
      const otherEnd = new Date(otherSchool.contractEndDate);

      if (targetStart <= otherEnd && otherStart <= targetEnd) {
        conflictMap.set(
          cr.defaultDriverId,
          `Đang phục vụ tại trường "${otherSchool.name}" có thời hạn hợp đồng chồng lấn (${otherStart.toLocaleDateString('vi-VN')} - ${otherEnd.toLocaleDateString('vi-VN')})`,
        );
      }
    }

    const allDrivers = await this.prisma.user.findMany({
      where: { role: Role.DRIVER },
      orderBy: { fullName: 'asc' },
    });

    const candidates = allDrivers.map((d) => {
      let isEligible = true;
      let reason = 'Khả dụng';

      if (!d.isActive) {
        isEligible = false;
        reason = 'Tài khoản tài xế đã bị vô hiệu hóa';
      } else if (conflictMap.has(d.id)) {
        isEligible = false;
        reason = conflictMap.get(d.id) || 'Đang bận phục vụ phương án tuyến khác';
      }

      return {
        id: d.id,
        fullName: d.fullName,
        phone: d.phone,
        isEligible,
        reason,
      };
    });

    return { candidates };
  }

  /**
   * Lấy danh sách giáo viên phụ xe ứng viên khả dụng thuộc trường sở tại.
   */
  async getCandidateBusAttendants(
    planId: string,
    currentUserSchoolId?: string,
  ): Promise<CandidateBusAttendantsResponseDto> {
    const plan = await this.prisma.routePlan.findUnique({
      where: { id: planId },
      include: { school: true },
    });

    if (!plan) {
      throw new NotFoundException('Không tìm thấy phương án tuyến');
    }

    if (currentUserSchoolId && plan.schoolId !== currentUserSchoolId) {
      throw new ForbiddenException(
        'Bạn chỉ có quyền xem danh sách giáo viên phụ xe của trường mình',
      );
    }

    const schoolAttendants = await this.prisma.user.findMany({
      where: {
        role: Role.BUS_ATTENDANT,
        schoolId: plan.schoolId,
      },
      orderBy: { fullName: 'asc' },
    });

    const candidates = schoolAttendants.map((a) => {
      let isEligible = true;
      let reason = `Khả dụng (Biên chế trường ${plan.school.name})`;

      if (!a.isActive) {
        isEligible = false;
        reason = 'Tài khoản giáo viên đã bị vô hiệu hóa';
      }

      return {
        id: a.id,
        fullName: a.fullName,
        phone: a.phone,
        isEligible,
        reason,
      };
    });

    return { candidates };
  }
}
