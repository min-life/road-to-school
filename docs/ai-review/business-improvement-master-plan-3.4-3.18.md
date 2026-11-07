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

## Y. Bộ nghiệp vụ đích sau đợt hoàn thiện P0–P6 — 06/11/2026

Đây là bản tổng hợp theo yêu cầu PO trước implementation, bao gồm nền hiện có và các cải thiện 3.1–3.18. Các quyết định đã chốt trong hội thoại và cột CHỐT được ưu tiên. Phần còn chờ được ghi riêng ở Y22. Bản này mô tả hành vi phải đạt sau triển khai và nghiệm thu, không xác nhận source hiện đã thực hiện đủ. Chưa phê duyệt bổ sung endpoint/field/schema từ việc tổng hợp. P0–P6 là thứ tự kỹ thuật, các luồng 3.1–3.18 dưới đây là phạm vi nghiệp vụ.

### Y1. Mô hình vận hành, vai trò và dữ liệu

- Một nhà xe vận hành một bãi trung tâm, phục vụ nhiều trường theo hợp đồng. Một chuyến thuộc một trường. Nhân sự nhà xe gồm tài xế; trường quản lý giáo viên phụ xe và học sinh.
- Năm role cố định. SYSTEM_ADMIN dùng Web để quản lý trường/hợp đồng/bãi/xe/tài xế, lập phương án, điều phối, sinh chuyến thủ công, duyệt học bù và chốt chuyến ngoại lệ. SCHOOL_ADMIN dùng Web để quản lý học sinh/liên kết sai/giáo viên trường mình, gán phụ xe, quản lý nghỉ trường/đề nghị học bù, xử lý yêu cầu thuộc thẩm quyền và duy nhất duyệt DRAFT → ACTIVE.
- DRIVER dùng Mobile để xem lịch, Ready của phụ xe, Start, điều hướng/GPS, xác nhận đến trường, Complete, báo nghỉ và báo sự cố thuộc quyền. BUS_ATTENDANT dùng Mobile để Ready, điểm danh/QR/xuống xe, báo nghỉ/sự cố, xác nhận cảnh báo và hủy chiều về toàn vắng theo điều kiện.
- PARENT dùng Mobile, quản lý tài khoản/liên kết, xem lịch và lịch sử con, báo nghỉ từng chuyến, yêu cầu sửa thông tin/địa chỉ và theo dõi xe theo quyền. Một tài khoản có một role, tài khoản riêng khi có vai trò khác.
- School có nhiều Student, SchoolAdmin và BusAttendant. Parent–Student là nhiều–nhiều qua link. School có nhiều RoutePlan; Plan có nhiều Route một chiều; Route có các RouteStop; Route có Trip theo ngày. Trip có roster/TripAttendance và snapshot riêng, phân công thực tế, GPS, đơn nghỉ, sự cố và audit. Thông báo thuộc người nhận.
- Phương án, tuyến và chuyến có ý nghĩa riêng. Đổi dữ liệu nguồn không sửa lịch sử đã hoàn thành. Học sinh được phục vụ phải hiện ở roster thực tế của chuyến; có hồ sơ hoặc link chưa tạo ra quyền được đón.

### Y2. Quy tắc chung xuyên hệ thống

- Ngày nghiệp vụ theo Việt Nam UTC+7. Hợp đồng gồm ngày cuối, hết hạn từ ngày kế tiếp. Lịch hẹn trường hiệu lực từ đầu ngày được chọn.
- Trip SCHEDULED vẫn có thể frozen nếu phụ xe Ready, có điểm danh hoặc dấu vận hành. Trip đang chạy/đã hoàn thành giữ dữ liệu vận hành. Mutation thường lệ không đổi roster, điểm đón hoặc phân công của chuyến frozen.
- Lifecycle 3.2 có ma trận riêng tại Y4/Y21. Điều phối sự cố có quyền riêng được duyệt, không biến điều phối thường lệ thành quyền sửa mọi chuyến.
- Mỗi thay đổi dịch vụ một phạm vi phải kiểm trạng thái thực khi xác nhận. Tất cả thay đổi nghiệp vụ liên quan thành công cùng nhau hoặc bị từ chối toàn bộ. Bấm lặp/retry không tạo thêm link, notice, decision, Trip hoặc notification nghiệp vụ.
- Giữ hai mức Route default và Trip assignment. Mọi đồng bộ phải đúng nguồn lực thuộc thay đổi, đúng ngày dịch vụ, snapshot/roster và giờ tuyệt đối cùng nhất quán, không chạm lịch sử.
- Quyết định vẫn có hiệu lực theo ngày dù cron chưa cập nhật DB. Đọc dữ liệu không âm thầm hủy/chuyển trạng thái. Đối soát sau restart ghi nhận phần đến hạn và audit/notification đúng một lần. Khi mọi tiến trình tắt, việc ghi DB/gửi thông báo chờ tiến trình hoạt động trở lại.

### Y3. 3.1 — Tài khoản, xác thực và bàn giao nhân sự

1. Parent đăng ký bằng số điện thoại, xác thực OTP, đăng nhập Mobile. Đăng ký thành công chưa liên kết với học sinh.
2. Admin tạo tài khoản nhân sự theo role/trường được quản lý. **PO bổ sung 06/11/2026: bắt buộc có cả email và số điện thoại** đối với DRIVER, SCHOOL_ADMIN và BUS_ATTENDANT. Sinh mật khẩu ban đầu và giao qua email đã lưu. Số điện thoại dùng cho liên hệ và các luồng OTP theo purpose/kênh hiện hành; bàn giao mật khẩu nhân sự chỉ qua email. API tạo nhân sự phải từ chối thiếu/rỗng/sai định dạng email hoặc số điện thoại trước khi tạo tài khoản. API và Swagger hiện yêu cầu phone khi tạo nhân sự. FE cần gửi cả email và phone. Chính sách bổ sung số cho tài khoản nhân sự cũ thiếu phone cần PO chốt trước khi áp quy tắc lên tài khoản hiện hữu.
3. Nếu email thất bại sau tạo, giữ tài khoản để admin cấp lại mật khẩu. Trạng thái trả SENT khi máy chủ email chấp nhận, FAILED khi lỗi, CONSOLE khi log development. SENT không chứng minh người nhận đã đọc.
4. Cấp lại mật khẩu cho cả nhân sự đã đăng nhập, kể cả đang có chuyến chạy. Lưu mật khẩu mới trước, mật khẩu cũ hết hiệu lực cho lần đăng nhập tiếp theo; session đang dùng tiếp tục tồn tại. Nếu email lỗi, admin gửi lại bằng một mật khẩu mới khác.
5. OTP dùng đúng purpose/người/đối tượng/nội dung, còn hạn và còn lượt thử. Ghi nhận lần sai thực tế, không dùng lại mã đã consume, không tạo nghiệp vụ chỉ vì đã gửi OTP. Retry sau lỗi phải nhất quán với kết quả đã ghi.
6. SMS qua mẫu test gửi thật của eSMS bằng Brandname thử được cấp, Sandbox không được diễn giải thành SMS thật. Development giữ console theo mode. OTP email theo cấu hình email, độc lập với chính sách bàn giao mật khẩu nhân sự.
7. Người dùng có đăng nhập/refresh/logout/quên hoặc tự đổi mật khẩu và cập nhật hồ sơ trong quyền. Giữ phân biệt chính sách session tự đổi/quên mật khẩu với admin cấp lại nhân sự. Logout/hết session không làm mất Trip hay điểm danh. Đăng nhập lại tiếp tục khi còn được phân công và Trip còn cho phép.
8. Mất số giám hộ liên hệ trường xác minh và sửa hồ sơ học sinh. Không tự chuyển account/login phone hoặc chuyển link do một yêu cầu đổi số giám hộ.

### Y4. 3.2 — Trường, hợp đồng và hiệu lực dịch vụ

1. Nhà xe khởi tạo trường, địa chỉ/tọa độ, hợp đồng, lịch tuần và giờ đưa đón. Giờ đến trường là giờ học sinh cần có mặt. Địa chỉ mô tả và tọa độ cùng một vị trí.
2. Inactive phải hẹn từ ngày mai tới ngày cuối hợp đồng. Trước mốc, trường và phương án cũ tiếp tục theo điều kiện hiện hành. Tới mốc, hủy phương án cũ, xử lý Trip theo Y21 và chặn nghiệp vụ dịch vụ mới.
3. SCHOOL_ADMIN/BUS_ATTENDANT của trường inactive không đăng nhập hoặc tiếp tục phiên tác nghiệp, me/refresh/request phù hợp trả 401 để FE logout. Active lại phải đăng nhập mới.
4. Parent giữ account/link, xem dữ liệu cũ của con; mutation dịch vụ của con ở trường inactive bị chặn. Con ở trường còn hoạt động vẫn dùng bình thường. Unlink cá nhân giữ phạm vi hiện hành đã chốt.
5. Active lại không hồi sinh plan/Trip đã hủy. Lịch inactive tương lai phải được hủy riêng nếu muốn bỏ, không tự mất do active.
6. Gia hạn thuần giữ ngày bắt đầu. Khi không có DRAFT/ACTIVE, gia hạn theo kiểm tra hợp đồng hiện hành. Khi có DRAFT/ACTIVE, kiểm mọi nguồn lực đang được phân công vẫn phù hợp trong phần gia hạn, tránh chiếm nguồn lực đã dành cho hợp đồng khác. DRAFT chưa gán đủ không bị tự gán vì gia hạn.
7. Hết hợp đồng hủy phương án cũ, giải phóng giữ chỗ theo hợp đồng. Giữ tuyến/điểm/phân công lịch sử và Trip hoàn thành. Chuyến ngoại lệ giữ bận tài nguyên tới chốt hành chính. Chỉ hết hợp đồng không khóa account, không unlink Parent. Gia hạn sau hết hạn không phục hồi phương án cũ.
8. Đổi lịch tuần từ ngày mai tới hết hợp đồng, không sửa hôm nay. Tính đúng ngày chạy, giờ đầu/cuối và từng điểm theo lịch hiệu lực. Báo thay đổi lịch tới người liên quan.
9. Đổi địa điểm được hẹn khi còn plan cũ. Trước ngày đổi dùng địa điểm/plan cũ; đến ngày đổi hủy toàn bộ plan cũ rồi tạo/duyệt plan mới theo địa điểm mới. Không tự tạo hoặc duyệt thay trường. Giữ quy tắc ngày sau activation, nên ngày chuyển có thể gián đoạn.
10. Lịch hẹn đang chờ có thể hủy trước ngày hiệu lực, lưu dấu vết. FE phân biệt “đã hẹn” với “đã áp dụng”, trạng thái lưu với trạng thái hiệu lực. Response giữ thông tin đang có hiệu lực và metadata lịch hẹn đã duyệt.

### Y5. 3.2 — Ngày nghỉ và học bù

