# RoadToSchool — Business Context & Domain Knowledge

> **Trạng thái tài liệu**: Lưu trữ ngữ cảnh nghiệp vụ định hướng (Context Initialization).  
> **Nguyên tắc**: Tuyệt đối chưa triển khai code, API, Database Schema hoặc UI khi chưa có phê duyệt chính thức.

---

## 1. System Overview (Tổng quan Hệ thống)

RoadToSchool là hệ thống phần mềm quản lý dịch vụ đưa đón học sinh bằng xe buýt/xe hợp đồng. Hệ thống được vận hành bởi **một đơn vị vận tải (nhà xe)** chuyên cung cấp dịch vụ đưa đón cho các trường học đối tác.

### Mục tiêu cốt lõi:
- Quản trị toàn diện hoạt động đưa đón học sinh hằng ngày.
- Quản trị nguồn lực vận tải của nhà xe (xe, tài xế) và nguồn lực trường học (học sinh, giáo viên phụ trách).
- Hỗ trợ nhà trường theo dõi việc đưa đón học sinh an toàn, minh bạch.
- Cung cấp công cụ cho phụ huynh theo dõi hành trình xe thực tế đưa đón con em mình.
- Hỗ trợ tài xế và giáo viên giám sát chuyến xe thực hiện nhiệm vụ theo ca.
- Quản lý quy trình điểm danh lên/xuống xe, xử lý đơn báo nghỉ và báo cáo sự cố phát sinh.
- Cung cấp dữ liệu vận hành và báo cáo thống kê phục vụ tối ưu hóa dịch vụ.

---

## 2. Business Model (Mô hình Nghiệp vụ)

Hệ thống hoạt động theo mô hình **đơn vị dịch vụ tập trung**:
- **Duy nhất 1 đơn vị vận tải (nhà xe)**.
- **Duy nhất 1 bãi đỗ xe tập trung**.
- Sở hữu nhiều xe (Vehicles) và quản lý nhiều tài xế (Drivers).
- Hợp tác cung cấp dịch vụ với nhiều trường học (Schools).
- *Không thiết kế hệ thống hỗ trợ đa nhà xe (Multi-tenant) hoặc nhiều bãi xe nếu chưa có yêu cầu chính thức.*

### Phân định nguồn lực:
- **Nguồn lực nhà xe**: Phương tiện (Vehicles), Tài xế (Drivers).
- **Nguồn lực nhà trường**: Học sinh (Students), Giáo viên phụ trách / Giám sát xe (Bus Attendants).
- **Phụ huynh (Parents)**: Khách hàng sử dụng dịch vụ theo dõi. Một phụ huynh có thể liên kết nhiều học sinh (con em) trong hệ thống.

---

## 3. Actors & Preliminary Responsibilities (Tác nhân & Trách nhiệm Sơ bộ)

Hệ thống gồm **5 actor chính**. Các trách nhiệm dưới đây là định hướng sơ bộ, chưa phải đặc tả kỹ thuật cuối cùng:

### 3.1. System Admin (Quản trị viên phía Nhà xe)
Đại diện cho nhà xe, chịu trách nhiệm quản lý vận hành tổng thể:
- **Quản lý trường học**: Khởi tạo trường học, cập nhật thông tin trường, lịch học, thời gian bắt đầu và kết thúc ngày học, các ràng buộc vận hành (thời gian di chuyển tối đa, số lượng học sinh tối đa/xe/chuyến).
- **Quản lý vận tải**: Tạo và quản lý lộ trình/tuyến xe (Routes); thêm và quản lý phương tiện (Vehicles); tạo tài khoản tài xế (Drivers); phân công tài xế vào các chuyến xe; theo dõi lộ trình di chuyển.
- **Quản lý tài khoản**: Khởi tạo tài khoản School Admin cho các trường học đối tác.
- **Quản lý vận hành**: Giám sát và xử lý đơn báo nghỉ theo phân cấp; tiếp nhận và theo dõi báo cáo sự cố; giám sát hoạt động điều phối.

### 3.2. School Admin (Quản trị viên phía Nhà trường)
Đại diện cho trường học đối tác:
- **Quản lý học sinh**: Tiếp nhận, nhập danh sách học sinh đăng ký dịch vụ, quản lý hồ sơ học sinh thuộc trường; xử lý các yêu cầu cập nhật thông tin học sinh từ phụ huynh.
- **Quản lý Bus Attendant**: Tạo tài khoản cho giáo viên phụ trách xe (Bus Attendants); phân bổ giáo viên vào các chuyến xe liên quan đến trường.
- **Giám sát & Báo cáo**: Giám sát các chuyến xe phục vụ học sinh trường mình; xem báo cáo chuyên cần và sự cố liên quan.
- **Thông tin trường học**: Gửi yêu cầu thay đổi thông tin/cấu hình trường đến System Admin (không tự ý sửa đổi trực tiếp các cấu hình cốt lõi).

