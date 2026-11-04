# RoadToSchool — Kế hoạch tổng thể cải thiện nghiệp vụ 3.4–3.18

> Bản làm việc chung, cập nhật 04/11/2026 (Asia/Saigon). Phiên bản 1.0 — ĐÃ HOÀN TẤT PHÂN TÍCH VÀ PHÊ DUYỆT TOÀN BỘ CÁC QUYẾT ĐỊNH NGHIỆP VỤ 3.4–3.18 (BUSINESS_APPROVED).
> Chế độ PLANNING. Tạo tài liệu không phải phê duyệt triển khai. Không sửa application code, schema, env; không migrate, gọi provider hoặc chạy script test trong task này.
> Đây là **file chính duy nhất** cho các quyết định/kế hoạch tiếp theo thuộc 3.4–3.18. Tracker chỉ ghi trạng thái và trỏ tới file này; không tách mỗi mục thành một plan riêng khi chưa có yêu cầu của PO.

## A. Cách dùng và cập nhật file

### A1. Ý nghĩa trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| ANALYZED | Đã mô tả hiện trạng, vấn đề và hướng xử lý; chưa duyệt nghiệp vụ |
| NEEDS_DECISION | Có câu hỏi cần PO quyết định trước khi thiết kế/triển khai phần phụ thuộc |
| BUSINESS_APPROVED | PO đã chốt nghiệp vụ; field/contract/schema có thể vẫn còn chờ |
| CONTRACT_APPROVED | PO đã duyệt input/output/errors/schema cụ thể của phạm vi tương ứng |
| IN_PROGRESS | Đã được yêu cầu triển khai và đang thực hiện |
| IMPLEMENTED | Có source và bằng chứng commit/file; chưa đủ bằng chứng nghiệm thu |
| VERIFIED | Tiêu chí nghiệp vụ đã được kiểm chứng với bằng chứng được phép |
| DEFERRED / OUT_OF_SCOPE | PO đã quyết định hoãn hoặc loại khỏi đợt này |

Mỗi quyết định dùng ID cố định `D34-01` … `D318-02`; quyết định dùng chung là `G-01` … `G-04`. Field dự kiến có ID `F34` … `F318`. Không đổi ID khi đổi lựa chọn. “Đề xuất A” trong tài liệu này luôn là đề xuất **chưa được PO phê duyệt**, trừ khi cột kết quả đã ghi rõ quyết định PO.

### A2. Quy trình cho mỗi lần PO cập nhật nghiệp vụ

1. Xác định ID/mục được thay đổi; nếu phản hồi chưa chỉ rõ thì đối chiếu nội dung, chỉ hỏi lại khi ảnh hưởng nhiều cách hiểu.
2. Ghi nguyên ý PO vào bảng quyết định ngay trong mục; điền ngày, trạng thái, nội dung thay thế và ID liên quan.
3. Sửa lại **phương án hiện hành** của mục đó, API/field dự kiến, ràng buộc dữ liệu, tiêu chí nghiệm thu và phụ thuộc. Không chỉ nối thêm một đoạn cuối khiến thân plan vẫn sai.
4. Cập nhật ma trận chung C, registry contract S, trình tự triển khai T và nhật ký W trong chính file này.
5. Nếu quyết định làm mất hiệu lực mục khác, đánh dấu mục đó cần rà lại, nêu cụ thể; không tự chọn nghiệp vụ thay PO.
6. Chỉ đánh dấu IMPLEMENTED khi source tồn tại và đối chiếu được. Không suy diễn một câu “đồng ý” cho nhiều field hoặc toàn bộ schema chưa trình.

Đầu ra cuối là cùng file này ở phiên bản BUSINESS/CONTRACT_APPROVED cho các phần in scope, có danh sách DEFERRED/OUT_OF_SCOPE rõ ràng. Không coi bản v0.1 là “plan đã chốt để code toàn bộ”.

## B. Nền tảng và phạm vi đã chốt

- Một nhà xe, một bãi trung tâm, nhiều trường; năm role cố định. BUS_ATTENDANT là giáo viên phụ xe. Tài khoản riêng theo role, không gộp hai role một người dùng.
- SYSTEM_ADMIN lập phương án/điều phối xe, tài xế; SCHOOL_ADMIN gán giáo viên và **duy nhất duyệt DRAFT → ACTIVE**. Trường vẫn liên hệ trực tiếp nhà xe khi đổi cấu hình; không tự thêm workflow yêu cầu chung.
- 3.1 đã có code tại `fefe0e6`; 3.2 tại `de2e301`; 3.3 tại `d0b4063`. Đây là baseline source cho plan này. Migration 3.2 đã được xác minh ở task trước; báo cáo 3.3 ghi migration thứ 16 đã apply, task này không truy vấn lại DB.
- 3.2: lịch trường/ngừng hoạt động/đổi địa điểm từ ngày mai, không đổi hôm nay; lịch âm/dương/ngày nghỉ/học bù; nghỉ nhà xe chặn học bù; hiệu lực tính theo ngày và đối soát bù; hết hợp đồng hủy phương án cũ, không khóa account đơn thuần vì hết hạn.
- 3.2: COMPLETED lịch sử giữ nguyên; IN_PROGRESS hoặc SCHEDULED đã có điểm danh thuộc sự kiện lifecycle giữ trạng thái chờ admin chốt, giữ bận nguồn lực. Chốt hành chính không tạo alightedAt/điểm danh giả. Parent giữ liên kết và lịch sử sau inactive, không tự unlink.
- 3.3: xe isActive; inactive xe/nhân sự có bàn giao nguyên tử theo điều kiện đã duyệt; không bàn giao khi IN_PROGRESS; đổi bãi theo effectiveDate, plan cần tối ưu lại; re-optimize từng tuyến, giữ học sinh/xe, toàn bộ thành công hoặc không lưu, sau đó về DRAFT chờ trường duyệt. Không đề xuất lại chia cụm hoặc nhét biển số vào tên tuyến.
- Xe/tài xế phục vụ một trường trong giai đoạn hợp đồng theo quy tắc đã chốt. Plan này không tự mở chia ca phục vụ nhiều trường.
- Phạm vi cải thiện dự kiến vẫn **API**; Web/Mobile được mô tả để FE hiểu thao tác cần tích hợp, chưa có quyền viết UI. Không đánh giá performance hoặc bảo mật trong tài liệu này; các kiểm tra role/scope được nêu vì là trách nhiệm nghiệp vụ.
- Giữ payload cũ, ưu tiên thêm field/API mới. Mọi field phân vân phải trình PO; không tự thêm enum/model/default. Không cài package, đổi env hoặc chạy test scripts khi chưa được phép riêng theo quy tắc hiện hành.

## C. Ma trận tiến độ và phụ thuộc

| Mục | Nội dung | Phân tích | Quyết định PO mới | Phụ thuộc chính |
|---|---|---|---|---|
| 3.4 | Học sinh và phụ huynh | ANALYZED | D34-01/02: APPROVED (04/11) | 3.1–3.2; 3.12, 3.14, 3.15 |
| 3.5 | Tạo phương án | ANALYZED | D35-01/02: APPROVED (04/11) | 3.3; 3.6–3.7 |
| 3.6 | Phân công và duyệt | ANALYZED | D36-01/02: APPROVED (04/11) | 3.3, 3.5, G-01/G-02 |
| 3.7 | Sinh chuyến và lịch | ANALYZED | D37-01/02: APPROVED (04/11) | 3.2–3.3, G-01, 3.15–3.16 |
| 3.8 | Đổi phân công Trip | ANALYZED | D38-01/02: APPROVED (04/11) | 3.3, 3.6, G-02, 3.13/3.17 |
| 3.9 | Chiều đến trường | ANALYZED | D39-01/02: APPROVED (04/11) | G-02, 3.10, 3.12 |
| 3.10 | Chiều về | ANALYZED | D310-01/02: APPROVED (04/11) | 3.9, 3.12, 3.17 |
| 3.11 | Theo dõi và lịch sử | ANALYZED | D311-01/02: APPROVED (04/11) | 3.9–3.10, 3.16 |
| 3.12 | Học sinh báo nghỉ | ANALYZED | D312-01/02: APPROVED (04/11) | 3.4, G-02, 3.7/3.9/3.10 |
| 3.13 | Nhân sự báo nghỉ | ANALYZED | D313-01/02: APPROVED (04/11) | 3.3, G-02, 3.8/3.17 |
| 3.14 | Yêu cầu đổi thông tin/địa chỉ | ANALYZED | D314-01/02: APPROVED (04/11) | 3.4, G-01/G-02, 3.6/3.15 |
| 3.15 | Chèn học sinh/ngừng phục vụ | ANALYZED | D315-01/02: APPROVED (04/11) | G-01/G-02, 3.4/3.5/3.7 |
| 3.16 | Hủy/chuyển tiếp phương án | ANALYZED, lifecycle đã có ở 3.2 | D316-01/02: APPROVED (04/11) | 3.2–3.3, G-02, 3.7/3.15 |
| 3.17 | Sự cố và điều phối | ANALYZED | D317-01/02: APPROVED (04/11) | 3.3, G-02, 3.8/3.13 |
| 3.18 | Tổng quan và thông báo | ANALYZED, inbox đã có | D318-01/02: APPROVED (04/11) | G-03/G-04, kết quả các mục trên |

## D. Quyết định dùng chung — cần thống nhất một lần

| ID | Vấn đề, tình huống và tác động | Đề xuất A | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| G-01 | Chèn/đổi địa chỉ học sinh lúc đã sinh Trip 7 ngày: áp dụng từ ngày nào và có sửa các Trip đó không? Nếu chỉ đổi Route, ngày mai có thể vẫn đón chỗ cũ/thiếu học sinh. Ảnh hưởng 3.7/3.14/3.15. | Thay đổi dịch vụ học sinh có ngày hiệu lực; đề xuất từ ngày mai, trong hợp đồng; đồng bộ Trip chưa vận hành từ ngày đó. Đây là **đề xuất cho học sinh**, không tự mở rộng phê duyệt effectiveDate của School. | Giữ chỉ áp dụng Trip được tạo sau; phải công bố rõ ngày đầu thực sự phục vụ và chấp nhận khoảng trống hoặc quy trình sinh lại riêng. | **CHỐT (03/11/2026)**: Đồng bộ lại Trip cho ngày mai ngay từ thời điểm duyệt thay vì đợi hệ thống chạy cronjob cập nhật. |
| G-02 | “Chưa vận hành” trong chỉnh tuyến/phân công không đồng nghĩa status=SCHEDULED: chiều về có thể đã nhận trẻ. Lifecycle 3.2 cho hủy Ready/toàn UNMARKED nhưng không tự có cùng quyền với đổi roster. | Với chỉnh roster/địa chỉ/phân công: coi Ready, có điểm danh hoặc IN_PROGRESS là frozen; chỉ có quy trình điều phối được duyệt mới thay. Giữ nguyên ma trận lifecycle 3.2, không sửa nó theo định nghĩa này. | Cho sửa một số trường sau Ready khi toàn UNMARKED, cần liệt kê thao tác nào và ai xác nhận lại. | **CHỐT (03/11/2026)**: Làm theo Phương án A (Coi Ready, có điểm danh hoặc IN_PROGRESS là FROZEN; khóa cứng toàn bộ việc sửa danh sách học sinh, điểm đón, phân công). |
| G-03 | Thông báo đã đọc, gửi SMTP/push thành công và người đã nhận việc là ba sự kiện khác nhau. Có cần receipt/acknowledgement người dùng không? | Giữ inbox/push hiện có; chỉ trạng thái nghiệp vụ quyết định hoàn tất. Chưa thêm nút nhận việc/đồng ý thay đổi hàng loạt. | Thêm xác nhận nhận việc cụ thể cho các trường hợp được chọn; cần duyệt actor/cutoff/trường lưu. | **CHỐT (03/11/2026)**: Đồng ý Đề xuất A (Giữ inbox/push hiện có; trạng thái phân công có hiệu lực ngay khi lưu, không bắt buộc nút nhận việc/receipt riêng trên mobile). |
| G-04 | Đồng bộ một thay đổi ảnh hưởng nhiều tuyến/chuyến: có được thành công một phần không, FE cũ nhận kết quả gì? | Các mutation một phạm vi dịch vụ: kiểm tra lại preview/trạng thái khi lưu, hoặc tất cả thành công hoặc từ chối 409, không báo success với phần thất bại bị che. Bulk nghiệp vụ mới nếu duyệt phải báo kết quả từng phần rõ. | Cho phép partial cho từng nghiệp vụ được chỉ định, nhưng cần body/response mới và quy tắc retry. | **CHỐT (03/11/2026)**: Đồng ý Đề xuất A (Cơ chế All-or-Nothing: tất cả cùng thành công hoặc từ chối rollback toàn bộ, không có partial success che giấu lỗi). |

Không lấy các ví dụ “5 phút”, “ngày mai” hay ngưỡng GPS ở phần đề xuất làm cấu hình mới đã duyệt. Source hiện có ngưỡng nào thì ghi là hiện trạng; đổi ngưỡng phải có ID quyết định.

## 3.4. Học sinh và phụ huynh — WF-04

**Đối tượng:** SCHOOL_ADMIN quản lý hồ sơ; PARENT liên kết/xem con; SYSTEM_ADMIN tham gia khi thay đổi tác động tuyến. **Dữ liệu:** Student N:1 School; ParentStudentLink nối N:N User–Student; OtpChallenge gắn Student/User; StudentUpdateRequest lưu đề xuất. TripAttendance thuộc Trip độc lập với liên kết phụ huynh.

### Luồng nhỏ và API hiện có

1. **Tạo hồ sơ:** trường mở danh sách học sinh → thêm thông tin/số giám hộ/địa chỉ → POST `/schools/:schoolId/students` → xem GET danh sách/chi tiết cùng nhóm. Trường sở hữu hồ sơ; phụ huynh không tự tạo học sinh.
2. **Liên kết:** phụ huynh mở “Liên kết con” → nhập mã → POST `/parents/link-requests` → OTP tới guardianPhone → POST `/parents/verify-link` → GET `/parents/students`, `/parents/students/:id`. Student/trường không hoạt động chặn liên kết mới.
3. **Ngừng theo dõi:** phụ huynh chọn hủy liên kết → DELETE `/parents/students/:id`. Đây là xóa liên kết ứng dụng, không tự đổi Student/roster hay xóa lịch sử Trip. Giữ quyết định 3.2 không tự unlink khi inactive/hết hợp đồng.
4. **Thay thông tin:** phụ huynh yêu cầu qua 3.14; mất số giám hộ liên hệ trường theo quyết định 3.1. Không tạo thêm luồng OTP tới số cũ làm điều kiện bắt buộc giải quyết trường hợp mất số.

### Vấn đề và phương án

- Source kiểm trùng theo cặp parentId–studentId, không biểu diễn người giám hộ chính/phụ hoặc giới hạn số người theo dõi. Ví dụ bố và mẹ cùng liên kết hợp lệ nhưng một người báo nghỉ, người kia muốn rút. **Đề xuất:** giữ nhiều liên kết hiện có, trách nhiệm gửi/rút đơn xử lý ở 3.12; không tự thêm role giám hộ mới.
- guardianPhone thay đổi không đồng nghĩa mọi liên kết hiện có sai, nhưng nếu trường xác nhận nhầm người thì cần cách dừng quyền theo dõi. Chưa có policy chung cho thay số/chuyển quyền; không tự xóa các link lịch sử.
- Student.schoolId là trường hiện tại, không có enrollment theo năm trong schema. Chuyển trực tiếp schoolId có thể khiến lịch sử bị hiểu là chuyến thuộc trường mới. **Đề xuất:** chưa hỗ trợ chuyển trường trực tiếp bằng sửa hồ sơ; chốt mô hình trước khi thiết kế endpoint.

| ID | Cần chốt chi tiết | Đề xuất A và tác động | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| D34-01 | Đổi số giám hộ do mất số/đổi người: các phụ huynh đã liên kết còn xem được không? Ví dụ số cũ thuộc người không còn chăm sóc trẻ. | Đổi số giữ link hiện có; trường có thao tác riêng xử lý liên kết sai theo xác minh, có lý do; không thu hồi tất cả chỉ từ đổi số. Cần duyệt API/audit cho thao tác riêng. | Bắt buộc xác minh lại hoặc thu hồi các link theo nhóm trường chọn, cần quy tắc giữ lịch sử và thông báo. | **CHỐT (04/11/2026)**: Theo Đề xuất A (Đổi số giữ nguyên liên kết hiện có; School Admin có thao tác riêng thu hồi liên kết sai sau khi xác minh kèm lý do audit. Không phân cấp phụ huynh chính/phụ, quyền hạn bình đẳng). |
| D34-02 | Chuyển trường/năm học: giữ cùng Student ID hay tạo hồ sơ dịch vụ mới? | Trong đợt này giữ quản lý trong một trường; chuyển trường/năm học đầy đủ DEFERRED nếu PO đồng ý, không thêm schema enrollment ngay. | Làm ngay: phải chốt ngày chuyển, mã học sinh/link phụ huynh, đối chiếu hồ sơ cũ/mới và lịch sử Trip trước schema. | **CHỐT (04/11/2026)**: Không chuyển trường (Giữ quản lý học sinh trong phạm vi một trường duy nhất, không thêm schema chuyển trường). |

**API/field dự kiến F34:** không sửa link/Student schema chỉ để dự phòng. Nếu D34-01 chọn A cần contract thao tác trường thu hồi liên kết và audit (ID đối tượng, lý do, người/thời điểm), chưa chọn tên field hoặc URL chính thức. Địa chỉ và guardianPhone vẫn giữ field cũ.

