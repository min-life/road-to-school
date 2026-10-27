# AI Review — Prompt triển khai sự cố vận hành

## 1. Task Information
Ngày27/10/2026, Asia/Saigon. Scope Documentation. Type Implementation handoff prompt. Status COMPLETED cho bàn giao; application implementation chưa chạy bởi Codex.

## 2. Original Request
PO yêu cầu tạo prompt để Antigravity triển khai sau khi phân tích DB/API/UI và chốt hai nhóm sự cố, ngưỡng, dedupe, TEST, popup, privacy và lịch sử cá nhân/điểm báo duy nhất.

## 3. Approved Scope
Yêu cầu mới chỉ đạo bàn giao Antigravity thực thi thiết kế:1bảng TripIncident tối thiểu, API/Web/Mobile theo wireframe, detector/ETA và integration Trip/leave. Prompt quy định additive DDL/generation và chỉ apply localdev đã xác minh mục tiêu/drift, không data migration. Codex không sửa application code/DB. Không có quyền seed/test mutations/OTP/paid-provider/dependency/commit/push.

## 4. Analysis & Decisions
Prompt đầy đủ tại operational-incidents-implementation-prompt.md. Bao gồm4loại,2nhóm/status, điều kiện nearestTrip15phút LIVE/TEST, staff assignment blockers và admin ARRIVED/REPLACED/cancel. OFF_ROUTE theo snapshot100m30s, LATE_STOP next pickup/dropoff ETA trễ5m30s,1/type/Trip bền vững. Server detector tách telemetry transaction, yêu cầu bổ sung ETA có chất lượng/timing thực; không coi UI/mocks là nghiệm thu. Mine chỉ reportedBy self OR auto confirmedBy self; report entry chỉ Trip Detail, Parent chỉ loại/thời điểm/trạng thái. Không circular module refactor hoặc mở rộng ngoài scope.

## 5. Implementation Details
No application code changes.
- Mới: docs/ai-review/operational-incidents-implementation-prompt.md.
- Sửa plan: addendum chỉ thị bàn giao mới, giữ lịch sử trạng thái thiết kế.
- Archive trước task: history/2026-10-27-004258-before-incidents-implementation-prompt.md/.diff/.plan.md.
- Cập nhật LATEST.md/LATEST.diff docs-only.

## 6. Database Changes
None thực tế. Prompt định hướng TripIncident13fields, enums, PK+unique dedupe+2listing indexes, FK tối thiểu; có thể mở rộng existing navigationState JSON cho current-leg timing, không thêm bảng/cột cache khác. Không migration/generation/apply hay connection trong task này.

## 7. API & Swagger Changes
None thực tế. Prompt mô tả10endpoints groups/options/mine/admin/Trip list/create/detail/candidates/resolve/cancel/confirm, DTO validation/role projection/CAS; bắt buộc Swagger verify khi triển khai.

## 8. UI/UX Changes
Không code UI. Prompt sử dụng wireframes đã bàn: utility history không+, form chỉ Trip Detail, tab readonly3roles, Teacher popup defer/banner, Web list/modal role-specific. Không Parent utility hoặc Trip-card button.

## 9. Verification & Testing
Đã đọc plan/LATEST, kiểm git status9entries đầu task, archive trước chỉnh sửa; kiểm tra prompt có các quyết định mới, test policy và kế hoạch verification. Không chạy typecheck/tests/build cho docs-only; không tái sử dụng PASS từ phiên khác. Không gọi DB/API mutations/VietMap/OTP. Runtime implementation/acceptance NOT_VERIFIED; test viết nghiệp vụ chưa có quyền, BLOCKED_BY_TEST_DATA_POLICY.

## 10. Issues & Risks
ETA engine server và route timing cần triển khai thực, không để stub. Cadence/GPS gaps/provider quota là giới hạn runtime; migration chỉ đúng localdev verified, không tự áp prod. Mine và pending Trip feed khác nhau; xử lý incident/leave chung phải tránh bypass/circular modules. Lỗi data/targets còn thiếu phải báo không đủ dữ liệu, không fake warning. Code chưa được Antigravity triển khai trong task này.

## 11. Reviewer Focus
Scope1table/minimal JSON; role-specific resolution; shared blockers/transaction lock ordering;100m30s/5m30s continuity/dedupe durable; ETA vs snapshotplanned time; no viewer-triggered writes; history own actions vs full Trip access; Parent backend masking; report only eligible Trip entry; test evidence và task-only diff.

## 12. Suggested Next Step
Gửi operational-incidents-implementation-prompt.md cho Antigravity triển khai.

## 13. Approval Status
Đã có chỉ thị PO tạo prompt thực thi; không xin lại cùng business/schema/UI decisions trong prompt. Bản bàn giao WAITING FOR USER REVIEW / APPROVAL; không tự cấp quyền UAT hoặc provider. Codex STOP AFTER TASK.
