# Mục 3.2 — Ghi chú cho FE / nội dung PR

Đối chiếu bản tích hợp cập nhật 07/11/2026 tại [FE Integration Guide](../FE_INTEGRATION_GUIDE.md). Mục 13 của hướng dẫn ghi các giới hạn API còn tồn tại, gồm flags vận hành và giờ trên lịch phụ xe. Các giới hạn đó áp dụng khi đọc ghi chú 3.2 này.

Trạng thái cập nhật 03/11/2026: API đã triển khai trong source; migration đã apply vào DB local roadtoschool/public (localhost:5432), chưa nghiệm thu nghiệp vụ trên DB. Không chạy script test. Không thay Web/Mobile.

## API cũ thay đổi hành vi

- PATCH /api/v1/schools/:id/status (isActive=false), /schedule, /location: giữ field cũ, thêm effectiveDate?: YYYY-MM-DD. Không gửi ngày thì mặc định ngày mai theo giờ Việt Nam; ngày hợp lệ từ ngày mai đến hết hợp đồng.
- Lưu thành công là **đã hẹn**, chưa áp dụng ngay. Response giữ field cũ, thêm scheduledChangeId, effectiveDate, changeStatus=PENDING. School/isActive/địa chỉ/lịch trong response là thông tin đang hiệu lực hôm nay. Không ép form hiển thị dữ liệu hẹn thành dữ liệu đã áp dụng.
- cancelledPlansCount/cancelledTripsCount/updatedTripsCount vẫn là số đã thực hiện: bằng 0 khi mới hẹn. Không dùng chúng làm preview tác động.
- isActive=true kích hoạt ngay khi hợp đồng có hiệu lực; không tự hủy lịch inactive tương lai. Muốn bỏ lịch đó cần gọi API hủy. Không phục hồi plan/Trip đã hủy.
- PATCH /schools/:id/contract giữ payload cũ. Khi còn DRAFT/ACTIVE chỉ cho gia hạn giữ ngày bắt đầu, kiểm tra nguồn lực đã phân công. DRAFT chưa gán đủ không bị tự gán hoặc bị ép hoàn thiện chỉ vì gia hạn. Khi hợp đồng đã hết hạn, phương án cũ bị hủy trước, gia hạn không hồi sinh chúng.
- Response phương án thêm effectiveStatus và effectiveStatusReason: CONTRACT_EXPIRED / SCHOOL_INACTIVE / LOCATION_CHANGED / null. status cũ vẫn là giá trị đã lưu; FE dùng effectiveStatus để quyết định thao tác. Bộ lọc status cũ vẫn lọc trạng thái lưu.
- Tới ngày inactive, SCHOOL_ADMIN/BUS_ATTENDANT nhận 401 trên login/refresh/me và các request được bảo vệ. FE xử lý logout như 401 hiện tại; sau active lại phải đăng nhập mới. Chỉ hết hợp đồng thì không khóa account.
- Parent giữ tài khoản/liên kết và xem lịch sử con; mutation theo con thuộc trường inactive bị từ chối 409. Con ở trường khác không bị ảnh hưởng. Endpoint unlink cũ được giữ theo phạm vi đã chốt.
- Ready/Start/điểm danh/xuống xe/hoàn thành/đổi nhân sự/GPS của chuyến hết hiệu lực hoặc chờ admin bị chặn 409. Theo dõi các can*/disabledReason hiện có và xử lý refresh khi gặp 409. Không suy ra được vận hành chỉ từ status=IN_PROGRESS.

## API mới

Tất cả có prefix /api/v1, dùng JWT hiện tại.