**Còn thiếu/ngoài phạm vi đề xuất:** xung đột quyền giám hộ xử lý theo xác minh của trường; phần mềm không tự phân xử. Không đưa sổ hộ tịch/giấy ủy quyền pháp lý vào scope. **Hội đồng:** “Nhập được mã có tự xem được trẻ không?” → còn OTP số giám hộ và liên kết hợp lệ; “Đổi số có mất lịch sử?” → cần phân biệt hồ sơ, quyền truy cập và roster, không dùng đổi số để xóa lịch sử.

**Tiêu chí nghiệm thu:** hai Parent cùng con không tạo trùng link; unlink không làm biến đổi chuyến; thay guardianPhone không tự đổi trạng thái dịch vụ; lịch sử con/trường cũ không bị gán sang trường mới. Chỉ thực hiện các ca sau khi policy tương ứng được duyệt.

**Bằng chứng:** [parents.service.ts](../../api/src/parents/parents.service.ts) `requestLinkOtp`, `verifyLinkOtp`, `unlinkStudent`; [students.service.ts](../../api/src/students/students.service.ts) `createStudent`; [schema](../../api/prisma/schema.prisma) Student/ParentStudentLink. Trạng thái: ANALYZED / NEEDS_DECISION.

## 3.5. Tạo phương án — WF-05

**Đối tượng:** SYSTEM_ADMIN tạo, SCHOOL_ADMIN nhận kết quả để duyệt ở 3.6. **Dữ liệu:** School/Vehicle/Student → RoutePlan 1:N Route → RouteStop gắn Student; SystemSetting cho bãi. DRAFT và ACTIVE giữ nguồn lực theo quy tắc hiện có.

### Luồng nhỏ và API hiện có

1. Mở tạo phương án → chọn trường → GET `/routes/preparation/:schoolId`: học sinh đủ/không đủ điều kiện, xe khả dụng.
2. Chọn học sinh/xe/ràng buộc → POST `/routes/optimize-preview`: xem hai chiều, học sinh chưa được phục vụ và tuyến trên bản đồ.
3. Điều chỉnh bỏ tuyến về → POST `/routes/preview/cancel-return`; source kiểm tra không tạo tuyến đi rỗng.
4. Xác nhận → POST `/routes/confirm-plan`: tạo DRAFT. Đây chưa phải dịch vụ đã được trường chấp thuận hoặc đã có Trip.
5. Nếu đổi bãi cần tối ưu lại, dùng `/routes/route-plans/:id/re-optimize` của 3.3; giữ học sinh/xe theo tuyến, không thay bằng tối ưu gom cụm mới trong plan này.

### Vấn đề và phương án

- “Tối ưu thành công” có thể vẫn có học sinh chưa được phục vụ. **Đề xuất:** hiển thị coverage và lý do không xếp được; khi xác nhận không diễn đạt thành toàn trường đã có xe.
- Điểm tọa độ có đường đi được chưa chứng minh điểm dừng phù hợp đón trẻ. Đây là quyết định vận hành, không phải lỗi thuật toán cần tự thêm geofence.
- Giới hạn thời gian toàn tuyến không phải thời gian ngồi xe tối đa của từng trẻ. 3.3 đã chốt hai ràng buộc re-optimize; không âm thầm thêm bài toán mới làm vỡ luồng đó.

| ID | Cần chốt chi tiết | Đề xuất A và tác động | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| D35-01 | Có 100 học sinh chọn, chỉ 92 em xếp đủ hai chiều: có được tạo DRAFT không? | Giữ phục vụ một phần, bắt buộc công bố 8 em chưa có dịch vụ; không đưa 8 em vào roster/coverage đã phục vụ. | Chặn xác nhận nếu chưa phục vụ đủ tất cả học sinh đã chọn; có thể khiến không tạo được phương án nào. | **CHỐT (04/11/2026)**: Theo Đề xuất A (Cho phép tạo DRAFT cho các em đã xếp được; công bố rõ danh sách các em chưa có tuyến để điều phối riêng, không đưa vào roster/coverage đã phục vụ). |
| D35-02 | Cần xác nhận thực địa điểm đón và giới hạn thời gian ngồi xe từng trẻ trong app không? | Trường/nhà xe kiểm tra thực địa ngoài app; giữ maxRouteDurationMinutes/defaultStopServiceSeconds hiện có, công bố giới hạn. | Làm quản lý chấp thuận điểm đón/thời gian từng trẻ trong app; cần yêu cầu và trường dữ liệu riêng, không gộp vào 3.3. | **CHỐT (04/11/2026)**: Theo Đề xuất A cả 2 phần (Khảo sát thực địa điểm đón là nghiệp vụ offline ngoài đời thực; quản lý thời gian bằng tổng thời gian toàn tuyến maxRouteDurationMinutes, không đưa quy trình duyệt an toàn điểm đón hay trần thời gian ngồi xe riêng của từng em vào app). |

**Tính năng mở rộng được duyệt (04/11/2026):**
1. **Lọc theo Tỉnh/Thành phố (`province`)**: Thêm trường `province` vào `School` và `Student`, tự động bóc tách từ Vietmap Reverse Geocoding API (`city`/`province`) khi lưu tọa độ/địa chỉ để hỗ trợ filter tức thời trên DB (`WHERE province = ...`).
2. **Bán kính hoạt động tối đa của bãi xe (`maxOperatingRadiusKm`)**: System Admin cấu hình bán kính tối đa trong cài đặt bãi xe (`system_settings` key `PARKING_LOT`). Hệ thống tự động tính khoảng cách Haversine từ điểm đón đến bãi xe; nếu vượt quá bán kính sẽ cảnh báo đỏ trực quan và chặn duyệt trước khi Admin có quyết định ngoại lệ.

**API/field dự kiến F35:** ưu tiên summary/unassignedStudents hiện có; thêm trường `province` (nullable String) vào `Student`/`School`; thêm `maxOperatingRadiusKm` vào `ParkingLotDto`. Revalidate preview theo School/Vehicle/Student hiện tại khi lưu.

**In scope đề xuất:** kết quả phục vụ đúng thực tế, phát hiện preview cũ và xe/học sinh không còn phù hợp. **Đề xuất ngoài scope:** cam kết tối ưu toàn cục, chứng nhận mọi điểm dừng an toàn bằng bản đồ. **Hội đồng:** “Tại sao còn học sinh ngoài tuyến?” → đầu vào/ràng buộc có thể không đủ; kết quả phải công khai chưa phục vụ và chờ điều phối.

**Tiêu chí nghiệm thu:** coverage/counters/roster nhất quán; không xác nhận preview với xe inactive hoặc School đã đổi; tên tuyến giữ chuẩn 3.3; không tạo tuyến rỗng. **Bằng chứng:** [routes.service.ts](../../api/src/routes/routes.service.ts) `getPreparationData`, `optimizePreview`, `confirmPreview`, `reoptimizeRoutePlan`. Trạng thái: ANALYZED / NEEDS_DECISION.

## 3.6. Gán nguồn lực và duyệt — WF-06

**Đối tượng:** SYSTEM_ADMIN gán xe/tài xế; SCHOOL_ADMIN gán giáo viên và duyệt. **Dữ liệu:** Route.proposedVehicleId/defaultDriverId/defaultBusAttendantId khác Trip.assigned*; RoutePlan lưu status/activatedAt/approvedById/needsReoptimization.

### Luồng nhỏ và API hiện có

1. Quản trị viên mở GET `/routes/route-plans/:id`, chọn nhóm xe → GET `candidate-vehicles`, `candidate-drivers`, `candidate-bus-attendants` dưới cùng plan.
2. Nhà xe PATCH `/routes/route-plans/:id/assignments/vehicle`, `/driver`; trường PATCH `/bus-attendant`.
3. Trường xem GET `/routes/route-plans/:id/approval-readiness` → POST `/routes/route-plans/:id/approve`.
4. Nếu plan cần tối ưu lại vì bãi đổi, nhà xe re-optimize rồi trường duyệt lại theo 3.3. API không trao quyền duyệt cho SYSTEM_ADMIN.

### Vấn đề và phương án

- Source đổi default trên Route; các Trip đã lưu có assignment độc lập. Trường nhìn default mới nhưng ngày mai Trip có thể vẫn là nhân sự cũ. Không tự coi cập nhật default là đã bàn giao mọi chuyến.
- Readiness đọc trước transaction phê duyệt; source transaction kiểm lại status/hiệu lực trường. **Cần rà khi triển khai:** nguồn lực/nhu cầu có thay sau readiness không, và commit có đủ kiểm tra lại.
- Thay xe/người trên ACTIVE không phải luôn thay tuyến; reoptimize geometry/roster mới là thay dịch vụ cần trường biết. Cần tránh đặt mọi thay đổi về DRAFT làm ngừng phục vụ không cần thiết.

| ID | Cần chốt chi tiết | Đề xuất A và tác động | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| D36-01 | Đổi tài xế/xe ACTIVE nhưng không đổi tuyến/học sinh có phải duyệt lại? | Thay nguồn lực hợp lệ không đổi dịch vụ thì không duyệt lại; thay geometry/roster/giờ áp dụng theo 3.14/3.15 và quy tắc duyệt lại được chốt. Reoptimize 3.3 vẫn về DRAFT. | Mọi thay trên ACTIVE phải về DRAFT; cần giải quyết Trip sắp chạy trong lúc chờ duyệt. | **CHỐT (04/11/2026)**: Theo Đề xuất A (Không cần duyệt lại khi chỉ thay nguồn lực nội bộ hợp lệ, giữ nguyên chất lượng dịch vụ). |
| D36-02 | Đổi default có áp dụng các Trip đã sinh không? Ví dụ tài xế A → B từ tuần sau. | API default chỉ ảnh hưởng Trip mới; muốn bàn giao Trip đã sinh dùng thao tác có ngày/phạm vi rõ, không tự ghi đè override riêng từng chuyến. | Đồng bộ tất cả Trip chưa frozen từ ngày chọn, nhưng phải chốt ưu tiên override và response số chuyến bị bỏ qua. | **CHỐT (04/11/2026)**: **Có hiệu lực ngay lập tức**. Cập nhật mặc định trên Route và tự động đồng bộ ngay cho toàn bộ các Trip chưa frozen (status SCHEDULED, chưa Ready, chưa điểm danh theo G-02) từ hôm nay trở đi; không cần chờ đến ngày mai hay nhập ngày chỉ định. |

**Ràng buộc bổ sung đã duyệt (04/11/2026):**
1. **Cấm lặp lại nguồn lực trong cùng một RoutePlan**: Mỗi nhóm tuyến trong cùng một phương án phải có duy nhất 1 xe, 1 tài xế, 1 phụ xe. Không cho phép gán trùng bất kỳ tài xế hay phụ xe nào đã được phân công cho nhóm tuyến khác trong cùng phương án (`isEligible: false` trên candidate APIs và 400 Bad Request trên assignment APIs).
2. **Quy tắc thay thế có hiệu lực ngay (Immediate Effective Assignment)**:
   - Thao tác gán/thay thế xe, tài xế, giáo viên có hiệu lực tức thì ngay tại thời điểm thực hiện.
   - Giữ nguyên các DTO phân công hiện tại (`AssignVehicleGroupDto`, `AssignDriverGroupDto`, `AssignBusAttendantGroupDto`), không cần thêm trường ngày chỉ định `effectiveDate`.
   - Backend cập nhật mặc định trên `Route`, đồng thời tìm và cập nhật ngay lập tức tất cả các bản ghi `Trip` thuộc nhóm tuyến đó có trạng thái chưa bị frozen (chưa Ready, chưa có điểm danh theo rule G-02) từ thời điểm hiện tại trở đi. Các Trip đã frozen/đang chạy/hoàn thành được giữ nguyên.

**API/field dự kiến F36:** giữ ba API assignment cũ, không cần thêm trường ngày; thực hiện đồng bộ ngay lập tức sang các Trip chưa frozen; kiểm tra ràng buộc không trùng lặp tài xế và phụ xe trong cùng phương án.

**Hội đồng:** “Nhà xe tự chạy tuyến chưa được trường duyệt?” → không, chỉ trường approve. “Đổi tài xế có thay lịch cũ?” → default và Trip override là hai mức, chỉ thay trong phạm vi đã xác nhận. **Tiêu chí:** không activate nguồn lực vừa inactive; không ghi đè assignment Trip frozen/đã override; readiness/approve nhất quán. **Bằng chứng:** [routes.service.ts](../../api/src/routes/routes.service.ts) `approveRoutePlan`, `assignDriverGroup`, `assignBusAttendantGroup`; [resource-availability.service.ts](../../api/src/routes/resource-availability.service.ts). Trạng thái: ANALYZED / NEEDS_DECISION.

## 3.7. Sinh chuyến và lịch — WF-07

**Đối tượng:** SYSTEM_ADMIN sinh thủ công; scheduler sinh; các role xem lịch theo quyền. **Dữ liệu:** ACTIVE RoutePlan → Route → Trip duy nhất theo routeId/serviceDate; TripAttendance roster và routeSnapshot riêng. ServiceCalendarEntry/SchoolScheduledChange và bãi 3.3 tham gia tính ngày phục vụ.

### Luồng nhỏ và API hiện có

1. Nhà xe chọn trường/khoảng ngày → POST `/trips/generate`; source kiểm tra khoảng trong hợp đồng, bỏ Trip đã tồn tại.
2. Web GET `/trips`, `/trips/:id` có Trip PERSISTED và lịch VIRTUAL theo source; không thao tác vận hành trên virtual ID.
3. Driver/attendant GET `/trips/mobile/driver/schedule`, `/trips/mobile/bus-attendant/schedule`; Parent GET `/trips/mobile/parent/student/:studentId/schedule`.
4. Cron generation 02:00, baseline nhìn trước 7 ngày; chỉ sinh ngày sau activation, đủ phân công. Lịch nghỉ/inactive/relocation từ 3.2 phải dùng cùng eligibility, kể cả cron chậm.

### Vấn đề và phương án

- Trip CANCELLED vẫn chiếm unique route/date. Gọi generate lại không phục hồi và không tự có chuyến thay thế. Đây là policy lịch sử, không xử lý bằng xóa hàng cũ.
- Thay roster/địa chỉ sau khi đã sinh trước phải quyết định cập nhật hay chờ Trip mới (G-01), nếu không lịch hiển thị và dịch vụ thật khác nhau.
- 3.3 thêm needsReoptimization; cần đối chiếu cả generator, virtual schedule, readiness và Start để không hứa chuyến theo tuyến chưa tối ưu sau đổi bãi. Không tự coi báo cáo 3.3 là bằng chứng mọi consumer đã nối.

| ID | Cần chốt chi tiết | Đề xuất A và tác động | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| D37-01 | Muốn phục vụ lại ngày có Trip đã hủy: ai làm và giữ lịch sử ra sao? | Đợt này không phục hồi tự động; báo rõ lý do không sinh, quy trình chuyến thay thế là phần riêng sau khi PO duyệt. | Làm chuyến thay thế ngay: cần quan hệ chuyến gốc/chuyến mới, uniqueness mới, roster/leave/notification và quy tắc không chạy hai chuyến. | **CHỐT (04/11/2026)**: **Theo Lựa chọn B (Khôi phục trực tiếp CANCELLED → SCHEDULED)** với 5 điều kiện kiểm soát: (1) Trước giờ khởi hành dự kiến scheduledStartAt; (2) Xe, Tài xế, Phụ xe active và không trùng lịch; (3) RoutePlan vẫn ACTIVE, hợp đồng còn hạn; (4) Reset roster về UNMARKED, bảo lưu đơn xin nghỉ cá nhân đã duyệt; (5) SYSTEM_ADMIN thao tác, bắt buộc nhập reopenReason, lưu reopenedAt/reopenedById, bắn thông báo push/inbox ngay lập tức. |
| D37-02 | Giữ ngày sau activation đã chốt; API có cần trả rõ ngày đầu phục vụ để FE không tự tính sai holiday/contract không? | Thêm metadata ngày đầu đủ điều kiện phục vụ theo lịch thực tế; tên/nullable/ý nghĩa cần duyệt F37. Không mở phục vụ cùng ngày. | Giữ payload hiện tại, FE dùng danh sách ngày đủ điều kiện/Trip hiện có; vẫn không hứa duyệt xong chạy ngay. | **CHỐT (04/11/2026)**: **Theo Đề xuất A**. Bổ sung trường metadata `firstServiceDate` (tự động tính ngày học thực tế đầu tiên sau kích hoạt) trả về cho API để FE Web/Mobile hiển thị rõ ràng ngày đầu phục vụ. |

**Quy tắc khôi phục chuyến đã hủy (Trip Reopen Policy — 04/11/2026):**
- Thao tác: `POST /trips/:id/reopen` (Dành cho SYSTEM_ADMIN).
- Input: `{ reason: string, vehicleId?: string, driverId?: string, busAttendantId?: string }` (nếu nguồn lực cũ bận thì cho phép chọn thay thế).
- Validation:
  1. `trip.status === CANCELLED`.
  2. `now < trip.scheduledStartAt`.
  3. `routePlan.status === ACTIVE` và hợp đồng trường còn hiệu lực tại `trip.serviceDate`.
  4. Xe, tài xế, phụ xe khả dụng (active, không trùng lịch chuyến khác).
