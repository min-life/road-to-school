# AI Review — Prompt triển khai vòng đời phương án và thay đổi phân tuyến

## 1. Task Information
Date: 26/10/2026 (Asia/Saigon). Scope phiên này: Documentation / Implementation Handoff. Type: Prompt Preparation. Status: COMPLETED. Không application implementation trong phiên Codex này.

## 2. Original Request
PO yêu cầu tạo prompt để Antigravity thực thi các phương án đã chốt; những vấn đề PO không đề cập được chốt theo đề xuất. Trước đó PO nhấn mạnh đổi vị trí bãi vẫn phải hủy phương án hàng loạt.

## 3. Approved Scope
Ghi nhận phê duyệt do PO cung cấp cho thiết kế DB/API/wireframe và các đề xuất còn lại, soạn prompt triển khai toàn scope API/DB/Web/Mobile/Documentation. Codex chỉ sửa docs, không tự implement/migrate/UAT. Các đề xuất được chốt gồm cùng RoutePlan cho cặp tuyến, tuyến rỗng giữ lịch sử/ngưng sinh/hủy Trip rỗng chưa chốt vận hành và release holds tương ứng, Parent creator hủy PENDING không OTP, snapshot/exclusion/constraints overrides.

## 4. Analysis & Decisions
Prompt yêu cầu snapshot/active-roster/resolver trước thay Route; giữ IN_PROGRESS/lịch sử và Trip đã Ready/điểm danh khi thay đổi học sinh. Hủy plan/expiry/đổi vị trí có cascade riêng hủy SCHEDULED, không áp nhầm guard student để bỏ hủy hàng loạt.

Đổi bãi chỉ System Admin, hủy mọi DRAFT/ACTIVE toàn hệ thống và SCHEDULED liên quan; vị trí trường hai admin đúng scope, chỉ trường đó. Cancel/expired giải phóng future reservation nhưng Trip đang chạy còn occupancy thực. Contract sửa/gia hạn chỉ không còn DRAFT/ACTIVE, start mới >= hôm nay VN, terminal không revive.

Địa điểm: chưa tuyến hai admin duyệt, có tuyến chỉ System Admin; Parent cancel có CAS. Preview tất cả Route/Trip cần thiết, strict feasibility giữ mọi học sinh khác, phân biệt provider unavailable và infeasible, không fallback giả. Parent nhận outcome rõ. Insertion hai chiều cùng plan chỉ đổi Route, mọi Trip đã sinh giữ nghiệp vụ cũ; không retro-add học sinh ở lần đồng bộ khác tới sau.

Không còn yêu cầu hỏi lại các lựa chọn đã đề xuất trong thiết kế; chỉ hỏi quyết định mới thực sự ngoài scope. Không suy phê duyệt code thành quyền seed/backfill/test mutation/paid routing/dependency mới.

## 5. Implementation Details
No application code changes. Tạo school-route-lifecycle-implementation-prompt.md; cập nhật school-route-lifecycle-student-change-design.md, LATEST.md/LATEST.diff. Archive trước thay đổi tại history/2026-10-26-130727-before-school-route-implementation-prompt.md/.diff/.plan.md. Không gửi IDE hoặc thực thi prompt.

## 6. Database Changes
None applied. Prompt bàn giao additive enums EXPIRED/CANCELLED, nullable Trip.routeSnapshot, StudentUpdateRequest.resolution, Route.routingConstraints và TripAttendance exclusion fields; reuse audit/JSON plan, không bảng mới. DDL migration/Prisma generation vào development sau xác minh target/status/drift được mô tả trong scope implementation. Không migration DML hoặc backfill hàng loạt; capture legacy snapshot nằm trong transaction nghiệp vụ người dùng xác nhận, không agent tự gọi để test.

## 7. API & Swagger Changes
None implemented. Prompt bao phủ impact/cancel plan, school settings/location/contract, parking cascade, parent cancel, request routing preview/approve outcomes, disable và insertion options/preview/confirm. Đồng bộ endpoint cũ để chống bypass, đúng role/scope, CAS/lock và Swagger live UI/JSON. Không mở quyền System Admin duyệt DRAFT → ACTIVE.

## 8. UI/UX Changes
None implemented. Ghi nhận PO chốt các draft cấu trúc Settings/modal impact, kiểm tra route trước-sau, Parent outcomes/cancel và màn thêm vào hai tuyến. Tái sử dụng components, brand tokens và Minimal UI Copy. Prompt không xin duyệt lại từng phase đã chốt.

## 9. Verification & Testing
Đã đọc lại LATEST và phần thiết kế liên quan; git status cuối đầu việc thiết kế/prompt ghi nhận 220 entries trước cập nhật tài liệu phiên prompt. Rà soát prompt bao phủ quyết định cuối, đủ ranh giới SCHEDULED/Ready/IN_PROGRESS, migration/test-policy, outcomes và task diff thực. Kiểm tra báo cáo đủ 13 mục. Không chạy tsc/build/unit tests do chỉ sửa docs, không gọi DB/API/VietMap/OTP. Runtime module này chưa implement: NOT_VERIFIED; UAT side effects BLOCKED_BY_TEST_DATA_POLICY khi chưa có scope cụ thể.

## 10. Issues & Risks
Khối lượng tích hợp lớn do Trip dùng live Route trước đây; chỉ thêm snapshot field mà không chuyển consumers/navigation/privacy không đủ. Resource occupancy, frozen roster, Route rỗng và preview/expiry/generation races cần kiểm chứng thật khi implement. Cron/startup reconciliation phải được kiểm soát khi verification để không chạy business mutations chỉ nhằm test. Console/mocks không thay actual provider/UAT evidence.

## 11. Reviewer Focus
Bulk cancellation bãi thực sự toàn hệ thống và atomic; giữ actual running resource occupancy; Trip snapshot/IDs/fingerprint không đổi theo nguồn; guard student Ready không bị nhầm với cascade plan; insertion không sửa Trip cũ; provider errors không thành infeasible; tests gọi production logic, task diff không dấu .../pseudo-diff hoặc gộp work cũ.

## 12. Suggested Next Step
PO chuyển school-route-lifecycle-implementation-prompt.md cho Antigravity thực thi.

## 13. Approval Status
PO đã cung cấp phê duyệt “vấn đề tôi không đề cập tới là chốt theo đề xuất” trong hội thoại; agent ghi nhận, không tự cấp approval. Prompt hoàn tất, implementation chưa chạy trong phiên này. Kết quả bàn giao chờ PO review. STOP-AFTER-TASK.