### 3.3. Driver (Tài xế nhà xe)
Nhân sự vận hành phương tiện do nhà xe quản lý:
- Xem danh sách chuyến xe được phân công theo ngày/tuần.
- Xem thông tin chi tiết chuyến (lộ trình, danh sách điểm dừng, thông tin giáo viên phụ trách).
- Báo nghỉ / xin nghỉ ca làm việc.
- Thực hiện thao tác bắt đầu chuyến xe, kết thúc chuyến xe.
- Sử dụng bản đồ số (Map Service) để định vị và điều hướng di chuyển.
- Đề xuất hoặc thay đổi thứ tự di chuyển khi gặp sự cố giao thông (quy tắc cần duyệt).

### 3.4. Bus Attendant (Giáo viên phụ trách / Giám sát xe)
Nhân sự nhà trường được phân công đi cùng chuyến xe:
- Xem thông tin chuyến được phân công, thông tin xe, tài xế và danh sách học sinh trên chuyến.
- Thực hiện điểm danh học sinh khi lên xe (đón) và khi xuống xe (trả).
- Ghi nhận và báo cáo sự cố phát sinh trong chuyến xe.
- Xác nhận trạng thái giải quyết sự cố của chuyến.
- Báo nghỉ ca phân công để nhà trường kịp thời điều phối nhân sự thay thế.

### 3.5. Parent (Phụ huynh học sinh)
Người dùng theo dõi con em:
- Liên kết hồ sơ học sinh (hỗ trợ liên kết nhiều học sinh cùng lúc).
- Xem danh sách và thông tin hồ sơ các học sinh đã liên kết.
- Gửi đơn báo nghỉ cho học sinh theo ca/ngày đón trả.
- Gửi yêu cầu cập nhật thông tin học sinh (địa chỉ, số điện thoại khẩn cấp, điểm đón trả).
- Theo dõi trực tiếp chuyến xe thực tế mà con mình đang tham gia (lộ trình, vị trí xe, thời gian dự kiến đón/trả - ETA).

---

## 4. Preliminary Business Domains (Phân rã Nghiệp vụ Dự kiến)

Hệ thống được định hướng phân chia thành 15 miền nghiệp vụ phục vụ phân tích logic:

1. **School Management**: Quản lý trường, lịch biểu và ràng buộc hoạt động.
2. **Student Management**: Quản lý hồ sơ, lớp học, điểm đón trả của học sinh.
3. **Parent–Student Relationship**: Quản lý liên kết, ủy quyền và định danh giữa phụ huynh và học sinh.
4. **Vehicle Management**: Quản lý phương tiện, sức chứa, biển số, hạn kiểm định, tình trạng xe.
5. **Driver Management**: Quản lý hồ sơ tài xế, giấy phép lái xe, trạng thái làm việc.
6. **Bus Attendant Management**: Quản lý giáo viên phụ trách xe theo trường.
7. **Route Management**: Quản lý tuyến đường, danh sách điểm dừng (Bus Stops), thứ tự lộ trình.
8. **Trip Management**: Quản lý chuyến xe cụ thể (chuyến đi sáng, chuyến về chiều, ngày chạy).
9. **Trip Assignment**: Phân bổ tài xế, xe, giáo viên phụ trách và học sinh vào từng chuyến.
10. **Student Attendance**: Nghiệp vụ điểm danh 2 chiều (đón tại nhà/trường, trả tại trường/nhà).
11. **Leave Requests**: Quy trình nộp, duyệt và cập nhật danh sách chuyến khi học sinh/tài xế/giáo viên báo nghỉ.
12. **Incident Management**: Báo cáo, phân loại, thông báo khẩn cấp và xử lý sự cố trên đường.
13. **Real-Time Trip Tracking**: Giám sát vị trí GPS, trạng thái di chuyển, cập nhật ETA.
14. **Reporting & Statistics**: Thống kê tỷ lệ đúng giờ, tỷ lệ chuyên cần, sự cố vận hành.
15. **Account Management**: Quản trị tài khoản người dùng, phân quyền truy cập theo 5 actor.

> **Cảnh báo kiến trúc**: Danh sách trên chỉ dùng để phân nhóm phân tích. Tuyệt đối **không** tự động tạo ngay thành Database tables, Prisma models, NestJS modules, APIs hoặc UI screens khi chưa có yêu cầu cụ thể.

---

