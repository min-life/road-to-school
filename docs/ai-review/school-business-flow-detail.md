# Phân tích chi tiết 3.2 — Trường học và cấu hình dịch vụ

> Quyết định 03/11/2026: D3 phương án cũ phục vụ tới trước ngày đổi, đến ngày hủy để tạo mới; D7 đến ngày nghỉ mới hủy Trip, rút trước ngày giữ Trip gốc, ngày nghỉ nhà xe chặn học bù; D8 giữ Trip đã điểm danh/đang chạy cho admin chốt, tài nguyên chờ chốt chưa phân công mới (R1). Xem school-api-improvement-plan.md mục 15. Chưa triển khai code.

> PO điều chỉnh mới nhất 02/11/2026: hết hợp đồng coi như hủy các phương án cũ và giải phóng nguồn lực. Quyết định này thay thế yêu cầu giữ nguyên trạng thái phương án tại mục 15.1; xem mục 16.

> Quyết định bổ sung mới nhất ngày 02/11/2026: xem mục 15, ưu tiên hơn những phương án mâu thuẫn ở mục 13–14.

> Quyết định mới nhất của PO: xem mục 13. Các hiện trạng và phương án A/B bên dưới là baseline trước quyết định, không thay thế quyết định tại mục 13. Chưa triển khai mục 3.2.

Ngày: 30/10/2026. Mode DISCUSSION. Chỉ phân tích source, chưa chốt field/contract/implementation mới. Không chạy script test, API mutation, DB/provider hoặc sửa .env.

## 1. Phạm vi và đối tượng

SYSTEM_ADMIN quản lý đối tác trường: tạo, hợp đồng, địa điểm, lịch tuần, trạng thái. SCHOOL_ADMIN xem cài đặt trường mình qua GET /api/v1/schools/:id/settings; không trực tiếp sửa các cấu hình cốt lõi. DRIVER/BUS_ATTENDANT/PARENT nhận tác động qua Trip và lịch.

School.isActive, hiệu lực hợp đồng, RoutePlan.status và Trip.status là bốn khái niệm riêng; bật trường không kích hoạt phương án, ACTIVE không chứng minh đủ mọi điều kiện sinh/vận hành chuyến. Tài khoản nhân sự vẫn có isActive riêng; tắt trường hiện không tắt User/Session.

## 2. Tạo trường

Web: Trường học → Thêm trường → tên/địa chỉ/tọa độ/hợp đồng/lịch tuần/ảnh tùy chọn → lưu.
POST /api/v1/schools, multipart/form-data. Fields name, addressText, latitude, longitude, contractStartDate, contractEndDate, weeklySchedule (JSON string), image tùy chọn.

Ví dụ lịch: monday: start 07:00, end 17:00; ngày không có key là không học. API kiểm tra tọa độ, ngày lịch thực ở CreateSchoolDto, end >= start, weekly schedule hợp lệ. Lưu School isActive=true. Không tự tạo User quản trị, Student, RoutePlan hoặc Trip. Nhân sự tạo ở luồng riêng đã chỉnh mục 3.1.

Nguồn tạo không ràng buộc ngày bắt đầu phải hôm nay; có thể tạo trường có hợp đồng tương lai và vẫn isActive=true. Khác với bật lại trường yêu cầu hợp đồng đang hiệu lực; cần chốt ý nghĩa trạng thái.

## 3. Xem thông tin

SYSTEM_ADMIN: GET /api/v1/schools và /schools/:id. SCHOOL_ADMIN: GET /schools/:id/settings theo trường mình. Web chi tiết có thông tin, nhân sự, học sinh và tuyến qua các API riêng. Quy trình yêu cầu trường sửa cấu hình qua nhà xe hiện chưa có workflow yêu cầu riêng được xác nhận; không tự thêm bảng request.

## 4. Lịch tuần và cách tính chuyến

PATCH /api/v1/schools/:id/schedule, body weeklySchedule là object hoặc JSON string. Ngày monday..sunday, ít nhất một ngày học, mỗi ngày start/end HH:mm, start < end. Không hỗ trợ nhiều ca/ngày hoặc ca qua đêm bằng cấu trúc này.

Chiều TO_SCHOOL: scheduledEndTime = giờ bắt đầu học; scheduledStartTime = giờ bắt đầu học trừ thời lượng tuyến. Chiều TO_PARKING: scheduledStartTime = giờ tan học; scheduledEndTime = giờ tan học cộng thời lượng tuyến.

Ví dụ minh họa (không phải test records): bắt đầu 07:00, tan 17:00, tuyến 45 phút → sáng 06:15–07:00, chiều 17:00–17:45. Cần chốt có phải đến trước giờ học một khoảng và chờ sau tan học một khoảng hay không.

Khi đổi lịch, service duyệt mọi Trip SCHEDULED của trường: ngày bị bỏ khỏi lịch thì hủy; ngày còn học thì cập nhật giờ; cập nhật School.weeklySchedule và trả cancelledTripsCount/updatedTripsCount. Không chọn IN_PROGRESS/COMPLETED theo query hiện tại. Không thấy ngày hiệu lực trong DTO.

Bất cập: SCHEDULED gồm cả Ready hoặc đã điểm danh chiều về; chưa đóng băng theo các mốc này. Không lọc serviceDate tương lai nên Trip cũ chưa chạy cũng có thể bị tác động. Dùng duration Route hiện tại thay vì snapshot Trip; snapshot chỉ sửa departureTime trong nhánh đã đọc, không đồng bộ toàn bộ arrival/stop timing. Chỉ thấy notifyCancelledTrips cho chuyến bị hủy, chưa có thông báo riêng đổi giờ. Không kiểm tra lại xung đột xe/người trong phương thức đổi lịch.

Không dùng weeklySchedule cho nghỉ bão một ngày: bỏ friday sẽ bỏ mọi thứ sáu thuộc phạm vi tác động, không chỉ ngày muốn nghỉ. Validator không chấp nhận lịch rỗng nên không thể biểu đạt nghỉ cả tuần bằng object rỗng.

## 5. Hợp đồng

PATCH /api/v1/schools/:id/contract, request contractStartDate/contractEndDate; reason/expectedUpdatedAt optional theo DTO.

Hiện tại: chặn nếu còn bất cứ RoutePlan DRAFT/ACTIVE; ngày bắt đầu mới phải từ hôm nay theo VN, ngày kết thúc >= bắt đầu. Chỉ lưu cặp ngày trên School, không có bảng lịch sử từng hợp đồng trong schema đã đọc.

