import { getApiBaseUrl } from './api';
import { tokenStorage, TokenPair } from './token-storage';

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
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MessageResponse {
  message: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  errors?: string[];
}

export type StudentStatus = 'AVAILABLE' | 'DISABLED';

export interface ParentLinkedStudentItem {
  id: string;
  code: string;
  fullName: string;
  avatarUrl: string | null;
  schoolName: string;
  status: StudentStatus;
  linkedAt: string;
}

export interface ParentLinkedStudentDetail {
  id: string;
  code: string;
  fullName: string;
  avatarUrl: string | null;
  schoolName: string;
  addressText: string | null;
  hasAddress: boolean;
  status: StudentStatus;
  linkedAt: string;
}

export interface RequestLinkOtpResponse {
  challengeId: string;
  maskedPhone: string;
  expiresInSeconds: number;
  message: string;
}

export interface VerifyLinkOtpResponse {
  message: string;
  studentId: string;
  code: string;
  fullName: string;
}

// ==========================================
// Round 3 Types: Student Update Requests & Account
// ==========================================

export type RequestType = 'INFORMATION_UPDATE' | 'ADDRESS_UPDATE';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

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

export interface RequestOtpResponseDto {
  challengeId: string;
  maskedPhone: string;
  expiresInSeconds: number;
  message: string;
}

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

class MobileApiClient {
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

