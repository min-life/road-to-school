# AI Review — Đối chiếu backend mới và docs tích hợp mobile

## 1. Task Information
05/11/2026, Asia/Saigon. ANALYSIS và DOCS IMPLEMENTATION. Nhánh dongnnp/mobile/refactor-ui, baseline f075db4. Backend origin/chuongtv/update-be tại41cf3b072cf1430f0f0071add4b131a1bc0fe6d0. Đã hoàn tất báo cáo source và tài liệu chuẩn bị sửa mobile.

## 2. Original Request
PO yêu cầu kiểm tra source mới nhất trên chuongtv/update-be đã cập nhật những gì, bổ sung docs phần mobile để tiến hành sửa.

## 3. Approved Scope
Fetch/đọc lịch sử Git, so sánh backend với mobile hiện tại, đọc controller/DTO/service/schema/migrations và client/screens, cập nhật tài liệu tích hợp/backlog. Việc triển khai mobile tiếp theo được mô tả bằng các nhóm công việc có trạng thái chưa làm trong lượt này. Phạm vi đầu ra là docs local.

## 4. Analysis & Decisions
Sau fetch, backend mới nhất41cf3b0 ngày04/11 là ancestor của HEAD f075db4. Nhánh mobile có19commit riêng và diff api giữa hai cây rỗng. Rà các đợt auth fefe0e6, school de2e301, resource d0b4063 và business41cf3b0. Commit mới nhất có17files api thay đổi. Tập trung khoảng cách giữa backend đã merge và mobile client/UI còn dùng types/assumptions cũ.
Các điểm chính gồm frozen predicate có status/timestamps/attendance, sync unfrozen snapshot/roster, giữ IN_PROGRESS trên Home khi quá giờ, start409 khi trùng tài nguyên/chiều về0PRESENT, cancel sau ready, ba incident types và tọa độ, lifecycle/calendar/adminFinalization, auth OTP503.
Phân tách gap mobile và sáu điểm BE cần chốt. BE-01 incident-options khác createManualIncident, BE-02 canCancelLeave khác cancelNotice, BE-03 start capability khác startTrip/counter active roster, BE-04 vòng đời ba sự cố mới, BE-05 nguồn ghi province, BE-06 guide/Swagger lệch service/DTO. Tài liệu dùng contract source khi có xung đột với FE_INTEGRATION_GUIDE.

## 5. Implementation Details
Tạo docs/architecture/mobile-backend-sync-2026-11-05.md gồm mốc Git, bốn đợt BE, mapping WF04–18, frozen/sync, bảng method/path/payload, enum/threshold, BE dependencies, đính chính guide, backlog M01–M10, file map, migrations và UAT checklist.
Cập nhật mobile-ui-implementation-status.md để liên kết audit và ghi rõ mức tích hợp mobile. Cập nhật mobile-parent-student-journey.md với Home window fix, incident enum gap và audit finalization. Thêm đường tra cứu từ docs/implementation/README.md.
Review trước được lưu nguyên bản tại history/2026-11-05-before-mobile-backend-sync.md/.diff, bao gồm các phần review đã gộp từ nhánh trước. LATEST.diff là diff bốn tài liệu của task hiện tại.

## 6. Database Changes
Đã đọc ba migration school lifecycle/calendar, vehicle/reoptimization, province/incident types để mô tả schema đầu vào. Trạng thái áp dụng trên database local của PO chưa được kiểm chứng. Mọi thao tác trong lượt này thực hiện trên Git/source/docs.

## 7. API & Swagger Changes
Đã đối chiếu controller/DTO/service theo prefix api/v1. Mobile attendance hiện dùng đúng PUT status/absenceReason và alighting riêng. Guide chung có BOARDED/ALIGHTED, incidentType, các endpoint và field khác với source. Những điểm này được đính chính trong docs mobile và BE-06, trạng thái Swagger/runtime cần BE xác minh trên môi trường triển khai.

## 8. UI/UX Changes
Tài liệu chỉ ra các phần sẽ sửa gồm incident labels/filters/selector/GPS, lý do khóa thao tác, finalization audit, lỗi cancel/start, refresh roster/lịch và OTP503. Các nhóm M01–M09 ghi rõ công việc chưa triển khai, M10 là UAT. Thứ tự P0/P1/P2 được đề xuất theo ảnh hưởng và phụ thuộc BE. Phần UI đã có được mô tả làm nền tích hợp.

## 9. Verification & Testing
PASS git fetch origin chuongtv/update-be, ancestry/merge-base và diff api xác định cùng backend tree. PASS Mobile npx --no-install tsc --noEmit exit0 cho baseline hiện tại. PASS545hashes các file tracked api/mobile/web so với đầu task. PASS tất cả relative links trong spec mới, scoped whitespace check và parse patch docs.
Verification chỉ gồm Git/source/static docs. Runtime API, Swagger đang chạy, DB migration status, native iPhone/Android và UAT đa vai trò chưa xác minh. Các kịch bản tạo dữ liệu hoặc thực thi mutation được ghi để PO cấp dữ liệu/quyền theo Test Data Policy. Export/unit suites được giữ ở trạng thái kết quả lịch sử của từng task triển khai trước.
Một lệnh ghi tài liệu dài qua shell bị auto-review chặn. Đã ghi bằng apply_patch và kiểm tra nội dung/liên kết sau đó.

## 10. Issues & Risks
Kiểu TypeScript frontend có thể compile dù runtime backend trả enum mới. Các capability/service chưa đồng bộ tạo rủi ro nút bật rồi submit lỗi. Vòng đời sự cố mới cần BE chốt trước rollout phần ghi. Hướng dẫn FE có lỗi endpoint/field, nguồn quyết định tích hợp là controller/DTO/service. Province nullable cần nguồn dữ liệu cụ thể. Các nhận xét BE là phân tích source, cần kiểm chứng runtime khi sửa tương ứng.

## 11. Reviewer Focus
Kiểm tra mốc branch41cf3b0 đã merge, số liệu19commits và api diff rỗng. Đối chiếu sáu BE dependencies, bảy incident types, năm status thật, undo đúng chiều, frozen đủ điều kiện và parent privacy. Backlog phải phân biệt phần đang có với phần cần code, tránh sửa attendance theo guide sai hoặc bật report mới khi options còn chặn.

## 12. Suggested Next Step
Bắt đầu M-01 để đồng bộ enum/nhãn/fallback sự cố trên mobile, dùng contract đọc đã có và bảng source trong tài liệu mới.

## 13. Approval Status
Đã thực hiện yêu cầu rà soát và cập nhật docs. Tài liệu local chờ PO review để giao task code tiếp theo. Chưa commit/push lượt cập nhật này.
