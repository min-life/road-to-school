# Kiểm thử UI/UX — Web & Mobile

Ngày: 27/10/2026. Trạng thái: **CHƯA HOÀN TẤT — bị chặn quyền điều khiển Chrome và tài khoản Mobile**.

## 1. Tổng quan

- Mục tiêu: trải nghiệm Web trên Chrome với System Admin trước, sau đó các vai trò Mobile trên Android Emulator; chỉ đánh giá và đề xuất.
- Web: URL được PO cung cấp `http://localhost:5173/`. Lần truy cập bằng công cụ browser trả về **“Local browser use is disabled in Work settings”**. Không tự thay đổi cài đặt hoặc dùng phương thức khác để vượt hạn chế. Chưa đăng nhập, chưa xác minh được tài khoản System Admin hoặc nội dung Web.
- Mobile: Android Emulator `Medium_Phone:5554`, ứng dụng đang ở màn hình đăng nhập. Quan sát đăng nhập, mở biểu mẫu đăng ký Phụ huynh và chọn Email. Không đăng nhập: tài khoản được cung cấp thuộc System Admin, còn giao diện Mobile nêu đối tượng Tài xế, Phụ xe và Phụ huynh. Chưa có tài khoản Mobile được PO chỉ định.
- Không ghi mật khẩu vào báo cáo, không tạo tài khoản, không gửi biểu mẫu, không sửa source hoặc dữ liệu nghiệp vụ.

## 2. Độ bao phủ

| Phạm vi | Trạng thái | Bằng chứng / giới hạn |
|---|---|---|
| Mobile — đăng nhập | Đã quan sát | Thấy trường email/số điện thoại, mật khẩu, quên mật khẩu, đăng ký; chưa thử đăng nhập/validation/ẩn hiện mật khẩu |
| Mobile — đăng ký Phụ huynh | Đã quan sát một phần | Mở form; chuyển từ Số điện thoại sang Email và thấy nhãn/placeholder tương ứng; chưa điền, chưa nhấn Tiếp tục |
| Mobile — Driver, Bus Attendant, Parent | Bị chặn | Chưa có tài khoản Mobile phù hợp; chưa kiểm tra chuyến, sự cố, báo nghỉ, điều hướng, thông báo |
| Web — System Admin | Bị chặn | Quyền điều khiển local browser bị tắt trong Work settings; không thể đăng nhập hoặc duyệt module |
| Web — School Admin | Chưa kiểm thử | Chưa có phiên/tài khoản và chưa truy cập Web |
| Responsive, TalkBack, bàn phím, lỗi mạng, loading, empty, push | Chưa kiểm thử | Không có bằng chứng đủ để kết luận |

## 3. Đánh giá và cơ hội cải thiện

Phạm vi quan sát còn quá nhỏ để xác nhận lỗi P0/P1/P2 của sản phẩm. Các điểm dưới đây là **giả thuyết cần xác minh**, chưa phải bug đã xác nhận:

| Màn hình | Quan sát | Đề xuất | Mức ưu tiên |
|---|---|---|---|
| Đăng nhập Android | Nút Đăng nhập màu vàng nhạt khi các trường trống; chưa thử nhập hoặc kiểm tra trạng thái khả dụng | Kiểm tra tương phản, trạng thái disabled và thông báo lỗi bằng TalkBack/thiết bị | Chưa xếp hạng |
| Đăng ký Phụ huynh Android | Placeholder màu nhạt; biểu mẫu có hai lựa chọn phương thức xác thực | Đo độ tương phản và kiểm tra tên vai trò/trạng thái được đọc bởi TalkBack | Chưa xếp hạng |
| Android Emulator | Cây accessibility từ công cụ chỉ thể hiện cửa sổ emulator, không lộ cây giao diện ứng dụng | Kiểm tra accessibility trực tiếp bằng TalkBack hoặc công cụ Android phù hợp; không suy ra app thiếu accessibility từ hạn chế này | Chưa xếp hạng |

