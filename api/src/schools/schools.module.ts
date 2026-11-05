import { SchoolLifecycleController } from './school-lifecycle.controller.js';
import { ServiceCalendarService } from './service-calendar.service.js';
import { TripFinalizationService } from './trip-finalization.service.js';
import { SchoolLifecycleModule } from '../schools/school-lifecycle.module.js';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SchoolsController } from './schools.controller.js';
import { SchoolsService } from './schools.service.js';
import { CloudinaryService } from './cloudinary.service.js';

@Module({
  imports: [SchoolLifecycleModule, AuthModule],
  controllers: [SchoolsController, SchoolLifecycleController],
  providers: [SchoolsService, CloudinaryService, ServiceCalendarService, TripFinalizationService],
  exports: [SchoolsService, CloudinaryService],
})
export class SchoolsModule {}
