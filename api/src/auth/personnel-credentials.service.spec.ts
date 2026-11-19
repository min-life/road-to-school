import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { EmailDeliveryService } from './email-delivery.service.js';
import { PersonnelCredentialsService } from './personnel-credentials.service.js';

describe('PersonnelCredentialsService', () => {
  function credentialsFor(mode: string, environment: string) {
    const config = new ConfigService({ AUTH_EMAIL_MODE: mode, NODE_ENV: environment });
    return new PersonnelCredentialsService({} as PrismaService, new EmailDeliveryService(config));
  }

  it('uses the default password for console email delivery in development', () => {
    expect(credentialsFor('console', 'development').generateTemporaryPassword()).toBe('Pass@123');
  });

  it.each([
    ['smtp', 'development'],
    ['console', 'production'],
  ])('generates a random password for %s in %s', (mode, environment) => {
    expect(credentialsFor(mode, environment).generateTemporaryPassword()).toMatch(/^[\w-]{12}$/);
  });
});
