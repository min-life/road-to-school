# AI Review — F04-A và F08-A, 07/11/2026

## 1. Trạng thái
Đã hoàn tất source F01–F10 theo master plan AA và các quyết định PO. UAT nghiệp vụ còn mở.

## 2. Yêu cầu
PO chọn phương án A cho F04 và F08. Reopen dựng lại dữ liệu chuẩn bị có audit. Chuyến Ready giữ giờ khi ngày vẫn có dịch vụ.

## 3. Nguồn
Master plan AA5/AA6, báo cáo trước bản vá và các helper sinh chuyến, lịch và frozen hiện hành. Mốc triển khai trước lưu trong history/2026-11-07-f01-f10-before-f04-f08.md.

## 4. F04 chuẩn bị lại chuyến
Reopen dùng chung helper với generator. Đọc Route, điểm dừng, roster và lịch trong transaction dưới khóa. Kiểm ngày phục vụ sau ngày duyệt và thời điểm xuất phát cũ/mới. Nguồn lực được kiểm theo timing và roster hiện hành.

## 5. F04 roster và audit
Thêm trẻ mới, loại trẻ rời roster bằng dấu excluded, đặt lại điểm danh chuẩn bị và giữ báo nghỉ RECORDED cho trẻ còn thuộc chuyến. Giữ dấu đánh nghỉ tương thích với cơ chế rút báo nghỉ. operationAudit lưu roster, snapshot, timing và nguồn lực trước–sau cùng thông tin hủy. Giữ tripId.

## 6. F08 frozen
Hàm tính timing kiểm isTripFrozen. Ready lưu timing hiệu lực trước khi đóng băng. Khi ngày mất dịch vụ, vòng đời vẫn xử lý Ready-only và chốt hành chính theo ma trận hiện có.

## 7. API và Swagger
Giữ endpoint, body và response runtime của reopen/Ready. Swagger mô tả lại thành công và lỗi 409 của reopen. HTTP docs/JSON 200 và schema 200 cùng mô tả 409 đã kiểm.

## 8. Database
Dùng các bảng, trường và audit JSON hiện có. DB local có 19 migrations theo lần xác minh trước.

## 9. Kiểm chứng
API typecheck và build đạt. Lint trips.service.ts và trip-schedule-view.ts đạt. git diff --check đạt. Swagger kiểm bằng metadata HTTP. Giới hạn kiểm chứng của PO được giữ, gồm yêu cầu không chạy script test.

## 10. Giới hạn
Nghiệm thu nghiệp vụ và đồng thời trên dữ liệu được cấp vẫn chờ. Kịch bản cần kiểm gồm đổi bãi rồi reopen, bảo toàn báo nghỉ, giữ giờ Ready-only và mất ngày phục vụ.

## 11. Files
Trips service và controller, trip-schedule-view, FE guide, master plan AA15, tracker, CURRENT_STATE, LATEST và patch API tích lũy.

## 12. Theo dõi
AA15 ghi quyết định và trạng thái thực hiện. Các câu chờ quyết định ở phần AA trước đó thuộc mốc lịch sử.

## 13. Bước tiếp theo
FE nghiệm thu reopen và Ready trên dữ liệu đã được cấp, sau đó cập nhật trạng thái UAT.
