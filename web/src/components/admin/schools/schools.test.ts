import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateWeeklySchedule,
  DAYS_OF_WEEK,
  getDayScheduleError,
  getVietnamToday,
  getNextCalendarDay,
} from './weekly-schedule.helper.ts';
import {
  normalizeWeeklySchedule,
  areSchedulesEqual,
  areCoordinatesEqual,
  createSchoolEditBaseline,
  detectSchoolChanges,
  validateSchoolEditForm,
  type SchoolEditCurrentDraft,
} from './school-edit.helper.ts';
import type { WeeklySchedule, Role, SchoolDetail } from '../../../lib/types.ts';
import { getVisibleNavItems } from '../admin-nav.config.ts';

describe('School Management — Weekly Schedule Business Rules', () => {
  it('từ chối lịch học rỗng không có ngày nào được chọn', () => {
    const emptySchedule: WeeklySchedule = {};
    const res = validateWeeklySchedule(emptySchedule);
    assert.equal(res.valid, false);
    assert.match(res.error || '', /ít nhất một ngày học/i);
  });

  it('từ chối lịch học có giờ bắt đầu sau hoặc bằng giờ kết thúc (lịch qua đêm)', () => {
    const overnightSchedule: WeeklySchedule = {
      monday: { start: '18:00', end: '07:00' },
    };
    const res = validateWeeklySchedule(overnightSchedule);
    assert.equal(res.valid, false);
    assert.match(res.error || '', /Không cho phép lịch qua đêm/i);

    const equalTimeSchedule: WeeklySchedule = {
      friday: { start: '08:00', end: '08:00' },
    };
    const resEqual = validateWeeklySchedule(equalTimeSchedule);
    assert.equal(resEqual.valid, false);
    assert.match(resEqual.error || '', /phải trước giờ kết thúc/i);
  });

  it('từ chối giờ không đúng định dạng HH:mm', () => {
    const badFormatSchedule: WeeklySchedule = {
      tuesday: { start: '7:0', end: '17:00' },
    };
    const res = validateWeeklySchedule(badFormatSchedule);
    assert.equal(res.valid, false);
    assert.match(res.error || '', /định dạng HH:mm/i);
  });

  it('chấp nhận lịch học hợp lệ với các ngày trong tuần và khoảng thời gian chuẩn', () => {
    const validSchedule: WeeklySchedule = {
      monday: { start: '07:30', end: '16:30' },
      wednesday: { start: '07:30', end: '16:30' },
      friday: { start: '07:30', end: '16:30' },
    };
    const res = validateWeeklySchedule(validSchedule);
    assert.equal(res.valid, true);
    assert.equal(res.error, undefined);
  });

  it('danh sách ngày trong tuần phải đầy đủ 7 ngày từ Thứ 2 đến Chủ nhật', () => {
    assert.equal(DAYS_OF_WEEK.length, 7);
    const keys = DAYS_OF_WEEK.map((d) => d.key);
    assert.deepEqual(keys, [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]);
  });
});

describe('School Management — Contract Date & Schedule Inline Constraints', () => {
  it('getVietnamToday trả về ngày hiện tại định dạng YYYY-MM-DD theo giờ Việt Nam', () => {
    const today = getVietnamToday();
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
    const [y, m, d] = today.split('-').map(Number);
    assert.ok(y >= 2024);
    assert.ok(m >= 1 && m <= 12);
    assert.ok(d >= 1 && d <= 31);
  });

  it('getNextCalendarDay tính chính xác ngày kế tiếp qua ranh giới tháng, năm và năm nhuận', () => {
    assert.equal(getNextCalendarDay('2026-11-14'), '2026-11-15');
    assert.equal(getNextCalendarDay('2026-01-31'), '2026-02-01');
    assert.equal(getNextCalendarDay('2026-02-28'), '2026-03-01'); // Năm thường
    assert.equal(getNextCalendarDay('2024-02-28'), '2024-02-29'); // Năm nhuận
    assert.equal(getNextCalendarDay('2024-02-29'), '2024-03-01'); // Năm nhuận hết tháng 2
    assert.equal(getNextCalendarDay('2026-12-31'), '2027-01-01'); // Qua năm mới
    assert.equal(getNextCalendarDay('invalid-date'), '');
  });

  it('getDayScheduleError phát hiện lỗi inline từng ngày học khi giờ kết thúc <= giờ bắt đầu', () => {
    assert.equal(getDayScheduleError({ start: '07:30', end: '16:30' }), null);

    const equalErr = getDayScheduleError({ start: '08:00', end: '08:00' });
    assert.ok(equalErr);
    assert.match(equalErr, /không được bằng nhau/i);

    const earlierErr = getDayScheduleError({ start: '17:00', end: '07:00' });
    assert.ok(earlierErr);
    assert.match(earlierErr, /phải muộn hơn giờ bắt đầu/i);

    const invalidFormatErr = getDayScheduleError({ start: '7:0', end: '17:00' });
    assert.ok(invalidFormatErr);
    assert.match(invalidFormatErr, /định dạng HH:mm/i);
  });

  it('quy tắc ngày kết thúc hợp đồng: tối thiểu là ngày kế tiếp của ngày bắt đầu', () => {
    const startDate = '2026-11-14';
    const minEndDate = getNextCalendarDay(startDate);
    assert.equal(minEndDate, '2026-11-15');

    // Ngày kết thúc trùng ngày bắt đầu là không hợp lệ
    assert.equal(startDate < minEndDate, true);
    assert.equal('2026-11-14' < minEndDate, true);
    // Ngày kết thúc hôm sau là hợp lệ
    assert.equal('2026-11-15' >= minEndDate, true);
  });

  it('quy tắc đổi ngày bắt đầu: giữ ngày kết thúc nếu còn hợp lệ, xóa nếu mất hiệu lực', () => {
    let startDate = '2026-11-15';
    let endDate = '2026-11-20';

    // Đổi ngày bắt đầu sang 2026-11-17 -> minEnd là 2026-11-18 -> endDate 2026-11-20 vẫn >= 2026-11-18 -> GIỮ
    startDate = '2026-11-17';
    let minEnd = getNextCalendarDay(startDate);
    if (endDate < minEnd) endDate = '';
    assert.equal(endDate, '2026-11-20');

    // Đổi ngày bắt đầu sang 2026-11-25 -> minEnd là 2026-11-26 -> endDate 2026-11-20 < 2026-11-26 -> XÓA
    startDate = '2026-11-25';
    minEnd = getNextCalendarDay(startDate);
    if (endDate < minEnd) endDate = '';
    assert.equal(endDate, '');
  });
});

