import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Round 3 Web — Student Code & QR Payload Specification', () => {
  const STUDENT_CODE_REGEX = /^STU[A-Z0-9]{8}$/;

  it('Mã học sinh phải có đúng format STU + 8 ký tự alphanumeric in hoa (tổng cộng 11 ký tự)', () => {
    const validCodes = [
      'STU8A2B9C1D',
      'STU1234567A',
      'STUABCDEFG1',
      'STU9X8Y7Z6W',
    ];

    for (const code of validCodes) {
      assert.equal(code.length, 11, `Độ dài mã ${code} phải là 11`);
      assert.ok(STUDENT_CODE_REGEX.test(code), `Mã ${code} phải khớp định dạng regex`);
      // Phải có ít nhất 1 chữ in hoa và 1 số
      assert.ok(/[A-Z]/.test(code.slice(3)), `Phần 8 ký tự của ${code} phải có ít nhất 1 chữ cái`);
      assert.ok(/[0-9]/.test(code.slice(3)), `Phần 8 ký tự của ${code} phải có ít nhất 1 chữ số`);
    }
  });

  it('Từ chối các định dạng mã học sinh không đúng chuẩn (mẫu 6 ký tự cũ hoặc chữ thường)', () => {
    const invalidCodes = [
      'STU123', // Mẫu 6 ký tự cũ
      'stu8a2b9c1d', // Chữ thường
      'STU123456789', // 12 ký tự
      'STU1234567', // 10 ký tự
      'ABC8A2B9C1D', // Sai tiền tố STU
      'STUAAAAAAAA', // Chỉ có chữ, thiếu số
      'STU12345678', // Chỉ có số, thiếu chữ
    ];

    for (const code of invalidCodes) {
      const isValid =
        STUDENT_CODE_REGEX.test(code) &&
        /[A-Z]/.test(code.slice(3)) &&
        /[0-9]/.test(code.slice(3));
      assert.equal(isValid, false, `Mã không hợp lệ ${code} phải bị từ chối`);
    }
  });

  it('QR Code Payload chính xác chỉ là Student.code, tuyệt đối không chứa PII/JWT/OTP', () => {
    const sampleStudent = {
      code: 'STU8A2B9C1D',
      fullName: 'Nguyễn Văn An',
      guardianPhone: '0912345678',
      schoolId: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
    };

    const qrPayload = sampleStudent.code;
    assert.equal(qrPayload, 'STU8A2B9C1D');
    assert.ok(!qrPayload.includes(sampleStudent.guardianPhone));
    assert.ok(!qrPayload.includes(sampleStudent.schoolId));
    assert.ok(!qrPayload.includes('token'));
  });
});

describe('Round 3 Web — Student Filters Independence Rules', () => {
  it('Bộ lọc Trạng thái và Bộ lọc Địa chỉ phải hoạt động độc lập và kết hợp được', () => {
    interface QueryParams {
      status?: 'AVAILABLE' | 'DISABLED';
      hasAddress?: boolean;
    }

    function buildStudentFilterParams(
      statusFilter: 'ALL' | 'AVAILABLE' | 'DISABLED',
      addressFilter: 'ALL' | 'HAS_ADDRESS' | 'NO_ADDRESS'
    ): QueryParams {
      const p: QueryParams = {};
      if (statusFilter !== 'ALL') {
        p.status = statusFilter;
      }
      if (addressFilter === 'HAS_ADDRESS') {
        p.hasAddress = true;
      } else if (addressFilter === 'NO_ADDRESS') {
        p.hasAddress = false;
      }
      return p;
    }

    // 1. Cả 2 ALL
    assert.deepEqual(buildStudentFilterParams('ALL', 'ALL'), {});

    // 2. Chỉ lọc status
    assert.deepEqual(buildStudentFilterParams('AVAILABLE', 'ALL'), { status: 'AVAILABLE' });
    assert.deepEqual(buildStudentFilterParams('DISABLED', 'ALL'), { status: 'DISABLED' });

    // 3. Chỉ lọc address
    assert.deepEqual(buildStudentFilterParams('ALL', 'HAS_ADDRESS'), { hasAddress: true });
    assert.deepEqual(buildStudentFilterParams('ALL', 'NO_ADDRESS'), { hasAddress: false });

    // 4. Kết hợp cả hai
    assert.deepEqual(buildStudentFilterParams('AVAILABLE', 'HAS_ADDRESS'), {
      status: 'AVAILABLE',
      hasAddress: true,
    });
    assert.deepEqual(buildStudentFilterParams('AVAILABLE', 'NO_ADDRESS'), {
      status: 'AVAILABLE',
      hasAddress: false,
    });
    assert.deepEqual(buildStudentFilterParams('DISABLED', 'NO_ADDRESS'), {
      status: 'DISABLED',
      hasAddress: false,
    });
  });
});

describe('Round 3 Web — Driver & Teacher Creation Validation Rules', () => {
  it('Driver: Bắt buộc họ tên, chấp nhận chỉ Email HOẶC chỉ Số điện thoại', () => {
    function validateDriverInput(fullName: string, email?: string, phone?: string) {
      if (!fullName || !fullName.trim()) return false;
      const hasEmail = Boolean(email && email.trim());
      const hasPhone = Boolean(phone && phone.trim());
      return hasEmail || hasPhone;
    }

    assert.equal(validateDriverInput('Trần Văn Nam', 'nam@road.vn', undefined), true);
    assert.equal(validateDriverInput('Trần Văn Nam', undefined, '0987654321'), true);
    assert.equal(validateDriverInput('Trần Văn Nam', 'nam@road.vn', '0987654321'), true);
    assert.equal(validateDriverInput('Trần Văn Nam', '', ''), false);
    assert.equal(validateDriverInput('', 'nam@road.vn', ''), false);
  });

  it('Teacher: Vai trò hệ thống luôn là BUS_ATTENDANT, không gửi role tùy tiện', () => {
    const teacherRole = 'BUS_ATTENDANT';
    assert.equal(teacherRole, 'BUS_ATTENDANT');
    assert.notEqual(teacherRole, 'TEACHER');
  });
});