Vấn đề: gia hạn chỉ kéo dài ngày kết thúc vẫn phải hủy phương án; giữ nguyên ngày bắt đầu cũ trong quá khứ cũng bị từ chối. reason và expectedUpdatedAt chưa được dùng trong thân service đã đọc. DTO update kiểm tra format ngày, chưa dùng validator ngày lịch thực như CreateSchoolDto. Đây là khác biệt kiểm tra đầu vào, không chạy request để tái hiện.

Sinh Trip có kiểm tra thời hạn hợp đồng. Có reconcileExpiredContracts ở RoutesService nhưng tìm trong api/src chưa thấy caller/scheduler; không tuyên bố tự động EXPIRED/giải phóng xe đã hoàn chỉnh. Gia hạn không tự hồi sinh Trip đã hủy hoặc plan CANCELLED/EXPIRED.

## 6. Địa điểm trường

Web chỉnh sửa có thay đổi địa chỉ/tọa độ → GET /api/v1/schools/:id/location-impact?latitude=...&longitude=... → modal tác động → PATCH /schools/:id/location.

Request cập nhật gồm addressText, latitude, longitude; reason và expectedFingerprint optional. Impact có counts DRAFT/ACTIVE, SCHEDULED, IN_PROGRESS và fingerprint; có các alias field giữ cho client.

Hiện tại commit: hủy các plan DRAFT/ACTIVE và Trip SCHEDULED liên quan; đóng leave PENDING_REPLACEMENT trên Trip hủy; ghi notifications; cập nhật School tọa độ/địa chỉ. Query hủy không chọn IN_PROGRESS/COMPLETED; việc bảo toàn lộ trình cũ của chuyến vẫn phải dựa snapshot/consumer, không chỉ trạng thái.

Source không phân biệt chỉ sửa tên đường/chuỗi địa chỉ với di chuyển tọa độ khi vào updateLocation: vẫn cascade dù tọa độ giữ nguyên. Fingerprint optional, xác minh trước transaction, dựa updatedAt và counts chứ chưa chứng minh toàn bộ dữ liệu/identity không thay. Cập nhật theo ID sau khi đọc SCHEDULED nên có rủi ro start đồng thời; cùng nhóm B-06.

Chưa có ngày hiệu lực hoặc quy trình chuẩn bị/duyệt phương án mới trước chuyển trường sang cơ sở khác. Cần chốt chuyến đang chạy về cơ sở cũ hay phải điều phối khẩn cấp; không tự cho đổi đích giữa chuyến.

## 7. Trạng thái trường và tài khoản

PATCH /api/v1/schools/:id/status với isActive. Hiện chỉ sửa School.isActive; không hủy plan/Trip, không khóa User/Session. Bật lại khi trạng thái khác yêu cầu hôm nay trong hợp đồng. Request gửi trạng thái giống hiện tại trả ngay trước kiểm tra hợp đồng.

Tạo chuẩn bị/tối ưu tuyến có chặn trường inactive trong RoutesService. Nhưng generateTripsInternal duyệt ACTIVE plans, kiểm tra ngày hợp đồng/lịch tuần mà chưa kiểm tra School.isActive. Như vậy tắt trường không đủ chứng minh đã dừng sinh chuyến. Đây là vấn đề nghiệp vụ cần thống nhất toàn luồng.

PO đã chuyển trường ngừng hoạt động/hết hợp đồng từ AUTH-06 sang phần này. Cần quyết định tài khoản trường inactive có được đăng nhập để xem lịch sử; không tự khóa tài khoản hoặc sửa auth theo trạng thái School.

## 8. Một lần lưu Web là nhiều API

edit-school-modal.tsx gọi tuần tự location → schedule → contract khi từng nhóm thay đổi, không phải một transaction chung. Nếu location thành công rồi schedule/contract lỗi, thay đổi trước vẫn có hiệu lực dù modal báo lưu thất bại. API/FE cần thể hiện từng kết quả và tránh retry mù.

Modal còn validate biến name, nhưng executeSave đã đọc không gửi name tới ba API và chưa thấy endpoint cập nhật tên trong SchoolsController. Không nên coi tên đã lưu khi chỉ sửa field đó. Vấn đề ghi nhận cho scope API contract, không tự sửa UI.

## 9. Các bảng tác động

| Thao tác | Dữ liệu chính |
|---|---|
| Tạo trường | School; ảnh ngoài DB nếu có |
| Sửa hợp đồng/trạng thái | School |
| Sửa lịch | School, Trip, leave chờ thay trên Trip hủy, Notification cho hủy |
| Sửa địa điểm | School, RoutePlan, Trip, LeaveNotice, Notification |

User/Student/ParentStudentLink không tự bị xóa khi sửa trường. Nhu cầu bảo toàn lịch sử phải được duyệt cho từng thao tác, không suy ra một quy tắc cascade xóa.

## 10. Danh sách cần PO quyết định

Mọi SCH-xx dưới đây là NEEDS_DECISION, không phải field hoặc giải pháp đã duyệt. Bất cập source là nhận xét tĩnh, runtime NOT_VERIFIED.

| ID | Nội dung cần chốt | Hướng đề xuất |
|---|---|---|
| SCH-01 | Ý nghĩa inactive và tác động plan/Trip/User | Ngừng nghiệp vụ mới; giữ chuyến đang chạy/lịch sử; quyết định hủy hay giữ SCHEDULED riêng; không tự khóa mọi User |
| SCH-02 | Gia hạn so với thay hợp đồng | Tách kéo dài ngày kết thúc và lập kỳ mới; xem tác động reservation; không ép hủy plan nếu chỉ gia hạn hợp lệ |
| SCH-03 | Lịch ngày ngoại lệ | Phân biệt nghỉ một ngày, học bù, đổi giờ với lịch tuần lặp; API mới nếu phù hợp, chưa duyệt schema |
| SCH-04 | Ngày hiệu lực, Ready/điểm danh/Trip lịch sử | Chốt thời điểm áp dụng; đóng băng đã Ready/điểm danh/đang chạy; không sửa chuyến quá khứ mặc định |
| SCH-05 | Giờ tới trường/đón sau tan học | Chốt buffer hay đúng giờ start/end; chưa chọn field/default mới |
| SCH-06 | Sửa text địa chỉ so với di chuyển cơ sở | Sửa text không đổi tọa độ đề xuất không hủy tuyến; di chuyển có impact/chuyển tiếp, giữ snapshot lịch sử |
| SCH-07 | Cập nhật giờ/điểm và điều phối | Đồng bộ Trip/snapshot/stop timing, kiểm tra xung đột và thông báo đổi giờ |
| SCH-08 | Hết hạn và phục hồi | Chốt đối soát tự động, giải phóng nguồn lực, gia hạn có phục hồi gì và duyệt lại hay không |
| SCH-09 | Cập nhật tên/ảnh và lưu nhiều nhóm | Hỗ trợ sửa thông tin cơ bản; API cũ giữ field, diễn đạt kết quả từng thao tác hoặc API mới nguyên tử nếu PO chọn |
| SCH-10 | Chuyến đang chạy khi đổi vị trí/lịch/trạng thái | Bảo toàn theo snapshot hay điều phối khẩn cấp; chống hủy/sửa chuyến vừa Start đồng thời |
| SCH-11 | Trường đề nghị sửa cấu hình | Tiếp tục liên hệ trực tiếp nhà xe hay cần workflow request riêng; không tự thêm bảng |

