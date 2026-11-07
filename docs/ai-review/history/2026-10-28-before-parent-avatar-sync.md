# AI Review — Loading tối giản bằng logo app

## 1. Task Information
28/10/2026, Asia/Saigon. Mobile UI/Documentation. IMPLEMENTATION. COMPLETED local; chờ nghiệm thu thiết bị. Chưa commit/push.

## 2. Original Request
Dùng mẫu logo phù hợp trong ba SVG PO cung cấp để thay hình minh họa loading bằng trang loading đơn giản với logo.

## 3. Approved Scope
Logo và bố cục loading PARENT sau đăng nhập, đồng bộ nhánh loading React ban đầu của app. Giữ timer/auth/navigation/nghiệp vụ và pending work. Không app icon/native Expo splash config, không các màn nghiệp vụ, không backend/DB/dependencies/Git writes. Mẫu2 bị cắt, không tự hoàn thiện.

## 4. Analysis & Decisions
Đọc quy tắc/handoffs/LATEST/UI status và source RoleSplash, ParentLoginSplash, RootNavigation. Bố cục đã trình bày trước code: logo mẫu3 + wordmark mẫu1 trên nền kem, bỏ card/ảnh/đổ bóng, một chỉ báo nhỏ. Dùng SVG chính xác PO cung cấp, xuất PNG local bằng sharp đã cài ở web vì mobile không có react-native-svg; không cài package. Áp dụng ui-ux-pro-max tìm loading feedback minimal (Feedback / Loading Indicators), giữ feedback và trạng thái busy; Python hệ thống không có, dùng runtime Python bundled để tìm kiếm, không cài phần mềm.

## 5. Implementation Details
- [brand-logo.tsx](../../mobile/components/brand-logo.tsx): symbol/wordmark đúng tỷ lệ, label chung Road To School, ảnh con trang trí. Frame aspect ratio giữ wordmark không kéo chiều cao intrinsic trên Web.
- [app-loading-splash.tsx](../../mobile/components/app-loading-splash.tsx): SafeAreaView/ScrollView, logo, message, spinner hoặc thanh nhận interpolation; không effect/request/timer.
- [parent/login-splash.tsx](../../mobile/components/parent/login-splash.tsx): wrapper truyền progressWidth và message cũ; bỏ ảnh slide2/card/role title khỏi màn này, không xóa asset onboarding.
- [app/_layout.tsx](../../mobile/app/_layout.tsx): nhánh isLoading/onboarding chưa ready render shared component; bỏ import BusLogo/styles cũ chỉ phục vụ loading, giữ các phần còn lại.
- Assets mới: mobile/assets/images/brand/road-to-school-symbol.svg + .png, road-to-school-wordmark.svg + .png. PNG528x327 (10,404B) và1320x276 (23,965B), transparent, render từ SVG; không sửa V1/asset cũ. Font-family giữ Manrope/Arial/sans-serif; app không thêm Manrope, rasterizer có thể dùng fallback sẵn có.
- Cập nhật UI status, CURRENT_STATE, CODEX_HANDOFF và báo cáo/diff. Review trước archive history/2026-10-28-before-logo-loading.md + .diff. Task diff dùng snapshot đầu task, không gom Phase2/pending changes cũ.

## 6. Database Changes
None. Không truy cập/thay đổi dữ liệu hoặc tạo fixtures để test.

## 7. API & Swagger Changes
None. Không endpoint/payload/permission/auth change, không gọi mutation để nghiệm thu.

## 8. UI/UX Changes
Nền kem, logo navy/vàng, wordmark có To giảm sắc độ. Symbol128px, wordmark max260px, frame max320px, gap32 tới loading. Startup: Đang tải... + spinner; PARENT: Đang mở trang chủ... + bar180x4. Bỏ card/ảnh phụ huynh/role heading để tối giản theo yêu cầu. Giữ tiến trình thời gian có sẵn; không hiển thị phần trăm API. Busy progressbar và accessible brand label. Safe area, scroll cho màn thấp; không có input/keyboard hoặc nút mới.

## 9. Verification & Testing
PASS npx --no-install tsc --noEmit và Expo export --platform all iOS/Android/Web/server, không cài package. RoleSplash so byte-identical với đầu task: durationMs1200/Animated.timing/onFinish/nhánh role khác giữ nguyên. AST root auth/navigation/splash hooks giữ nguyên. PASS git diff --check theo repository settings và task whitespace check.

Chromium IAB isolated component preview: parent320x568,390x844,568x320,1440x900 và startup390x844. Ảnh natural528x327,1320x276; render symbol128x79.27/wordmark260x54.36, không tràn ngang. Frame desktop logo260px. Màn thấp nội dung242px cuộn28px để xem chỉ báo, safe area giả lập44/34. Preview progress45% cố định, không gọi API hoặc giả lập auth response. Phát hiện chiều cao intrinsic Web ở lần đầu; đã sửa bằng khung aspect ratio + ảnh width/height100%, kiểm tra lại và export lại source cuối thành công. Dọn entry/server/tab/viewport override tạm.

NOT_VERIFIED: Expo Go iPhone/Android thật, Safari iOS/Chrome Android, VoiceOver/Dynamic Type, cold start/login/logout thực tế. Không tạo user/session hoặc gọi mutation để test theo Test Data Policy. Mobile không có lint script; không thêm tooling mới.

## 10. Issues & Risks
PNG wordmark cố định typography từ môi trường render SVG; muốn dùng Manrope chính xác cần font được PO cung cấp/chấp thuận rồi xuất lại PNG, không tự tải font. SVG nguồn vẫn giữ nguyên để chỉnh về sau. Build/export và preview không thay nghiệm thu thiết bị/auth. Native Expo splash và các role ngoài PARENT không đổi.

## 11. Reviewer Focus
Đảm bảo startup readiness condition, root effects/providers/routes và RoleSplash timer không đổi. Parent wrapper vẫn nhận đúng interpolation; một chỉ báo theo mode. Logo bám mẫu3 + mẫu1, không suy đoán mẫu2. Kiểm tra ratio ảnh ở native/web, màn thấp có thể cuộn, accessible logo/loading không đọc lặp. Không lẫn changes cũ vào task diff.

## 12. Suggested Next Step
PO mở app và đăng nhập phụ huynh trên iPhone để nghiệm thu logo/loading thực tế.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL. Đã triển khai local theo yêu cầu; chưa commit/push. Dừng sau task.