- Ngày nghỉ gồm phạm vi nhà xe hoặc một trường, lặp hằng năm hoặc một năm cụ thể, âm/dương lịch Việt Nam. Phân biệt tháng thường và tháng nhuận. Ngày không tồn tại trong năm thì bỏ lần xuất hiện đó.
- SYSTEM_ADMIN quản lý nghỉ nhà xe. SCHOOL_ADMIN quản lý nghỉ trường mình, tạo yêu cầu học bù có giờ vận hành; SYSTEM_ADMIN duyệt hoặc từ chối.
- Ngày nghỉ chỉ định phải báo trước ngày. Không tạo Trip mới vào ngày nghỉ hiệu lực. Trip đã sinh giữ tới ngày, tới ngày hủy hoặc đưa vào ngoại lệ theo Y21.
- Hủy nghỉ hợp lệ trước ngày thì Trip gốc chưa hủy tiếp tục; không phục hồi ngầm các Trip đã CANCELLED vì nguyên nhân khác.
- Học bù có hiệu lực sau duyệt và phải báo trước ngày. Có thể vượt lịch nghỉ của chính trường, không vượt bất kỳ nghỉ nhà xe nào.
- Nếu nghỉ nhà xe được thêm sau học bù đã duyệt, học bù bị BLOCKED về hiệu lực, giữ approval và lý do, thông báo trường. Nếu bỏ nghỉ hợp lệ, tính lại eligibility; Trip đã CANCELLED cần reopen theo điều kiện.
- Thứ tự xác định có dịch vụ là hiệu lực trường/hợp đồng/phương án, nghỉ nhà xe, học bù được duyệt, nghỉ trường, lịch tuần. Học bù không vượt các điều kiện dịch vụ nền.
- Đợt 3.2 chưa chốt thao tác hủy MAKEUP đã duyệt; không coi hủy holiday và hủy makeup là cùng contract.

### Y6. 3.3 — Xe, tài xế, phụ xe và bãi

- Nhà xe quản lý xe/tài xế và trạng thái hoạt động. Trường quản lý phụ xe trường mình. Bật hoạt động không tự phục hồi ca hoặc plan cũ.
- Xe đủ chỗ cho roster phục vụ, người đúng role/trường, active, không nghỉ hoặc vắng chưa giải quyết ở thời gian liên quan, không trùng nhiệm vụ và không bị giữ bận bởi Trip ngoại lệ.
- Xe/tài xế phục vụ một trường trong thời gian hợp đồng theo rule đã chốt. Nguồn lực trong các phương án giữ chỗ hợp lệ không được lấy sang phạm vi xung đột.
- Inactive phải xem tác động và bàn giao các phân công bắt buộc cho người/xe hợp lệ cùng một lần lưu. IN_PROGRESS chặn inactive; Trip Ready/đã điểm danh phải theo G-02 và ngoại lệ được duyệt. Không dừng account/xe rồi bỏ các chuyến không có nguồn lực.
- Inactive nhân sự thu hồi session của nhân sự đó, khác cấp lại mật khẩu. Quyền quản trị theo role/trường.
- Bãi trung tâm có vị trí đang dùng, lịch đổi vị trí và bán kính phục vụ cấu hình được theo phần mở rộng 3.5. Đổi vị trí từ ngày mai, trước mốc vẫn dùng bãi cũ. Tới mốc tuyến chưa phù hợp không được sinh/vận hành như đã tối ưu.
- Đổi bãi giữ plan, đánh dấu needsReoptimization và lý do, xử lý các Trip từ mốc theo chính sách cần chốt Y22. Re-optimize từng tuyến giữ xe và nhóm học sinh, kiểm thời lượng tuyến và thời gian dừng. Một tuyến không đạt thì không lưu cả đợt. Thành công plan về DRAFT chờ trường duyệt.
- Tên tuyến TDxx/TVxx có mã phân biệt, tách khỏi biển số để đổi xe không phải đổi tên tuyến.

### Y7. 3.4 — Hồ sơ học sinh và liên kết Parent

- SCHOOL_ADMIN tạo/sửa/xem hồ sơ học sinh trường mình, mã học sinh, địa chỉ/tọa độ và số giám hộ. AVAILABLE là đủ trạng thái hồ sơ để xét dịch vụ; có tuyến/roster mới xác định được lịch đón thực tế.
- Parent nhập mã con và OTP tới guardianPhone trong hồ sơ trường để tạo link. Một Parent liên kết nhiều con, một trẻ nhiều Parent, quyền theo dõi bình đẳng. Không tạo trùng cùng link.
- Parent tự hủy link không thay đổi hồ sơ, phân tuyến, roster hoặc lịch sử. Mất link thì quyền theo dõi tương lai phụ thuộc link hợp lệ.
- Đổi guardianPhone giữ link hiện có. Nếu link sai, trường xác minh ngoài app rồi thu hồi đúng link kèm người/lý do/thời điểm, giữ link khác và lịch sử nghiệp vụ.
- Chuyển trường/năm học đầy đủ nằm ngoài đợt hiện tại, không đổi schoolId rồi gán lịch sử cũ cho trường khác.

### Y8. 3.5 — Chuẩn bị và tạo phương án

1. Nhà xe chọn trường, học sinh AVAILABLE có vị trí hợp lệ và chưa được phục vụ trùng, xe phù hợp và cấu hình tuyến.
2. Tỉnh/thành được lấy từ reverse geocoding khi lưu địa chỉ/tọa độ để hỗ trợ lọc. Khoảng cách Haversine điểm đón–bãi so với bán kính tối đa cấu hình bởi nhà xe. Quy tắc vượt bán kính phải theo ngoại lệ được duyệt, không chỉ ẩn khỏi danh sách để API trực tiếp vẫn dùng được. Default 50 km và trường hợp thiếu tỉnh/chất lượng geocode cần chốt Y22.
3. Preview tối ưu nhóm học sinh, lộ trình hai chiều, sức chứa, thời gian di chuyển/tổng tuyến và thời gian dừng theo cấu hình. Xem nhóm đã xếp, chưa xếp, không khả thi và lý do.
4. Có thể xác nhận DRAFT cho phần đã phục vụ được đủ theo yêu cầu, công khai nhóm chưa có tuyến để điều phối. Không đếm học sinh chưa xếp vào coverage/roster.
5. Xác nhận kiểm lại trường, nguồn lực, học sinh, vị trí và dữ liệu nguồn. Preview hết hiệu lực phải làm lại; không lưu tuyến rỗng hoặc nửa đợt.
6. DRAFT giữ chỗ xe theo quy tắc hợp đồng. Khảo sát thực địa điểm đón do nhà xe/trường thực hiện ngoài app; tối ưu bản đồ không xác nhận điểm đón an toàn.

### Y9. 3.6 — Gán nguồn lực và phê duyệt

- Nhà xe gán xe/tài xế, trường gán phụ xe cho nhóm tuyến đi/về. Một nhóm dùng bộ nguồn lực nhất quán, không trùng tài xế/phụ xe với nhóm khác trong cùng plan. Xe có thể phục vụ hai chiều của cùng nhóm.
- Danh sách ứng viên có điều kiện đủ/không đủ và lý do. Khi lưu vẫn kiểm lại hoạt động, sức chứa, hợp đồng, đơn trường, thời gian và giữ bận thực tế.
- Chỉ SCHOOL_ADMIN đúng trường duyệt DRAFT → ACTIVE. Readiness và commit duyệt cùng điều kiện, đủ hai chiều/roster/nguồn lực phù hợp.
- Đổi riêng nguồn lực hợp lệ trên ACTIVE không đổi dịch vụ thì không phải duyệt lại. Đổi default có hiệu lực ngay, đồng bộ các Trip chưa frozen từ hôm nay; không đổi chuyến lịch sử.
- Giữ phạm vi phân công riêng của Trip theo kết luận ưu tiên cần chốt Y22. Re-optimize do đổi bãi đưa về DRAFT để duyệt lại theo 3.3.

### Y10. 3.7 — Sinh chuyến, lịch dự kiến và reopen

- Hệ thống sinh trước theo lịch hiện hành; nhà xe có quyền sinh thủ công. Điều kiện là plan ACTIVE và hiệu lực, ngày trong hợp đồng/sau activation, lịch dịch vụ hợp lệ, nguồn lực đủ và tuyến phù hợp vị trí đang áp dụng.
- Một Route–ngày tối đa một Trip. Generate lặp không tạo trùng, không tự phục hồi CANCELLED. Mỗi Trip có snapshot tuyến/giờ/phân công và roster riêng.
- Lịch dự kiến VIRTUAL có nhãn phân biệt với Trip thật. Không Ready, Start, điểm danh hoặc báo nghỉ trên virtual ID. GET lịch không tạo Trip.
- firstServiceDate là ngày phục vụ thực tế đầu tiên đủ điều kiện sau activation, xét calendar và hợp đồng. Không hứa có chuyến cùng ngày approve.
- SYSTEM_ADMIN có thể reopen CANCELLED trước scheduledStartAt nếu plan ACTIVE, trường/ngày còn phục vụ, nguồn lực hợp lệ và không trùng. Bắt buộc lý do; lưu lần hủy/lần mở lại; có thể chỉ định nguồn lực thay thế theo contract được chốt.
- Reset Ready/dấu vận hành và roster theo trạng thái hợp lệ cần chốt cho từng loại hủy. Giữ báo nghỉ cá nhân còn hiệu lực, không đặt trẻ đã có nghỉ thành có mặt. Không cho “reopen” che một chuyến đã chạy/nhận trẻ trước đó mà chưa xử lý.
- Gửi thông báo sau mở lại. Reopen cùng một Trip giữ uniqueness và lịch sử. Thời điểm/field audit cụ thể chưa tự duyệt ở tài liệu này.

### Y11. 3.8 — Phân công từng chuyến

- Nhà xe đổi xe/tài xế; trường đổi phụ xe đúng trường. Xem dữ liệu hiện tại, ứng viên và xác nhận thay trong Trip SCHEDULED chưa frozen.
- Trạng thái/phân công đổi sau khi mở form thì báo xung đột, không ghi đè im lặng. Kiểm nguồn lực theo roster thực tế và ngày của Trip.
- Thay một ca không sửa Route default. Thay thường lệ không xử lý ngầm đơn nghỉ hoặc sự cố đang chờ.
- Trip trước còn IN_PROGRESS giữ bận xe/người dù quá giờ dự kiến, chặn bắt đầu Trip tiếp theo. Hai Start cùng tài nguyên chỉ một được phép bắt đầu.
- Cảnh báo LATE_RUNNING_TRIP_RISK trước giờ chuyến kế tiếp để admin đổi nguồn lực. Buffer cụ thể chờ chốt.
- Frozen chỉ đổi theo workflow điều phối được duyệt; bàn giao trẻ/xe giữa đường là phần cần contract riêng, không hứa sửa assignment là đã hoàn tất bàn giao.

### Y12. 3.9 — Vận hành chiều đến trường

