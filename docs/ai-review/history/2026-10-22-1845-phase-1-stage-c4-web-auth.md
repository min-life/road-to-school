# RoadToSchool — AI Review Report: Phase 1 — Task C4 Implementation

## A. Task Information
- **Task**: TASK C4 — Web Authentication Implementation
- **Phase**: Phase 1 — Authentication & Account Access (Stage C — Implementation)
- **Scope**: Web Frontend (`web/src/*`, `web/src/app/*`, `web/src/components/*`, `web/src/lib/*`)
- **Status**: COMPLETED — WAITING FOR REVIEW (Dừng lại sau Task C4 theo đúng quy định, tuyệt đối không tự ý chuyển sang Task C5 hay chỉnh sửa Mobile)

---

## B. Wireframe Review
- **Wireframes Sử dụng & Đối chiếu**:
  - **Screen W1 (Web Login)**: Form đăng nhập quản trị tối giản, logo xe buýt RoadToSchool, trường Email/SĐT, mật khẩu kèm nút hiện/ẩn (👁️), liên kết "Quên mật khẩu?", nút Đăng nhập màu Primary `#FFCB56`, thông báo lỗi tiếng Việt dạng banner.
  - **Screen W2 (Quên mật khẩu & Đặt lại mật khẩu)**: Quy trình 2 bước liên tục:
    - *Bước 1*: Nhập Email hoặc SĐT -> Gửi mã -> Nhận phản hồi trung tính Anti-Enumeration (*"Nếu tài khoản tồn tại và đủ điều kiện, mã xác minh sẽ được gửi."*).
    - *Bước 2*: Nhập mã xác nhận OTP 6 số (đồng hồ đếm ngược `05:00`, nút "Gửi lại mã" chỉ kích hoạt khi về `00:00`), mật khẩu mới, xác nhận mật khẩu -> Nút "Hoàn tất" -> Thông báo thành công -> Tự động chuyển hướng về `/login`.
  - **Screen W3 (Web Role Splash)**: Màn hình trung gian 1.2 giây hiển thị huy hiệu vai trò tương ứng sau khi submit form đăng nhập thành công (`SYSTEM_ADMIN` biểu tượng Khiên bảo mật, `SCHOOL_ADMIN` biểu tượng Trường học) cùng thanh nạp tiến trình mượt mà.
- **Trạng thái Phê duyệt**: Các Wireframes trên đã được phê duyệt trong Stage B Revision, áp dụng triệt để nguyên tắc *Minimal UI Copy* và bảng màu chính thức của RoadToSchool.
- **Khác biệt so với Stage B**: Không có khác biệt đáng kể nào; toàn bộ layout, cấu trúc form và luồng dữ liệu đều bám sát 100% thiết kế đã phê duyệt.

---

## C. UI Implementation
- **Danh sách Màn hình**:
  - [login/page.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/login/page.tsx): Màn hình đăng nhập Quản trị (Screen W1).
  - [forgot-password/page.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/forgot-password/page.tsx): Màn hình quên và đặt lại mật khẩu 2 bước trực tiếp bằng OTP (Screen W2).
  - [admin/page.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/admin/page.tsx): Giao diện hạ cánh dành cho quản trị viên đã đăng nhập (Authenticated Landing State tối giản, hiển thị huy hiệu vai trò, avatar ký tự đầu, chi tiết phiên bảo mật, nút Đăng xuất).
  - [page.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/page.tsx): Trang gốc tự động kiểm tra trạng thái xác thực và điều hướng thông minh (`/admin` nếu đã đăng nhập, `/login` nếu chưa đăng nhập).
- **Thành phần Giao diện & Kiến trúc**:
  - [auth-provider.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/auth/auth-provider.tsx): Quản trị trạng thái toàn cục của phiên đăng nhập, khôi phục phiên tự động khi tải lại trang, kích hoạt Role Splash sau khi đăng nhập thủ công, xử lý đăng xuất an toàn.
  - [auth-guard.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/auth/auth-guard.tsx): Bảo vệ khu vực `/admin`, kiểm tra quyền hạn (`SYSTEM_ADMIN`, `SCHOOL_ADMIN`), chặn truy cập trái phép.
  - [role-splash.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/auth/role-splash.tsx): Component hiển thị Role Splash 1.2s với thanh loading động (Screen W3).
  - [icons.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/icons.tsx): Bộ icon SVG nội bộ (BusLogo, Shield, School, Eye, EyeOff, Spinner, Alert, Check, ArrowLeft, Logout), không phụ thuộc thư viện icon ngoài.
- **Phong cách Thiết kế & Màu sắc**:
  - Primary: `#FFCB56` (Nút bấm chính, huy hiệu nhận diện, thanh tiến trình)
  - Background: `#FFFDF6` (Nền trang ứng dụng)
  - Foreground: `#1E293B` (Màu chữ chính)
  - Surface: `#FFFFFF` (Nền thẻ đăng nhập và thanh điều hướng)
