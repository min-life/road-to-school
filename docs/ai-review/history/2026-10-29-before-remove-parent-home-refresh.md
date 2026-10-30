# AI Review — Restyle toàn bộ màn OTP theo V1

## 1. Task Information
29/10/2026, Asia/Saigon. IMPLEMENTATION Mobile UI + docs. Hoàn thành local; chưa commit/push. Runtime OTP/native UAT chưa được nghiệm thu.

## 2. Original Request
PO yêu cầu dùng hình ảnh và thiết kế V1 để bổ sung, restyle tất cả màn xác nhận OTP trong V2. Kế thừa nguyên tắc chỉ đọc V1, bảo toàn nội dung/nghiệp vụ/API V2 và tài liệu kiến trúc.

## 3. Approved Scope
Năm màn nhập OTP, ảnh xác thực và component/style trình bày dùng chung; cập nhật docs liên quan. Không backend, ORM/schema/migrations, database, env, package/lockfile hoặc Git commit/push. Giữ toàn bộ thay đổi local có trước task. Bố cục kế thừa V1 đã được trình bày trong commentary; triển khai theo yêu cầu restyle và quyền tự xử lý trình bày thông thường PO đã giao.

## 4. Analysis & Decisions
Đọc AGENTS, WORKING_RULES, BUSINESS_CONTEXT, CODEX_HANDOFF, CURRENT_STATE, LATEST và tài liệu Mobile UI/keyboard; kiểm tra git status. Áp dụng skill ui-ux-pro-max cho phạm vi giao diện xác thực, giữ paste và nhãn trường, không cài dependency.

Đối chiếu trực tiếp source OTP/auth/parent V1 và xem verify-phone.jpg. V2 có registration, reset-password, parent link, parent update request dùng chung thông tin/địa chỉ, leave confirmation. Các trang chỉ yêu cầu gửi mã không phải màn nhập OTP. Giữ sáu ô đăng ký, một ô ở các màn còn lại; không tạo resend trên màn update request vốn không có. Font/palette dùng hạ tầng V2, không sao chép tổ chức code/font package V1.

## 5. Implementation Details
- [OtpHero](../../mobile/components/auth/otp-hero.tsx) mới: ảnh trang trí, compact tùy chọn cho reset, tỉ lệ theo JPEG và kích thước theo chiều rộng; không API/state nghiệp vụ.
- [otpStyles](../../mobile/constants/otp-styles.ts) mới: form/heading/input/OTP boxes/password/CTA/resend/error và typography dùng chung.
- [Registration OTP](../../mobile/app/(auth)/verify-otp.tsx), [Reset password](../../mobile/app/(auth)/reset-password.tsx), [Parent link](../../mobile/app/parent/verify-otp.tsx), [Update request](../../mobile/app/parent/create-request/verify-otp.tsx), [Leave confirmation](../../mobile/app/leave-notices/otp.tsx): thêm hero, restyle, accessibility label. Auth dùng SafeAreaView; link/leave thêm bottom inset, update giữ inset sẵn có.
- [verify-phone.jpg](../../mobile/assets/images/auth/verify-phone.jpg) sao chép nguyên byte từ V1: 38.503 bytes, 648×652, SHA-256 `6a02ced282ccc263a6293517cb5f6be845b6cb041f70268c7299f25b572ddd78`.
- [Tài liệu OTP](../architecture/mobile-otp-ui.md) mới; cập nhật UI status, keyboard, hai handoff, implementation README/source map. Báo cáo trước được lưu [history](history/2026-10-29-before-otp-v1-style.md).

## 6. Database Changes
Không có. Không truy cập/thay đổi DB, seed, tạo OTP challenge hay dữ liệu test; không dùng tài khoản/dữ liệu thật để gọi mutation.

## 7. API & Swagger Changes
Không có. Giữ toàn bộ lời gọi/payload API, router, auth context và xử lý response. Không cần thay Swagger; không thực hiện gửi/resend/verify/reset-password qua backend để test UI.