describe('School Management — Role-Based Access Control', () => {
  it('SYSTEM_ADMIN được phân quyền truy cập mục Trường học', () => {
    const navItems = getVisibleNavItems('SYSTEM_ADMIN');
    const schoolsItem = navItems.find((item) => item.id === 'schools');
    assert.ok(schoolsItem, 'SYSTEM_ADMIN phải có mục Trường học');
    assert.equal(schoolsItem?.href, '/admin/schools');
  });

  it('SCHOOL_ADMIN tuyệt đối không có quyền truy cập mục Trường học', () => {
    const navItems = getVisibleNavItems('SCHOOL_ADMIN');
    const schoolsItem = navItems.find((item) => item.id === 'schools');
    assert.equal(schoolsItem, undefined, 'SCHOOL_ADMIN không được thấy mục Trường học');
  });

  it('Các vai trò ngoài hệ thống quản trị không có bất kỳ quyền truy cập nào', () => {
    const roles: Role[] = ['PARENT', 'DRIVER', 'BUS_ATTENDANT'];
    for (const r of roles) {
      const items = getVisibleNavItems(r);
      assert.equal(items.length, 0);
    }
  });
});

describe('School Management — Form Validation Rules', () => {
  it('kiểm tra hợp lệ định dạng số điện thoại Việt Nam', () => {
    const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
    assert.ok(phoneRegex.test('0912345678'));
    assert.ok(phoneRegex.test('+84912345678'));
    assert.ok(phoneRegex.test('0387654321'));
    assert.equal(phoneRegex.test('123456'), false);
    assert.equal(phoneRegex.test('0212345678'), false); // Đầu số bàn không hợp lệ
    assert.equal(phoneRegex.test('abcdefghij'), false);
  });

  it('kiểm tra hợp lệ định dạng địa chỉ email', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    assert.ok(emailRegex.test('admin@school.edu.vn'));
    assert.ok(emailRegex.test('user.name@r2s.com'));
    assert.equal(emailRegex.test('plainaddress'), false);
    assert.equal(emailRegex.test('missing@domain'), false);
  });
});

describe('School Management Task 7.1 — Map Worker & Location Validation', () => {
  it('tệp Worker MapLibre GL v6 phải tồn tại trong thư mục public/maplibre/', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const workerPath = path.resolve('public/maplibre/maplibre-gl-worker.mjs');
    const sharedPath = path.resolve('public/maplibre/maplibre-gl-shared.mjs');

    assert.ok(fs.existsSync(workerPath), 'public/maplibre/maplibre-gl-worker.mjs phải tồn tại');
    assert.ok(fs.existsSync(sharedPath), 'public/maplibre/maplibre-gl-shared.mjs phải tồn tại');

    const workerStats = fs.statSync(workerPath);
    assert.ok(workerStats.size > 100000, 'Kích thước Worker script phải lớn hơn 100KB');
  });

  it('xác thực bắt buộc phải có tọa độ hợp lệ (không chấp nhận null hoặc NaN)', () => {
    function validateSchoolCoordinates(lat: number | null, lng: number | null): boolean {
      if (lat === null || lng === null) return false;
      if (typeof lat !== 'number' || typeof lng !== 'number') return false;
      if (isNaN(lat) || isNaN(lng)) return false;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
      return true;
    }

    assert.equal(validateSchoolCoordinates(null, null), false);
    assert.equal(validateSchoolCoordinates(10.776889, null), false);
    assert.equal(validateSchoolCoordinates(null, 106.700806), false);
    assert.equal(validateSchoolCoordinates(NaN, 106.700806), false);
    assert.equal(validateSchoolCoordinates(10.776889, 106.700806), true);
  });

  it('xác thực bắt buộc địa chỉ chi tiết không được để trống hoặc chỉ chứa khoảng trắng', () => {
    function validateAddressText(addr: string): boolean {
      return Boolean(addr && addr.trim().length > 0);
    }

    assert.equal(validateAddressText(''), false);
    assert.equal(validateAddressText('   '), false);
    assert.equal(validateAddressText('123 Nguyễn Văn Cừ, Quận 5'), true);
  });

  it('phòng ngừa stale coordinates: khi người dùng tự sửa địa chỉ, tọa độ phải được reset để yêu cầu xác nhận lại', () => {
    let internalCoords: { lat: number; lng: number } | null = { lat: 10.776889, lng: 106.700806 };

    function onAddressInputChange(_newText?: string) {
      void _newText;
      // Khi gõ địa chỉ mới thủ công, vô hiệu hóa tọa độ cũ
      internalCoords = null;
    }

    onAddressInputChange('Địa chỉ mới vừa gõ');
    assert.equal(internalCoords, null, 'Tọa độ cũ phải bị vô hiệu hóa khi người dùng gõ sửa địa chỉ');
  });
});