1. Phụ xe được gán Ready. Tài xế Start sau Ready và các điều kiện nguồn lực, hợp đồng, ngày, roster và blocker đã đạt. Chiều đi có thể Start khi roster còn UNMARKED.
2. LIVE giữ mốc Ready từ 15 phút trước giờ chạy, Start từ 5 phút trước giờ chạy và rào cản thời gian hiện hành. TEST bỏ mốc thời gian theo cấu hình đã có, vẫn tuân role và trạng thái nghiệp vụ.
3. Dọc đường phụ xe điểm danh thủ công hoặc QR. UNMARKED là chưa có kết quả, PRESENT là đã lên xe, ABSENT là không đi chuyến đó và cần lý do.
4. Trẻ không có ở điểm đón, phụ xe gọi Parent và đánh giá thực tế trước khi ghi vắng. Khoảng chờ 2–3 phút là hướng dẫn liên hệ, không có timer tự quyết vắng.
5. Trước đến trường có thể sửa/hoàn tác theo D39-02. ABSENT → PRESENT khi thực sự đón trẻ dùng Boarding; sửa nhầm cần thông báo đính chính đúng bản chất. Yêu cầu reason/cách phân biệt thao tác sửa được chốt ở contract.
6. Khi không còn UNMARKED, tài xế xác nhận đến trường. Sau đó không hoàn tác UNMARKED hoặc quét QR đón mới. Correction có lý do/audit trước Complete và không phát Boarding mới.
7. Phụ xe ghi xuống xe cho từng trẻ PRESENT, giữ dấu người/thời điểm theo contract. Driver Complete khi đã đến trường và mọi PRESENT đã xuống.
8. GPS gần trường hoặc một thao tác Complete không tự tạo alighting. Chốt hành chính theo Y21 là đường xử lý ngoại lệ riêng.

### Y13. 3.10 — Vận hành chiều về

1. Phụ xe Ready, nhận và điểm danh trẻ tại trường khi SCHEDULED. Trẻ Parent tự đón không dùng chuyến về được ghi nhận vắng có lý do.
2. Start chỉ khi không còn UNMARKED, ABSENT có lý do, có ít nhất một PRESENT, đủ nguồn lực và không có blocker.
3. Nếu tất cả vắng, nút Start và API cùng bị chặn. Phụ xe xác nhận hủy do toàn vắng; admin có quyền dự phòng. Lưu lý do, thông báo đúng sự kiện, xe về bãi bằng quy trình nội bộ.
4. Xe trả tại từng điểm, phụ xe xác nhận alighting khi thực sự xuống. Sau Start không hoàn tác UNMARKED, không đổi trẻ đang trên xe thành vắng để cho phép kết thúc.
5. Không có người nhận thì giữ trẻ dưới giám sát trên xe, liên hệ Parent/trường/nhà xe, báo NO_GUARDIAN_AT_STOP gắn đúng trẻ, không ghi đã xuống. Trường/nhà xe điều phối điểm bàn giao thực tế; authority và cách ghi kết quả còn chốt Y22.
6. Driver Complete sau hành trình về bãi và tất cả PRESENT đã xuống. Dữ liệu hiển thị phải phân biệt thực tế đã xuống với admin chốt trạng thái.

### Y14. 3.11 — Theo dõi, điều hướng và lịch sử

- Driver/phụ xe xem lịch ngày/tuần, Trip được gán, tuyến/điểm/giờ, xe/người và roster trong quyền. Home ưu tiên Trip IN_PROGRESS kể cả quá giờ hoặc qua ngày.
- Parent xem hồ sơ/lịch con, tình trạng đón/trả, xe/người và vị trí xe liên quan. Trong IN_PROGRESS được theo dõi toàn chuyến, kể cả trước con lên và sau con xuống.
- Parent chỉ nhận dữ liệu điểm con mình và trường, vị trí xe. Không trả điểm nhà khác qua stop list, dữ liệu tuyến hoặc thông tin phụ. Có nhiều con thì tính quyền theo các link hợp lệ.
- GPS có thời điểm cập nhật, lịch sử vị trí thực và phân biệt dữ liệu cũ/thiếu. Không có dữ liệu thì không vẽ vị trí xe giả. Mất mạng không làm tự hoàn tất Trip.
- Bật/tắt/tiếp tục điều hướng không đổi trạng thái vận hành. Chuyển điểm trên bản đồ không thay thế Boarding, Arrival hoặc Alighting.
- Lịch sử giữ snapshot thực từng chuyến, người phân công/thay thế, điểm danh, nghỉ, sự cố và audit. Trường inactive/contract hết hạn vẫn giữ quyền đọc hợp lệ. Thời gian dự kiến/ETA là ước lượng, không chứng minh trẻ đã được bàn giao.

### Y15. 3.12 — Báo nghỉ học sinh

- Chỉ Parent có link hợp lệ chọn một con, một ngày/chiều và một Trip thật. Báo nghỉ có hiệu lực sau OTP, không chờ trường duyệt nghỉ. Mỗi chiều độc lập.
- OTP gửi tới guardianPhone từ hồ sơ trường, gắn đúng người/con/chuyến/nội dung. Xin OTP và confirm cùng kiểm cutoff, roster, quyền và hiệu lực trường.
- Sau Start/Ready thì báo muộn qua liên hệ ngoài app theo D312-02. Không báo để biến PRESENT/đã xuống thành ABSENT.
- Confirm ghi notice và trạng thái vắng đúng Trip, lưu dữ liệu trước tác động để rút khi còn hợp lệ. Link Parent khác cùng con có thể xem, chỉ người tạo được rút.
- Rút không OTP, trước cutoff và khi chuyến còn cho phép, chỉ hoàn tác dữ liệu do notice tạo và còn hiện hành. Không ghi đè điểm danh mới của phụ xe.
- Trùng báo nghỉ, request dùng OTP cho Trip khác, Trip VIRTUAL hoặc chuyến đã hủy đều không tạo notice mới. Hủy notice không mở lại Trip.

### Y16. 3.13 — Báo nghỉ nhân sự

- Driver/phụ xe báo nghỉ một ca thực được gán, xác nhận OTP qua contact tài khoản theo mode/kênh hiện hành. Có cả hai contact thì fan-out cùng challenge theo thiết kế đã chốt.
- Báo nghỉ có hiệu lực ngay, đưa vào chờ thay người. Không cho Start khi còn thiếu nhân sự; người phụ xe báo nghỉ không được Ready.
- Nhà xe xử lý Driver, trường xử lý phụ xe theo thẩm quyền. Chọn người active, đúng role/trường, không trùng thời gian, không nghỉ/vắng ở ca liên quan, kiểm lại khi xác nhận.
- Cập nhật assignment, notice REPLACED và thông báo trong cùng kết quả nghiệp vụ. Người thay nhận phân công qua inbox/push, không có bước bắt buộc bấm nhận việc.
- Chỉ người tạo được rút pending trước cutoff. Đã REPLACED không tự rút, kể cả assignment sau đó quay về người cũ. Muốn đổi lại do admin điều phối có kiểm tra.
- Nghỉ dài ngày đi qua đổi mặc định và đồng bộ Trip theo 3.6. Không tạo module lịch nghỉ dài kỳ riêng.

### Y17. 3.14 — Yêu cầu sửa thông tin hoặc địa chỉ

1. Parent chọn con/link, nhập đề xuất, xác thực OTP để tạo PENDING. Có lịch sử trạng thái, người tạo/người xử lý/lý do. Parent có thể hủy yêu cầu đang PENDING trong phạm vi đã chốt.
2. SCHOOL_ADMIN xử lý thông tin cơ bản và địa chỉ của trẻ chưa có tuyến DRAFT/ACTIVE. Địa chỉ trẻ đã có tuyến do SYSTEM_ADMIN đánh giá ảnh hưởng.
3. DIRECT_UPDATE áp dụng trường hợp đủ điều kiện cập nhật trực tiếp. REOPTIMIZED cập nhật địa chỉ/tọa độ và lộ trình khả thi. REMOVED_FROM_ROUTES cập nhật theo kết quả rút trẻ khỏi tuyến và chờ phân lại. REJECTED giữ dữ liệu nguồn và thông báo lý do.
4. REOPTIMIZED phải preview khả thi, TTL 10 phút, token đúng request/trẻ/tọa độ/tuyến và fingerprint bắt buộc khớp dữ liệu nguồn hiện hành. Hai người xử lý chỉ một quyết định cuối được ghi.
5. Khi duyệt, cập nhật Student, RouteStop, geometry/thời gian/quãng đường và Trip đủ phạm vi cùng giao dịch. Thời điểm ghi là ngay khi duyệt; ngày dịch vụ bao gồm hôm nay hay từ ngày mai còn cần chốt.
6. REMOVED loại khỏi tuyến và roster Trip chưa frozen bằng dấu loại, giữ lịch sử, hủy chuyến rỗng và thông báo. Trip frozen dùng dữ liệu cũ.
7. Solver/map lỗi hoặc preview không khả thi không được ghi một phần hồ sơ/lộ trình thành phê duyệt thành công. Giữ alias field cũ khi có thể.

### Y18. 3.15 — Chèn học sinh và ngừng dùng dịch vụ

- Học sinh AVAILABLE chưa có đủ dịch vụ được xét chèn vào cặp tuyến phù hợp. Preview kiểm hai chiều, sức chứa, giờ, khoảng cách và dữ liệu hiện hành.
- Confirm thêm RouteStop, sắp thứ tự, cập nhật tuyến và ngay lập tức đồng bộ roster/snapshot/giờ của hai chiều chưa frozen trong phạm vi ngày đã chốt. Không chèn vào chuyến đã nhận trẻ hoặc đổi nguồn lực ngoài thao tác.
- Disable do ngừng dịch vụ là thao tác của trường, không xóa hồ sơ. Loại điểm tuyến và đánh lại stopOrder, đánh dấu excluded trên Trip chưa frozen. Trip rỗng bị hủy có lý do/thông báo.
- Quyết định chi tiết 04/11 còn yêu cầu hủy đơn nghỉ/yêu cầu cập nhật đang chờ của học sinh khi disable. Cách phân loại RECORDED/pending và bảo toàn dữ liệu trên Trip frozen phải chốt cùng ma trận trạng thái.
- Active lại trở về nhóm chưa phân tuyến, không khôi phục ngầm tuyến hoặc Trip cũ. Parent/link và lịch sử vẫn được giữ theo phạm vi quyền.

### Y19. 3.16 — Hủy và thay thế phương án

- Hủy thủ công có preview tác động, lý do và fingerprint bắt buộc. Khi xác nhận kiểm lại chính tập chuyến và trạng thái ảnh hưởng, không chỉ tổng số.
- Hủy plan và Trip SCHEDULED chưa frozen. Trip frozen tiếp tục vận hành để trả trẻ, giữ nguyên dữ liệu và bận nguồn lực tới khi Trip cuối kết thúc. Hủy thủ công không tự biến các chuyến này thành chờ chốt hành chính.
- Notice/sự cố liên quan được xử lý theo trạng thái thích hợp, không để tác vụ yêu cầu xử lý một Trip đã hủy như vẫn có thể chạy. Giữ lịch sử, thông báo người bị ảnh hưởng.
- Một trường có nhiều ACTIVE cho các nhóm trẻ tách biệt; không phục vụ trùng một trẻ trong các plan đồng thời cùng phạm vi dịch vụ.
- Plan mới thay plan cũ cùng nhóm thì chuyển tiếp từ ngày mai, kết thúc plan cũ và thay Trip chưa chạy/chưa frozen, không ghi đè snapshot chuyến frozen. Tên trạng thái SUPERSEDED/CANCELLED và workflow tạo plan thay thế chờ contract.

### Y20. 3.17 — Sự cố, cảnh báo và điều phối