Liên kết tracker cũ: SCH-04/07 → B-05; SCH-08 → B-07; SCH-03 → P-01; SCH-02/04/06/08/10 → P-05; SCH-10 → B-06. Giữ ID cũ, không coi SCH là vấn đề đã triển khai mới.

### SCH-01 — Ngừng hoạt động có dừng dịch vụ không?

- **Hiện trạng:** API status chỉ sửa School.isActive. Không hủy plan/Trip hoặc khóa User/Session. Sinh Trip từ ACTIVE plan chưa kiểm tra isActive.
- **Tình huống:** nhà xe tắt trường hôm nay nhưng cron vẫn có thể sinh chuyến cho ngày sau nếu plan ACTIVE còn trong hợp đồng/lịch.
- **Ảnh hưởng:** nhà xe tưởng dừng dịch vụ; tài xế và phụ huynh vẫn thấy chuyến. Nếu xử lý quá mạnh lại có thể dừng nhầm xe đang chở trẻ.
- **Lựa chọn A:** inactive là ngừng phục vụ: chặn sinh mới, hủy chuyến chưa vận hành, giữ chuyến đang chạy và lịch sử; giữ tài khoản xem dữ liệu theo quyền. Ưu: đúng kỳ vọng dừng dịch vụ. Đổi lại: phải điều phối rõ khi đã Ready/điểm danh; liên quan SCH-04/10.
- **Lựa chọn B:** inactive chỉ khóa cấu hình mới, chuyến đã có vẫn chạy. Ưu: ít gián đoạn. Đổi lại: cần một thao tác dừng dịch vụ riêng, không được diễn đạt inactive là đã ngừng xe.
- **Đề xuất:** A; giữ plan để đối chiếu nhưng không sinh Trip khi inactive. Bật lại không tự hồi sinh các Trip đã CANCELLED; việc sinh mới cần đủ điều kiện.
- **PO cần quyết định:** chọn A hay B? Có giữ đăng nhập xem lịch sử cho tài khoản trường không? Chuyến Ready/đã điểm danh xử lý theo SCH-04/10, không tự coi là chuyến chưa vận hành.

### SCH-02 — Gia hạn có cần hủy tuyến?

- **Hiện trạng:** còn DRAFT/ACTIVE thì không sửa hợp đồng; start mới >= hôm nay. School chỉ lưu một cặp ngày hợp đồng, chưa có lịch sử các kỳ hợp đồng riêng.
- **Tình huống:** hợp đồng 01/09/2026–31/05/2027 muốn kéo dài tới 30/06/2027, tuyến không đổi. Hiện bị chặn vì plan hoặc ngày bắt đầu cũ.
- **Ảnh hưởng:** phải hủy và tạo/duyệt lại, nguy cơ gián đoạn và mất phân công đang phù hợp.
- **Lựa chọn A:** cho gia hạn ngày kết thúc, giữ ngày bắt đầu/plan, kiểm tra nguồn lực ở phần thời gian tăng thêm; từ chối nếu có xung đột. Ưu: liên tục dịch vụ. Đổi lại: phải xem giữ xe/người cho kỳ kế tiếp.
- **Lựa chọn B:** mọi kỳ mới đều hủy/tạo plan lại. Ưu: đơn giản ranh giới kỳ. Đổi lại: nhiều thao tác, phải chuẩn bị chuyển tiếp để không ngắt dịch vụ.
- **Đề xuất:** A cho chỉ kéo dài; đổi địa điểm/lịch hoặc lập kỳ mới xử lý riêng, chưa tự thêm bảng hợp đồng.
- **PO cần quyết định:** có cho gia hạn không hủy plan nếu không đổi nội dung dịch vụ và nguồn lực đủ không? Có cần giữ lịch sử từng kỳ ngay trong scope này không?

### SCH-03 — Nghỉ một ngày và học bù

- **Hiện trạng:** chỉ lịch tuần, không có cấu trúc ngày ngoại lệ đã xác nhận; weeklySchedule không được rỗng.
- **Tình huống:** nghỉ bão thứ sáu một tuần hoặc học bù thứ bảy vốn không nằm trong lịch tuần.
- **Ảnh hưởng:** sửa friday làm tác động nhiều thứ sáu; học bù có thể không có Trip.
- **Lựa chọn A:** bổ sung lịch ngoại lệ theo ngày/khoảng ngày, ưu tiên trên lịch tuần; hỗ trợ nghỉ hoặc đổi giờ/học bù. Ưu: đúng ngày. Đổi lại: có nghiệp vụ/API mới, phải duyệt dữ liệu lưu và tác động Trip.
- **Lựa chọn B:** xử lý thủ công từng Trip, chưa làm lịch ngoại lệ. Ưu: ít mở rộng. Đổi lại: dễ bỏ sót; hủy rồi generator vẫn cần biết không được sinh lại, học bù ngoài tuần cần cơ chế riêng.
- **Đề xuất:** A nếu quản lý lịch thực tế thuộc scope; chưa chọn bảng/field/default.
- **PO cần quyết định:** có làm lịch ngoại lệ trong đợt này không, hỗ trợ nghỉ/đổi giờ/học bù hay chỉ nghỉ?

### SCH-04 — Áp dụng từ ngày nào, có sửa chuyến Ready không?

- **Hiện trạng:** đổi lịch chọn mọi SCHEDULED, không có ngày hiệu lực; Ready/điểm danh chiều về vẫn SCHEDULED; Trip quá khứ chưa chạy cũng có thể bị chọn.
- **Tình huống:** đổi giờ từ tuần sau nhưng các chuyến tuần này đã sinh; hoặc trẻ đã lên xe chiều về khi nhà xe đổi giờ.
- **Ảnh hưởng:** thay sai ngày, làm giờ hiển thị và quy tắc xuất phát không khớp thực tế.
- **Lựa chọn A:** chỉ cho đổi nếu không có chuyến đã chuẩn bị trong phạm vi tác động; có thì từ chối toàn bộ. Ưu: dễ hiểu, không có kết quả một phần. Đổi lại: khó áp dụng lịch mới khi còn chuyến sắp chạy.
- **Lựa chọn B:** có ngày hiệu lực, chỉ cập nhật chuyến chưa Ready/chưa điểm danh; giữ nguyên các chuyến frozen và trả rõ danh sách/số lượng bỏ qua. Ưu: linh hoạt, không phá vận hành. Đổi lại: người dùng phải biết có chuyến vẫn dùng lịch cũ.
- **Đề xuất:** B; giữ chuyến quá khứ/đã chạy/hoàn thành. Tình huống nghỉ khẩn cấp khiến chuyến frozen không thể chạy cần điều phối riêng, không âm thầm bỏ qua rồi tuyên bố mọi chuyến đã hủy.
- **PO cần quyết định:** chọn A hay B? Đổi lịch thông thường mặc định từ ngày nào, có được áp dụng ngay trong ngày không? Field/ngày mặc định phải chốt khi lập contract.

