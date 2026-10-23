# RoadToSchool — AI Review Report

## 1. Task Information
- **Task Name**: Add Mandatory AI Review Report Rule & Setup Review Governance
- **Date**: 2026-10-22
- **Project Scope**: Documentation & Agent Rules
- **Task Type**: Rule Setup & Governance
- **Status**: WAITING_APPROVAL

## 2. Original Request
Bổ sung quy tắc "Mandatory AI Review Report Rule" vào `docs/WORKING_RULES.md` và project-level agent instructions (`AGENTS.md`) của RoadToSchool.
Khởi tạo cấu trúc thư mục `docs/ai-review/` và tạo file `LATEST.md` ghi nhận việc thiết lập quy tắc này.
Yêu cầu bắt buộc từ nay trở đi, sau mỗi lần trả lời có nội dung thực chất (phân tích nghiệp vụ, thiết kế kỹ thuật, lập kế hoạch, viết code, sửa lỗi, kiểm thử), Agent phải lưu báo cáo đầy đủ 13 mục vào `docs/ai-review/LATEST.md` (kèm `LATEST.diff` nếu có thay đổi code) để phục vụ việc kiểm tra của AI Reviewer độc lập.

## 3. Approved Scope
- Cập nhật [docs/WORKING_RULES.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/WORKING_RULES.md) bổ sung Mục 5 "Mandatory AI Review Report Rule".
- Cập nhật [AGENTS.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/AGENTS.md) tại thư mục gốc workspace để ràng buộc hành vi của mọi phiên Agent tiếp theo.
- Tạo thư mục `docs/ai-review/` và thư mục con `docs/ai-review/history/`.
- Tạo `docs/ai-review/LATEST.md` và `docs/ai-review/LATEST.diff`.
- Lưu bản sao lịch sử tại `docs/ai-review/history/2026-10-22-1347-mandatory-ai-review-rule.md`.
- Giới hạn: Không sửa application code của API, Web, hay Mobile; không thay đổi Database, không chạy migration, không cài dependencies.

## 4. Analysis & Decisions
- **Mục tiêu quy tắc**: Cung cấp một cơ chế bàn giao và đối soát khách quan, chuẩn hóa cho AI Reviewer độc lập. Mỗi báo cáo lưu trữ độc lập trên file hệ thống giúp kiểm tra chéo toàn bộ quyết định kỹ thuật, ngữ cảnh nghiệp vụ, diff code thực tế và kết quả test mà không phụ thuộc vào bộ nhớ ngữ cảnh ngắn hạn của đoạn chat.
- **Cấu trúc lưu trữ**:
  - `docs/ai-review/LATEST.md`: File báo cáo chính, được cập nhật đè sau mỗi task/phản hồi thực chất.
  - `docs/ai-review/LATEST.diff`: Chứa git diff của task có code changes. Nếu task chỉ là phân tích/tài liệu, file này ghi rõ không có code changes để tránh nhầm lẫn.
  - `docs/ai-review/history/`: Lưu bản sao theo mốc quan trọng `YYYY-MM-DD-HHMM-task-name.md` để theo dõi tiến trình dự án theo thời gian.
- **Quy tắc phản hồi Chat**: Để tránh spam văn bản dài trong cửa sổ làm việc của người dùng, phản hồi chat chỉ tóm tắt ngắn gọn trạng thái, các điểm then chốt và dẫn link trực tiếp đến file báo cáo.

## 5. Implementation Details
- **Files Modified**:
  - `docs/WORKING_RULES.md`: Thêm Mục 5 chi tiết hóa mục tiêu, vị trí lưu trữ, cấu trúc 13 mục bắt buộc, nguyên tắc git diff, quy tắc viết file và định dạng chat.
  - `AGENTS.md`: Bổ sung điều 7 quy định bắt buộc lưu báo cáo trước khi chat và điều chỉnh điều 8 về quy trình dừng sau mỗi task.
- **Files Created**:
  - `docs/ai-review/LATEST.md`: File báo cáo hiện tại.
  - `docs/ai-review/LATEST.diff`: Ghi nhận không có thay đổi mã nguồn ứng dụng.
  - `docs/ai-review/history/2026-10-22-1347-mandatory-ai-review-rule.md`: Bản sao lưu trữ mốc thiết lập quy tắc.
- **Application Code Changes**: `No application code changes.`

## 6. Database Changes
`None`

## 7. API & Swagger Changes
`None`

## 8. UI/UX Changes
`None`

## 9. Verification & Testing
- Đã đọc lại `docs/WORKING_RULES.md` xác nhận Mục 5 đã được tích hợp chuẩn xác: **PASS**.
- Đã đọc lại `AGENTS.md` xác nhận quy tắc đã được đưa vào chỉ dẫn thường trực của Agent: **PASS**.
- Đã kiểm tra sự tồn tại của thư mục `docs/ai-review/` và các file liên quan: **PASS**.

## 10. Issues & Risks
`None identified`

## 11. Reviewer Focus
- Kiểm tra tính đầy đủ và logic của 13 mục trong cấu trúc báo cáo.
- Kiểm tra tính nhất quán giữa quy tắc trong `docs/WORKING_RULES.md` và chỉ dẫn thực thi tại `AGENTS.md`.
- Xác nhận các nguyên tắc bảo mật (không đưa mật khẩu, token, secrets, nội dung file `.env` vào diff và báo cáo) đã được quy định rõ ràng.

## 12. Suggested Next Step
Chờ người dùng và AI Reviewer độc lập xem xét, phê duyệt quy tắc báo cáo này cùng các phân tích nghiệp vụ Stage A (Phase 1 Authentication) trước đó; sau đó chuyển sang thực hiện **Phase 1 — Stage B: Technical Design & Auth Wireframes**.

## 13. Approval Status
`WAITING FOR USER REVIEW / APPROVAL`
