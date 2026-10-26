# AI Review — Danh mục phần còn lại của RoadToSchool v2.0

## 1. Task Information
Date: 26/10/2026 (Asia/Saigon). Scope: Documentation / Business Inventory. Mode: DISCUSSION. Status: COMPLETED. Không xếp ưu tiên hoặc giao implementation.

## 2. Original Request
PO yêu cầu liệt kê các phần còn lại trước khi đề xuất bước tiếp theo.

## 3. Approved Scope
Đối chiếu BUSINESS_CONTEXT, handoff, source/schema và các màn hình hiện có; lập inventory. Không có approval API/UI/schema/dependency hoặc UAT mutation.

## 4. Analysis & Decisions
Đây là danh mục theo context và kiểm tra source có mục tiêu, không phải kết luận mọi mục đều là requirements đã được duyệt hoặc bắt buộc cho MVP. Không xếp thứ tự ưu tiên.

### A. Nghiệp vụ chưa thấy triển khai tương ứng
| Hạng mục | Phần còn lại | Bằng chứng / giới hạn |
|---|---|---|
| Báo nghỉ học sinh | Parent nộp/hủy đơn theo ngày/chiều; xử lý đơn và ảnh hưởng roster/điểm danh | Không thấy LeaveRequest API/UI/model; absenceReason hiện chỉ ghi nhận vắng, StudentUpdateRequest là sửa hồ sơ/địa chỉ |
| Báo nghỉ tài xế | Xin nghỉ ca và xử lý phân công các Trip bị ảnh hưởng | Context có định hướng; chưa có quy trình đơn nghỉ |
| Báo nghỉ Bus Attendant | Xin nghỉ ca, nhà trường xử lý và phân công người thay | Context có định hướng; chưa có quy trình đơn nghỉ |
| Báo cáo và xử lý sự cố | Ghi nhận sự cố trên Trip, tiếp nhận/phân loại/theo dõi xử lý và xác nhận giải quyết | Không thấy Incident module/model/UI; loại sự cố và thông báo cần chốt |
| Báo cáo/thống kê/dashboard | Chuyên cần, chuyến hoàn thành/hủy, đúng giờ và sự cố theo khoảng thời gian/quyền trường | AdminOverviewPage hiện chỉ có tiêu đề, chủ ý để trống theo wireframe cũ; chưa có Reporting module |
| Yêu cầu thay đổi thông tin/cấu hình trường | School Admin gửi yêu cầu, System Admin xử lý theo phân cấp | Context mục3.2; school-requests.controller hiện là Student Update Requests, không phải đơn sửa cấu hình trường |

### B. Có nền tảng nhưng phạm vi còn thiếu hoặc đang deferred
| Hạng mục | Đã có | Phần còn thiếu |
|---|---|---|
| Hủy RoutePlan | SYSTEM_ADMIN hủy DRAFT, có endpoint/service/UI/modal | ACTIVE bị service từ chối; chưa có workflow xử lý Trip đã sinh và giải phóng nguồn lực khi hủy ACTIVE. Handoff cũ nói chưa có hủy nói chung không còn chính xác |
| Điều phối thay thế khẩn cấp | UpdateTripAssignment cho SCHEDULED | Service chặn Trip không SCHEDULED; chưa có luồng đổi xe/Driver/Attendant khi IN_PROGRESS hoặc bàn giao học sinh/lịch sử liên quan |
| ETA thực tế cho Parent | Có plannedArrivalTime và durationSeconds của routing | Chưa thấy ETA động theo vị trí/progress tới từng điểm đón/trả được cung cấp hoàn chỉnh cho Parent; không coi planned ETA là ETA live |