| Loại | Hành vi đích |
|---|---|
| ATTENDANT_MISSING | Driver báo phụ xe được gán chưa đến trước xuất phát. Admin có thẩm quyền trường xử lý người cũ đến hoặc gán phụ xe phù hợp; chặn Start khi thiếu. |
| DRIVER_MISSING | Phụ xe báo tài xế chưa đến. Nhà xe xử lý có mặt hoặc thay người; kiểm nguồn lực tại commit. |
| OFF_ROUTE | Tự phát hiện cách tuyến >50 m liên tục >=15 giây. Lưu vị trí/bằng chứng; phụ xe xác nhận theo phạm vi. |
| LATE_STOP | Dự báo trễ điểm tiếp theo >3 phút liên tục >=15 giây. Lưu bằng chứng và thông báo đúng đối tượng. |
| NO_GUARDIAN_AT_STOP | Phụ xe báo trẻ thuộc roster chiều về còn trên xe. Thông báo Parent liên quan/trường/nhà xe và giữ giám sát tới bàn giao. |
| TRAFFIC_DELAY | Driver/phụ xe báo tắc đường/thời tiết; thông báo trễ tới Parent các điểm tiếp theo và người điều phối liên quan. |
| GPS_SIGNAL_LOST | Hệ thống phát hiện Trip IN_PROGRESS mất cập nhật định vị >3 phút. Thể hiện độ cũ và cảnh báo, không tạo tọa độ thực giả. |
| LATE_RUNNING_TRIP_RISK | Cảnh báo nguy cơ chuyến sau chậm vì nguồn lực còn chạy chuyến trước. Admin bố trí nguồn lực khác sau kiểm khả dụng. Buffer chờ chốt. |

- Mọi sự cố có Trip, actor hoặc nguồn phát hiện, thời điểm, loại, bằng chứng/vị trí và kết quả xử lý. Quyết định D317-02 yêu cầu context latitude/longitude/addressText; trường hợp mất GPS hoặc geocode lỗi cần fallback được chốt.
- Tạo/xem/xử lý đúng role và trường. Thay người kiểm lại hiện thời, không force-assign người bận/nghỉ.
- Giữ policy một sự cố mỗi loại/Trip trong đợt này; nếu muốn tái diễn/episode phải chốt riêng. Hoàn tất chuyến có thể đóng cảnh báo chưa xác nhận với kết quả CLOSED_WITHOUT_CONFIRMATION, không đếm thành đã xác nhận đúng hoặc đã xử lý xong.
- Trạng thái kết thúc từng loại mới, quyền kết thúc, thông báo và điều phối đổi xe/giám sát khi frozen phải được chốt. Không tự mở workflow cứu hộ, y tế hoặc chuyển trẻ giữa xe từ việc có màn hình báo sự cố.

### Y21. 3.18 và kết thúc ngoại lệ — Tổng quan, thông báo, chốt hành chính

- Dashboard có sáu nhóm INCIDENT, LEAVE, REQUEST, PLAN, ADMIN_FINALIZATION và REOPTIMIZATION theo thẩm quyền. Count và đường dẫn dẫn tới đúng tập đối tượng còn phải xử lý.
- Inbox/push gồm phân công, Ready/Start/đón/xuống/hoàn thành, thay đổi lịch/dịch vụ, báo nghỉ/thay người, kết quả request/plan, sự cố, hủy/reopen và việc chốt hành chính theo từng luồng.
- Notification đã đọc, máy chủ gửi chấp nhận và nghiệp vụ hoàn tất là các mốc độc lập. Read-all chỉ đổi readAt. Giữ inbox khi push lỗi, retry không nhân đôi cùng sự kiện. Mở thông báo cũ kiểm lại quyền và tình trạng đích.
- Khi sự kiện ngừng trường, hết hạn, đổi địa điểm hoặc ngày nghỉ có hiệu lực, xử lý đúng nhóm Trip thuộc sự kiện. Không đánh đồng hủy plan thủ công với ma trận dưới.

| Trip tại mốc hiệu lực lifecycle | Kết quả |
|---|---|
| Chưa Ready, chưa điểm danh | Hủy nếu thuộc phạm vi mất hiệu lực. |
| Chỉ Ready, toàn UNMARKED, chưa có dấu điểm danh | Cho hủy theo lifecycle, giữ dấu Ready/lịch sử. |
| Đã có điểm danh, kể cả toàn ABSENT | Giữ trạng thái và đưa vào chờ SYSTEM_ADMIN chốt. |
| IN_PROGRESS hoặc còn trẻ đã nhận | Giữ trạng thái, khóa thao tác thường và giữ nguồn lực tới chốt. |
| COMPLETED/CANCELLED lịch sử | Giữ nguyên. |

- SYSTEM_ADMIN xem danh sách ngoại lệ, xác minh thực tế rồi chọn COMPLETED/CANCELLED, kèm lý do, trạng thái kỳ vọng và audit người/thời điểm/trước–sau.
- Chốt hành chính không ghi thêm Boarding/alighting/actualEndTime để giả một hành trình đầy đủ. Đọc detail/thống kê phân biệt hoàn thành thường và hoàn thành hành chính, không suy COMPLETED là đã xác minh bàn giao trẻ.
- Sau chốt, giải phóng bận thực tế theo trạng thái đã xác minh; không hồi sinh plan hoặc hợp đồng cũ.

### Y22. Hồ sơ câu hỏi trước triển khai — xem kết quả chốt tại Z1

| ID | Chi tiết cần PO chốt và tác động |
|---|---|
| Q01 | G-01 nói Trip ngày mai, D314/D315 nói đồng bộ ngay. Ghi ngay đã rõ; cần xác định phạm vi Trip hôm nay cho đổi địa chỉ/chèn trẻ và cách hiển thị hồ sơ so với điểm đón đang hiệu lực. |
| Q02 | Đổi default có ghi đè Trip đã điều phối riêng chưa frozen không; cách nhận biết ưu tiên và trả tác động. Đề xuất trước là giữ override, chưa có xác nhận mới. |
| Q03 | Inactive cần bàn giao nhưng G-02 cấm thay thường sau Ready/điểm danh. Chốt từ chối inactive đến khi đủ điều kiện hay cho workflow điều phối đặc biệt, quyền và bằng chứng bàn giao. |
| Q04 | Dời bãi hủy Trip ngay lúc hẹn hay tới ngày, hủy hẹn xử lý cờ needsReoptimization và Trip đã hủy ra sao, thời điểm được reoptimize theo bãi mới để không làm lệch chuyến trước ngày chuyển. |
| Q05 | maxOperatingRadiusKm đã được duyệt là cấu hình và Haversine. Cần giá trị mặc định (50 km đang là số trong code/báo cáo), ngưỡng min/max, ai cho ngoại lệ và cách audit, xử lý thiếu province/geocode không thành công. |
| Q06 | Reopen các Trip đã Ready/đã có dấu nhận trẻ trước khi hủy, reset Ready/mốc vận hành ra sao, lịch sử nhiều lần hủy/mở và hiệu lực đơn nghỉ. Không dùng reset UNMARKED để xóa bằng chứng đã nhận trẻ. |
| Q07 | Ngoài hậu arrival đã chốt correction trước Complete, cần xác định thao tác trước arrival nào là đón thật/đính chính, reason, audit và điều kiện đổi PRESENT khi đã alighted. |
| Q08 | Hủy chiều về toàn vắng yêu cầu Ready/đủ điểm danh thế nào, API/lý do/trạng thái kỳ vọng, giới hạn admin dự phòng. Trẻ không người nhận đưa về trường hay bãi do ai quyết định, ai nhận và ghi kết quả ở đâu. |
| Q09 | Trạng thái/cuộc đời và quyền đóng từng loại sự cố mới; buffer LATE_RUNNING_TRIP_RISK; GPS cũ/không có GPS/addressText lookup lỗi thì lưu bằng chứng và hiển thị thế nào. |
| Q10 | Thay plan cùng nhóm: tạo DRAFT thay thế khi trẻ còn thuộc plan cũ thế nào, cách đánh dấu plan bị thay, xác nhận chuyển tiếp, roster thay đổi một phần và nguồn lực cho ngày chuyển. Không tự thêm SUPERSEDED. |
| Q11 | Disable trẻ: trạng thái đơn nghỉ nào được hủy, request nào được hủy, bảo toàn tác động của các notice thuộc Trip frozen, xử lý trường hợp đơn khác đang được duyệt đồng thời. |
| Q12 | Mốc áp dụng fingerprint bắt buộc, hành vi client cũ thiếu field, mã lỗi và field response cần thêm; contract/audit/schema cụ thể cho thao tác mới. Trước thay DB trình riêng. |
| Q13 | firstServiceDate khi không có ngày đủ điều kiện, khi calendar thay đổi, trả tại response nào; phân biệt ngày đủ điều kiện với Trip đã thật sự sinh. Tên metadata đã chốt, vị trí/nullable cần rõ. |
| Q14 | Nghiệp vụ sức chứa seatCount tính cho học sinh hay gồm nhân sự nếu tài liệu hiện hành chưa đủ rõ; không tự thêm rule trừ ghế hoặc nghĩa vụ kiểm định/giấy phép mới. |

Các điểm trên làm rõ hành vi còn bỏ ngỏ hoặc mâu thuẫn. Các quyết định đầy đủ đã chốt như email bắt buộc, không thu hồi session khi admin cấp lại, quyền duyệt plan của trường, ưu tiên nghỉ nhà xe và chốt hành chính không cần xin chốt lại.

### Y23. Phạm vi giới hạn và điều kiện coi là hoàn tất

- Trong đợt này giữ mô hình một nhà xe/một bãi, một trường mỗi chuyến, liên kết Parent theo xác minh trường. Không bổ sung thu/hoàn phí, chuyển trường/năm học hoàn chỉnh, nhiều bãi, kỳ nghỉ dài hạn riêng, OTP/QR người nhận trẻ, chứng nhận an toàn điểm đón, giới hạn ngồi xe từng trẻ, full offline hoặc workflow y tế/cứu hộ/chuyển xe giữa đường chưa được duyệt.
- Mỗi luồng phải có actor/scope, điều kiện trước thao tác, kết quả/ảnh hưởng tới dữ liệu, trường hợp bị từ chối, lịch sử và thông báo. Tài liệu quyết định, Swagger, API và ví dụ FE cùng hợp đồng và cùng phiên bản.
- FE nhận status đã lưu/effective status, action flags và lý do nhất quán, phân biệt lịch dự kiến, đã hẹn/đã áp dụng, đã gửi/đã đọc/đã xử lý và hoàn thành vận hành/hành chính.
- Sẵn sàng bàn giao sau khi nghiệm thu quyền, mốc ngày, frozen, các giao dịch đồng thời, retry, case thất bại và payload FE cũ trên dữ liệu/phạm vi được cấp. Kiểm kiểu/unit tests là một phần bằng chứng, không thay thế các case này.
- Tổng hợp lần này chỉ thay tài liệu. Không kiểm DB/provider hoặc vận hành thực, không chạy script test, không sửa env hoặc viết code ứng dụng.


## Z. Kết quả triển khai độc lập và quyết định PO — 06/11/2026

Mốc này cập nhật source, không thay thế nghiệm thu. Những ghi chú ONLY_DOCS/chưa được phép code ở các mốc cũ là lịch sử; PO đã duyệt triển khai P0–P6 và các contract dưới đây. Chưa apply migration mới, không chạy script test, chưa chứng minh toàn bộ 3.1–3.18 hoàn tất runtime.

