# AI Review — Home Bus Attendant đồng bộ Driver/Parent

## 1. Task Information
Date: 01/11/2026 Asia/Saigon. Scope Mobile UI. Type Implementation. Status COMPLETED frontend; native acceptance NOT_VERIFIED.

## 2. Original Request
PO yêu cầu áp dụng tương tự Home Driver vừa triển khai cho Home Bus Attendant.

## 3. Approved Scope
Tái sử dụng wireframe/layout đã duyệt của Driver cho Bus Attendant theo yêu cầu trực tiếp, thay nội dung vai trò phù hợp. Không thiết kế mới hay đổi nghiệp vụ, API, DB hoặc dependency. Giữ các thay đổi Driver và tài liệu chưa commit trước task.

## 4. Analysis & Decisions
Cùng ParentHomeScrollView đã hỗ trợ title/subtitle/actions nên gộp cấu hình staff ở Home, không tạo component hoặc engine cuộn mới. Driver/Attendant dùng cùng shell và shortcuts; Parent giữ defaults riêng. Chỉ đổi title/subtitle theo role. Giữ file StaffHomeScrollView cũ, không xóa code ngoài phạm vi.

## 5. Implementation Details
- mobile/app/(tabs)/index.tsx: cả Driver/Attendant chọn ParentHomeScrollView; gộp cấu hình 2 staff roles, bỏ import shell cũ và props nhánh cũ. Attendant dùng tên thật hoặc fallback Giáo viên phụ xe, subtitle trường từ homeTrip hoặc Trường học đối tác. Báo nghỉ/Sự cố routes không đổi. Header Chuyến xe của bạn/ngày chạy hiện cho cả 2 staff roles.
- docs/architecture/mobile-driver-home-ui.md: thêm addendum trạng thái hiện hành của Attendant, phân biệt với snapshot Driver task trước.
- docs/ai-review/LATEST.md/.diff: report và task-only diff so với baseline đầu task, không trộn source changes Driver trước đó. Bảo toàn report cũ trong history/2026-11-01-before-attendant-home.md/.diff.

## 6. Database Changes
None. Không DB queries, records hoặc seed.

## 7. API & Swagger Changes
None. Không API requests/mutations, payload/schema/auth changes.

## 8. UI/UX Changes
Attendant nhận nền kem, avatar/tên/vai trò-trường/chuông, tiện ích Báo nghỉ/Sự cố như Driver. Cùng expanded/compact threshold và safe-area/refresh offsets của Parent. Parent giữ Báo nghỉ/Đổi điểm. Thẻ chuyến và nút Vào điểm danh & Vận hành giữ toàn bộ props/callbacks hiện có.

## 9. Verification & Testing
PASS mobile/node_modules/.bin/tsc.cmd --noEmit, exit0.
PASS Expo export --platform web --output-dir ngoài application repo, exit0, web/server bundles. Không đồng nhất với native build hoặc runtime visual.
PASS one-off assert self-check dùng TypeScript AST lấy chính expression HomeScrollView/JSX spread props, thực thi trên role flags và trạng thái user/homeTrip undefined: cả 3 roles chọn shared shell; staff role fallback/subtitle đúng; callbacks Báo nghỉ/Sự cố vẫn /leave-notices,/incidents; Parent vẫn /leave-notices,/parent/change-stop. Callback kiểm tra bằng bộ thu route cục bộ, không mount router/API hoặc giả business responses.
PASS AST parity baseline đầu task: fetchHomeData, onRefresh và StaffTripCard JSX props/callbacks không đổi. PASS git diff --check -- mobile.
NOT_VERIFIED preview Attendant riêng trong browser, native iPhone/Android, font scale lớn, scroll/refresh/authenticated navigation thực. Shared shell browser QA ở task Driver trước không được báo thành QA Attendant mới. Android/iOS JS export task trước cũng không phải kết quả export mới của task này.

## 10. Issues & Risks
Cần nghiệm thu title/subtitle dài và cuộn trên thiết bị thật. Không tự đăng nhập, tạo dữ liệu hoặc thao tác nghiệp vụ để kiểm chứng. StaffHomeScrollView cũ còn trong repo nhưng Home không dùng; không tự xóa file ngoài scope.

## 11. Reviewer Focus
Attendant chọn đúng shared shell; role label và trường fallback; Parent/Driver defaults và routes không đổi; StaffTripCard vẫn dùng role BUS_ATTENDANT và các callbacks cũ.

## 12. Suggested Next Step
PO kiểm tra Home Bus Attendant trên điện thoại thật ở trạng thái đầu trang và thu gọn.

## 13. Approval Status
PO đã yêu cầu triển khai tương tự Driver. Frontend completed; native acceptance WAITING FOR USER REVIEW. Chưa có yêu cầu commit/push.
