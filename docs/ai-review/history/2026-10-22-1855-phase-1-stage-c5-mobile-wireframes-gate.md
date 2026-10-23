# RoadToSchool — AI Review Report: Phase 1 — Task C5 Wireframe & Dependency Approval Gate

## A. Task Information
- **Task**: TASK C5 — Mobile Authentication Implementation
- **Phase**: Phase 1 — Authentication & Account Access (Stage C — Implementation)
- **Scope**: Mobile (`mobile/*`, `docs/architecture/auth-technical-design.md`)
- **Status**: IN PROGRESS — PAUSED AT APPROVAL GATE (Dừng lại tại Wireframe Approval Gate & Dependency Approval Gate theo đúng quy tắc kỹ thuật và chỉ dẫn của Product Owner)

---

## B. Wireframe Review & Approval Gate
Theo chỉ đạo bắt buộc tại mục 4 (*"Đặc biệt, Mobile Forgot/Reset Password chưa được duyệt đầy đủ trong Stage B, vì vậy phải đưa các màn hình này qua Approval Gate trước khi implement. Không tự tuyên bố APPROVED nếu chưa có quyết định của tôi"*):

Toàn bộ 8 màn hình Mobile Authentication đã được hoàn thiện bản thiết kế ASCII Wireframe chi tiết tại [docs/architecture/auth-technical-design.md:L451-L640](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/architecture/auth-technical-design.md):

1. **Screen M1 (Application Splash)**: Khởi động app (Cold start), kiểm tra session trong `SecureStore`, nền `#FFFDF6`, icon xe buýt, spinner nhẹ. Điều hướng thẳng vào Role Area nếu session hợp lệ; chuyển sang Login nếu chưa đăng nhập.
2. **Screen M2 (Mobile Login)**: Dành riêng cho `DRIVER`, `BUS_ATTENDANT`, `PARENT`. Chặn `SYSTEM_ADMIN` và `SCHOOL_ADMIN` với thông báo tiếng Việt. Hỗ trợ toggle xem/ẩn mật khẩu, liên kết quên mật khẩu và đăng ký phụ huynh.
3. **Screen M3 (Đăng ký Phụ huynh)**: Thu thập Họ tên, lựa chọn nhận mã qua SĐT/Email, Mật khẩu (>= 6 ký tự), Xác nhận mật khẩu. Gọi `POST /auth/register/request-otp` và **tuyệt đối chưa tạo User trong Database** tại bước này. Form state được giữ an toàn trong in-memory state của auth flow.
4. **Screen M4 (Xác thực OTP Đăng ký)**: Nhập 6 số OTP, đồng hồ đếm ngược `05:00` (nút gửi lại mã chỉ mở khi về `00:00`). Nhập sai không giới hạn, không khóa mã, báo đỏ *"Mã xác thực không chính xác"*. Khi đúng -> Backend tạo User `PARENT`, trả Token Pair, lưu SecureStore, tự động đăng nhập vào ứng dụng (không hiện Role Splash).
5. **Screen M5 (Mobile Role Splashes)**: Hiển thị 1.2s định vị vai trò người dùng **duy nhất sau khi đăng nhập thủ công thành công** (`DRIVER` icon xe buýt, `BUS_ATTENDANT` icon phụ xe, `PARENT` icon gia đình). Không hiển thị khi mở app, restore session hay refresh token.
6. **Screen M6 (Quên mật khẩu — Mới bổ sung)**: Nhập Email hoặc SĐT -> Gửi mã -> Luôn trả về phản hồi trung tính Anti-Enumeration: *"Nếu tài khoản tồn tại và đủ điều kiện, mã xác minh sẽ được gửi."* Chuyển tiếp sang Screen M7.
7. **Screen M7 (Đặt lại mật khẩu bằng OTP — Mới bổ sung)**: Nhập mã OTP 6 số (kèm countdown 05:00), Mật khẩu mới, Xác nhận mật khẩu -> Bấm "Hoàn tất" -> Đặt lại mật khẩu trực tiếp qua OTP, thu hồi tất cả phiên cũ, thông báo thành công và chuyển về Screen M2 (không Auto Login).
8. **Screen M8 (Trạng thái Phiên & Kết nối — Mới bổ sung)**: Xử lý hết hạn phiên (dialog thông báo tiếng Việt và đưa về Login) và xử lý sự cố mạng tạm thời (banner cam thông báo, không xóa Token khỏi SecureStore).