### Z1. Chốt bổ sung trong hội thoại

| Câu hỏi | Quyết định và phạm vi |
|---|---|
| Q01 | Địa chỉ/chèn trẻ ghi nguồn ngay, chỉ Trip từ ngày mai; default nguồn lực từ hôm nay. |
| Q02 | Giữ override từng Trip; chỉ lan truyền đúng field đang kế thừa. Thêm Trip.operationAudit nullable để ghi override/correction/reopen. |
| Q03 | Từ chối inactive khi có Ready/điểm danh/đang chạy; xử lý chuyến trước. |
| Q04 | Đặt lịch bãi chưa hủy/đánh dấu; tới ngày hủy unfrozen từ mốc và đánh dấu reopt; hủy hẹn trước ngày giữ chuyến, reopt theo bãi hiện hành. |
| Q05 | Bán kính mặc định50, >0 tới500km, Haversine; chưa force override. Geocode lỗi giữ province null, chỉ so khi đủ dữ liệu. |
| Q06 | Reopen giữ contract master: reason + nguồn lực tùy chọn; chỉ trước giờ, chưa nhận trẻ/chạy, reset chuẩn bị, giữ notice học sinh còn hiệu lực/audit. |
| Q07 | API correction PRESENT/ABSENT + reason + expectedStatus, phụ xe đang gán sau arrival trước Complete; không sửa trẻ đã alighted. |
| Q08 | API cancel-all-absent + reason, phụ xe được gán/scoped admin, chiều về SCHEDULED đã Ready/toàn roster ABSENT có lý do. Chuyển xe/cứu hộ không mở rộng. |
| Q09 | close + reason/expectedStatus cho ba loại mới, sys/scoped school admin; GPS>3phút LAST_KNOWN/capturedAt hoặc UNKNOWN; nguy cơ trễ buffer15phút, không autoassign. |
| Q10 | PO chọn làm phần độc lập trước; workflow thay plan cùng nhóm chờ chốt riêng, không thêm replacesPlanId/replace API. |
| Q11 | Giữ policy đã chốt khi disable: frozen/lịch sử bảo toàn, các tác động hủy notice/request theo source và khóa chung. Không tự mở thêm quyền xóa dấu vận hành. |
| Q12 | Fingerprint bắt buộc ngay API cancel và REOPTIMIZED; thiếu400/cũ-sai409. Duyệt Trip.operationAudit và Student.parentLinkAudit JSON nullable, chỉ tạo DDL chưa apply. |
| Q13 | firstServiceDate nullable YYYY-MM-DD ở detail/approve/readiness, không có ngày hợp lệ trả null; không đồng nghĩa đã sinh Trip. |
| Q14 | Giữ cách tính seatCount cho roster hiện tại; không thêm rule trừ ghế nhân sự. Quy chuẩn sức chứa khác chưa được chốt, không tự áp. |
| Bổ sung 3.1 | Tạo nhân sự bắt buộc email và SĐT; không backfill tài khoản cũ. |
| Bổ sung 3.17 | Sự cố thủ công thiếu GPS vẫn nhận LAST_KNOWN/UNKNOWN để giữ Mobile cũ; gửi tọa độ phải đủ cặp hợp lệ. |
| Bổ sung bãi | Phải cấu hình PARKING_LOT trước lập lịch, bỏ tọa độ mặc định khác nhau; cấu hình lần đầu áp ngay, dời bãi đã có theo lịch. |

### Z2. Checklist source hiện tại

[x] nghĩa đã có code; **không nghĩa đã nghiệm thu runtime**.

- [x] 3.1: bắt buộc SĐT và email khi tạo nhân sự; giữ luồng email/console và không thu hồi phiên khi cấp lại mật khẩu.
- [x] P0: dùng cùng advisory transaction lock trước row lock cho writer vận hành/lifecycle/nguồn lực; OTP nghiệp vụ tiêu thụ cùng transaction.
- [x] 3.3/3.5: bãi cấu hình bắt buộc; dời bãi đến ngày mới tác động; bán kính cấu hình/kiểm preview-confirm; province geocode nullable.
- [x] 3.4: thu hồi Parent link theo SCHOOL_ADMIN đúng trường, lý do và audit.
- [x] 3.6/3.8: đồng bộ đúng field, giữ override; kiểm khả dụng/active/sức chứa/đơn trường/đơn nghỉ/sự cố dưới khóa.
- [x] 3.7: reopen có audit và firstServiceDate nullable; generation/virtual calendar chặn plan cần reopt/ngày sau lịch dời.
- [x] 3.9/3.10: correction hậu arrival, hủy chiều về toàn vắng, Start/action state cùng điều kiện không PRESENT.
- [x] 3.11: Parent bỏ điểm trẻ khác/bãi và polyline toàn tuyến.
- [x] 3.12/3.13: Parent chặn báo nghỉ sau Ready, withdrawal không ghi đè điểm danh mới, giữ REPLACED không rút và không thay bằng chính người vắng.
- [x] 3.14/3.15: snapshot trước sửa, sync Trip từ ngày mai không đụng assignment, token/fingerprint/constraints dùng cùng preview.
- [x] 3.16 phần độc lập: fingerprint bắt buộc, hủy unfrozen, giữ frozen/hold và đóng việc chờ đúng Trip bị hủy.
- [x] 3.17: GPS silence, late-running risk, vị trí fallback và close ba loại mới/notification scope.
- [x] 3.18: thêm hai task dashboard với query lọc tương ứng.
- [x] DTO/Swagger/FE guide cập nhật, typecheck/build/schema validation và kiểm HTTP Swagger an toàn.
- [x] Apply migration 20261106000000_operation_and_parent_link_audit — PO duyệt sau triển khai, đã apply DB local 06/11. Tại mốc audit có 18 migrations đồng bộ, hai cột JSONB nullable đã xác nhận.
- [ ] UAT quyền/ngày/frozen/race/cron/retry/provider/FE trên dữ liệu được cấp; không chạy test scripts theo chỉ thị PO.
- [ ] Workflow thay plan cùng nhóm/giữ chỗ/chuyển roster — chờ chốt riêng.

### Z3. Bàn giao

Contract tích hợp hiện tại: [FE_INTEGRATION_GUIDE](../FE_INTEGRATION_GUIDE.md). Bằng chứng và giới hạn: [LATEST](LATEST.md). Source thay đổi không đồng nghĩa DB đã có hai cột audit. Lịch sử override bằng đúng ID mặc định mà không có audit và snapshot cũ đã bị ghi đè không thể tự phục hồi từ source.


### Z4. Cập nhật migration sau phê duyệt PO — 06/11/2026

Đã apply migration audit vào local roadtoschool/public localhost:5432;18 migrations đồng bộ. Metadata hai cột đúng JSONB nullable. Các ghi chú pending ở mốc Z ban đầu là lịch sử; từ mốc này DB local đã sẵn cột cho source mới. Chưa chạy test scripts/nghiệp vụ/cron/provider hoặc nghiệm thu FE. Không tự apply môi trường khác.


### Z5. Sửa lỗi runtime được PO báo — 06/11/2026

Đã sửa SELECT advisory lock trả void bằng integer result, dùng helper chung cho calendar và sửa khóa push token cùng lỗi. Giữ nguyên quy tắc nghiệp vụ/khóa, không migrate thêm. Typecheck/build/lint đạt; không chạy script test/DB probe/cron để ghi dữ liệu, chưa nghiệm thu runtime.


### Z6. Yêu cầu bộ lọc địa giới — PO chốt phạm vi 06/11/2026

**Yêu cầu đã ghi nhận, chưa triển khai field/schema/API mới.**

- Thêm khả năng người dùng lọc tỉnh/thành và phường/xã cho danh sách trường, học sinh, gồm danh sách chọn học sinh lúc lập phương án.
- Bộ lọc chỉ áp khi người dùng gửi lựa chọn; không tự chọn tỉnh/phường theo trường, bãi hoặc địa chỉ học sinh. Không gửi bộ lọc thì trả phạm vi dữ liệu đúng quyền như trước.
- Tách eligibility hiện có khỏi view filter: hệ thống chỉ tự xác định đủ/không đủ điều kiện dựa AVAILABLE, tọa độ, chưa thuộc plan còn hiệu lực, bán kính phục vụ và quy tắc tỉnh đã duyệt khi đủ dữ liệu. Không tự bổ sung điều kiện cùng phường, không dùng filter để thay kiểm eligibility khi optimize/confirm.
- Đổi/bỏ filter không tự xóa roster, sửa route/Trip, thay điều kiện hoặc tự chọn lại studentIds đã gửi. Những học sinh không hiện trong view đang lọc không mặc nhiên là không đủ điều kiện.
- Không sửa addressText hoặc dữ liệu Trip snapshot lịch sử chỉ để chuẩn hóa địa giới. Thiếu địa giới vẫn hiện khi không lọc, không giả ID từ chuỗi địa chỉ.

**Contract/schema đã được PO duyệt trong phản hồi sau Z6:** giữ province tên tỉnh cũ; thêm nullable provinceId String (ID VietMap), wardId String (ID VietMap), ward String (tên phường/xã) vào School và Student, không bảng mới. ID provider không mặc định là mã hành chính Nhà nước. Query provinceId/wardId optional; hai query kết hợp AND; không có query không lọc địa giới. Field response thêm tương ứng, đồng bộ Swagger; payload tạo/sửa cũ không yêu cầu nhập thêm.

**Nguồn dropdown đã được PO duyệt trong phản hồi sau Z6:** đề xuất địa giới đã có trong dữ liệu đúng scope tài khoản; chưa tự backfill hoặc gọi provider hàng loạt. Nếu cần danh mục toàn quốc, chốt nguồn dữ liệu riêng. Không lọc một trang tại FE rồi coi là kết quả toàn bộ; filter/count phải cùng phạm vi ở API.

**Các bước sau khi duyệt:** bổ sung helper trích boundaries v4 mới; DDL nullable (apply DB phải được phép riêng); cập nhật các writer tạo/đổi tọa độ đúng lịch hiệu lực; filter list và preparation theo lựa chọn tường minh; giữ đủ kiểm preview/confirm; cập nhật response/Swagger/FE guide; typecheck/build, không test scripts. Chưa sửa source/schema/env/DB trong mốc này.


### Z7. Triển khai bộ lọc địa giới sau duyệt — 06/11/2026

- [x] provinceId/wardId/ward nullable trên School và Student; DDL20261106010000_school_student_geography, client generate. Giữ province/addressText và payload cũ.
- [x] Query optional cho list trường/học sinh/preparation, AND khi có cả hai, bỏ query không lọc địa giới. Student list lọc/count cùng where; School list lọc theo địa chỉ hiệu lực trước count/pagination.
- [x] Preparation classify eligibility trước rồi lọc view theo query tường minh, không đổi tiêu chí/selection/optimize/confirm. Hai mảng đủ/không đủ đều có metadata địa giới; không tự áp tỉnh/phường của trường/bãi.
- [x] PO duyệt hai GET mới schools/location-options và schools/:schoolId/students/location-options; scope sys hoặc sys/scoped school tương ứng, provinceId optional chỉ lọc wards; response provinces/wards theo field đã duyệt, đọc DB không gọi provider.
- [x] Writer tạo/đổi địa chỉ lưu địa giới mới từ VietMap, scheduledSchool đổi đúng ngày, lookup lỗi null. Không tự backfill, không sửa snapshot lịch sử.
- [x] Typecheck/build/Prisma validate/generate đạt; lint19files exit0 có8warning cũ; Swagger UI/JSON200, kiểm optional queries/2endpoints/5response schema. Không init DB/scheduler để kiểm docs.
- [x] Apply DDL địa giới vào DB local — PO duyệt sau implementation, đã apply06/11;19migrations up to date,6cột TEXT nullable đã xác nhận.
- [ ] UAT runtime/provider/permission/count/filter trên dữ liệu được cấp; không script test.

