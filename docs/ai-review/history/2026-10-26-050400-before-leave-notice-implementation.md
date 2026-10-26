# AI Review — Prompt triển khai Báo nghỉ đã được PO đồng ý

## 1. Task Information
Date: 26/10/2026 (Asia/Saigon). Scope thực hiện phiên này: Documentation. Type: Design Handoff / Prompt. Status: COMPLETED. Chưa implement application code.

## 2. Original Request
PO đồng ý phương án Chờ phân công tính riêng, tất cả Parent còn liên kết xem nhưng chỉ creator hủy; SMS tạm qua console; staff có email/SĐT nào thì gửi kênh đó, có cả hai gửi cả hai; lý do hủy chuyến bắt buộc. PO đồng ý các phần DB/API/wireframe còn lại và yêu cầu tạo prompt để Antigravity thực thi.

## 3. Approved Scope
Ghi nhận phê duyệt do PO cung cấp, cập nhật plan và soạn prompt implementation Backend/DB/Web/Mobile/Documentation. Codex chỉ chuẩn bị tài liệu trong phiên này, không tự triển khai. Additive DDL/Prisma generation cần thiết thuộc scope bàn giao; không seed/backfill/UAT mutation hoặc dependency mới.

## 4. Analysis & Decisions
Giữ TripStatus SCHEDULED; assignmentStatus tính từ staff notice pending và server chặn Start. Notice gắn Trip thật, loại VIRTUAL, không sinh Trip. Creator-only cancel, Parent còn liên kết đều xem. Ready chiều về chặn tạo cho mọi đối tượng; guard hủy Parent/Driver không tự mở rộng theo Ready.

OTP staff fan-out theo account hiện tại, không theo riêng cách đăng nhập: email-only/phone-only/both. Một challenge/code gửi tới mọi kênh tương ứng, verify một lần; SMS console tạm thời, email dùng cấu hình hiện có. Không thêm provider/BOTH enum/bảng giao vận. Kiểm soát partial failure/resend và không giả báo gửi thật. Student tiếp tục guardianPhone. Hủy Trip bắt buộc reason/audit, không khôi phục.

## 5. Implementation Details
No application code changes. Cập nhật leave-notice-business-architecture-plan.md, tạo leave-notice-implementation-prompt.md, cập nhật LATEST.md/LATEST.diff. Báo cáo trước archive tại history/2026-10-26-041440-before-leave-implementation-prompt.md và .diff. Giữ nguyên công việc có sẵn.

## 6. Database Changes
None applied. Prompt bàn giao một bảng LeaveNotice/tripId thật bắt buộc, purpose OTP, nullable cancelledAt/cancelledById; minimal indexes/constraints. Chỉ additive DDL vào development đang cấu hình sau xác minh target/drift. Không DML/backfill/seed hoặc tạo Trip từ luồng báo nghỉ.

## 7. API & Swagger Changes
None implemented. Prompt bao phủ options/otp/confirm/list/detail/cancel/candidates/assign-replacement/cancel-trip và action flags; server quyết định OTP channels, creator-only cancel, authorization/transactions. Antigravity phải đồng bộ và kiểm chứng Swagger UI/JSON, không gọi mutation để test khi chưa có phạm vi UAT.

## 8. UI/UX Changes
None implemented. Ghi nhận PO đồng ý wireframe tiện ích/card/lịch sử/form/OTP/Student Detail và admin tab/modal. OTP thể hiện đích mask, trạng thái console/thất bại đúng thực tế. Không xin duyệt lại cấu trúc đã có; giữ Minimal UI Copy, brand tokens, refresh hiện có.

## 9. Verification & Testing
Đã đọc AGENTS và tài liệu theo thứ tự bắt buộc; kiểm tra git status (193 entries trước chỉnh sửa phiên này), rà soát prompt/plan. Chỉ thay docs; không chạy tsc/build/unit/runtime tests, không kết nối DB hoặc gửi OTP. NOT_VERIFIED đối với chức năng chưa implement. Prompt yêu cầu static/pure checks và giữ BLOCKED_BY_TEST_DATA_POLICY cho runtime có side effects chưa được cấp quyền.

## 10. Issues & Risks
SMS console không phải SMS delivery thật hoặc readiness production. Email phụ thuộc config hiện có; fan-out có thể partial failure cần thể hiện trung thực. Attempts/consume atomicity, concurrent Start/Ready/assignment, attendance restore và double booking vẫn phải được kiểm chứng khi implement. Không còn câu hỏi nghiệp vụ tồn đọng trong scope đã chốt; UAT cần quyền/môi trường/dữ liệu cụ thể.

## 11. Reviewer Focus
Không bỏ bớt kênh OTP khi account có cả hai; không log OTP ngoài console mode được phép hoặc leak qua API. Không sinh Trip, không cho Parent khác hủy, không bypass pending notices bằng API assignment cũ. Giữ task diff riêng và không lẫn quyền schema với quyền test ghi dữ liệu.

## 12. Suggested Next Step
PO chuyển prompt tại leave-notice-implementation-prompt.md cho Antigravity triển khai.

## 13. Approval Status
Phê duyệt thiết kế và yêu cầu prompt triển khai được PO cung cấp trong hội thoại ngày 26/10/2026; agent không tự cấp approval. Prompt đã soạn xong; chưa gửi IDE hoặc thực thi code. Kết quả bàn giao chờ PO review. STOP-AFTER-TASK.
