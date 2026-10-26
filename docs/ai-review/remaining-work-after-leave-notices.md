# RoadToSchool — Đầu việc còn lại sau Báo nghỉ

Ngày đối chiếu: 26/10/2026. DISCUSSION / INVENTORY ONLY. Số thứ tự để tham chiếu, không phải thứ tự ưu tiên. Định hướng context không tự động là yêu cầu bắt buộc MVP hoặc approval implementation.

PO đã dùng thử vận hành và Báo nghỉ tương đối ổn. Hai module này không liệt kê lại như tính năng chưa có; phần lỗi/nghiệm thu vẫn được theo dõi riêng.

## A. Nghiệp vụ chưa thấy triển khai tương ứng

| ID | Đầu việc | Phạm vi còn lại / trạng thái |
|---|---|---|
| 1 | Báo cáo và xử lý sự cố | Driver/Attendant báo trên Trip; admin tiếp nhận, cập nhật xử lý, xác nhận kết thúc theo phân cấp cần chốt. Chưa thấy Incident model/module/screens trong kiểm tra source có mục tiêu. |
| 2 | Dashboard và thống kê/báo cáo | Chuyến hoàn thành/hủy, chuyên cần/vắng, báo nghỉ, đúng giờ và sự cố theo thời gian/scope. AdminOverview hiện chỉ tiêu đề và để trống theo quyết định cũ; chỉ số/công thức cần PO duyệt, không coi tất cả chỉ số là scope đã chốt. |
| 3 | Yêu cầu thay đổi thông tin/cấu hình trường | School Admin gửi yêu cầu, System Admin xử lý. Context có định hướng, chưa thấy flow riêng. school-requests.controller thực tế là StudentUpdateRequest, không phải yêu cầu sửa cấu hình trường. |

## B. Workflow mở rộng, một phần hoặc tạm hoãn

| ID | Đầu việc | Phạm vi còn lại / trạng thái |
|---|---|---|
| 4 | Điều phối khẩn cấp khi IN_PROGRESS | Đổi xe/Driver/Attendant, bàn giao học sinh/attendance/navigation/history. Assignment thông thường hiện chỉ SCHEDULED; workflow cứu hộ đang deferred, cần thiết kế và approval riêng. |
| 5 | Hủy RoutePlan ACTIVE / giải phóng nguồn lực | Hủy DRAFT đã có, ACTIVE còn bị service chặn. Cần chốt tác động Trip chưa chạy/đang chạy/đã hoàn thành và holds; không chỉ mở nút hoặc bỏ guard. |
| 6 | ETA động đến từng điểm đón/trả | Có plannedArrivalTime và route distance/duration; chưa xác nhận flow ETA động hoàn chỉnh cho Parent theo current vehicle progress. Cần audit/đặc tả riêng, không coi giờ dự kiến lưu sẵn là ETA live hoặc cam kết độ chính xác. |
| 7 | Thông báo nghiệp vụ | Chưa thấy module inbox/push độc lập trong source inventory. Chưa chốt sự kiện, người nhận, kênh và nội dung; chỉ làm nếu PO đưa vào scope. Không tự thêm stop notifications đã bị loại bỏ, không mặc định cần FCM/WebSocket. |

## C. Công việc hoàn thiện Báo nghỉ đã phát hiện

| ID | Đầu việc | Bằng chứng / giới hạn |
|---|---|---|
| 8 | Khóa bấm trùng alert/OTP | use-quick-leave-notice.ts vẫn dùng state, chưa khóa lúc alert mở. Review trước tái hiện 2 alerts/2 OTP calls tới in-memory stub. Chưa thấy sửa trong source đọc lại. |
| 9 | Cờ báo nghỉ đúng từng nhân sự | getDriverSchedule/getBusAttendantSchedule còn !hasPendingStaff; pending của người khác có thể ẩn nút của actor hiện tại. Cần tách blocker Trip khỏi chống duplicate notice cá nhân. |
| 10 | Kiểm thử implementation thật và task diff đầy đủ | Thay tests mirror bằng tests gọi production logic; diff Antigravity trước review có dấu .../mô tả và parse lỗi. Bản gốc giữ trong history/2026-10-26-061031-before-leave-ui-independent-review.diff. Không dùng LATEST.diff của task docs hiện tại làm bằng chứng patch cũ đã sửa. |
| 11 | Đồng nhất bộ lọc trạng thái Mobile | Parent status filter còn chips; prompt trước ưu tiên dropdown. Mức thấp, PO có thể quyết định giữ chips nếu trải nghiệm chấp nhận được. Student selector trong history đã bỏ; không báo nhầm là chưa sửa. |

## D. Nghiệm thu/tích hợp và chuẩn bị vận hành

| ID | Đầu việc | Phạm vi kiểm chứng còn lại |
|---|---|---|
| 12 | Nghiệm thu trọn quy trình 5 roles | Hai chiều, quyền trường/con, privacy, Ready/Start/boarding/alighting/Complete, QR trên thiết bị; kiểm tra đồng bộ giữa nhiều tài khoản. Đã có code, PO đã thử một phần, chưa có ma trận evidence đầy đủ. |
| 13 | Navigation/tracking trên thiết bị | LIVE foreground GPS, permission/resume, reroute/retry, nhiều chặng, observer và completed history/gaps. Phân biệt TEST chạy được với LIVE sensor/OS đã đạt; không tự thay foreground-only. |
| 14 | Nghiệm thu Báo nghỉ và cạnh tranh nghiệp vụ | OTP/email/SMS-console, creator-only cancel, attendance restore, thay thế/hủy Trip; races confirm vs Start/Ready, duplicate/idempotency và hai admin gán người trùng giờ. Static/mocks không thay nghiệm thu runtime; dùng dữ liệu/quyền PO cấp. |
| 15 | Gửi SMS thật khi triển khai dùng thực tế | Hiện PO duyệt console tạm thời. Provider/config/giới hạn chi phí và giao vận thực tế chưa thuộc scope hiện tại; cần chốt trước khi cần OTP qua nhà mạng, không tự tích hợp package. Email cũng cần cấu hình/kiểm chứng delivery môi trường đích. |
| 16 | Kiểm tra khả năng phát hành/vận hành | Build cài đặt thiết bị, cấu hình môi trường đích, deploy, backup/restore và theo dõi lỗi. NOT_VERIFIED trong inventory này; chưa audit nên không khẳng định hạ tầng hiện chưa có. |

Không tự thêm vào backlog bắt buộc: đa nhà xe/đa bãi xe, WebSocket/SSE, background GPS/native navigation SDK, import Excel/CSV, billing/thanh toán hoặc tính năng khác chỉ vì chưa thấy source.

Không tạo dữ liệu, gửi OTP, migrate hoặc viết prompt implementation trong task inventory. PO chọn phạm vi tiếp theo trước khi thiết kế/triển khai.
