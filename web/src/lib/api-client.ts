import { authStorage } from './auth-storage';
import {
  ApiErrorResponse,
  LoginResponse,
  RefreshResponse,
  User,
  SchoolListResponse,
  SchoolDetail,
  UpdateSchoolStatusResponse,
  SchoolEmployeeListResponse,
  CreateSchoolAdminResponse,
  SchoolEmployeeDetail,
  StudentListResponse,
  StudentDetail,
  StudentListItem,
  DriverListResponse,
  DriverItem,
  CreateDriverResponse,
  Vehicle,
  VehicleListResponse,
  CreateVehicleDto,
  ParkingLot,
  UpdateParkingLotDto,
  StudentUpdateRequest,
  StudentUpdateRequestDetail,
  StudentUpdateRequestListResponse,
  ReviewRequestDto,
  UpdateStudentAddressDto,
  ChangePasswordDto,
  AvatarResponse,
  RoutePreparationData,
  OptimizeRouteDto,
  RoutePreviewResponse,
  RouteItem,
  RouteListResponse,
  RoutePlanItem,
  RoutePlanListResponse,
  StudentRoutingDetail,
  ApprovalReadinessResponse,
  AssignVehicleGroupRequest,
  AssignDriverGroupRequest,
  AssignBusAttendantGroupRequest,
  CandidateVehiclesResponse,
  CandidateDriversResponse,
  CandidateBusAttendantsResponse,
  TripItem,
  TripDetail,
  TripListResponse,
  GenerateTripsRequest,
  GenerateTripsResponse,
  UpdateTripAssignmentRequest,
  LeaveNoticeItem,
  LeaveNoticeListResponse,
  ReplacementCandidatesResponse,
  AssignReplacementDto,
  CancelTripFromNoticeDto,
  ParkingLotImpactResponse,
  SchoolLocationImpactResponse,
  RoutePlanCancellationImpactResponse,
  StudentDisableImpactResponse,
  UpdateStudentStatusResponse,
  StudentInsertionOptionsResponse,
  StudentInsertionPreviewResponse,
  SystemRequestRoutingPreviewResponse,
  WeeklySchedule,
} from './types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  statusCode: number;
  code: string;
  errors?: string[];

  constructor(res: ApiErrorResponse) {
    super(res.message);
    this.name = 'ApiError';
    this.statusCode = res.statusCode;
    this.code = res.code;
    this.errors = res.errors;
  }
}

type UnauthorizedCallback = () => void;

class ApiClient {
  private refreshPromise: Promise<string | null> | null = null;
  private unauthorizedListeners: Set<UnauthorizedCallback> = new Set();

  onUnauthorized(callback: UnauthorizedCallback): () => void {
    this.unauthorizedListeners.add(callback);
    return () => this.unauthorizedListeners.delete(callback);
  }