### SCH-05 — Khoảng đệm giờ học

- **Hiện trạng:** sáng đến đúng start, chiều xuất phát đúng end, chưa có khoảng đệm riêng trong cách tính đã đọc.
- **Tình huống:** lớp bắt đầu 07:00, xe tới 07:00 nhưng trẻ cần thời gian xuống và vào lớp; tan 17:00 nhưng 17:10 mới tập trung đủ.
- **Ảnh hưởng:** trên lịch có vẻ đúng giờ nhưng học sinh muộn hoặc tài xế phải chờ ngoài kế hoạch.
- **Lựa chọn A:** cấu hình số phút đến sớm/đón muộn theo trường. Ưu: sát vận hành. Đổi lại: thêm thông số và phải tính lại giờ Trip/điểm dừng.
- **Lựa chọn B:** giữ start/end là giờ xe cần đến/rời trường; trường nhập giờ vận hành thay giờ học chính thức. Ưu: không cần field mới. Đổi lại: phải chốt lại ý nghĩa tên/nhãn, tránh âm thầm đổi semantics API cũ.
- **Đề xuất:** A nếu start/end tiếp tục là giờ học chính thức; chưa chọn số phút mặc định.
- **PO cần quyết định:** start/end là giờ học hay giờ xe? Nếu là giờ học, có khoảng đệm không và bao nhiêu phút?

### SCH-06 — Sửa địa chỉ khác chuyển trường

- **Hiện trạng:** updateLocation cascade hủy plan/chuyến chờ, không phân biệt text-only với tọa độ đổi.
- **Tình huống:** sửa lỗi chính tả tên đường nhưng ghim bản đồ giữ nguyên cũng dẫn đến hủy dịch vụ dự kiến.
- **Ảnh hưởng:** mất tuyến và lịch dù điểm đến thực tế không đổi; di chuyển thật lại cần chuẩn bị phương án mới.
- **Lựa chọn A:** sửa text không đổi tọa độ chỉ cập nhật thông tin; đổi tọa độ cần impact, xác nhận và ngày hiệu lực. Ưu: đúng mức tác động. Đổi lại: cần chốt trường hợp chỉnh ghim nhỏ hoặc đổi cổng.
- **Lựa chọn B:** mọi đổi text/tọa độ đều hủy/tạo lại. Ưu: đơn giản. Đổi lại: nhiều hủy không cần thiết.
- **Đề xuất:** A; không tự đặt ngưỡng mét để bỏ qua tọa độ thay đổi.
- **PO cần quyết định:** có tách text-only không? Đổi tọa độ dù nhỏ có luôn yêu cầu kiểm tra tuyến, hay cho nhà xe xác nhận đó chỉ là sửa ghim?

### SCH-07 — Đổi giờ phải kiểm tra lại phân công

- **Hiện trạng:** updateSchedule sửa giờ Trip nhưng chưa kiểm tra lại xung đột xe/người, chưa đồng bộ đủ giờ điểm trong snapshot; nhánh đã đọc chỉ thông báo hủy, chưa thông báo riêng đổi giờ.
- **Tình huống:** dời chuyến trường A từ 17:00 về 16:00, tài xế đang được gán trường B lúc 16:00; phụ huynh vẫn thấy giờ đón điểm cũ.
- **Ảnh hưởng:** lịch không thực hiện được, thông tin giữa các bên không thống nhất.
- **Lựa chọn A:** tính tác động trước; nếu còn xung đột thì chặn và báo chuyến/nguồn lực cần xử lý, chỉ lưu sau giải quyết; đồng bộ giờ/điểm và thông báo. Ưu: không công bố lịch thiếu khả thi. Đổi lại: phải điều phối trước lưu.
- **Lựa chọn B:** cho lưu lịch trường trước, đánh dấu các chuyến cần điều phối và chặn xuất phát tới khi xử lý. Ưu: ghi nhận quyết định trường sớm. Đổi lại: có trạng thái nghiệp vụ mới và không được hiển thị chuyến như đã sẵn sàng.
- **Đề xuất:** A cho scope đơn giản; không tự hủy chuyến hoặc chọn người thay để né xung đột.
- **PO cần quyết định:** chặn lưu khi xung đột hay cho lưu trạng thái chờ điều phối? Có thông báo đổi giờ tới nhân sự và phụ huynh liên quan không?

### SCH-08 — Hết hạn và khôi phục dịch vụ

- **Hiện trạng:** generation kiểm tra ngày hợp đồng; expiry method chưa thấy nơi gọi; gia hạn không tự phục hồi CANCELLED/EXPIRED.
- **Tình huống:** hợp đồng hết hôm qua, hôm nay ký tiếp; plan cũ đang giữ xe hoặc đã expired, chuyến cũ đã bị hủy.
- **Ảnh hưởng:** có thể giữ nguồn lực không đúng hoặc người dùng tưởng gia hạn là tự có xe trở lại.
- **Lựa chọn A:** đối soát hết hạn tự động; giữ lịch sử/chuyến đang chạy; nguồn lực đang thực thi vẫn được coi bận. Khi ký tiếp phải kiểm tra lại nguồn lực, duyệt phục vụ lại, không tự phục hồi Trip hủy. Ưu: ranh giới rõ. Đổi lại: cần bước kích hoạt lại.
- **Lựa chọn B:** tự phục hồi plan/lịch sau gia hạn nếu hệ thống đánh giá đủ điều kiện. Ưu: ít thao tác. Đổi lại: khó phân biệt hủy do hết hạn hay nguyên nhân khác, dễ phục hồi sai.
- **Đề xuất:** A; gia hạn trước hết hạn theo SCH-02 khác phục hồi sau hết hạn.
- **PO cần quyết định:** tự đối soát hết hạn và bắt buộc kiểm tra/duyệt phục vụ lại khi đã hết hạn có phù hợp không?