- State transition:
  1. `status` chuyển thành `SCHEDULED`.
  2. Lưu `reopenedAt: now`, `reopenedById: currentUser.id`, `reopenReason: dto.reason`.
  3. Reset `attendances` về `UNMARKED` (loại trừ các học sinh đã có `LeaveNotice` được duyệt).
  4. Bắn notification push/inbox tới Phụ huynh, Tài xế, Giáo viên phụ xe.

**API/field dự kiến F37:**
- Thêm trường `firstServiceDate?: string` (ISO Date YYYY-MM-DD) vào kết quả duyệt/kích hoạt phương án và thông tin lịch.
- Thêm endpoint `POST /trips/:id/reopen` kèm DTO `{ reason: string }` và các trường audit `reopenedAt`, `reopenedById`, `reopenReason` trên model `Trip`.

**Hội đồng:** “Lịch có mà không báo nghỉ được?” → chỉ Trip thật có roster mới nhận báo nghỉ, virtual là dự kiến; “Sinh lại sao không có?” → bản hủy giữ lịch sử. **Tiêu chí:** chạy generate lặp không tạo trùng; holiday/inactive/needsReoptimization không sinh sai; Trip thật/virtual cùng ngày không hiện trùng. **Bằng chứng:** [trips.service.ts](../../api/src/trips/trips.service.ts) `generateTrips`, `generateTripsInternal`, `listTrips`, schedule readers; [schema](../../api/prisma/schema.prisma) Trip unique. Trạng thái: ANALYZED / NEEDS_DECISION.

## 3.8. Đổi phân công chuyến — WF-08

**Đối tượng:** SYSTEM_ADMIN đổi xe/tài xế, SCHOOL_ADMIN đổi giáo viên. **Dữ liệu:** Trip assigned* khác default Route; LeaveNotice/TripIncident có thể đang chờ thay; TripAttendance quyết định số chỗ thực tế; nguồn lực pending admin từ 3.2 vẫn bận.

### Luồng nhỏ và API hiện có

1. Mở chi tiết chuyến → GET `/trips/:id`, xem tình trạng/nhân sự → chỉnh phân công.
2. PATCH `/trips/:id/assignment` nhận field theo role; source giữ alias `/trips/:id` và `/assignments`. expectedVehicleId/expectedDriverId/expectedBusAttendantId dùng phát hiện form cũ.
3. Nếu đã có leave/incident chờ thay, dùng 3.13/3.17; không dùng assignment chung để bỏ qua trạng thái tác vụ.
4. Source chỉ cho SCHEDULED; thay giáo viên reset Ready theo luồng hiện có. Không coi endpoint này là cứu hộ khi IN_PROGRESS.

### Vấn đề và phương án

- Lịch dự kiến không trùng chưa chắc người/xe đã rảnh: chuyến trước đang trễ hoặc còn trẻ chưa xuống. Giữ bận lifecycle 3.2 mới giải quyết một nhóm, không thay mọi kiểm tra vận hành liên tiếp.
- Xe cùng số chỗ nhưng số học sinh phải lấy roster đúng chuyến, không dựa duy nhất Route sau khi vừa sửa tuyến.
- Ready/điểm danh chiều về cần G-02; thay người lúc đã nhận trẻ không được mất trách nhiệm người đã nhận.

| ID | Cần chốt chi tiết | Đề xuất A và tác động | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| D38-01 | Trip trước đang IN_PROGRESS nhưng lịch dự kiến đã hết, có cho tài xế/xe nhận Trip tiếp? | Chặn nhận/bắt đầu chuyến mới tới khi nhiệm vụ thực tế đã xong; không tự đặt buffer phút mới, giữ ràng buộc nguồn lực một trường. | Cho override bởi nhà xe với lý do và quy trình bàn giao riêng; cần actor/audit/cảnh báo, không chỉ bỏ check. | **CHỐT (04/11/2026)**: **Theo Đề xuất A**. Chặn tuyệt đối việc bắt đầu chuyến mới cho đến khi chuyến trước `COMPLETED`. **Bổ sung yêu cầu PO**: Nếu chuyến trước không hoàn thành trước giờ khởi hành chuyến sau một khoảng thời gian đệm nhất định (ví dụ trước 15 phút so với `scheduledStartAt`), hệ thống tự động gắn cờ cảnh báo sự cố nguy cơ trễ chuyến (`LATE_RUNNING_TRIP_RISK`) yêu cầu Admin điều phối phân công lại nhân sự/xe khác. |
| D38-02 | Chuyến SCHEDULED đã Ready hoặc đã điểm danh: thay người được đến mức nào? | Theo G-02: chặn đổi thường sau frozen; xử lý qua workflow được duyệt, không tự đưa trẻ từ giáo viên A sang B. | Cho thay sau Ready/toàn UNMARKED và reset Ready; có điểm danh thì cần bàn giao được hai bên xác nhận. | **CHỐT (04/11/2026)**: **Theo Đề xuất A (Tuân thủ triệt để Rule G-02)**. Khóa cứng nút sửa phân công thông thường khi chuyến đã Ready hoặc đã có điểm danh (`isFrozen = true`). Mọi thay đổi người/xe trong tình huống này bắt buộc xử lý qua quy trình Báo sự cố khẩn cấp (Incident Dispatching — Mục 3.17). |

**Quy tắc điều phối phân công chuyến (Trip Assignment Policy — 04/11/2026):**
1. **Chặn Start khi chuyến trước chưa xong**: Driver không thể bấm Start chuyến tiếp theo nếu chuyến trước của tài xế hoặc xe đó vẫn đang ở trạng thái `IN_PROGRESS`.
2. **Cảnh báo nguy cơ trễ chuyến liên tiếp**: Nếu một tài xế/xe có 2 chuyến liên tiếp, và tại thời điểm `trip2.scheduledStartAt - bufferMinutes` (mặc định buffer 15 phút) mà `trip1` vẫn chưa `COMPLETED`, hệ thống kích hoạt cảnh báo sự cố nguy cơ chậm chuyến để Admin kịp thời điều phối tài xế/xe khác.
3. **Khóa sửa phân công thông thường khi đã Frozen**: Endpoint `PATCH /trips/:id/assignment` từ chối sửa (ném lỗi `BadRequestException`) nếu chuyến đã có `attendantReadyAt` hoặc bất kỳ bản ghi `TripAttendance` nào khác `UNMARKED`.

**API/field dự kiến F38:**
- Tái sử dụng `UpdateTripAssignmentDto` với `expected*` fields.
- Thêm kiểm tra điều kiện Frozen (G-02) trong `updateTripAssignment`: từ chối sửa nếu đã Ready hoặc đã điểm danh.
- Thêm cơ chế quét/cảnh báo sự cố nguy cơ chậm chuyến (`IncidentType.RESOURCE_BUSY_OVERLAP` hoặc cảnh báo trên dashboard điều phối).

**Tiêu chí:** chọn ứng viên rảnh rồi người khác vừa phân công phải được kiểm tra lại khi lưu; không ghi đè form cũ; capacity theo roster; reset Ready đúng loại thay; không làm mất dấu người điểm danh. **Bằng chứng:** [trips.service.ts](../../api/src/trips/trips.service.ts) `updateTripAssignment`; [contract-resource-policy.ts](../../api/src/schools/contract-resource-policy.ts); nhóm assignment ở 3.3. Trạng thái: ANALYZED / NEEDS_DECISION.

## 3.9. Vận hành chiều đến trường — WF-09

**Đối tượng:** BUS_ATTENDANT nhận trẻ/điểm danh, DRIVER vận hành, Parent theo dõi; quản trị viên xử lý ngoại lệ. **Dữ liệu:** Trip TO_SCHOOL; TripAttendance UNMARKED/PRESENT/ABSENT, markedById/markedAt/absenceReason/alightedAt; attendantReadyAt/actualStartTime/arrivedAtSchoolAt/actualEndTime.

### Luồng nhỏ và API hiện có

1. Giáo viên mở chuyến → POST `/trips/:id/attendant-ready`; tài xế POST `/trips/:id/start` khi đủ điều kiện.
2. Đến điểm đón, giáo viên xác nhận PUT `/trips/:id/attendance/:studentId` hoặc quét POST `/trips/:id/attendance/verify-qr` rồi xác nhận điểm danh. Verify QR không tự chứng minh trẻ đã hiện diện vật lý.
3. Tài xế POST `/trips/:id/arrive-at-school` khi mọi học sinh đã được xử lý điểm danh; giáo viên PUT `/trips/:id/attendance/:studentId/alighting` cho trẻ PRESENT.
4. Tài xế POST `/trips/:id/complete`; source chặn còn UNMARKED/PRESENT chưa xuống. GET `/operational-state` trả cờ thao tác và lý do; lifecycle pending admin vẫn chặn theo 3.2.

### Vấn đề và phương án

- Chưa có quy trình cụ thể cho trẻ không xuất hiện tại điểm đón: chờ bao lâu, ai liên hệ, lúc nào ghi ABSENT. Không tự chọn số phút.
- Source chặn QR đón mới sau arrivedAtSchoolAt nhưng updateAttendance vẫn có thể đổi ABSENT/PRESENT (chỉ chặn trở về UNMARKED). Cần phân biệt **sửa sai dữ liệu** với **đón trẻ mới**, nếu không màn hình/thông báo có thể nói “vừa lên xe” dù xe đã tới trường.
- arrivedAtSchoolAt/alightedAt là xác nhận vận hành; không tự đồng nghĩa GPS chứng minh đã đến đúng nơi hoặc đã có người của trường nhận trẻ.

| ID | Cần chốt chi tiết | Đề xuất A và tác động | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| D39-01 | Trẻ không tới, không gọi được: có tự ghi vắng sau một thời gian không? | Giáo viên liên hệ ngoài app, ghi ABSENT với lý do khi người có trách nhiệm quyết định; chưa tự động no-show hoặc thêm timer. Muốn thời gian chờ cụ thể PO phải cung cấp. | Quản lý no-show trong app với thời gian chờ/thẩm quyền/escalation; cần field và rule mới, không tự mặc định phút. | **CHỐT (04/11/2026)**: **Theo Đề xuất A**. Không dùng timer tự động máy móc; giáo viên phụ xe chủ động gọi điện thoại cho phụ huynh, sau thời gian chờ thực tế (2-3 phút) không liên lạc được thì tự tay chọn `ABSENT` và nhập lý do cụ thể. |
| D39-02 | Đã xác nhận đến trường nhưng phát hiện điểm danh sai: ai được sửa và thông báo ra sao? | Đóng luồng đón mới; sửa sai bằng thao tác riêng có lý do/audit, chỉ trong cửa sổ/trạng thái PO cho phép; không phát thông báo BOARDING như sự kiện mới. | Khóa mọi sửa sau arrival; trường/nhà xe xử lý hành chính ngoài luồng hoặc qua admin-only correction. | **CHỐT (04/11/2026)**: **Theo Đề xuất A kèm quy chế sửa trước/sau khi đến trường**: (1) **Trước khi đến trường**: Giáo viên được sửa trực tiếp trên danh sách (ABSENT ↔ PRESENT có lý do, hoặc hoàn tác UNMARKED), hệ thống gửi thông báo đính chính chuẩn xác cho phụ huynh. (2) **Sau khi đến trường**: Khóa hoàn tác UNMARKED; cho phép điều chỉnh sửa sai (Correction) có lý do audit, không phát thông báo BOARDING đón mới. |

**Quy tắc vận hành chiều đến trường (Morning Operation Policy — 04/11/2026):**
1. **Xử lý No-show**: Giáo viên gọi điện cho phụ huynh; nếu quá thời gian chờ (2-3 phút) không liên lạc được thì đánh dấu `ABSENT` kèm lý do.
2. **Sửa sai điểm danh khi chưa đến trường (`arrivedAtSchoolAt === null`)**:
   - Giáo viên được phép sửa đổi trực tiếp trạng thái trên app:
     * `ABSENT → PRESENT`: Đánh dấu lên xe, xóa lý do vắng, bắn thông báo `BOARDING` cho phụ huynh.
     * `PRESENT → ABSENT`: Bắt buộc nhập lý do (gợi ý nhanh: *"Điểm danh nhầm, học sinh thực tế không đi xe"*), bắn thông báo đính chính cho phụ huynh.
     * `Hoàn tác về UNMARKED`: Cho phép hoàn tác để quét lại QR nếu cần.
3. **Sửa sai điểm danh sau khi đã đến trường (`arrivedAtSchoolAt !== null`)**:
   - Khóa tuyệt đối việc hoàn tác về `UNMARKED`.
   - Khóa quét QR đón mới.
   - Cho phép thao tác Điều chỉnh (Correction) trước khi `completeTrip` kèm lý do audit, gửi thông báo đính chính, không gửi event đón mới.

**API/field dự kiến F39:**
- Giữ nguyên `PUT /trips/:id/attendance/:studentId` cho thao tác sửa dọc đường.
- Bổ sung type notification `ATTENDANCE_CORRECTION` để phân biệt thông báo sửa sai với thông báo `BOARDING` mới.

**Hội đồng:** “Lỡ điểm nhầm PRESENT thì sao?” → cần correction có dấu vết, khác đón mới; “Phần mềm chống bỏ quên trẻ thế nào?” → chặn Complete nếu còn PRESENT chưa xuống, vẫn cần quy trình kiểm tra khoang xe thực tế. **Tiêu chí:** mọi luồng QR/thủ công tuân một ma trận; trạng thái vắng có lý do; thông báo sửa sai không tạo sự kiện lên xe giả; Complete không bỏ qua trẻ còn trên xe. **Bằng chứng:** [trips.service.ts](../../api/src/trips/trips.service.ts) `updateAttendance`, `verifyQrAttendance`, `arriveAtSchool`, `completeTrip`. Trạng thái: ANALYZED / NEEDS_DECISION.

## 3.10. Vận hành chiều về — WF-10

**Đối tượng:** giáo viên phụ xe nhận trẻ tại trường, tài xế đưa về/bãi; Parent nhận trẻ; trường/nhà xe điều phối ngoại lệ. **Dữ liệu:** Trip TO_PARKING và cùng TripAttendance; PRESENT trước Start có nghĩa đã nhận trẻ, dù status còn SCHEDULED.

### Luồng nhỏ và API hiện có

1. Giáo viên Ready → điểm danh tại trường khi SCHEDULED qua API 3.9.
2. Tài xế Start sau khi hết UNMARKED, ABSENT có lý do. Source chưa yêu cầu phải có ít nhất một PRESENT, chỉ yêu cầu roster không rỗng.
3. Tại điểm trả, giáo viên xác nhận alighting; tài xế Complete sau xử lý hết roster. Không dùng arrive-at-school cho chiều về.
4. Parent tự đón ở trường phải được ghi nhận không dùng chuyến về; không được biến trẻ đã thực sự lên xe thành ABSENT chỉ để “giải phóng” thao tác Complete.

### Vấn đề và phương án

- Toàn roster ABSENT vẫn có thể Start theo source. Chuyến đưa đón không có trẻ khác nhiệm vụ điều chuyển xe về bãi; cần xác định mục tiêu chuyến và số liệu.
- alightedAt chưa ghi người nhận/thẩm quyền nhận; không thể báo “đã bàn giao cho bố/mẹ” chỉ từ xuống xe.
- Không có người nhận ở nhà/nhờ người khác đón cần người quyết định nơi giữ trẻ; không tự mặc định đưa về bãi hoặc cho xuống một mình.

| ID | Cần chốt chi tiết | Đề xuất A và tác động | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| D310-01 | Toàn bộ trẻ ABSENT trước Start: chuyến có được xuất phát không? Ai là người hủy? | Không Start chuyến đưa đón; quản trị viên hủy với lý do toàn bộ vắng. Điều chuyển xe về bãi nằm ngoài Trip chở học sinh trong đợt này. Không tự mark COMPLETED. | Cho chạy xe rỗng như nhiệm vụ điều chuyển, cần phân loại/ý nghĩa thống kê riêng và không gửi “xe đang đón con” cho Parent. | **CHỐT (04/11/2026)**: **Theo Đề xuất A**. Chặn tuyệt đối nút Start khi toàn bộ học sinh vắng (`presentCount === 0`). **Người hủy chuyến**: Giáo viên phụ xe (`BUS_ATTENDANT`) trực tiếp điểm danh tại sân trường, khi thấy 100% vắng thì bấm nút *"Xác nhận hủy chuyến đưa đón do toàn bộ học sinh vắng mặt"* trên app Mobile (Admin trên Web có quyền hủy dự phòng). Không gửi thông báo xe chạy đưa đón cho phụ huynh. Xe di chuyển về bãi theo nghiệp vụ nội bộ. |
| D310-02 | Không có người nhận/người nhận thay: app có cần chứng minh người nhận ngay không? | Xử lý liên hệ/bàn giao theo quy trình của trường, giáo viên giữ giám sát và chỉ xác nhận xuống khi việc thực tế đã diễn ra; chưa thêm OTP người nhận. PO cần nêu người quyết định điểm đưa trẻ tới khi liên lạc thất bại. | Làm recipient/handover có xác nhận trong app; cần quyền ủy quyền, danh sách người nhận, thời điểm và ngoại lệ, schema phải duyệt riêng. | **CHỐT (04/11/2026)**: **Theo Đề xuất A**. Giữ trẻ an toàn trên xe, giáo viên liên hệ phụ huynh và báo cáo trường/nhà xe; **tuyệt đối không bấm xác nhận xuống xe (`alighting`)** cho trẻ. Ghi nhận sự cố không có người đón (`NO_GUARDIAN_AT_STOP`) và đưa trẻ về trường/nhà xe. Chưa áp dụng mã OTP/QR nhận trẻ để tránh ùn tắc điểm dừng. |

