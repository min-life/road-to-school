# AI Review — Parent Home UI theo V1

## 1. Task Information
28/10/2026. Mobile + docs. IMPLEMENTATION / RESTYLE. COMPLETED (local implementation; UAT limitations). Branch dongnnp/mobile/refactor-ui; chưa commit/push.

## 2. Original Request
Restyle màn Trang chủ phụ huynh bằng phong cách V1, giữ nguyên context V2, không bỏ bất kỳ phần nào. Không yêu cầu giống từng pixel.

## 3. Approved Scope
Chỉ UI PARENT trong Home và stylesheet riêng, docs liên quan. V1 chỉ đọc, không cài package, đổi API/auth/nghiệp vụ/DB hoặc Git commit/push. Giữ toàn bộ uncommitted work Phase2, NetworkBanner và docs trước task.

## 4. Analysis & Decisions
Đọc AGENTS/docs theo thứ tự, Phase1/Phase2 và V1 ParentHomeQuickActions/ChildCard/TripRow/ChildrenSection/Header cùng parent-home-layout/styles. Áp dụng skill ui-ux-pro-max (text reflow/overflow, React Native; search đầu không khớp được retry bằng domain UX, dùng kết quả phù hợp). Chọn style override theo isParent để tránh đổi Home nhân sự. V1 cung cấp kem/card trắng/bo góc/bóng/icon tròn; không copy provider/mock/SVG hoặc quick actions không có ở Home V2.

## 5. Implementation Details
- Sửa mobile/app/(tabs)/index.tsx: conditional parent styles cho vùng chung; parent card giữ mọi trường, status chuyển xuống dòng, route wrap; CTA vàng/pill, disabled feedback, accessibility labels. Thêm heading Chuyến xe của con khi có cards. Không thêm data fetch hoặc count học sinh.
- Thêm mobile/components/parent/home-styles.ts: presentation chỉ cho PARENT, semantic colors/tones và responsive maxWidth560. Chuyển18 style definitions parent-only ra module; style khác giữ nguyên.
- Thêm docs/architecture/mobile-parent-home-ui.md; cập nhật UI status, V1 transfer plan, CODEX_HANDOFF/CURRENT_STATE, implementation README/source-map. Archive LATEST trước task rồi cập nhật LATEST/diff.
- File preview tạm từ JSX return đã xóa khỏi repo; build artifacts ngoài repo. Không ship preview route hoặc business fixtures.

## 6. Database Changes
None. Chỉ Prisma read-only xác nhận tài khoản PO đã cấp là PARENT và có0 học sinh liên kết. Không lưu email/id/credentials/PII vào docs; không seed/tạo data, session hay mutation.

## 7. API & Swagger Changes
None. Giữ useActiveRefresh8000ms, identity/stale-response cleanup, refresh, role branches, quick-leave payload và điều kiện canReportLeave/isRequesting. Không POST/login/OTP để test.

## 8. UI/UX Changes
Nền kem, thẻ trắng border ấm bo16/20 và shadow nhẹ, icon tròn48, title19/26, metadata12/18, CTA vàng chữ foreground, action tối thiểu48. Tên/trường có đủ chỗ, trạng thái riêng, route và lý do vắng wrap. In-flow ScrollView, maxWidth560 canh giữa, không cộng safe inset trùng shell hoặc thêm keyboard offset. Screen không có input. Giữ header/tab Phase2; không chỉnh Home nhân sự. Wireframe đã trình bày trước code, implement theo yêu cầu tiếp tục của PO; chưa có nghiệm thu wireframe/UI riêng của PO.

## 9. Verification & Testing
- PASS: Mobile npx --no-install tsc --noEmit.
- PASS: Expo export all iOS/Android/Web/server của source cuối, output trong temp; không nâng package.
- PASS: AST source parity API/router/useEffect/useCallback/useActiveRefresh/triggerQuickLeaveNotice; toàn bộ JSX text trước task còn đủ; JSX nhánh staff không đổi sau chuẩn hóa CRLF/LF. So sánh byte ban đầu bị EOL làm khác, đã kiểm lại bằng chuẩn hóa EOL.
- PASS: Chromium IAB isolated preview từ JSX return và styles thật, không chạy auth/controller/API, parentCards rỗng, không tạo fake User/Student/Trip. Empty/error320x568, loading375x812, empty1440x900; không tràn ngang320/1440; refresh/empty CTA cao48. CTA cuối sau scroll/focus top397/bottom445 nằm trong content viewport; label nút cuối đúng không kèm glyph. Header/footer harness chỉ bao content, không dùng để chứng nhận router.
- PASS: Prisma read-only linked-student count0 của tài khoản PO; không có mutation/seed.
- PASS: git diff --check và kiểm tra liên kết tài liệu; manifest/lockfile/API/Web không đổi trong task.
- NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY: card có chuyến, đầy đủ attendance/disabled/long-name bằng dữ liệu thật; cần học sinh liên kết và Trip/attendance hợp lệ, không tự tạo records hoặc fixtures.
- NOT_VERIFIED: iPhone/Android Expo, Safari iOS/Chrome Android, VoiceOver/largest Dynamic Type và E2E polling/route/báo nghỉ. Không coi preview/bundle là device UAT.
- NOT_VERIFIED: lint, Mobile không có lint script/config; không tự thêm công cụ. Không viết unit tests mirror stylesheet cho thay đổi trình bày này.

## 10. Issues & Risks
Route rỗng Xem lịch tuần của con vẫn trỏ /(tabs)/schedule vốn dành cho nhân sự; đây là bất nhất source có trước, giữ nguyên trong scope style và ghi rõ trong tài liệu. Card có dữ liệu/long-field/disabled chưa render bằng dữ liệu hợp lệ; triển khai wrapping không phải bằng chứng UAT. Không chuyển hết màn nghiệp vụ khác.

## 11. Reviewer Focus
Parent-only overrides, mặc định nhân sự không đổi; đủ student/school/status/route/time/date/attendance/markedAt/absence/vehicle/driver; tracking/leave buttons và payload/disabled đầy đủ; responsive/nút cuối không bị shell che. Không tự đổi route nghiệp vụ để xử lý bất nhất có trước. LATEST.diff chỉ hai source files task này, không trộn Phase2/NetworkBanner trước đó.

## 12. Suggested Next Step
PO nghiệm thu Trang chủ phụ huynh trên iPhone Expo bằng dữ liệu học sinh/chuyến hợp lệ do PO cung cấp.

## 13. Approval Status
PO yêu cầu implementation rõ trong session. WAITING FOR USER REVIEW / APPROVAL cho nghiệm thu kết quả. Không tự đánh dấu APPROVED; chưa commit/push.