---

## C. Dependency Approval Request: `expo-secure-store`
Theo quy định kiểm soát phạm vi (Scope Control) mục 2 & 9:
- **Hiện trạng Codebase**: `mobile/package.json` hiện đang sử dụng Expo SDK 58 (`expo: ~58.0.17`, `react-native: 0.88.0`), chưa có package `expo-secure-store`.
- **Package Đề xuất**: `expo-secure-store` (phiên bản tương thích chính thức của Expo SDK 58).
- **Lệnh Cài đặt**: `npx expo install expo-secure-store` (thực thi trong thư mục `mobile/`).
- **Mục đích & Tầm quan trọng**: Cung cấp cơ chế lưu trữ mã hóa an toàn cấp phần cứng (iOS Keychain, Android Keystore & EncryptedSharedPreferences) cho Access Token và Refresh Token. Đây là yêu cầu bảo mật bắt buộc, ngăn chặn hoàn toàn việc rò rỉ token qua AsyncStorage hoặc file system.
- **Trạng thái**: ĐANG CHỜ PHÊ DUYỆT TỪ PRODUCT OWNER TRƯỚC KHI CÀI ĐẶT.

---

## D. Architecture & Integration Plan
Sau khi nhận được phê duyệt Wireframes và Dependency:
1. **API Client (`mobile/services/api-client.ts`)**: Kế thừa cơ chế Runtime Host Resolution từ `mobile/services/api.ts` (hỗ trợ tự động nhận diện IP máy chủ từ Expo Metro hostUri, Android emulator 10.0.2.2, iOS simulator/web localhost), tích hợp Bearer Token và cơ chế Single-Flight Refresh Token Queue.
2. **Token Storage (`mobile/services/token-storage.ts`)**: Bọc `expo-secure-store` an toàn, quản lý các khóa `r2s_access_token` và `r2s_refresh_token`.
3. **Auth State & Navigation**: Sử dụng React Context (`AuthProvider`) kết hợp với Expo Router layout groups:
   - `(auth)`: Login, Register, VerifyOtp, ForgotPassword, ResetPassword.
   - `(tabs)` hoặc Role Area: Khu vực được bảo vệ cho từng vai trò người dùng.

---

## E. Files Changed in this Step
- **Modified**:
  - `docs/architecture/auth-technical-design.md`: Cập nhật và bổ sung toàn bộ ASCII Wireframes và đặc tả giao diện Screen M1 đến M8 tại mục 5.2.
  - `docs/ai-review/LATEST.diff`: Lưu trữ git diff thay đổi tài liệu thiết kế.
  - `docs/ai-review/LATEST.md`: Cập nhật báo cáo Approval Gate.

---

## F. Tests & Verification
- **Wireframes & UX Flow Review**: **PASS** (Đã rà soát đầy đủ 8 màn hình, tuân thủ Minimal UI Copy và bảng màu RoadToSchool).
- **TypeScript & Build Check**: Dự kiến chạy sau khi code UI.
- **Device & API Verification**: Sẵn sàng kiểm thử với Backend NestJS thực tế sau khi code xong.

---

## G. Reviewer Focus
1. Rà soát bản thiết kế ASCII Wireframes Screen M6 (Forgot Password) và Screen M7 (Reset Password) trong `docs/architecture/auth-technical-design.md`.
2. Xem xét phê duyệt cài đặt package `expo-secure-store` cho dự án `mobile/`.

---

## H. Next Step
- **Chờ Product Owner phê duyệt Wireframes M6, M7, M8 và cho phép cài đặt `expo-secure-store`**.
- Sau khi được phê duyệt: Tiến hành cài đặt dependency, xây dựng Token Storage, API Client, Auth Context và triển khai code UI cho 8 màn hình Mobile Authentication.

---

## I. Approval Status
- **Trạng thái**: WAITING FOR PRODUCT OWNER APPROVAL (STOP AT APPROVAL GATE).