### SCH-09 — Lưu thông tin cơ bản và cập nhật một phần

- **Hiện trạng:** modal gọi location → schedule → contract tuần tự; bước sau lỗi không rollback bước trước. Tên được validate nhưng executeSave chưa gửi name.
- **Tình huống:** địa chỉ đã đổi và chuyến đã hủy, cập nhật hợp đồng sau đó lỗi; người dùng tưởng chưa lưu gì. Chỉ sửa tên có thể không ghi gì.
- **Ảnh hưởng:** thử lại tạo tác động ngoài ý định, khó biết thông tin nào đã có hiệu lực.
- **Lựa chọn A:** mỗi nhóm thao tác/lưu riêng, API kết quả rõ; bổ sung API thông tin cơ bản nếu cần. Ưu: tận dụng API cũ. Đổi lại: FE cần chỉnh cách thao tác/hiển thị ở task sau.
- **Lựa chọn B:** thêm API cập nhật kết hợp, kiểm tra toàn bộ trước khi commit dữ liệu DB hoặc không áp dụng; giữ API cũ. Ưu: phù hợp một nút Lưu. Đổi lại: contract/phạm vi xử lý lớn hơn; upload ảnh ngoài DB không tự có transaction chung.
- **Đề xuất:** A cho scope hiện tại, không ép FE đổi ngay; thông báo rõ API-only chưa sửa được toàn bộ UX một nút Lưu.
- **PO cần quyết định:** chọn lưu riêng hay API kết hợp? Đợt này có hỗ trợ sửa tên/ảnh trường không?

### SCH-10 — Chuyến đang chạy có bị đổi theo trường?

- **Hiện trạng:** thao tác đổi trường thường chọn SCHEDULED, nhưng một số nhánh đọc IDs rồi ghi không lặp điều kiện trạng thái; Start đồng thời có thể phá quy tắc giữ chuyến đang chạy. Đích thực tế phải dựa snapshot.
- **Tình huống:** tài xế vừa Start trong lúc admin xác nhận hủy/đổi cơ sở; hoặc xe đang đưa trẻ tới cổng cũ nhưng School đổi tọa độ.
- **Ảnh hưởng:** chuyến đang chạy bị hủy hoặc thông tin đích thay đổi khi chưa bàn giao.
- **Lựa chọn A:** chuyến IN_PROGRESS giữ đích/giờ/roster theo snapshot; cấu hình mới áp dụng chuyến đủ điều kiện khác, ghi dữ liệu kiểm tra lại trạng thái. Trường hợp đích cũ không thể tiếp nhận xử lý điều phối khẩn cấp. Ưu: ổn định, bảo toàn dấu vết. Đổi lại: cần liên hệ ngoài luồng khi khẩn cấp.
- **Lựa chọn B:** cho admin cập nhật đích/lộ trình chuyến đang chạy với thông báo/xác nhận các bên và lịch sử thay đổi. Ưu: xử lý linh hoạt. Đổi lại: thêm workflow điều phối giữa chuyến, rộng hơn cấu hình trường.
- **Đề xuất:** A cho mục 3.2, giữ B ở luồng điều phối cần duyệt riêng.
- **PO cần quyết định:** có thống nhất không sửa tự động chuyến đang chạy khi đổi cấu hình trường không?

### SCH-11 — Trường yêu cầu nhà xe sửa bằng cách nào?

- **Hiện trạng:** SYSTEM_ADMIN sửa; SCHOOL_ADMIN xem; chưa xác nhận có workflow request cấu hình trường.
- **Tình huống:** trường muốn đổi giờ từ tuần sau; đang trao đổi ngoài ứng dụng, không có tiến độ yêu cầu trong hệ thống.
- **Ảnh hưởng:** dễ thất lạc hoặc không rõ ai xác nhận ngày hiệu lực; trao quyền sửa thẳng lại làm nhà xe mất bước kiểm tra điều phối.
- **Lựa chọn A:** trường liên hệ trực tiếp, nhà xe cập nhật sau kiểm tra; không thêm request module. Ưu: gọn và đúng scope hiện tại. Đổi lại: thiếu lịch sử yêu cầu trong ứng dụng.
- **Lựa chọn B:** thêm yêu cầu trường → nhà xe kiểm tra → duyệt/từ chối → áp dụng. Ưu: theo dõi rõ. Đổi lại: cần contract/lưu trữ/thông báo mới và duyệt riêng DB nếu cần.
- **Đề xuất:** A cho giai đoạn này nếu chưa cần quản lý yêu cầu trên hệ thống.
- **PO cần quyết định:** tiếp tục liên hệ trực tiếp hay đưa workflow yêu cầu vào scope đợt này?

## 11. Câu hỏi hội đồng và hướng trả lời

| Câu hỏi | Cách trả lời |
|---|---|
| Có trường rồi sao chưa có chuyến? | Cần nguồn lực/học sinh, phương án được duyệt và sinh Trip đủ điều kiện |
| Tắt trường có dừng xe ngay? | Source hiện chỉ đổi flag; phải chốt ngừng dịch vụ, không dừng chuyến có trẻ giữa đường |
| Gia hạn có phải tạo tuyến lại? | Hiện bị chặn khi còn plan; đây là bất cập cần tách gia hạn với thay đổi dịch vụ |
| Nghỉ bão một ngày? | Chưa có lịch ngoại lệ đầy đủ; không bỏ một thứ khỏi lịch tuần để thay một ngày |
| Đổi giờ sau Ready? | Cần bảo toàn hoặc xác nhận lại; hiện vẫn có thể tác động SCHEDULED đã Ready |
| Sửa tên đường có hủy tuyến? | Source updateLocation hiện cascade; đề xuất phân biệt text/tọa độ |
| Chuyển cơ sở lúc xe đang chạy? | Giữ đích snapshot hoặc quy trình điều phối riêng, không âm thầm đổi hướng |
| Hợp đồng hết hạn có mất lịch sử? | Không nên xóa dữ liệu; dừng phục vụ mới và giữ lịch sử, cơ chế expiry hiện cần hoàn thiện |
| School inactive thì giáo viên có bị logout? | Hiện không; policy đăng nhập/xem lịch sử cần PO chốt ở lifecycle trường |
| Lưu báo lỗi có nghĩa chưa thay đổi gì? | Không, Web đang gọi nhiều API tuần tự; có thể đã áp dụng một phần |

## 12. Giới hạn và verification

Đọc service/controller/DTO trường, schedule validator, edit/add modal, sinh chuyến và tham chiếu routing/readiness. Không chạy script test, typecheck, build, API call hoặc DB/provider; chỉ thay tài liệu. Các ví dụ là minh họa giải thích, không sinh test data. Chưa có quyết định nghiệp vụ mới, không sửa ứng dụng, .env, schema hoặc dependencies.