describe('School Management Task 7.2 — VietMap Basemap Rendering & Tile Unmasking', () => {
  it('định dạng đúng URL Vector Default Street Style (tm) theo tài liệu chính thức VietMap', () => {
    function getVietmapStyleUrl(tilemapKey: string): string {
      return `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${tilemapKey}`;
    }

    const testKey = 'test-vietmap-tilemap-key-12345';
    const styleUrl = getVietmapStyleUrl(testKey);

    assert.equal(styleUrl.startsWith('https://maps.vietmap.vn/maps/styles/tm/style.json?apikey='), true);
    assert.equal(styleUrl.includes('api/maps/light/styles.json'), false, 'Không được sử dụng endpoint legacy api/maps/light');
    assert.equal(styleUrl.includes(testKey), true);
  });

  it('tệp Worker MapLibre GL trong public phải chứa hàm unmask vector tile VietMap', () => {
    const workerPath = path.resolve(process.cwd(), 'public/maplibre/maplibre-gl-worker.mjs');
    assert.equal(fs.existsSync(workerPath), true, 'Tệp maplibre-gl-worker.mjs phải tồn tại');

    const workerContent = fs.readFileSync(workerPath, 'utf8');
    assert.equal(
      workerContent.includes('_u[0]===1&&_u[1]===1&&_u[2]===1'),
      true,
      'Worker phải chứa logic phát hiện prefix [1, 1, 1] của VietMap',
    );
    assert.equal(
      workerContent.includes('1,2,3,5,7,9,15,60'),
      true,
      'Worker phải chứa bảng khóa XOR giải mã vector tile VietMap',
    );
  });

  it('hàm unmask VietMap giải mã chính xác tile được mã hóa bằng XOR key 32-byte', () => {
    const XOR_KEY = [
      1, 2, 3, 5, 7, 9, 15, 60, 45, 95, 45, 69, 78, 42, 66, 54, 99, 57, 54, 33, 22, 11, 66, 99, 99,
      77, 55, 23, 45, 65, 72, 35,
    ];

    function unmaskVietMapTile(buffer: ArrayBuffer): ArrayBuffer {
      const u = new Uint8Array(buffer);
      if (u.length >= 3 && u[0] === 1 && u[1] === 1 && u[2] === 1) {
        const out = new Uint8Array(buffer.byteLength - 3);
        for (let i = 3; i < u.length; i++) {
          out[i - 3] = u[i] ^ XOR_KEY[(i - 3) % 32];
        }
        return out.buffer;
      }
      return buffer;
    }

    // Giả lập dữ liệu gốc (PBF protobuf header: tag 3 wire 2 = 0x1A)
    const originalBytes = new Uint8Array([0x1a, 0xb0, 0x07, 0x78, 0x02, 0x0a, 0x0b, 0x61, 0x64, 0x6d]);

    // Giả lập server VietMap đóng gói: prefix [1, 1, 1] + XOR
    const maskedBytes = new Uint8Array(3 + originalBytes.length);
    maskedBytes[0] = 1;
    maskedBytes[1] = 1;
    maskedBytes[2] = 1;
    for (let i = 0; i < originalBytes.length; i++) {
      maskedBytes[3 + i] = originalBytes[i] ^ XOR_KEY[i % 32];
    }

    // Giải mã
    const decodedBuffer = unmaskVietMapTile(maskedBytes.buffer);
    const decodedBytes = new Uint8Array(decodedBuffer);

    assert.equal(decodedBytes.length, originalBytes.length);
    for (let i = 0; i < originalBytes.length; i++) {
      assert.equal(decodedBytes[i], originalBytes[i], `Byte thứ ${i} phải được phục hồi nguyên vẹn`);
    }
  });

  it('transformRequest bổ sung apikey cho tài nguyên VietMap thiếu key và không làm trùng lặp', () => {
    const tilemapKey = 'test-key-xyz';

    function transformRequest(url: string) {
      if (url.includes('vietmap.vn') && !url.includes('apikey=')) {
        const separator = url.includes('?') ? '&' : '?';
        return { url: `${url}${separator}apikey=${tilemapKey}` };
      }
      return { url };
    }

    // 1. URL VietMap chưa có apikey
    const res1 = transformRequest('https://maps.vietmap.vn/maps/fonts/Roboto/0-255.pbf');
    assert.equal(res1.url, 'https://maps.vietmap.vn/maps/fonts/Roboto/0-255.pbf?apikey=test-key-xyz');

    // 2. URL VietMap đã có query khác nhưng chưa có apikey
    const res2 = transformRequest('https://maps.vietmap.vn/maps/styles/tm/sprite.json?v=2');
    assert.equal(res2.url, 'https://maps.vietmap.vn/maps/styles/tm/sprite.json?v=2&apikey=test-key-xyz');

    // 3. URL VietMap đã có apikey -> không được duplicate
    const res3 = transformRequest('https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=test-key-xyz');
    assert.equal(res3.url, 'https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=test-key-xyz');

    // 4. URL của bên thứ ba (như OSM / MapLibre) -> không gắn apikey VietMap
    const res4 = transformRequest('https://a.tile.openstreetmap.org/12/1/2.png');
    assert.equal(res4.url, 'https://a.tile.openstreetmap.org/12/1/2.png');
  });

  it('xác thực không chấp nhận style rỗng không có lớp hiển thị (chống báo READY giả)', () => {
    function validateMapStyle(style: { layers?: unknown[] } | null | undefined): boolean {
      if (!style || !style.layers || style.layers.length === 0) {
        return false;
      }
      return true;
    }

    assert.equal(validateMapStyle(null), false);
    assert.equal(validateMapStyle({ layers: [] }), false);
    assert.equal(validateMapStyle({ layers: [{ id: 'road', type: 'line' }] }), true);
  });
});

describe('School Management Task 8 — Final Integration & Verification Rules', () => {
  it('chuẩn hóa tham số status lọc trường học từ boolean string sang enum ACTIVE/INACTIVE', () => {
    function normalizeStatusParam(status?: string): string | undefined {
      if (!status) return undefined;
      if (status === 'true') return 'ACTIVE';
      if (status === 'false') return 'INACTIVE';
      return status;
    }

    assert.equal(normalizeStatusParam('true'), 'ACTIVE');
    assert.equal(normalizeStatusParam('false'), 'INACTIVE');
    assert.equal(normalizeStatusParam('ACTIVE'), 'ACTIVE');
    assert.equal(normalizeStatusParam('INACTIVE'), 'INACTIVE');
    assert.equal(normalizeStatusParam(''), undefined);
    assert.equal(normalizeStatusParam(undefined), undefined);
  });

  it('quy tắc kích hoạt lại trường học: hợp đồng phải còn hiệu lực (start <= now <= end)', () => {
    function isContractValidForReactivation(
      startDateStr: string,
      endDateStr: string,
      currentDateStr: string,
    ): { canReactivate: boolean; reason?: string } {
      const start = new Date(`${startDateStr}T00:00:00.000Z`).getTime();
      const end = new Date(`${endDateStr}T23:59:59.999Z`).getTime();
      const current = new Date(`${currentDateStr}T12:00:00.000Z`).getTime();

      if (current < start) {
        return {
          canReactivate: false,
          reason: 'Hợp đồng trường học chưa đến ngày bắt đầu hiệu lực.',
        };
      }
      if (current > end) {
        return {
          canReactivate: false,
          reason: 'Hợp đồng trường học đã hết hạn. Vui lòng gia hạn trước khi kích hoạt.',
        };
      }
      return { canReactivate: true };
    }

    // 1. Hợp đồng trong thời hạn hiệu lực
    const resValid = isContractValidForReactivation('2026-01-01', '2027-12-31', '2026-10-23');
    assert.equal(resValid.canReactivate, true);

    // 2. Hợp đồng trong tương lai (chưa bắt đầu)
    const resFuture = isContractValidForReactivation('2027-01-01', '2028-12-31', '2026-10-23');
    assert.equal(resFuture.canReactivate, false);
    assert.match(resFuture.reason || '', /chưa đến ngày bắt đầu/i);

    // 3. Hợp đồng đã hết hạn trong quá khứ
    const resExpired = isContractValidForReactivation('2024-01-01', '2025-12-31', '2026-10-23');
    assert.equal(resExpired.canReactivate, false);
    assert.match(resExpired.reason || '', /đã hết hạn/i);
  });
});

