# AI Review — Staff trip card theo wireframe đã duyệt

## 1. Task Information
Date 01/11/2026 Asia/Saigon. Branch kietdm/mobile/refactor-ui. Scope Mobile UI. Type Implementation. Status COMPLETED frontend; visual/native acceptance NOT_VERIFIED.

## 2. Original Request
PO nói “oke tôi duyệt” sau wireframe card Driver/Bus Attendant mở đầy đủ theo style Parent, giữ thông tin hiện có.

## 3. Approved Scope
Triển khai đúng wireframe card cho cả hai vai trò. Không đổi Home header, API, DB, quyền, dữ liệu hoặc luồng thao tác. Không tự commit/push. Working tree trước task chỉ có các report/design-history pending; giữ nguyên chúng.

## 4. Analysis & Decisions
StaffTripCard chỉ có một caller tại Home. Reuse parentHomeStyles cho khung card/identity/status pill/primary và leave CTA; dùng colors/journeyTones hiện có. Giữ local layout staff trong cùng file, không tạo abstraction hoặc sửa component Parent. Không xóa staffHomeStyles cũ vì còn phần khác dùng và cleanup ngoài scope.

Summary nền kem, bus icon vàng, route/status/school, tags direction/time; thân trắng với các hàng vehicle/capacity/student count/driver/attendant, badge Bạn, readiness hoặc số liệu attendance và CTA. Card luôn mở; không thêm interaction thu gọn. Ngày giữ tại heading Home; routeName giữ nguyên từ API (kể cả nếu đã gồm biển số), không dùng parser để tự cắt tên. Tên tuyến/trường/nhân sự wrap thay vì numberOfLines1.

## 5. Implementation Details
- mobile/components/staff/staff-trip-card.tsx: application file duy nhất thay đổi. Interface props không đổi; bỏ Image assets riêng, dùng Ionicons sẵn có; tách bố cục theo wireframe, reuse styles/theme Parent. Root giữ shadow, summary bo góc để không cần overflow hidden làm mất shadow native.
- docs/architecture/mobile-staff-trip-card-ui.md: source/layout/guard map và giới hạn kiểm chứng.
- docs/ai-review/LATEST.md/.diff: báo cáo và task-only application diff. Report trước được bảo toàn history/2026-11-01-before-staff-card-implementation.md/.diff.

## 6. Database Changes
None. Không query, seed hoặc tạo/sửa records.

## 7. API & Swagger Changes
None. Không sửa client/backend hoặc gọi API để test. Dữ liệu render tiếp tục từ props Home hiện có.

## 8. UI/UX Changes
Đúng bố cục đã duyệt: header kem, mép trái nhấn, icon bus tròn vàng, các tags nhỏ; thân trắng và các hàng thông tin đọc đủ tên, attendance riêng; CTA vàng luôn hiện. Dùng badge Bạn theo isCurrentUser cũ. WAITING_ASSIGNMENT giữ ưu tiên và label, chuyển màu sang tone warning của theme. SCHEDULED giữ readiness + text riêng hai roles. IN_PROGRESS giữ 4 số liệu marked/total/present/absent. Trạng thái khác không có operation block như trước.

CTA labels/onViewDetail giữ nguyên. Báo nghỉ vẫn canReportLeave; disabled và spinner theo isReportingLeave, onReportLeave giữ nguyên. Thêm accessibilityRole và busy/disabled state. Không copy student-specific trạng thái Parent sang staff.

## 9. Verification & Testing
PASS mobile/node_modules/.bin/tsc.cmd --noEmit --project mobile/tsconfig.json, exit0 sau thay đổi cuối.
PASS expo export --platform all --output-dir ngoài app repo: Android/iOS/web/server exit0. Đã export lại sau chỉnh badge Bạn cuối, output staff-card-export-final. Đây là JS/Hermes bundle, không phải native build/APK/runtime.
PASS one-off TypeScript AST/assert trên source mới so với HEAD: mọi binding trip cũ còn (ngoại trừ serviceDate được xác nhận tại Home), callback onPress và disabled parity, tất cả guard status/readiness/current-user/leave/role và text nghiệp vụ còn; không còn numberOfLines; chỉ StaffTripCard là mobile file changed. Không test lại bằng bản sao logic hoặc fixture nghiệp vụ.
PASS git diff --check -- mobile; tự review correctness/readability/architecture/security/performance, không thêm requests/effects/dependencies.
Lệnh apply_patch đầu dùng delete/add cùng target bị tool từ chối trước mutation; ghi lại file bằng literal single-quoted PowerShell here-string, sau đó sửa nhỏ bằng apply_patch và typecheck/source assertions đạt.
NOT_VERIFIED runtime visual StaffTripCard mới, native devices/screen reader/font scaling, authenticated navigation và mutation. Preview Chromium320/390 ở task wireframe không được coi là bằng chứng UI production. BLOCKED_BY_TEST_DATA_POLICY cho các kiểm tra tích hợp chưa có nguồn real assigned trip được agent xác minh: cần hai role, chuyến SCHEDULED chưa/đã ready, IN_PROGRESS với attendance và canReportLeave/isReportingLeave để UAT; không tự tạo hoặc giả responses để làm PASS.

## 10. Issues & Risks
Cần UAT tên tuyến/nhân sự dài, font scale và safe-area/scroll trên thiết bị. JSX/typecheck/bundle không chứng minh ảnh native khớp wireframe. Tên tuyến giữ raw API nên có thể vẫn chứa biển số lặp với hàng xe; không tự biến đổi tên nghiệp vụ. Tài liệu/history pending được giữ; không commit/push.

## 11. Reviewer Focus
Đủ field dữ liệu, date ở Home, giữ canReportLeave/isReportingLeave/callbacks và role/readiness/assignment conditions. Parent card không đổi. Wrap tên/tag/CTA khi màn nhỏ/font lớn. Reuse theme/style và shadow thật trên native.

## 12. Suggested Next Step
PO kiểm tra card trên điện thoại thật ở Home Driver và Bus Attendant, gồm chuyến đang chạy và chờ khởi hành.

## 13. Approval Status
Wireframe đã được PO duyệt, code triển khai hoàn tất. Native/visual acceptance WAITING FOR USER REVIEW. Chưa có yêu cầu commit/push.