## 13. Quyết định PO — 30/10/2026

Đã nhận phản hồi đầy đủ SCH-01..11. Các quy tắc sau được PO chỉ định; chưa có phê duyệt schema/field/contract hoặc implementation. Chỗ chưa rõ được giữ nguyên là câu hỏi, không tự ra quyết định.

### SCH-01 — Lên lịch inactive

- Không ngừng hoạt động ngay trong hôm nay. Chọn ngày ngừng, sớm nhất ngày mai và muộn nhất ngày cuối hợp đồng.
- Đến ngày hiệu lực: inactive trường, hủy toàn bộ phương án/chuyến theo yêu cầu PO. Cần chốt phạm vi trạng thái/lịch sử và chuyến còn chạy từ ngày trước trước khi thực hiện.
- Account của trường không được đăng nhập cho tới khi trường active lại; account đang đăng nhập bị logout khi gọi get me. Phạm vi account dự kiến cần xác nhận là SCHOOL_ADMIN/BUS_ATTENDANT, không phải DRIVER của nhà xe hoặc PARENT.
- Parent vẫn xem thông tin học sinh với dữ liệu cũ, không phát sinh nghiệp vụ khác đối với học sinh/trường inactive. Parent có nhiều con phải xét từng trường, không tự khóa cả tài khoản Parent.
- Chưa chốt quyền hủy/đổi ngày inactive trước hiệu lực, quy tắc active lại, xử lý Session khi active lại và thời điểm giới hạn API khác ngoài get me.

### SCH-02 — Gia hạn

- Cho phép khi không có phương án DRAFT/ACTIVE.
- Nếu có DRAFT/ACTIVE: cho phép khi xe/nhân sự được phân công vẫn phù hợp trong thời gian gia hạn.
- Chưa chốt lịch sử từng kỳ hợp đồng, thiếu phân công có được gia hạn hay không, kết quả khi nguồn lực không phù hợp và ngày bắt đầu được giữ/đổi như thế nào. Không tự thêm bảng hợp đồng.

### SCH-03 — Lịch nghỉ và học bù

| Phạm vi | Loại | Quy tắc PO |
|---|---|---|
| Hệ thống, chỉnh trong setting | Cố định hằng năm, âm hoặc dương | Không tạo chuyến vào các ngày này |
| Hệ thống | Không cố định, chỉ định năm, âm hoặc dương | Báo trước khi chuyển qua ngày đó; được hủy trước ngày; đến ngày thì hủy toàn bộ chuyến trong ngày |
| Trường | Cố định hằng năm, âm hoặc dương | Không tạo chuyến vào các ngày này |
| Trường | Không cố định, chỉ định năm, âm hoặc dương | Báo trước khi chuyển qua ngày đó; được hủy trước ngày; đến ngày thì hủy toàn bộ chuyến trong ngày |
| Trường | Học bù | Trường báo trước ngày diễn ra; SYSTEM_ADMIN duyệt |

- Chưa chốt actor tạo/duyệt ngày nghỉ trường (khác học bù đã rõ), thứ tự ưu tiên học bù với ngày nghỉ, xử lý Trip đã sinh cho nghỉ cố định vừa thêm, trường hợp hủy lịch nghỉ có sinh lại Trip hay không.
- Âm lịch: chưa chọn cách lưu/đổi lịch, quy tắc tháng nhuận, ngày 30 ở tháng thiếu, giờ/múi giờ hiệu lực hoặc thư viện. Không tự cài package hay tạo schema mới.
- Học bù là ngoại lệ cần duyệt được PO yêu cầu; không suy diễn SCH-11=A thành bỏ luồng duyệt học bù.

### SCH-04 — Lịch mới

- Chỉ áp dụng từ sau hôm nay đến hết hợp đồng, không ảnh hưởng hôm nay.
- Chưa tự chọn field/ngày hiệu lực mặc định; cần xử lý Ready sớm trên Trip tương lai nếu hệ thống có thể xảy ra và ranh giới chuyến quá khứ.

### SCH-05 — Giờ vận hành

- Giữ cách cũ: giờ cấu hình là giờ vận hành trường cần học sinh đến. Không thêm khoảng đệm trước/sau bằng field mới trong mục này.
- Giữ cách tính hai chiều hiện tại; chưa có quyết định riêng thay giờ chiều về.

### SCH-06 — Địa chỉ text/tọa độ

- PO yêu cầu giữ cách cũ do text đã tương ứng tọa độ; không triển khai nhánh tự miễn tác động cho sửa text.
- Việc được phép đổi địa điểm và chọn ngày sẽ theo SCH-10 mới hơn; không tự giữ cascade hủy cũ nếu điều kiện đổi mới chỉ cho khi không còn DRAFT/ACTIVE.

### SCH-07 — Nguồn lực riêng theo trường

- PO khẳng định xe và tài xế chỉ phục vụ một trường trong giai đoạn hợp đồng nên không có tình huống trùng giữa hai trường như ví dụ đã nêu.
- Không tiếp tục dùng ví dụ giữa trường làm lý do mở rộng điều phối giờ. Đây vẫn là invariant cần bảo toàn khi gia hạn/giải phóng/phân công lại.
- Không suy diễn rằng cùng trường không thể trùng hai chuyến hoặc giáo viên có cùng quy tắc nếu chưa đối chiếu/chốt. Đồng bộ giờ điểm dừng/snapshot và thông báo đổi giờ chưa được quyết định riêng bởi câu trả lời này.

### SCH-08 — Hết hạn về DRAFT và giải phóng

- Tự động giải phóng xe, tài xế, giáo viên khi hết hợp đồng.
- Không cần CANCELLED phương án; có thể chuyển thành DRAFT. Muốn dùng lại phải phân công lại.
- Cần tối ưu: DRAFT hiện có ý nghĩa giữ nguồn lực. DRAFT sau hết hạn phải thật sự không còn giữ xe/người; không thể chỉ đổi status. Cần chốt xóa assignment trên Route và xử lý nhóm draft này khi kiểm tra readiness/đổi địa điểm/gia hạn.
- Trip lịch sử phải được tách khỏi default assignment của Route. Chưa quyết định xóa hay sửa bất kỳ phân công Trip lịch sử nào.

### SCH-09 — Thông tin cơ bản/lưu riêng

- PO đồng ý A: lưu riêng từng nhóm, kết quả rõ. Không thêm API lưu kết hợp nguyên tử mặc định.
- Chưa có xác nhận riêng phạm vi sửa tên/ảnh; không tự thêm field/upload endpoint từ lựa chọn A.
- Scope vẫn API; sửa trải nghiệm FE cần task riêng nếu được yêu cầu.

