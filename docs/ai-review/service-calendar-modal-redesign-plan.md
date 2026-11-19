# Kế hoạch thiết kế lại modal ngày nghỉ và học bù

## 1. Phạm vi và điểm mở modal

- SCHOOL_ADMIN mở từ «Lịch vận hành» tại /admin/calendar. Dùng một modal có hai lựa chọn đầu form: «Ngày nghỉ» và «Đề nghị học bù».
- SYSTEM_ADMIN mở từ tab Lịch vận hành trong hồ sơ trường hoặc phần Lịch nghỉ nhà xe trong Cài đặt. Chỉ hiện form ngày nghỉ với tiêu đề đúng phạm vi. Giữ quyền duyệt/từ chối học bù, hủy ngày nghỉ và làm mới của panel.
- Giữ palette, token và component Web. Hai bản tham chiếu là r2s-service-calendar-modal-wireframe.svg và r2s-service-calendar-modal-preview.png trong thư mục visualizations của phiên. Cả hai minh họa dương lịch một lần. Các trạng thái âm lịch và lặp năm thực hiện theo mục 2–3.
- Phạm vi là UI Web. Dùng GET/POST /service-calendar cùng quyền, status và DTO hiện hành. Mục ngày nghỉ trùng là cảnh báo. Quyết định chặn trùng, chặn ngày vốn nghỉ theo lịch tuần hay xử lý xung đột lịch lặp được chốt riêng.

## 2. Bố cục và hành vi

| Chế độ | Trường nhập | Thao tác |
|---|---|---|
| Ngày nghỉ | Tên ngày nghỉ, Hệ lịch, Tần suất, Ngày áp dụng | «Lưu ngày nghỉ». Khi thành công hiện «Đã lưu ngày nghỉ» và tải lại danh sách/lịch theo callback hiện có. |
| Đề nghị học bù | Tên buổi học bù, Hệ lịch, Ngày học bù, Giờ bắt đầu, Giờ kết thúc | «Gửi đề nghị học bù». Hiện ghi chú cần nhà xe duyệt và xác nhận «Đã gửi đề nghị học bù» khi thành công. |

- Dùng lựa chọn hai chế độ với ngữ nghĩa radio group hoặc component tương đương có hỗ trợ bàn phím. Mặc định Ngày nghỉ. Khi chuyển qua lại, giữ dữ liệu từng chế độ trong phiên mở modal. Chỉ gửi các trường của chế độ đang lưu. Học bù luôn gửi ONCE và giờ kết thúc phải sau giờ bắt đầu.
- Dùng header và footer ổn định, giới hạn chiều cao theo viewport, chỉ cuộn phần thân khi cần. Trên desktop, lịch hiện ngay cạnh hoặc dưới ô ngày theo wireframe. Trên màn hẹp, lịch nằm trong thân modal, nhóm hai cột chuyển thành một cột nếu cần. Kiểm focus không bị header/footer che khi cuộn.
- Khi mở, đặt focus vào lựa chọn đầu form hoặc ô tên nếu chỉ có một chế độ. Đóng lịch bằng Esc trước khi thoát modal, trả focus về nút mở lịch. Sau khi đóng modal, trả focus về nút mở modal. Nếu có bản nháp đã sửa, dùng cùng luồng xác nhận bỏ thay đổi cho Hủy, nút đóng, Esc và click nền nếu giữ cách đóng qua nền. Giữ dữ liệu khi API báo lỗi. Chặn gửi lặp trong khi đang lưu.
- Hiện lỗi cạnh trường có lỗi và focus vào trường sai đầu tiên khi submit. Nếu lỗi API không quy được về trường, hiển thị thông báo chung trong modal. Dùng lỗi ngày/giờ và ghi chú ngắn đúng ngữ cảnh.

## 3. Date picker và điều kiện theo ngày

- Dương lịch một lần: dùng một ô nhập/chọn hiển thị dd/MM/yyyy theo vi, placeholder dd/mm/yyyy. Nhập bàn phím và chọn từ Calendar dùng cùng giá trị ngày. Parse ngày thật và giữ giá trị ngày độc lập múi giờ trình duyệt. Dùng ngày Việt Nam cho hôm nay và cận dưới ngày mai. Giữ giới hạn hiện hành của input. Lịch tháng bắt đầu từ thứ Hai, có điều hướng tháng/năm, phân biệt hôm nay, ngày chọn và ngày bị khóa bằng trạng thái truy cập được. Giữ nút mở lịch có nhãn đầy đủ.
- Âm lịch một lần: ngày, tháng và năm âm; tùy chọn tháng nhuận. Hiện ngày dương tương ứng hoặc lỗi khi ngày/tháng nhuận không tồn tại. Áp dụng các ràng buộc ngày trên ngày dương quy đổi UTC+7. Khi đổi hệ lịch, yêu cầu nhập lại ngày để tránh hiểu các số cũ theo hệ lịch mới.
- Ngày nghỉ hằng năm: ngày/tháng, tùy chọn tháng nhuận cho âm lịch, bỏ năm trong request. Dùng helper hiện có để kiểm ngày và diễn đạt rõ trường hợp bỏ qua kỳ không có ngày tương ứng. Không lấy riêng năm hiện tại để bác quy tắc lặp hợp lệ. Giữ quy tắc hiện hành về việc không thêm lịch lặp áp dụng ngay hôm nay.
- Cảnh báo ngày đã có lịch nghỉ: tận dụng dữ liệu lịch đã tải theo phạm vi và chưa bị lọc bởi «Chỉ chờ duyệt». Dùng calendarMatches để so ngày thực tế với các mục HOLIDAY đã duyệt, gồm âm/dương và lịch lặp. Phân biệt nghỉ trường với nghỉ nhà xe bằng chữ. Bản ghi đã hủy không đánh dấu. Riêng trường hợp dữ liệu cảnh báo chưa tải được, tránh hiển thị như thể đã kiểm tra và không có xung đột.
- Với học bù, dùng dữ liệu hợp đồng, lịch nghỉ và thay đổi đã hẹn có sẵn trong quyền truy cập để phản ánh các giới hạn hiện hành. Khi đủ dữ liệu tin cậy, khóa ngày ngoài thời hạn hợp đồng, ngày trường ngừng hoạt động và ngày nghỉ nhà xe, kèm lý do. Ngày nghỉ trường vẫn chọn được nếu đạt các điều kiện khác. Khi thiếu dữ liệu để xác định hiệu lực theo ngày hoặc dữ liệu thay đổi sau lúc mở modal, ưu tiên phản hồi chính thức từ API và giữ bản nháp cho người dùng sửa. Trình bày xung đột với yêu cầu học bù đã có bằng lỗi hiện hành khi API trả về.
- Giữ CalendarEntryInput. Dương lịch một lần vẫn gửi year/month/day từ ngày đã chọn. Âm lịch gửi thành phần âm và leapMonth. Học bù gửi startTime/endTime, ngày nghỉ bỏ hai trường giờ. Giữ POST là nguồn kiểm tra cuối cùng.