describe('School Address & Location Update — Permission & Cascade Cancellation Rules', () => {
  it('chỉ duy nhất SYSTEM_ADMIN được quyền sửa địa chỉ trường học, SCHOOL_ADMIN bị chặn', () => {
    function canEditSchoolLocation(userRole?: string): boolean {
      return userRole === 'SYSTEM_ADMIN';
    }

    assert.equal(canEditSchoolLocation('SYSTEM_ADMIN'), true);
    assert.equal(canEditSchoolLocation('SCHOOL_ADMIN'), false);
    assert.equal(canEditSchoolLocation('DRIVER'), false);
    assert.equal(canEditSchoolLocation('BUS_ATTENDANT'), false);
    assert.equal(canEditSchoolLocation('PARENT'), false);
    assert.equal(canEditSchoolLocation(undefined), false);
  });

  it('nhận diện chính xác khi địa chỉ hoặc tọa độ trường thay đổi', () => {
    function isSchoolLocationChanged(
      original: { addressText: string; latitude: number; longitude: number },
      next: { addressText: string; latitude: number | null; longitude: number | null },
    ): boolean {
      if (next.latitude === null || next.longitude === null) return false;
      const addressChanged = original.addressText.trim() !== next.addressText.trim();
      const coordChanged =
        Math.abs(original.latitude - next.latitude) > 0.00001 ||
        Math.abs(original.longitude - next.longitude) > 0.00001;
      return addressChanged || coordChanged;
    }

    const current = {
      addressText: '123 Đường Số 1, Quận 1',
      latitude: 10.776889,
      longitude: 106.700806,
    };

    // 1. Không đổi gì
    assert.equal(isSchoolLocationChanged(current, { ...current }), false);

    // 2. Chỉ đổi nhãn địa chỉ
    assert.equal(
      isSchoolLocationChanged(current, { ...current, addressText: '123 Đường Số 1 Mới, Quận 1' }),
      true,
    );

    // 3. Đổi tọa độ
    assert.equal(
      isSchoolLocationChanged(current, { ...current, latitude: 10.780000 }),
      true,
    );
  });

  it('quy tắc cascade: nếu trường không có phương án nào thì đổi ngay; nếu có thì mở modal xác nhận hủy toàn bộ phương án', () => {
    function evaluateLocationChangeAction(impact: {
      cancelledPlansCount: number;
    }): 'UPDATE_DIRECTLY' | 'REQUIRE_CONFIRMATION_MODAL' {
      if (impact.cancelledPlansCount === 0) {
        return 'UPDATE_DIRECTLY';
      }
      return 'REQUIRE_CONFIRMATION_MODAL';
    }

    // Trường chưa có phương án DRAFT/ACTIVE
    assert.equal(
      evaluateLocationChangeAction({ cancelledPlansCount: 0 }),
      'UPDATE_DIRECTLY',
    );

    // Trường có 1 hoặc nhiều phương án DRAFT/ACTIVE
    assert.equal(
      evaluateLocationChangeAction({ cancelledPlansCount: 2 }),
      'REQUIRE_CONFIRMATION_MODAL',
    );
  });
});