  /**
   * Thực hiện làm mới Access Token bằng Refresh Token (Full Token Pair Rotation)
   */
  private async executeRefresh(): Promise<string | null> {
    const pair = await tokenStorage.getTokenPair();
    if (!pair?.refreshToken) {
      await tokenStorage.clearTokenPair();
      this.notifyUnauthorized();
      return null;
    }

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: pair.refreshToken }),
      });

      if (!response.ok) {
        await tokenStorage.clearTokenPair();
        this.notifyUnauthorized();
        return null;
      }

      const data: TokenPairResponse = await response.json();
      await tokenStorage.setTokenPair({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      return data.accessToken;
    } catch {
      // Nếu gặp lỗi mạng tạm thời trong lúc refresh, không xóa token vội
      return null;
    }
  }

  /**
   * Phương thức gọi HTTP API tập trung
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0,
    timeoutMs = 10000,
  ): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const isFormData =
      typeof FormData !== 'undefined' &&
      (options.body instanceof FormData ||
        (options.body && typeof (options.body as any).append === 'function'));
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (isFormData) {
      delete headers['Content-Type'];
    }

    const pair = await tokenStorage.getTokenPair();
    if (pair?.accessToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${pair.accessToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const isUpload = endpoint.includes('/avatar');
    if (isUpload) {
      console.log('[AVATAR_DIAG] [REQUEST_START_ATTEMPT]', {
        endpoint,
        timeoutMs,
        hasAuth: Boolean(headers['Authorization']),
      });
    }

    const startTime = Date.now();
    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      if (isUpload) {
        console.log('[AVATAR_DIAG] [HTTP_RESPONSE_RECEIVED]', {
          status: response.status,
          durationMs: Date.now() - startTime,
        });
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (isUpload) {
        console.error('[AVATAR_DIAG] [FETCH_THROWN]', {
          errorName: err?.name,
          errorMessage: err?.message,
          durationMs: Date.now() - startTime,
        });
      }
      if (err.name === 'AbortError') {
        throw new ApiError({
          statusCode: 0,
          code: 'TIMEOUT_ERROR',
          message: 'Kết nối quá thời gian chờ. Vui lòng thử lại.',
        });
      }
      if (err instanceof ApiError) {
        throw err;
      }
      const rawMsg = (err?.message || '').toLowerCase();
      if (
        rawMsg.includes('formdatapart') ||
        rawMsg.includes('unsupported formdatapart') ||
        rawMsg.includes('multipart')
      ) {
        throw new ApiError({
          statusCode: 0,
          code: 'CLIENT_MULTIPART_ERROR',
          message: `Lỗi đóng gói multipart trên thiết bị: ${err?.message || 'Unsupported FormDataPart implementation'}`,
        });
      }
      throw new ApiError({
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền và thử lại.',
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Xử lý 401 Unauthorized trên các API có xác thực (Single-flight refresh token queue)
    if (
      response.status === 401 &&
      !endpoint.includes('/auth/mobile/login') &&
      !endpoint.includes('/auth/refresh') &&
      retryCount === 0
    ) {
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
          timeoutMs,
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
          message: `Lỗi kết nối máy chủ (${response.status})`,
        };
      }
      throw new ApiError({
        statusCode: errorData.statusCode || response.status,
        code: errorData.code || 'UNKNOWN_ERROR',
        message: errorData.message || 'Thao tác không thành công',
        errors: errorData.errors,
      });
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // --- 8 Mobile Authentication Endpoints ---

  async mobileLogin(credentials: {
    identifier: string;
    password: string;
  }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/mobile/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async registerRequestOtp(body: {
    identifier: string;
  }): Promise<MessageResponse> {
    return this.request<MessageResponse>('/auth/register/request-otp', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async registerVerify(body: {
    identifier: string;
    otp: string;
    fullName: string;
    password: string;
    confirmPassword: string;
  }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async forgotPasswordRequestOtp(body: {
    identifier: string;
  }): Promise<MessageResponse> {
    return this.request<MessageResponse>('/auth/forgot-password/request-otp', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async resetPassword(body: {
    identifier: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<MessageResponse> {
    return this.request<MessageResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async refresh(refreshToken: string): Promise<TokenPairResponse> {
    return this.request<TokenPairResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me', {
      method: 'GET',
    });
  }

  async logout(): Promise<MessageResponse> {
    try {
      return await this.request<MessageResponse>('/auth/logout', {
        method: 'POST',
      });
    } finally {
      await tokenStorage.clearTokenPair();
      this.notifyUnauthorized();
    }
  }

  // --- Parent - Student Linking Endpoints ---

  async getLinkedStudents(): Promise<ParentLinkedStudentItem[]> {
    return this.request<ParentLinkedStudentItem[]>('/parents/students', {
      method: 'GET',
    });
  }

  async getLinkedStudentDetail(id: string): Promise<ParentLinkedStudentDetail> {
    return this.request<ParentLinkedStudentDetail>(`/parents/students/${id}`, {
      method: 'GET',
    });
  }

  async requestLinkOtp(studentCode: string): Promise<RequestLinkOtpResponse> {
    return this.request<RequestLinkOtpResponse>('/parents/link-requests', {
      method: 'POST',
      body: JSON.stringify({ studentCode }),
    });
  }

  async verifyLinkOtp(challengeId: string, otp: string): Promise<VerifyLinkOtpResponse> {
    return this.request<VerifyLinkOtpResponse>('/parents/verify-link', {
      method: 'POST',
      body: JSON.stringify({ challengeId, otp }),
    });
  }

  async unlinkStudent(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/parents/students/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // Round 3 APIs: Account Settings (Shared & Parent)
  // ==========================================

  async changePassword(body: {
    currentPassword: string;
    newPassword: string;
  }): Promise<MessageResponse> {
    return this.request<MessageResponse>('/auth/me/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateAvatar(formData: FormData): Promise<{ avatarUrl: string; message: string }> {
    return this.request<{ avatarUrl: string; message: string }>(
      '/auth/me/avatar',
      {
        method: 'POST',
        body: formData,
      },
      0,
      60000, // 60s timeout for binary upload and Cloudinary storage
    );
  }

  async updateName(body: { fullName: string }): Promise<User> {
    return this.request<User>('/auth/me/name', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  // ==========================================
  // Round 3 APIs: Parent Student Update Requests
  // ==========================================

  async requestStudentUpdateOtp(
    studentId: string,
    body: { type: RequestType; proposedData: Record<string, any> },
  ): Promise<RequestOtpResponseDto> {
    return this.request<RequestOtpResponseDto>(
      `/parents/students/${studentId}/update-requests/otp`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  }

  async verifyStudentUpdateOtp(
    studentId: string,
    body: {
      challengeId: string;
      otp: string;
      type: RequestType;
      proposedData: Record<string, any>;
    },
  ): Promise<StudentUpdateRequest> {
    return this.request<StudentUpdateRequest>(
      `/parents/students/${studentId}/update-requests/verify`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  }

  async listParentStudentRequests(
    studentId: string,
    params?: {
      page?: number;
      limit?: number;
      type?: RequestType;
      status?: RequestStatus;
    },
  ): Promise<StudentUpdateRequestListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.type) searchParams.set('type', params.type);
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    const endpoint = query
      ? `/parents/students/${studentId}/update-requests?${query}`
      : `/parents/students/${studentId}/update-requests`;
    return this.request<StudentUpdateRequestListResponse>(endpoint, {
      method: 'GET',
    });
  }

  async getParentRequestDetail(
    requestId: string,
  ): Promise<StudentUpdateRequestDetail> {
    return this.request<StudentUpdateRequestDetail>(
      `/parents/update-requests/${requestId}`,
      {
        method: 'GET',
      },
    );
  }
}

export const mobileApiClient = new MobileApiClient();
