# AI Review — Prompt sửa thứ tự điểm dừng và ETA khi thêm học sinh

## 1. Task Information
Ngày 26/10/2026 (Asia/Saigon). Scope Documentation. Type Implementation handoff prompt. Status COMPLETED đối với soạn prompt, không phải sửa ứng dụng.

## 2. Original Request
PO yêu cầu prompt sửa sau phân tích học sinh mới đứng sai vị trí; ảnh chiều đi trước bãi, chiều về giờ không theo thứ tự.

## 3. Approved Scope
Soạn prompt cho Antigravity thực thi sửa insertion order/geometry/ETA. Codex không implement code/DB trong task này. Các quyết định hai tiêu chí, Route-only và preservation giữ nguyên.

## 4. Analysis & Decisions
Prompt dựa trên source review trước: nhầm array index0 với stopOrder1; preview geometry và DB order khác nhau; ETA nội suy theo tỷ lệ số điểm, giữ giờ cũ không đồng bộ. Yêu cầu mảng stops kết quả duy nhất, renumber1..N, leg timing/service thực, neo lịch đúng chiều, cập nhật toàn bộ giờ/metrics và atomic cả hai Routes. Không che lỗi bằng sort UI hoặc chỉ cộng1 vào index. Giữ token ownership/TTL/server revalidation và phân loại provider UNAVAILABLE. Tách dữ liệu Routes đã hỏng để duyệt sửa riêng, không tự repair.

## 5. Implementation Details
No application code changes.
- Mới: student-insertion-stop-order-timing-fix-prompt.md.
- Archive LATEST.md/.diff trước task: history/2026-10-26-231220-before-insertion-stop-order-fix-prompt.md và .diff.
- Cập nhật LATEST.md/LATEST.diff docs-only.

## 6. Database Changes
None. Không truy vấn hoặc ghi DB/migration. Prompt không cho tự sửa dữ liệu đã bị lưu sai, không schema mới.

## 7. API & Swagger Changes
None trong task soạn prompt. Antigravity phải đồng bộ nếu bổ sung preview stops/timing DTO và kiểm chứng Swagger sau sửa.

## 8. UI/UX Changes
None. Prompt giữ layout, đồng bộ thứ tự/map/ETA từ server, không sort theo giờ để che lỗi.

## 9. Verification & Testing
Đã đọc báo cáo phân tích LATEST và kiểm tra git status (278 entries), tạo/kiểm tra tài liệu. Không chạy typecheck/tests/build do không thay application code; không lặp lại claim PASS cũ. Không thực hiện API/UI mutations hay VietMap calls. Runtime sau sửa NOT_VERIFIED; kiểm thử nghiệp vụ có ghi chưa có phạm vi, BLOCKED_BY_TEST_DATA_POLICY.

## 10. Issues & Risks
Sửa code không tự khôi phục Routes đã lưu order/ETA sai. Provider tổng duration hiện chưa cung cấp đủ ETA từng chặng, cần adapter phù hợp và giới hạn call rõ ràng; không giả precision. Không tự thay đổi Trip cũ.

## 11. Reviewer Focus
Canonical stop array; base0/base1; endpoint invariants; leg/service timing và schedule anchors; preview-commit consistency; concurrency/idempotency; legacy snapshots; xác nhận kết quả thật so với fallback đường thẳng.

## 12. Suggested Next Step
Gửi student-insertion-stop-order-timing-fix-prompt.md cho Antigravity triển khai.

## 13. Approval Status
Prompt được soạn theo yêu cầu PO. WAITING FOR USER REVIEW / APPROVAL đối với bàn giao; không tự triển khai. STOP AFTER TASK.
