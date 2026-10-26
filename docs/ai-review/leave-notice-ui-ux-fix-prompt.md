# ROADTOSCHOOL — FIX UI/UX BÁO NGHỈ

Bạn là Antigravity. Product Owner yêu cầu thực thi các sửa UI/UX bên dưới sau khi đã triển khai module Báo nghỉ. Đây là scope sửa đã được chỉ định, không phải yêu cầu chỉ phân tích. Đọc source thật, sửa đúng phạm vi, hoàn tất kiểm chứng an toàn và báo cáo; không dừng sau planning.

## 1. Đọc ngữ cảnh và bảo vệ baseline

Đọc AGENTS.md và tài liệu bắt buộc theo thứ tự quy định, sau đó đọc `docs/ai-review/leave-notice-business-architecture-plan.md`, `docs/ai-review/leave-notice-implementation-prompt.md` và toàn bộ prompt này. Các yêu cầu UI mới dưới đây được ưu tiên hơn wireframe cũ. LATEST hiện có thể là báo cáo chuẩn bị prompt; xem báo cáo implementation được archive trong history để đối chiếu, không coi báo cáo là bằng chứng source.

Kiểm tra git status, bảo vệ toàn bộ staged/modified/untracked work, lưu baseline task riêng. Không commit/push/reset/rebase/discard/clean. Chỉ sửa module Báo nghỉ và các entry points/card/DTO liên quan trực tiếp. Không refactor navigation hoặc các module khác.

## 2. Những điểm đã đối chiếu với source

- `web/src/app/admin/leave-notices/page.tsx` dựng bảng riêng và status filter dạng chips; dùng chung tập trạng thái cho các loại đối tượng. Tham khảo style/table/filter của trang Học sinh và Chuyến xe thay vì tạo thêm hệ UI riêng.
- `mobile/app/leave-notices/index.tsx` có chips lọc từng học sinh và hiển thị cả PENDING_REPLACEMENT/REPLACED khi Parent xem.
- `mobile/app/leave-notices/create.tsx` dùng chips học sinh và ba nút Hôm nay/Ngày mai/Ngày kia; selectedDate mặc định hôm nay, selectedDirection mặc định TO_SCHOOL dù nhận tripId từ card. Cần loại bỏ nguy cơ chọn nhầm chuyến khi đi từ card.
- `mobile/app/(tabs)/schedule.tsx` đã có nút Báo nghỉ nhưng `mobile/app/parent/schedule.tsx` (Lịch học & Xe đưa đón theo học sinh) chưa có. Không kết luận đã đủ chỉ vì lịch dùng chung có nút.
- Các nút card ở Home/lịch dùng chung hiện route sang `/leave-notices/create`; phải chuyển sang confirm alert rồi OTP.
- Student notice hiện tạo RECORDED, hủy WITHDRAWN; trạng thái staff và Trip lifecycle là các khái niệm riêng. Không cần thay schema/enum cho yêu cầu nhãn UI này.

## 3. Yêu cầu sửa và bố cục mục tiêu

### A. Web Admin — đồng bộ bảng và dropdown filters

Đồng bộ trang Báo nghỉ với các trang quản trị hiện có: typography, khoảng cách, chiều cao hàng, header, border, loading/empty/error, pagination, action alignment và filter controls. Tham khảo `web/src/components/admin/students/student-table.tsx`, `student-filters.tsx`, `web/src/components/admin/trips/trips-table.tsx` và common components thực tế. Tái sử dụng nơi phù hợp, không dựng generic table framework mới hoặc sửa giao diện các module khác.

Thay filter chips bằng dropdown theo convention chung. Có thể giữ tabs phân nhóm Tài xế/Học sinh/Giáo viên; đây là nhóm đối tượng, không thay cho dropdown trạng thái. Ngày là datepicker, chiều là dropdown. Dropdown trạng thái phụ thuộc kind; đổi kind phải reset giá trị không còn hợp lệ và page về 1, tránh tab Học sinh mắc filter Chờ phân công khiến danh sách trống.

```text
Báo nghỉ
[Tài xế] [Học sinh] [Giáo viên]      (theo quyền)
[Trạng thái v] [Ngày: lịch] [Chiều v] [Đặt lại]
| Học sinh / Người báo | Chuyến | Ngày, giờ | Trạng thái | Thao tác |
                                      [Phân trang theo mẫu hiện có]
```

Tab Học sinh không cần cột Bố trí thay thế hoặc nút Xử lý thay thế. Tabs staff giữ chức năng phân công/hủy Trip và scope hiện có. Không thêm đoạn mô tả dài dưới tiêu đề.

### B. Lịch sử Mobile của Parent

