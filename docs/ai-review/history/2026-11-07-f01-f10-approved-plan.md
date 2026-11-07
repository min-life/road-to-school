# AI Review — Kế hoạch sửa F01–F10, 06/11/2026

## 1. Tổng quan

PLAN_DRAFT / AWAITING_PO_APPROVAL. Đã lập kế hoạch đầy đủ tại master plan mụcAA, chưa sửa code/schema/API/DB.

## 2. Yêu cầu gốc

PO yêu cầu “lên plan chỉnh sửa” sau báo cáo10phát hiện. Chế độ PLANNING, không tự chuyển sang implementation. Quy tắc giữ payload/field phân vân phải hỏi, không script test vẫn hiệu lực.

## 3. Nguồn và phạm vi

Đọc tài liệu theo AGENTS; kiểm git status và source liên quan confirm/snapshot/availability/timing. F01–F10 từ báo cáo review đã lưu history/2026-11-06-f01-f10-review-before-fix-plan.md, không xóa bằng chứng khi LATEST đổi mốc.

## 4. Thiết kế sửa chính

F01 membership dùng chung ở preview/confirm/readiness; F02 phiên bản preview nội bộ, kiểm nguồn/xe dưới khóa; F03 tải/tính Trip trong transaction, không ghi cache trước khóa; F04 activation và snapshot hiện hành theo lựa chọn PO; F05 serviceDay thay weeklySchedule quyết định hủy; F06 kiểm bàn giao cả Route và Trip; F07 virtual dùng chung gate bãi; F08 phân biệt frozen timing và lifecycle; F09 schema response đúng runtime; F10 docs/current state và tracking có bằng chứng.

## 5. Quyết định đang chờ

Đã hỏi PO hai vấn đề: F04 rebuild snapshot/roster/timing với audit trước–sau trong operationAudit sẵn có (đề xuất) hay409nếu khác, kèm hệ quả unique Route–ngày; F08 giữ giờ/snapshot Trip frozen khi chỉ đổi giờ nhưng vẫn có dịch vụ, giữ ma trận lifecycle khi mất dịch vụ. Chưa có trả lời thì không chốt thay PO hoặc triển khai phần phụ thuộc.

## 6. Database

Dự kiến không thêm bảng/cột/index/migration, giữ19migrations đã apply. Dùng operationAudit có sẵn chỉ nếu PO duyệt cách rebuild/audit. Không tự backfill hoặc sửa/hủy plan/trip có dữ liệu sai từ trước.

## 7. API/Swagger và FE

Giữ URL/body/response cũ. Không thêm field confirm fingerprint bắt buộc, version preview giữ phía BE.409cho membership/dữ liệu cũ/nguồn lực; token không còn hợp lệ giữ404cũ. F09 thêm DTO/schema nội bộ, không wrapper hoặc field runtime mới. Bàn giao phải note FE ngắn trực tiếp trong chat.

## 8. UI/UX

Không sửa Web/Mobile hoặc màn hình; wireframe không áp dụng. Filter địa giới vẫn lựa chọn tường minh, không dùng thay eligibility/không tự xóa selection.

## 9. Verification của lượt lập plan

Chỉ đọc source/docs và diff, không sửa application code nên không chạy lại typecheck/build hay Swagger runtime. Không script test/provider/DB mutation/seed. Plan có ma trận13case nghiệm thu và static checks sau triển khai; UAT chưa có quyền/dữ liệu phải ghi NOT_VERIFIED.

## 10. Phụ thuộc/rủi ro

F03/F04 cần dùng chung logic chuẩn bị để tránh lệch; F05/F08 không dùng guard frozen thay toàn bộ policy admin-finalization; F06 kiểm tập trạng thái sau bàn giao thay từng Trip đơn lẻ. Reopen rebuild cần giữ lịch sử/audit/notice và kiểm giờ mới, không làm mất dấu nhận trẻ. Không hứa hết lỗi runtime từ kiểm kiểu.

## 11. Files dự kiến

Routes service/resource-availability và helper eligibility; Trips service/shared preparation/snapshot/availability; schools contract-lifecycle/trip-schedule-view; drivers/vehicles/school employee handover; controllers/response DTO; FE guide/tracker/CURRENT_STATE/master plan/LATEST. Tên helper nội bộ chỉ khi thực sự cần, không thêm framework/package. Files thực đổi lượt này: master planAA, LATEST và archive report.

## 12. Trình tự và một bước tiếp theo

6đợt: membership/preview → generation/reopen → calendar/frozen → handover → virtual → Swagger/docs, đồng bộ docs mỗi đợt. Bước tiếp theo duy nhất: PO duyệt plan và hai lựa chọn F04/F08 trước khi ra lệnh triển khai.

## 13. Trạng thái bàn giao

PLAN_DRAFT / FIELD_BEHAVIOR_DECISIONS_PENDING / NO_CODE_CHANGE. LATEST.diff giữ patch tích lũy task trước, lượt này không có code diff mới. Không commit/push/migrate/env. Dừng sau trình bày plan, chờ PO.
