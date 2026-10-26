# AI Review — Checklist kiểm thử UI vòng đời phương án và thay đổi học sinh

## 1. Task Information
Date: 26/10/2026 (Asia/Saigon). Scope: Documentation / Targeted Source Review. Type: Manual UI UAT Checklist. Status: COMPLETED (tạo checklist); chưa thực thi UI/UAT.

## 2. Original Request
PO yêu cầu đọc LATEST để biết Antigravity vừa làm gì và tạo checklist kiểm thử UI.

## 3. Approved Scope
Đọc báo cáo/diff/source có mục tiêu, soạn checklist thủ công theo role và expected behavior đã duyệt. Không application fixes, UI automation, migration, DB mutation, tạo dữ liệu, OTP/provider calls hoặc cài dependency.

## 4. Analysis & Decisions
Antigravity báo triển khai snapshot/exclusion/enums, cancel/expiry/relocation/contract, address request cancellation/outcomes/routing preview, disable và insertion, Web/Mobile integration. Báo cáo tự ghi full verification nhưng chủ yếu liệt kê typecheck/unit tests, không có bằng chứng UAT. Không dùng lời tuyên bố đó làm acceptance.

Đã tạo 67 ca UI trong school-route-lifecycle-ui-uat-checklist.md, nhóm A kiểm tra đường vào/nối API, B Parent/direct approval, C contract, D address routing, E insertion, F disable/empty, G cancellation, H school location, I global parking cuối, J automatic expiry/regression. Mỗi ca có actor/thao tác/expected; dataset chỉ là nhãn cho records PO chọn, không agent tạo fixture. Tách SCHEDULED chưa Ready/điểm danh, Ready, có điểm danh, IN_PROGRESS, COMPLETED, CANCELLED.

Source cho thấy các rủi ro cần thử trước:
- S1: EditSchoolModal/API client gửi PUT /schools/:id; SchoolsController không thấy route PUT tương ứng, chỉ PATCH location/contract. Lưu trường có nguy cơ 404.
- S2: Insertion frontend đọc candidatePairs/isFeasible/returnRoute và confirm gửi expected versions; backend trả pairs/feasible/return, confirm yêu cầu previewToken. Chưa thấy mapping trong API client; có thể lỗi ngay mở modal/confirm.
- S3: Address preview frontend đọc overallFeasibility và count khác shape Backend allFeasible/scheduledTripsToRefreshCount/frozenTripsCount; trạng thái/buttons dễ lệch.
- S4: previewAddressRouting source kiểm capacity/coords, ước lượng delta hình học, giữ old polyline; REOPTIMIZED branch chỉ update RouteStop coords, chưa thấy commit line/snapshot Trip mới. Insertion dùng metresBetween và tốc độ cố định, chưa phải VietMap VRP theo scope. Không PASS routing chỉ vì badge FEASIBLE.
- S5: reconcileExpiredContracts search toàn api/src hiện chỉ thấy declaration, chưa thấy cron/caller kích hoạt. Cần quan sát automatic expiry, không suy từ có method.
- S6: Settings chưa thấy School tab cho School Admin; nav Schools chỉ System Admin, cần kiểm lối vào đổi trường mình thực sự.

Đây là targeted findings để định hướng checklist, không phải full audit tất cả luồng/concurrency.

## 5. Implementation Details
No application code changes. Tạo school-route-lifecycle-ui-uat-checklist.md, cập nhật LATEST.md/LATEST.diff. Báo cáo/diff Antigravity nguyên bản được archive tại history/2026-10-26-152206-before-lifecycle-ui-uat-checklist.md/.diff. Không sửa các lỗi source tìm thấy.

## 6. Database Changes
None. Migration 20261026061750_add_lifecycle_and_route_snapshots là thông tin trong báo cáo Antigravity; chưa kiểm trạng thái apply/drift trực tiếp trong task này. Không query/ghi DB hoặc tạo data test.

## 7. API & Swagger Changes
None implemented. Đã đối chiếu controller/client/DTO contracts để ghi smoke cases, không gọi API. Báo cáo ghi GET preview ở đường dẫn không khớp source POST /system-admin/update-requests/:id/routing-preview; checklist theo hành vi UI/source thật. Swagger live chưa xác minh lại trong task này, không coi báo cáo Swagger là chứng minh endpoint mutations đúng.

## 8. UI/UX Changes
None implemented. Checklist chỉ đường vào hiện có và lối vào kỳ vọng bị thiếu; includes School settings, modal edit/impact, requests, insertion, disable, route cancellation và Mobile Parent list/detail. Có trường ghi screenshots/video/IDs/trạng thái trước-sau. Đổi bãi cuối vì hủy toàn hệ thống, không thể phục hồi plan bằng đổi lại tọa độ.

## 9. Verification & Testing
Đã đọc LATEST/diff đầu file, snapshot resolver, service/controller/DTO về lifecycle/address/insertion/disable/school/settings, Web API client/types/nav/modals và các entry points liên quan. Git status trước task: 257 entries. Đếm checklist: 67 ca, tất cả unchecked; LATEST đủ 13 mục. Không chạy tsc/tests/build hoặc UI/browser, không request provider/OTP/DB. Các số 354 API/77 Web tests/typecheck PASS thuộc báo cáo Antigravity, không phải kết quả mới của Codex. Toàn bộ UI cases: NOT_VERIFIED. Ca có side effects agent chưa có scope thực thi, Test Data Policy giữ nguyên.

## 10. Issues & Risks
Kiểm tra UI/API cơ bản trước khi test destructive để tránh nhiều ca bị chặn bởi cùng lỗi nối dữ liệu. UI không chứng minh đầy đủ real provider constraints, row locks, token ownership/TTL, DB migration hoặc atomicity. Các ca preview và mutation do PO tự chọn dữ liệu/môi trường/quota phù hợp; checklist không là quyền agent ghi dữ liệu/gọi trả phí. Chưa đánh dấu bất cứ ca UI nào PASS.

## 11. Reviewer Focus
Expected behavior dựa trên quyết định PO, không hạ tiêu chuẩn theo implementation thiếu. Test matrix bảo vệ frozen Trip, chỉ hủy SCHEDULED theo cascade, scope trường/toàn hệ thống, old vs newly generated Trips, Parent masking và trạng thái/outcome. Findings S1–S6 cần được sửa/giải thích bằng source trước khi claim module hoàn tất.

## 12. Suggested Next Step
PO chạy trước A01–A05 và ghi kết quả/lỗi theo mẫu; chỉ tiếp tục ca phụ thuộc sau khi đường UI/API cơ bản hoạt động.

## 13. Approval Status
Checklist hoàn tất để PO kiểm thử thủ công. Chưa nghiệm thu implementation và chưa có approval agent thực thi UAT writes. Không tự sửa code hoặc tạo prompt remediation trong task này. STOP-AFTER-TASK.