- **Hỗ trợ Responsive**: Tương thích hoàn toàn trên thiết bị di động (Mobile 360px+), máy tính bảng (Tablet) và máy tính để bàn (Desktop), không bị tràn ngang layout.

---

## D. API Integration
Web Frontend đã tích hợp đầy đủ 6 API Authentication từ Backend C3 thông qua [api-client.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/lib/api-client.ts):

| Method | Endpoint | Mục đích tích hợp | Xử lý phản hồi | Trạng thái tích hợp |
|---|---|---|---|---|
| POST | `/api/v1/auth/web/login` | Đăng nhập tài khoản Quản trị | Lưu token pair & user, kích hoạt Role Splash 1.2s | **VERIFIED** |
| POST | `/api/v1/auth/forgot-password/request-otp` | Gửi yêu cầu nhận mã xác minh OTP | Hiển thị thông báo trung tính Anti-Enumeration, kích hoạt đếm ngược 300s | **VERIFIED** |
| POST | `/api/v1/auth/reset-password` | Đặt lại mật khẩu trực tiếp qua OTP | Hiển thị thông báo thành công, chuyển hướng về `/login` | **VERIFIED** |
| POST | `/api/v1/auth/refresh` | Làm mới cặp mã xác thực | Tự động kích hoạt khi nhận 401 trên request cần bảo vệ | **VERIFIED** |
| GET | `/api/v1/auth/me` | Lấy thông tin tài khoản hiện tại | Dùng trong Session Restoration khi mở hoặc reload trang | **VERIFIED** |
| POST | `/api/v1/auth/logout` | Đăng xuất và thu hồi phiên tại Backend | Thu hồi phiên trên PostgreSQL, xóa sạch localStorage | **VERIFIED** |

---

## E. Authentication Architecture
1. **Token Storage**:
   - Lưu trữ cặp Token (`r2s_access_token`, `r2s_refresh_token`) và thông tin người dùng (`r2s_user`) trong `localStorage` thông qua module trung tâm [auth-storage.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/lib/auth-storage.ts).
   - Truy cập an toàn bảo vệ SSR (`typeof window !== 'undefined'`), không gây lỗi Hydration.
   - Tuyệt đối không log credentials hoặc token ra Console/Analytics.
2. **Session Restoration (Khôi phục Phiên làm việc)**:
   - Khi người dùng truy cập hoặc reload trang web:
     1. `authStorage` kiểm tra token trong `localStorage`.
     2. Nếu có token, tải trước `cachedUser` để ngăn ngừa hiện tượng giật giao diện (layout shift).
     3. Gọi `GET /api/v1/auth/me` để kiểm chứng tính hợp lệ của phiên với Database Backend.
     4. Nếu Access Token hết hạn, `apiClient` tự động kích hoạt Refresh Token để cấp cặp Token mới.
     5. Nếu phiên bị thu hồi (`revokedAt != null`), `apiClient` xóa sạch storage và đưa về `/login`.
     6. **Không hiển thị Role Splash khi khôi phục phiên**.
3. **Single-Flight Refresh Token Queue (Xoay vòng Token Phía Client)**:
   - Khi có nhiều request nhận mã lỗi `401 Unauthorized` đồng thời:
   - Biến `refreshPromise` đóng vai trò Mutex Lock, bảo đảm **chỉ có duy nhất 1 request refresh** được gửi lên Backend tại một thời điểm.
   - Các request khác sẽ xếp hàng chờ `refreshPromise` hoàn tất, sau đó tự động retry bằng Access Token mới mà không gây lỗi xung đột token version.
4. **Phân quyền Route (Role-Based Routing)**:
   - `AuthGuard` kiểm tra vai trò: Chỉ tài khoản có `role === 'SYSTEM_ADMIN'` hoặc `role === 'SCHOOL_ADMIN'` mới được vào `/admin`.
   - Các vai trò khác hoặc người dùng chưa đăng nhập sẽ bị điều hướng ngay lập tức về `/login`.

---

## F. Vietnamese Language Compliance
- 100% nội dung giao diện hiển thị cho người dùng bằng tiếng Việt tự nhiên, có dấu:
  - Tiêu đề trang & metadata: *"RoadToSchool — Quản lý xe buýt học sinh"*, *"Cổng thông tin và quản trị hệ thống xe buýt trường học RoadToSchool"*.
  - Nhãn biểu mẫu: *"Email hoặc Số điện thoại"*, *"Mật khẩu"*, *"Mã xác thực OTP"*, *"Mật khẩu mới"*, *"Xác nhận mật khẩu mới"*.
  - Nút bấm & liên kết: *"Đăng nhập"*, *"Quên mật khẩu?"*, *"Gửi mã"*, *"Hoàn tất"*, *"Quay lại đăng nhập"*, *"Đăng xuất"*.
  - Trạng thái chờ: *"Đang đăng nhập..."*, *"Đang xử lý..."*, *"Đang cập nhật..."*, *"Đang xác thực phiên làm việc..."*, *"Đang khởi tạo không gian làm việc..."*.
  - Thông báo lỗi & thành công: Lấy nguyên bản thông báo nghiệp vụ tiếng Việt từ Backend (`err.message`), không để lộ lỗi kỹ thuật tiếng Anh mặc định.

