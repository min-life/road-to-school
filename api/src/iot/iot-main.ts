import { StudentsModule } from '../students/students.module.js';
import { BadRequestException, Module, ValidationPipe } from '@nestjs/common';
import { ConditionalModule, ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaModule } from '../prisma/prisma.module.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { HealthModule } from '../health/health.module.js';
import { IotModule } from './iot.module.js';
import { isIotEnabled } from './iot.constants.js';

// Local acceptance runtime: reuse real authentication, without importing business cron modules.
// The normal application still integrates IoT through AppModule; it is not replaced.
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }), PrismaModule, HealthModule, VehiclesModule, StudentsModule,
    ConditionalModule.registerWhen(IotModule, isIotEnabled, { debug: false })],
})
class IotLocalModule {}

async function bootstrap() {
  const app = await NestFactory.create(IotLocalModule);
  const config = app.get(ConfigService);
  if (!isIotEnabled(process.env)) {
    await app.close();
    throw new Error('Set IOT_ENABLED=true before starting the local IoT runtime');
  }
  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, transform: true, forbidNonWhitelisted: true,
    exceptionFactory: (errors = []) => {
      const messages = errors.flatMap(error => error.constraints ? Object.values(error.constraints) : ['Dữ liệu không hợp lệ']);
      return new BadRequestException({ statusCode: 400, code: 'VALIDATION_ERROR',
        message: messages[0] || 'Dữ liệu đầu vào không hợp lệ', errors: messages });
    },
  }));
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], credentials: true,
  });
  const document = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('RoadToSchool IoT — Local acceptance')
    .setDescription('IoT, Health và xác thực thật; không khởi chạy các cron nghiệp vụ.')
    .setVersion('1.0').addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-auth').build());
  SwaggerModule.setup('api/docs', app, document);
  const port = Number(config.get<string>('PORT') || 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`IoT local runtime ready: http://localhost:${port}/api/docs`);
}

void bootstrap();