### SCH-10 — Đổi địa điểm có điều kiện/ngày hiệu lực

- Chỉ đổi khi không có phương án DRAFT/ACTIVE; nếu được thì cho chọn thời gian đổi địa điểm.
- PO yêu cầu tối ưu luồng này; chưa phê duyệt giải pháp cụ thể.
- Cần giải quyết mâu thuẫn: hết hạn chuyển về DRAFT theo SCH-08 sẽ chặn đổi địa điểm nếu kiểm tra status đơn thuần. Cần chốt điều kiện dựa trạng thái hay giữ nguồn lực.
- Cần chốt kiểm tra điều kiện khi đặt lịch và khi đến ngày; có cho tạo phương án mới giữa hai mốc không; ngày đổi tối thiểu/tối đa; khi điều kiện không còn đúng thì hoãn/từ chối/hủy lịch hay xử lý khác.
- Chưa coi là quyền đổi đích Trip IN_PROGRESS; cần tách điều phối khẩn cấp, bảo toàn snapshot và xác nhận xử lý ngoại lệ.

### SCH-11 — Liên hệ trực tiếp

- PO chọn A: trường liên hệ nhà xe trực tiếp để sửa cấu hình, chưa thêm workflow request cấu hình tổng quát.
- Ngoại lệ học bù ở SCH-03 vẫn có trường báo trước và SYSTEM_ADMIN duyệt theo yêu cầu cụ thể.

## 14. Điểm cần làm rõ tiếp theo

1. Phạm vi hủy khi inactive/nghỉ: giữ COMPLETED/CANCELLED lịch sử? Với Trip còn IN_PROGRESS từ ngày trước thì bảo toàn và báo điều phối hay vẫn hủy? Đề xuất giữ lịch sử và chuyến còn vận hành, chỉ hủy SCHEDULED thuộc khoảng dịch vụ ngừng.
2. DRAFT sau hết hạn: đề xuất xóa default vehicle/driver/attendant assignment, giữ tuyến/điểm để tái sử dụng, bắt buộc phân công và trường duyệt lại. Đổi địa điểm nên bỏ qua draft không giữ nguồn lực hay phải hủy draft này? Chờ PO chọn; không tự thêm enum trạng thái.
3. Lịch âm/dương: actor ngày nghỉ trường; ưu tiên học bù; tháng nhuận/ngày không tồn tại; hiệu lực và hủy ngày nghỉ khi đã có Trip. Chưa thiết kế dữ liệu.
4. Inactive theo ngày và tương tác API: cần cơ chế chặn nghiệp vụ theo trường ở phía API, không chỉ chờ FE gọi me; tránh account bị chặn login nhưng token cũ vẫn mutate. Đề xuất chặn API tác nghiệp từ thời điểm hiệu lực và trả me phù hợp FE; chưa tự đổi status/payload/token lifecycle.
5. Đổi địa điểm: đề xuất kiểm tra cả lúc lên lịch và áp dụng, có bước kiểm tra lại trước mọi plan mới trong khoảng chờ; còn cần quyết định ranh giới thời gian và cách xử lý xung đột.
6. SCH-07 giải quyết ví dụ giữa trường, chưa chốt thông báo đổi giờ và đồng bộ stop timing; SCH-09 chưa chốt sửa tên/ảnh. Cần hỏi khi chuẩn bị contract để không tự chọn field/default.

Các quyết định trên chỉ lưu tài liệu. Không test script, code/API/.env/schema/migration/dependency thay đổi; không tạo hoặc sửa dữ liệu.

## 15. Quyết định bổ sung PO — 02/11/2026

### 15.1. Hết hợp đồng và đổi địa chỉ

- Hết hợp đồng **chỉ giải phóng nguồn lực**, không thay đổi thông tin, kể cả lộ trình cũ. Không tự chuyển phương án về DRAFT/CANCELLED/EXPIRED hoặc xóa các phân công đã lưu chỉ để giải phóng.
- Quyết định này thay thế đề xuất về DRAFT/xóa assignment ở các mục trước. Cần thiết kế tách ý nghĩa tham chiếu phân công được lưu với việc nguồn lực còn bị giữ theo hợp đồng; không tự thêm field/bảng.
- Gia hạn phải kiểm tra lại nguồn lực trên thời gian gia hạn, không hiểu assignment cũ còn nguyên là nguồn lực vẫn sẵn có. Cần chốt thêm trường hợp hợp đồng hết trước khi Trip cuối thực sự kết thúc.
- Đổi địa chỉ trường giữ nghiệp vụ **hủy toàn bộ phương án**, không áp dụng lựa chọn giữ draft không có nguồn lực rồi dùng lại lộ trình mà không hủy.
- Chưa tự suy diễn PO đã bỏ điều kiện trước đây “không có DRAFT/ACTIVE” khi đặt lịch đổi địa chỉ. Điều kiện đó và cascade hủy mọi phương án còn mâu thuẫn nếu hiểu tuyệt đối; cần hỏi khi tối ưu luồng. Không đụng lịch sử Trip COMPLETED/snapshot theo 15.2.

### 15.2. Chuyến lịch sử và chuyến đang thực hiện

- PO xác nhận giữ lịch sử chuyến COMPLETED.
- Trip IN_PROGRESS và chiều về SCHEDULED nhưng giáo viên đã điểm danh vẫn **chưa chốt**. Không đánh dấu đồng ý tự hủy hoặc bảo toàn các trường hợp này.
- Chiều về có PRESENT và chưa alightedAt nghĩa đã ghi nhận học sinh lên xe dù tài xế chưa Start. Không thể dùng status SCHEDULED để tự kết luận chưa bắt đầu trách nhiệm đưa đón.
- Chỉ Ready, chưa điểm danh; đã điểm danh toàn ABSENT; có PRESENT trên xe là ba trường hợp cần phân biệt. Dữ liệu điểm danh có thể sai, nhưng phải điều chỉnh qua quy trình hợp lệ, không âm thầm đổi PRESENT/ABSENT để cho phép hủy.

**Phương án đề xuất để PO xem xét, chưa phê duyệt:**

| Tình huống ở thời điểm hiệu lực | Cách xử lý đề xuất |
|---|---|
| COMPLETED/CANCELLED lịch sử | Giữ nguyên |
| SCHEDULED chưa Ready/chưa điểm danh | Hủy theo phạm vi dừng/nghỉ/đổi địa điểm đã chốt |
| SCHEDULED chỉ Ready hoặc toàn ABSENT, không có học sinh PRESENT | Cho hủy có lý do, giữ nguyên log/điểm danh, thông báo người vận hành |
| SCHEDULED có PRESENT chưa xuống xe | Không tự hủy. Chờ nhà xe/trường xác nhận tiếp tục chuyến theo lộ trình cũ hoặc bàn giao học sinh; giữ trách nhiệm giám sát |
| IN_PROGRESS | Không tự hủy/đổi đích/điểm danh. Giữ lộ trình cũ và thông báo điều phối; nếu đích cũ không tiếp nhận thì xử lý điều phối khẩn cấp riêng |

