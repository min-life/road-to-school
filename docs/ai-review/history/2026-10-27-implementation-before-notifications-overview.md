# AI Review — Thiết kế Thông báo kèm Tổng quan hai Admin

## 1. Task Information
Ngày27/10/2026, Asia/Saigon. Scope Documentation / source analysis API+Web. Type Discussion / Design. Status WAITING_APPROVAL đối với bố cục và metrics, không implementation.

## 2. Original Request
PO muốn thực hiện notification cùng trang Tổng quan cho System Admin và School Admin để xem nhanh các thống kê.

## 3. Approved Scope
Đã chốt mở rộng hướng thiết kế kết hợp notification+overview. Chỉ phân tích và lưu tài liệu; metrics/API/wireframe là đề xuất, chưa code/schema/DDL/dependency/push. Không tự coi yêu cầu trao đổi là yêu cầu implementation.

## 4. Analysis & Decisions
Đề xuất landing /admin với task backlog theo đúng role,4Trip status cards theo serviceDate, attention table bounded, inventory role-specific. Backlog mọi ngày, trip stats theo ngày, inventory hiện trạng; scope gắn nhãn rõ. Shared action predicates với bell, unread độc lập unresolved; chuông global không bị school filter dashboard làm hẹp. Counts thực thể/hồ sơ/Trip distinct đúng đơn vị; SCHEDULED includes waitingAssignment subset. Dashboard không thêm bảng. GET overview aggregate server, filters+deep link hoạt động thật. Trend7ngày tùy chọn, không mặc định báo cáo chuyên sâu.

## 5. Implementation Details
No application code changes.
- Mới: docs/ai-review/notifications-admin-overview-design.md.
- Sửa notifications-product-ideas.md addendum yêu cầu Tổng quan kết hợp.
- Archive LATEST.md/.diff và notification ideas trước thay đổi: history/2026-10-27-024122-before-notifications-admin-overview-design.*.
- Cập nhật LATEST.md/LATEST.diff docs-only.

## 6. Database Changes
None. Thiết kế dashboard reuse aggregate bảng có sẵn; không thêm bảng statistics/materialized cache. Notification persistence chưa chốt DB ở task này. Không connection/migration/DML.

## 7. API & Swagger Changes
None thực tế. Đề xuất GET /api/v1/admin/overview(serviceDate,schoolId), role-scoped counts/tasks/bounded trips/inventory; GET notification summary global; common permission/actionability checks. Swagger cần sync khi implement.

## 8. UI/UX Changes
Không code UI. Wireframe4sections và role-specific fields; sửa trang Tổng quan hiện có thay tạo menu mới. System có school dropdown, School cố định trường. Cards/list links bảo toàn filters, không auto mutation. Loading/error không hiển thị số0 giả. Chưa duyệt wireframe, chưa tạo prompt.

## 9. Verification & Testing
Đã đọc LATEST Antigravity incident implementation và hiện trạng /admin blank; nav config cho2roles, source searches aggregate APIs và TripIncident schema/controller; đọc list query DTO Trip/Incident/Plan và Web page state. git status39entries lúc bắt đầu. Không typecheck/tests/build (docs-only), không nhận388tests trong report Antigravity thành evidence task này. Không DB/API mutation/push/provider/OTP calls. Dashboard/notification runtime NOT_VERIFIED.

## 10. Issues & Risks
Nguồn list hiện có query hỗ trợ nhưng một số Web page chưa hydrate từ URL cần đồng bộ khi deep link. All-time backlog vs daily stats vs current inventory phải phân biệt. Vehicle không có active status/availability đơn giản nên không giả metric xe rảnh. IN_PROGRESS qua ngày/qua endAt không được làm biến mất khỏi cảnh báo hiện tại. School scopes và current role can-handle phải server-side. Incident implementation report chưa được Codex nghiệm thu runtime ở task này.

## 11. Reviewer Focus
Distinct counts và shared predicates, no VIRTUAL Trip in actual totals, waiting-assignment subset, school access leakage, pending role capabilities, global bell vs scoped dashboard, dynamic read status vs business task status, query bounds/N+1, future/historical date semantics, deep link filters và no auto action.

## 12. Suggested Next Step
PO review bố cục và nhóm thống kê version đầu cùng ma trận thông báo trước khi chốt prompt triển khai chung.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL đối với thiết kế. Yêu cầu kết hợp hai phần đã ghi nhận; không tự implement/migrate/install/push. STOP AFTER TASK.
