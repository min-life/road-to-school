# AI Review — Nút Báo nghỉ trong card không hiển thị

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Mobile/API analysis / local DB readonly / Documentation. Type: Analysis. Status: COMPLETED.

## 2. Original Request
PO hỏi vì sao nút Báo nghỉ dưới Theo dõi lộ trình trong card bị bỏ.

## 3. Approved Scope
Kiểm tra và giải thích nguyên nhân; chưa có yêu cầu thay logic/nút. Không sửa app/backend/config hoặc ghi DB, không commit/push.

## 4. Analysis & Decisions
Nút Báo nghỉ chuyến này vẫn có trong mobile/app/(tabs)/index.tsx ngay sau Theo dõi lộ trình, render bằng card.canReportLeave && (...). Callback triggerQuickLeaveNotice, payload, disabled isRequesting và OTP flow vẫn còn. Không có thay đổi xóa nút. Backend getParentHomeCards cho canReportLeave khi không activeNotice (RECORDED/PENDING_REPLACEMENT), status SCHEDULED, actualStartTimeNULL và chiều về chưa attendantReadyAt. Khi đổi status IN_PROGRESS, canReportLeave false và frontend ẩn nút theo điều kiện hiện hữu.
Kiểm tra actual local DB bằng SELECT read-only theo cấu hình api/.env: chuyến ưu tiên cho cả2 con là599eb163-94fc-4c4c-9d17-d1f274ae177e, TO_PARKING/IN_PROGRESS, actual_start_time có, attendant_ready_atNULL, không activeNotice; can_report_leave tính theo code=false. Do đó nguyên nhân xác định trên dữ liệu local là chuyến đã khởi hành, không phải nút bị xóa trong task bỏ tag điểm danh. Chưa xác minh authenticated payload trên điện thoại có cùng môi trường/account.

## 5. Implementation Details
No application code changes. Chỉ LATEST.md/LATEST.diff; lưu review trước vào history/2026-10-30-before-leave-button-visibility-analysis.md và .diff. Không sửa nút, permissions, leave flow hoặc các SQL draft trước.

## 6. Database Changes
None. Chỉ SELECT các chuyến/roster của con đã liên kết, điều kiện ngày/priority và cờ activeNotice. Không tạo records, seed, mutation hoặc dữ liệu tạm rollback.

## 7. API & Swagger Changes
None. Đọc getParentHomeCards và quick-leave hook. Không gọi requestLeaveNoticeOtp hoặc mutation. Swagger N/A.

## 8. UI/UX Changes
None. Ghi nhận UX ẩn nút có thể khiến PO hiểu nút đã bị xóa; đề xuất disabled với lý do là tùy chọn chưa triển khai, không thay quyền nghiệp vụ.

## 9. Verification & Testing
PASS: source nút/card.canReportLeave/callback dưới Theo dõi lộ trình còn nguyên. Đối chiếu backend điều kiện canReportLeave và hook OTP.
PASS: psql SELECT thực tế exit0, PGOPTIONS default_transaction_read_only=on và timeout, host loopback, không in credential. Cả2 con: trip ưu tiên TO_PARKING/IN_PROGRESS, has_started=true, attendant_ready=false, has_active_notice=false, can_report_leave=false.
PASS: git diff --check báo cáo.
NOT_VERIFIED: authenticated API response và Expo UI runtime. Không chạy typecheck/build/lint vì không thay application code.

## 10. Issues & Risks
Điều kiện từ Home payload không đồng bộ tức thời với operation polling; có độ trễ refresh8s. SQL đổi status trực tiếp có thể làm nút biến mất dù chưa thực hiện start qua API. Không bật nút khi backend không cho báo nghỉ. Không tuyên bố đã kiểm chứng UI thật từ SELECT.

## 11. Reviewer Focus
Phân biệt nút bị xóa và conditional rendering. Bảo toàn canReportLeave/backend validation; không cho báo nghỉ chuyến đã khởi hành bằng thay UI hoặc dữ liệu giả.

## 12. Suggested Next Step
Cân nhắc giữ nút ở trạng thái vô hiệu hóa kèm lý do chuyến đã khởi hành để người dùng hiểu vì sao không báo nghỉ được; chỉ triển khai khi PO yêu cầu.

## 13. Approval Status
Phân tích theo câu hỏi PO. WAITING FOR USER REVIEW / APPROVAL. Chưa thay đổi UI hoặc database.
