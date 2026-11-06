# AI Review — Tài liệu implementation hệ thống V2

## 1. Task Information
28/10/2026. Documentation. COMPLETED với giới hạn rà soát tĩnh. Source db02de6; docs chưa commit, giữ cả thay đổi docs từ task trước.
## 2. Original Request
Yêu cầu chi tiết trong attachment: đối chiếu code V2 và viết tài liệu hệ thống/local/API/data/UX/tests/bảo trì bằng tiếng Việt; chỉ docs, không commit/push.
## 3. Approved Scope
Tạo bộ docs theo chủ đề, cập nhật mục lục bàn giao. Không sửa application hoặc V1, không chạy mutation/seed/migration.
## 4. Analysis & Decisions
Kiểm tra manifests, app bootstrap/module, controller declarations, DTO/service references, schema/migrations, route/test/script inventory và config references. Tách catalog source chính xác khỏi mô tả nghiệp vụ và hướng dẫn vận hành; không coi việc file tồn tại là UAT PASS. Chưa review từng nhánh mọi service, không khẳng định hoàn chỉnh toàn bộ behavior ở mức runtime.
## 5. Implementation Details
Thêm docs/implementation/README.md, features.md, local-operations.md, api-catalog.md, data-model.md, environment.md, source-map.md. Catalog API trích method/path từ backend; data-model giữ model/enum/index/relations đúng schema; environment chỉ tên và nơi dùng, không đọc .env. Handoff liên kết bộ mới; giữ docs Mobile UI task trước. Archive LATEST trước task. No application code changes.
## 6. Database Changes
None. Schema chỉ đọc; không kiểm chứng trạng thái apply/drift trên DB live.
## 7. API & Swagger Changes
None. Static catalog không thay Swagger runtime. Request example identifier không có dữ liệu cá nhân; không gửi API.
## 8. UI/UX Changes
None. Dẫn tài liệu UI đã đối chiếu, phân biệt restyle và nghiệp vụ cũ.
## 9. Verification & Testing
PASS: kiểm kê source/controller/schema/migrations/scripts và đối chiếu manifest. PASS: kiểm tra local Markdown links, git diff --check, application diff trống. Các test/bundle/typecheck session trước chỉ được dẫn như lịch sử. Không chạy lại suites, build, migration hoặc live API trong task này. NOT_VERIFIED: thiết bị/browser, auth/OTP delivery, push/GPS, DB live và các luồng nhiều role. Tồn tại tests không đồng nghĩa đã chạy.
## 10. Issues & Risks
Catalog là tham chiếu tĩnh; method-level DTO/guard/service vẫn là nguồn để đọc chi tiết permission/edge cases. Không có chứng nhận API live hoặc production. Tài liệu snapshot cũ còn số model/migration và trạng thái khác; bộ mới chỉ rõ source ưu tiên. Không bịa quyết định thiết kế khi không có bằng chứng.
## 11. Reviewer Focus
Kiểm tra local commands/cwd, tên env, API prefix, phân quyền, snapshot/roster, các cảnh báo script có ghi DB và phân biệt đã code với đã xác minh.
## 12. Suggested Next Step
Đọc docs/implementation/README.md và rà soát runbook local trước khi thực hiện UAT được cấp quyền.
## 13. Approval Status
Tài liệu theo yêu cầu đã tạo. WAITING FOR USER REVIEW / APPROVAL. Không commit/push.