FE contract: docs/FE_INTEGRATION_GUIDE.md mục11. Phê duyệt migrate audit trước đây không tự mở rộng sang migration địa giới. Dữ liệu cũ thiếu metadata không match filter ID, vẫn hiện khi không lọc; dropdown có thể rỗng. Không thêm danh mục toàn quốc hoặc tự chuẩn hóa/backfill địa chỉ lịch sử.


### Z8. Migration địa giới local — 06/11/2026

PO đã duyệt migrate. Đã apply20261106010000_school_student_geography vào roadtoschool/public localhost:5432,19migrations đồng bộ. SELECT metadata xác nhận6cột TEXT nullable; không backfill/seed/reset/provider/test scripts. Typecheck đạt; runtime/FE chưa nghiệm thu, dữ liệu cũ chưa có ID thì dropdown có thể rỗng.


### Z9. Rà soát lại API/docs/plan sau migrations — 06/11/2026

**NEEDS_FIX, không đóng toàn bộ master plan hoặc nghiệm thu FE.** Typecheck/build/schema đạt,19migrations up to date; các kết quả này không chứng minh đúng nghiệp vụ. Bộ lọc địa giới khớp source contract trong phạm vi review; thiếu metadata dữ liệu cũ/dropdown rỗng là giới hạn đã duyệt.

Mở lại các hạng mục theo LATEST F01–F10: membership học sinh khi API trực tiếp tạo plan; stale preview Student/Vehicle; generation dùng Route/default/roster trước khóa; reopen snapshot/ngày activation; SCHEDULE hủy nhầm MAKEUP; handover chỉ có Route chưa có Trip; Parent virtual thiếu gate lịch bãi; sửa timing Ready-only;5Swagger response thiếu schema; tài liệu migration/checklist còn mâu thuẫn.6P1 và4P2 là phân loại review, chưa chạy mutation tái hiện và chưa sửa code trong lượt này.

- [ ] F01–F06: bản vá các sai lệch chính, giữ quyết định nghiệp vụ PO.
- [ ] F07–F10: gate/frozen/Swagger và trạng thái docs đồng bộ.
- [ ] Nghiệm thu dữ liệu được cấp sau sửa, không tự chạy script test.

Các checkbox source tạiZ2/Z7 không được diễn giải thành những luồng trên đã nghiệm thu. Workflow replace cùng nhóm vẫn tách chốt riêng theo PO, không tính thành bug thiếu triển khai. Báo cáo chi tiết: docs/ai-review/LATEST.md; không tự sửa API/DB/FE trong lượt review.


## AA. Kế hoạch bản vá F01–F10 — 06/11/2026

Trạng thái **PLAN_DRAFT / CHỜ PO DUYỆT TRIỂN KHAI**, chưa sửa application code. Báo cáo phát hiện được archive riêng trước khi đổi LATEST sang báo cáo lập kế hoạch. Mục này tiếp nối cùng master plan, không tạo plan rời. Các đề xuất dưới đây không tự đổi quyết định PO.

### AA1. Mục tiêu và ranh giới

- API thực thi đúng quyết định nghiệp vụ kể cả khi client gọi trực tiếp, dùng preview cũ hoặc dữ liệu thay đổi trước lúc lấy khóa.
- Giữ URL/body/response cũ; không thêm field request bắt buộc. F09 chỉ mô tả response thực trong Swagger. Field nào phát sinh còn phân vân phải hỏi PO trước.
- Dự kiến không thêm bảng/cột/index/package/env hoặc migration; DB local vẫn19migrations. Audit dùng Trip.operationAudit đã có nếu PO chọn rebuild ởAA5.
- Chỉ sửa API và docs liên quan; không Web/Mobile, không workflow replace plan cùng nhóm, không tự sửa/hủy dữ liệu hiện có để chữa lỗi lịch sử.
- Giữ bộ lọc provinceId/wardId do người dùng chọn; không dùng filter địa giới để thay eligibility và không tự đặt tỉnh/phường mặc định.
- Không script test/seed/backfill/provider/DB hoặc API mutation để thử. Static verification và HTTPdocs được phép; UAT cần PO/FE và dữ liệu được cấp.

### AA2. Nhóm1 — F01: membership học sinh ở mọi cửa vào

1. Tách kiểm eligibility/membership hiệu lực dùng chung preparation, optimize-preview, confirm và readiness/approve khi cần kiểm xuyên plan. Chỉ DRAFT/ACTIVE còn hiệu lực mới giữ membership; không khóa học sinh do plan đã hết hiệu lực nhưng cron chưa cập nhật.
2. Tại optimize-preview kiểm toàn bộ studentIds gửi lên: đúng trường, AVAILABLE, tọa độ, phạm vi phục vụ và chưa thuộc plan khác còn hiệu lực. Không im lặng bỏ học sinh sai để tạo một nhóm khác ý người dùng. Giữ quyền tối ưu một phần do VRP không xếp được những học sinh đầu vào hợp lệ.
3. Tại confirm đọc lại dưới lockOperations; kiểm đủ cả ACTIVE và DRAFT membership. excludePlanId chỉ phục vụ nội bộ khi kiểm chính plan đang duyệt/reopt, không thêm cửa vượt kiểm public.
4. Nếu đã thuộc plan hiệu lực khác:409, không tạo DRAFT/Route/Stop một phần, không tự hủy plan cũ. Trường có ACTIVE vẫn được tạo plan cho nhóm học sinh khác hợp lệ; không chặn toàn trường chỉ vì có ACTIVE.
5. Giữ invariant hai chiều và studentIds người dùng đã chọn; filter UI thay đổi không làm tự xóa selection.

API: POST routes/optimize-preview, routes/confirm-plan; GET preparation và readiness; POST approve khi tái kiểm điều kiện. Body giữ nguyên. Files: routes.service.ts, resource-availability.service.ts và helper eligibility tối thiểu nếu cần; Swagger mô tả409.

Nghiệm thu: gọi trực tiếp chọn trẻ đã ACTIVE bị từ chối; trẻ thuộc plan hết hiệu lực được xét lại; trẻ hợp lệ khác vẫn tạo được; hai chiều nhất quán; không có bản ghi nửa chừng.

### AA3. Nhóm1 — F02: ràng buộc dữ liệu nguồn preview

1. Phiên preview cache phía BE lưu phiên bản nội bộ của học sinh thực sự thuộc kết quả tuyến và xe sử dụng: ID, các dữ liệu ảnh hưởng vị trí/địa chỉ/trạng thái/sức chứa/active; trường, hợp đồng/lịch liên quan và bãi tiếp tục được kiểm. Không yêu cầu FE thêm fingerprint mới cho confirm-plan.
2. Ghi nhận phiên bản trước khi gọi tối ưu; kiểm nguồn không đổi khi nhận kết quả trước khi công nhận preview. Không chụp phiên bản mới sau tối ưu rồi gắn nhầm cho kết quả cũ.
3. Confirm so lại dưới khóa, rồi kiểm nguồn lực active, đủ chỗ từng tuyến, reservation/holds và eligibility. Địa chỉB trong cùng bán kính vẫn làm previewA cũ bị từ chối.
4. Giữ404 khi previewToken không tồn tại/đã hết hiệu lực như contract cũ; nguồn đổi trả409 và FE preview lại. Kiểm TTL30phút ngay lúc confirm, không chỉ dựa timer cleanup. Preview hủy tuyến về phải cập nhật đúng tập nguồn còn dùng, giữ kết quả hai chiều.
5. Preview không phát sinh nghiệp vụ. Confirm thành công cùng nhau, sau đó consume cache; chưa mở rộng chính sách idempotent retry confirm ngoài contract hiện có.

Files: PreviewSession/routes.service.ts, resource-availability.service.ts nếu cần helper xe nhận tx. Không field DB mới. Nghiệm thu: đổi tọa độ/địa chỉ/active/sức chứa sau preview bị chặn; nguồn không đổi confirm giữ payload và kết quả cũ.

### AA4. Nhóm2 — F03: dữ liệu sinh chuyến phải mới trong transaction

1. Vòng ngoài chỉ chọn Route ID/ngày cần xem xét; không dùng Route/defaults/stops/roster/snapshot đã tải trước khóa làm dữ liệu ghi.
2. Mỗi transaction lấy lockOperations trước row locks theo quy tắc hiện có; đối soát/kiểm policy cần thiết, tải lại Route/Plan/School/defaults/stops và calendar hiệu lực cho đúng serviceDate.
3. Tính lại timing HH:mm, scheduledAt, roster và snapshot từ cùng tập nguồn; kiểm activation ngày kế tiếp, hợp đồng, nghỉ/học bù, lịch bãi, needsReoptimization, nguồn lực active/role/trường/đơn trường/overlap/holds/leave/incidents/sức chứa roster.
4. Kiểm unique Route–ngày, không tự reopen hay tạo trùng khi đã có CANCELLED. Giữ các field thống kê response totalEligible/createdCount/skippedCount/failedCount/failures và nghĩa được docs mô tả; không đổi shape để sửa concurrency.
5. Dùng logic chuẩn bị Trip hiện hành chung với reopen nếu phương án rebuild được duyệt. Không gọi VietMap/VRP trong transaction/khóa để dựng lại tuyến; dùng Route đã tối ưu và lịch hợp lệ.

Files: trips.service.ts, helper trip preparation tối thiểu, staff-availability/resource/calendar policies liên quan. Nghiệm thu: thay default/chèn/gỡ trẻ/đổi lịch/inactive hoàn tất trước lúc generator lấy khóa thì Trip dùng nguồn mới hoặc từ chối, không ghi cache cũ; hai generator vẫn không tạo trùng.

### AA5. Nhóm2 — F04: reopen theo dữ liệu hiện hành (CẦN PO CHỐT)

**Phần không thay đổi:** SYSTEM_ADMIN, CANCELLED, trước giờ chạy hợp lệ, chưa xuất phát/nhận trẻ, không xóa bằng chứng; Plan ACTIVE không cần reopt, School/calendar/hợp đồng/bãi/nguồn lực hợp lệ. Bổ sung kiểm serviceDate sau ngày activatedAt theo UTC+7; không mở hôm nay nếu plan vừa duyệt lại hôm nay.

**Vấn đề lựa chọn:** sau reopt, snapshot/roster/giờ Trip cũ có thể khác. Unique Route–ngày khiến từ chối reopen có thể để lại ngày không sinh Trip mới trên chính Route.