## 5. Requirement Maturity Classification (Phân loại Độ Chín Yêu Cầu)

| Cấp độ | Định nghĩa | Hành động của Agent |
|---|---|---|
| **CONFIRMED CONTEXT** | Ngữ cảnh nền tảng cốt lõi đã được xác nhận (1 nhà xe, 1 bãi xe, 5 actors, 1 Parent liên kết nhiều Students, Phase 0 stack). | Sử dụng làm tiền đề hiểu hệ thống; không tự ý thay đổi. |
| **PROPOSED REQUIREMENT** | Nghiệp vụ được định hướng sơ bộ nhưng chưa chốt logic chi tiết, edge cases hoặc validation. | Phân tích, đặt câu hỏi, đề xuất phương án; **không** tự ý implement. |
| **APPROVED REQUIREMENT** | Nghiệp vụ đã được người dùng phê duyệt chi tiết về workflow, data contract, constraints. | Triển khai chính xác theo phạm vi được duyệt sau khi qua các Approval Gates. |

---

## 6. Unresolved Business Questions (Điểm Nghiệp Vụ Cần Làm Rõ Trước Khi Thiết Kế)

Dưới đây là các câu hỏi nghiệp vụ quan trọng cần được thảo luận và thống nhất theo từng giai đoạn phát triển:

### 6.1. Vận hành & Chuyến xe (Trips & Operations)
- Quy tắc sinh chuyến: Chuyến xe được tạo tự động theo lịch học định kỳ (recurring schedule) hay tạo thủ công theo tuần/tháng?
- Mối quan hệ giữa Tuyến - Xe - Trường: Một xe có cố định theo một tuyến không? Một chuyến xe có thể đón học sinh của nhiều trường học gần nhau hay mỗi chuyến chỉ phục vụ một trường duy nhất?
- Trạng thái chuyến: Vòng đời của một chuyến xe gồm những trạng thái nào (ví dụ: Scheduled, In Progress, Delayed, Completed, Cancelled)?
- Cách tính ETA: Dựa trên khoảng cách ước lượng, dữ liệu thực từ Map API (Google Maps/Mapbox), hay vận tốc trung bình?

### 6.2. Tài xế & Điều phối (Driver & Routing)
- Điều kiện bắt đầu chuyến: Tài xế có cần sự xác nhận của Bus Attendant để bắt đầu chuyến không?
- Thay đổi thứ tự điểm dừng: Driver có quyền tự ý thay đổi thứ tự điểm dừng trên ứng dụng không? Nếu đổi thì hệ thống tự động tính lại ETA và thông báo cho phụ huynh như thế nào?
- Xử lý khi tài xế báo nghỉ: Trước giờ khởi hành bao lâu tài xế phải báo nghỉ? Thẩm quyền điều phối tài xế thay thế thuộc về ai (System Admin hay hệ thống tự động gợi ý)?

### 6.3. Điểm danh & Giáo viên phụ trách (Attendance & Bus Attendant)
- Quy trình điểm danh 2 chiều: Các trạng thái điểm danh chi tiết là gì (Đã đón, Đã trả, Vắng có phép, Vắng không phép, Phụ huynh tự đón)?
- Xử lý học sinh vắng mặt không báo trước: Khi xe đến điểm đón nhưng học sinh không có mặt, xe được chờ tối đa bao nhiêu phút? Bus Attendant có cần gọi điện cho phụ huynh trước khi xác nhận bỏ qua điểm đón?
- Phân công Bus Attendant thay thế: Trường học quản lý việc thay thế giáo viên giám sát ra sao khi có người báo nghỉ đột xuất?

### 6.4. Phụ huynh & Học sinh (Parent & Student)
- Cơ chế liên kết học sinh: Phụ huynh liên kết học sinh bằng mã định danh (Student Code), số điện thoại đăng ký tại trường, hay mã OTP/QR do School Admin cấp?
- Cardinality Phụ huynh - Học sinh: Một học sinh có thể được liên kết bởi bao nhiêu phụ huynh (ví dụ: cả bố và mẹ cùng theo dõi)? Nếu nhiều phụ huynh thì quyền nộp đơn báo nghỉ được đồng bộ ra sao?
- Quy định báo nghỉ: Phụ huynh phải gửi đơn báo nghỉ trước giờ đón bao lâu để được coi là hợp lệ (ví dụ: trước 60 phút hay trước 22h tối hôm trước)?
- Phạm vi theo dõi chuyến: Phụ huynh chỉ được theo dõi vị trí xe khi con mình đang ở trên xe (từ lúc đón đến lúc trả), hay được theo dõi toàn bộ hành trình của chuyến xe đó?
