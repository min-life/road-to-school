import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateSchoolDto } from './dto/create-school.dto.js';

describe('CreateSchoolDto Validation', () => {
  const validPayload = {
    name: 'Trường Tiểu học Lê Quý Đôn',
    addressText: 'Số 14 đường Lê Đức Thọ, Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội',
    latitude: '21.028511',
    longitude: '105.772341',
    contractStartDate: '2026-09-01',
    contractEndDate: '2027-08-31',
    weeklySchedule: '{"monday":{"start":"07:00","end":"17:30"}}',
  };

  it('hợp lệ với dữ liệu chuẩn và chuỗi số tọa độ', async () => {
    const dto = plainToInstance(CreateSchoolDto, validPayload);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.latitude).toBe(21.028511);
    expect(dto.longitude).toBe(105.772341);
  });

  describe('name validation', () => {
    it('từ chối tên trường dưới 2 ký tự hoặc để trống', async () => {
      const dto1 = plainToInstance(CreateSchoolDto, { ...validPayload, name: 'A' });
      const errors1 = await validate(dto1);
      expect(errors1.some((e) => e.property === 'name')).toBe(true);

      const dto2 = plainToInstance(CreateSchoolDto, { ...validPayload, name: '   ' });
      const errors2 = await validate(dto2);
      expect(errors2.some((e) => e.property === 'name')).toBe(true);
    });

    it('tự động trim khoảng trắng ở hai đầu tên trường', async () => {
      const dto = plainToInstance(CreateSchoolDto, {
        ...validPayload,
        name: '   Trường Nguyễn Huệ   ',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.name).toBe('Trường Nguyễn Huệ');
    });
  });

  describe('addressText validation', () => {
    it('từ chối địa chỉ dưới 5 ký tự hoặc toàn khoảng trắng', async () => {
      const dto = plainToInstance(CreateSchoolDto, {
        ...validPayload,
        addressText: 'HN',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'addressText')).toBe(true);
    });
  });

  describe('coordinate validation', () => {
    it('từ chối latitude ngoài khoảng [-90, 90]', async () => {
      const dto = plainToInstance(CreateSchoolDto, {
        ...validPayload,
        latitude: '95.5',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'latitude')).toBe(true);
    });

    it('từ chối longitude ngoài khoảng [-180, 180]', async () => {
      const dto = plainToInstance(CreateSchoolDto, {
        ...validPayload,
        longitude: '-185.0',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'longitude')).toBe(true);
    });

    it('từ chối tọa độ không phải số hoặc chuỗi rỗng', async () => {
      const dNaN = plainToInstance(CreateSchoolDto, {
        ...validPayload,
        latitude: 'not-a-number',
      });
      const errorsNaN = await validate(dNaN);
      expect(errorsNaN.some((e) => e.property === 'latitude')).toBe(true);

      const dEmpty = plainToInstance(CreateSchoolDto, {
        ...validPayload,
        latitude: '   ',
      });
      const errorsEmpty = await validate(dEmpty);
      expect(errorsEmpty.some((e) => e.property === 'latitude')).toBe(true);
    });
  });

  describe('contract dates validation', () => {
    it('từ chối ngày không tồn tại trên lịch (ví dụ: 2026-02-30)', async () => {
      const dto = plainToInstance(CreateSchoolDto, {
        ...validPayload,
        contractStartDate: '2026-02-30',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'contractStartDate')).toBe(true);
    });

    it('từ chối ngày sai định dạng (ví dụ: 01/09/2026)', async () => {
      const dto = plainToInstance(CreateSchoolDto, {
        ...validPayload,
        contractEndDate: '01/09/2026',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'contractEndDate')).toBe(true);
    });
  });
});
