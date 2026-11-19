import type { IncomingMessage, RequestListener, ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { httpCorsOptions } from './cors.config.js';

const logger = new Logger('Bootstrap');

async function createApp() {
  const app = await NestFactory.create(AppModule, { abortOnError: false });

  // Global prefix for all API endpoints
  app.setGlobalPrefix('api/v1');

  // Global validation pipe with Vietnamese error formatting
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (validationErrors = []) => {
        const messages = validationErrors.flatMap((error) =>
          error.constraints ? Object.values(error.constraints) : ['Dữ liệu không hợp lệ'],
        );
        return new BadRequestException({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: messages[0] || 'Dữ liệu đầu vào không hợp lệ',
          errors: messages,
        });
      },
    }),
  );

  // CORS configuration
  app.enableCors(httpCorsOptions);

  // Swagger OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('RoadToSchool API')
    .setDescription('Tài liệu giao diện lập trình ứng dụng (REST API) hệ thống RoadToSchool')
    .setVersion('1.0')
    .addTag('Authentication', 'Các API xác thực, đăng nhập, đăng ký và quản lý phiên người dùng')
    .addTag('Schools', 'Các API quản lý thông tin và trạng thái hoạt động của trường học đối tác')
    .addTag('Health', 'Kiểm tra trạng thái hệ thống và cơ sở dữ liệu')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Nhập Access Token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
  return app;
}

async function listenLocally() {
  const app = await createApp();
  app.enableShutdownHooks();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`Backend server listening on 0.0.0.0:${port}`);
  logger.log(`API Base: http://localhost:${port}/api/v1`);
  logger.log(`Swagger Docs: http://localhost:${port}/api/docs`);
  logger.log(`Health Check: http://localhost:${port}/api/v1/health`);
  logger.log(`Database Health: http://localhost:${port}/api/v1/health/db`);
}

async function initializeRequestListener() {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance() as RequestListener;
}

let requestListener: ReturnType<typeof initializeRequestListener> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  requestListener ??= initializeRequestListener().catch((error: unknown) => {
    requestListener = undefined;
    throw error;
  });

  let listener: Awaited<ReturnType<typeof initializeRequestListener>>;
  try {
    listener = await requestListener;
  } catch (error) {
    logger.error('Failed to initialize the API', error);
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ statusCode: 503, message: 'Service unavailable' }));
    return;
  }
  listener(req, res);
}

const entrypoint = process.argv[1] && pathToFileURL(process.argv[1]).href;
if (entrypoint && (entrypoint === import.meta.url || `${entrypoint}.js` === import.meta.url)) {
  void listenLocally();
}