Không lưu ảnh chụp màn hình vì chưa có phát hiện xác nhận cần bằng chứng ảnh. Có thể tái hiện các quan sát bằng mở Android app → Đăng ký Phụ huynh → chọn Email, không gửi form.

## 4. So sánh Web/Mobile

**Chưa đánh giá được:** chưa truy cập Web và chưa đăng nhập Mobile. Không suy đoán tính nhất quán giữa hai nền tảng.

## 5. Chất lượng dữ liệu

Chưa quan sát dữ liệu nghiệp vụ sau đăng nhập. Các placeholder trong biểu mẫu là ví dụ hiển thị, không chứng minh chất lượng dữ liệu trong hệ thống. Không tạo dữ liệu kiểm thử.

## 6. Ưu tiên

- P0/P1/P2: **chưa đủ bằng chứng để phân loại lỗi sản phẩm**.
- Ưu tiên tiếp tục kiểm thử: bật quyền điều khiển local browser trong Work settings, sau đó kiểm thử System Admin; cần phiên hoặc tài khoản Mobile được cấp cho từng vai trò.

## 7. Agent Skills đề xuất

- `computer-use:computer-use`: tiếp tục kiểm tra thao tác và bố cục trên Chrome/Android Emulator sau khi quyền truy cập được bật; dùng cho kiểm thử trực tiếp, không phải công cụ tự sửa UI.
- `visualize:visualize`: khi đã xác nhận vấn đề, tạo wireframe so sánh phương án cải thiện trước khi xin duyệt chỉnh sửa UI.

Không cài đặt skill hoặc dependency trong phiên này.

## 8. Lộ trình tiếp tục

1. Khôi phục quyền truy cập Chrome, đăng nhập System Admin theo thông tin PO đã cung cấp và kiểm thử từng module bằng thao tác xem an toàn.
2. Dùng tài khoản hoặc phiên sẵn có của School Admin, Driver, Bus Attendant, Parent để kiểm thử; chỉ thực hiện thao tác làm thay đổi dữ liệu khi PO cấp phạm vi rõ ràng.
3. Tổng hợp phát hiện xác nhận, phân loại mức độ, so sánh Web/Mobile và đề xuất wireframe theo kết quả thực tế.

Test Data Policy của dự án cấm tự tạo/sửa dữ liệu hoặc gọi API có side effects để kiểm thử khi chưa được PO cho phép rõ ràng. Các luồng ghi dữ liệu chưa được kiểm chứng: **NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY**.

---

# Bổ sung — Rà soát UI/UX từ mã nguồn

## 1. Tổng quan và phương pháp

- Chế độ theo yêu cầu mới nhất: đọc mã nguồn và phân tích; **không chạy script test**, không thao tác API/DB, không cài dependency, không sửa source/config. Chỉ cập nhật báo cáo này.
- Không đăng nhập System Admin, không quan sát các trang Web trong lượt này; không dùng tài khoản/mật khẩu cho việc rà code. Các quan sát Android ở phần trên là từ lượt trước và chỉ bao phủ đăng nhập/biểu mẫu đăng ký.
- Phát hiện dưới đây được xác định từ nhánh code; mức ảnh hưởng là **ưu tiên đề xuất**, không khẳng định đã tái hiện trên thiết bị. Rà soát theo vai trò, điều hướng, các trạng thái lỗi/rỗng/tải, biểu mẫu, khả năng tiếp cận và danh sách; không xác nhận toàn bộ chức năng chạy thực tế.
- Ký hiệu: **SOURCE** = có bằng chứng mã nguồn; **CẦN UAT** = chưa có bằng chứng runtime/đo đạc. Không đánh dấu tính năng đã test chỉ vì code có xử lý.

## 2. Độ bao phủ rà soát

