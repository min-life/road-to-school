import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown
  app.enableShutdownHooks();

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
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

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

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`Backend server listening on 0.0.0.0:${port}`);
  logger.log(`API Base: http://localhost:${port}/api/v1`);
  logger.log(`Swagger Docs: http://localhost:${port}/api/docs`);
  logger.log(`Health Check: http://localhost:${port}/api/v1/health`);
  logger.log(`Database Health: http://localhost:${port}/api/v1/health/db`);
}

bootstrap();