**Quy tắc vận hành chiều về (Afternoon Return Policy — 04/11/2026):**
1. **Điểm danh 100% tại trường**: Điểm danh diễn ra khi chuyến ở `SCHEDULED`. Tài xế chỉ được bấm Start khi `UNMARKED === 0` và có ít nhất 1 học sinh lên xe (`presentCount >= 1`).
2. **Quy trình hủy khi toàn bộ vắng**:
   - Khi 100% học sinh `ABSENT`, App của Giáo viên hiển thị nút *"Xác nhận hủy chuyến đưa đón"*.
   - Giáo viên bấm xác nhận: Chuyến chuyển sang `CANCELLED`, lưu `cancelledById = attendant.id`, `cancellationReason = "Toàn bộ học sinh vắng mặt tại trường (phụ huynh tự đón)"`.
   - Màn hình Tài xế thông báo chuyến đã hủy, xe được phép chạy về bãi đỗ (không phát event lộ trình cho phụ huynh).
3. **Quy trình không có người đón tại trạm trả**:
   - Giáo viên giữ học sinh trên xe, không bấm xuống xe (`alightedAt = null`).
   - Ghi nhận sự cố `NO_GUARDIAN_AT_STOP` qua quy trình Mục 3.17, đưa học sinh về lại trường hoặc văn phòng nhà xe.

**API/field dự kiến F310:**
- Thêm kiểm tra `presentCount >= 1` trong `startTrip` cho chiều `TO_PARKING`.
- Mở quyền gọi `POST /trips/:id/cancel` cho `BUS_ATTENDANT` trong tình huống duy nhất: chuyến chiều `TO_PARKING`, trạng thái `SCHEDULED` và 100% học sinh đã được đánh dấu `ABSENT`.

**Hội đồng:** “Không có ai nhận thì làm gì?” → giáo viên giữ giám sát, liên hệ và báo người chịu trách nhiệm theo quy trình chốt; phần mềm không tự đánh dấu đã bàn giao; “Tất cả vắng có tính chuyến hoàn thành?” → do D310-01 quyết định, chưa chọn thay PO.

**Tiêu chí:** không Start khi chưa hết UNMARKED; rule zero-PRESENT thống nhất API/canStart; không alight ABSENT hoặc trẻ chưa được nhận; admin COMPLETED hành chính 3.2 không hiển thị như đã bàn giao. **Bằng chứng:** [trips.service.ts](../../api/src/trips/trips.service.ts) `startTrip`, `updateAlighting`, `completeTrip`; [schema](../../api/prisma/schema.prisma) TripAttendance. Trạng thái: ANALYZED / NEEDS_DECISION.

## 3.11. Theo dõi, trang chủ và lịch sử — WF-11

**Đối tượng:** Driver phát vị trí, Parent theo dõi con; trường/nhà xe quan sát theo phạm vi, giáo viên xem chuyến. **Dữ liệu:** TripLocationPoint theo Trip/runId/sequence; Trip.navigationState; Trip.routeSnapshot; TripAttendance; liên kết Parent–Student.

### Luồng nhỏ và API hiện có

1. Trang chủ Driver/attendant GET `/trips/mobile/home-trip`; Parent GET `/trips/mobile/parent/home-cards`.
2. Mở chi tiết/bản đồ → GET `/trips/:id/navigation`, `/operational-state`; Driver PUT `/navigation/session`, `/navigation/position`, POST `/navigation/segment`.
3. Xem lại GET `/trips/:id/location-history`; phân biệt tuyến dự kiến và điểm đã ghi. API navigation hiện đã có freshness NONE/FRESH/STALE và serverNow, không cần tạo lại để xử lý GPS cũ.
4. Source Home hiện lọc scheduledEndAt cho cả IN_PROGRESS, sau đó mới ưu tiên chuyến đang chạy: ưu tiên không có tác dụng nếu chuyến trễ đã bị loại khỏi truy vấn.

### Vấn đề và phương án

- **B-01 còn thấy rõ trong source:** chuyến đang chở trẻ 17:31 nhưng dự kiến kết thúc 17:30 có thể mất Home card. **Đề xuất:** IN_PROGRESS được giữ đến khi terminal hoặc hiện rõ pending admin, không suy từ giờ dự kiến là hoàn thành.
- Mất vị trí không đồng nghĩa xe dừng hoặc trẻ an toàn; source đã cung cấp độ mới. Reader/FE phải tách latest known và live tracking, không nối khoảng mất dữ liệu bằng hành trình giả.
- Parent có nhiều con, con đã xuống nhưng còn trẻ khác trên xe: phạm vi xem xe đến lúc nào là nghiệp vụ cần chốt, không tự mở theo dõi toàn tuyến vô hạn.

| ID | Cần chốt chi tiết | Đề xuất A và tác động | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| D311-01 | Chuyến trễ/qua ngày còn IN_PROGRESS có còn ưu tiên ở Home không? | Giữ hiện đến khi terminal; nếu thuộc pending admin thì cho xem kèm lý do, tắt thao tác theo 3.2. Không tự đổi status theo thời gian. | Chuyển sang vùng ngoại lệ riêng nhưng không được làm mất quyền truy cập; cần thiết kế response/FE mới. | **CHỐT (04/11/2026)**: **Theo Đề xuất A (Sửa triệt để bug B-01)**. Chừng nào chuyến còn `IN_PROGRESS`, chuyến đó BẮT BUỘC giữ ưu tiên hiển thị số 1 trên Trang chủ của Tài xế, Phụ xe và Phụ huynh, bất kể đã quá giờ `scheduledEndAt`. Chỉ ẩn khi đã `COMPLETED` hoặc `CANCELLED`. |
| D311-02 | Parent xem vị trí trước con lên và sau con xuống trong khoảng nào? | Giữ phạm vi hiện có trong đợt sửa B-01; công bố chỉ là vị trí xe, không suy vị trí con khi chưa PRESENT/đã alighted. Chưa đổi contract truy cập mới. | Giới hạn theo cửa sổ/thời điểm boarding/alighting cụ thể; PO chọn phạm vi và cách xử lý nhiều con/chờ đón. | **CHỐT (04/11/2026)**: **Theo Đề xuất A**. Phụ huynh được xem vị trí xe trực tiếp xuyên suốt toàn bộ thời gian chuyến xe `IN_PROGRESS` (để chủ động đưa đón con và theo dõi an tâm). Bảo vệ quyền riêng tư nghiêm ngặt: chỉ hiển thị xe buýt, điểm đón của con mình và trường học (Privacy Masking). |

**Quy tắc hiển thị Trang chủ & Theo dõi GPS (Tracking & Home Card Policy — 04/11/2026):**
1. **Sửa dứt điểm Bug B-01 trong `getHomeTrip` và `getParentHomeCards`**:
   - Tách biệt điều kiện lọc:
     * Với chuyến `IN_PROGRESS`: **Không áp dụng bộ lọc `scheduledEndAt >= now`**. Chuyến đang chạy luôn luôn xuất hiện trên Home card.
     * Với chuyến `SCHEDULED`: Giữ bộ lọc thời gian để hiển thị chuyến sắp tới phù hợp.
2. **Quy định theo dõi Live Tracking cho Phụ huynh**:
   - Cho phép mở bản đồ theo dõi xe khi chuyến có `status === IN_PROGRESS`.
   - Dữ liệu trả về cho Phụ huynh được lọc sạch (Privacy Masking): Ẩn toàn bộ thông tin/điểm đón của các học sinh khác.
   - Thẻ chuyến xe cập nhật rõ ràng: Trước khi lên xe (Chờ đón), Đang trên xe (Di chuyển), Đã xuống xe (Đến trường/về nhà an toàn).

**API/field dự kiến F311:**
- Sửa câu query Prisma trong `getHomeTrip` và `getParentHomeCards` để không loại bỏ các chuyến `IN_PROGRESS` bị trễ giờ.
- Giữ nguyên DTO contract hiện tại, không thêm enum hay model mới.

**Hội đồng:** “Quá giờ hệ thống có tự kết thúc không?” → không, dự kiến khác thực tế; “Không có GPS có biết con trên xe?” → trạng thái điểm danh và liên lạc là nguồn khác, vị trí cũ không chứng minh an toàn. **Tiêu chí:** IN_PROGRESS còn hiện sau scheduledEndAt; COMPLETED/CANCELLED không bị chọn lại; FRESH/STALE/NONE đúng dữ liệu; lịch sử không bị đổi theo Route hiện tại. **Bằng chứng:** [trips.service.ts](../../api/src/trips/trips.service.ts) `getHomeTrip`, `getParentHomeCards`; [trip-navigation.service.ts](../../api/src/trips/trip-navigation.service.ts) `navigation`, `history`. Trạng thái: ANALYZED / NEEDS_DECISION.

## 3.12. Học sinh báo nghỉ — WF-12

**Đối tượng:** Parent tạo/rút; giáo viên thấy roster, quản trị viên giám sát. **Dữ liệu:** LeaveNotice kind STUDENT gắn Trip/Student/reportedById; OtpChallenge; TripAttendance lưu absenceReason và dữ liệu trước báo nghỉ để rút đơn.

### Luồng nhỏ và API hiện có

1. Parent mở báo nghỉ → chọn con/ngày/chiều → GET `/leave-notices/options`, chỉ có Trip thật SCHEDULED theo điều kiện.
2. POST `/leave-notices/otp` → nhập mã số giám hộ → POST `/leave-notices/confirm`; tạo đơn, ghi ABSENT cho đúng chuyến.
3. GET `/leave-notices`, `/:id`; POST `/:id/cancel` để rút. Source chỉ cho người tạo rút, chặn khi không còn hợp lệ; nguồn khôi phục từ snapshot điểm danh, không reset hàng loạt.
4. Ready chiều về khóa báo nghỉ theo rule hiện tại; trẻ đã PRESENT/alighted không báo nghỉ qua endpoint thường. Inactive trường chặn mutation theo con, không khóa Parent có con trường khác.

### Vấn đề và phương án

- Sáng nghỉ không suy ra chiều nghỉ; báo cả ngày/nhiều ngày hiện chưa là một luồng được chốt. “Nghỉ xe” không đồng nghĩa học sinh nghỉ học.
- Hai Parent cùng con: chỉ người tạo rút là hiện trạng. Nếu đổi quyền, cần giải quyết tình huống rút sau khi người kia đã sắp xếp tự đưa đón.
- Báo muộn sau cutoff/Ready cần luồng liên hệ, không ghi ABSENT vào trẻ đã lên xe hoặc sửa ngược sự thật vận hành.

| ID | Cần chốt chi tiết | Đề xuất A và tác động | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| D312-01 | Mẹ tạo đơn nghỉ, bố cùng liên kết muốn rút: có quyền không? | Giữ người tạo được rút; người còn lại liên hệ người tạo/trường. Không tự chọn Parent chính/phụ. | Mọi Parent hợp lệ được rút trước cutoff, phải thông báo người tạo và lưu người rút riêng; cần field audit. | **CHỐT (04/11/2026)**: **Theo Đề xuất A**. Giữ nguyên quy tắc an toàn: Chỉ người tạo đơn mới có quyền rút đơn (`reportedById === currentUser.id`). Tránh mâu thuẫn gia đình và đảm bảo trách nhiệm nhất quán; phụ huynh còn lại trao đổi nội bộ để người tạo bấm rút trên app. |
| D312-02 | Có làm nghỉ cả ngày/nhiều ngày và báo muộn trong đợt này không? | Giữ từng Trip/chiều; báo muộn liên hệ trường/giáo viên ngoài app, không bypass Ready/boarding. UI có thể hướng chọn nhiều nhưng bulk API chưa thêm. | Bulk theo ngày/chiều cần preview Trip đủ/không đủ, quyết định partial/all-or-nothing và rule OTP; không tự tạo notice cho virtual Trip. | **CHỐT (04/11/2026)**: **Theo Đề xuất A**. Giữ quy tắc mỗi đơn báo nghỉ gắn với từng chuyến/chiều độc lập. Sáng nghỉ không tự động suy ra chiều nghỉ. Báo muộn sau khi xe đã Start/Ready thì liên hệ trực tiếp ngoài app, không can thiệp form. Không làm bulk OTP nhiều ngày trong đợt này. |

**Quy tắc học sinh báo nghỉ (Student Leave Policy — 04/11/2026):**
1. **Phân quyền rút đơn**: Chỉ tài khoản phụ huynh đã tạo đơn mới có quyền gọi `POST /leave-notices/:id/cancel` để rút đơn. Khóa rút đơn nếu chuyến đã bắt đầu (`actualStartTime !== null`) hoặc chuyến chiều đã bấm Ready.
2. **Tính độc lập từng chuyến**: Mỗi đơn `LeaveNotice` gắn trực tiếp với 1 `tripId` và 1 `studentId`. Chiều đi và chiều về được nộp riêng biệt để phản ánh đúng thực tế đưa đón.
3. **Khôi phục trạng thái khi rút đơn**: Hệ thống hoàn tác trạng thái `TripAttendance` về đúng snapshot trước khi báo nghỉ (`attendanceBefore`).

**API/field dự kiến F312:**
- Tái sử dụng trọn vẹn bộ API hiện tại (`GET /options`, `POST /otp`, `POST /confirm`, `POST /:id/cancel`).
- Không thêm DTO hay bảng bulk trong đợt này.

**Hội đồng:** “Báo nghỉ hôm nay chiều vẫn đi?” → mỗi chiều độc lập; “Sao không báo nghỉ sau Ready?” → trẻ có thể đã được nhận tại trường, cần xác minh thực tế thay vì chỉ nhận form. **Tiêu chí:** không notice trùng cùng con/Trip còn hiệu lực; rút không ghi đè điểm danh mới; báo nghỉ không biến PRESENT thành ABSENT; từng Parent theo policy cuối. **Bằng chứng:** [leave-notices.service.ts](../../api/src/leave-notices/leave-notices.service.ts) `getOptions`, `confirmNotice`, `cancelNotice`. Trạng thái: ANALYZED / NEEDS_DECISION.

## 3.13. Nhân sự báo nghỉ — WF-13

**Đối tượng:** DRIVER/BUS_ATTENDANT báo nghỉ; nhà xe thay Driver; trường thay attendant theo scope hiện có. **Dữ liệu:** LeaveNotice DRIVER/BUS_ATTENDANT; replacementUserId/status; Trip assigned*/attendantReadyAt; Incident thiếu người có thể cùng tham chiếu.

### Luồng nhỏ và API hiện có

1. Nhân sự chọn chuyến thật → GET `/leave-notices/options` → OTP/confirm như 3.12, fan-out kênh theo mode 3.1.
2. Quản trị viên xem đơn → GET `/:id/replacement-candidates` → POST `/leave-notices/:id/assign-replacement`; không có người thì POST `/:id/cancel-trip` với lý do.
3. Còn PENDING_REPLACEMENT chặn Start. Thay attendant reset Ready; thay Driver không tự xóa Ready hiện có. Người đã được thay còn xem lịch sử đơn của mình theo source.
4. Rút đơn chỉ khi policy hiện tại cho phép; source chặn REPLACED. Inactive vĩnh viễn/bàn giao tài khoản thuộc 3.3, không làm trùng bằng “nghỉ việc” trong leave một chuyến.

### Vấn đề và phương án

- Nghỉ theo kỳ khác nghỉ một chuyến; tạo một số notice không đủ chứng minh mọi lịch trong kỳ đã được thay.
- Người thay chưa đọc push không chứng minh đã nhận việc; nếu thêm acknowledgement phải nối Start, cutoff và trách nhiệm xử lý.
- Thiếu cả hai nhân sự: xử lý xong đơn Driver không được mở Start khi attendant vẫn chờ. Người cũ quay lại sau khi đã thay không được tự giành lại chuyến.

| ID | Cần chốt chi tiết | Đề xuất A và tác động | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| D313-01 | Người cũ muốn trở lại sau REPLACED; người thay chưa biết việc thì sao? | REPLACED là kết quả đã chốt; muốn đổi lại phải quản trị viên điều phối lại có kiểm tra khả dụng, không rút đơn để tự phục hồi assignment. Giữ không có acknowledgement mới nếu G-03=A. | Cho rút/hoàn tác thay thế trước cutoff, cần đồng ý người thay và audit, không làm bằng reset đơn đơn giản. | **CHỐT (04/11/2026)**: **Theo Đề xuất A**. Đơn đã gán người thay (`REPLACED`) thì KHÓA CỨNG, người cũ tuyệt đối không được tự ý rút đơn trên app. Nếu muốn bố trí lại người cũ thì do Admin quyết định qua điều phối thủ công. Người thay thế nhận việc ngay qua push/inbox theo rule G-03. |
| D313-02 | Có thêm nghỉ nhiều ngày/nhận việc cho nhân sự không? | Giữ leave từng Trip, quản trị viên bàn giao theo 3.3/3.8; chưa thêm lịch nghỉ kỳ hoặc trạng thái chờ nhận việc. | Làm nghỉ kỳ/acknowledgement trong đợt này; cần rule Trip chưa sinh, ngày kết thúc, không tạo trùng và khi người thay từ chối. | **CHỐT (04/11/2026)**: **Theo Đề xuất A**. Phân định rõ: Nghỉ đột xuất 1-2 chuyến dùng `LeaveNotice` WF-13; Nghỉ dài ngày (nghỉ ốm/thai sản/chuyển công tác) xử lý bằng tính năng đổi nhân sự mặc định của tuyến (Mục 3.6), có hiệu lực ngay và đồng bộ toàn bộ Trip theo D36-02. Không phát triển thêm module nghỉ dài ngày cồng kềnh trên mobile. |