| Nhóm / vai trò | Mã đã rà soát | Phần chưa xác minh |
|---|---|---|
| Web SYSTEM_ADMIN / SCHOOL_ADMIN | Menu quyền, Tổng quan, chọn trường, danh sách chuyến/báo nghỉ/sự cố, tab phương án trường, thông tin tuyến học sinh, modal xử lý sự cố, thông báo | Đăng nhập và toàn bộ thao tác thực tế, kiểm quyền server, nhiều kích thước màn hình, keyboard/screen reader |
| Mobile DRIVER / BUS_ATTENDANT | Tab lịch, lịch sử sự cố/báo nghỉ, các nút điều hướng và phản hồi lỗi, thông báo | Đăng nhập, Start/Ready/điểm danh, GPS, đồng bộ và lifecycle thiết bị |
| Mobile PARENT | Đăng ký, tab theo dõi, báo nghỉ và thông báo | Đăng nhập, liên kết con, OTP, quyền riêng tư và luồng yêu cầu trên dữ liệu thật |
| Dùng chung | Điều hướng, dấu hiệu loading/error/empty, một số labels, form/modal, trạng thái password | Contrast đo thực tế, font scaling, TalkBack, bàn phím, responsive, tình huống mạng và nội dung phát sinh |

Danh sách menu là bằng chứng cấu hình giao diện theo role, không chứng minh phân quyền API. Các module khác ngoài nhóm trên không được tuyên bố đã kiểm tra toàn diện.

## 3. Phát hiện ưu tiên

### P1 — Lỗi tải lịch sử bị thể hiện như không có sự cố hoặc báo nghỉ

- **Nền tảng / vai trò:** Mobile, lịch sử sự cố (Driver/Bus Attendant); lịch sử báo nghỉ (Parent/Driver/Bus Attendant).
- **Bằng chứng SOURCE:** `mobile/app/incidents/index.tsx:54-64,186-191`: khi request lỗi, `catch` đặt `incidents=[]`, sau đó nhánh rỗng hiển thị “Chưa có sự cố”. `mobile/app/leave-notices/index.tsx:53-65,227-237` làm tương tự với “Chưa có báo nghỉ nào”.
- **Tác động suy luận:** khi mất mạng hoặc API lỗi, người dùng có thể hiểu nhầm rằng không có hồ sơ; dữ liệu cũ cũng bị xóa khỏi màn hình. Chưa kích hoạt lỗi thực tế để xác nhận biểu hiện end-to-end.
- **Đề xuất:** phân biệt loading/error/empty, hiện “Không thể tải” và “Thử lại”; nếu có kết quả trước đó, giữ danh sách kèm cảnh báo dữ liệu chưa cập nhật. Quyền bị thu hồi cần xử lý riêng, không giữ thông tin không còn quyền.

### P1 — Lỗi tải tuyến học sinh có thể bị hiểu là chưa phân tuyến

- **Nền tảng:** Web, thông tin tuyến trong hồ sơ học sinh.
- **Bằng chứng SOURCE:** `web/src/components/admin/students/student-routing-section.tsx:23-31,46-53`: lỗi chỉ ghi console; `detail` ban đầu null dẫn đến thông báo “Học sinh chưa được phân tuyến đưa đón”.
- **Tác động suy luận:** quản trị viên có thể nhầm lỗi dịch vụ với trạng thái phân tuyến, đặc biệt khi đưa ra quyết định điều chỉnh tuyến. Chưa chứng minh người dùng nào đã gặp lỗi hoặc thao tác sai.
- **Đề xuất:** trạng thái lỗi rõ ràng, nút thử lại; phân biệt dữ liệu cũ khi chuyển học sinh hoặc tải lại.

### P2 — Danh sách phương án của trường thiếu phản hồi lỗi

- **Nền tảng:** Web, tab phương án của trường.
- **Bằng chứng SOURCE:** `web/src/components/admin/schools/school-routes-tab.tsx:21-26,33-42,106`: danh sách khởi tạo rỗng, lỗi chỉ `console.error`; giao diện vẫn dùng `plans.length === 0` làm nhánh rỗng. Nếu đã tải trước đó, danh sách cũ có thể tiếp tục hiện mà không cảnh báo.
- **Đề xuất:** hiện lỗi và thử lại; nếu giữ dữ liệu cũ, thể hiện rõ lần cập nhật gần nhất.

### P2 — Cách yêu cầu mật khẩu không đồng nhất