- Phương ánA **đề xuất**: dùng POST/body hiện có, dựng lại phần chuẩn bị từ Route/calendar đang hiệu lực. Kiểm giờ chạy mới và mọi điều kiện trước ghi. Đồng bộ snapshot, roster, timing/absolute times; reset Ready theo policy; giữ đơn nghỉ còn hiệu lực cho trẻ còn thuộc roster, không bê ABSENT sang trẻ mới. Lưu preimage snapshot/roster/timing/cancellation/assignment trước–sau trong operationAudit hiện có để không mất lịch sử. Không tạo bảng/cột hoặc đổi Trip ID. Roster cần loại/khôi phục dùng dấu excluded hiện có và audit, không xóa bằng chứng cũ. Trẻ đã nhận/chuyến đã chạy vẫn không được rebuild.
- Phương ánB: nếu dữ liệu chuẩn bị khác thì409, giữ nguyên CANCELLED. Cần PO chấp nhận hệ quả không thể sinh lại cùng Route–ngày bằng endpoint generate; không tự bịa workflow khác để vượt unique.

Đã gửi câu hỏi PO gồm lựa chọnA/B, audit trước–sau và giữ notice. **Chưa chọn thay PO**. Files: trips.service.ts, shared trip preparation, operationAudit appending, existing attendance/notice helpers. API success giữ message/tripId; lỗi nghiệp vụ409 được mô tả rõ và không thêm body bắt buộc.

Nghiệm thu: reopt theo bãi mới rồi approve/reopen không dùng bãi cũ; ngày activation không bị vượt; thời gian mới không hợp lệ từ chối nguyên tử; notice/roster/audit đúng, không sửa các Trip lịch sử khác.

### AA6. Nhóm3 — F05 và F08: thống nhất lịch, tách sửa timing với chốt lifecycle

F05:
1. Bỏ quyết định hủy dựa riêng weeklySchedule[weekday]; dùng serviceDay/calendar hiệu lực theo serviceDate.
2. Giữ thứ tự: điều kiện dịch vụ/plan/hợp đồng, nghỉ nhà xe, MAKEUP được duyệt, nghỉ trường, lịch tuần. MAKEUP Chủ nhật hợp lệ vẫn giữ Trip dù lịch tuần không có Chủ nhật.
3. Không phục hồi ngầm Trip đã CANCELLED; reopen theoAA5. Reconcile/sinh chuyến/đọc timing cùng nguồn ngày phục vụ.

F08 **CẦN PO xác nhận ngoại lệ giờ**:
- Đề xuất giữ timing/snapshot cũ cho Trip frozen khi lịch mới chỉ đổi giờ và vẫn có dịch vụ; áp lịch mới cho Trip chưa frozen/Trip sinh sau.
- Nếu mất ngày phục vụ, giữ ma trận lifecycle đã chốt: chưa điểm danh/Ready-only có thể hủy trong phạm vi; có điểm danh hoặc IN_PROGRESS thì giữ trạng thái/chờ admin. Không thay toàn bộ requiresAdminFinalization bằng isTripFrozen rồi vô tình đổi ma trận này.
- Dùng isTripFrozen cho quyền sửa dữ liệu chuẩn bị; requiresAdminFinalization cho nhánh chốt hành chính, không dùng thay nhau.

Files: contract-lifecycle.service.ts, trip-schedule-view.ts, school-policy/serviceDay và frozen helper. Nghiệm thu: MAKEUP không hủy nhầm; thay giờ không sửa Ready-only theo phương án được duyệt; mất dịch vụ giữ ma trận; GET không ghi DB.

### AA7. Nhóm4 — F06: bàn giao nguồn lực kiểm cả Route và Trip

1. Dưới khóa tải lại toàn bộ Route/default groups và Trip bị tác động; không chỉ đếm Route rồi kiểm vòng Trips.
2. Kiểm replacement đúng role/trường/active/xác thực theo policy đang có; reservation/đơn trường/hợp đồng, sức chứa từng nhóm, nhất quán hai chiều, không chiếm cùng nguồn lực cho hai nhóm trái quy tắc, không bị giữ bởi chuyến ngoại lệ.
3. Kiểm trạng thái sau bàn giao của cả tập thay đổi, tránh kiểm từng Route riêng rồi tạo xung đột giữa chính các nhóm được đổi. Giữ DRAFT giữ chỗ trong kiểm reservation; không tự mở rộng việc chuyển defaults DRAFT nếu policy inactive cũ chỉ tác động ACTIVE.
4. Với Trip, giữ chặn Ready/marked/running đã duyệt và kiểm availability đúng ngày/giờ/roster. Khi tất cả hợp lệ mới update Route, Trip, inactive và revoke session cùng transaction; lỗi giữ nguyên mọi nguồn lực.
5. Tái sử dụng validator cho group và Trip, cho truyền tx thực thay vì đọc trạng thái rời giao dịch. Không ghép nhóm xe ngoài ý muốn hoặc tự điều phối bù.

Files: staff-availability.helper.ts, resource-availability.service.ts, drivers/vehicles/schools employee status services; DTO/controller chỉ cập nhật mô tả error nếu cần, body replacement cũ giữ nguyên. Nghiệm thu: có Route nhưng0Trip vẫn chặn replacement bận trường khác; đủ điều kiện bàn giao nguyên tử; không đổi frozen/override không thuộc nguồn lực đang bàn giao.

### AA8. Nhóm5 — F07: lịch dự kiến thống nhất điều kiện sinh chuyến

1. Dùng chung predicate đọc hiệu lực dịch vụ/activation/plan/calendar/needsReoptimization/lịch bãi cho các nhánh virtual có liên quan.
2. Rà list admin, lịch Driver/Attendant và Parent/child aliases, virtual detail/Home nếu tái sử dụng cùng logic. Nhánh Parent phải chặn ngày sau mốc bãi đang chờ như generator/listTrips; không lọc hoặc xóa Trip persisted lịch sử.
3. Không thêm field/hardcode trạng thái mới, giữ shape lịch mobile. Ngày trước mốc hợp lệ còn hiện, ngày sau mốc bị chặn không giả thành lịch phục vụ theo bãi cũ.

Files: trips.service.ts và parking/school policy helper nếu cần. Nghiệm thu: cùng Route/ngày có cùng quyết định virtual ở các vai trò, dù cron chưa chạy; đã có Trip vẫn theo lifecycle riêng.

### AA9. Nhóm6 — F09: mô tả đầy đủ5response thành công

- correction200: đúng message + attendance thực tế (nullability/timestamps theo runtime), không dùng DTO có field chưa trả.
- cancel-all-absent200: message.
- reopen200: message + tripId.
- revoke Parent link201: message theo runtime.
- close incident200: TripIncidentResponseDto tương ứng mapper hiện có.

Tạo DTO response nội bộ tối thiểu nếu thiếu, decorator đúng type/status. Không đổi field đang trả hoặc thêm wrapper data chỉ để dễ ghi Swagger. Kiểm đủ body/path/query/roles/errors; generate OpenAPI kiểm content.application/json.schema và HTTPdocs, không chỉ endpoint tồn tại.

Files: trip-actions DTO/controller, StudentsController, IncidentsController và DTO liên quan. Không thay enum/nullability đã chốt. Nghiệm thu:5schema machine-readable khớp field thực, FE sinh type được;200/201 đúng như cũ.

### AA10. Nhóm7 — F10: đồng bộ tài liệu và tracking

1. FE guide có một đoạn trạng thái hiện hành19migrations;18ở lịch sử audit phải ghi rõ mốc lịch sử. Các bullet chờ chốt cũ dẫn tới quyết định hiện hành, không để người đọc hiểu phone còn optional runtime.
2. Mỗi F có ba mức riêng: source đã sửa, kiểm kỹ thuật đã đạt, UAT đã nghiệm thu. Chỉ đóng đúng mức có bằng chứng, không đánh dấu runtime từ build/typecheck.
3. Cập nhật master plan hiện hành/Y/Z/AA theo quyết định PO, giữ log lịch sử có nhãn. Không đổi yêu cầu để hợp thức hóa API lỗi. Đồng bộ tracker, CURRENT_STATE, LATEST13mục và patch thực tế.
4. Note FE trực tiếp trong chat khi bàn giao: URL/body giữ nguyên;409 mới cho dữ liệu cũ/membership/nguồn lực; preview lại khi cần; reopen theo lựa chọn; Swagger đủ response; migrations vẫn19 nếu không thay schema.

### AA11. Trình tự triển khai và phụ thuộc

| Đợt | Nội dung | Điều kiện |
|---|---|---|
|1|F01/F02 membership + phiên bản preview|PO duyệt plan, giữ payload cũ|
|2|F03 dữ liệu tạo Trip trong khóa + F04 reopen|Chốt lựa chọnAA5 trước phần reopen; dùng cùng preparation để tránh lệch|
|3|F05/F08 lịch học bù/frozen|Chốt quy tắc Ready-only AA6 trước nhánh timing|
|4|F06 bàn giao cả Route/Trip|Validator dùng tx và kiểm toàn bộ tập tác động|
|5|F07 virtual schedules|Dùng cùng policy đã sửa ở đợt2–3|
|6|F09/F10 Swagger/docs|Đồng bộ theo kết quả thực của từng đợt, chốt báo cáo cuối|

Không phải6lần xin phép nếu PO duyệt toàn bộ plan và hai quyết định; không tự commit/push. Hai phần cần lựa chọn có thể để chờ trong khi triển khai phần độc lập sau khi được lệnh code; không đánh dấu toàn bộ hoàn tất khi còn phần chờ.

### AA12. Ma trận nghiệm thu dự kiến (KHÔNG tự chạy script test)

| Case | Kết quả phải đạt |
|---|---|
|API trực tiếp chọn trẻ đã ACTIVE|409, không tạo plan trùng; plan hết hiệu lực không giữ trẻ vô hạn|
|Trẻ hợp lệ khác khi trường có ACTIVE|Vẫn được tạo theo policy DRAFT hiện có|
|Địa chỉ/xe đổi trong hoặc sau preview|Không confirm kết quả cũ; nguồn không đổi giữ payload cũ|
|Membership/default/roster đổi trước lock generator|Trip dùng nguồn mới hoặc bị từ chối, không ghi cache|
|Hai lượt generate cùng Route–ngày|Chỉ một Trip, giữ cơ chế unique/skipped|
|Reopt bãi/route rồi reopen|Không dùng snapshot cũ, xử lý đúng lựa chọnAA5|
|Plan duyệt lại hôm nay|Không reopen/sinh Trip ngày hôm nay|
|MAKEUP ngoài weeklySchedule + schedule change|Trip hợp lệ không bị hủy nhầm|
|Ready-only + đổi giờ / mất dịch vụ|Giữ timing hoặc lifecycle đúng quyết địnhAA6|
|Route ACTIVE chưa có Trip + replacement bận|Bị từ chối, không update một phần|
|Lịch bãi tương lai trước/sau mốc|Lịch virtual các vai trò nhất quán với gate sinh chuyến|
|Swagger5action responses|Có schema đúng field/nullability/status runtime|
|Geo filters bỏ query/AND/scope|Giữ hành vi đã duyệt, không tự chọn địa giới hoặc mất selection|

