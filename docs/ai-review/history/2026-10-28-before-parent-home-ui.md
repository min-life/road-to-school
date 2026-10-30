# AI Review — Phase 2 Mobile header/tab navigation

## 1. Task Information
28/10/2026. Mobile + docs. IMPLEMENTATION. COMPLETED (local implementation; device/UAT limitations). Branch dongnnp/mobile/refactor-ui; chưa commit/push.

## 2. Original Request
Đồng bộ header/tab Mobile V2 theo V1, giữ context/API/quyền/route và Phase 1, kiểm tra và cập nhật docs đầy đủ. V1 chỉ đọc.

## 3. Approved Scope
PO yêu cầu implement trọn vẹn trong lượt này. Chỉ Mobile navigation/header + docs, không backend/DB/dependencies/commit/push. Giữ thay đổi NetworkBanner/docs/history có trước task; không restyle nội dung trang/modal/drawer hoặc Web Admin.

## 4. Analysis & Decisions
Đọc AGENTS/docs theo thứ tự, kết quả Phase 1, transfer plan, keyboard docs; đọc trực tiếp header/tab V1 ở đường dẫn PO cấp. Dùng skill ui-ux-pro-max, focused React Native search bằng Python bundled. Lấy nền kem, chữ đậm, nút tròn, tab trắng/bóng; dùng Ionicons/font hiện có, màu vàng nâu đọc được cho nhãn nhỏ. Không copy SVG/mock/provider V1.

## 5. Implementation Details
Chi tiết source/route/props: [mobile-navigation-phase2.md](../architecture/mobile-navigation-phase2.md).
- Thêm AppHeader/HeaderAction/headerActionStyles, TabButton, navigation tokens/geometry, native/Web keyboard hooks, navigation-layout.test.ts.
- Layout Tabs giữ route/role href/events/focused, thêm inset/fontScale và keyboard behavior. Header tracking/schedule dùng chung; tracking bỏ bottom inset cộng lặp.
- Chuẩn hóa navigation header và nhánh lỗi trong parent, leave-notices, incidents, notifications; giữ callbacks/disabled/Hôm nay/selectedStudentId/readAll. Trip giữ header nổi/điều kiện báo sự cố, chỉ thay back; error header dùng AppHeader.
- Root chuyển top inset ownership cho banner khi hiện. NotificationBell tròn48, bỏ hitSlop dư tránh chạm lấn; giữ unread/navigation. Bỏ style header chết. NetworkBanner.tsx là diff trước task, bảo toàn.
- Docs cập nhật: architecture/mobile-navigation-phase2 mới, UI status, keyboard, transfer plan, CURRENT_STATE, CODEX_HANDOFF, implementation README/source-map. Archive LATEST cũ rồi cập nhật report/diff.

## 6. Database Changes
None. Không seed, không tạo business/test records và không đọc/ghi DB trong task UI này.

## 7. API & Swagger Changes
None. Giữ API client/auth/guard/polling/notification context; không POST login/OTP/mark-read/push để test.

## 8. UI/UX Changes
Header kem, title19/25, subtitle12/18, hai dòng/ellipsis, target48, safe area và in-flow. Footer trắng, border/bóng, icon nét/đặc, selected/pressed/disabled, cao theo inset/fontScale. Trang chủ/Cá nhân giữ chung; Theo dõi PARENT; Lịch DRIVER/BUS_ATTENDANT; explore ẩn. Native tabBarHideOnKeyboard; Web đo focus/coarse pointer/viewport, capture focus và cleanup. Wireframe trình bày trong commentary trước code; không có lượt duyệt riêng, thực hiện theo chỉ thị mới nhất yêu cầu triển khai đầy đủ của PO. Chưa có PO nghiệm thu UI.

## 9. Verification & Testing
- PASS: Mobile npx --no-install tsc --noEmit.
- PASS: 22/22 pure tests navigation-layout/onboarding-route/keyboard-visibility (7 mới), không API/DB.
- PASS: Expo export all iOS/Android/Web/server ngoài repo; Web export chạy lại sau thay đổi hook focus/Bell cuối.
- PASS: AST parity API/router/useEffect/useActiveRefresh calls ở21 app files so HEAD. Không thay cho runtime.
- PASS: IAB Chromium isolated component harness, không business providers/API, 320x568/375x812/390x844/1440x900; long title/ellipsis, disabled, selected/aria-selected; không overflow ngang320/390. Safe inset59/34 là geometry harness. Sau focus input cuối ở375px, bottom661 < tab top712. Entry preview tạm đã xóa khỏi source.
- PASS: git diff --check; manifest/lockfiles/API/Web source không đổi.
- NOT_VERIFIED: route thật /schedule trên Expo Web dev riêng dừng ở SSR splash, không có console error; chưa tới authenticated navigation. Không coi tải URL là PASS guard.
- NOT_VERIFIED: authenticated tab/back/reload/deep link/role, iPhone/Android native, Safari iOS/Chrome Android, keyboard thật/modal, VoiceOver/Dynamic Type thật. Không có session/device phù hợp; không tự tạo session/data để test.
- NOT_VERIFIED: lint vì Mobile không có script/config lint; không cài thêm. Lệnh tsc từng gọi nhầm root thất bại, chạy lại đúng mobile PASS. Expo update và module/no-color warnings: không nâng package.
- Các scenario cần học sinh/chuyến thiếu dữ liệu: NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY.

## 10. Issues & Risks
Chưa nghiệm thu thiết bị/keyboard/router có xác thực. SSR splash cản test route; chưa xác định nguyên nhân, không sửa auth/config ngoài scope. href:null là ẩn tab, không thay authorization. Modal/drawer/map body chưa restyle. Desktop preview không chứng nhận Web Admin runtime.

## 11. Reviewer Focus
Single owner inset khi banner đổi trạng thái; navigator selected/href/events; giữ disabled/payload; viewport focus capture/reset/cleanup; chữ lớn/title/action màn hẹp. LATEST.diff chỉ code Phase 2, loại NetworkBanner pre-existing và docs/history trước task; không secrets. Phân biệt component preview với authenticated UAT.

## 12. Suggested Next Step
PO nghiệm thu Phase 2 trên iPhone Expo bằng phiên/tài khoản và dữ liệu hợp lệ hiện có.

## 13. Approval Status
PO đã yêu cầu implementation rõ. WAITING FOR USER REVIEW / APPROVAL cho nghiệm thu; không tự đánh dấu APPROVED. Chưa commit/push.
