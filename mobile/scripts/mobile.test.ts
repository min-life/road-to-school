import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const STUDENT_CODE_REGEX = /^STU[A-Z0-9]{8}$/;

function validateStudentCode(code: string): string | null {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return 'Vui lòng nhập mã học sinh.';
  }
  if (!trimmed.startsWith('STU')) {
    return 'Mã học sinh phải bắt đầu bằng tiền tố STU.';
  }
  if (trimmed.length !== 11) {
    return 'Mã học sinh phải có đúng 11 ký tự (STU + 8 ký tự).';
  }
  if (!STUDENT_CODE_REGEX.test(trimmed)) {
    return 'Mã chỉ được chứa chữ cái in hoa và chữ số.';
  }
  const suffix = trimmed.slice(3);
  if (!/[A-Z]/.test(suffix) || !/[0-9]/.test(suffix)) {
    return 'Mã phải chứa ít nhất một chữ cái và một chữ số.';
  }
  return null;
}

function getTabsForRole(role: string): string[] {
  if (role === 'PARENT') {
    return ['index', 'tracking', 'settings'];
  }
  if (role === 'DRIVER' || role === 'BUS_ATTENDANT') {
    return ['index', 'schedule', 'settings'];
  }
  return [];
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'DRIVER':
      return 'Tài xế';
    case 'BUS_ATTENDANT':
      return 'Giáo viên';
    case 'PARENT':
      return 'Phụ huynh học sinh';
    default:
      return 'Người dùng';
  }
}

describe('Round 3 Mobile — Student Code Validation Specification', () => {
  it('Chấp nhận các mã học sinh đúng định dạng STU + 8 ký tự (có cả chữ và số)', () => {
    assert.equal(validateStudentCode('STUA7B3C9D2'), null);
    assert.equal(validateStudentCode('STU1A2B3C4D'), null);
    assert.equal(validateStudentCode('STU9999999Z'), null);
    assert.equal(validateStudentCode('STUZZZZZZZ1'), null);
    assert.equal(validateStudentCode('  stuA7B3C9D2  '), null); // tự động trim và uppercase
  });

  it('Từ chối mã học sinh rỗng hoặc thiếu độ dài 11 ký tự', () => {
    assert.equal(validateStudentCode(''), 'Vui lòng nhập mã học sinh.');
    assert.equal(validateStudentCode('STU123'), 'Mã học sinh phải có đúng 11 ký tự (STU + 8 ký tự).');
    assert.equal(validateStudentCode('STU123456789'), 'Mã học sinh phải có đúng 11 ký tự (STU + 8 ký tự).');
  });

  it('Từ chối mã không bắt đầu bằng tiền tố STU', () => {
    assert.equal(validateStudentCode('ABC12345678'), 'Mã học sinh phải bắt đầu bằng tiền tố STU.');
  });

  it('Từ chối mã chỉ có toàn chữ hoặc toàn số ở phần 8 ký tự sau', () => {
    assert.equal(validateStudentCode('STUAAAAAAAA'), 'Mã phải chứa ít nhất một chữ cái và một chữ số.');
    assert.equal(validateStudentCode('STU12345678'), 'Mã phải chứa ít nhất một chữ cái và một chữ số.');
  });
});

describe('Round 3 Mobile — Role Navigation & Tab Configuration', () => {
  it('PARENT nhìn thấy đúng 3 tabs: Trang chủ (index), Theo dõi (tracking), Cá nhân (settings)', () => {
    const tabs = getTabsForRole('PARENT');
    assert.deepEqual(tabs, ['index', 'tracking', 'settings']);
    assert.equal(tabs.includes('schedule'), false);
  });

  it('DRIVER nhìn thấy đúng 3 tabs: Trang chủ (index), Lịch (schedule), Cá nhân (settings)', () => {
    const tabs = getTabsForRole('DRIVER');
    assert.deepEqual(tabs, ['index', 'schedule', 'settings']);
    assert.equal(tabs.includes('tracking'), false);
  });

  it('BUS_ATTENDANT nhìn thấy đúng 3 tabs: Trang chủ (index), Lịch (schedule), Cá nhân (settings)', () => {
    const tabs = getTabsForRole('BUS_ATTENDANT');
    assert.deepEqual(tabs, ['index', 'schedule', 'settings']);
    assert.equal(tabs.includes('tracking'), false);
  });

  it('Nhãn hiển thị tiếng Việt chuẩn hóa cho các vai trò di động', () => {
    assert.equal(getRoleLabel('PARENT'), 'Phụ huynh học sinh');
    assert.equal(getRoleLabel('DRIVER'), 'Tài xế');
    assert.equal(getRoleLabel('BUS_ATTENDANT'), 'Giáo viên');
  });
});
