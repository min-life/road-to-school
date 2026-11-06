# Schema và migrations

28/10/2026. Nguồn: [api/prisma/schema.prisma](../../api/prisma/schema.prisma). Đây là schema source, không chứng minh DB local đã apply hoặc không drift.

## model SystemHealth

```prisma
model SystemHealth {
  id        String   @id @default(uuid())
  status    String   @default("ok")
  checkedAt DateTime @default(now())

  @@map("system_health")
}
```

## enum Role

```prisma
enum Role {
  SYSTEM_ADMIN
  SCHOOL_ADMIN
  DRIVER
  BUS_ATTENDANT
  PARENT
}
```

## enum OtpPurpose

```prisma
enum OtpPurpose {
  PARENT_REGISTRATION
  PASSWORD_RESET
  PARENT_STUDENT_LINKING
  STUDENT_UPDATE_REQUEST
  LEAVE_NOTICE
}
```

## enum StudentStatus

```prisma
enum StudentStatus {
  AVAILABLE
  DISABLED
}
```

## enum DeliveryChannel

```prisma
enum DeliveryChannel {
  EMAIL
  SMS
}
```

## enum RequestType

```prisma
enum RequestType {
  INFORMATION_UPDATE
  ADDRESS_UPDATE
}
```

## enum RequestStatus

```prisma
enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}
```

## enum RoutePlanStatus

```prisma
enum RoutePlanStatus {
  DRAFT
  ACTIVE
  CANCELLED
  EXPIRED
}
```

## enum TripStatus

