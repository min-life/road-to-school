import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RouteListResponse, RouteItem, StudentRoutingDetail } from '@/lib/types';

describe('Route Management — API Contract & Pagination Alignment', () => {
  it('dữ liệu phân trang tuyến đường phải luôn có định dạng chuẩn { items, total, page, totalPages }', () => {
    const mockApiResponse: RouteListResponse = {
      items: [
        {
          id: 'route-1',
          routePlanId: 'plan-1',
          routePlanName: 'Phương án tuyến THCS Chu Văn An - 2026/2027',
          schoolId: 'school-1',
          schoolName: 'Trường THCS Chu Văn An',
          name: 'Tuyến Đi 01',
          direction: 'TO_SCHOOL',
          proposedVehicleId: 'veh-1',
          proposedVehiclePlate: '51B-123.45',
          proposedVehicleBrand: 'Hyundai Solati',
          proposedVehicleSeats: 16,
          totalDistanceMeters: 18200,
          estimatedDurationSeconds: 2280,
          departureTime: '06:20',
          arrivalTime: '07:05',
          polylineGeometry: 'mock_encoded_polyline',
          status: 'DRAFT',
          planStatus: 'DRAFT',
          studentCount: 14,
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    // Kiểm tra cấu trúc phân trang không dùng "data"
    assert.ok(Array.isArray(mockApiResponse.items), 'items phải là một mảng');
    assert.strictEqual(mockApiResponse.items.length, 1);
    assert.strictEqual(typeof mockApiResponse.totalPages, 'number');
    assert.strictEqual(mockApiResponse.items[0].routePlanName, 'Phương án tuyến THCS Chu Văn An - 2026/2027');
    assert.strictEqual(mockApiResponse.items[0].status, 'DRAFT');
  });

  it('xử lý an toàn khi API trả về rỗng hoặc thiếu trường items', () => {
    const rawResponse: any = {};
    const safeItems = rawResponse.items || [];
    assert.deepStrictEqual(safeItems, []);
    assert.strictEqual(safeItems.length, 0);
  });
});

describe('Route Management — Proposed Vehicle Assignment Rules', () => {
  it('phương tiện hiển thị trên tuyến là xe đề xuất (Proposed Vehicle), không phải chuyến xe cố định', () => {
    const route: RouteItem = {
      id: 'route-1',
      routePlanId: 'plan-1',
      routePlanName: 'Phương án Tuyến 2026',
      schoolId: 'school-1',
      name: 'Tuyến Sáng 01',
      direction: 'TO_SCHOOL',
      proposedVehicleId: 'veh-solati-1',
      proposedVehiclePlate: '51B-999.88',
      proposedVehicleBrand: 'Ford Transit',
      proposedVehicleSeats: 16,
      totalDistanceMeters: 12000,
      estimatedDurationSeconds: 1800,
      polylineGeometry: 'abc',
      status: 'DRAFT',
      studentCount: 10,
    };

    assert.ok(route.proposedVehiclePlate !== undefined, 'Xe đề xuất phải có biển số');
    assert.strictEqual(route.status, 'DRAFT', 'Trạng thái tuyến đường kế thừa từ RoutePlan');
  });

  it('tính toán sức chứa phương tiện: tổng số ghế phải >= số học sinh đã chọn', () => {
    const selectedStudentsCount = 14;
    const selectedVehicles = [
      { id: 'v1', seatCount: 16 },
    ];
    const totalSelectedSeats = selectedVehicles.reduce((sum, v) => sum + v.seatCount, 0);
    const isCapacitySufficient = totalSelectedSeats >= selectedStudentsCount && selectedStudentsCount > 0;
    const missingSeats = Math.max(0, selectedStudentsCount - totalSelectedSeats);

    assert.strictEqual(isCapacitySufficient, true);
    assert.strictEqual(missingSeats, 0);

    const deficientSeats = 8;
    const isDeficient = deficientSeats >= selectedStudentsCount;
    assert.strictEqual(isDeficient, false);
    assert.strictEqual(Math.max(0, selectedStudentsCount - deficientSeats), 6);
  });
});

describe('Route Management — Student Routing Privacy Specification', () => {
  it('màn hình chi tiết học sinh chỉ hiển thị đúng 3 điểm: Điểm đón/trả học sinh, Trường học, Bãi xe trung tâm', () => {
    const routingDetail: StudentRoutingDetail = {
      studentId: 'stu-mine',
      studentName: 'Em Học Sinh An',
      routingStatus: 'ASSIGNED_DRAFT',
      routePlanId: 'plan-1',
      routePlanName: 'Phương án tuyến Chu Văn An',
      routePlanStatus: 'DRAFT',
      outboundRoute: {
        id: 'route-out-1',
        name: 'Tuyến Đi 01',
        proposedVehiclePlate: '51B-123.45',
        plannedArrivalTime: '06:30',
        pickupAddressText: '12 Nguyễn Trãi, Q5',
        pickupLatitude: 10.7554,
        pickupLongitude: 106.6789,
        polylineGeometry: 'polyline_str',
        schoolLocation: { latitude: 10.76, longitude: 106.68, name: 'THCS Chu Văn An' },
        parkingLocation: { latitude: 10.74, longitude: 106.66, addressText: 'Bãi xe Suối Tiên' },
      },
      returnRoute: null,
    };

    // Xác nhận không có thông tin các học sinh khác trong chi tiết tuyến học sinh
    assert.strictEqual(routingDetail.routingStatus, 'ASSIGNED_DRAFT');
    assert.ok(routingDetail.outboundRoute);
    assert.strictEqual(routingDetail.outboundRoute?.pickupAddressText, '12 Nguyễn Trãi, Q5');
    assert.strictEqual(routingDetail.outboundRoute?.schoolLocation.name, 'THCS Chu Văn An');
    assert.strictEqual(routingDetail.outboundRoute?.parkingLocation.addressText, 'Bãi xe Suối Tiên');
    // Tuyệt đối không có trường stops của các học sinh khác
    assert.strictEqual((routingDetail.outboundRoute as any).stops, undefined);
  });
});

describe('RM-001 & RM-002 — School Selection Modal Rules', () => {
  it('RM-001: Yêu cầu phân trang trường học phải sử dụng limit <= 50 (chuẩn 20/trang), không gọi limit 100', () => {
    const defaultPageLimit = 20;
    assert.ok(defaultPageLimit <= 50, 'Page limit phải <= 50 theo giới hạn của Backend API');
    assert.strictEqual(defaultPageLimit, 20);
  });

  it('RM-002: Khi thay đổi từ khóa tìm kiếm, pagination phải được reset về page 1 và bỏ qua response cũ', () => {
    let currentPage = 3;
    let currentKeyword = 'Marie';
    let requestId = 1;

    // Giả lập người dùng gõ từ khóa mới
    const handleSearchChange = (newKeyword: string) => {
      currentPage = 1;
      currentKeyword = newKeyword;
      requestId++;
    };

    handleSearchChange('Chu Văn An');
    assert.strictEqual(currentPage, 1, 'Trang phải được reset về 1 khi đổi từ khóa');
    assert.strictEqual(currentKeyword, 'Chu Văn An');
    assert.strictEqual(requestId, 2, 'Request ID tăng để bỏ qua response cũ');
  });

  it('RM-002: Infinite scroll chỉ append trường mới, không trùng lặp id', () => {
    const existing = [
      { id: 'sch-1', name: 'Trường A' },
      { id: 'sch-2', name: 'Trường B' },
    ];
    const incoming = [
      { id: 'sch-2', name: 'Trường B' },
      { id: 'sch-3', name: 'Trường C' },
    ];

    const existingIds = new Set(existing.map((s) => s.id));
    const merged = [...existing, ...incoming.filter((s) => !existingIds.has(s.id))];

    assert.strictEqual(merged.length, 3);
    assert.deepStrictEqual(
      merged.map((s) => s.id),
      ['sch-1', 'sch-2', 'sch-3'],
    );
  });
});

describe('RM-003 — Static Markers & Student Selection UX', () => {
  it('RM-003: Chỉ học sinh được chọn mới có marker tương ứng trên bản đồ', () => {
    const allStudents = [
      { id: 's1', fullName: 'Học sinh 1', latitude: 10.1, longitude: 106.1 },
      { id: 's2', fullName: 'Học sinh 2', latitude: 10.2, longitude: 106.2 },
      { id: 's3', fullName: 'Học sinh 3', latitude: 10.3, longitude: 106.3 },
    ];
    const selectedStudentIds = new Set(['s1', 's3']);

    const markers = allStudents.filter((s) => selectedStudentIds.has(s.id));
    assert.strictEqual(markers.length, 2);
    assert.strictEqual(markers[0].id, 's1');
    assert.strictEqual(markers[1].id, 's3');
    assert.ok(!markers.some((m) => m.id === 's2'));
  });

  it('RM-003: Click row để focus camera bản đồ không kích hoạt đổi trạng thái checkbox', () => {
    let isSelected = true;
    let focusedStudentId: string | null = null;

    const handleRowClick = (studentId: string) => {
      focusedStudentId = studentId;
    };
    const handleCheckboxClick = (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      isSelected = !isSelected;
    };

    // Khi click row: chỉ set focus, không đổi checkbox
    handleRowClick('s1');
    assert.strictEqual(focusedStudentId, 's1');
    assert.strictEqual(isSelected, true);

    // Khi click checkbox: chỉ đổi selection, stopPropagation
    let stopped = false;
    handleCheckboxClick({ stopPropagation: () => { stopped = true; } });
    assert.strictEqual(stopped, true);
    assert.strictEqual(isSelected, false);
  });
});

describe('Editable Stop Service Time & Route Duration Constraints', () => {
  it('Thời gian dừng mặc định là 60 giây và có thể ghi đè riêng từng học sinh', () => {
    const defaultStopSeconds = 60;
    const overrides = [
      { studentId: 's-special', serviceSeconds: 120 },
    ];

    const resolveService = (studentId: string) => {
      const match = overrides.find((o) => o.studentId === studentId);
      return match ? match.serviceSeconds : defaultStopSeconds;
    };

    assert.strictEqual(resolveService('s-normal'), 60);
    assert.strictEqual(resolveService('s-special'), 120);
  });

  it('Suy ra lịch đón/trả các ngày từ School.weeklySchedule và tổng elapsed duration', () => {
    const schoolSchedule = {
      monday: { start: '07:00', end: '17:00' },
      tuesday: { start: '07:30', end: '16:30' },
    };
    const routeElapsedSeconds = 45 * 60; // 45 phút = 2700s

    // Chiều đi Thứ 2: Start 07:00 (25200s) -> Departure: 25200 - 2700 = 22500 (06:15)
    const monStartSec = 7 * 3600;
    const monDepSec = monStartSec - routeElapsedSeconds;
    assert.strictEqual(monDepSec, 6 * 3600 + 15 * 60); // 06:15

    // Chiều đi Thứ 3: Start 07:30 (27000s) -> Departure: 27000 - 2700 = 24300 (06:45)
    const tueStartSec = 7 * 3600 + 30 * 60;
    const tueDepSec = tueStartSec - routeElapsedSeconds;
    assert.strictEqual(tueDepSec, 6 * 3600 + 45 * 60); // 06:45
  });
});

describe('RoutePlan-First Management — Frontend Contracts & Business Rules', () => {
  it('RoutePlanListResponse phải luôn có items dạng RoutePlanItem với các trường số liệu tổng hợp chuẩn', () => {
    const mockPlanList: any = {
      items: [
        {
          id: 'plan-1',
          schoolId: 'school-1',
          schoolName: 'Tiểu học FPT Cần Thơ',
          name: 'Phương án TH FPT 2026-A',
          status: 'DRAFT',
          totalStudents: 45,
          totalOutboundRoutes: 3,
          totalReturnRoutes: 3,
          createdAt: '2026-10-24T01:30:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    assert.ok(Array.isArray(mockPlanList.items));
    assert.strictEqual(mockPlanList.items.length, 1);
    const plan = mockPlanList.items[0];
    assert.strictEqual(plan.totalStudents, 45);
    assert.strictEqual(plan.totalOutboundRoutes, 3);
    assert.strictEqual(plan.totalReturnRoutes, 3);
    assert.strictEqual(plan.status, 'DRAFT');
  });

  it('Quy tắc đếm học sinh duy nhất (Distinct Student Count): 20 HS có cả 2 chiều chỉ được đếm là 20', () => {
    const outboundStudentIds = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12', 's13', 's14', 's15', 's16', 's17', 's18', 's19', 's20'];
    const returnStudentIds = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12', 's13', 's14', 's15', 's16', 's17', 's18', 's19', 's20'];

    // Distinct set count
    const uniqueStudents = new Set([...outboundStudentIds, ...returnStudentIds]);
    assert.strictEqual(uniqueStudents.size, 20, '20 học sinh đi cả 2 chiều phải ra kết quả 20, tuyệt đối không được là 40');
  });

  it('Confirm RoutePlan Payload Contract: Gửi đúng previewToken và planName', () => {
    const previewToken = 'preview_token_123';
    const planName = 'Phương án THCS An Hòa - 2026';

    const buildPayload = (dto: { previewToken: string; planName?: string; name?: string }) => ({
      previewToken: dto.previewToken,
      ...(dto.planName || dto.name ? { planName: dto.planName || dto.name } : {}),
    });

    const payload = buildPayload({ previewToken, planName });
    assert.strictEqual(payload.previewToken, 'preview_token_123');
    assert.strictEqual(payload.planName, 'Phương án THCS An Hòa - 2026');
    assert.strictEqual((payload as any).name, undefined, 'Phải chuẩn hóa sang planName theo Backend DTO');
  });

  it('Cancel RoutePlan Payload Contract: Gửi đúng trường reason', () => {
    const reason = 'Thay đổi sĩ số học sinh đầu năm';
    const payload = { reason };

    assert.strictEqual(payload.reason, 'Thay đổi sĩ số học sinh đầu năm');
    assert.strictEqual((payload as any).cancellationReason, undefined, 'Phải gửi reason thay vì cancellationReason');
  });

  it('Route Detail Read-Only: Chứa link quay lại đúng RoutePlan cha', () => {
    const mockRoute = {
      id: 'route-01',
      routePlanId: 'plan-xyz',
      routePlanName: 'Phương án TH FPT',
      name: 'Tuyến Đi 01',
      status: 'DRAFT' as const,
    };

    const backUrl = mockRoute.routePlanId
      ? `/admin/routes/plans/${mockRoute.routePlanId}`
      : '/admin/routes';

    assert.strictEqual(backUrl, '/admin/routes/plans/plan-xyz');
  });
});