- **Nền tảng:** Mobile, đăng ký/đặt lại/đổi mật khẩu.
- **Bằng chứng SOURCE:** `mobile/app/(auth)/register.tsx:53-54,210` và `mobile/app/(auth)/reset-password.tsx:66-67,207` yêu cầu tối thiểu 6 ký tự; `mobile/app/(tabs)/settings.tsx:211-212,470` yêu cầu 8. `api/src/auth/dto/auth.dto.ts:187-190` mô tả/validate đổi mật khẩu tối thiểu 6.
- **Tác động:** một mật khẩu 6–7 ký tự được các luồng đăng ký/đặt lại chấp nhận theo code nhưng form đổi mật khẩu từ chối. Chưa kiểm toàn bộ chính sách nghiệp vụ/server hoặc thử thực tế.
- **Đề xuất:** PO thống nhất chính sách mật khẩu; đồng bộ validation, nhãn và Swagger ở các luồng liên quan, không tự chọn hạ hay tăng ngưỡng.

### P2 — Thiếu nhãn cho một số điều khiển chỉ có biểu tượng

- **Nền tảng:** Mobile, đăng ký, lịch, lịch sử báo nghỉ/sự cố; Web, modal xử lý sự cố.
- **Bằng chứng SOURCE:** `mobile/app/(auth)/register.tsx:224-230,253-259` có nút mắt nhưng không khai báo `accessibilityLabel`; `mobile/app/(tabs)/schedule.tsx:146-155` có mũi tên tuần; `mobile/app/leave-notices/index.tsx:180-195` có nút quay lại/thêm với icon, không có label tường minh. `web/src/components/admin/incidents/resolve-incident-modal.tsx:115-132` có nút đóng bằng icon, không khai báo nhãn tại nút.
- **Tác động / giới hạn:** có nguy cơ tên điều khiển không rõ với TalkBack hoặc screen reader; cần kiểm tra cây accessibility thực tế vì framework có thể cung cấp tên mặc định.
- **Đề xuất:** gắn nhãn hành động và trạng thái có ý nghĩa; xác minh kích thước vùng chạm và điều hướng bằng thiết bị, không kết luận từ padding đơn lẻ.

### P2 — Ngữ nghĩa và điều hướng bàn phím của modal xử lý sự cố cần hoàn thiện

- **Nền tảng:** Web, xử lý sự cố thiếu nhân sự.
- **Bằng chứng SOURCE:** `web/src/components/admin/incidents/resolve-incident-modal.tsx:114-132` tạo overlay và nút đóng; trong file không thấy `role="dialog"`, `aria-modal`, nhãn dialog hoặc xử lý Escape/focus. Trong khi `web/src/components/admin/leave-notices/replacement-modal.tsx:87-89` đã khai báo dialog.
- **Tác động / giới hạn:** có nguy cơ screen reader không nhận biết hộp thoại và người dùng bàn phím khó quản lý focus; cần UAT để biết có lớp bao ngoài hoặc hành vi trình duyệt nào bù đắp.
- **Đề xuất:** thống nhất mẫu dialog có nhãn, chuyển/trả focus, Escape khi an toàn và kiểm soát focus; không khóa người dùng khi request đang xử lý.

### P2 — Bộ lọc trạng thái báo nghỉ và nội dung thẻ cần đối chiếu quyết định PO

- **Nền tảng:** Mobile, lịch sử báo nghỉ.
- **Bằng chứng SOURCE:** `mobile/app/leave-notices/index.tsx:147-150,162-175` có badge `TRIP_CANCELLED` “Chuyến đã hủy”; bộ lọc Parent chỉ gồm Tất cả/Đã nhận/Đã hủy và nhân sự không có bộ lọc `TRIP_CANCELLED`.
- **Tác động:** trạng thái có thể chỉ xem trong “Tất cả”, khó lọc riêng. Với học sinh, nhãn này cần đối chiếu yêu cầu trước đó “chỉ có Đã nhận và Đã hủy” và ý nghĩa riêng của việc chuyến bị hủy.
- **Đề xuất:** thống nhất với PO cách biểu diễn trạng thái báo nghỉ và trạng thái chuyến; chỉ bổ sung/chỉnh bộ lọc khi đã chốt nghiệp vụ. Chưa khẳng định record loại này tồn tại hay gây lỗi runtime.

