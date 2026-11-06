# AI Review — Theo dõi: trạng thái chưa có học sinh

## 1. Task Information
28/10/2026 (Asia/Saigon). Mobile UI/docs. IMPLEMENTATION, hoàn thành local; nghiệm thu thiết bị còn lại. Chưa commit/push.

## 2. Original Request
Khi chưa có học sinh, thiết kế trang Theo dõi giống V1 và giữ nguyên các nút nghiệp vụ V2.

## 3. Approved Scope
Chỉ giao diện nhánh danh sách rỗng của Mobile và docs. V1 chỉ đọc. Bảo toàn các thay đổi local có từ trước; không backend/DB/API/schema/migrations/dependencies hoặc Git writes.

## 4. Analysis & Decisions
Đọc AGENTS, WORKING_RULES, BUSINESS_CONTEXT, handoffs, LATEST, tài liệu UI/Phase2 và source hai bản. Áp dụng ui-ux-pro-max cho responsive/accessibility. V1 có EmptyState, Illustration và QuickGuide; V2 dùng chung một màn liên kết. Lấy card/ảnh/phân cấp chữ/CTA, không nhập provider hoặc hai luồng thao tác V1. Bố cục/những nút giữ lại đã trình bày trong commentary trước khi sửa theo yêu cầu triển khai của PO.

## 5. Implementation Details
- [tracking.tsx](../../mobile/app/(tabs)/tracking.tsx): thay duy nhất phần JSX/styles danh sách rỗng, bỏ styles chết của empty UI cũ; ScrollView flex và vùng riêng tránh FAB che card.
- [TrackingEmptyState](../../mobile/components/parent/tracking-empty-state.tsx): component trình bày, prop onLink, không router/data/effect.
- [Ảnh gốc V1](../../mobile/assets/images/parent/parent-add-student.png): sao chép nguyên 30,777 bytes; checksum được đối chiếu.
- Cập nhật [UI status](../architecture/mobile-ui-implementation-status.md) và hai handoffs; báo cáo/diff trước lưu tại history/2026-10-28-before-tracking-empty-ui.md và .diff. LATEST.diff chỉ ghi thay đổi code/asset của task, so với snapshot đầu task, không gom thay đổi Phase2 trước đó.

## 6. Database Changes
None. Không đọc/ghi DB hoặc tạo dữ liệu để test.

## 7. API & Swagger Changes
None. Lời gọi API/router/refresh và logic tải/hủy liên kết giữ nguyên. Không thêm endpoint/payload/permission.

## 8. UI/UX Changes
Card trắng viền nhẹ bo20, ảnh học sinh/xe buýt/trường, title20/27, text12/18, CTA vàng min48 dạng viên thuốc theo V1. Giữ nguyên title/nội dung V2, Liên kết học sinh và FAB + cùng handler cũ; giữ header/chuông và kéo làm mới. Vùng cuộn chừa90px ngoài viewport cho FAB58 + khoảng16 mỗi phía; ảnh thu nhỏ ở320px, card max560 khi màn rộng. Safe area vẫn thuộc shell Phase2. Không có input/keyboard mới; loading/error/retry/populated cards không đổi.

## 9. Verification & Testing
PASS TypeScript noEmit; Expo export all iOS/Android/Web/server; git diff --check theo cấu hình repository. Checksum ảnh V1/V2 trùng e853b3503d64502336cce9c97b40ba19249636fb5b48678ff5b1d9eb215be01e. Đối chiếu AST: API/router/refresh calls và logic màn hình trước return không đổi; kiểm tra cả link callback và FAB còn tồn tại.

Chromium IAB isolated preview dùng component thật và AppHeader: 320x568, 390x844, 1440x900 không tràn ngang, ảnh tải560x560. Màn320 cuộn48px; CTA sau cuộn nằm303.7–351.7px, FAB420–478px, không chồng nhau. Card desktop560px. Nhấn hai control gọi callback đếm cục bộ thành2; không gọi API. Footer là khung mô phỏng, không chứng nhận tab navigation thực tế. Dọn entry/server/tab tạm sau kiểm tra. Không cài packages.

NOT_VERIFIED: iPhone Expo Go/Android thật, Safari iOS/Chrome Android, Dynamic Type/VoiceOver, native pull-to-refresh, mở route/QR/liên kết thật. Không thực hiện mutation để test theo Test Data Policy; UAT liên kết thật BLOCKED_BY_TEST_DATA_POLICY khi chưa có phê duyệt/dữ liệu được cấp.

## 10. Risks & Limitations
Build/export không thay thế nghiệm thu thiết bị và route có xác thực. Minh họa chỉ trang trí, không phản ánh dữ liệu. Trạng thái lỗi vẫn tách khỏi danh sách rỗng; không dùng empty card để che lỗi. Native gesture/safe area dưới navigation shell cần PO kiểm tra trên thiết bị.

## 11. Reviewer Focus
Kiểm tra chỉ success + students.length === 0 dùng giao diện mới; cả CTA/FAB tới handler V2 cũ và refresh còn nguyên. Kiểm tra màn nhỏ/chữ lớn cuộn đủ, FAB không che nội dung. Không coi những diff chưa commit từ các task trước là thay đổi task này.

## 12. Suggested Next Step
PO mở tab Theo dõi trên iPhone với tài khoản chưa liên kết học sinh để nghiệm thu ảnh, vùng cuộn và hai nút.

## 13. Approval & Handoff
Chờ PO xem kết quả local. Không commit/push, seed, sửa dữ liệu, nâng package hoặc thay business flow. Dừng sau task này.