Static checks sau code: tsc --noEmit, build, lint files đổi, Prisma validate nếu cần; HTTPdocs/OpenAPI qua cách không init scheduler/DB khi không được phép chạy nghiệp vụ. Không cài dependency. Không tự tạo record, provider call hoặc DB mutation để kiểm race/rollback. Trường hợp chưa kiểm phải ghi NOT_VERIFIED/BLOCKED_BY_TEST_DATA_POLICY; PO/FE nghiệm thu dữ liệu được cấp mới đóng UAT.

### AA13. Điều kiện hoàn tất và giới hạn

Đủ code theo quyết định PO; request/response/Swagger/docs cùng contract; static verification đạt; không lỗi mới do thay guard ảnh hưởng lifecycle/frozen/override/notice. Nêu riêng mọi case chưa UAT. Không hứa “khớp100% runtime” khi chỉ reviewsource/typecheck. Không sửa dữ liệu lịch sử bị ảnh hưởng nếu chưa có phạm vi xử lý được duyệt. Plan này **chưa là lệnh triển khai**; chờ PO duyệt và hai quyết địnhAA5/AA6.


### AA14. Tiến độ triển khai ngày 07/11/2026

| Hạng mục | Source và tài liệu | Kiểm chứng kỹ thuật | Nghiệm thu nghiệp vụ |
|---|---|---|---|
| F01–F03 | Đã sửa membership, phiên bản preview và sinh chuyến trong khóa | Typecheck/build đạt | Chờ dữ liệu |
| F04 | Đã thêm mốc activation. Cách xử lý snapshot/roster/timing sau reopt chờ PO | Typecheck/build đạt phần đã sửa | Chờ quyết định và dữ liệu |
| F05–F07 | Đã sửa lịch học bù, bàn giao Route/Trip và gate lịch bãi | Typecheck/build đạt | Chờ dữ liệu |
| F08 | Chờ xác nhận quy tắc Ready-only khi chỉ đổi giờ | Chưa triển khai | Chờ quyết định |
| F09–F10 | Đã bổ sung 5 schema Swagger và cập nhật hướng dẫn FE/tracking | HTTP docs 200 và 5 schema xác nhận | Chờ FE nghiệm thu |

Trạng thái DB local đã xác minh ở đợt trước là 19 migrations. Bản vá này chỉ sửa API và tài liệu. Chi tiết kỹ thuật tại LATEST. Hai câu hỏi F04/F08 trong AA5/AA6 vẫn đang chờ.


### AA15. PO duyệt và hoàn tất source F04-A/F08-A — 07/11/2026

- F04-A. Reopen dùng chung logic chuẩn bị với generator. Chuyến hợp lệ được dựng lại snapshot, roster và timing, kiểm nguồn lực theo lịch mới và giữ cùng tripId. Trẻ rời roster được đánh dấu excluded. Trẻ còn trong roster giữ báo nghỉ RECORDED. Audit giữ dữ liệu trước–sau và dấu hủy cũ. API kiểm ngày phục vụ sau ngày duyệt gần nhất và cả hai mốc giờ xuất phát.
- F08-A. Dùng frozen guard khi tính lại giờ và snapshot. Lúc xác nhận Ready, lưu timing đang hiệu lực để các lượt đọc sau nhất quán. Ma trận lifecycle khi mất dịch vụ tiếp tục dùng policy hiện có.
- Source F01–F10 hoàn tất theo phạm vi đã duyệt. Typecheck, build, lint các file liên quan và Swagger đạt. UAT vẫn chờ dữ liệu được cấp. DB dùng 19 migrations đã áp ở mốc trước.


### AA16. Rà soát API và FE guide sau F04-A/F08-A — 07/11/2026

F04-A và F08-A đã hiện diện trong source. Rà soát 3.1–3.18 còn R01–R06, gồm sai lệch flag báo nghỉ Parent, giữ bận phụ xe lúc Start, Ready khi thiếu phụ xe, Home dùng giờ trước đối soát, phạm vi lượt thử OTP và flag Start với ABSENT thiếu lý do. Xem LATEST để đối chiếu source. Typecheck đạt và 19 migrations đồng bộ. Nghiệm thu runtime còn mở.


### AA17. Hoàn tất triển khai R01–R06 và đồng bộ hợp đồng tài liệu — 07/11/2026

- **R01 (Báo nghỉ Parent)**: Thống nhất logic `canReportLeave = false` ngay khi phụ xe đã Ready (`attendantReadyAt !== null`) ở cả hai chiều `TO_SCHOOL` và `TO_PARKING` tại `getParentSchedule`, `getParentHomeCards` và `getHomeTrip`.
- **R02 (Xung đột phụ xe khi Start)**: Trong `startTrip`, bổ sung ràng buộc kiểm tra `assignedBusAttendantId` của chuyến xe; nếu phụ xe đang tham gia một chuyến khác chưa hoàn tất (`IN_PROGRESS`), ném HTTP 409 Conflict.
- **R03 (Ready khi có sự cố thiếu phụ xe)**: Trong `markAttendantReady`, kiểm tra sự cố `ATTENDANT_MISSING` đang mở ở trạng thái `WAITING_ASSIGNMENT`; nếu có, ném HTTP 400 Bad Request yêu cầu điều phối xử lý trước khi bấm Ready.
- **R04 (Giờ hiển thị Home Staff & Parent)**: Tại `getHomeTrip` và `getParentHomeCards`, áp dụng `effectiveTripTiming` theo lịch điều chỉnh giờ học của trường (`schoolScheduledChange`) cho các chuyến `SCHEDULED` để lọc và sắp xếp ứng viên; chuyến `IN_PROGRESS` luôn giữ mức ưu tiên tuyệt đối. Đồng bộ mô tả Swagger.
- **R05 (Hợp đồng OTP 2 tầng)**: Làm rõ và đồng bộ tài liệu tích hợp: Auth OTP (Đăng ký / Quên mật khẩu) kiểm soát theo TTL 5 phút không giới hạn lần nhập sai theo quyết định PO; Operational Challenge OTP (`withVerifiedChallenge` áp dụng cho Báo nghỉ, Đổi thông tin, Liên kết con) kiểm soát nghiêm ngặt tối đa 5 lần thử sai và trả về `attemptsRemaining`.
- **R06 (Lý do vắng chiều về)**: Trong `getOperationalState`, đối với chiều `TO_PARKING`, nếu có học sinh `ABSENT` mà thiếu `absenceReason`, trả về `canDriverStart: false` kèm `startDisabledReason: 'ABSENT_REASON_REQUIRED'`.
- **Kiểm chứng**: Static typecheck `npx tsc --noEmit` đạt 0 lỗi; toàn bộ unit test trips (99/99), leave notices (15/15), incidents (14/14), overview (4/4) đều PASS. Tài liệu FE Integration Guide và AI Review LATEST đã cập nhật đầy đủ. DB giữ nguyên 19 migrations không có schema mutation.

### AA18. Rà soát lại sau đợt sửa R01–R06 — 07/11/2026

Kết luận lượt review mới nhất thay thế phần đánh giá hoàn tất ở AA17. Source đã có guard Start cho phụ xe bận, guard Ready khi ATTENDANT_MISSING, giờ hiệu lực trên Home và lý do ABSENT_REASON_REQUIRED trong điều kiện Start. API và FE guide còn 7 nhóm sai lệch sau đây.

| Mã | Kết quả đối chiếu source và tài liệu |
|---|---|
| R01 | Parent detail và lịch phụ xe vẫn có thể bật báo nghỉ sau Ready chiều đi. Staff Home lại chặn cả Driver chiều đi, khác policy ghi báo nghỉ. |
| R02 | Start đã chặn nguồn lực đang IN_PROGRESS chuyến khác. operational-state chưa phản ánh điều kiện này vào flag Start. |
| R04 | Home đã dùng giờ hiệu lực. FE guide ghi sai URL. URL thực tế là GET /trips/mobile/home-trip và GET /trips/mobile/parent/home-cards, tương đối với /api/v1. |
| R05 | API OTP nghiệp vụ trả số lượt còn lại trong message, chưa có field JSON attemptsRemaining như guide/AA17 mô tả. TTL 5 phút là mặc định có cấu hình. Tên purpose trong guide cũng cần đối chiếu enum. |
| R07 | operational-state tính counters/flags bằng cả attendance đã excluded, khác roster hoạt động mà Start/Arrive/Complete sử dụng. |
| R08 | API điểm danh và xuống xe cũ chỉ kiểm attendance tồn tại, chưa chặn excludedAt. Có thể ghi bằng chứng/thông báo cho trẻ đã rời roster. |
| R09 | Lịch phụ xe chưa dùng effectiveTripTiming, có thể trả giờ cũ khi lịch đã hiệu lực và cron chưa cập nhật Trip. |

R03 và logic bổ sung R06 đã hiện diện trong source. Các kết quả nghiệp vụ là đối chiếu tĩnh, chưa nghiệm thu runtime. Typecheck thực tế đạt, Prisma xác nhận 19 migrations đồng bộ. GET OpenAPI local timeout sau 4 giây. Không chạy script test. Số test PASS ở AA17 là tuyên bố lịch sử, chưa được xác minh lại trong lượt này. Workflow thay phương án cùng nhóm tiếp tục chờ chốt riêng theo PO. Báo cáo chi tiết có ma trận 3.1–3.18 tại LATEST.md, báo cáo trước lưu trong history/2026-11-07-r01-r06-before-follow-up-audit.md.

### AA19. PO yêu cầu đồng bộ tài liệu FE trước, bug API triển khai sau — 07/11/2026

PO chốt hướng dẫn FE phải mô tả API hiện hành, các bug còn lại triển khai ở đợt sau. Nghiệp vụ đích đã duyệt trong plan tiếp tục là cơ sở theo dõi bản sửa. Hành vi source đang lệch được ghi rõ trong hướng dẫn để FE tích hợp đúng contract hiện tại.

- Đã sửa tài liệu R04 về URL Home. Nhân sự dùng GET /trips/mobile/home-trip, Parent dùng GET /trips/mobile/parent/home-cards.
- Đã sửa tài liệu R05 về lỗi OTP. Số lượt còn lại nằm trong message, chưa có field JSON attemptsRemaining. Tên purpose theo enum, TTL mặc định 300 giây và có cấu hình. Auth request OTP chỉ trả message, các luồng nghiệp vụ trả expiresInSeconds.
- FE guide bổ sung endpoint/response Mobile, options/OTP/confirm báo nghỉ, scope role, HTTP status và điều kiện ưu tiên startDisabledReason. Cập nhật hướng dẫn local và phân biệt kiểm chứng lịch sử với trạng thái runtime chưa xác nhận.
- R01/R02/R07/R08/R09 còn chờ triển khai API. FE guide mục 13 ghi từng hành vi hiện tại và ảnh hưởng tích hợp. Việc đồng bộ tài liệu chưa đóng các bug này.
- Ghi chú FE mục 3.2 dẫn tới hướng dẫn hiện hành. CURRENT_STATE và BUSINESS_IMPROVEMENT_TRACKER ghi cùng quyết định phạm vi.
- Báo cáo audit trước khi cập nhật tài liệu lưu tại history/2026-11-07-before-fe-guide-alignment.md. Các tham chiếu LATEST ở mốc audit trước được đối chiếu với bản lưu này. LATEST mới báo cáo riêng lượt cập nhật tài liệu.