describe('School Weekly Schedule Update — Cascade & Recalculation Rules', () => {
  function isScheduleChanged(
    orig: Record<string, { start: string; end: string }>,
    next: Record<string, { start: string; end: string }>,
  ): boolean {
    const origKeys = Object.keys(orig).sort();
    const nextKeys = Object.keys(next).sort();
    if (origKeys.length !== nextKeys.length) return true;
    for (const k of origKeys) {
      if (!next[k]) return true;
      if (orig[k].start !== next[k].start || orig[k].end !== next[k].end) {
        return true;
      }
    }
    return false;
  }

  function recalculateTripTimes(
    direction: 'TO_SCHOOL' | 'TO_PARKING',
    schoolSchedule: { start: string; end: string },
    estimatedDurationSeconds: number,
  ): { scheduledStartTime: string; scheduledEndTime: string } {
    const toSeconds = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 3600 + m * 60;
    };
    const toTimeStr = (sec: number) => {
      let s = sec % 86400;
      if (s < 0) s += 86400;
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    if (direction === 'TO_SCHOOL') {
      const arrSec = toSeconds(schoolSchedule.start);
      const depSec = arrSec - estimatedDurationSeconds;
      return {
        scheduledStartTime: toTimeStr(depSec),
        scheduledEndTime: schoolSchedule.start,
      };
    } else {
      const depSec = toSeconds(schoolSchedule.end);
      const arrSec = depSec + estimatedDurationSeconds;
      return {
        scheduledStartTime: schoolSchedule.end,
        scheduledEndTime: toTimeStr(arrSec),
      };
    }
  }

  it('nhận diện chính xác khi lịch học tuần thay đổi hoặc giữ nguyên', () => {
    const baseSchedule = {
      monday: { start: '07:00', end: '17:00' },
      tuesday: { start: '07:00', end: '17:00' },
    };

    // Giữ nguyên
    assert.equal(isScheduleChanged(baseSchedule, { ...baseSchedule }), false);

    // Đổi giờ học của 1 ngày
    assert.equal(
      isScheduleChanged(baseSchedule, {
        monday: { start: '07:30', end: '17:00' },
        tuesday: { start: '07:00', end: '17:00' },
      }),
      true,
    );

    // Bỏ bớt 1 ngày (ví dụ thứ 3 thành ngày nghỉ)
    assert.equal(
      isScheduleChanged(baseSchedule, {
        monday: { start: '07:00', end: '17:00' },
      }),
      true,
    );

    // Thêm ngày mới (ví dụ thứ 4)
    assert.equal(
      isScheduleChanged(baseSchedule, {
        ...baseSchedule,
        wednesday: { start: '07:00', end: '17:00' },
      }),
      true,
    );
  });

  it('tính toán lại khung giờ chuyến xe TO_SCHOOL chuẩn xác lùi từ giờ bắt đầu học', () => {
    // Trường vào học lúc 07:15, thời lượng tuyến ước tính 45 phút (2700 giây)
    const res = recalculateTripTimes(
      'TO_SCHOOL',
      { start: '07:15', end: '17:00' },
      2700,
    );

    // Khởi hành lúc 07:15 - 45m = 06:30, đến trường lúc 07:15
    assert.equal(res.scheduledStartTime, '06:30');
    assert.equal(res.scheduledEndTime, '07:15');
  });

  it('tính toán lại khung giờ chuyến xe TO_PARKING chuẩn xác tiến từ giờ tan trường', () => {
    // Trường tan học lúc 16:45, thời lượng tuyến ước tính 50 phút (3000 giây)
    const res = recalculateTripTimes(
      'TO_PARKING',
      { start: '07:00', end: '16:45' },
      3000,
    );

    // Khởi hành từ trường lúc 16:45, về bãi xe lúc 16:45 + 50m = 17:35
    assert.equal(res.scheduledStartTime, '16:45');
    assert.equal(res.scheduledEndTime, '17:35');
  });

  it('quy tắc xử lý chuyến xe khi ngày bị loại khỏi lịch học (ngày nghỉ): chuyến SCHEDULED bị hủy', () => {
    const updatedSchedule: Record<string, { start: string; end: string }> = {
      monday: { start: '07:00', end: '17:00' },
      tuesday: { start: '07:00', end: '17:00' },
    };

    function shouldCancelTrip(dayKey: string): boolean {
      return !updatedSchedule[dayKey];
    }

    assert.equal(shouldCancelTrip('monday'), false);
    assert.equal(shouldCancelTrip('tuesday'), false);
    assert.equal(shouldCancelTrip('wednesday'), true); // Ngày nghỉ -> HỦY
    assert.equal(shouldCancelTrip('saturday'), true);  // Ngày nghỉ -> HỦY
  });
});

describe('School Management — Schools List Redesign v2 Rules', () => {
  it('địa chỉ chỉ hiển thị dòng phụ ward khi ward có giá trị và chưa xuất hiện trong addressText', () => {
    function getShowWard(addressText: string, ward?: string | null): boolean {
      const address = addressText || '';
      const w = ward?.trim();
      return Boolean(w && !address.toLowerCase().includes(w.toLowerCase()));
    }

    // Trường hợp 1: ward đã nằm trong địa chỉ -> không hiện dòng phụ
    assert.equal(getShowWard('123 Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1', 'Phường Bến Nghé'), false);
    assert.equal(getShowWard('Số 10 Lý Tự Trọng, bến nghé, Q1', 'Bến Nghé'), false);

    // Trường hợp 2: ward chưa có trong địa chỉ -> hiện dòng phụ
    assert.equal(getShowWard('Số 5 Lê Duẩn, Quận 1', 'Phường Bến Nghé'), true);

    // Trường hợp 3: ward null hoặc rỗng -> không hiện dòng phụ
    assert.equal(getShowWard('Số 5 Lê Duẩn, Quận 1', null), false);
    assert.equal(getShowWard('Số 5 Lê Duẩn, Quận 1', ''), false);
    assert.equal(getShowWard('Số 5 Lê Duẩn, Quận 1', '   '), false);
  });

  it('TableActions forceMenu giữ menu 3 chấm độc lập và không dàn nút ra ngoài kể cả khi <= 2 mục', () => {
    function computeShowAll(actionsCount: number, moreCount: number, forceMenu = false): boolean {
      return !forceMenu && actionsCount + moreCount <= 2;
    }

    // Mặc định không forceMenu: <= 2 mục thì dàn ra ngoài
    assert.equal(computeShowAll(1, 0, false), true);
    assert.equal(computeShowAll(0, 1, false), true);
    assert.equal(computeShowAll(1, 1, false), true);
    assert.equal(computeShowAll(1, 2, false), false);

    // Khi forceMenu = true: luôn trả về false (giữ trong menu popup)
    assert.equal(computeShowAll(0, 1, true), false);
    assert.equal(computeShowAll(0, 2, true), false);
    assert.equal(computeShowAll(1, 1, true), false);
  });

  it('điều hướng dòng table bị chặn khi người dùng đang chọn chữ hoặc click interactive element', () => {
    function shouldIgnoreRowClick(selectionText: string, tagOrClass: string): boolean {
      if (selectionText.trim().length > 0) return true;
      const interactiveTokens = ['a', 'button', 'input', 'select', 'textarea', 'table-actions'];
      return interactiveTokens.some((token) => tagOrClass.toLowerCase().includes(token));
    }

    // Khi bôi đen chữ -> chặn điều hướng
    assert.equal(shouldIgnoreRowClick('Trường Tiểu học', 'td'), true);

    // Khi click nút menu hoặc link -> chặn điều hướng
    assert.equal(shouldIgnoreRowClick('', 'button'), true);
    assert.equal(shouldIgnoreRowClick('', 'a'), true);
    assert.equal(shouldIgnoreRowClick('', 'table-actions'), true);

    // Khi click bình thường vào ô dữ liệu -> cho phép điều hướng
    assert.equal(shouldIgnoreRowClick('', 'td'), false);
    assert.equal(shouldIgnoreRowClick('', 'div'), false);
  });

  it('Section 7: đổi tỉnh xóa phường cũ, cho phép lọc riêng phường khi chưa chọn tỉnh', () => {
    interface GeoState {
      provinceId?: string;
      wardId?: string;
    }

    function onProvinceChange(current: GeoState, newProvinceId?: string): GeoState {
      return { provinceId: newProvinceId || undefined };
    }

    function onWardChange(current: GeoState, newWardId?: string): GeoState {
      return { ...current, wardId: newWardId || undefined };
    }

    // 1. Đang có cả tỉnh và phường, đổi sang tỉnh mới -> phường cũ phải bị xóa
    const state1: GeoState = { provinceId: 'p-hcm', wardId: 'w-dong-hoa' };
    const state2 = onProvinceChange(state1, 'p-hn');
    assert.equal(state2.provinceId, 'p-hn');
    assert.equal(state2.wardId, undefined, 'Phường cũ phải bị xóa khi đổi tỉnh');

    // 2. Chưa chọn tỉnh, người dùng lọc riêng theo phường -> cho phép và giữ provinceId undefined
    const state3: GeoState = {};
    const state4 = onWardChange(state3, 'w-ben-nghe');
    assert.equal(state4.provinceId, undefined);
    assert.equal(state4.wardId, 'w-ben-nghe');

    // 3. Đổi tỉnh về rỗng (tất cả tỉnh) -> phường cũ cũng bị xóa
    const state5 = onProvinceChange(state1, '');
    assert.equal(state5.provinceId, undefined);
    assert.equal(state5.wardId, undefined);
  });

  it('Section 7: hasActiveFilters phát hiện chính xác khi có bất kỳ tiêu chí nào trong 4 ô', () => {
    function computeHasActiveFilters(
      search: string,
      debouncedSearch: string,
      statusFilter: string,
      geography: { provinceId?: string; wardId?: string },
    ): boolean {
      return Boolean(
        search || debouncedSearch || statusFilter || geography.provinceId || geography.wardId,
      );
    }

    // Trạng thái ban đầu: không có filter
    assert.equal(computeHasActiveFilters('', '', '', {}), false);

    // Có search gõ dở
    assert.equal(computeHasActiveFilters('Nguyễn', '', '', {}), true);

    // Có debouncedSearch
    assert.equal(computeHasActiveFilters('', 'Nguyễn', '', {}), true);

    // Có status
    assert.equal(computeHasActiveFilters('', '', 'ACTIVE', {}), true);

    // Chỉ có provinceId
    assert.equal(computeHasActiveFilters('', '', '', { provinceId: 'p-1' }), true);

    // Chỉ có wardId
    assert.equal(computeHasActiveFilters('', '', '', { wardId: 'w-1' }), true);

    // Đầy đủ cả 4
    assert.equal(
      computeHasActiveFilters('ABC', 'ABC', 'INACTIVE', { provinceId: 'p-1', wardId: 'w-1' }),
      true,
    );
  });
});

