import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  ListSchoolEmployeesQueryDto,
  SchoolEmployeeRoleFilter,
  SchoolEmployeeStatusFilter,
} from './dto/list-school-employees.dto.js';

describe('ListSchoolEmployeesQueryDto Validation', () => {
  it('hợp lệ với query rỗng (sử dụng giá trị mặc định page=1, limit=10)', async () => {
    const dto = plainToInstance(ListSchoolEmployeesQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('hợp lệ với tham số phân trang và lọc hợp lệ', async () => {
    const dto = plainToInstance(ListSchoolEmployeesQueryDto, {
      page: '2',
      limit: '25',
      search: '  Hùng  ',
      role: 'SCHOOL_ADMIN',
      status: 'ACTIVE',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
    expect(dto.search).toBe('Hùng');
    expect(dto.role).toBe(SchoolEmployeeRoleFilter.SCHOOL_ADMIN);
    expect(dto.status).toBe(SchoolEmployeeStatusFilter.ACTIVE);
  });

  it('từ chối khi page < 1 hoặc không phải số nguyên', async () => {
    const dto = plainToInstance(ListSchoolEmployeesQueryDto, { page: '0' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('từ chối khi limit < 1 hoặc limit > 50', async () => {
    const dto1 = plainToInstance(ListSchoolEmployeesQueryDto, { limit: '0' });
    const errors1 = await validate(dto1);
    expect(errors1.some((e) => e.property === 'limit')).toBe(true);

    const dto2 = plainToInstance(ListSchoolEmployeesQueryDto, { limit: '51' });
    const errors2 = await validate(dto2);
    expect(errors2.some((e) => e.property === 'limit')).toBe(true);
  });

  it('từ chối vai trò lọc không hợp lệ (ngoài SCHOOL_ADMIN và BUS_ATTENDANT)', async () => {
    const dto = plainToInstance(ListSchoolEmployeesQueryDto, { role: 'PARENT' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('từ chối trạng thái lọc không hợp lệ (ngoài ACTIVE và INACTIVE)', async () => {
    const dto = plainToInstance(ListSchoolEmployeesQueryDto, { status: 'PENDING' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });
});