**Quy tắc nhân sự báo nghỉ (Staff Leave Policy — 04/11/2026):**
1. **Chặn Start khi chuyến thiếu người**: Chừng nào chuyến còn `LeaveNotice` ở trạng thái `PENDING_REPLACEMENT` (của Tài xế hoặc Phụ xe), hệ thống khóa cứng nút `startTrip`.
2. **Khóa rút đơn khi đã có người thay (`REPLACED`)**:
   - Nếu `status === REPLACED`, API `POST /leave-notices/:id/cancel` ném lỗi `BadRequestException`.
   - Bảo toàn phân công người thay thế và trách nhiệm vận hành.
3. **Phân quyền gán thay thế chuẩn**:
   - Tài xế: Chỉ `SYSTEM_ADMIN` xử lý (`POST /leave-notices/:id/assign-replacement`).
   - Phụ xe: Chỉ `SCHOOL_ADMIN` trường sở tại xử lý (và tự động reset `attendantReadyAt = null`).
4. **Hủy chuyến khi không có người thay**: Admin gọi `POST /leave-notices/:id/cancel-trip` khi bất khả kháng không bố trí được người thay thế.

**API/field dự kiến F313:**
- Tái sử dụng trọn vẹn bộ API hiện tại (`GET /options`, `POST /otp`, `POST /confirm`, `GET /:id/replacement-candidates`, `POST /:id/assign-replacement`, `POST /:id/cancel-trip`, `POST /:id/cancel`).
- Không thêm DTO hay bảng mới.

**Hội đồng:** “Một người báo nghỉ là chuyến bị hủy?” → chưa, pending thay người, chỉ admin hủy khi không bố trí được; “Người cũ quay lại?” → quản trị viên quyết định, không tự overwrite. **Tiêu chí:** hai notice cùng chuyến xử lý độc lập, Start còn chặn nếu bất kỳ blocker; người thay không trùng việc; reset Ready đúng; lịch sử người báo không biến mất. **Bằng chứng:** [leave-notices.service.ts](../../api/src/leave-notices/leave-notices.service.ts) `assignReplacement`, `cancelNotice`, `cancelTripFromNotice`; [trips.service.ts](../../api/src/trips/trips.service.ts) `startTrip`. Trạng thái: ANALYZED / NEEDS_DECISION.

## 3.14. Yêu cầu sửa thông tin/địa chỉ học sinh — WF-14

**Đối tượng:** Parent gửi, SCHOOL_ADMIN duyệt thông tin hoặc địa chỉ chưa có tuyến; SYSTEM_ADMIN xử lý địa chỉ có tuyến. **Dữ liệu:** StudentUpdateRequest beforeData/proposedData/resolution; Student; Route/RouteStop; Trip snapshot/attendance; preview session hiện ở memory.

### Luồng nhỏ và API hiện có

1. Parent mở hồ sơ con → chọn thông tin/địa chỉ → POST `/parents/students/:id/update-requests/otp`, `/verify` → GET request list/detail.
2. Trường xem `/schools/:schoolId/update-requests`; duyệt/từ chối theo scope. PATCH `/schools/:schoolId/students/:id/address` chỉ cho cập nhật trực tiếp theo điều kiện source hiện có.
3. Với địa chỉ ảnh hưởng tuyến: nhà xe GET `/system-admin/update-requests/:requestId` → POST `/:requestId/routing-preview` → xem khả thi → POST `/:requestId/approve` hoặc `/reject`.
4. Parent có thể POST `/parents/update-requests/:requestId/cancel` khi còn được phép; request đã được quyết định không thể được admin khác chốt lần hai.

### Vấn đề đã thấy và phương án

- **B-02:** DTO mô tả previewToken bắt buộc cho REOPTIMIZED nhưng field vẫn optional; service lấy session nếu có rồi có thể tiếp tục cập nhật tọa độ mà không có geometry khả thi hợp lệ. **Đề xuất:** khi quyết định đòi reoptimize phải có preview đúng request, còn hạn, nguồn dữ liệu chưa đổi và kết quả khả thi; không có thì từ chối thay vì success nửa vời.
- Đổi Student/RouteStop tức thì trong khi Trip đã có snapshot cũ làm hai nguồn mô tả hai địa điểm. Cần G-01 và G-02, không tự sao chép policy School sang Student.
- Chọn REMOVED_FROM_ROUTES có thể loại trẻ khỏi dịch vụ dù nhu cầu đổi địa chỉ vẫn tồn tại; phải công bố rõ “đã cập nhật hồ sơ, chưa có tuyến mới”, không chỉ báo “duyệt thành công”.

| ID | Cần chốt chi tiết | Đề xuất A và tác động | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| D314-01 | Preview không khả thi hoặc hết hạn nhưng nhà xe bấm duyệt thì xử lý thế nào? | REOPTIMIZED bắt buộc preview khả thi/hiện hành; từ chối 409 khi stale, lỗi nghiệp vụ khi không khả thi. Nếu muốn bỏ khỏi tuyến phải chọn kết quả riêng rõ ràng. | Cho force approve không khả thi theo lý do của nhà xe; cần cơ chế xác nhận rủi ro/không phục vụ và API riêng, không mặc định. | **CHỐT (04/11/2026)**: **Theo Đề xuất A**. Khi kết quả là `REOPTIMIZED`, bắt buộc `previewToken` phải hợp lệ, còn hạn (TTL 10 phút) và mô phỏng phải là `FEASIBLE` (100% khả thi). Nếu hết hạn hoặc sai lệch dữ liệu `expectedFingerprint` → Trả lỗi 409 Conflict. Nếu mô phỏng không khả thi → Trả lỗi 400 BadRequest. Tuyệt đối không cho phép "Force Approve". Trường hợp tuyến không thể đáp ứng địa chỉ mới, Admin chỉ có 2 lựa chọn: Từ chối (`REJECTED`) hoặc Phê duyệt với `REMOVED_FROM_ROUTES` (rút học sinh khỏi tuyến cũ và chờ gom vào đợt tối ưu tuyến mới sau). |
| D314-02 | Địa chỉ mới chưa tới ngày áp dụng: hồ sơ hiển thị địa chỉ nào và ai cần duyệt lại tuyến? | G-01=A: giữ địa chỉ đang phục vụ tới ngày đó, hiển thị proposed/pending riêng; thay tuyến ảnh hưởng dịch vụ cần trường chấp thuận theo D36-01. Phải duyệt nơi lưu lịch hẹn Student. | Sửa hồ sơ ngay nhưng Trip vẫn theo snapshot cũ tới ngày hiệu lực; FE cần phân biệt địa chỉ hồ sơ/địa chỉ phục vụ, không hứa đón ở chỗ mới. | **CHỐT (04/11/2026)**: **Theo Đề xuất A (Đồng bộ ngay khi phê duyệt)**. Khi phê duyệt đổi địa chỉ, hệ thống thực hiện **đồng bộ ngay lập tức** vào tất cả các chuyến xe `SCHEDULED` chưa bị đóng băng (chưa `attendantReadyAt`, chưa `actualStartTime`, không phải `IN_PROGRESS`/`COMPLETED` theo quy tắc G-02), không đợi đến ngày mai hay đợi cronjob đêm. Các chuyến đã đóng băng (đã Ready/đang chạy) được giữ nguyên dữ liệu cũ. Cập nhật lại snapshot điểm dừng và cự ly/thời gian của các chuyến chưa frozen ngay lập tức để tài xế và phụ xe nhận thông tin chính xác. |

**Quy tắc cập nhật thông tin và địa chỉ học sinh (Student Address Update Policy — 04/11/2026):**
1. **Sửa dứt điểm Bug B-02**:
   - `ApproveAddressRequestDto`: Bắt buộc `previewToken` và `expectedFingerprint` khi `resolutionOutcome === 'REOPTIMIZED'`.
   - Revalidate dữ liệu chống xung đột: Xác minh `expectedFingerprint`, kiểm tra `addressPreviewSessions` còn hạn (TTL 10 phút). Nếu hết hạn ném `ConflictException` (409), nếu không khả thi ném `BadRequestException` (400).
2. **Phân quyền duyệt nghiêm ngặt (Separation of Concerns)**:
   - `SCHOOL_ADMIN`: Chỉ duyệt `INFORMATION_UPDATE` hoặc `ADDRESS_UPDATE` đối với học sinh **chưa được gán vào tuyến nào** (`assignedRouteId === null`). Nếu học sinh đang thuộc tuyến `DRAFT`/`ACTIVE`, hệ thống chặn `SCHOOL_ADMIN` và yêu cầu chuyển sang `SYSTEM_ADMIN`.
   - `SYSTEM_ADMIN`: Chỉ xử lý `ADDRESS_UPDATE` đối với học sinh có tuyến xe. Bắt buộc qua bước mô phỏng định tuyến (`POST /system-admin/update-requests/:requestId/routing-preview`) trước khi phê duyệt.
3. **Đồng bộ ngay lập tức cho các chuyến chưa frozen (D314-02 & G-01 & G-02)**:
   - Khi duyệt `REOPTIMIZED`:
     * Cập nhật tọa độ trên bảng `Student`, `RouteStop`.
     * Cập nhật `polylineGeometry`, `totalDistanceMeters`, `estimatedDurationSeconds` trên `Route`.
     * **Đồng bộ tức thì**: Quét và cập nhật ngay lập tức snapshot điểm dừng, tọa độ và thời gian đón dự kiến trên toàn bộ các chuyến `SCHEDULED` chưa frozen của các tuyến liên quan (không chờ cronjob đêm, không đợi đến ngày mai).
   - Khi duyệt `REMOVED_FROM_ROUTES`:
     * Xóa điểm dừng của học sinh trên `RouteStop`.
     * Rút học sinh khỏi danh sách điểm danh (`excludedAt = now()`, `exclusionReason = STUDENT_ADDRESS_CHANGED_REMOVED`) của toàn bộ các chuyến `SCHEDULED` chưa frozen.
     * Nếu chuyến xe không còn bất kỳ học sinh hoạt động nào → Tự động hủy chuyến (`CANCELLED`) kèm lý do rõ ràng và gửi thông báo hệ thống.
4. **Phụ huynh chủ động hủy đơn**:
   - Phụ huynh có thể tự hủy yêu cầu (`POST /parents/update-requests/:requestId/cancel`) khi đơn còn ở trạng thái `PENDING`.

**API/field dự kiến F314:**
- Tái sử dụng trọn vẹn bộ API hiện tại (`POST /otp`, `POST /verify`, `GET /system-admin/update-requests/:requestId`, `POST /:requestId/routing-preview`, `POST /:requestId/approve`, `POST /:requestId/reject`, `POST /parents/update-requests/:requestId/cancel`).
- `ApproveAddressRequestDto`: Thêm validation bắt buộc `previewToken` và `expectedFingerprint` khi `resolutionOutcome === 'REOPTIMIZED'`.
- Không thêm bảng hay trường database mới.

**API/field dự kiến F314:** có decision/resolutionOutcome/previewToken cũ, ưu tiên giữ alias. Thêm effectiveDate/fingerprint/view pending chỉ sau PO duyệt semantics; buộc token trong trường hợp đang optional là thay validation phải ghi FE rõ. Có thể cần API apply-address-change mới để giữ approve cũ; lựa chọn endpoint và migration phải chốt, không tái dùng SchoolScheduledChange sai đối tượng.

**In scope đề xuất:** consistency geometry/stops/arrival timing/counters/Trip đúng ngày; không đổi trips frozen; outcome rõ. **Ngoài scope đề xuất:** tự tìm địa chỉ thay thế/thay trường hoặc đổi phân cụm ngoài preview được duyệt. **Hội đồng:** “Duyệt thành công nhưng tuyến vẫn tới nhà cũ?” → phải có phiên bản dịch vụ và ngày hiệu lực; không coi sửa tọa độ hồ sơ là đã cập nhật mọi Trip.

**Tiêu chí:** thiếu/sai/hết hạn token không ghi bất kỳ phần nào; hai admin chỉ một quyết định thành công; solver thất bại không cập nhật tọa độ lẻ; snapshot/timing ngày được chọn đúng; REMOVED không mất lịch sử. **Bằng chứng:** [student-requests.service.ts](../../api/src/student-requests/student-requests.service.ts) `approveRequest`, `previewAddressRouting`; [routing-preview.dto.ts](../../api/src/student-requests/dto/routing-preview.dto.ts). Trạng thái: ANALYZED / NEEDS_DECISION.

## 3.15. Chèn học sinh và ngừng phục vụ — WF-15

**Đối tượng:** SYSTEM_ADMIN chèn tuyến; SCHOOL_ADMIN disable/enable học sinh; Parent theo dõi ngày đầu/ngừng dịch vụ. **Dữ liệu:** Student/RouteStop; hai Route cùng plan; RoutePlan counters; TripAttendance.excludedAt/exclusionReason và routeSnapshot; pending update request.

### Luồng nhỏ và API hiện có

1. Nhà xe xem GET `/routes/students/:studentId/routing`, `/insertion-options` → chọn cặp tuyến → POST `/routes/student-insertions/preview` → `/confirm`.
2. Source confirm hiện đã có TTL/user ownership/fingerprint nguồn, cập nhật thứ tự/giờ điểm theo preview. Không ghi lại những phần này là chưa có chỉ vì báo cáo cũ nói thiếu.
3. Source bảo toàn snapshot Trip cũ; response nói thay đổi áp dụng chuyến tạo sau. **B-04:** thêm RouteStop không tự đưa trẻ vào roster của Trip đã sinh cho ngày mai.
4. Trường xem GET `/schools/:schoolId/students/:id/disable-impact` → PATCH `/:id/status`; source remove stop khỏi plan DRAFT/ACTIVE, exclude attendance Trip chưa Ready/chưa chạy, giữ lịch sử; enable không tự xếp lại tuyến.

### Vấn đề và phương án

- Chèn khi đã sinh 7 ngày dẫn tới ngày đầu phục vụ không rõ; nếu G-01=A phải cập nhật Trip chưa frozen theo ngày; B thì phải trả ngày thực có roster, không “mai đón” bằng lời nhắn chung.
- Disable một học sinh cuối tuyến có thể làm rỗng Route/plan, cần cập nhật counters/release holds và yêu cầu mới thay vì để plan báo đang phục vụ.
- “DISABLED” đang gộp không dùng dịch vụ, nghỉ học và thôi học; hồ sơ cũ không được xóa chỉ vì ngừng đi xe. Tác động hủy pending request cũng phải nêu là do trường disable, không giả Parent tự rút.

| ID | Cần chốt chi tiết | Đề xuất A và tác động | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| D315-01 | Chèn con khi Trip tuần tới đã sinh: có bổ sung roster theo ngày hiệu lực không? | Theo G-01=A: cập nhật Trip chưa frozen từ ngày chọn, kiểm tra sức chứa/lộ trình/điểm và duyệt lại nếu cần. | Giữ Trip đã sinh; chỉ chuyến tạo sau có trẻ, phải trả ngày đầu có dịch vụ/chuyến còn thiếu. Không tự xóa rồi sinh lại. | **CHỐT (04/11/2026)**: **Theo Đề xuất A (Sửa dứt điểm Bug B-04)**. Ngay khi xác nhận chèn học sinh (`confirmStudentInsertion`), hệ thống **đồng bộ tức thì**: bổ sung `TripAttendance` cho học sinh trên toàn bộ các chuyến `SCHEDULED` chưa bị đóng băng (chưa `attendantReadyAt`, chưa `actualStartTime`, không phải `IN_PROGRESS`/`COMPLETED` theo quy tắc G-02); cập nhật lại `routeSnapshot` (điểm dừng, thứ tự đón, giờ đón dự kiến). Các chuyến đã đóng băng giữ nguyên dữ liệu cũ. Tránh triệt để tình trạng bỏ quên học sinh trong 7 ngày đã sinh. |
| D315-02 | Disable vì thôi dùng xe có áp dụng ngay lên hôm nay/đơn đang chờ không? | Ngừng dịch vụ theo ngày, giữ dữ liệu đang vận hành; request không áp dụng được đánh dấu lý do riêng hoặc giữ chờ theo loại; hồ sơ học sinh không bị coi đã thôi học. | Giữ disable tức thì như hiện trạng cho Trip chưa frozen; phải công bố các chuyến vẫn còn trẻ và cách xử lý request. | **CHỐT (04/11/2026)**: **Theo Đề xuất A**. Vô hiệu hóa học sinh (`DISABLED`) áp dụng tức thì cho các chuyến `SCHEDULED` chưa frozen: loại học sinh khỏi danh sách chuyến (`excludedAt = now()`, `exclusionReason = STUDENT_DISABLED`), cập nhật `routeSnapshot`, tự động hủy chuyến (`CANCELLED`) nếu chuyến không còn học sinh nào hoạt động. Các chuyến đã đóng băng (đang chạy/Ready) được bảo toàn snapshot. Khi kích hoạt lại (`AVAILABLE`): học sinh trở về danh sách Chưa phân tuyến, không tự động khôi phục vào tuyến cũ. |