- Bỏ hoàn toàn bộ chọn/filter học sinh khỏi trang Báo nghỉ mở từ Tiện ích; mặc định hiển thị lịch sử tất cả con còn liên kết, card có tên con.
- Không tự giữ studentId từ bộ lọc cũ trong state/route khiến trang Tiện ích vẫn bị lọc ngầm.
- Entry từ Student Detail vẫn giữ phạm vi cố định học sinh theo yêu cầu đã duyệt, nhưng không hiển thị bộ chọn học sinh; không làm mất khả năng xem riêng từ hồ sơ con.
- Student notice chỉ có hai nhãn nghiệp vụ **Đã nhận** và **Đã hủy**: RECORDED → Đã nhận, WITHDRAWN → Đã hủy. Bộ lọc chỉ Tất cả / Đã nhận / Đã hủy, ưu tiên dropdown; không có Chờ phân công/Đã bố trí.
- Đồng bộ nhãn học sinh ở Mobile history/detail và Web tab Học sinh. Staff vẫn giữ đúng các trạng thái staff. Trip CANCELLED là trạng thái chuyến, không tự biến notice RECORDED thành WITHDRAWN hoặc sửa lịch sử để có đủ hai nhãn; hiển thị trạng thái chuyến riêng khi cần.
- Creator-only cancel, quyền liên kết và các guard hiện có giữ nguyên, không chỉ ẩn nút ở UI.

```text
< Báo nghỉ                         [+]
[Trạng thái v]
An · 27/10 · Chiều đi        [Đã nhận]
Tuyến đi 01                 [Hủy báo nghỉ] (khi được phép)
```

### C. Form tạo báo nghỉ

- Học sinh của Parent là **dropdown**, không phải chips. Chỉ liệt kê con còn liên kết; giữ studentId thật làm value, không dùng tên/index làm identity. Entry từ hồ sơ học sinh giữ cố định học sinh, không buộc chọn lại.
- **Ngày phục vụ là datepicker** có lịch chọn ngày/tháng, thay giới hạn ba nút Hôm nay/Ngày mai/Ngày kia. Hiển thị dd/MM/yyyy, gửi serviceDate YYYY-MM-DD theo ngày Việt Nam; tránh lệch ngày do UTC. Không chỉ thay bằng ô nhập text giả datepicker.
- Tận dụng component/dependency có sẵn. Nếu Mobile chưa có datepicker package thì dùng calendar modal gọn bằng primitives hiện có; không tự cài package/native SDK. Web dùng date input/component theo convention.
- Ngày có thể chọn không có Trip: báo trống đúng, không sinh Trip, không tự đổi ngày sang ngày có chuyến hoặc giới hạn cứng chỉ ba ngày.
- Đổi học sinh/ngày/chiều phải reset Trip không còn phù hợp, fetch options mới, bỏ response cũ, disable submit khi chưa có lựa chọn hợp lệ. Một Trip phù hợp có thể tự chọn; nhiều Trip phải cho chọn rõ một chuyến.
- Luồng thêm từ Tiện ích vẫn dùng form → gửi OTP → xác nhận OTP. Không thay đổi lý do điểm danh đã duyệt chỉ vì form có lý do tùy chọn.

```text
< Tạo báo nghỉ
Học sinh      [Chọn học sinh v]
Ngày phục vụ  [dd/MM/yyyy    lịch]
Chiều         [Chiều đi] [Chiều về]
Chuyến        [Chọn chuyến v]
                         [Gửi mã OTP]
```

### D. Báo nghỉ nhanh từ thẻ chuyến

Áp dụng các card có hành động Báo nghỉ tại Home, lịch dùng chung và **lịch học riêng của học sinh** (`mobile/app/parent/schedule.tsx`). “Báo nghỉ trên thẻ” ở đây là nút trên card chuyến xe, không phải nút Hủy báo nghỉ trong lịch sử.

Luồng bắt buộc:

```text
Card chuyến → bấm Báo nghỉ
→ Alert: Báo nghỉ chuyến này?
  [Tên học sinh/nhân sự] · [Ngày thật của Trip] · [Chiều] · [Tên tuyến]
  [Đóng] [Xác nhận]
→ Xác nhận: request OTP với tripId + studentId đúng (Parent)
→ Màn hình OTP → OTP hợp lệ mới tạo báo nghỉ
→ refresh card/lịch/lịch sử và trạng thái liên quan
```

- **Không chuyển tới form nhập thông tin**, không bắt chọn lại học sinh/ngày/chiều/chuyến. Metadata lấy từ chính card/Trip, không mặc định hôm nay/chiều đi; không thay tripId bằng routeId/ID VIRTUAL.
- Giữ OTP bắt buộc đã duyệt. Alert không được trực tiếp tạo notice hoặc bỏ OTP. Bấm Đóng không gửi OTP hay tạo tác động.
- Với Parent bắt buộc biết chính xác studentId; card chứa nhiều con phải đặt action từng con hoặc chọn đúng con trước confirm, không tự báo cho tất cả hoặc mặc định con đầu tiên.
- Nút mới trong lịch học riêng gắn trip.id thật + studentId của lịch đang xem. Chỉ cho thao tác khi đúng quyền và guard; VIRTUAL không được báo nghỉ.
- stopPropagation khi nút nằm trong card có onPress; bấm Báo nghỉ không đồng thời mở Trip Detail. Chặn double tap/duplicate alert/duplicate OTP request bằng in-flight guard; xử lý đóng màn hình và response cũ.
- Dùng chung handler/hook phù hợp cho các entry points để không lệch payload/OTP behavior; không copy ba luồng khác nhau hoặc đưa thông tin liên hệ đầy đủ vào route params.
- Tái sử dụng OTP screen/API hiện có, truyền challengeId, masked channels, expiry và selection đúng; lỗi thì ở lại và báo ngắn, không tự gửi lại vô hạn. Refresh sau confirm/cancel giữ ngày lịch và filters.