### C. Phạm vi có dấu hiệu kỹ thuật nhưng chưa chốt yêu cầu
- Hủy một Trip riêng: TripStatus có CANCELLED nhưng TripsController chưa có endpoint hủy riêng. Cần PO chốt có triển khai độc lập hay xử lý qua vòng đời RoutePlan; không coi trạng thái enum là approval workflow.
- Thông báo nghiệp vụ: chưa thấy module inbox/push/device-token; OTP notification đã có. Context định hướng thông báo sự cố, nhưng ma trận sự kiện/kênh/người nhận chưa được chốt; không tự mở rộng sang báo mỗi stop hoặc các thông báo đã bị PO loại bỏ.
- Nhập hàng loạt Excel/CSV, lịch nghỉ/học bù, xuất báo cáo chi tiết không được tự coi là phần bắt buộc còn thiếu chỉ vì không thấy source; cần yêu cầu riêng.

### D. Đã có code nhưng cần hoàn tất nghiệm thu / kiểm tra tích hợp
- Hai chiều TO_SCHOOL/TO_PARKING, role scope/privacy, QR trên thiết bị, boarding/alighting và Complete guards.
- Tracking/navigation TEST vs LIVE: foreground GPS thực, resume/retry, nhiều chặng/loop, observer và completed history/gaps. PO đã xác nhận tương đối xong vận hành nhưng không suy ra mọi gate runtime đã PASS.
- Chuyển waypoint100m là navigation cursor, không thay Attendance/Arrival/Complete; cần kiểm tra không chuyển nhầm trên đường vòng/nhánh gần nhau.
- Handoff và reports có snapshot cũ; phải đồng bộ với source và tạo diff thật trước mốc nghiệm thu.
- Build cài được/triển khai môi trường, backup/restore và giám sát thực tế chưa được audit trong task này; trạng thái NOT_VERIFIED, không kết luận chắc chắn chưa có.

Không thuộc backlog bắt buộc hiện tại: đa nhà xe/đa bãi xe, WebSocket/SSE thay polling, background GPS hoặc native navigation SDK. Đây là scope loại trừ/deferred, không tự đưa vào kế hoạch triển khai.

## 5. Implementation Details
No application code changes. Chỉ cập nhật LATEST.md/LATEST.diff; báo cáo trước đã archive theo timestamp với hậu tố before-remaining-scope-inventory.

## 6. Database Changes
None. Đã đọc schema và model inventory; không thêm bảng/field hoặc migration.

## 7. API & Swagger Changes
None. Đã đọc endpoint inventory và service guards; không gọi API ghi hoặc đổi contracts.

## 8. UI/UX Changes
None. Đã đọc admin overview, RoutePlan cancellation action, Mobile tabs và các màn hình hiện có. Explore là placeholder bị ẩn, không coi là feature bắt buộc chưa làm.

## 9. Verification & Testing
PASS: read-only rg/files/source/schema checks. Xác nhận cancelRoutePlan DRAFT có implementation; ACTIVE bị chặn. UpdateTripAssignment chỉ SCHEDULED. Admin overview trống theo quyết định wireframe cũ. Context Leave/Incident/Reporting chưa thấy module tương ứng.

NOT_VERIFIED: runtime toàn dự án, LIVE device GPS, dynamic ETA hoàn chỉnh, production deployment/backup. Không chạy tests/typecheck do không sửa code; không lấy số tests lịch sử làm kết quả mới. Không mutation/seed/paid API calls.

## 10. Issues & Risks
Không đồng nhất định hướng BUSINESS_CONTEXT với approval triển khai. Không đồng nhất absenceReason với đơn xin nghỉ, StudentUpdateRequest với yêu cầu sửa trường, plannedArrivalTime với ETA live. Không dùng tài liệu hủy RoutePlan cũ để nói DRAFT chưa có chức năng hủy.

## 11. Reviewer Focus
Kiểm tra độ đầy đủ inventory theo15miền nghiệp vụ; phân biệt chưa có, một phần/deferred, chưa chốt và chưa nghiệm thu. Tránh thêm requirements ngoài scope hoặc xếp ưu tiên thay PO.

## 12. Suggested Next Step
Theo chỉ thị mới nhất của PO, chỉ bàn giao danh mục để PO xem xét; chưa đề xuất hoặc thực hiện một module tiếp theo.

## 13. Approval Status
WAITING FOR USER REVIEW. Không có approval implementation mới. STOP-AFTER-TASK.