## 4. Vị trí sửa và nghiệm thu

- File chính là web/src/components/admin/schools/service-calendar-form.tsx. Dùng service-calendar-panel.tsx để truyền bản ghi lịch theo đúng scope và phản hồi thành công. Nếu cần metadata hợp đồng, truyền từ màn gọi đang có dữ liệu qua SchoolOperatingCalendar, hoặc dùng API đọc hiện có khi modal cần. Ưu tiên Calendar, LifecycleDialog, calendarMatches, calendarOccurrence, vietnamDate và displayDate hiện có. Dùng style riêng cho modal nếu cần, giữ bố cục các caller khác của component dùng chung.
- Kiểm ba điểm mở theo role, việc chuyển chế độ và cập nhật lịch tuần/danh sách sau lưu thành công. Kiểm UI đọc bằng bàn phím, click, tab, Esc, xác nhận bỏ bản nháp, focus khi lỗi, màn 1440/1024/390 px và modal trong viewport thấp.
- Kiểm ngày mai, ngày hôm nay, tháng/năm chuyển tiếp, ngày sai, hai biên hợp đồng, ngày nhà xe nghỉ và ngày trường nghỉ. Kiểm giờ bằng nhau/đảo thứ tự, 29/2 với lịch dương, ngày âm hợp lệ, tháng nhuận, năm không có ngày lặp và chênh múi giờ máy. Kiểm lịch có mục trùng như 19/11 trong ảnh, có mục đã hủy, lỗi lấy dữ liệu và lỗi submit.
- Dùng dữ liệu sẵn có được PO cho phép và ghi nhận phần runtime còn chưa xác minh. Chạy npx --no-install tsc --noEmit trong web và git diff --check. Giữ chỉ thị PO về script test và Test Data Policy.

## Prompt cho Antigravity

> Sau khi PO duyệt wireframe, triển khai file docs/ai-review/service-calendar-modal-redesign-plan.md. Đọc AGENTS.md, tài liệu nền theo thứ tự và web/AGENTS.md. Kiểm tra git status và bảo toàn thay đổi đang có. Dùng r2s-service-calendar-modal-wireframe.svg và r2s-service-calendar-modal-preview.png nếu có quyền truy cập.
>
> Refactor ServiceCalendarForm. Với SCHOOL_ADMIN, đặt «Ngày nghỉ» và «Đề nghị học bù» ở đầu modal và chỉ hiện trường liên quan đến chế độ đã chọn. Với SYSTEM_ADMIN, chỉ hiện chế độ ngày nghỉ và tiêu đề đúng phạm vi trường hoặc nhà xe. Giữ hai hành động riêng «Lưu ngày nghỉ» và «Gửi đề nghị học bù». Giữ bản nháp khi đổi chế độ hoặc khi API báo lỗi, hiển thị lỗi cạnh trường, hỗ trợ bàn phím, xác nhận khi bỏ bản nháp và trả focus khi đóng.
>
> Dùng một ô nhập/chọn ngày dương lịch dd/MM/yyyy, đồng bộ với lịch tháng tiếng Việt bắt đầu thứ Hai. Dùng ngày Việt Nam cho cận dưới, giữ chuyển đổi âm lịch UTC+7, tháng nhuận, trường năm và hành vi lặp theo mục 3. Đánh dấu ngày đã có lịch nghỉ và giải thích phạm vi. Cảnh báo trùng ngày nghỉ chỉ là thông tin. Với học bù, phản ánh các ràng buộc hợp đồng, trường hoạt động và ngày nghỉ nhà xe từ dữ liệu có sẵn, vẫn cho học bù vào ngày nghỉ của trường nếu hợp lệ. Giữ POST /service-calendar là nguồn kiểm tra cuối cùng và giữ DTO, quyền, status, callback và refresh hiện có.
>
> Dùng token và component có sẵn, ảnh hưởng giới hạn trong modal và caller trực tiếp. Nghiệm thu theo mục 4, chạy typecheck Web và git diff --check, tuân thủ chỉ thị PO về test data, test scripts, dependency, env và Git. Ghi trạng thái runtime thực tế cùng báo cáo 13 mục và LATEST.diff rồi dừng.