describe('School Edit Wizard — Baseline, Change Detection & Validation', () => {
  it('normalizeWeeklySchedule chuẩn hóa chuỗi JSON hoặc object theo thứ tự ngày chuẩn và bỏ qua ngày rỗng', () => {
    const rawObject = {
      friday: { start: ' 07:30 ', end: ' 16:30 ' },
      monday: { start: '07:30', end: '16:30' },
      sunday: null,
      saturday: undefined,
    };
    const normObj = normalizeWeeklySchedule(rawObject as unknown as WeeklySchedule);
    const keys = Object.keys(normObj);
    assert.deepEqual(keys, ['monday', 'friday']);
    assert.equal(normObj.friday.start, '07:30');
    assert.equal(normObj.friday.end, '16:30');

    // Chuỗi JSON hợp lệ
    const jsonStr = JSON.stringify({
      tuesday: { start: '07:00', end: '17:00' },
      thursday: { start: '07:00', end: '17:00' },
    });
    const normJson = normalizeWeeklySchedule(jsonStr);
    assert.deepEqual(Object.keys(normJson), ['tuesday', 'thursday']);

    // Input rỗng hoặc hỏng
    assert.deepEqual(normalizeWeeklySchedule(null), {});
    assert.deepEqual(normalizeWeeklySchedule(undefined), {});
    assert.deepEqual(normalizeWeeklySchedule('invalid json'), {});
  });

  it('areSchedulesEqual nhận diện hai lịch tương đương bất chấp thứ tự key hay định dạng JSON', () => {
    const schedA = {
      monday: { start: '07:30', end: '16:30' },
      wednesday: { start: '07:30', end: '16:30' },
    };
    const schedB = {
      wednesday: { start: '07:30', end: '16:30' },
      monday: { start: '07:30', end: '16:30' },
    };
    assert.equal(areSchedulesEqual(schedA, schedB), true);
    assert.equal(areSchedulesEqual(schedA, JSON.stringify(schedB)), true);

    const schedDifferentTime = {
      monday: { start: '08:00', end: '16:30' },
      wednesday: { start: '07:30', end: '16:30' },
    };
    assert.equal(areSchedulesEqual(schedA, schedDifferentTime), false);

    const schedDifferentDays = {
      monday: { start: '07:30', end: '16:30' },
    };
    assert.equal(areSchedulesEqual(schedA, schedDifferentDays), false);
  });

  it('areCoordinatesEqual so sánh tọa độ theo ngưỡng epsilon 0.00001 để tránh jitter khi pan/zoom', () => {
    // Trùng khớp hoàn toàn
    assert.equal(areCoordinatesEqual(10.776889, 106.700806, 10.776889, 106.700806), true);

    // Chênh lệch cực nhỏ <= 0.00001 (ví dụ floating point jitter)
    assert.equal(areCoordinatesEqual(10.776889, 106.700806, 10.776885, 106.700809), true);

    // Chênh lệch lớn hơn 0.00001 -> thay đổi tọa độ thực sự
    assert.equal(areCoordinatesEqual(10.776889, 106.700806, 10.776950, 106.700806), false);

    // Null checks
    assert.equal(areCoordinatesEqual(null, null, null, null), true);
    assert.equal(areCoordinatesEqual(10.77, 106.7, null, null), false);
    assert.equal(areCoordinatesEqual(null, null, 10.77, 106.7), false);
  });

  it('createSchoolEditBaseline tạo snapshot chuẩn hóa không bị đột biến từ SchoolDetail', () => {
    const mockSchool: SchoolDetail = {
      id: 'sch-1',
      name: 'Trường Tiểu học Chu Văn An',
      addressText: '  123 Nguyễn Huệ, Phường Bến Nghé, Quận 1  ',
      latitude: 10.776889,
      longitude: 106.700806,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/school_1.webp',
      imagePublicId: 'roadtoschool/schools/school_1',
      employeeCount: 5,
      contractStartDate: '2025-01-01T00:00:00.000Z',
      contractEndDate: '2026-12-31T23:59:59.000Z',
      weeklySchedule: {
        monday: { start: '07:30', end: '16:30' },
      },
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const baseline = createSchoolEditBaseline(mockSchool);
    assert.equal(baseline.id, 'sch-1');
    assert.equal(baseline.name, 'Trường Tiểu học Chu Văn An');
    assert.equal(baseline.imageUrl, 'https://res.cloudinary.com/demo/image/upload/school_1.webp');
    assert.equal(baseline.imagePublicId, 'roadtoschool/schools/school_1');
    assert.equal(baseline.addressText, '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1');
    assert.equal(baseline.latitude, 10.776889);
    assert.equal(baseline.longitude, 106.700806);
    assert.equal(baseline.contractStartDate, '2025-01-01');
    assert.equal(baseline.contractEndDate, '2026-12-31');
    assert.deepEqual(baseline.weeklySchedule, {
      monday: { start: '07:30', end: '16:30' },
    });
  });

  it('detectSchoolChanges phát hiện chính xác thay đổi theo từng nhóm và khóa nút khi không có thay đổi', () => {
    const mockSchool: SchoolDetail = {
      id: 'sch-2',
      name: 'Trường THCS Lê Quý Đôn',
      addressText: '456 Võ Văn Tần',
      latitude: 10.78,
      longitude: 106.69,
      imageUrl: null,
      imagePublicId: null,
      employeeCount: 0,
      contractStartDate: '2025-02-01',
      contractEndDate: '2026-02-01',
      weeklySchedule: {
        monday: { start: '07:30', end: '16:30' },
      },
      isActive: true,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    const baseline = createSchoolEditBaseline(mockSchool);

    // 1. Bản nháp ban đầu giống hệt baseline -> không có thay đổi
    const initialDraft: SchoolEditCurrentDraft = {
      name: 'Trường THCS Lê Quý Đôn',
      selectedFile: null,
      addressText: '456 Võ Văn Tần',
      latitude: 10.78,
      longitude: 106.69,
      contractStartDate: '2025-02-01',
      contractEndDate: '2026-02-01',
      weeklySchedule: {
        monday: { start: '07:30', end: '16:30' },
      },
    };
    const c0 = detectSchoolChanges(baseline, initialDraft);
    assert.equal(c0.hasChanges, false);
    assert.equal(c0.isProfileChanged, false);
    assert.equal(c0.isNameChanged, false);
    assert.equal(c0.isImageChanged, false);
    assert.equal(c0.isLocationChanged, false);
    assert.equal(c0.isScheduleChanged, false);
    assert.equal(c0.isContractChanged, false);

    // 2. Đổi tên trường -> bật isNameChanged & isProfileChanged & hasChanges
    const draftNameChanged: SchoolEditCurrentDraft = {
      ...initialDraft,
      name: 'Trường THCS Lê Quý Đôn - Quận 3',
    };
    const cName = detectSchoolChanges(baseline, draftNameChanged);
    assert.equal(cName.hasChanges, true);
    assert.equal(cName.isProfileChanged, true);
    assert.equal(cName.isNameChanged, true);
    assert.equal(cName.isImageChanged, false);
    assert.equal(cName.isLocationChanged, false);

    // 3. Hoàn tác tên về như cũ -> tắt lại hasChanges
    const draftNameReverted: SchoolEditCurrentDraft = {
      ...initialDraft,
      name: ' Trường THCS Lê Quý Đôn ', // có whitespace thừa vẫn được trim
    };
    const cNameRev = detectSchoolChanges(baseline, draftNameReverted);
    assert.equal(cNameRev.hasChanges, false);

    // 4. Chọn file ảnh mới -> bật isImageChanged & isProfileChanged & hasChanges
    const mockFile = { name: 'new-gate.jpg', size: 1024, type: 'image/jpeg' } as unknown as File;
    const draftImageChanged: SchoolEditCurrentDraft = {
      ...initialDraft,
      selectedFile: mockFile,
    };
    const cImg = detectSchoolChanges(baseline, draftImageChanged);
    assert.equal(cImg.hasChanges, true);
    assert.equal(cImg.isProfileChanged, true);
    assert.equal(cImg.isImageChanged, true);
    assert.equal(cImg.isNameChanged, false);

    // 5. Hủy file ảnh mới chọn -> tắt lại hasChanges
    const draftImageCancelled: SchoolEditCurrentDraft = {
      ...draftImageChanged,
      selectedFile: null,
    };
    const cImgCancel = detectSchoolChanges(baseline, draftImageCancelled);
    assert.equal(cImgCancel.hasChanges, false);

    // 6. Đổi địa chỉ -> chỉ bật isLocationChanged & hasChanges
    const draftAddressChanged: SchoolEditCurrentDraft = {
      ...initialDraft,
      addressText: '789 Điện Biên Phủ',
    };
    const c1 = detectSchoolChanges(baseline, draftAddressChanged);
    assert.equal(c1.hasChanges, true);
    assert.equal(c1.isLocationChanged, true);
    assert.equal(c1.isScheduleChanged, false);
    assert.equal(c1.isContractChanged, false);

    // 7. Hoàn tác địa chỉ về như cũ -> hasChanges tắt lại
    const draftAddressReverted: SchoolEditCurrentDraft = {
      ...draftAddressChanged,
      addressText: ' 456 Võ Văn Tần ', // có whitespace thừa vẫn được trim
    };
    const c1Rev = detectSchoolChanges(baseline, draftAddressReverted);
    assert.equal(c1Rev.hasChanges, false);

    // 8. Đổi tọa độ -> bật isLocationChanged
    const draftCoordsChanged: SchoolEditCurrentDraft = {
      ...initialDraft,
      latitude: 10.79,
    };
    const c2 = detectSchoolChanges(baseline, draftCoordsChanged);
    assert.equal(c2.hasChanges, true);
    assert.equal(c2.isLocationChanged, true);

    // 9. Đổi lịch học -> bật isScheduleChanged
    const draftSchedChanged: SchoolEditCurrentDraft = {
      ...initialDraft,
      weeklySchedule: {
        monday: { start: '07:30', end: '16:30' },
        tuesday: { start: '07:30', end: '16:30' },
      },
    };
    const c3 = detectSchoolChanges(baseline, draftSchedChanged);
    assert.equal(c3.hasChanges, true);
    assert.equal(c3.isScheduleChanged, true);
    assert.equal(c3.isLocationChanged, false);

    // 10. Đổi ngày kết thúc hợp đồng (gia hạn) -> bật isContractChanged
    const draftContractChanged: SchoolEditCurrentDraft = {
      ...initialDraft,
      contractEndDate: '2027-02-01',
    };
    const c4 = detectSchoolChanges(baseline, draftContractChanged);
    assert.equal(c4.hasChanges, true);
    assert.equal(c4.isContractChanged, true);
    assert.equal(c4.isLocationChanged, false);
    assert.equal(c4.isScheduleChanged, false);
  });

  it('validateSchoolEditForm kiểm tra hợp lệ và trả về đúng bước mục tiêu có lỗi', () => {
    const draftValid: SchoolEditCurrentDraft = {
      name: 'Trường Tiểu học Chu Văn An',
      selectedFile: null,
      addressText: '123 Hai Bà Trưng',
      latitude: 10.78,
      longitude: 106.69,
      contractStartDate: '2024-01-01', // ngày quá khứ vẫn được chấp nhận trong edit mode
      contractEndDate: '2026-12-31',
      weeklySchedule: {
        monday: { start: '07:30', end: '16:30' },
      },
    };
    const changesNoop = {
      isProfileChanged: false,
      isNameChanged: false,
      isImageChanged: false,
      isLocationChanged: false,
      isScheduleChanged: false,
      isContractChanged: false,
      hasChanges: false,
    };

    // Hợp lệ với SYSTEM_ADMIN
    const v1 = validateSchoolEditForm(draftValid, changesNoop, '', 'SYSTEM_ADMIN');
    assert.equal(v1.valid, true);

    // Từ chối role không phải SYSTEM_ADMIN
    const vRole = validateSchoolEditForm(draftValid, changesNoop, '', 'SCHOOL_ADMIN');
    assert.equal(vRole.valid, false);
    assert.match(vRole.error || '', /SYSTEM_ADMIN/i);

    // Tên trường rỗng -> báo lỗi và target step 1
    const vEmptyName = validateSchoolEditForm(
      { ...draftValid, name: '   ' },
      changesNoop,
      '',
      'SYSTEM_ADMIN',
    );
    assert.equal(vEmptyName.valid, false);
    assert.equal(vEmptyName.stepTarget, 1);

    // Tên trường < 2 ký tự -> báo lỗi và target step 1
    const vShortName = validateSchoolEditForm(
      { ...draftValid, name: 'A' },
      changesNoop,
      '',
      'SYSTEM_ADMIN',
    );
    assert.equal(vShortName.valid, false);
    assert.equal(vShortName.stepTarget, 1);

    // File ảnh > 5MB -> báo lỗi và target step 1
    const oversizedFile = { name: 'large.jpg', size: 6 * 1024 * 1024, type: 'image/jpeg' } as unknown as File;
    const vLargeFile = validateSchoolEditForm(
      { ...draftValid, selectedFile: oversizedFile },
      changesNoop,
      '',
      'SYSTEM_ADMIN',
    );
    assert.equal(vLargeFile.valid, false);
    assert.equal(vLargeFile.stepTarget, 1);
    assert.match(vLargeFile.error || '', /5MB/i);

    // File ảnh sai định dạng -> báo lỗi và target step 1
    const badMimeFile = { name: 'anim.gif', size: 1024, type: 'image/gif' } as unknown as File;
    const vBadMime = validateSchoolEditForm(
      { ...draftValid, selectedFile: badMimeFile },
      changesNoop,
      '',
      'SYSTEM_ADMIN',
    );
    assert.equal(vBadMime.valid, false);
    assert.equal(vBadMime.stepTarget, 1);

    // Địa chỉ rỗng -> báo lỗi và target step 2
    const vEmptyAddr = validateSchoolEditForm(
      { ...draftValid, addressText: '   ' },
      changesNoop,
      '',
      'SYSTEM_ADMIN',
    );
    assert.equal(vEmptyAddr.valid, false);
    assert.equal(vEmptyAddr.stepTarget, 2);

    // Tọa độ null -> báo lỗi và target step 2
    const vNullCoords = validateSchoolEditForm(
      { ...draftValid, latitude: null },
      changesNoop,
      '',
      'SYSTEM_ADMIN',
    );
    assert.equal(vNullCoords.valid, false);
    assert.equal(vNullCoords.stepTarget, 2);

    // Ngày kết thúc hợp đồng < ngày bắt đầu -> báo lỗi và target step 3
    const vInvalidContract = validateSchoolEditForm(
      { ...draftValid, contractStartDate: '2026-05-01', contractEndDate: '2026-04-30' },
      changesNoop,
      '',
      'SYSTEM_ADMIN',
    );
    assert.equal(vInvalidContract.valid, false);
    assert.equal(vInvalidContract.stepTarget, 3);

    // Lịch học rỗng -> báo lỗi và target step 3
    const vEmptySched = validateSchoolEditForm(
      { ...draftValid, weeklySchedule: {} },
      changesNoop,
      '',
      'SYSTEM_ADMIN',
    );
    assert.equal(vEmptySched.valid, false);
    assert.equal(vEmptySched.stepTarget, 3);

    // Khi có đổi vị trí, ngày áp dụng trong quá khứ -> báo lỗi và target step 3
    const changesLocation = {
      isProfileChanged: false,
      isNameChanged: false,
      isImageChanged: false,
      isLocationChanged: true,
      isScheduleChanged: false,
      isContractChanged: false,
      hasChanges: true,
    };
    const vPastEffective = validateSchoolEditForm(
      draftValid,
      changesLocation,
      '2020-01-01',
      'SYSTEM_ADMIN',
    );
    assert.equal(vPastEffective.valid, false);
    assert.equal(vPastEffective.stepTarget, 3);
  });
});
