# Schema/field cần duyệt để triển khai 3.2

03/11/2026. Hai model đã được đồng ý về nhu cầu; đây là danh sách field cụ thể đề xuất, chưa migrate. Không test scripts, không seed/backfill.

## SchoolScheduledChange

| Field | Kiểu/default | Ý nghĩa |
|---|---|---|
| id | String UUID primary | ID |
| schoolId | String FK School, Restrict | Trường |
| type | String, INACTIVE/LOCATION/SCHEDULE | Loại |
| effectiveDate | DateTime @db.Date, required | Ngày VN áp dụng |
| payload | Json required | isActive=false hoặc addressText/latitude/longitude hoặc weeklySchedule |
| status | String default PENDING; APPLIED/CANCELLED/FAILED | Theo dõi đối soát |
| createdById | String FK User, Restrict | Người tạo |
| createdAt/updatedAt | DateTime now/updatedAt | Audit |
| appliedAt/cancelledAt | DateTime nullable | Audit kết quả |
| lastError | String nullable | Lỗi áp dụng, không secrets |

Index (schoolId,type,effectiveDate), (status,effectiveDate). Các API cùng trường/loại/ngày chỉ cho một pending entry qua transaction khóa School; không thêm unique khiến mất lịch sử hủy. Giá trị type/status validate trong DTO/service, chưa thêm Prisma enum.

## ServiceCalendarEntry

| Field | Kiểu/default | Ý nghĩa |
|---|---|---|
| id | String UUID primary | ID |
| schoolId | String nullable FK School, Restrict | null là nhà xe/hệ thống |
| title | String required | Tên ngày nghỉ/học bù |
| kind | String HOLIDAY/MAKEUP | Loại |
| calendar | String SOLAR/LUNAR | Lịch |
| recurrence | String ONCE/ANNUAL | Năm cụ thể/hằng năm |
| year | Int nullable | Required nếu ONCE, null nếu ANNUAL |
| month/day | Int required | Ngày nguồn âm/dương |
| leapMonth | Boolean default false | Chọn tháng âm nhuận riêng |
| startTime/endTime | String nullable | HH:mm, required với MAKEUP; lịch vận hành học bù |
| status | String, APPROVED/PENDING/REJECTED/CANCELLED | Holiday tạo được duyệt ngay theo quyền; MAKEUP chờ SYSTEM_ADMIN |
| createdById | String FK User, Restrict | Người tạo |
| reviewedById | String nullable FK User, SetNull | Người duyệt |
| reason | String nullable | Lý do quyết định/hủy |
| createdAt/updatedAt | DateTime now/updatedAt | Audit |
| reviewedAt/cancelledAt | DateTime nullable | Audit |

Index (schoolId,status), (kind,calendar,recurrence,year). MAKEUP chỉ ONCE, schoolId required; ngày nguồn được chuyển sang ngày VN để so sánh lead time và contract. Không tạo record nghỉ mặc định bằng migration.

## Trip admin audit

Thêm `adminFinalization Json?` nullable. Dạng đề xuất:

- pending: `{state:'PENDING', trigger:'CONTRACT_EXPIRED'|'SCHOOL_INACTIVE'|'LOCATION_CHANGED'|'HOLIDAY', effectiveDate, detectedAt}`.
- finalized: giữ trigger/effectiveDate/detectedAt, thêm `{state:'FINALIZED', previousStatus, finalStatus, reason, finalizedById, finalizedAt}`.
- POST admin-finalization nhận `finalStatus: COMPLETED|CANCELLED`, `reason` required, `expectedStatus` required; `actualEndTime` không tự bịa khi complete thiếu dữ liệu, giữ thời gian cũ và lưu thời điểm admin riêng trong audit. Response TripDetail giữ field cũ + adminFinalization nullable. Chốt hoàn thành hành chính không tự chứng minh trẻ đã xuống; không sửa TripAttendance.

## Field API cũ cần xác nhận

- `effectiveDate?: YYYY-MM-DD`; đề xuất thiếu thì ngày mai, không áp dụng hôm nay.
- Response additive `scheduledChangeId`, `effectiveDate`, `changeStatus`; School object vẫn là giá trị hiệu lực hôm nay. Counters cũ chỉ số đã áp dụng, không giả số tác động dự kiến thành đã hủy; thêm `impact` cho số dự kiến nếu được duyệt.
- RoutePlan giữ status; effectiveStatus/effectiveStatusReason đã được PO đồng ý. Khi có inactive/location thêm reason SCHOOL_INACTIVE/LOCATION_CHANGED theo sự kiện chờ, cần duyệt mở rộng reason.

## Chính sách còn chờ câu trả lời

- Lunar month/day không tồn tại bỏ lần đó, tháng thường mặc định; trường tự quản lý holiday, nhà xe quản lý system/duyệt MAKEUP.
- Không có thư viện chuyển đổi lịch Việt Nam trong dependency hiện tại được xác nhận; cần chọn giải pháp hợp lệ, không tự cài package.
- Buộc login mới sau inactive, hủy pending trước ngày; optional basic info/image/notification scope chờ phản hồi.
- Schema được duyệt không đồng nghĩa quyền chạy migrate database thật. Tạo migration DDL để review; chỉ apply sau PO cho phép.

## Phê duyệt PO / trạng thái thực hiện 03/11/2026

PO đã duyệt các model/field ở trên, tên/default API, quy tắc lịch âm và thêm amlich.js. Đã duyệt mở rộng RoutePlan reason SCHOOL_INACTIVE/LOCATION_CHANGED và calendar effectiveStatus/reason OPERATOR_HOLIDAY. DDL đã tạo tại api/prisma/migrations/20261103010000_school_lifecycle_calendar/migration.sql, chưa apply DB. Các đoạn “chờ” ở trên là bản trình trước phê duyệt. Không tự thêm impact field chưa duyệt.

### Deployment local — 03/11/2026

PO đã cho phép apply migration ở lượt sau. 20261103010000_school_lifecycle_calendar đã apply thành công vào roadtoschool/public tại localhost:5432; status up to date, hai bảng mới và trips.admin_finalization JSONB nullable đã được xác minh bằng metadata read-only. Không seed/backfill/test scripts.