**Quy tắc chèn học sinh và ngừng phục vụ (Student Insertion & Status Policy — 04/11/2026):**
1. **Sửa dứt điểm Bug B-04 (Đồng bộ tức thì khi chèn học sinh)**:
   - Trong `confirmStudentInsertion`: Ngoài việc tạo `RouteStop` và cập nhật thông số `Route`, transaction bắt buộc quét toàn bộ các chuyến `SCHEDULED` chưa frozen của 2 tuyến (chiều đi & chiều về).
   - Tự động tạo bản ghi `TripAttendance` cho học sinh với trạng thái ban đầu `UNMARKED`.
   - Làm mới `routeSnapshot` của các chuyến `SCHEDULED` chưa frozen để tài xế và phụ xe nhận đúng danh sách học sinh và điểm đón mới ngay trên app.
   - Các chuyến xe đã đóng băng (đã `attendantReadyAt` hoặc `IN_PROGRESS`/`COMPLETED`) được bảo toàn tuyệt đối không chèn giữa chừng.
2. **Cơ chế Cascade nguyên tử khi vô hiệu hóa (`DISABLED`)**:
   - `SCHOOL_ADMIN` thực hiện qua `PATCH /schools/:schoolId/students/:id/status`.
   - Xóa điểm dừng của học sinh trên `RouteStop`, đánh lại số thứ tự `stopOrder` (1..N) cho các điểm dừng còn lại.
   - Loại học sinh khỏi `TripAttendance` (`excludedAt = now()`) trên toàn bộ các chuyến `SCHEDULED` chưa frozen.
   - Tự động hủy các đơn nghỉ phép (`LeaveNotice`) đang chờ xử lý và các yêu cầu sửa thông tin (`StudentUpdateRequest`) đang chờ duyệt của học sinh đó.
   - Nếu việc loại học sinh làm chuyến xe trở thành rỗng (0 học sinh hoạt động) → Tự động hủy chuyến (`CANCELLED`) kèm lý do rõ ràng và gửi thông báo hệ thống.
3. **Kích hoạt lại học sinh (`AVAILABLE`)**:
   - Chỉ đổi trạng thái học sinh thành `AVAILABLE`.
   - Học sinh chuyển vào danh sách Chưa phân tuyến (`unassignedStudents`), **tuyệt đối không tự động gán lại vào tuyến cũ**. Nhà xe phải chủ động phân tuyến mới hoặc chèn lại.

**API/field dự kiến F315:**
- Tái sử dụng trọn vẹn bộ API hiện có:
  - `GET /routes/students/:studentId/routing`
  - `GET /routes/students/:studentId/insertion-options`
  - `POST /routes/student-insertions/preview`
  - `POST /routes/student-insertions/confirm`
  - `GET /schools/:schoolId/students/:id/disable-impact`
  - `PATCH /schools/:schoolId/students/:id/status`
- Không thêm DTO hay bảng database mới.

**API/field dự kiến F315:** ngày hiệu lực/ngày đầu phục vụ/impact roster nếu cần phải trình PO; giữ success/message/outboundRouteId/returnRouteId cũ. Tái dùng excludedAt cho loại khỏi roster thay vì xóa attendance. Nếu cần tách trạng thái hồ sơ và dịch vụ, trình schema riêng; không tự mở enum StudentStatus.

**Hội đồng:** “Đã phân tuyến sao không thấy con trên xe ngày mai?” → membership của Route khác roster Trip, phải có ngày bắt đầu; “Bật lại là có xe ngay?” → không, cần được phân tuyến/roster hợp lệ. **Tiêu chí:** trẻ xuất hiện đúng hai chiều/ngày đã chốt; frozen/history không đổi; tuyến rỗng/counters/holds đúng; enable không khôi phục âm thầm assignment cũ. **Bằng chứng:** [routes.service.ts](../../api/src/routes/routes.service.ts) `confirmStudentInsertion`; [students.service.ts](../../api/src/students/students.service.ts) `getDisableImpact`, `updateStatus`. Trạng thái: ANALYZED / NEEDS_DECISION.

## 3.16. Hủy và chuyển tiếp phương án — WF-16

**Đối tượng:** hai quản trị viên theo phạm vi; scheduler/lifecycle; nhân sự và Parent xem kết quả. **Dữ liệu:** RoutePlan cancellation audit, Route/stops giữ lịch sử; Trip trạng thái thật/adminFinalization; LeaveNotice/Notification; source reservation và actual busy khác nhau.

### Luồng nhỏ và API hiện có

1. Quản trị viên GET `/routes/route-plans/:id/cancellation-impact` → xem tác động → POST `/:id/cancel` với lý do/fingerprint theo DTO hiện có.
2. Hết hợp đồng/inactive/đổi địa điểm đi qua lifecycle 3.2 đã có; không làm lại workflow này hoặc đổi về DRAFT khi hết hợp đồng.
3. Trip ngoại lệ theo sự kiện 3.2 vào `/trips/admin-finalizations`, admin chốt; giữ Route/history, không giải phóng xe thực tế còn trẻ chỉ vì plan CANCELLED.
4. Đổi bãi theo 3.3 là needsReoptimization + reoptimize về DRAFT, **không** thay bằng hủy toàn bộ plan như thay địa điểm trường.

### Vấn đề và phương án

- **B-06 phần còn lại:** cancel thủ công nhận expectedFingerprint nhưng service chưa so sánh tham số đó với trạng thái hiện tại. Source đã có School lock qua assertMutablePlan, nên không lặp kết luận cũ “hoàn toàn không có khóa”; vẫn cần kiểm riêng SCHEDULED có điểm danh và các writer không cùng khóa.
- Source cancel thủ công chọn mọi SCHEDULED rồi hủy; chiều về SCHEDULED đã nhận trẻ khác chưa vận hành. Policy lifecycle 3.2 chưa tự được áp dụng cho lệnh hủy thủ công.
- Chuyển plan cũ/mới cần không tạo khoảng trống hay hai plan phục vụ cùng trẻ. Không tự phục hồi plan CANCELLED hoặc cấp lại Trip đã hủy bằng đổi status.

| ID | Cần chốt chi tiết | Đề xuất A và tác động | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| D316-01 | Hủy thủ công khi có chiều về đã điểm danh/đang chạy: chặn hủy hay vẫn hủy plan? | Cho hủy plan nhưng chỉ hủy Trip chưa vận hành; giữ chuyến đã nhận trẻ/đang chạy và điều phối đóng đúng quy trình. Cần chốt có đưa admin-finalization ngay hay để nhân sự hoàn thành; không tự thêm trigger vào JSON đã duyệt. | Chặn hủy thủ công khi còn chuyến frozen, yêu cầu đóng chuyến trước; khác lifecycle bắt buộc theo ngày. | **CHỐT (04/11/2026)**: **Theo Đề xuất A (Sửa dứt điểm Bug B-06)**. Khi hủy thủ công, hệ thống bắt buộc kiểm tra `expectedFingerprint`, ném lỗi 409 Conflict nếu dữ liệu bị thay đổi giữa chừng. Chỉ hủy các chuyến xe `SCHEDULED` chưa vận hành (chưa Ready, chưa có điểm danh, chưa Start). Bảo toàn nguyên vẹn các chuyến đã đóng băng (đang chạy hoặc chiều về đã Ready/đã điểm danh đón trẻ) để nhân sự hoàn thành lộ trình trả trẻ an toàn. Tài nguyên chỉ giải phóng sau khi chuyến xe cuối cùng kết thúc. |
| D316-02 | Chuyển tiếp phương án cũ/mới và số lượng plan của trường? | Giữ tạo/duyệt mới theo rule hiện có, công bố gián đoạn và xử lý thiếu dịch vụ; không thêm chuyển đổi tự động. | Làm cutover có ngày hiệu lực và revalidation cả hai plan/roster/resources; cần contract/schema và giữ next-day rule đã chốt; D37-02 chỉ quyết định metadata hiển thị. | **CHỐT (04/11/2026)**: **Theo định hướng của PO**. Một trường học CÓ THỂ có nhiều phương án `ACTIVE` đồng thời, với điều kiện cốt lõi: **các plan này phục vụ các nhóm học sinh hoàn toàn tách biệt nhau (Disjoint Student Groups)**, không có học sinh nào bị trùng lặp giữa hai phương án. Khi kích hoạt plan mới cho nhóm học sinh mới, plan cùng tồn tại song song với các plan hiện có. Nếu plan mới được tạo để thay thế cho một plan cũ (phục vụ cùng nhóm học sinh đó), hệ thống sẽ chuyển plan cũ sang `SUPERSEDED`/`CANCELLED` và thay thế lịch chuyến chưa chạy từ ngày mai theo quy tắc G-01 & G-02. |

**Quy tắc hủy và chuyển tiếp phương án tuyến (Plan Cancellation & Cutover Policy — 04/11/2026):**
1. **Sửa dứt điểm Bug B-06 (Bảo vệ an toàn chuyến và kiểm tra Fingerprint)**:
   - Trong `cancelRoutePlan`: Bắt buộc revalidate `expectedFingerprint`. Nếu trạng thái DB (số chuyến `SCHEDULED`, `IN_PROGRESS`, `updatedAt`) bị thay đổi so với thời điểm gọi `getCancellationImpact`, transaction ném `ConflictException` (409).
   - Áp dụng triệt để quy tắc **G-02**: Chỉ hủy các chuyến xe `SCHEDULED` chưa vận hành (thỏa mãn đồng thời `actualStartTime === null`, `attendantReadyAt === null`, và chưa có bản ghi điểm danh `PRESENT/ABSENT`).
   - Bảo toàn các chuyến đang `IN_PROGRESS` hoặc chiều về đã Ready/đã đón trẻ để phụ xe và tài xế hoàn tất đưa học sinh về nhà. Không hủy chuyến giữa chừng khi trẻ đang trên xe.
2. **Hỗ trợ Đa phương án độc lập cho một trường (Multi-Plan Disjoint Invariant)**:
   - Một trường học được phép vận hành nhiều phương án `ACTIVE` song song (ví dụ: phân chia theo khối Tiểu học / Trung học, hoặc phân chia theo cơ sở/chi nhánh).
   - **Bất biến kiểm soát trùng lặp**: Mỗi học sinh chỉ được thuộc tối đa **1 phương án DRAFT hoặc ACTIVE duy nhất**. `getPreparationData` lọc loại trừ toàn bộ học sinh đã thuộc phương án khác (`ALREADY_ASSIGNED`).
   - **Kịch bản thay thế (Plan Replacement)**: Nếu phương án mới được lập để thay thế một phương án cũ đang chạy (chia sẻ cùng nhóm học sinh), việc kích hoạt phương án mới sẽ tự động lưu trữ/hủy phương án cũ bị thay thế, các chuyến `SCHEDULED` chưa frozen của phương án cũ sẽ được hủy và thay bằng lịch của phương án mới từ thời điểm áp dụng (G-01 & G-02).

**API/field dự kiến F316:**
- Tái sử dụng trọn vẹn bộ API hiện có:
  - `GET /routes/route-plans/:id/cancellation-impact`
  - `POST /routes/route-plans/:id/cancel`
  - `GET /routes/preparation/:schoolId`
  - `POST /routes/route-plans/:id/approve`
- `cancelRoutePlan`: Bổ sung kiểm tra `expectedFingerprint` và lọc loại trừ chuyến đã Ready/có điểm danh khỏi lệnh hủy hàng loạt.
- Không thêm bảng hay trường database mới.

**API/field dự kiến F316:** dùng cancellationReason/expectedFingerprint cũ trước, bổ sung requiredness hoặc lifecycle trigger mới phải PO duyệt. Preview tác động phải phân nhóm cancel/preserve/pending; counters không giả số preserved thành đã hủy. G-04 quyết định stale preview rollback hay partial.

**Hội đồng:** “Hủy phương án có xóa lịch sử?” → không; “Đã hủy sao xe vẫn bận?” → còn Trip thực tế cần kết thúc, reservation không phải quyền bỏ trẻ. **Tiêu chí:** fingerprint cũ bị từ chối đúng; không hủy Trip vừa vận hành/đã điểm danh sai policy; không phát hủy trùng; khác biệt school relocation/parking reoptimization giữ đúng. **Bằng chứng:** [routes.service.ts](../../api/src/routes/routes.service.ts) `getCancellationImpact`, `cancelRoutePlan`; [contract-lifecycle.service.ts](../../api/src/schools/contract-lifecycle.service.ts); [system-settings.service.ts](../../api/src/system-settings/system-settings.service.ts). Trạng thái: ANALYZED / NEEDS_DECISION cho phần mới; lifecycle 3.2 đã IMPLEMENTED.

## 3.17. Sự cố và điều phối — WF-17

**Đối tượng:** Driver/attendant báo thiếu người; nhà xe/trường xử lý theo loại; attendant xác nhận cảnh báo tự động; Parent nhận thông tin trong phạm vi được chọn. **Dữ liệu:** TripIncident type/status/resolution/evidence; Trip assignments/LocationPoint; LeaveNotice liên quan; Notification.

### Luồng nhỏ và API hiện có

1. Trước chạy: GET `/trips/:id/incident-options` → POST `/trips/:id/incidents` báo thiếu nhân sự. Không tự mở loại tai nạn/y tế khi enum hiện tại chưa có.
2. Quản trị viên GET `/incidents`, `/:id`, `/:id/replacement-candidates` → POST `/:id/resolve` với ARRIVED/REPLACED hoặc `/:id/cancel-trip`.
3. Đang chạy: telemetry đánh giá OFF_ROUTE/LATE_STOP → attendant xem GET `/trips/:id/incidents` và POST `/incidents/:id/confirm`.
4. Người báo/người từng xử lý xem `/incidents/mine` theo source; không chỉ nhìn chuyến được gán hiện tại rồi làm mất lịch sử tác vụ.

### Vấn đề và phương án

- **B-03 còn cần xử lý:** nhánh REPLACED kiểm role/active/school và hold pending-admin, nhưng chưa có cùng bước overlap/recent leave của assignment/leave replacement. Chọn ứng viên trước đó không bảo đảm lúc xác nhận người còn rảnh. **Đề xuất:** một policy khả dụng dùng cho 3.8/3.13/3.17 và bàn giao 3.3; giữ trách nhiệm từng role đã chốt.
- Detector kiểm từng loại đã tồn tại trên Trip nên không tạo lại cùng loại sau khi xác nhận. Có thể là policy chống lặp, cũng có thể bỏ sót tái diễn; phải chốt ý nghĩa.
- Complete đóng cảnh báo chờ với CLOSED_WITHOUT_CONFIRMATION; không được thống kê như “không có sự cố” hoặc “đã xác minh cảnh báo sai”. Mất GPS không thể tạo kết luận đúng đường/đúng giờ.

| ID | Cần chốt chi tiết | Đề xuất A và tác động | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| D317-01 | Người thay hiện có chuyến khác/đã báo nghỉ sau khi mở danh sách: có cho resolve không? | Recheck cùng rule assignment tại mutation, từ chối nếu không còn phù hợp; không có override ngầm. Policy áp dụng tất cả entry points điều phối. | Cho ngoại lệ bởi người có thẩm quyền, bắt buộc lý do và phạm vi; không chỉ dựa role để bỏ kiểm tra. | **CHỐT (04/11/2026)**: **Theo Đề xuất A (Sửa dứt điểm Bug B-03)**. Recheck khả dụng thời gian thực tại mutation `resolveIncident` khi `action === 'REPLACED'`: bắt buộc kiểm tra không trùng lịch chạy xe (`!isTimeIntervalOverlapping`), không có `LeaveNotice` hợp lệ, tài khoản hoạt động và đúng vai trò/trường. Trả lỗi 409 Conflict nếu bận. Tuyệt đối không cho phép ép gán (Force Assign). |
| D317-02 | Ngưỡng cảnh báo telemetry và mở rộng các loại sự cố trong giai đoạn này? | Giữ một incident mỗi loại/Trip trong đợt này, thể hiện chưa xác nhận khi đóng; cứu hộ/y tế ngoài app và công bố giới hạn. | Mở episode lặp/escalation hoặc loại sự cố mới: phải chốt ngưỡng quay lại, người nhận, hạn xử lý, sự kiện kết thúc và schema. Có thể chỉ chọn một phần, không mặc định tất cả. | **CHỐT (04/11/2026)**: **Theo Đề xuất A kèm điều chỉnh siết chặt ngưỡng và mở rộng sự cố theo yêu cầu PO**:<br>1. **Giảm ngưỡng Telemetry**: `OFF_ROUTE` giảm xuống `> 50m` trong `≥ 15s`; `LATE_STOP` giảm xuống `> 3 phút` trong `≥ 15s`.<br>2. **Bổ sung 3 loại sự cố mới**: `NO_GUARDIAN_AT_STOP` (không có người đón chiều về), `TRAFFIC_DELAY` (ùn tắc giao thông/thời tiết xấu), `GPS_SIGNAL_LOST` (mất định vị > 3 phút).<br>3. **Bắt buộc lưu tọa độ GPS**: Mọi sự cố phát sinh BẮT BUỘC phải ghi nhận tọa độ GPS thực tế (`latitude`, `longitude`) nơi xảy ra sự cố vào trường `context` để hiển thị trên bản đồ. |

**Quy tắc quản lý sự cố và điều phối khẩn cấp (Incident Management Policy — 04/11/2026):**
1. **Sửa dứt điểm Bug B-03 (Kiểm tra khả dụng thời gian thực tại mutation)**:
   - Trong `resolveIncident` với `action === 'REPLACED'`:
     * Bắt buộc kiểm tra trùng lịch chạy xe với các chuyến khác trong ngày của ứng viên thay thế.
     * Kiểm tra ứng viên không có đơn xin nghỉ phép (`LeaveNotice`) đang chờ xử lý hoặc đã duyệt trên ngày/chuyến đó.
     * Kiểm tra ứng viên không phải là đối tượng vắng mặt của sự cố chưa giải quyết khác.
     * Ném lỗi `ConflictException` (409) nếu không thỏa mãn. Tuyệt đối không có ngoại lệ force-assign.
