import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { SchoolsModule } from './schools/schools.module.js';
import { StudentsModule } from './students/students.module.js';
import { DriversModule } from './drivers/drivers.module.js';
import { ParentsModule } from './parents/parents.module.js';
import { SystemSettingsModule } from './system-settings/system-settings.module.js';
import { VehiclesModule } from './vehicles/vehicles.module.js';
import { StudentRequestsModule } from './student-requests/student-requests.module.js';
import { RoutesModule } from './routes/routes.module.js';
import { TripsModule } from './trips/trips.module.js';
import { LeaveNoticesModule } from './leave-notices/leave-notices.module.js';
import { IncidentsModule } from './incidents/incidents.module.js';
import { OverviewModule } from './overview/overview.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    SchoolsModule,
    StudentsModule,
    DriversModule,
    ParentsModule,
    SystemSettingsModule,
    VehiclesModule,
    StudentRequestsModule,
    RoutesModule,
    TripsModule,
    LeaveNoticesModule,
    IncidentsModule,
    OverviewModule,
    NotificationsModule,
  ],
})
export class AppModule {}