```prisma
enum TripStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

## enum RouteDirection

```prisma
enum RouteDirection {
  TO_SCHOOL
  TO_PARKING
}
```

## enum RouteStopType

```prisma
enum RouteStopType {
  PARKING_START
  PICKUP
  SCHOOL_ARRIVAL
  SCHOOL_DEPARTURE
  DROPOFF
  PARKING_END
}
```

## enum AttendanceStatus

```prisma
enum AttendanceStatus {
  UNMARKED
  PRESENT
  ABSENT
}
```

## enum LeaveNoticeKind

```prisma
enum LeaveNoticeKind {
  STUDENT
  DRIVER
  BUS_ATTENDANT
}
```

## enum LeaveNoticeStatus

```prisma
enum LeaveNoticeStatus {
  RECORDED
  PENDING_REPLACEMENT
  REPLACED
  WITHDRAWN
  TRIP_CANCELLED
}
```

## enum TripIncidentType

```prisma
enum TripIncidentType {
  ATTENDANT_MISSING
  DRIVER_MISSING
  OFF_ROUTE
  LATE_STOP
}
```

## enum TripIncidentStatus

```prisma
enum TripIncidentStatus {
  WAITING_ASSIGNMENT
  WAITING_CONFIRMATION
  RESOLVED
  CONFIRMED
  CLOSED
}
```

## model User

```prisma
model User {
  id             String    @id @default(uuid())
  email          String?   @unique
  phone          String?   @unique
  fullName       String    @map("full_name")
  passwordHash   String    @map("password_hash")
  role           Role
  avatarUrl      String?   @map("avatar_url")
  avatarPublicId String?   @map("avatar_public_id")
  isVerified     Boolean   @default(true) @map("is_verified")
  isActive       Boolean   @default(true) @map("is_active")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  // School association
  schoolId       String?   @map("school_id")
  school         School?   @relation(fields: [schoolId], references: [id], onDelete: Restrict)

  // Relationships
  sessions           Session[]
  notifications      Notification[]
  otpChallenges      OtpChallenge[]
  parentStudentLinks ParentStudentLink[]
  createdRequests    StudentUpdateRequest[] @relation("CreatedRequests")
  reviewedRequests   StudentUpdateRequest[] @relation("ReviewedRequests")
  createdRoutePlans  RoutePlan[]            @relation("RoutePlanCreator")
  cancelledRoutePlans RoutePlan[]           @relation("RoutePlanCanceller")
  approvedRoutePlans RoutePlan[]            @relation("RoutePlanApprover")
  defaultDriverRoutes Route[]               @relation("RouteDefaultDriver")
  defaultBusAttendantRoutes Route[]         @relation("RouteDefaultBusAttendant")
  assignedDriverTrips Trip[]                @relation("TripDriver")
  assignedBusAttendantTrips Trip[]          @relation("TripBusAttendant")
  markedTripAttendances TripAttendance[]    @relation("AttendanceMarker")
  cancelledTrips        Trip[]              @relation("TripCanceller")
  reportedLeaveNotices  LeaveNotice[]       @relation("ReportedLeaveNotices")
  replacementLeaveNotices LeaveNotice[]     @relation("ReplacementLeaveNotices")
  processedLeaveNotices LeaveNotice[]       @relation("ProcessedLeaveNotices")
  cancelledLeaveNotices LeaveNotice[]       @relation("CancelledLeaveNotices")
  reportedIncidents     TripIncident[]      @relation("ReportedIncidents")
  processedIncidents    TripIncident[]      @relation("ProcessedIncidents")

  @@index([schoolId])
  @@map("users")
}
```

## model Session

```prisma
model Session {
  id               String    @id @default(uuid())
  userId           String    @map("user_id")
  refreshTokenHash String    @map("refresh_token_hash")
  tokenVersion     Int       @default(1) @map("token_version")
  deviceInfo       String?   @map("device_info")
  pushToken        String?   @unique @map("push_token")
  ipAddress        String?   @map("ip_address")
  expiresAt        DateTime  @map("expires_at")
  revokedAt        DateTime? @map("revoked_at")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@index([revokedAt])
  @@map("sessions")
}
```

## model OtpChallenge

```prisma
model OtpChallenge {
  id          String          @id @default(uuid())
  userId      String?         @map("user_id")
  studentId   String?         @map("student_id")
  identifier  String
  channel     DeliveryChannel
  purpose     OtpPurpose
  otpHash     String          @map("otp_hash")
  payloadHash String?         @map("payload_hash")
  attempts    Int             @default(0)
  expiresAt   DateTime        @map("expires_at")
  consumedAt  DateTime?       @map("consumed_at")
  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt @map("updated_at")

  // Relations
  user    User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  student Student? @relation(fields: [studentId], references: [id], onDelete: Cascade)
  leaveNotice LeaveNotice?

  @@index([identifier, purpose])
  @@index([expiresAt])
  @@index([studentId])
  @@map("otp_challenges")
}
```

## model School

```prisma
model School {
  id                String    @id @default(uuid())
  name              String
  addressText       String    @map("address_text")
  latitude          Float
  longitude         Float
  imageUrl          String?   @map("image_url")
  imagePublicId     String?   @map("image_public_id")
  contractStartDate DateTime  @map("contract_start_date") @db.Date
  contractEndDate   DateTime  @map("contract_end_date") @db.Date
  weeklySchedule    Json      @map("weekly_schedule")
  isActive          Boolean   @default(true) @map("is_active")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  // Quan hệ
  users             User[]
  students          Student[]
  updateRequests    StudentUpdateRequest[]
  routePlans        RoutePlan[]
  routes            Route[]
  trips             Trip[]

  @@index([name])
  @@index([isActive])
  @@map("schools")
}
```

## model Student

```prisma
model Student {
  id              String         @id @default(uuid())
  code            String         @unique
  schoolId        String         @map("school_id")
  fullName        String         @map("full_name")
  guardianPhone   String         @map("guardian_phone")
  avatarUrl       String?        @map("avatar_url")
  avatarPublicId  String?        @map("avatar_public_id")
  addressText     String?        @map("address_text")
  latitude        Float?
  longitude       Float?
  status          StudentStatus  @default(AVAILABLE)
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  // Quan hệ
  school          School                 @relation(fields: [schoolId], references: [id], onDelete: Restrict)
  parentLinks     ParentStudentLink[]
  otpChallenges   OtpChallenge[]
  updateRequests  StudentUpdateRequest[]
  routeStops      RouteStop[]
  tripAttendances TripAttendance[]
  leaveNotices    LeaveNotice[]

  @@index([schoolId])
  @@index([status])
  @@index([fullName])
  @@map("students")
}
```

## model ParentStudentLink

```prisma
model ParentStudentLink {
  id         String    @id @default(uuid())
  parentId   String    @map("parent_id")
  studentId  String    @map("student_id")
  linkedAt   DateTime  @default(now()) @map("linked_at")

  // Quan hệ
  parent     User      @relation(fields: [parentId], references: [id], onDelete: Cascade)
  student    Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([parentId, studentId])
  @@index([parentId])
  @@index([studentId])
  @@map("parent_student_links")
}
```

## model Vehicle

```prisma
model Vehicle {
  id              String   @id @default(uuid())
  brand           String   @db.VarChar(100)
  seatCount       Int      @map("seat_count")
  licensePlate    String   @unique @map("license_plate") @db.VarChar(20)
  normalizedPlate String   @unique @map("normalized_plate") @db.VarChar(20)
  color           String   @db.VarChar(50)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Quan hệ
  proposedRoutes  Route[]
  assignedTrips   Trip[]

  @@index([brand])
  @@map("vehicles")
}
```

## model SystemSetting

```prisma
model SystemSetting {
  id          String   @id @default("default")
  key         String   @unique @db.VarChar(50)
  value       Json     @map("value")
  updatedById String?  @map("updated_by_id")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("system_settings")
}
```

## model StudentUpdateRequest

```prisma
model StudentUpdateRequest {
  id              String        @id @default(uuid())
  studentId       String        @map("student_id")
  parentId        String        @map("parent_id")
  schoolId        String        @map("school_id")
  type            RequestType
  status          RequestStatus @default(PENDING)
  beforeData      Json          @map("before_data")
  proposedData    Json          @map("proposed_data")
  resolution      Json?         @map("resolution")
  rejectionReason String?       @map("rejection_reason") @db.VarChar(500)
  reviewedById    String?       @map("reviewed_by_id")
  reviewedAt      DateTime?     @map("reviewed_at")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  // Quan hệ
  student         Student       @relation(fields: [studentId], references: [id], onDelete: Cascade)
  parent          User          @relation("CreatedRequests", fields: [parentId], references: [id], onDelete: Restrict)
  school          School        @relation(fields: [schoolId], references: [id], onDelete: Restrict)
  reviewedBy      User?         @relation("ReviewedRequests", fields: [reviewedById], references: [id], onDelete: SetNull)

  @@index([schoolId, status])
  @@index([studentId, status])
  @@index([parentId, status])
  @@index([type, status])
  @@index([createdAt])
  @@map("student_update_requests")
}
```

## model RoutePlan

```prisma
model RoutePlan {
  id                  String          @id @default(uuid())
  schoolId            String          @map("school_id")
  name                String          @db.VarChar(255)
  status              RoutePlanStatus @default(DRAFT)
  scheduleScope       Json            @map("schedule_scope")
  routingConstraints  Json            @map("routing_constraints")
  totalStudents       Int             @default(0) @map("total_students")
  totalOutboundRoutes Int             @default(0) @map("total_outbound_routes")
  totalReturnRoutes   Int             @default(0) @map("total_return_routes")
  createdById         String          @map("created_by_id")
  createdAt           DateTime        @default(now()) @map("created_at")
  updatedAt           DateTime        @updatedAt @map("updated_at")
  cancelledAt         DateTime?       @map("cancelled_at")
  cancelledById       String?         @map("cancelled_by_id")
  cancellationReason  String?         @map("cancellation_reason") @db.VarChar(500)
  activatedAt         DateTime?       @map("activated_at")
  approvedById        String?         @map("approved_by_id")

  // Quan hệ
  school      School   @relation(fields: [schoolId], references: [id], onDelete: Restrict)
  createdBy   User     @relation("RoutePlanCreator", fields: [createdById], references: [id], onDelete: Restrict)
  cancelledBy User?    @relation("RoutePlanCanceller", fields: [cancelledById], references: [id], onDelete: SetNull)
  approvedBy  User?    @relation("RoutePlanApprover", fields: [approvedById], references: [id], onDelete: SetNull)
  routes      Route[]

  @@index([schoolId, status])
  @@index([status, createdAt])
  @@map("route_plans")
}
```

## model Route

```prisma
model Route {
  id                       String         @id @default(uuid())
  routePlanId              String         @map("route_plan_id")
  schoolId                 String         @map("school_id")
  name                     String         @db.VarChar(255)
  direction                RouteDirection
  proposedVehicleId        String?        @map("proposed_vehicle_id")
  defaultDriverId          String?        @map("default_driver_id")
  defaultBusAttendantId    String?        @map("default_bus_attendant_id")
  totalDistanceMeters      Int            @default(0) @map("total_distance_meters")
  estimatedDurationSeconds Int            @default(0) @map("estimated_duration_seconds")
  departureTime            String?        @map("departure_time") @db.VarChar(10)
  arrivalTime              String?        @map("arrival_time") @db.VarChar(10)
  polylineGeometry         String         @map("polyline_geometry") @db.Text
  routingConstraints       Json?          @map("routing_constraints")
  createdAt                DateTime       @default(now()) @map("created_at")
  updatedAt                DateTime       @updatedAt @map("updated_at")

  // Quan hệ
  routePlan            RoutePlan   @relation(fields: [routePlanId], references: [id], onDelete: Cascade)
  school               School      @relation(fields: [schoolId], references: [id], onDelete: Restrict)
  proposedVehicle      Vehicle?    @relation(fields: [proposedVehicleId], references: [id], onDelete: SetNull)
  defaultDriver        User?       @relation("RouteDefaultDriver", fields: [defaultDriverId], references: [id], onDelete: SetNull)
  defaultBusAttendant  User?       @relation("RouteDefaultBusAttendant", fields: [defaultBusAttendantId], references: [id], onDelete: SetNull)
  stops                RouteStop[]
  trips                Trip[]

  @@index([routePlanId, direction])
  @@index([schoolId, direction])
  @@index([proposedVehicleId])
  @@index([defaultDriverId])
  @@index([defaultBusAttendantId])
  @@map("routes")
}
```

## model RouteStop

```prisma
model RouteStop {
  id                    String        @id @default(uuid())
  routeId               String        @map("route_id")
  stopOrder             Int           @map("stop_order")
  stopType              RouteStopType @map("stop_type")
  studentId             String?       @map("student_id")
  addressText           String        @map("address_text")
  latitude              Float
  longitude             Float
  plannedArrivalSeconds Int?          @map("planned_arrival_seconds")
  plannedArrivalTime   String?       @map("planned_arrival_time") @db.VarChar(10)
  createdAt             DateTime      @default(now()) @map("created_at")

  // Quan hệ
  route   Route    @relation(fields: [routeId], references: [id], onDelete: Cascade)
  student Student? @relation(fields: [studentId], references: [id], onDelete: Restrict)

  @@index([routeId, stopOrder])
  @@index([studentId])
  @@map("route_stops")
}
```

## model Trip

```prisma
model Trip {
  id                     String         @id @default(uuid())
  routeId                String         @map("route_id")
  schoolId               String         @map("school_id")
  serviceDate            DateTime       @map("service_date") @db.Date
  direction              RouteDirection
  status                 TripStatus     @default(SCHEDULED)
  scheduledStartAt       DateTime?      @map("scheduled_start_at")
  scheduledEndAt         DateTime?      @map("scheduled_end_at")
  scheduledStartTime     String?        @map("scheduled_start_time") @db.VarChar(10)
  scheduledEndTime       String?        @map("scheduled_end_time") @db.VarChar(10)
  actualStartTime        DateTime?      @map("actual_start_time")
  actualEndTime          DateTime?      @map("actual_end_time")
  attendantReadyAt       DateTime?      @map("attendant_ready_at")
  arrivedAtSchoolAt      DateTime?      @map("arrived_at_school_at")
  assignedVehicleId      String         @map("assigned_vehicle_id")
  assignedDriverId       String         @map("assigned_driver_id")
  assignedBusAttendantId String         @map("assigned_bus_attendant_id")
  cancellationReason     String?        @map("cancellation_reason") @db.VarChar(500)
  cancelledAt            DateTime?      @map("cancelled_at")
  cancelledById          String?        @map("cancelled_by_id")
  navigationState        Json?          @map("navigation_state")
  routeSnapshot          Json?          @map("route_snapshot")
  createdAt              DateTime       @default(now()) @map("created_at")
  updatedAt              DateTime       @updatedAt @map("updated_at")

  // Quan hệ
  route                  Route          @relation(fields: [routeId], references: [id], onDelete: Restrict)
  school                 School         @relation(fields: [schoolId], references: [id], onDelete: Restrict)
  assignedVehicle        Vehicle        @relation(fields: [assignedVehicleId], references: [id], onDelete: Restrict)
  assignedDriver         User           @relation("TripDriver", fields: [assignedDriverId], references: [id], onDelete: Restrict)
  assignedBusAttendant   User           @relation("TripBusAttendant", fields: [assignedBusAttendantId], references: [id], onDelete: Restrict)
  cancelledBy            User?          @relation("TripCanceller", fields: [cancelledById], references: [id], onDelete: SetNull)
  attendances            TripAttendance[]
  locationPoints         TripLocationPoint[]
  leaveNotices           LeaveNotice[]
  incidents              TripIncident[]

  @@unique([routeId, serviceDate])
  @@index([schoolId, serviceDate])
  @@index([assignedDriverId, serviceDate])
  @@index([assignedBusAttendantId, serviceDate])
  @@index([assignedVehicleId, serviceDate])
  @@index([status, serviceDate])
  @@map("trips")
}
```

## model TripLocationPoint

```prisma
model TripLocationPoint {
  tripId     String   @map("trip_id")
  sequence   Int
  latitude   Float
  longitude  Float
  recordedAt DateTime @default(now()) @map("recorded_at")
  runId      String   @map("run_id")
  trip       Trip     @relation(fields: [tripId], references: [id], onDelete: Restrict)

  @@id([tripId, sequence])
  @@map("trip_location_points")
}
```

## model TripAttendance

```prisma
model TripAttendance {
  id            String           @id @default(uuid())
  tripId        String           @map("trip_id")
  studentId     String           @map("student_id")
  status        AttendanceStatus @default(UNMARKED)
  absenceReason String?          @map("absence_reason") @db.VarChar(500)
  markedById    String?          @map("marked_by_id")
  markedAt      DateTime?        @map("marked_at")
  alightedAt    DateTime?        @map("alighted_at")
  excludedAt    DateTime?        @map("excluded_at")
  exclusionReason String?        @map("exclusion_reason") @db.VarChar(500)
  createdAt     DateTime         @default(now()) @map("created_at")
  updatedAt     DateTime         @updatedAt @map("updated_at")

  // Quan hệ
  trip          Trip             @relation(fields: [tripId], references: [id], onDelete: Cascade)
  student       Student          @relation(fields: [studentId], references: [id], onDelete: Restrict)
  markedBy      User?            @relation("AttendanceMarker", fields: [markedById], references: [id], onDelete: SetNull)

  @@unique([tripId, studentId])
  @@index([tripId, status])
  @@index([studentId, status])
  @@index([markedById])
  @@map("trip_attendances")
}
```

## model LeaveNotice

```prisma
model LeaveNotice {
  id                String            @id @default(uuid())
  tripId            String            @map("trip_id")
  kind              LeaveNoticeKind
  reportedById      String            @map("reported_by_id")
  studentId         String?           @map("student_id")
  otpChallengeId    String            @unique @map("otp_challenge_id")
  status            LeaveNoticeStatus @default(RECORDED)
  replacementUserId String?           @map("replacement_user_id")
  processedById     String?           @map("processed_by_id")
  processedAt       DateTime?         @map("processed_at")
  attendanceBefore  Json?             @map("attendance_before")
  cancelledAt       DateTime?         @map("cancelled_at")
  cancelledById     String?           @map("cancelled_by_id")
  createdAt         DateTime          @default(now()) @map("created_at")
  updatedAt         DateTime          @updatedAt @map("updated_at")

  // Quan hệ
  trip              Trip              @relation(fields: [tripId], references: [id], onDelete: Cascade)
  reportedBy        User              @relation("ReportedLeaveNotices", fields: [reportedById], references: [id], onDelete: Restrict)
  student           Student?          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  otpChallenge      OtpChallenge      @relation(fields: [otpChallengeId], references: [id], onDelete: Restrict)
  replacementUser   User?             @relation("ReplacementLeaveNotices", fields: [replacementUserId], references: [id], onDelete: SetNull)
  processedBy       User?             @relation("ProcessedLeaveNotices", fields: [processedById], references: [id], onDelete: SetNull)
  cancelledBy       User?             @relation("CancelledLeaveNotices", fields: [cancelledById], references: [id], onDelete: SetNull)

  @@index([tripId, status])
  @@index([studentId, status])
  @@index([reportedById, status])
  @@index([status, createdAt])
  @@map("leave_notices")
}
```

## model TripIncident

```prisma
model TripIncident {
  id            String             @id @default(uuid())
  tripId        String             @map("trip_id")
  type          TripIncidentType   @map("type")
  status        TripIncidentStatus @map("status")
  reportedById  String?            @map("reported_by_id")
  description   String?            @db.Text
  context       Json?              @map("context")
  dedupeKey     String             @unique @map("dedupe_key")
  processedById String?            @map("processed_by_id")
  processedAt   DateTime?          @map("processed_at")
  resolution    Json?              @map("resolution")
  createdAt     DateTime           @default(now()) @map("created_at")
  updatedAt     DateTime           @updatedAt @map("updated_at")

  // Quan hệ
  trip        Trip  @relation(fields: [tripId], references: [id], onDelete: Restrict)
  reportedBy  User? @relation("ReportedIncidents", fields: [reportedById], references: [id], onDelete: SetNull)
  processedBy User? @relation("ProcessedIncidents", fields: [processedById], references: [id], onDelete: SetNull)

  @@index([tripId, createdAt])
  @@index([status, createdAt])
  @@map("trip_incidents")
}
```

## model Notification

```prisma
model Notification {
  id            String    @id @default(uuid())
  userId        String    @map("user_id")
  eventKey      String    @map("event_key")
  type          String
  title         String
  body          String
  targetType    String    @map("target_type")
  targetId      String    @map("target_id")
  context       Json?
  readAt        DateTime? @map("read_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  pushState     String    @default("NONE") @map("push_state")
  pushAttempts  Int       @default(0) @map("push_attempts")
  pushAfterAt   DateTime? @map("push_after_at")
  pushDelivery  Json?     @map("push_delivery")
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, eventKey])
  @@index([userId, readAt, createdAt])
  @@index([pushState, pushAfterAt])
  @@map("notifications")
}
```

## Migrations theo thứ tự

- [api/prisma/migrations/20261022044934_init/migration.sql](../../api/prisma/migrations/20261022044934_init/migration.sql)
- [api/prisma/migrations/20261022091920_init_auth_tables/migration.sql](../../api/prisma/migrations/20261022091920_init_auth_tables/migration.sql)
- [api/prisma/migrations/20261022143540_add_schools_table/migration.sql](../../api/prisma/migrations/20261022143540_add_schools_table/migration.sql)
- [api/prisma/migrations/20261023053710_add_students_and_parent_links/migration.sql](../../api/prisma/migrations/20261023053710_add_students_and_parent_links/migration.sql)
- [api/prisma/migrations/20261023105820_add_vehicles_settings_and_update_requests/migration.sql](../../api/prisma/migrations/20261023105820_add_vehicles_settings_and_update_requests/migration.sql)
- [api/prisma/migrations/20261023203124_add_routes_and_route_plans/migration.sql](../../api/prisma/migrations/20261023203124_add_routes_and_route_plans/migration.sql)
- [api/prisma/migrations/20261024113252_add_trips_and_approval/migration.sql](../../api/prisma/migrations/20261024113252_add_trips_and_approval/migration.sql)
- [api/prisma/migrations/20261025052642_add_trip_attendance_roster/migration.sql](../../api/prisma/migrations/20261025052642_add_trip_attendance_roster/migration.sql)
- [api/prisma/migrations/20261025071759_add_trip_school_arrival_and_alighting/migration.sql](../../api/prisma/migrations/20261025071759_add_trip_school_arrival_and_alighting/migration.sql)
- [api/prisma/migrations/20261025130000_add_trip_navigation_history/migration.sql](../../api/prisma/migrations/20261025130000_add_trip_navigation_history/migration.sql)
- [api/prisma/migrations/20261025212318_add_leave_notices/migration.sql](../../api/prisma/migrations/20261025212318_add_leave_notices/migration.sql)
- [api/prisma/migrations/20261026061750_add_lifecycle_and_route_snapshots/migration.sql](../../api/prisma/migrations/20261026061750_add_lifecycle_and_route_snapshots/migration.sql)
- [api/prisma/migrations/20261026174653_add_trip_incidents/migration.sql](../../api/prisma/migrations/20261026174653_add_trip_incidents/migration.sql)
- [api/prisma/migrations/20261027000000_add_notifications/migration.sql](../../api/prisma/migrations/20261027000000_add_notifications/migration.sql)

Không chạy reset/seed/backfill để kiểm tra. Dùng migrate status trước; deploy chỉ trên DB local đã được cấp quyền, sau khi đọc SQL và bảo vệ dữ liệu hiện có.