2. **Siết chặt ngưỡng cảnh báo tự động Telemetry**:
   - `OFF_ROUTE`: Lệch khỏi lộ trình đã vẽ $> 50\text{m}$ liên tục trong $\ge 15$ giây (thay vì $100\text{m} / 30\text{s}$).
   - `LATE_STOP`: Dự báo trễ điểm đón/trả tiếp theo $> 3$ phút liên tục trong $\ge 15$ giây (thay vì $5\text{ phút} / 30\text{s}$).
   - Đóng cảnh báo tự động khi hoàn thành chuyến với `action = CLOSED_WITHOUT_CONFIRMATION` nếu chưa được phụ xe xác nhận.
3. **Danh mục sự cố bổ sung & Bắt buộc lưu tọa độ GPS**:
   - Mở rộng enum `TripIncidentType`:
     * `NO_GUARDIAN_AT_STOP`: Phụ xe báo khi không có phụ huynh đón bé tại điểm trả buổi chiều (đồng bộ D310-02, giữ bé trên xe đưa về trường/bãi, gửi thông báo khẩn).
     * `TRAFFIC_DELAY`: Tài xế/phụ xe báo 1 chạm khi kẹt xe/ngập lụt/đường cấm, tự động push thông báo trễ tuyến tới phụ huynh các điểm đón/trả kế tiếp.
     * `GPS_SIGNAL_LOST`: Server tự động cảnh báo khi app tài xế mất định vị $> 3$ phút khi chuyến đang `IN_PROGRESS`.
   - **Tọa độ địa lý bắt buộc**: Mọi bản ghi `TripIncident` (dù báo thủ công hay tự động) **bắt buộc phải lưu tọa độ địa lý** `{ latitude, longitude, addressText }` tại thời điểm xảy ra sự cố vào trường `context` để hiển thị trực quan trên bản đồ điều hành.

**API/field dự kiến F317:**
- Tái sử dụng các endpoint hiện có (`GET /trips/:id/incident-options`, `POST /trips/:id/incidents`, `GET /incidents`, `GET /incidents/:id/replacement-candidates`, `POST /incidents/:id/resolve`, `POST /incidents/:id/cancel-trip`, `POST /incidents/:id/confirm`).
- `CreateIncidentDto`: Bổ sung nhận tọa độ `latitude`, `longitude` từ mobile app khi báo sự cố.
- Cập nhật enum `TripIncidentType`: bổ sung `NO_GUARDIAN_AT_STOP`, `TRAFFIC_DELAY`, `GPS_SIGNAL_LOST`.

**API/field dự kiến F317:** dùng resolution/status/evidence hiện có nếu A; cần giữ CLOSED khác CONFIRMED. Nếu episode mới cần đánh giá unique/index hiện tại, payload/actor/phạm vi, không tự tạo IncidentEvent table. Không lấy cờ “đã đọc” làm confirm sự cố.

**Hội đồng:** “Xe hỏng giữa đường làm gì?” → hiện điều phối thực tế qua nhà xe, assignment SCHEDULED không phải cứu hộ/transfer roster; “Cảnh báo đóng có nghĩa xử lý xong?” → phải xem resolution/outcome, chưa xác nhận là chưa có kết luận. **Tiêu chí:** ứng viên bận bị chặn ở mọi mutation; pending cả hai người chặn Start; completed không biến cảnh báo chưa xác nhận thành đúng/sai; lịch sử người bị thay vẫn truy được phần liên quan. **Bằng chứng:** [incidents.service.ts](../../api/src/incidents/incidents.service.ts) `resolveIncident`; [incidents-detector.service.ts](../../api/src/incidents/incidents-detector.service.ts) `evaluateTelemetry`; [trips.service.ts](../../api/src/trips/trips.service.ts) `completeTrip`. Trạng thái: ANALYZED / NEEDS_DECISION.

## 3.18. Tổng quan, thông báo và trách nhiệm xử lý — WF-18

**Đối tượng:** quản trị viên xem việc cần làm; các role xem inbox theo tài khoản; worker push gửi theo config. **Dữ liệu:** Notification thuộc User, eventKey chống lặp theo người; Session.pushToken; trạng thái thực StudentUpdateRequest/LeaveNotice/TripIncident/RoutePlan/Trip, không FK chung mọi target.

### Luồng nhỏ và API hiện có

1. Web tổng quan GET `/admin/overview` → mở danh sách/chuyến/tác vụ theo scope.
2. Chuông GET `/notifications/summary`, `/notifications` → GET `/notifications/:id/target` kiểm tra đích hiện còn khả dụng.
3. PUT `/notifications/:id/read` hoặc `/notifications/read-all` chỉ đánh đã đọc, không resolve leave/incident/request. Mobile đăng ký/xóa thiết bị qua PUT/DELETE `/notifications/device` theo session.
4. Push worker source có cấu hình bật riêng; inbox có dữ liệu không chứng minh push/native setup hoạt động. Không đổi env hoặc gửi push thật để chứng minh trong task plan.

### Vấn đề và phương án

- ACTIONABLE notification source đang thiên về incident; nhiệm vụ duyệt makeup/admin-finalization mới từ 3.2 không tự có bộ lọc việc cần làm đầy đủ chỉ vì đã có inbox. Cần chốt phạm vi tổng quan.
- Hai admin cùng thấy một việc không có nghĩa đã có người nhận trách nhiệm; muốn SLA/nhận việc phải có state nghiệp vụ riêng, không dùng readAt.
- Link thông báo có thể không khả dụng vì người được thay/chuyển scope; giữ lịch sử inbox nhưng không hứa đích vẫn thao tác được. Thống kê chuyến CANCELLED/COMPLETED hành chính 3.2 cần khác hoàn thành vận hành nếu muốn đo dịch vụ thực tế.

| ID | Cần chốt chi tiết | Đề xuất A và tác động | Lựa chọn B | Kết quả PO |
|---|---|---|---|---|
| D318-01 | Tổng quan có gom pending makeup/admin-finalization/plan cần tối ưu cùng leave/request/incident không? | Bổ sung nhóm count/link đọc-only theo trạng thái nghiệp vụ, giữ các key cũ; mỗi nhóm mở đúng API list. Tên field/count/link phải duyệt F318. | Giữ dashboard hiện tại, chức năng mới xem qua danh sách riêng; cần note FE tránh hiểu chuông không có nghĩa hết việc. | **CHỐT (04/11/2026)**: **Theo Đề xuất A**. Mở rộng mảng `tasks` trên `/admin/overview` bổ sung đếm và đường dẫn xem nhanh cho: (1) `ADMIN_FINALIZATION` (chuyến xe bất thường qua ngày chờ chốt hành chính theo Mục 3.2); (2) `REOPTIMIZATION` (phương án tuyến cần tối ưu lại lộ trình do đổi bãi/trường theo Mục 3.2 & 3.3). Giúp Quản trị viên theo dõi trọn vẹn mọi nhiệm vụ tồn đọng trên cùng một màn hình Dashboard. |
| D318-02 | Có cần “nhận xử lý”/deadline/escalation hoặc receipt người đọc push không? | Giữ G-03=A: readAt chỉ đã đọc, chưa thêm SLA/claim. Nghiệm thu push thật là task tích hợp riêng được cấp phép, không phải tự tạo nhiệm vụ mới. | Làm claim/escalation theo từng loại tác vụ, cần người thay khi nghỉ, timeout và trạng thái hoàn tất; không tạo một workflow tổng quát chưa có yêu cầu. | **CHỐT (04/11/2026)**: **Theo Đề xuất A (Tuân thủ triệt để Quy tắc G-03)**. `readAt` trên Notification chỉ mang ý nghĩa người dùng đã mở xem thông báo. Thao tác bấm "Đánh dấu đã đọc tất cả" (`read-all`) TUYỆT ĐỐI KHÔNG làm giảm số lượng nhiệm vụ cần xử lý (`tasks count`) trên hệ thống. Nhiệm vụ chỉ được coi là hoàn tất khi trạng thái nghiệp vụ thực tế đạt kết quả cuối (`RESOLVED`, `REPLACED`, `APPROVED`, `REJECTED`). Không xây dựng cơ chế Claim / Timeout / SLA phức tạp để tránh gây tắc nghẽn (deadlock) luồng vận hành. |

**Quy tắc bảng điều khiển tổng quan và thông báo (Overview & Notifications Policy — 04/11/2026):**
1. **Mở rộng các nhóm nhiệm vụ trên Dashboard Admin (`GET /admin/overview`)**:
   - Mảng `tasks` bao gồm đầy đủ 6 nhóm nhiệm vụ theo thẩm quyền:
     * `INCIDENT`: Sự cố thiếu nhân sự chờ xử lý (`WAITING_ASSIGNMENT`).
     * `LEAVE`: Đơn báo nghỉ chờ bố trí người thay (`PENDING_REPLACEMENT`).
     * `REQUEST`: Yêu cầu đổi thông tin/địa chỉ của phụ huynh chờ duyệt (`PENDING`).
     * `PLAN`: Phương án tuyến đang ở trạng thái `DRAFT` chờ duyệt.
     * `ADMIN_FINALIZATION`: Chuyến xe cần chốt hành chính (`/admin/trips/admin-finalizations`).
     * `REOPTIMIZATION`: Phương án tuyến cần tối ưu lại lộ trình (`/admin/routes?needsReoptimization=true`).
   - Mỗi task trả về `kind`, `label`, `count` và `href` chứa bộ lọc chuyên biệt để Admin bấm mở trực tiếp danh sách xử lý.
2. **Nguyên tắc phân định ranh giới Thông báo và Nghiệp vụ (G-03 Enforcement)**:
   - Thông báo (`Notification`) là kênh hiển thị cá nhân; `readAt` chỉ ghi nhận thời điểm mở xem.
   - Thao tác đánh dấu đã đọc (`PUT /notifications/:id/read` hoặc `PUT /notifications/read-all`) **không bao giờ thay đổi dữ liệu nghiệp vụ** của Trip, LeaveNotice, TripIncident, hay RoutePlan.
   - Khi một Admin hoàn tất xử lý tác vụ, nhiệm vụ tự động biến mất khỏi danh sách `tasks` của cả hai bên.
   - Khi mở thông báo cũ: Service kiểm tra `NotificationTargetsService` để đảm bảo nếu đối tượng đích đã bị xóa/hoàn tất thì hiển thị *"Nội dung không còn khả dụng"* thay vì văng lỗi.

**API/field dự kiến F318:**
- Tái sử dụng trọn vẹn bộ API hiện có:
  - `GET /admin/overview`
  - `GET /notifications/summary`
  - `GET /notifications`
  - `GET /notifications/:id/target`
  - `PUT /notifications/:id/read`
  - `PUT /notifications/read-all`
  - `PUT /notifications/device`
  - `DELETE /notifications/device`
- Mở rộng DTO `OverviewTaskDto` trả thêm 2 loại `kind: 'ADMIN_FINALIZATION'` và `kind: 'REOPTIMIZATION'`.
- Không thêm bảng hay trường database mới.

**API/field dự kiến F318:** nếu A/D318-01, thêm các task/count theo approval trước, không đổi cấu trúc tổng quan cũ hoặc ngữ nghĩa unreadCount. Không dùng push SENT thay trạng thái đã nhận việc. Source eventKey/target resolver hiện có được tái sử dụng.

**Hội đồng:** “Đã gửi thông báo sao người ta chưa làm?” → delivery/read/decision là ba bước; “Thống kê bao nhiêu chuyến hoàn thành?” → cần công bố có/không gồm chốt hành chính, không xem audit FINALIZED là trẻ đã xuống an toàn. **Tiêu chí:** read-all không làm giảm pending nghiệp vụ; counts đúng scope/ngày; retry không duplicate inbox; đích mất khả dụng không hiện dữ liệu sai; inbox hoạt động khi push tắt. **Bằng chứng:** [overview.service.ts](../../api/src/overview/overview.service.ts); [operations-policy.ts](../../api/src/overview/operations-policy.ts); [notifications.service.ts](../../api/src/notifications/notifications.service.ts); [push-delivery.service.ts](../../api/src/notifications/push-delivery.service.ts). Trạng thái: ANALYZED / NEEDS_DECISION.

## S. Registry API/field/schema — trình duyệt trong cùng file

### S1. Contract dự kiến, chưa triển khai

Toàn bộ path đang có ở từng mục mang prefix `/api/v1`. Những URL/field mới dưới đây chỉ là **candidate contract**; chưa được phép code chỉ vì xuất hiện trong bảng. Sau PO chọn nghiệp vụ, thay hàng tương ứng bằng method/path, role/scope, body/query cụ thể, example, response cũ + field thêm, errors, bảng đọc/ghi và processing flow trước khi xin duyệt contract.

| ID | Mục và điều kiện | Tái dùng trước | Candidate cần PO duyệt, không tự chọn | Tác động FE/API cũ |
|---|---|---|---|---|
| F34 | D34-01/B hoặc quản lý link sai | ParentStudentLink, API link/unlink hiện có | API quản trị thu hồi liên kết, lý do/audit; nếu chuyển trường cần schema enrollment riêng | Không tự revoke link sau đổi guardianPhone; không bỏ API unlink cũ |
| F35 | D35-01 | summary/coverage/unassignedStudents | Nếu cần xác nhận phục vụ một phần: flag/cách confirm; chưa có field required mới | Không đổi shape summary hoặc báo full coverage giả |
| F36 | D36-01/02 | Route default, Trip assigned*, needsReoptimization | API mới propagation theo ngày; ngày/phạm vi/ưu tiên override/kết quả; revision nếu thật sự cần | PATCH assignment cũ vẫn có nghĩa cũ cho tới khi PO duyệt đổi |
| F37 | D37-01/02 | type/isVirtual, generation counters/failures | firstServiceDate/reason per-date nếu thiếu; replacement Trip linkage/unique khi chọn làm | Không biến virtual ID thành Trip UUID; không đổi CANCELLED thành SCHEDULED ngầm |
| F38 | D38-01/02 | expected* trên assignment; Leave/Incident audit | Override/bàn giao có lý do/actor/đồng ý nếu được duyệt | Không tự required expected* cũ; nêu rõ hành vi mới khi reject 409 |
| F39 | D39-02 | attendance status, markedById, markedAt | API correction riêng: trạng thái kỳ vọng, kết quả, lý do, audit trước/sau; tên field chờ chốt | API điểm danh hiện có không tự trở thành correction override |
| F310 | D310-01/02 | cancellationReason, alightedAt | Nếu làm recipient/transfer: ID người nhận/quan hệ/xác nhận, không ghi đè người điểm danh | Không thêm enum attendance/Trip mới hoặc đổi ý nghĩa PRESENT khi chưa duyệt |
| F311 | D311-01/02 | Home payload, freshness, can*/disabledReason | Optional metadata trễ/pending/phạm vi tracking nếu cần, tên/nullable còn chờ | Fix Home ưu tiên giữ shape; status vẫn phản ánh thực tế |
| F312 | D312-01/02 | notice reportedById/cancelledById và snapshot | Bulk API preview/confirm + policy partial; thêm actor rút nếu schema hiện có chưa đủ | Giữ single-Trip payload và OTP hiện tại, không tự thêm allDay/fromDate |
| F313 | D313-01/02 | LeaveNotice/replacementUserId/status | Kỳ nghỉ/acknowledgement/hoàn tác bàn giao nếu chọn B | Không tự thêm status vào enum làm FE exhaustive switch lỗi |
| F314 | G-01, D314-01/02 | previewToken/decision/resolutionOutcome, request audit | Ngày hiệu lực, fingerprint nguồn, pending address, phiên bản tuyến/dịch vụ; nơi lưu cần duyệt | Token bắt buộc theo nhánh là thay validation có ảnh hưởng request cũ, phải được PO chốt |
| F315 | G-01, D315-01/02 | previewToken/fingerprint, excludedAt/exclusionReason | Ngày đầu dịch vụ/hiệu lực/impact theo Trip; trạng thái dịch vụ riêng nếu chọn tách | Giữ field response confirm cũ, thêm metadata khi duyệt, không hứa hiệu lực ngay |
| F316 | D316-01/02 | cancellation-impact/expectedFingerprint, audit admin 3.2 | Nhóm tác động cancel/preserve/pending, trigger mới hoặc cutover API nếu chọn | Không tự required fingerprint cũ hoặc tự tăng tập trigger đã duyệt |
| F317 | D317-01/02 | Incident resolution/evidence/status | Episode/escalation/rescue API/schema nếu chọn mở, không tạo trước | Giữ CLOSED khác CONFIRMED; không dùng status mới khi FE chưa được bàn giao |
| F318 | D318-01/02 | Overview task/count, unreadCount/target resolver | Tên các nhóm count/link mới; claim/deadline chỉ khi chọn làm | Additive keys, giữ readAt không ảnh hưởng quyết định nghiệp vụ |

### S2. Chuẩn lỗi và luồng xử lý dự kiến