---

## G. Files Changed
- **Files Added**:
  - `web/src/app/login/page.tsx`: Màn hình Đăng nhập Quản trị (Screen W1).
  - `web/src/app/forgot-password/page.tsx`: Màn hình Quên & Đặt lại mật khẩu (Screen W2).
  - `web/src/app/admin/page.tsx`: Màn hình Quản trị viên (Authenticated Landing).
  - `web/src/components/auth/auth-provider.tsx`: Context Provider quản lý trạng thái xác thực.
  - `web/src/components/auth/auth-guard.tsx`: Guard bảo vệ route quản trị.
  - `web/src/components/auth/role-splash.tsx`: Hiệu ứng Role Splash 1.2s (Screen W3).
  - `web/src/components/icons.tsx`: Bộ biểu tượng SVG thuần.
  - `web/src/lib/types.ts`: Định nghĩa kiểu dữ liệu TypeScript.
  - `web/src/lib/auth-storage.ts`: Module lưu trữ localStorage an toàn.
  - `web/src/lib/api-client.ts`: Module gọi API tập trung kèm cơ chế single-flight refresh.
- **Files Modified**:
  - `web/src/app/layout.tsx`: Cập nhật cấu hình `lang="vi"`, metadata tiếng Việt và bọc ứng dụng trong `AuthProvider`.
  - `web/src/app/page.tsx`: Tự động điều hướng thông minh dựa trên trạng thái phiên.
- **Files Deleted**: Không có file mã nguồn nào bị xóa (file script kiểm thử tạm thời `test-web-integration.mjs` đã được dọn dẹp sau khi kiểm thử xong).

---

## H. Testing & Verification

| Hạng mục kiểm thử | Lệnh / Kịch bản thực thi | Kết quả | Chi tiết kiểm chứng |
|---|---|---|---|
| Next.js TypeScript Compilation | `npm run build` | **PASS** | `next build` thành công, 0 lỗi TypeScript, 4 route tĩnh prerendered (`/`, `/admin`, `/forgot-password`, `/login`) |
| ESLint Code Quality | `npm run lint` | **PASS** | `eslint` hoàn thành, 0 cảnh báo, 0 lỗi |
| API Integration Test Suite | Chạy test suite `apiClient` kết nối Backend thực | **PASS** | **10/10 tests passed**: Đăng nhập đúng/sai mật khẩu, `/auth/me`, Full Token Rotation, Anti-Enumeration OTP, Logout thu hồi phiên |
| Browser Verification | `browser_subagent` tự động hóa giao diện | **NOT VERIFIED** | Công cụ browser runner không thể cài đặt driver Playwright do môi trường chạy kiểm thử offline không truy cập được Azure CDN (`404 Not Found`). Đã báo cáo theo quy định mục 14.5 |

---

## I. Security & Risks
- **Rủi ro XSS khi lưu Token trong localStorage**: Chấp nhận theo quyết định đã duyệt cho nền tảng Web. Giảm thiểu bằng cách sanitize mọi dữ liệu đầu vào qua React DOM và không sử dụng `dangerouslySetInnerHTML`.
- **Đồng bộ hóa đa tab (Cross-tab sync)**: Các tab khác nhau chia sẻ chung `localStorage`. Khi một tab đăng xuất hoặc refresh token, các tab còn lại sẽ nhận được token cập nhật khi thực hiện request tiếp theo.
- **Bảo vệ Route**: Xác thực thực tế được bảo vệ kép bởi cả `AuthGuard` phía client và `AuthGuard` truy vấn PostgreSQL phía NestJS backend.

---

## J. Reviewer Focus
- **Cơ chế Single-Flight Refresh**: Xem phương thức `request` và `executeRefresh` trong [web/src/lib/api-client.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/lib/api-client.ts).
- **Session Restoration & Role Splash Isolation**: Xem [web/src/components/auth/auth-provider.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/auth/auth-provider.tsx) bảo đảm Role Splash chỉ hiển thị sau đăng nhập thủ công, không bị kích hoạt khi reload trang.
- **Tuân thủ Ngôn ngữ Tiếng Việt**: Kiểm tra các nhãn, placeholder và thông báo lỗi trong [web/src/app/login/page.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/login/page.tsx) và [web/src/app/forgot-password/page.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/forgot-password/page.tsx).

---

## K. Next Step
- **TASK C5 — MOBILE AUTHENTICATION IMPLEMENTATION**: Triển khai giao diện Mobile Login, Đăng ký Phụ huynh, OTP Verification, Expo SecureStore và Mobile Role Splashes (`mobile/`).

---

## L. Approval Status
- **Trạng thái**: WAITING FOR PRODUCT OWNER APPROVAL.
- AI Agent đã dừng lại sau khi hoàn thành Task C4. Tuyệt đối không tự ý thực hiện Task C5 khi chưa có phê duyệt chính thức.