## 4. So sánh Web và Mobile từ code

- Cùng là danh sách thông báo, Web có ba bộ lọc Tất cả/Chưa đọc/Cần xử lý (`web/src/components/admin/notifications/notification-list.tsx:52`), Mobile có hai (`mobile/app/notifications.tsx:36`). Đây là **khác biệt thiết kế**, chưa mặc định là lỗi vì nhóm vai trò và nhu cầu xử lý khác nhau; cân nhắc filter “Cần xác nhận” cho giáo viên nếu PO muốn.
- Web thông báo và Mobile thông báo đều có nhánh lỗi/thử lại; hai màn hình lịch sử sự cố và báo nghỉ Mobile lại biến lỗi thành rỗng. Ưu tiên thống nhất phản hồi lỗi theo mẫu rõ ràng.
- Cả hai nền tảng có navigation và danh sách role-specific; trải nghiệm thao tác thực tế, màu, độ tương phản, bố cục và trạng thái thực tế **chưa thể so sánh** bằng source alone.
- Web bảng chuyến/báo nghỉ/sự cố dùng `overflow-x-auto`; đây là dấu hiệu có tính đến màn hình hẹp, không chứng minh nội dung dễ dùng trên điện thoại.

## 5. Dữ liệu và test

Không đọc hay tạo bản ghi để đánh giá tính tự nhiên của dữ liệu. Placeholder ví dụ trong code không phản ánh dữ liệu thật. Không chạy unit/integration/E2E/test scripts; không gửi request có side effects. Độ đúng dữ liệu, phân quyền theo từng tài khoản và mọi luồng ghi là **NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY** khi chưa có phạm vi kiểm thử được cấp.

## 6. Ưu tiên tổng hợp

| Mức đề xuất | Công việc | Lý do |
|---|---|---|
| P0 | Chưa thấy bằng chứng đủ xác định | Không suy diễn từ source thành sự cố production |
| P1 | Phân biệt lỗi và dữ liệu rỗng ở lịch sử Mobile và tuyến học sinh Web | Tránh diễn giải sai sự cố/báo nghỉ/phân tuyến |
| P2 | Phản hồi lỗi phương án trường, thống nhất password, accessibility icon/modal | Tăng khả năng phục hồi và tiếp cận; xác minh runtime trước khi chốt |
| P2 cần PO quyết định | Trạng thái/lọc báo nghỉ; nhu cầu bộ lọc thông báo Mobile | Có yếu tố nghiệp vụ và khác biệt vai trò |

## 7. Agent Skills đề xuất

- `computer-use:computer-use`: khi có quyền browser/tài khoản, tái hiện P1 và kiểm tra các luồng an toàn trên Chrome/Android; không dùng để tự tạo dữ liệu hoặc gửi form ngoài phạm vi PO cấp.
- `visualize:visualize`: trình bày wireframe xử lý lỗi và modal/luồng khi cần chốt thay đổi UI; chỉ dùng sau khi PO yêu cầu thiết kế.
- Rà accessibility bằng công cụ được PO cho phép trên môi trường thực tế; hiện chưa đề xuất cài package/skill mới. Danh sách này là đề xuất, không có skill nào được cài trong lượt rà source.

## 8. Lộ trình đề xuất

1. Chốt phạm vi sửa P1: trạng thái lỗi/thử lại, xử lý dữ liệu cũ và trường hợp mất quyền; duyệt wireframe nếu thay cấu trúc màn hình theo quy tắc dự án.
2. Thống nhất password và trạng thái báo nghỉ với PO; sau đó rà accessibility labels/dialog và các màn hình tương tự.
3. Cấp môi trường/tài khoản và phạm vi dữ liệu UAT cụ thể; xác minh lỗi mạng, screen reader, responsive, role privacy, navigation và các hành động nghiệp vụ trên Web/Mobile. Tiếp tục từ các vị trí và file nêu ở trên.