  private notifyUnauthorized(): void {
    this.unauthorizedListeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Bỏ qua lỗi listener
      }
    });
  }

  private async executeRefresh(): Promise<string | null> {
    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) {
      authStorage.clear();
      this.notifyUnauthorized();
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        authStorage.clear();
        this.notifyUnauthorized();
        return null;
      }

      const data: RefreshResponse = await response.json();
      authStorage.setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      authStorage.clear();
      this.notifyUnauthorized();
      return null;
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0,
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const token = authStorage.getAccessToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch {
      throw new ApiError({
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền và thử lại.',
      });
    }

    // Xử lý khi nhận 401 Unauthorized trên các API có xác thực
    if (
      response.status === 401 &&
      !endpoint.includes('/auth/web/login') &&
      !endpoint.includes('/auth/refresh') &&
      retryCount === 0
    ) {
      // Single-flight refresh token queue
      if (!this.refreshPromise) {
        this.refreshPromise = this.executeRefresh().finally(() => {
          this.refreshPromise = null;
        });
      }

      const newAccessToken = await this.refreshPromise;
      if (newAccessToken) {
        return this.request<T>(
          endpoint,
          {
            ...options,
            headers: {
              ...headers,
              Authorization: `Bearer ${newAccessToken}`,
            },
          },
          retryCount + 1,
        );
      } else {
        throw new ApiError({
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        });
      }
    }

    if (!response.ok) {
      let errorData: ApiErrorResponse;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          statusCode: response.status,
          code: 'HTTP_ERROR',
          message: `Lỗi kết nối máy chủ (Mã trạng thái: ${response.status})`,
        };
      }
      throw new ApiError({
        statusCode: errorData.statusCode || response.status,
        code: errorData.code || 'UNKNOWN_ERROR',
        message: errorData.message || 'Thao tác không thành công',
        errors: errorData.errors,
      });
    }

    // Xử lý status 204 hoặc rỗng
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // --- 6 Web Authentication APIs ---

  async loginWeb(body: {
    identifier: string;
    password: string;
  }): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/web/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async forgotPasswordRequestOtp(body: {
    identifier: string;
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      '/auth/forgot-password/request-otp',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  }

  async resetPassword(body: {
    identifier: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me', {
      method: 'GET',
    });
  }

  async logout(): Promise<{ message: string }> {
    try {
      const res = await this.request<{ message: string }>('/auth/logout', {
        method: 'POST',
      });
      return res;
    } finally {
      authStorage.clear();
      this.notifyUnauthorized();
    }
  }

  // --- 6 School Management APIs (Tasks 2, 4, 5) ---

  async getSchools(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<SchoolListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search && params.search.trim()) {
      searchParams.set('search', params.search.trim());
    }
    if (params?.status) {
      const normalizedStatus =
        params.status === 'true'
          ? 'ACTIVE'
          : params.status === 'false'
            ? 'INACTIVE'
            : params.status;
      searchParams.set('status', normalizedStatus);
    }

    const query = searchParams.toString();
    const endpoint = query ? `/schools?${query}` : '/schools';
    return this.request<SchoolListResponse>(endpoint, { method: 'GET' });
  }

  async getSchool(id: string): Promise<SchoolDetail> {
    return this.request<SchoolDetail>(`/schools/${id}`, { method: 'GET' });
  }

  async getSchoolDetail(id: string): Promise<SchoolDetail> {
    return this.getSchool(id);
  }

  async createSchool(formData: FormData): Promise<SchoolDetail> {
    return this.request<SchoolDetail>('/schools', {
      method: 'POST',
      body: formData,
    });
  }

  async updateSchool(id: string, formData: FormData): Promise<SchoolDetail> {
    return this.request<SchoolDetail>(`/schools/${id}`, {
      method: 'PUT',
      body: formData,
    });
  }

  async getSchoolLocationImpact(
    schoolId: string,
    latitude: number,
    longitude: number,
  ): Promise<SchoolLocationImpactResponse> {
    return this.request<SchoolLocationImpactResponse>(
      `/schools/${schoolId}/location-impact?latitude=${latitude}&longitude=${longitude}`,
      { method: 'GET' },
    );
  }

  async updateSchoolLocation(
    schoolId: string,
    dto: {
      addressText: string;
      latitude: number;
      longitude: number;
      reason?: string;
      expectedFingerprint?: string;
    },
  ): Promise<{
    success: boolean;
    message: string;
    school: SchoolDetail;
    cancelledPlansCount: number;
    cancelledTripsCount: number;
  }> {
    return this.request(`/schools/${schoolId}/location`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async updateSchoolContract(
    schoolId: string,
    dto: {
      contractStartDate: string;
      contractEndDate: string;
      reason?: string;
      expectedUpdatedAt?: string;
    },
  ): Promise<any> {
    return this.request(`/schools/${schoolId}/contract`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async updateSchoolSchedule(
    schoolId: string,
    weeklySchedule: WeeklySchedule,
  ): Promise<{
    success: boolean;
    message: string;
    school: {
      id: string;
      name: string;
      weeklySchedule: Record<string, any>;
    };
    cancelledTripsCount: number;
    updatedTripsCount: number;
  }> {
    return this.request(`/schools/${schoolId}/schedule`, {
      method: 'PATCH',
      body: JSON.stringify({ weeklySchedule }),
    });
  }

  async updateSchoolStatus(
    id: string,
    isActive: boolean,
  ): Promise<UpdateSchoolStatusResponse> {
    return this.request<UpdateSchoolStatusResponse>(`/schools/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async getSchoolEmployees(
    schoolId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
      status?: string;
    },
  ): Promise<SchoolEmployeeListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search && params.search.trim()) {
      searchParams.set('search', params.search.trim());
    }
    if (params?.role) searchParams.set('role', params.role);
    if (params?.status) {
      const normalizedStatus =
        params.status === 'true'
          ? 'ACTIVE'
          : params.status === 'false'
            ? 'INACTIVE'
            : params.status;
      searchParams.set('status', normalizedStatus);
    }

    const query = searchParams.toString();
    const endpoint = query
      ? `/schools/${schoolId}/employees?${query}`
      : `/schools/${schoolId}/employees`;
    return this.request<SchoolEmployeeListResponse>(endpoint, { method: 'GET' });
  }

  async createSchoolAdmin(
    schoolId: string,
    body: { fullName: string; email?: string; phone?: string },
  ): Promise<CreateSchoolAdminResponse> {
    return this.request<CreateSchoolAdminResponse>(
      `/schools/${schoolId}/employees`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  }

  async getSchoolEmployeeDetail(
    schoolId: string,
    employeeId: string,
  ): Promise<SchoolEmployeeDetail> {
    return this.request<SchoolEmployeeDetail>(
      `/schools/${schoolId}/employees/${employeeId}`,
      { method: 'GET' },
    );
  }

  async createTeacher(
    schoolId: string,
    body: { fullName: string; email?: string; phone?: string },
  ): Promise<CreateSchoolAdminResponse> {
    return this.request<CreateSchoolAdminResponse>(
      `/schools/${schoolId}/employees`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  }

  async getStudents(
    schoolId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      hasAddress?: boolean;
    },
  ): Promise<StudentListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search && params.search.trim()) {
      searchParams.set('search', params.search.trim());
    }
    if (params?.status) searchParams.set('status', params.status);
    if (params?.hasAddress !== undefined) {
      searchParams.set('hasAddress', String(params.hasAddress));
    }

    const query = searchParams.toString();
    const endpoint = query
      ? `/schools/${schoolId}/students?${query}`
      : `/schools/${schoolId}/students`;
    return this.request<StudentListResponse>(endpoint, { method: 'GET' });
  }

  async getStudent(schoolId: string, studentId: string): Promise<StudentDetail> {
    return this.request<StudentDetail>(
      `/schools/${schoolId}/students/${studentId}`,
      { method: 'GET' },
    );
  }

  async createStudent(
    schoolId: string,
    formData: FormData,
  ): Promise<StudentListItem> {
    return this.request<StudentListItem>(`/schools/${schoolId}/students`, {
      method: 'POST',
      body: formData,
    });
  }

  async updateStudentStatus(
    schoolId: string,
    studentId: string,
    status: 'AVAILABLE' | 'DISABLED',
  ): Promise<UpdateStudentStatusResponse> {
    return this.request<UpdateStudentStatusResponse>(
      `/schools/${schoolId}/students/${studentId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
    );
  }

  async getStudentDisableImpact(
    schoolId: string,
    studentId: string,
  ): Promise<StudentDisableImpactResponse> {
    return this.request<StudentDisableImpactResponse>(
      `/schools/${schoolId}/students/${studentId}/disable-impact`,
      { method: 'GET' },
    );
  }

  async getStudentInsertionOptions(
    studentId: string,
  ): Promise<StudentInsertionOptionsResponse> {
    return this.request<StudentInsertionOptionsResponse>(
      `/routes/students/${studentId}/insertion-options`,
      { method: 'GET' },
    );
  }

  async previewStudentInsertion(dto: {
    studentId: string;
    outboundRouteId: string;
    returnRouteId: string;
    routingConstraints?: {
      maxRouteDurationMinutes?: number;
      defaultStopServiceSeconds?: number;
      stopServiceOverrides?: Array<{ studentId: string; serviceSeconds: number; direction?: string }>;
    };
  }): Promise<StudentInsertionPreviewResponse> {
    return this.request<StudentInsertionPreviewResponse>(
      '/routes/student-insertions/preview',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
    );
  }

  async confirmStudentInsertion(dto: {
    previewToken: string;
    expectedFingerprint?: string;
  }): Promise<{ success: boolean; message: string; outboundRouteId?: string; returnRouteId?: string }> {
    return this.request<{ success: boolean; message: string; outboundRouteId?: string; returnRouteId?: string }>(
      '/routes/student-insertions/confirm',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
    );
  }

  async getDrivers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<DriverListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search && params.search.trim()) {
      searchParams.set('search', params.search.trim());
    }
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    const endpoint = query ? `/drivers?${query}` : '/drivers';
    return this.request<DriverListResponse>(endpoint, { method: 'GET' });
  }

  async getDriver(id: string): Promise<DriverItem> {
    return this.request<DriverItem>(`/drivers/${id}`, { method: 'GET' });
  }

  async createDriver(body: {
    fullName: string;
    email?: string;
    phone?: string;
  }): Promise<CreateDriverResponse> {
    return this.request<CreateDriverResponse>('/drivers', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ==========================================
  // Round 3 APIs: Account Settings
  // ==========================================

  async changePassword(dto: ChangePasswordDto): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/me/change-password', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateAvatar(file: File): Promise<AvatarResponse> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.request<AvatarResponse>('/auth/me/avatar', {
      method: 'POST',
      body: formData,
    });
  }

  // ==========================================
  // Round 3 APIs: Parking Lot Settings
  // ==========================================

  async getParkingLot(): Promise<ParkingLot> {
    return this.request<ParkingLot>('/system-settings/parking-lot', {
      method: 'GET',
    });
  }

  async getParkingLotImpact(
    latitude: number,
    longitude: number,
  ): Promise<ParkingLotImpactResponse> {
    return this.request<ParkingLotImpactResponse>(
      `/system-settings/parking-lot/impact?latitude=${latitude}&longitude=${longitude}`,
      { method: 'GET' },
    );
  }

  async updateParkingLot(dto: UpdateParkingLotDto): Promise<ParkingLot> {
    return this.request<ParkingLot>('/system-settings/parking-lot', {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  // ==========================================
  // Round 3 APIs: Vehicles Management
  // ==========================================

  async listVehicles(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<VehicleListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search && params.search.trim()) {
      searchParams.set('search', params.search.trim());
    }
    const query = searchParams.toString();
    const endpoint = query ? `/vehicles?${query}` : '/vehicles';
    return this.request<VehicleListResponse>(endpoint, { method: 'GET' });
  }

  async createVehicle(dto: CreateVehicleDto): Promise<Vehicle> {
    return this.request<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  // ==========================================
  // Round 3 APIs: School Admin Requests
  // ==========================================

  async listSchoolRequests(
    schoolId: string,
    params?: {
      page?: number;
      limit?: number;
      type?: string;
      status?: string;
      search?: string;
    },
  ): Promise<StudentUpdateRequestListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.type) searchParams.set('type', params.type);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search && params.search.trim()) {
      searchParams.set('search', params.search.trim());
    }
    const query = searchParams.toString();
    const endpoint = query
      ? `/schools/${schoolId}/update-requests?${query}`
      : `/schools/${schoolId}/update-requests`;
    return this.request<StudentUpdateRequestListResponse>(endpoint, {
      method: 'GET',
    });
  }

  async listStudentRequestHistory(
    schoolId: string,
    studentId: string,
    params?: {
      page?: number;
      limit?: number;
      type?: string;
      status?: string;
    },
  ): Promise<StudentUpdateRequestListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.type) searchParams.set('type', params.type);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    const endpoint = query
      ? `/schools/${schoolId}/students/${studentId}/update-requests?${query}`
      : `/schools/${schoolId}/students/${studentId}/update-requests`;
    return this.request<StudentUpdateRequestListResponse>(endpoint, {
      method: 'GET',
    });
  }

  async getSchoolRequestDetail(
    schoolId: string,
    requestId: string,
  ): Promise<StudentUpdateRequestDetail> {
    return this.request<StudentUpdateRequestDetail>(
      `/schools/${schoolId}/update-requests/${requestId}`,
      { method: 'GET' },
    );
  }

  async approveSchoolRequest(
    schoolId: string,
    requestId: string,
  ): Promise<StudentUpdateRequest> {
    return this.request<StudentUpdateRequest>(
      `/schools/${schoolId}/update-requests/${requestId}/approve`,
      { method: 'POST' },
    );
  }

  async rejectSchoolRequest(
    schoolId: string,
    requestId: string,
    dto?: ReviewRequestDto,
  ): Promise<StudentUpdateRequest> {
    return this.request<StudentUpdateRequest>(
      `/schools/${schoolId}/update-requests/${requestId}/reject`,
      {
        method: 'POST',
        body: JSON.stringify(dto || {}),
      },
    );
  }

  async directUpdateStudentAddress(
    schoolId: string,
    studentId: string,
    dto: UpdateStudentAddressDto,
  ): Promise<any> {
    return this.request<any>(
      `/schools/${schoolId}/students/${studentId}/address`,
      {
        method: 'PATCH',
        body: JSON.stringify(dto),
      },
    );
  }

  // ==========================================
  // Round 3 APIs: System Admin Requests
  // ==========================================

  async listSystemAdminRequests(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<StudentUpdateRequestListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search && params.search.trim()) {
      searchParams.set('search', params.search.trim());
    }
    const query = searchParams.toString();
    const endpoint = query
      ? `/system-admin/update-requests?${query}`
      : `/system-admin/update-requests`;
    return this.request<StudentUpdateRequestListResponse>(endpoint, {
      method: 'GET',
    });
  }

  async getSystemAdminRequestDetail(
    requestId: string,
  ): Promise<StudentUpdateRequestDetail> {
    return this.request<StudentUpdateRequestDetail>(
      `/system-admin/update-requests/${requestId}`,
      { method: 'GET' },
    );
  }

  async approveSystemAdminRequest(
    requestId: string,
    body?: {
      decision?: 'DIRECT_UPDATE' | 'REOPTIMIZED' | 'REMOVED_FROM_ROUTES';
      resolutionOutcome?: 'DIRECT_UPDATE' | 'REOPTIMIZED' | 'REMOVED_FROM_ROUTES';
      previewToken?: string;
      expectedFingerprint?: string;
      note?: string;
    },
  ): Promise<StudentUpdateRequest> {
    return this.request<StudentUpdateRequest>(
      `/system-admin/update-requests/${requestId}/approve`,
      {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      },
    );
  }

  async getSystemRequestRoutingPreview(
    requestId: string,
    constraints?: {
      maxRouteDurationMinutes?: number;
      defaultStopServiceSeconds?: number;
    },
  ): Promise<SystemRequestRoutingPreviewResponse> {
    return this.request<SystemRequestRoutingPreviewResponse>(
      `/system-admin/update-requests/${requestId}/routing-preview`,
      {
        method: 'POST',
        body: JSON.stringify({ routingConstraints: constraints }),
      },
    );
  }

  async cancelParentUpdateRequest(
    requestId: string,
  ): Promise<{ message: string; id: string; status: string }> {
    return this.request<{ message: string; id: string; status: string }>(
      `/parents/update-requests/${requestId}/cancel`,
      { method: 'POST' },
    );
  }

  async rejectSystemAdminRequest(
    requestId: string,
    dto?: ReviewRequestDto,
  ): Promise<StudentUpdateRequest> {
    return this.request<StudentUpdateRequest>(
      `/system-admin/update-requests/${requestId}/reject`,
      {
        method: 'POST',
        body: JSON.stringify(dto || {}),
      },
    );
  }

  // ==========================================
  // Route Management & VRP Optimization APIs
  // ==========================================

  async getRoutePreparationData(schoolId: string): Promise<RoutePreparationData> {
    return this.request<RoutePreparationData>(`/routes/preparation/${schoolId}`, {
      method: 'GET',
    });
  }

  async optimizeRoutePreview(dto: OptimizeRouteDto): Promise<RoutePreviewResponse> {
    return this.request<RoutePreviewResponse>('/routes/optimize-preview', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async cancelReturnRoute(
    previewToken: string,
    returnRouteIndex: number,
  ): Promise<RoutePreviewResponse> {
    return this.request<RoutePreviewResponse>('/routes/preview/cancel-return', {
      method: 'POST',
      body: JSON.stringify({ previewToken, returnRouteIndex }),
    });
  }

  async confirmRoutePlan(dto: {
    previewToken: string;
    planName?: string;
    name?: string;
  }): Promise<RoutePlanItem> {
    const payload = {
      previewToken: dto.previewToken,
      ...(dto.planName || dto.name ? { planName: dto.planName || dto.name } : {}),
    };
    return this.request<RoutePlanItem>('/routes/confirm-plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listRoutePlans(params?: {
    search?: string;
    schoolId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<RoutePlanListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search.trim());
    if (params?.schoolId) searchParams.set('schoolId', params.schoolId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    const endpoint = query ? `/routes/route-plans?${query}` : '/routes/route-plans';
    return this.request<RoutePlanListResponse>(endpoint, { method: 'GET' });
  }

  async getRoutePlanDetail(id: string): Promise<RoutePlanItem> {
    return this.request<RoutePlanItem>(`/routes/route-plans/${id}`, {
      method: 'GET',
    });
  }

  async getRoutePlanCancellationImpact(
    id: string,
  ): Promise<RoutePlanCancellationImpactResponse> {
    return this.request<RoutePlanCancellationImpactResponse>(
      `/routes/route-plans/${id}/cancellation-impact`,
      { method: 'GET' },
    );
  }

  async cancelRoutePlan(
    id: string,
    reason: string,
    expectedFingerprint?: string,
  ): Promise<{ message: string; cancelledTripsCount?: number }> {
    return this.request<{ message: string; cancelledTripsCount?: number }>(
      `/routes/route-plans/${id}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ reason, expectedFingerprint }),
      },
    );
  }

  async listRoutes(params?: {
    schoolId?: string;
    direction?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<RouteListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.schoolId) searchParams.set('schoolId', params.schoolId);
    if (params?.direction) searchParams.set('direction', params.direction);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search && params.search.trim()) searchParams.set('search', params.search.trim());
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    const endpoint = query ? `/routes?${query}` : '/routes';
    return this.request<RouteListResponse>(endpoint, { method: 'GET' });
  }

  async getRouteDetail(id: string): Promise<RouteItem> {
    return this.request<RouteItem>(`/routes/${id}`, { method: 'GET' });
  }

  async getStudentRoutingDetail(studentId: string): Promise<StudentRoutingDetail> {
    return this.request<StudentRoutingDetail>(`/routes/students/${studentId}/routing`, {
      method: 'GET',
    });
  }

  // ==========================================
  // RoutePlan Approval & Assignment Groups
  // ==========================================

  async getApprovalReadiness(planId: string): Promise<ApprovalReadinessResponse> {
    return this.request<ApprovalReadinessResponse>(
      `/routes/route-plans/${planId}/approval-readiness`,
      { method: 'GET' },
    );
  }

  async approveRoutePlan(
    planId: string,
  ): Promise<{ message: string; routePlan: RoutePlanItem }> {
    return this.request<{ message: string; routePlan: RoutePlanItem }>(
      `/routes/route-plans/${planId}/approve`,
      { method: 'POST' },
    );
  }

  async replaceVehicleGroup(
    planId: string,
    dto: AssignVehicleGroupRequest,
  ): Promise<{ message: string; updatedRoutesCount: number }> {
    return this.request<{ message: string; updatedRoutesCount: number }>(
      `/routes/route-plans/${planId}/assignments/vehicle`,
      { method: 'PATCH', body: JSON.stringify(dto) },
    );
  }

  async assignDriverGroup(
    planId: string,
    dto: AssignDriverGroupRequest,
  ): Promise<{ message: string; updatedRoutesCount: number }> {
    return this.request<{ message: string; updatedRoutesCount: number }>(
      `/routes/route-plans/${planId}/assignments/driver`,
      { method: 'PATCH', body: JSON.stringify(dto) },
    );
  }

  async assignBusAttendantGroup(
    planId: string,
    dto: AssignBusAttendantGroupRequest,
  ): Promise<{ message: string; updatedRoutesCount: number }> {
    return this.request<{ message: string; updatedRoutesCount: number }>(
      `/routes/route-plans/${planId}/assignments/bus-attendant`,
      { method: 'PATCH', body: JSON.stringify(dto) },
    );
  }

  async getCandidateVehicles(
    planId: string,
    currentVehicleId?: string,
  ): Promise<CandidateVehiclesResponse> {
    const query = currentVehicleId ? `?currentVehicleId=${currentVehicleId}` : '';
    return this.request<CandidateVehiclesResponse>(
      `/routes/route-plans/${planId}/candidate-vehicles${query}`,
      { method: 'GET' },
    );
  }

  async getCandidateDrivers(planId: string): Promise<CandidateDriversResponse> {
    return this.request<CandidateDriversResponse>(
      `/routes/route-plans/${planId}/candidate-drivers`,
      { method: 'GET' },
    );
  }

  async getCandidateBusAttendants(planId: string): Promise<CandidateBusAttendantsResponse> {
    return this.request<CandidateBusAttendantsResponse>(
      `/routes/route-plans/${planId}/candidate-bus-attendants`,
      { method: 'GET' },
    );
  }

  // ==========================================
  // Trips Management
  // ==========================================

  async listTrips(params?: {
    schoolId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }): Promise<TripListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.schoolId) searchParams.set('schoolId', params.schoolId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
    if (params?.toDate) searchParams.set('toDate', params.toDate);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    const endpoint = query ? `/trips?${query}` : '/trips';
    return this.request<TripListResponse>(endpoint, { method: 'GET', signal: AbortSignal.timeout(15000) });
  }

  async getTripDetail(tripId: string): Promise<TripDetail> {
    return this.request<TripDetail>(`/trips/${tripId}`, { method: 'GET', signal: AbortSignal.timeout(15000) });
  }

  async generateTrips(dto: GenerateTripsRequest): Promise<GenerateTripsResponse> {
    return this.request<GenerateTripsResponse>('/trips/generate', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateTripAssignment(
    tripId: string,
    dto: UpdateTripAssignmentRequest,
  ): Promise<{ message: string; trip: TripDetail }> {
    return this.request<{ message: string; trip: TripDetail }>(
      `/trips/${tripId}/assignment`,
      {
        method: 'PATCH',
        body: JSON.stringify(dto),
      },
    );
  }

  async listLeaveNotices(params?: {
    page?: number;
    limit?: number;
    kind?: string;
    status?: string;
    serviceDate?: string;
    direction?: string;
    search?: string;
  }): Promise<LeaveNoticeListResponse> {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.kind) sp.set('kind', params.kind);
    if (params?.status) sp.set('status', params.status);
    if (params?.serviceDate) sp.set('serviceDate', params.serviceDate);
    if (params?.direction) sp.set('direction', params.direction);
    if (params?.search) sp.set('search', params.search);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return this.request<LeaveNoticeListResponse>(`/leave-notices${qs}`);
  }

  async getLeaveNoticeDetail(id: string): Promise<LeaveNoticeItem> {
    return this.request<LeaveNoticeItem>(`/leave-notices/${id}`);
  }

  async getReplacementCandidates(noticeId: string): Promise<ReplacementCandidatesResponse> {
    return this.request<ReplacementCandidatesResponse>(`/leave-notices/${noticeId}/replacement-candidates`);
  }

  async assignReplacement(
    noticeId: string,
    dto: AssignReplacementDto,
  ): Promise<LeaveNoticeItem> {
    return this.request<LeaveNoticeItem>(`/leave-notices/${noticeId}/assign-replacement`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async cancelTripFromNotice(
    noticeId: string,
    dto: CancelTripFromNoticeDto,
  ): Promise<LeaveNoticeItem> {
    return this.request<LeaveNoticeItem>(`/leave-notices/${noticeId}/cancel-trip`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }
}

export const apiClient = new ApiClient();

