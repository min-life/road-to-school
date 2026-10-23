import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto.js';

describe('CreateSchoolAdminDto Validation', () => {
  it('hợp lệ khi chỉ có Email (không có Số điện thoại)', async () => {
    const dto = plainToInstance(CreateSchoolAdminDto, {
      fullName: 'Nguyễn Văn Hùng',
      email: 'hung.nv@school.edu.vn',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.fullName).toBe('Nguyễn Văn Hùng');
    expect(dto.email).toBe('hung.nv@school.edu.vn');
    expect(dto.phone).toBeUndefined();
  });

  it('hợp lệ khi chỉ có Số điện thoại (không có Email)', async () => {
    const dto = plainToInstance(CreateSchoolAdminDto, {
      fullName: 'Trần Thị Mai',
      phone: '0912345678',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.fullName).toBe('Trần Thị Mai');
    expect(dto.phone).toBe('0912345678');
    expect(dto.email).toBeUndefined();
  });

  it('hợp lệ khi có cả Email và Số điện thoại', async () => {
    const dto = plainToInstance(CreateSchoolAdminDto, {
      fullName: 'Lê Văn An',
      email: 'an.lv@school.edu.vn',
      phone: '+84988123456',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('từ chối khi thiếu cả Email lẫn Số điện thoại', async () => {
    const dto = plainToInstance(CreateSchoolAdminDto, {
      fullName: 'Nguyễn Văn Hùng',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(
      errors.some((e) =>
        Object.values(e.constraints || {}).includes(
          'Bắt buộc phải cung cấp ít nhất Email hoặc Số điện thoại',
        ),
      ),
    ).toBe(true);
  });

  it('từ chối khi Email và Số điện thoại đều là chuỗi rỗng hoặc toàn khoảng trắng', async () => {
    const dto = plainToInstance(CreateSchoolAdminDto, {
      fullName: 'Nguyễn Văn Hùng',
      email: '   ',
      phone: '   ',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('từ chối tên dưới 2 ký tự hoặc để trống', async () => {
    const dto = plainToInstance(CreateSchoolAdminDto, {
      fullName: 'A',
      email: 'a@school.edu.vn',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'fullName')).toBe(true);
  });

  it('từ chối Email không đúng định dạng', async () => {
    const dto = plainToInstance(CreateSchoolAdminDto, {
      fullName: 'Nguyễn Văn Hùng',
      email: 'not-an-email',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('từ chối Số điện thoại không đúng định dạng di động Việt Nam', async () => {
    const dto = plainToInstance(CreateSchoolAdminDto, {
      fullName: 'Nguyễn Văn Hùng',
      phone: '12345',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'phone')).toBe(true);
  });

  it('chuẩn hóa tự động trim khoảng trắng và chuyển email về chữ thường', async () => {
    const dto = plainToInstance(CreateSchoolAdminDto, {
      fullName: '   Nguyễn Văn Hùng   ',
      email: '  HUNG.NV@School.EDU.VN  ',
      phone: '  0912345678  ',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.fullName).toBe('Nguyễn Văn Hùng');
    expect(dto.email).toBe('hung.nv@school.edu.vn');
    expect(dto.phone).toBe('0912345678');
  });
});
