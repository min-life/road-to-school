export type Role =
  | 'SYSTEM_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'DRIVER'
  | 'BUS_ATTENDANT'
  | 'PARENT';

export interface User {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  schoolId?: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  errors?: string[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface SchoolListItem {
  id: string;
  name: string;
  addressText: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  contractStartDate: string;
  contractEndDate: string;
  isActive: boolean;
  createdAt: string;
  employeeCount: number;
}

export interface SchoolListResponse {
  items: SchoolListItem[];
  meta: PaginationMeta;
}

export interface DaySchedule {
  start: string;
  end: string;
}

export type WeeklySchedule = Record<string, DaySchedule>;

export interface SchoolDetail {
  id: string;
  name: string;
  addressText: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  imagePublicId: string | null;
  contractStartDate: string;
  contractEndDate: string;
  weeklySchedule: WeeklySchedule;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employeeCount: number;
}

export interface UpdateSchoolStatusResponse {
  id: string;
  isActive: boolean;
  message: string;
}

export interface SchoolEmployeeItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface SchoolEmployeeListResponse {
  items: SchoolEmployeeItem[];
  meta: PaginationMeta;
}

export interface CreateSchoolAdminResponse {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  schoolId: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  message: string;
}

export type StudentStatus = 'AVAILABLE' | 'DISABLED';

export interface StudentListItem {
  id: string;
  code: string;
  fullName: string;
  guardianPhone: string;
  avatarUrl: string | null;
  status: StudentStatus;
  hasAddress: boolean;
  createdAt: string;
}

export interface StudentListResponse {
  items: StudentListItem[];
  meta: PaginationMeta;
}

export interface StudentDetail {
  id: string;
  code: string;
  schoolId: string;
  schoolName: string;
  fullName: string;
  guardianPhone: string;
  avatarUrl: string | null;
  addressText: string | null;
  latitude: number | null;
  longitude: number | null;
  status: StudentStatus;
  hasAddress: boolean;
  qrData: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  schoolId: string | null;
  isActive: boolean;
  isVerified: boolean;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface DriverListResponse {
  items: DriverItem[];
  meta: PaginationMeta;
}

export interface CreateDriverResponse {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  schoolId: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  message: string;
}

export interface SchoolEmployeeDetail {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  schoolId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// Round 3 Types: Vehicles, Settings & Requests
// ==========================================

export interface Vehicle {
  id: string;
  brand: string;
  seatCount: number; // Số ghế khả dụng cho học sinh
  licensePlate: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleListResponse {
  items: Vehicle[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateVehicleDto {
  brand: string;
  seatCount: number;
  licensePlate: string;
  color: string;
}

export interface ParkingLot {
  addressText: string;
  latitude: number;
  longitude: number;
  updatedAt: string | null;
}

export type RequestType = 'INFORMATION_UPDATE' | 'ADDRESS_UPDATE';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type UserRole = Role;

export interface UpdateParkingLotDto {
  addressText: string;
  latitude: number;
  longitude: number;
  reason?: string;
  expectedFingerprint?: string;
}

export interface ParkingLotImpactResponse {
  currentAddressText?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  hasCoordinateChanged?: boolean;
  totalDraftPlansCount?: number;
  totalActivePlansCount?: number;
  cancelledPlansCount?: number;
  totalScheduledTripsCount?: number;
  cancelledTripsCount?: number;
  totalInProgressTripsCount?: number;
  inProgressTripsPreservedCount?: number;
  fingerprint?: string;
  expectedFingerprint?: string;
}

export interface SchoolLocationImpactResponse {
  hasCoordinateChanged: boolean;
  schoolId: string;
  cancelledPlansCount: number;
  cancelledTripsCount: number;
  inProgressTripsPreservedCount: number;
  fingerprint: string;
  draftPlansCount?: number;
  activePlansCount?: number;
  scheduledTripsCount?: number;
  inProgressTripsCount?: number;
  expectedFingerprint?: string;
}

export interface RoutePlanCancellationImpactResponse {
  planId: string;
  status: RoutePlanStatus;
  scheduledTripsCount: number;
  inProgressTripsCount: number;
  pendingStaffLeaveNoticesCount: number;
  routesCount: number;
  fingerprint: string;
}

export interface EmptyRoutePlanInfo {
  planId: string;
  planName: string;
  planStatus: RoutePlanStatus;
  routeId: string;
  routeName: string;
}

export interface StudentDisableImpactResponse {
  studentId: string;
  fullName: string;
  code: string;
  schoolId: string;
  activeRoutePlansCount: number;
  draftRoutePlansCount: number;
  scheduledTripsCount: number;
  emptyRoutesWillCancelTripsCount: number;
  emptyRoutePlans?: EmptyRoutePlanInfo[];
  requiresPlanCancellation?: boolean;
}

export interface UpdateStudentStatusResponse extends StudentListItem {
  message?: string;
  emptyRoutePlans?: EmptyRoutePlanInfo[];
  requiresPlanCancellation?: boolean;
}

export interface RouteInsertionOptionPair {
  planId: string;
  planName: string;
  planStatus: RoutePlanStatus | string;
  outboundRoute: {
    id: string;
    name: string;
    direction?: RouteDirection;
    currentStudents?: number;
    currentStudentsCount: number;
    seatCount?: number;
    vehicleCapacity: number;
    vehiclePlate: string;
    availableSeats?: number;
    maxRouteDurationMinutes?: number;
    defaultStopServiceSeconds?: number;
    version?: string;
  };
  returnRoute: {
    id: string;
    name: string;
    direction?: RouteDirection;
    currentStudents?: number;
    currentStudentsCount: number;
    seatCount?: number;
    vehicleCapacity: number;
    vehiclePlate: string;
    availableSeats?: number;
    maxRouteDurationMinutes?: number;
    defaultStopServiceSeconds?: number;
    version?: string;
  };
  defaultMaxRouteDurationMinutes?: number;
  defaultStopServiceSeconds?: number;
}

export interface StudentInsertionOptionsResponse {
  student: {
    id: string;
    fullName: string;
    code?: string;
    addressText: string;
    latitude: number;
    longitude: number;
  };
  studentId?: string;
  studentName?: string;
  hasActiveMembership: boolean;
  candidatePairs: RouteInsertionOptionPair[];
  pairs?: RouteInsertionOptionPair[];
}

export interface RouteInsertionResultItem {
  routeId: string;
  routeName: string;
  direction?: RouteDirection;
  status?: 'FEASIBLE' | 'INFEASIBLE' | 'UNAVAILABLE';
  feasibility: 'FEASIBLE' | 'INFEASIBLE' | 'UNAVAILABLE';
  reason?: string;
  infeasibilityReason?: string;
  currentStudentsCount: number;
  newStudentsCount: number;
  oldDurationSeconds: number;
  newDurationSeconds: number;
  oldDistanceMeters?: number;
  newDistanceMeters: number;
  newPolylineGeometry?: string;
  stopOrder?: number;
  plannedArrivalTime?: string;
  departureTime?: string;
  arrivalTime?: string;
  stops?: Array<{
    id?: string;
    stopOrder: number;
    stopType: string;
    studentId: string | null;
    addressText: string;
    latitude: number;
    longitude: number;
    plannedArrivalTime: string;
  }>;
  version?: string;
}

export interface StudentInsertionPreviewResponse {
  previewToken?: string | null;
  feasible?: boolean;
  isFeasible: boolean;
  unavailabilityReason?: string;
  reason?: string;
  outbound: RouteInsertionResultItem;
  return?: RouteInsertionResultItem;
  returnRoute: RouteInsertionResultItem;
  expectedFingerprint?: string;
}

export interface ConfirmStudentInsertionRequest {
  previewToken: string;
  expectedFingerprint?: string;
}

export interface SystemRequestRoutingPreviewResponse {
  requestId?: string;
  studentId?: string;
  previewToken?: string | null;
  allFeasible?: boolean;
  overallFeasibility: 'FEASIBLE' | 'INFEASIBLE' | 'UNAVAILABLE';
  hasInfeasible?: boolean;
  hasUnavailable?: boolean;
  routes: Array<{
    routeId: string;
    routeName: string;
    direction: RouteDirection;
    planId?: string;
    planStatus?: RoutePlanStatus;
    status?: 'FEASIBLE' | 'INFEASIBLE' | 'UNAVAILABLE';
    feasibility: 'FEASIBLE' | 'INFEASIBLE' | 'UNAVAILABLE';
    reason?: string;
    infeasibilityReason?: string;
    totalStudents?: number;
    oldDurationSeconds?: number;
    newDurationSeconds?: number;
    oldDistanceMeters?: number;
    newDistanceMeters?: number;
    newPolylineGeometry?: string;
    newPlannedArrivalTime?: string;
  }>;
  scheduledTripsToRefreshCount?: number;
  affectedScheduledTripsCount: number;
  frozenTripsCount?: number;
  preservedTripsCount: number;
  expectedFingerprint?: string;
}

export interface StudentUpdateRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  parentId: string;
  parentName: string;
  schoolId: string;
  schoolName: string;
  type: RequestType;
  status: RequestStatus;
  beforeData: Record<string, any>;
  proposedData: Record<string, any>;
  rejectionReason: string | null;
  resolution?: {
    outcome: 'DIRECT_UPDATE' | 'REOPTIMIZED' | 'REMOVED_FROM_ROUTES' | string;
    details?: any;
    [key: string]: any;
  } | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentUpdateRequestDetail extends StudentUpdateRequest {
  currentStudentData?: Record<string, any>;
  isStale?: boolean;
}

export interface StudentUpdateRequestListResponse {
  items: StudentUpdateRequest[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ReviewRequestDto {
  rejectionReason?: string;
}

export interface UpdateStudentAddressDto {
  addressText: string;
  latitude: number;
  longitude: number;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface AvatarResponse {
  avatarUrl: string;
  message: string;
}

// ==========================================
// Route Management & VRP Optimization Types
// ==========================================

export type RoutePlanStatus = 'DRAFT' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
export type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type RouteDirection = 'TO_SCHOOL' | 'TO_PARKING';
export type RouteStopType =
  | 'PARKING_START'
  | 'PICKUP'
  | 'SCHOOL_ARRIVAL'
  | 'SCHOOL_DEPARTURE'
  | 'DROPOFF'
  | 'PARKING_END';

export interface EligibleStudentItem {
  id: string;
  code: string;
  fullName: string;
  guardianPhone: string | null;
  avatarUrl: string | null;
  addressText: string;
  latitude: number;
  longitude: number;
}

export interface IneligibleStudentItem {
  id: string;
  code: string;
  fullName: string;
  guardianPhone?: string | null;
  addressText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  reasonCode: string;
  reasonMessage: string;
}

export interface AvailableVehicleItem {
  id: string;
  brand: string;
  seatCount: number;
  licensePlate: string;
  color: string;
}

export interface UnavailableVehicleItem {
  id: string;
  brand: string;
  seatCount: number;
  licensePlate: string;
  color: string;
  reasonCode: string;
  reasonMessage: string;
}

export interface RoutePreparationData {
  school: {
    id: string;
    name: string;
    addressText: string;
    latitude: number;
    longitude: number;
    weeklySchedule: any;
    contractStartDate: string;
    contractEndDate: string;
  };
  parkingLot: {
    addressText: string;
    latitude: number;
    longitude: number;
  };
  eligibleStudents: EligibleStudentItem[];
  ineligibleStudents?: IneligibleStudentItem[];
  availableVehicles: AvailableVehicleItem[];
  unavailableVehicles?: UnavailableVehicleItem[];
}

export interface StopServiceOverride {
  studentId: string;
  direction?: RouteDirection;
  serviceSeconds: number;
}

export interface RouteConstraints {
  maxRouteDurationMinutes?: number;
  defaultStopServiceSeconds?: number;
  stopServiceOverrides?: StopServiceOverride[];
  latestSchoolArrival?: string;
  returnDepartureTime?: string;
}

export interface OptimizeRouteDto {
  schoolId: string;
  studentIds: string[];
  vehicleIds: string[];
  constraints: RouteConstraints;
}

export interface PreviewStudent {
  id: string;
  code: string;
  fullName: string;
  addressText: string;
  latitude: number;
  longitude: number;
  pickupTime?: string;
  dropoffTime?: string;
}

export interface PreviewStop {
  stopOrder: number;
  type?: RouteStopType;
  stopType?: RouteStopType;
  studentId?: string | null;
  studentName?: string | null;
  addressText: string;
  latitude: number;
  longitude: number;
  plannedArrivalTime: string;
  plannedArrivalSeconds?: number;
  elapsedArrivalSeconds?: number;
  serviceDurationSeconds?: number;
  distanceFromPreviousMeters?: number;
  durationFromPreviousSeconds?: number;
}

export interface PreviewRoute {
  name: string;
  direction: RouteDirection;
  vehicleId?: string;
  proposedVehicleId?: string;
  proposedVehiclePlate: string;
  proposedVehicleBrand: string;
  proposedVehicleSeatCount?: number;
  seatCount?: number;
  totalDistanceMeters: number;
  estimatedDurationSeconds: number;
  departureTime: string;
  arrivalTime: string;
  polylineGeometry: string;
  studentCount: number;
  students: PreviewStudent[];
  stops: PreviewStop[];
  derivedWeeklySchedule?: Record<string, { departureTime: string; arrivalTime: string }>;
}

export interface RoutePreviewSummary {
  totalSelectedStudents: number;
  assignedBothWaysCount: number;
  unassignedCount: number;
  coverageRate?: number;
  unassignedStudents: {
    id: string;
    fullName: string;
    reason?: string;
    missingDirection?: 'RETURN' | 'OUTBOUND' | 'BOTH';
    addressText?: string;
  }[];
  excludedByAdminCount: number;
  outboundVehiclesUsed: number;
  returnVehiclesUsed: number;
}

export interface RoutePreviewResponse {
  previewToken: string;
  schoolId: string;
  schoolName: string;
  outboundRoutes: PreviewRoute[];
  returnRoutes: PreviewRoute[];
  summary: RoutePreviewSummary;
}

export interface RouteStopDetail {
  id: string;
  stopOrder: number;
  stopType: RouteStopType;
  studentId: string | null;
  studentName?: string | null;
  studentCode?: string | null;
  addressText: string;
  latitude: number;
  longitude: number;
  plannedArrivalTime: string;
  plannedArrivalSeconds?: number;
  elapsedArrivalSeconds?: number;
  serviceDurationSeconds?: number;
  distanceFromPreviousMeters?: number;
  durationFromPreviousSeconds?: number;
}

export interface RouteItem {
  id: string;
  routePlanId: string;
  routePlanName?: string;
  schoolId: string;
  schoolName?: string;
  name: string;
  direction: RouteDirection;
  status: RoutePlanStatus;
  planStatus?: RoutePlanStatus;
  proposedVehicleId: string | null;
  proposedVehiclePlate?: string | null;
  proposedVehicleBrand?: string | null;
  proposedVehicleSeats?: number | null;
  defaultDriverId?: string | null;
  defaultDriverName?: string | null;
  defaultDriverPhone?: string | null;
  defaultBusAttendantId?: string | null;
  defaultBusAttendantName?: string | null;
  defaultBusAttendantPhone?: string | null;
  totalDistanceMeters: number;
  estimatedDurationSeconds: number;
  departureTime?: string;
  arrivalTime?: string;
  polylineGeometry: string;
  studentCount: number;
  derivedWeeklySchedule?: Record<string, { departureTime: string; arrivalTime: string }>;
  parkingLocation?: { latitude: number; longitude: number; addressText: string };
  schoolLocation?: { latitude: number; longitude: number; name: string };
  stops?: RouteStopDetail[];
  createdAt?: string;
}

export interface RouteListResponse {
  items: RouteItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CandidateVehicleItem {
  id: string;
  licensePlate: string;
  brand: string;
  seatCount: number;
  color: string;
  isEligible: boolean;
  reason?: string;
}

export interface CandidateVehiclesResponse {
  currentVehicleId?: string;
  requiredCapacity: number;
  candidates: CandidateVehicleItem[];
}

export interface CandidateDriverItem {
  id: string;
  fullName: string;
  phone?: string | null;
  isEligible: boolean;
  reason?: string;
}

export interface CandidateDriversResponse {
  candidates: CandidateDriverItem[];
}

export interface CandidateBusAttendantItem {
  id: string;
  fullName: string;
  phone?: string | null;
  isEligible: boolean;
  reason?: string;
}

export interface CandidateBusAttendantsResponse {
  candidates: CandidateBusAttendantItem[];
}

export interface RoutePlanItem {
  id: string;
  schoolId: string;
  schoolName?: string;
  name: string;
  status: RoutePlanStatus;
  totalStudents: number;
  totalOutboundRoutes: number;
  totalReturnRoutes: number;
  createdAt: string;
  activatedAt?: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  createdByName?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  routes?: RouteItem[];
  coverage?: {
    totalSelected: number;
    assignedCount: number;
    unassignedCount: number;
    coverageRate: number;
  };
  unassignedStudents?: {
    id: string;
    fullName: string;
    reason?: string;
    missingDirection?: string;
    addressText?: string;
  }[];
}

export type RoutePlanDetail = RoutePlanItem;

export interface RoutePlanListResponse {
  items: RoutePlanItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface StudentRoutingDetail {
  studentId: string;
  studentName: string;
  routingStatus:
    | 'NO_ROUTE_PLAN'
    | 'MISSING_ADDRESS'
    | 'NOT_ASSIGNED'
    | 'ASSIGNED_DRAFT'
    | 'ASSIGNED_ACTIVE'
    | 'NEEDS_REVIEW';
  routePlanId?: string;
  routePlanName?: string;
  routePlanStatus?: RoutePlanStatus;
  outboundRoute?: {
    id: string;
    name: string;
    proposedVehiclePlate: string | null;
    plannedArrivalTime: string;
    pickupAddressText: string;
    pickupLatitude: number;
    pickupLongitude: number;
    polylineGeometry: string;
    schoolLocation: { latitude: number; longitude: number; name: string };
    parkingLocation: { latitude: number; longitude: number; addressText: string };
  } | null;
  returnRoute?: {
    id: string;
    name: string;
    proposedVehiclePlate: string | null;
    plannedArrivalTime: string;
    dropoffAddressText: string;
    dropoffLatitude: number;
    dropoffLongitude: number;
    polylineGeometry: string;
    schoolLocation: { latitude: number; longitude: number; name: string };
    parkingLocation: { latitude: number; longitude: number; addressText: string };
  } | null;
}

// ==========================================
// Approval & Assignment Group Types
// ==========================================

export interface ApprovalBlocker {
  code: string;
  message: string;
  routeId?: string;
  vehicleId?: string;
}

export interface ApprovalSummary {
  fullyAssignedRoutes: number;
  missingVehicleRoutes: number;
  missingDriverRoutes: number;
  missingBusAttendantRoutes: number;
}

export interface ApprovalReadinessResponse {
  isReadyForApproval: boolean;
  routePlanId: string;
  schoolId: string;
  schoolName: string;
  totalRoutes: number;
  totalVehicles: number;
  summary: ApprovalSummary;
  blockers: ApprovalBlocker[];
}

export interface AssignVehicleGroupRequest {
  currentVehicleId: string;
  newVehicleId: string;
}

export interface AssignDriverGroupRequest {
  vehicleId: string;
  driverId: string;
}

export interface AssignBusAttendantGroupRequest {
  vehicleId: string;
  busAttendantId: string;
}

// ==========================================
// Trip Management Types
// ==========================================

export interface TripItem {
  id: string;
  isVirtual?: boolean;
  serviceDate: string;
  routeId: string;
  routeName: string;
  direction: RouteDirection;
  status: TripStatus;
  schoolId: string;
  schoolName: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  vehiclePlate?: string | null;
  vehicleBrand?: string | null;
  driverName?: string | null;
  busAttendantName?: string | null;
  studentCount?: number;
  assignmentStatus?: 'ASSIGNED' | 'WAITING_ASSIGNMENT';
  canReportLeave?: boolean;
}

export interface TripListResponse {
  items: TripItem[];
  total: number;
  page: number;
  totalPages: number;
}

export type LeaveNoticeKind = 'STUDENT' | 'DRIVER' | 'BUS_ATTENDANT';
export type LeaveNoticeStatus =
  | 'RECORDED'
  | 'PENDING_REPLACEMENT'
  | 'REPLACED'
  | 'WITHDRAWN'
  | 'TRIP_CANCELLED';

export interface LeaveNoticeTripInfo {
  id: string;
  routeName: string;
  serviceDate: string;
  direction: RouteDirection;
  scheduledTime: string;
  vehiclePlate: string;
  schoolName: string;
}

export interface LeaveNoticeItem {
  id: string;
  tripId: string;
  kind: LeaveNoticeKind;
  status: LeaveNoticeStatus;
  reportedById: string;
  reportedByName: string;
  studentId?: string | null;
  studentName?: string | null;
  serviceDate: string;
  direction: RouteDirection;
  routeId: string;
  routeName: string;
  schoolId: string;
  schoolName: string;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  replacementUserId?: string | null;
  replacementUserName?: string | null;
  processedById?: string | null;
  processedByName?: string | null;
  processedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  canCancelLeave?: boolean;
  canAssignReplacement?: boolean;
  canCancelTrip?: boolean;
  disabledReason?: string | null;
}

export interface LeaveNoticeListResponse {
  items: LeaveNoticeItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReplacementCandidateItem {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  isAvailable: boolean;
  unavailableReason?: string | null;
}

export interface ReplacementCandidatesResponse {
  candidates: ReplacementCandidateItem[];
}

export interface AssignReplacementDto {
  replacementUserId: string;
  expectedStatus?: LeaveNoticeStatus;
}

export interface CancelTripFromNoticeDto {
  cancellationReason: string;
  expectedStatus?: LeaveNoticeStatus;
}

export interface TripDetail {
  id: string;
  routeId: string;
  routeName: string;
  routePlanId: string;
  routePlanName: string;
  schoolId: string;
  schoolName: string;
  serviceDate: string;
  direction: RouteDirection;
  status: TripStatus;
  scheduledStartTime: string;
  scheduledEndTime: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleSeats: number;
  driverId: string;
  driverName: string;
  driverPhone: string;
  busAttendantId: string;
  busAttendantName: string;
  busAttendantPhone: string;
  polylineGeometry: string;
  stops: RouteStopDetail[];
  cancellationReason?: string | null;
}

export interface GenerateTripsRequest {
  schoolId?: string;
  fromDate: string;
  toDate: string;
}

export interface TripGenerationFailure {
  routeId: string;
  routeName: string;
  serviceDate: string;
  reason: string;
}

export interface GenerateTripsResponse {
  totalEligible: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  failures: TripGenerationFailure[];
}

export interface UpdateTripAssignmentRequest {
  expectedVehicleId?: string;
  expectedDriverId?: string;
  expectedBusAttendantId?: string;
  vehicleId?: string;
  driverId?: string;
  busAttendantId?: string;
}

export type TripIncidentType =
  | 'ATTENDANT_MISSING'
  | 'DRIVER_MISSING'
  | 'OFF_ROUTE'
  | 'LATE_STOP';

export type TripIncidentStatus =
  | 'WAITING_ASSIGNMENT'
  | 'WAITING_CONFIRMATION'
  | 'RESOLVED'
  | 'CONFIRMED'
  | 'CLOSED';

export interface TripIncident {
  id: string;
  tripId: string;
  type: TripIncidentType;
  status: TripIncidentStatus;
  reportedById?: string | null;
  reportedByName?: string | null;
  reportedByRole?: string | null;
  description?: string | null;
  context?: any;
  processedById?: string | null;
  processedByName?: string | null;
  processedAt?: string | null;
  resolution?: any;
  createdAt: string;
  updatedAt: string;
  routeId?: string;
  routeName?: string;
  direction?: 'TO_SCHOOL' | 'TO_PARKING';
  serviceDate?: string;
  schoolId?: string;
  schoolName?: string;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
}

export interface TripIncidentListResponse {
  items: TripIncident[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IncidentCandidate {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  role: string;
}

export interface IncidentCandidatesResponse {
  candidates: IncidentCandidate[];
  total: number;
}

