import type { CorsOptions, CustomOrigin } from '@nestjs/common/internal';

export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin || origin === 'null' || origin === '*') return false;
  return (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .some((allowedOrigin) => allowedOrigin.trim() === origin);
}

export const corsOrigin: CustomOrigin = (origin, callback) => {
  callback(null, isAllowedCorsOrigin(origin));
};

export const httpCorsOptions: CorsOptions = {
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};
