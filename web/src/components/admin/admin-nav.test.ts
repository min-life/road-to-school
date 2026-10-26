import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getVisibleNavItems,
  formatRoleLabel,
  getAvatarInitial,
  ADMIN_NAV_ITEMS,
} from './admin-nav.config.ts';
import type { Role } from '../../lib/types.ts';

describe('Admin Navigation Configuration & Role Filtering', () => {
  it('SYSTEM_ADMIN phải nhìn thấy đầy đủ 9 mục điều hướng: Tổng quan, Trường học, Tài xế, Phương tiện, Phương án tuyến, Chuyến xe, Báo nghỉ, Yêu cầu, Cài đặt', () => {
    const items = getVisibleNavItems('SYSTEM_ADMIN');
    const ids = items.map((item) => item.id);

    assert.equal(items.length, 9);
    assert.deepEqual(ids, ['overview', 'schools', 'drivers', 'vehicles', 'routes', 'trips', 'leave-notices', 'requests', 'settings']);

    const schoolsItem = items.find((i) => i.id === 'schools');
    assert.ok(schoolsItem, 'Mục Trường học phải tồn tại cho SYSTEM_ADMIN');
    assert.equal(schoolsItem?.href, '/admin/schools');

    const driversItem = items.find((i) => i.id === 'drivers');
    assert.ok(driversItem, 'Mục Tài xế phải tồn tại cho SYSTEM_ADMIN');
    assert.equal(driversItem?.href, '/admin/drivers');

    const vehiclesItem = items.find((i) => i.id === 'vehicles');
    assert.ok(vehiclesItem, 'Mục Phương tiện phải tồn tại cho SYSTEM_ADMIN');
    assert.equal(vehiclesItem?.href, '/admin/vehicles');

    const routesItem = items.find((i) => i.id === 'routes');
    assert.ok(routesItem, 'Mục Phương án tuyến phải tồn tại cho SYSTEM_ADMIN');
    assert.equal(routesItem?.href, '/admin/routes');
    assert.equal(routesItem?.label, 'Phương án tuyến');

    const tripsItem = items.find((i) => i.id === 'trips');
    assert.ok(tripsItem, 'Mục Chuyến xe phải tồn tại cho SYSTEM_ADMIN');
    assert.equal(tripsItem?.href, '/admin/trips');
    assert.equal(tripsItem?.label, 'Chuyến xe');

    const leaveNoticesItem = items.find((i) => i.id === 'leave-notices');
    assert.ok(leaveNoticesItem, 'Mục Báo nghỉ phải tồn tại cho SYSTEM_ADMIN');
    assert.equal(leaveNoticesItem?.href, '/admin/leave-notices');
    assert.equal(leaveNoticesItem?.label, 'Báo nghỉ');
  });

  it('SCHOOL_ADMIN phải nhìn thấy 8 mục điều hướng: Tổng quan, Phương án tuyến, Chuyến xe, Báo nghỉ, Học sinh, Giáo viên, Yêu cầu, Cài đặt; TUYỆT ĐỐI KHÔNG THẤY Trường học, Tài xế hay Phương tiện', () => {
    const items = getVisibleNavItems('SCHOOL_ADMIN');
    const ids = items.map((item) => item.id);

    assert.equal(items.length, 8);
    assert.deepEqual(ids, ['overview', 'routes', 'trips', 'leave-notices', 'students', 'teachers', 'requests', 'settings']);

    const routesItem = items.find((i) => i.id === 'routes');
    assert.ok(routesItem, 'Mục Phương án tuyến phải tồn tại cho SCHOOL_ADMIN');
    assert.equal(routesItem?.href, '/admin/routes');
    assert.equal(routesItem?.label, 'Phương án tuyến');

    const leaveNoticesItem = items.find((i) => i.id === 'leave-notices');
    assert.ok(leaveNoticesItem, 'Mục Báo nghỉ phải tồn tại cho SCHOOL_ADMIN');
    assert.equal(leaveNoticesItem?.href, '/admin/leave-notices');
    assert.equal(leaveNoticesItem?.label, 'Báo nghỉ');

    const hasSchools = items.some((i) => i.id === 'schools');
    assert.equal(hasSchools, false, 'SCHOOL_ADMIN tuyệt đối không được nhìn thấy mục Trường học');

    const hasDrivers = items.some((i) => i.id === 'drivers');
    assert.equal(hasDrivers, false, 'SCHOOL_ADMIN tuyệt đối không được nhìn thấy mục Tài xế');

    const hasVehicles = items.some((i) => i.id === 'vehicles');
    assert.equal(hasVehicles, false, 'SCHOOL_ADMIN tuyệt đối không được nhìn thấy mục Phương tiện');
  });

  it('Các vai trò ngoài quản trị (PARENT, DRIVER, BUS_ATTENDANT) không có quyền xem bất kỳ menu quản trị nào', () => {
    const nonAdminRoles: Role[] = ['PARENT', 'DRIVER', 'BUS_ATTENDANT'];

    for (const role of nonAdminRoles) {
      const items = getVisibleNavItems(role);
      assert.equal(
        items.length,
        0,
        `Vai trò ${role} không được có menu trong Admin Layout`,
      );
    }
  });

  it('formatRoleLabel chuyển đổi đúng tên tiếng Việt chuẩn hóa (BUS_ATTENDANT hiển thị là Giáo viên)', () => {
    assert.equal(formatRoleLabel('SYSTEM_ADMIN'), 'Quản trị hệ thống');
    assert.equal(formatRoleLabel('SCHOOL_ADMIN'), 'Quản trị trường học');
    assert.equal(formatRoleLabel('BUS_ATTENDANT'), 'Giáo viên');
    assert.equal(formatRoleLabel('DRIVER'), 'Tài xế');
    assert.equal(formatRoleLabel('PARENT'), 'Phụ huynh');
  });

  it('getAvatarInitial trích xuất đúng ký tự đầu và xử lý an toàn các trường hợp biên', () => {
    assert.equal(getAvatarInitial('Nguyễn Văn Hùng'), 'N');
    assert.equal(getAvatarInitial('  lê thị mai  '), 'L');
    assert.equal(getAvatarInitial('admin'), 'A');
    assert.equal(getAvatarInitial(''), 'A');
    assert.equal(getAvatarInitial(null), 'A');
    assert.equal(getAvatarInitial(undefined), 'A');
  });

  it('Mọi mục điều hướng đều có đường dẫn hợp lệ và danh sách role không rỗng', () => {
    for (const item of ADMIN_NAV_ITEMS) {
      assert.ok(item.href.startsWith('/admin'), `href phải bắt đầu bằng /admin: ${item.href}`);
      assert.ok(item.allowedRoles.length > 0, `allowedRoles không được rỗng cho ${item.id}`);
    }
  });
});
