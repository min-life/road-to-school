import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (user?: any): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('cho phép truy cập nếu route không đặt decorator @Roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ role: Role.PARENT });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('cho phép truy cập khi người dùng có đúng quyền SYSTEM_ADMIN', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.SYSTEM_ADMIN]);
    const context = createMockContext({ role: Role.SYSTEM_ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('từ chối truy cập 403 Forbidden nếu người dùng là SCHOOL_ADMIN', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.SYSTEM_ADMIN]);
    const context = createMockContext({ role: Role.SCHOOL_ADMIN });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Bạn không có quyền thực hiện thao tác này');
  });

  it('từ chối truy cập 403 Forbidden nếu người dùng là PARENT', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.SYSTEM_ADMIN]);
    const context = createMockContext({ role: Role.PARENT });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('từ chối truy cập 403 Forbidden nếu người dùng là DRIVER', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.SYSTEM_ADMIN]);
    const context = createMockContext({ role: Role.DRIVER });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('từ chối truy cập 403 Forbidden nếu người dùng là BUS_ATTENDANT', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.SYSTEM_ADMIN]);
    const context = createMockContext({ role: Role.BUS_ATTENDANT });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('từ chối truy cập 403 Forbidden nếu không có thông tin user trong request', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.SYSTEM_ADMIN]);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