Phụ thuộc bắt buộc: nếu trường inactive chặn account SCHOOL_ADMIN/BUS_ATTENDANT ngay, giáo viên có Trip cần hoàn tất sẽ không điểm danh xuống xe được. Cần PO chọn ngoại lệ tạm chỉ cho thực hiện chuyến đang xử lý, hoặc hoãn áp dụng chặn tài khoản/hoàn tất inactive tới khi bàn giao. Không tự mở ngoại lệ hoặc hoãn ngày hiệu lực. Ngày nghỉ thông thường không đồng nghĩa khóa account; không gộp hai chính sách.

### 15.3. Học bù và ngày nghỉ

- **Không cho học bù vào ngày nghỉ cố định của hệ thống.** Đây là chặn bắt buộc, không có override bằng phê duyệt SYSTEM_ADMIN.
- Nếu là ngày nghỉ của trường thì **cho phép học bù**, vì đây là quyết định của trường. Giữ điều kiện trường báo trước và SYSTEM_ADMIN duyệt từ quyết định trước.
- Quyết định này thay thế đề xuất ở chat/mục 14 cho phép SYSTEM_ADMIN xác nhận riêng để vượt ngày nghỉ hệ thống cố định.
- PO mới nói rõ ngày nghỉ hệ thống **cố định**. Học bù trùng ngày nghỉ hệ thống không cố định/chỉ định năm vẫn chưa chốt, không tự áp dụng quy tắc override hay cấm tương tự.

Chỉ cập nhật tài liệu. Chưa có thay đổi source/DB/API/env hoặc script test; các giải pháp ở 15.2 là đề xuất chờ PO.

## 16. Điều chỉnh hết hợp đồng và giải thích chuyến qua ngày — 02/11/2026

- **PO chốt lại:** hết hợp đồng coi như hủy các phương án cũ, đồng thời giải phóng nguồn lực. Không giữ ACTIVE/DRAFT để tự dùng tiếp. Quyết định này thay thế ý kiến trước về không đổi thông tin/trạng thái phương án khi hết hạn; không suy diễn cho phép xóa tuyến/điểm hoặc sửa lịch sử Trip COMPLETED.
- Câu hỏi PO về chuyến chưa hoàn thành kéo dài qua ngày là yêu cầu giải thích, chưa chấp thuận ngoại lệ tài khoản A hoặc chính sách hủy Trip IN_PROGRESS.
- Ràng buộc chọn ngày từ ngày mai tránh tác động chủ động lên lịch hôm nay nhưng không bảo đảm tới 00:00 mọi Trip cũ đã terminal. Có thể chuyến đã kết thúc ngoài thực tế mà người vận hành quên bấm Complete, chưa xác nhận đủ xuống xe hoặc gián đoạn thiết bị/mạng. Trường hợp còn vận hành thực qua mốc ngày là ngoại lệ cần điều phối, không phải khẳng định hệ thống hỗ trợ tuyến qua đêm thông thường.
- Không có runtime evidence cho thấy đã xảy ra chuyến qua ngày tại môi trường này; đây là tình huống cần quy tắc xử lý. Không tự coi IN_PROGRESS cũ là COMPLETED, không suy từ thiếu thao tác thành học sinh còn trên xe hoặc đã xuống an toàn.
- Chưa chốt giữ chuyến/khóa tài khoản/hoãn inactive/giải phóng tài nguyên đang thực chạy. Tách hủy phương án nguồn với Trip đã sinh và trách nhiệm bàn giao.

## 17. Chuyến chưa hoàn thành do admin chốt — 02/11/2026

- **PO quyết định:** các chuyến chưa hoàn thành giữ nguyên trạng thái; admin là người chốt trạng thái cuối cùng để tránh phát sinh nghiệp vụ khác. Không tự chuyển COMPLETED/CANCELLED vì qua ngày hoặc tới thời điểm lifecycle.
- Quyết định này chốt hướng xử lý các chuyến ngoại lệ đang bàn tại mục 15.2/16 (chuyến đang chạy hoặc chiều về đã điểm danh chưa hoàn thành); không tự mở rộng thành giữ mọi Trip SCHEDULED tương lai của trường inactive/ngày nghỉ, vì các Trip chưa vận hành đó đã có yêu cầu hủy riêng. Ranh giới tập chuyến cần thể hiện rõ khi thiết kế.
- Hủy phương án nguồn khi hết hợp đồng không tự làm mất hoặc đổi trạng thái các Trip ngoại lệ đã sinh; lịch sử COMPLETED tiếp tục giữ nguyên.
- Chưa chốt admin nào có quyền (SYSTEM_ADMIN/SCHOOL_ADMIN), tập trạng thái cuối được chọn, yêu cầu lý do/bằng chứng, xử lý học sinh PRESENT chưa alightedAt, tác động thông báo/báo nghỉ/sự cố và quyền thao tác của nhân sự trong thời gian chờ.
- Chưa tự coi admin chốt COMPLETED là được tạo thời gian xuống xe hoặc điểm danh giả; nếu không đủ thông tin phải thể hiện rõ thay vì suy ra đã bàn giao an toàn.
- Chưa chốt tài nguyên giữ/busy trong thời gian Trip thật còn chạy nhưng hợp đồng/plan đã hết. Quyết định giữ trạng thái không tự chứng minh nguồn lực đã sẵn sàng cho phân công mới.
- Khi lên contract, ưu tiên API admin chốt riêng, giữ API driver complete và payload cũ. Đây là hướng đề xuất cần duyệt, chưa tự chọn field/endpoint/status.
- Chưa triển khai code hoặc xác minh runtime. Không script test, DB/API/env changes.

## 18. Trạng thái triển khai 03/11/2026

Source cho nghiệp vụ 3.2 đã triển khai sau các quyết định cuối của PO; trạng thái IMPLEMENTED, chưa VERIFIED. Xem checklist P1–P6 tại [kế hoạch mục 17](school-api-improvement-plan.md#17-triển-khai-sau-phê-duyệt--03112026), [note FE](school-3.2-fe-pr-notes.md) và LATEST.md. Các phần NEEDS_DECISION/DRAFT/hết hạn về DRAFT ở trên là lịch sử đã được thay thế. Migration chưa apply; chưa nghiệm thu runtime, không test scripts.
