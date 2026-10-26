# AI Review — Prompt sửa thêm học sinh và tiêu chí tối ưu

## 1. Task Information
- Ngày: 26/10/2026 (Asia/Saigon).
- Scope: Documentation. Type: Analysis / Implementation handoff prompt.
- Status: COMPLETED đối với việc soạn prompt; chưa triển khai sửa ứng dụng.

## 2. Original Request
PO cung cấp ảnh lỗi mở chức năng thêm học sinh vào tuyến và yêu cầu prompt cho Antigravity ghi nhận/sửa. Hai tiêu chí tối ưu phải giống lập phương án: thời gian tối đa tuyến và thời gian chờ/dừng stop. Ảnh thứ hai là màn hình kiểm tra yêu cầu đổi địa chỉ.

## 3. Approved Scope
Codex chỉ kiểm tra source và soạn prompt. Antigravity được chỉ thị sửa hai luồng liên quan, đồng bộ contract và dùng hai tiêu chí đúng. Không tự sửa code, DB, dependency hoặc kiểm thử có side effects trong task soạn prompt này.

## 4. Analysis & Decisions
- Source hiện tại xác nhận API options trả pairs còn Web đọc candidatePairs.length; đây là nguyên nhân phù hợp trực tiếp với ảnh runtime lỗi.
- Web còn đọc student lồng nhau, field thống kê tuyến khác tên, isFeasible/returnRoute/version; API trả dữ liệu phẳng, feasible/return/status/token. Confirm payload Web thiếu previewToken bắt buộc phía API.
- request-detail-modal hiện dùng khoảng cách đi bộ/thời gian đi vòng, khác RoutingConstraintsDto của lập phương án.
- Tiêu chí chuẩn: maxRouteDurationMinutes (phút, tổng driving+service+waiting), defaultStopServiceSeconds (giây). Source hiện min duration 10 phút; default stop 60 giây, khoảng 10–300 giây. Prompt yêu cầu dùng normalization hiện có, giữ overrides/ràng buộc hợp lệ.
- Insertion/address preview vẫn ước lượng khoảng cách/tốc độ hoặc giữ geometry cũ. Prompt yêu cầu áp dụng solver VietMap hiện có và lưu kết quả thực, không sửa label đơn thuần.
- Giới hạn sửa đúng luồng insertion/address; không mở rộng toàn bộ review lifecycle. Giữ Route-only insertion và frozen/legacy Trip snapshot.

## 5. Implementation Details
No application code changes.
- Mới: docs/ai-review/student-insertion-routing-fix-prompt.md — prompt triển khai đầy đủ.
- Archive trước cập nhật: history/2026-10-26-204509-before-student-insertion-fix-prompt.md và .diff.
- Cập nhật: LATEST.md, LATEST.diff (docs-only).

## 6. Database Changes
None. Không kết nối/ghi DB, không migration. Prompt tận dụng schema hiện có và không cho backfill hàng loạt.

## 7. API & Swagger Changes
None trong task này. Đã đối chiếu source DTO/service/Web contract; không gọi API runtime. Prompt bắt buộc Antigravity đồng bộ validation/Swagger và kiểm chứng sau sửa.

## 8. UI/UX Changes
Không sửa UI. Prompt giữ cấu trúc modal hiện có, thay hai ô tiêu chí theo yêu cầu PO; bao gồm sơ đồ bố cục và loading/empty/error/preview invalidation. Không tạo màn hình mới.

## 9. Verification & Testing
- Đã đọc AGENTS, WORKING_RULES, BUSINESS_CONTEXT, handoff/current state và LATEST; kiểm tra git status, bảo vệ working tree có nhiều staged/modified/untracked files.
- Đã đọc DTO insertion/routing-preview/optimize; service options/insertion/address preview, Web modal, types và tham chiếu create-page: đối chiếu tĩnh xác nhận contract mismatch và tiêu chí khác nhau.
- Không chạy typecheck/tests/build vì task chỉ soạn tài liệu; không tái sử dụng kết quả PASS từ task cũ.
- UI sau sửa, provider thực tế, confirm mutation: NOT_VERIFIED; không thực hiện. Kiểm thử ghi dữ liệu chưa có phạm vi cấp, BLOCKED_BY_TEST_DATA_POLICY.

## 10. Issues & Risks
Lỗi ứng dụng vẫn còn cho tới khi Antigravity triển khai. Chỉ optional-chain không giải quyết mismatch xuyên suốt. Solver thật/TTL/fingerprint/legacy snapshot phải được sửa và kiểm chứng phù hợp; không dùng typecheck làm bằng chứng nghiệp vụ hoạt động.

## 11. Reviewer Focus
Contract đầy đủ từ options tới confirm; hai tiêu chí đi tới solver; tổng thời lượng đúng đơn vị; giữ membership và ràng buộc cũ; FEASIBLE/INFEASIBLE/UNAVAILABLE; preview ownership/staleness; insertion Route-only và bảo toàn frozen/history; không mở rộng task.

## 12. Suggested Next Step
Gửi prompt student-insertion-routing-fix-prompt.md cho Antigravity triển khai.

## 13. Approval Status
Prompt được soạn theo yêu cầu PO; WAITING FOR USER REVIEW / APPROVAL đối với tài liệu bàn giao. Không tự triển khai hoặc cấp quyền UAT/provider. STOP AFTER TASK.