## 8. UI/UX Changes
Nền kem, minh họa V1, tiêu đề navy, thông báo lỗi đỏ đậm dễ đọc trên nền trắng, input trắng bo góc13, CTA vàng bo tròn và trạng thái disabled hiện có. Form tối đa430px, padding24; OTP boxes co theo bề ngang, destination dài xuống dòng. Reset vẫn đủ OTP/hai password/eye buttons/banner trung tính/thành công; leave vẫn đủ kênh nhận và SMS console. Không xóa nút hoặc nội dung V2.

KeyboardScrollView giữ quyền điều phối bàn phím/cuộn; không thêm offset bàn phím cố định hay KeyboardAvoidingView. Hero không đổi kích thước theo chiều cao viewport. AutoFocus, editable, disabled và state nhập giữ nguyên. Link giữ max8/validation4–8; các màn khác6. Password input khai báo font hệ thống/weight400/normal/letterSpacing0; OTP spacing khai báo riêng.

## 9. Verification & Testing
- PASS `npx --no-install tsc --noEmit` tại mobile, sau khi xóa preview tạm.
- PASS `npx --no-install expo export --platform all`: iOS, Android, Web/server, exit0, output trong TEMP ngoài repo. Có warning NO_COLOR/FORCE_COLOR, không lỗi build. Git mặc định cảnh báo chuẩn hóa LF→CRLF; diff --check exit0, không lỗi whitespace; không đổi Git config. Không có script lint trong manifest; không cài thêm CLI.
- PASS so sánh AST trước/sau cả5 màn: state/effects/handlers, callback/constraint props, copy hiển thị và lời gọi API/router giống nhau; bỏ qua hook inset trình bày mới khi so sánh.
- PASS auth-context, api-client, KeyboardScrollView native/Web byte-identical với đầu task; ảnh V1/V2 byte-identical; kiểm tra diff/whitespace và link docs.
- PASS Chromium IAB preview thực5 cây JSX/style tại320×568,390×844,1440×900 (15 lượt): ảnh đúng648×652, không tràn ngang, input đúng vùng ngang, form dài cuộn được, đăng ký hiển thị6 ô sau nhập. MaxLength link vẫn8. Preview dùng placeholder/callback cục bộ, không API/auth/DB; đã xóa script khỏi repo và đóng server/tab kiểm tra.
- NOT_VERIFIED: gửi/resend/verify OTP, timer theo thời gian, lỗi/loading/success do backend, route/auth đầy đủ — BLOCKED_BY_TEST_DATA_POLICY. Không tạo record hay gọi mutation để kiểm chứng.
- NOT_VERIFIED: Expo Go iPhone/Android, bàn phím/safe area thật, Safari iOS/Chrome Android, VoiceOver/font scale. Không có thiết bị/simulator kết nối; preview không thay native UAT.

## 10. Issues & Risks
Không còn lỗi typecheck/export được ghi nhận. Những luồng/state không được chạy backend chỉ được bảo toàn bằng đối chiếu source, chưa phải nghiệm thu end-to-end. AutoFocus OTP cũ có thể đưa vùng mã vào viewport khi mở trang; không tự thay đổi trong task style. Bản xuất browser kiểm tra bố cục, không chứng minh đã hết lỗi font/recycle của iOS từ task trước.

## 11. Reviewer Focus
Đối chiếu [source map và component contract](../architecture/mobile-otp-ui.md), ảnh V1 nguyên bản, đủ5 route, phần nội dung/nút V2, input link4–8, reset dài và leave nhiều kênh nhận. [LATEST.diff](LATEST.diff) chỉ chứa thay đổi source của task so với snapshot đầu task, file mới và tài liệu OTP mới; không gộp diff những task local trước. Các docs hiện có đã cập nhật được liệt kê ở mục5.

## 12. Suggested Next Step
PO nghiệm thu năm màn OTP trên Expo Go iPhone bằng các luồng/dữ liệu được phép, gồm mở/đóng bàn phím, chuyển ô và nút cuối form.

## 13. Approval Status
Hoàn thành phần implementation được yêu cầu; native/runtime acceptance còn NOT_VERIFIED. Không commit/push. Dừng sau task và chờ phản hồi PO.
