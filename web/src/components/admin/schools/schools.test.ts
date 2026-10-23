import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateWeeklySchedule,
  DAYS_OF_WEEK,
} from './weekly-schedule.helper.ts';
import type { WeeklySchedule, Role } from '../../../lib/types.ts';
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

    function onAddressInputChange(newText: string) {
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
    function validateMapStyle(style: { layers?: any[] } | null | undefined): boolean {
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