| Method/path | Quyền | Dùng cho FE |
|---|---|---|
| GET /schools/:schoolId/scheduled-changes | SYSTEM_ADMIN / SCHOOL_ADMIN đúng trường | Danh sách lịch hẹn, effectiveDate là YYYY-MM-DD, type/payload/status và audit |
| POST /schools/:schoolId/scheduled-changes/:id/cancel | SYSTEM_ADMIN | Không body; chỉ lịch PENDING trước ngày hiệu lực |
| GET /service-calendar?schoolId=... | SYSTEM_ADMIN / SCHOOL_ADMIN đúng trường | Trường thấy lịch nhà xe + trường mình |
| POST /service-calendar | SYSTEM_ADMIN quản lý nghỉ nhà xe; SCHOOL_ADMIN nghỉ/học bù trường mình | HOLIDAY được duyệt ngay; MAKEUP chỉ trường đề nghị, PENDING |
| POST /service-calendar/:id/decision | SYSTEM_ADMIN | {status: APPROVED hoặc REJECTED, reason?: string}; từ chối cần lý do |
| POST /service-calendar/:id/cancel | Theo phạm vi quản lý nghỉ | Không body; chỉ hủy HOLIDAY trước ngày; chưa hỗ trợ hủy MAKEUP |
| GET /trips/admin-finalizations | SYSTEM_ADMIN | Danh sách chuyến chưa hoàn thành cần chốt, kể cả cron chưa đối soát |
| POST /trips/:id/admin-finalization | SYSTEM_ADMIN | {finalStatus: COMPLETED hoặc CANCELLED, expectedStatus: SCHEDULED hoặc IN_PROGRESS, reason: string} |

Ngày nghỉ/học bù dùng body: title, schoolId? (bỏ trống=nhà xe), kind=HOLIDAY/MAKEUP, calendar=SOLAR/LUNAR, recurrence=ONCE/ANNUAL, year? (bắt buộc ONCE, không gửi ANNUAL), month, day, leapMonth?=false. MAKEUP cần startTime/endTime HH:mm và ONCE. Không gửi giờ với HOLIDAY.

Âm lịch dùng lịch Việt Nam UTC+7. Ngày lặp không có trong năm thì bỏ lần đó; tháng thường/tháng nhuận tách riêng. Không tạo chuyến trên bất kỳ nghỉ nhà xe nào. Học bù được duyệt có thể vượt nghỉ trường, không vượt nghỉ nhà xe.

Response lịch giữ status và thêm effectiveStatus/effectiveStatusReason. MAKEUP đã APPROVED gặp nghỉ nhà xe thêm sau sẽ effectiveStatus=BLOCKED, reason=OPERATOR_HOLIDAY, status vẫn APPROVED. Khi bỏ nghỉ hợp lệ, eligibility được tính lại; không tự hồi sinh Trip đã CANCELLED.

TripDetail thêm adminFinalization nullable. Chốt COMPLETED hành chính **không xác nhận trẻ đã xuống xe**: alightedAt/điểm danh/actualEndTime cũ được giữ, thời điểm admin nằm riêng trong audit. Không dùng COMPLETED đơn lẻ để hiển thị “đã xuống xe an toàn”.

## Giới hạn cần ghi trong PR

- Phải áp dụng migration 20261103010000_school_lifecycle_calendar đã review trước khi chạy API phiên bản này. Đã apply local ngày 03/11/2026; máy/DB khác cần tự apply migration.
- GET tính hiệu lực không ghi DB. Cron đối soát mỗi phút và mutation liên quan ghi nhận bù; server tắt thì không có thao tác ghi/notification đúng giờ. Không có worker độc lập mới.
- Đổi địa điểm: đến ngày mới hủy phương án cũ để tạo phương án mới. Giữ quy tắc sinh chuyến từ ngày sau activation, nên có thể gián đoạn ngày chuyển.
- Lịch COMPLETED và tuyến/điểm dừng cũ được giữ. Xe/người thuộc chuyến ngoại lệ vẫn bị giữ bận tới admin chốt.
- Chưa có màn hình mới ở Web/Mobile. Endpoint preview tổng quát/preview gia hạn là đề xuất phụ trong bản plan, không thuộc contract payload đã chốt; hiện dùng API cũ để hẹn và validation khi lưu. Không có atomic save nhiều nhóm hoặc sửa tên/ảnh trường.
- Kiểm tra tĩnh và Swagger không thay thế nghiệm thu ngày hiệu lực, lịch âm, tranh chấp đồng thời hoặc FE trên dữ liệu thật.