## 4. Backend, quyền và giới hạn thay đổi

Task ưu tiên Web/Mobile. Không thay schema/DB enum/migration để sửa nhãn, dropdown hoặc datepicker; không đổi nghiệp vụ báo nghỉ/OTP.

Kiểm tra DTO và khả năng trả canReportLeave của lịch Parent có đúng từng học sinh/Trip: quyền liên kết/roster, notice đang hiệu lực, PRESENT/alighted, status/Start và Ready chiều về. Không thêm nút nhưng gửi thiếu studentId hoặc dùng cờ chung cho mọi học sinh. Nếu source thiếu dữ liệu/action flags gây lỗi UI, được sửa tối thiểu API/DTO/client liên quan trực tiếp; đồng bộ Swagger và ghi rõ diff. Không sửa API ngoài nhu cầu thực tế.

Giữ: Trip thật SCHEDULED chưa Start, Attendant trước Ready, TO_PARKING mọi đối tượng tạo trước Ready; cancel không OTP/creator-only, staff đã thay không hủy; OTP học sinh guardianPhone SMS console, staff fan-out theo contact; không sinh Trip và không đổi milestones/roster/navigation.

## 5. Acceptance và verification

Hoàn tất từng yêu cầu, không dùng chỉ tsc PASS làm bằng chứng UI hoạt động:

1. Web bảng/filter đồng nhất trang khác; trạng thái dropdown đúng loại, đổi tab không giữ trạng thái vô nghĩa; paging/filter/error không regress.
2. Parent history từ Tiện ích không có student filter và hiển thị đúng phạm vi mọi con; Student Detail vẫn có phạm vi cố định.
3. Student chỉ hiển thị Đã nhận/Đã hủy trong nhóm trạng thái báo nghỉ; staff không bị mất lifecycle riêng, Trip status không bị đổi nhầm.
4. Form chọn học sinh bằng dropdown, ngày bằng calendar datepicker, chọn được ngoài ba ngày gần nhất; payload đúng ngày VN, đổi selection không giữ Trip cũ.
5. Có Báo nghỉ trên card Trip đủ điều kiện trong lịch học riêng của con; VIRTUAL không tạo notice.
6. Card → confirm alert → OTP, không đi form; ngày khác hôm nay/chiều về/nhiều con đều bind đúng. Đóng alert không request, double tap không gửi nhiều lần, OTP thành công mới cập nhật.

Chạy typecheck Web/Mobile; API nếu có sửa Backend; lint/build phù hợp. Chỉ thêm/chạy tests pure/in-memory cần thiết cho payload, lựa chọn/phản hồi cũ, student status options và quick action guards; không viết tests chỉ để mirror class/style. Quan sát UI trên dữ liệu sẵn có được phép, nhưng không bấm Xác nhận gửi OTP hoặc tạo/hủy notice để test khi chưa có phạm vi UAT.

Không tự tạo User/Student/Trip/notice/OTP challenge, seed, sửa records thật hoặc dùng rollback để test. Không tự cài dependency, gửi OTP thử qua console/email, chạy migration hoặc gọi API mutation. Chưa có quyền runtime thì ghi NOT_VERIFIED/BLOCKED_BY_TEST_DATA_POLICY, nêu điều kiện cụ thể; vẫn hoàn tất phần code và kiểm chứng an toàn. Không giả báo screenshot/device/UAT PASS.

## 6. Bàn giao

Trước khi sửa, ghi ngắn bố cục thực hiện theo mục 3 ngay trong báo cáo/plan; đây là chỉnh UI theo yêu cầu PO hiện tại, không cần hỏi lại các yêu cầu đã rõ. Nếu cần thay cấu trúc lớn ngoài scope hoặc dependency mới thì báo riêng, không tự mở rộng.

Archive LATEST trước khi thay. Cập nhật plan nếu cần, LATEST đủ 13 mục, LATEST.diff chỉ task changes so baseline; không gộp toàn bộ uncommitted diff cũ/secrets/generated outputs. Báo từng tiêu chí acceptance: đã sửa ở đâu, đã kiểm chứng gì, phần nào chưa runtime; Swagger status nếu đổi API. Không tuyên bố hoàn tất UAT dựa trên typecheck.

Đề xuất một bước tiếp theo và **STOP AFTER TASK**. Không commit/push, tự chạy UAT ghi dữ liệu hoặc mở phase mới.
