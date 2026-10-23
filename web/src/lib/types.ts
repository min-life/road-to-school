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

export interface UpdateParkingLotDto {
  addressText: string;
  latitude: number;
  longitude: number;
}

export type RequestType = 'INFORMATION_UPDATE' | 'ADDRESS_UPDATE';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type UserRole = Role;

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