- `400`: input/ngày/trạng thái thao tác không phù hợp nghiệp vụ; `401`: phiên không hợp lệ/inactive theo rule có sẵn; `403`: sai actor/phạm vi nghiệp vụ; `404`: không có đối tượng trong phạm vi; `409`: preview/trạng thái/phân công đã đổi hoặc nguồn lực không còn phù hợp. Đây là mapping dự kiến, từng endpoint phải ghi cụ thể trong contract; không thay mã lỗi cũ hàng loạt.
- Luồng mutation cần preview: kiểm scope và eligibility → tạo preview chỉ đọc/tính toán → người dùng xác nhận → transaction kiểm nguồn hiện hành/điểm frozen → ghi thay đổi thuộc phạm vi → ghi notification/audit cùng kết quả → trả response. GET không materialize/sửa trạng thái.
- Provider/solver lỗi: không ghi outcome REOPTIMIZED thành công khi chưa có kết quả hợp lệ; không giữ lại nửa thay đổi tọa độ/học sinh/geometry. Không đặt lời hứa atomic giữa DB và provider gửi ngoài DB.
- Trình schema tối thiểu theo từng lựa chọn, có quan hệ/index/nullability/default và migration DDL. Ưu tiên bảng hiện có; không quyết định thêm Enrollment/ServiceChange/AssignmentAcceptance/IncidentEpisode trước khi PO duyệt nhu cầu và field.
- Bản v0.1 **không có schema mới nào được duyệt**. 3.2/3.3 đã có bảng/cột thì tái sử dụng đúng nghĩa, không nhét lịch Student vào SchoolScheduledChange hoặc trách nhiệm nhận việc vào readAt/navigationState.

### S3. Hồ sơ chốt contract cho từng nhóm triển khai

| Nhóm | Business IDs | Method/path/actor/scope cuối | Input/response/errors cuối | Schema + migration | FE note + examples | Trạng thái |
|---|---|---|---|---|---|---|
| Sinh hồ sơ/quyền liên kết | D34, D312-01 | Chưa chốt | Chưa chốt | Chưa duyệt thay mới | Chờ lựa chọn | NEEDS_DECISION |
| Phân công/khả dụng | D36, D38, D313, D317-01 | Chưa chốt | Chưa chốt | Ưu tiên dữ liệu sẵn có | Chờ lựa chọn | NEEDS_DECISION |
| Phiên bản dịch vụ | G-01/G-02/G-04, D314, D315 | Chưa chốt | Chưa chốt | Nơi lưu ngày hiệu lực Student chưa duyệt | Chờ lựa chọn | NEEDS_DECISION |
| Sinh/hủy/chuyển phương án | D35, D37, D316 | Chưa chốt | Chưa chốt | Replacement/cutover nếu chọn B | Chờ lựa chọn | NEEDS_DECISION |
| Vận hành/điểm danh | D39, D310 | Chưa chốt | Chưa chốt | Correction/handover nếu chọn làm | Chờ lựa chọn | NEEDS_DECISION |
| Tracking/tổng quan | D311, D317-02, D318, G-03 | Chưa chốt | Chưa chốt | Chỉ mở nếu không đủ fields hiện có | Chờ lựa chọn | NEEDS_DECISION |

Khi một nhóm được chốt, điền ngay vào đây thay vì lập file API plan mới. Nhóm độc lập có thể được duyệt trước; không đợi PO trả lời toàn bộ 34 quyết định mới phân tích tiếp được.

## T. Trình tự triển khai tổng thể dự kiến

Đây là thứ tự đề xuất, chưa có implementation authorization. Mỗi gói chỉ được code sau khi PO yêu cầu triển khai và các contract phụ thuộc đã duyệt.

| Gói | Kết quả cần đạt | Mục nguồn | Điều kiện bắt đầu | Files dự kiến |
|---|---|---|---|---|
| P0 | Chốt ngày hiệu lực/frozen/đồng bộ/thông báo và ranh giới scope | G-01..04, S | PO quyết định; không cần code | Chính file plan này |
| P1 | Liên kết/guardianPhone, quyền rút đơn và lifecycle hồ sơ thống nhất | 3.4, 3.12, phần 3.15 | D34/D312/G-02 và contract đã chốt | parents, students, student-requests, leave-notices, DTOs |
| P2 | Một quy tắc nguồn lực xuyên assignment/leave/incident/bàn giao 3.3 | 3.6, 3.8, 3.13, 3.17 | D36/D38/D313/D317-01; bảo toàn trách nhiệm role | routes/resource-availability, trips, incidents, leave-notices, vehicles/drivers/schools trong phạm vi liên quan |
| P3 | Sửa B-02, lịch phục vụ Student và roster ngày đầu, giữ snapshot đúng | 3.14, 3.15, 3.7 | G-01/G-02/G-04, D314/D315/F314/F315, D36-01 | student-requests, routes, students, trips, snapshot/time utilities; schema chỉ khi duyệt |
| P4 | Coverage/approval/generation/cancellation đúng policy và chuyển tiếp | 3.5, 3.6, 3.7, 3.16 | D35/D36/D37/D316, P2/P3 cần thiết | routes, resource-availability, trips, school lifecycle; migration nếu được duyệt |
| P5 | No-show, correction, zero-PRESENT và ranh giới bàn giao | 3.9, 3.10, 3.12 | D39/D310/D312/G-02; không tự làm rescue | trips operation/DTO, leave-notices, notification events; audit nếu duyệt |
| P6 | Home giữ chuyến trễ, tracking trung thực, cảnh báo/tổng quan đúng tác vụ | 3.11, 3.17, 3.18 | D311/D317-02/D318/G-03 | trips home/navigation, incidents detector, overview, notifications, DTOs |
| P7 | Đồng bộ Swagger, note FE, migration deployment được cấp phép và nghiệm thu | Tất cả in scope | Từng gói có code; quyền runtime/dữ liệu riêng | decorators, DTO, migration DDL nếu có, mục U/V/W trong chính plan |

P6 sửa B-01 có thể làm sớm sau D311-01 vì độc lập; không chờ P3 nếu không có phụ thuộc contract. Không đồng nhất thứ tự phân tích 3.4…3.18 với thứ tự bắt buộc viết code. Không nhân đôi policy giữa các module chỉ vì làm thành nhiều gói.

## U. Ma trận tình huống và điều kiện nghiệm thu

Đây là tiêu chí dự kiến, **không phải scripts cần tự chạy**. Không tạo dữ liệu giả/seed/call mutation để đạt PASS. PO không cần tự chạy một danh sách dài chỉ để biết plan còn thiếu gì; agent phải kiểm source trước, chỉ đề nghị runtime với môi trường/phạm vi được phép khi thực sự cần.

| ID | Tình huống cần chứng minh | Kết quả mong đợi sau quyết định PO | Phụ thuộc |
|---|---|---|---|
| A01 | Hai Parent liên kết cùng con, một người đổi/rút đơn | Quyền nhất quán, không nhân đôi dịch vụ hoặc xóa liên kết ngoài yêu cầu | D34-01, D312-01 |
| A02 | Đổi số giám hộ khi còn request/OTP/link | Không tự coi challenge/link cũ vẫn hợp lệ cho mọi dữ liệu mới; policy đã chốt được revalidate, lịch sử giữ | D34-01, 3.1 |
| A03 | Preview có học sinh không xếp được | Coverage và thông báo phản ánh đúng số chưa phục vụ | D35-01 |
| A04 | Xe inactive hoặc nguồn trường đổi sau preview | Không xác nhận plan theo nguồn không còn phù hợp; không tạo DRAFT giả thành công | 3.2–3.3, D35 |
| A05 | Đổi default khi Trip đã có override riêng | Không ghi đè override ngoài phạm vi được duyệt | D36-02 |
| A06 | Người được chọn vừa nhận Trip khác qua incident/leave | Mutation nào cũng kiểm lại, không phụ thuộc form ứng viên cũ | D38-01, D317-01 |
| A07 | Người/xe còn chuyến thực tế chạy trễ | Không coi hết giờ dự kiến là đã rảnh; override nếu có phải đúng workflow | D38-01 |
| A08 | SCHEDULED chiều về đã điểm danh trẻ | Không bị hủy/đổi roster theo giả định chưa chạy là chưa nhận trẻ | G-02, D316-01 |
| A09 | Chèn trẻ khi 7 ngày tới đã có Trip | Ngày đầu có roster/dịch vụ đúng lựa chọn; không chỉ Route mới có tên | G-01, D315-01 |
| A10 | Đổi địa chỉ, token preview thiếu/hết hạn/nguồn đã đổi | Không ghi một phần hoặc báo REOPTIMIZED sai | D314-01, G-04 |
| A11 | Đến ngày mới đồng thời holiday/inactive/đổi bãi | Áp dụng eligibility 3.2/3.3 trước, không chạy tuyến cần tối ưu/sai địa chỉ | P3/P4 |
| A12 | Disable/enable trẻ cuối tuyến | Counters/holds/tác vụ/roster nhất quán; không tự phục hồi tuyến cũ | D315-02 |
| A13 | Hủy thủ công trong khi Start/điểm danh diễn ra | Một kết quả đúng ma trận, giữ dấu thực tế và không hủy trẻ vừa được nhận | D316-01, G-02/G-04 |
| A14 | Generate lặp trên ngày đã CANCELLED | Không xóa hoặc hồi sinh lịch sử; kết quả lý do minh bạch | D37-01 |
| A15 | Đã arrival nhưng cần sửa điểm danh sai | Correction và đón mới phân biệt; không phát BOARDING giả | D39-02 |
| A16 | Toàn bộ trẻ ABSENT chiều về | canStart và Start cùng rule; không ghi COMPLETED thay hủy khi policy không cho | D310-01 |
| A17 | Không có người nhận hoặc người nhận thay | Không dùng alightedAt để chứng minh người nhận chưa được xác minh; giữ trách nhiệm giám sát | D310-02 |
| A18 | Rút báo nghỉ sau có điểm danh mới | Không khôi phục snapshot cũ ghi đè sự thật; trả conflict hoặc xử lý theo policy | D312 |
| A19 | Cùng Trip thiếu Driver và attendant | Một đơn resolve không mở Start khi blocker kia còn | D313 |
| A20 | IN_PROGRESS quá scheduledEndAt/qua ngày | Home không làm mất chuyến; pending admin không cho thao tác bị cấm | D311-01, 3.2 |
| A21 | GPS stale/none/history có khoảng trống | Giữ độ mới/thiếu dữ liệu; không nội suy giả hoặc kết luận trẻ an toàn | D311-02 |
| A22 | Incident tái diễn hoặc Complete khi chưa confirm | Outcome/tổng quan không đánh đồng chưa xác nhận với không có sự cố | D317-02 |
| A23 | Read-all/push accepted nhưng việc chưa xử lý | unread khác pending; counters/link giữ trách nhiệm đúng | G-03, D318 |
| A24 | Retry/lỗi khi lưu hoặc provider/solver thất bại | Không duplicate business action/inbox, không báo thành công với dữ liệu dở dang | G-04 |

Trạng thái toàn bộ A01–A24: NOT_VERIFIED trong task lập plan này. Không gán PASS từ static review hoặc từ kết quả unit tests lịch sử ở LATEST của task khác. Các ca cần mutation vẫn BLOCKED_BY_TEST_DATA_POLICY khi chưa được PO cho phép cụ thể; user hiện vẫn cấm script test.

## V. Bàn giao FE và tiêu chí sẵn sàng triển khai

### V1. Nguyên tắc FE áp dụng xuyên các mục

- Giữ field cũ và alias endpoint cũ trừ thay đổi nghiệp vụ được PO duyệt rõ. Trình bày cả **hành vi** thay đổi, không chỉ tuyên bố payload không đổi.
- Field mới thêm phải ghi tên, kiểu, required/optional/nullable, giá trị/default và lỗi. Không ép FE hiểu enum mới hoặc `status` cũ bị đổi nghĩa trong im lặng.
- Phân biệt Route membership/Trip roster, lịch dự kiến/chuyến đã lưu, ngày đặt lịch/ngày thực áp dụng, lên xe/xuống xe/bàn giao, admin chốt hành chính/hoàn thành vận hành.
- FE dùng can*/disabledReason/trạng thái hiệu lực và xử lý 409 bằng tải lại đúng đối tượng; không suy quyền thao tác chỉ từ SCHEDULED hoặc ACTIVE.
- Tới lượt triển khai, note PR ngắn bằng text trong chat theo yêu cầu PO, ghi endpoint/body/response thay đổi, migration và lệnh chạy local cần thiết. Không tự viết UI để bù contract API thiếu rõ.

### V2. Điều kiện để gọi là plan hoàn chỉnh đã chốt

- [x] Có đủ 15 mục 3.4–3.18; actor, bảng/quan hệ, luồng màn hình/API hiện có.
- [x] Có vấn đề nghiệp vụ, ví dụ, phương án A/B và tác động, câu hỏi hội đồng/hướng trả lời, scope đề xuất.
- [x] Có 4 quyết định dùng chung, 30 quyết định theo mục, registry 15 nhóm field, dependencies, gói triển khai, tiêu chí nghiệm thu.
- [ ] G-01..04 và D34..D318 được PO chốt hoặc đánh dấu hoãn/ngoài scope; không còn câu trả lời mơ hồ làm đổi contract.
- [ ] Registry S có method/path/body/response/errors/roles/default cụ thể cho các phần chọn in scope; schema/index/migration được duyệt khi có.
- [ ] Resolve các xung đột giữa policy chung và quyết định riêng, ghi nội dung bị thay thế trong W.
- [ ] PO phê duyệt triển khai các gói được chọn. Phê duyệt plan không tự là quyền apply DB, cài package, sửa env, test scripts hoặc runtime mutation ngoài phạm vi cho phép.

## W. Nhật ký thay đổi và quyết định

| Revision/ngày | Nguồn/quyết định | Nội dung hiện hành | Mục chịu tác động | Trạng thái |
|---|---|---|---|---|
| v0.1 — 03/11/2026 | PO yêu cầu phân tích đồng loạt và cập nhật chung một file | Tạo plan 3.4–3.18; ghi nhận 3.3 đã triển khai qua commit d0b4063; lấy 3.1–3.3 làm baseline | Toàn bộ | ANALYZED / NEEDS_DECISION; chưa code mới |
| v0.2 — 03/11/2026 | PO chốt mục D (G-01, G-02, G-03, G-04) | G-01: Đồng bộ Trip ngày mai ngay khi duyệt; G-02: Phương án A (Ready/điểm danh/IN_PROGRESS là frozen); G-03: Đề xuất A (inbox/push hiện có, không nút nhận việc); G-04: Đề xuất A (All-or-Nothing rollback toàn bộ) | D, P0, P3, P5, P6, A08, A09, A10, A13, A24 | G-01..04: APPROVED |
| v0.3 — 04/11/2026 | PO chốt mục 3.4 (D34-01, D34-02, phân quyền Phụ huynh) | D34-01: Đề xuất A (đổi guardianPhone giữ link, trường có thao tác thu hồi sai có audit); D34-02: Không chuyển trường; Không phân cấp phụ huynh chính/phụ (quyền hạn bình đẳng) | 3.4, P1, F34 | D34-01/02: APPROVED |
| v0.4 — 04/11/2026 | PO chốt mục 3.5 (D35-01, D35-02) và duyệt 2 tính năng mở rộng | D35-01: Đề xuất A (tạo DRAFT cho học sinh đã xếp được, công bố danh sách chưa có tuyến); D35-02: Đề xuất A cả 2 phần (khảo sát thực địa offline, quản lý trần thời gian toàn tuyến); Duyệt thêm trường province và cấu hình maxOperatingRadiusKm | 3.5, F35 | D35-01/02: APPROVED |

Mẫu cho lần sau: `v0.x — ngày | ý PO/ID quyết định | lựa chọn cuối + thay thế lựa chọn cũ nào | mục/field/gói/ca nghiệm thu cần đổi | trạng thái mới`. Không ghi “đồng ý hết” nếu PO chỉ trả lời một ID.

## X. Nguồn và giới hạn

- Bằng chứng source tại HEAD `d0b4063`: schema; services/controllers/DTO của parents/students/routes/trips/student-requests/leave-notices/incidents/overview/notifications; 3.2 school lifecycle và 3.3 vehicles/drivers/system-settings. Link ở từng mục dẫn tới file source; tên method là anchor tra cứu khi line thay đổi.
- Đã đối chiếu WORKING_RULES → BUSINESS_CONTEXT → CODEX_HANDOFF → CURRENT_STATE → LATEST (implementation 3.3), tracker và các plan chuyên biệt liên quan. File history là ngữ cảnh, không thay bằng source/quyết định PO mới nhất.
- Danh mục đường dẫn màn hình Web/Mobile được đọc từ repository. Các thao tác màn hình trong plan diễn tả workflow, không tuyên bố từng nhãn/nút hiện đã đúng hoặc UI đã nghiệm thu. Không chạy browser/mobile để chứng minh, không sửa UI.
- Đã đọc trực tiếp các nhánh Home, Start/attendance/QR/Complete, approve-address, confirm-insertion, manual-cancel, incident replacement, leave cancellation/assignment, notification/task filters để tránh chỉ chép bug baseline cũ. B-01/B-02 có dấu hiệu source cụ thể; không gọi đó là tái hiện runtime. Chưa audit mọi dòng hoặc mọi trường hợp concurrent giữa toàn bộ entry points.
- Không chạy test scripts, typecheck/build, DB/API requests, migrations, providers hoặc chỉnh env trong task chỉ tài liệu này. Các số tests trong báo cáo 3.3 là kết quả tác vụ trước, không được dùng làm verification của plan mới.
- Không tự chốt thu phí/hoàn phí, multi-operator/multi-depot, qua đêm, full offline, rescue/medical workflows. Đây là các mở rộng cần PO chọn scope, không mặc định xuất hiện trong implementation 3.4–3.18.

**Bước tiếp theo duy nhất:** PO cập nhật quyết định bắt đầu từ G-01/G-02 và mục 3.4; mọi phản hồi sẽ được ghi/sửa ngay trong file này và lan sang các phần phụ thuộc.
