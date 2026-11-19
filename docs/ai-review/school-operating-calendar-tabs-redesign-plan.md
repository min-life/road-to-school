# Kế hoạch thiết kế lại hai tab Lịch vận hành

## 1. Phạm vi

Thiết kế áp dụng cho khung SchoolOperatingCalendar tại Lịch vận hành của SCHOOL_ADMIN và tab Lịch vận hành trong hồ sơ trường của SYSTEM_ADMIN. Tham chiếu mới nhất là r2s-operating-calendar-times-wireframe.svg và r2s-operating-calendar-times-preview.png trong thư mục visualizations của phiên. Preview thể hiện hai trạng thái của cùng một khung, theo góc nhìn quản trị nhà xe.

Giữ token màu, modal và API hiện hành. ServiceCalendarPanel còn được dùng ở Cài đặt → Lịch nghỉ nhà xe với operatorOnly. Giới hạn layout mới vào lịch của trường, bảo toàn màn Cài đặt. Giữ những thay đổi đang có về modal ngày nghỉ, kiểm tra hạn hợp đồng và lịch tuần.

## 2. Thanh tab và bộ lọc

- Giữ hai tab «Ngày nghỉ & học bù» và «Thay đổi đã hẹn», trạng thái tab/URL hiện hành, điều hướng bằng bàn phím và mount của từng panel để giữ bộ lọc và chi tiết đang mở khi đổi tab. Dùng nhãn và gạch dưới cho tab đã chọn. Focus bàn phím có dấu hiệu riêng. Bỏ thanh cuộn dọc thừa, cho tab và toolbar thích ứng khi vùng nội dung hẹp.
- Bỏ tiêu đề lặp trong khung, giữ nhãn truy cập của panel. Dropdown «Trạng thái» nằm bên trái theo mục 6. Bên phải là nút icon «Làm mới» có tên truy cập/tooltip và nút thêm theo vai trò ở tab ngày nghỉ. Làm mới thủ công chỉ tải tab đang xem và giữ bộ lọc. Tạo, duyệt, từ chối hoặc hủy thành công tiếp tục tải lại danh sách và gọi callback cập nhật lịch như hiện tại.
- Hiện tải ban đầu, trạng thái đang làm mới, lỗi và rỗng theo bộ lọc. Số chờ chỉ hiển thị khi có dữ liệu đáng tin cậy đúng trường. Giữ điều kiện an toàn hiện có khi đổi trường hoặc nhận phản hồi cũ.

## 3. Ngày nghỉ & học bù

- Dùng «Tất cả» và «Chờ duyệt (n)» trên danh sách của đúng phạm vi. Bộ lọc Chờ duyệt lấy trạng thái PENDING. Giữ từng bản ghi theo ID, kể cả khi trùng ngày, và giữ thứ tự dữ liệu hiện hành.
- Desktop dùng các cột Ngày, Nội dung, Giờ bắt đầu, Giờ kết thúc, Trạng thái và Thao tác. Giữ tên, loại, phạm vi trường/nhà xe, hệ lịch và thông tin lặp. Hiển thị ngày theo dd/MM/yyyy khi có năm. Với lịch âm, ghi rõ hệ lịch và tháng nhuận khi có. Lịch lặp năm hiển thị ngày/tháng và «Hằng năm» thay vì gán năm tùy ý.
- Học bù lấy startTime/endTime, hiển thị HH:mm 24 giờ, in đậm và căn theo hai cột. Dòng ngày nghỉ dùng «Cả ngày» trên vùng hai cột. Nếu bản ghi học bù thiếu một mốc, dùng dấu gạch tại mốc thiếu. Giờ hiển thị là giờ của đề nghị hoặc lịch đã duyệt theo trạng thái của bản ghi.
- Hiển thị effectiveStatus khi có và lý do bị chặn/từ chối theo dữ liệu. Giữ điều kiện hiện Duyệt/Từ chối cho SYSTEM_ADMIN và Hủy ngày nghỉ theo vai trò, ngày và trạng thái như hiện hành. Giữ modal xác nhận và yêu cầu lý do từ chối.

## 4. Thay đổi đã hẹn

- Bộ lọc «Tất cả / Chờ áp dụng / Lịch sử». Chờ áp dụng lấy PENDING. Lịch sử gồm APPLIED, CANCELLED và FAILED. Giữ huy hiệu chờ áp dụng của tab theo tổng đúng phạm vi, độc lập với bộ lọc đang chọn.
- Dùng cột «Ngày dự kiến» lấy effectiveDate, cùng loại thay đổi và trạng thái. Hiện «Xem chi tiết»/«Thu gọn» với aria-expanded, vùng chi tiết gắn với đúng hàng. Giữ lý do thất bại, địa chỉ mới nếu có và thao tác Hủy lịch hẹn theo điều kiện hiện hành. Giờ/ngày áp dụng thực tế chỉ hiển thị khi có dữ liệu tương ứng.
- Chi tiết Đổi lịch học hiển thị cột T2 đến CN theo thứ tự cố định, dùng DAYS_OF_WEEK hiện có. Hai hàng Bắt đầu và Kết thúc đọc từ payload.weeklySchedule. Ngày không có khung giờ hiện «Nghỉ» trong cột ngày. Với mục đã hủy hoặc chưa áp dụng, dùng nhãn «Lịch học theo đề xuất» để phân biệt với lịch hiện hành. Dữ liệu lịch tuần lấy từ đúng bản ghi đang mở.
- Ở màn hẹp, hiển thị mỗi ngày thành một dòng, vẫn thấy nhãn Bắt đầu/Kết thúc và trạng thái Nghỉ. Giữ thứ tự ngày.

## 5. File dự kiến và nghiệm thu

- Điểm sửa chính gồm school-operating-calendar.tsx, school-operating-calendar.css, service-calendar-panel.tsx và school-scheduled-changes.tsx trong web/src/components/admin/schools. Kiểm các caller của ServiceCalendarPanel trước khi thay layout. Phạm vi style là hai panel, dùng lại Button, modal, formatter và component phù hợp. Đồng bộ hướng dẫn thao tác liên quan trong web/docs/school-lifecycle-usage.md nếu giao diện thay đổi.
- Xác minh ở 1440, 1024 và 390 px, sidebar mở/thu, dòng dài và màn thiếu chiều cao. Khi bảng hẹp, dùng danh sách xếp dọc và giữ nhãn giờ, trạng thái và thao tác trong cùng bản ghi. Kiểm thao tác bằng bàn phím, focus sau đóng modal và mở/thu chi tiết.
- Kiểm SCHOOL_ADMIN và SYSTEM_ADMIN, lịch nghỉ nhà xe trong Settings, ngày nghỉ một lần/lặp năm, âm lịch, học bù chờ duyệt/bị chặn, nhiều bản ghi cùng ngày, lịch đổi đã hủy/thất bại và tuần có ngày nghỉ. Kiểm filter, số đếm, refresh từng tab, trạng thái tải/lỗi/rỗng và tải lại sau thao tác đã được PO cho phép.
- Chạy npx --no-install tsc --noEmit trong web và git diff --check. Tuân thủ chỉ thị PO về script test và Test Data Policy. Ghi phần runtime chưa kiểm chứng, cập nhật báo cáo 13 mục và diff theo quy định repo.

## Prompt cho Antigravity

> Triển khai hai tab Lịch vận hành theo docs/ai-review/school-operating-calendar-tabs-redesign-plan.md sau khi PO duyệt thiết kế. Dùng r2s-operating-calendar-times-wireframe.svg và r2s-operating-calendar-times-preview.png làm tham chiếu. Đọc AGENTS.md, tài liệu bắt buộc và web/AGENTS.md. Kiểm tra git status và bảo toàn các thay đổi đang có.
>
> Dùng chung bố cục tab và toolbar trong SchoolOperatingCalendar. Bỏ tiêu đề lặp, xử lý thanh cuộn thừa và làm mới riêng tab đang xem. Tab Ngày nghỉ & học bù dùng bộ lọc Tất cả / Chờ duyệt (n), hiển thị riêng Giờ bắt đầu và Giờ kết thúc ở định dạng HH:mm. Ngày nghỉ hiển thị Cả ngày. Giữ từng bản ghi cùng ngày, trạng thái hiệu lực, phạm vi và các thao tác hiện có theo quyền.
>
> Tab Thay đổi đã hẹn dùng Tất cả / Chờ áp dụng / Lịch sử. Hiển thị ngày dự kiến, trạng thái và nút xem/thu gọn chi tiết. Lịch tuần dùng cột T2–CN với hai hàng Bắt đầu/Kết thúc. Ngày không có lịch học hiển thị Nghỉ. Phân biệt lịch theo đề xuất với lịch hiện hành. Màn hẹp xếp nội dung theo dòng và giữ nhãn giờ.
>
> Dùng API, payload, token và modal hiện có. Giới hạn layout mới vào lịch của trường, bảo toàn Cài đặt → Lịch nghỉ nhà xe. Nghiệm thu theo mục 5, tuân thủ chỉ thị PO về script test và dữ liệu, cập nhật báo cáo rồi dừng.

## 6. Dropdown Trạng thái sau khi xem giao diện

- Thay dãy nút lọc trạng thái ở cả hai tab lịch của trường bằng Select có nhãn «Trạng thái», đặt bên trái toolbar. Dùng kiểu viền/input hiện có và chiều rộng đủ đọc «Chờ áp dụng (n)». Khi hẹp, toolbar có thể xuống dòng. Bản tham chiếu mới nhất cho toolbar là r2s-operating-calendar-status-dropdown-wireframe.svg và r2s-operating-calendar-status-dropdown-preview.png.
- «Ngày nghỉ & học bù» có «Tất cả» và «Chờ duyệt (n)». «Thay đổi đã hẹn» có «Tất cả», «Chờ áp dụng (n)» và «Lịch sử». Chỉ nối số lượng vào nhãn mục chờ khi số dương đã biết. Giữ huy hiệu tổng chờ áp dụng trên tab.
- Mặc định «Tất cả» khi mở lịch của một trường. Lọc ngay khi chọn, dùng state và điều kiện lọc hiện có. Hai tab giữ lựa chọn riêng khi đổi tab hoặc làm mới. Giữ bảng, thao tác theo quyền và nhánh operatorOnly của màn Cài đặt nhà xe.
- Nghiệm thu bằng chuột và bàn phím, các lựa chọn lọc và số đếm, đổi qua lại hai tab, làm mới và toolbar ở màn hẹp. Chạy typecheck Web và git diff --check.

### Prompt bổ sung cho Antigravity — dropdown Trạng thái

> Chỉ triển khai mục 6 trong docs/ai-review/school-operating-calendar-tabs-redesign-plan.md. Thay cụm nút lọc bằng Select có nhãn «Trạng thái» ở bên trái toolbar trong ServiceCalendarPanel của trường và SchoolScheduledChanges. Tab Ngày nghỉ & học bù có Tất cả / Chờ duyệt (n). Tab Thay đổi đã hẹn có Tất cả / Chờ áp dụng (n) / Lịch sử. Dùng state, bộ đếm và điều kiện lọc hiện có. Mặc định Tất cả, lọc ngay, giữ lựa chọn riêng từng tab khi chuyển tab hoặc làm mới. Bảo toàn huy hiệu trên tab, các nút hiện có và màn Cài đặt → Lịch nghỉ nhà xe. Kiểm bàn phím, màn hẹp, typecheck và diff check. Tuân thủ chỉ thị PO về script test và dữ liệu.

## 7. Mở lịch học ngay dưới bản ghi

Áp dụng riêng cho tab «Thay đổi đã hẹn». Dùng r2s-scheduled-changes-inline-detail-wireframe.svg và r2s-scheduled-changes-inline-detail-preview.png làm tham chiếu. Mục này cập nhật cách mở chi tiết ở mục 4. Giữ dropdown trạng thái cụ thể đang chạy, huy hiệu, làm mới, quyền và modal hủy.

- Desktop: thay cột «Chi tiết» bằng nút dạng chữ «Đổi lịch học» kèm chevron ngay trong cột «Loại thay đổi». Cho bấm cả nhãn và icon. Chevron hướng xuống khi đóng, hướng lên khi mở. Dùng nền trong suốt, hover nhẹ, focus-visible đủ rõ. Vùng bấm đủ rộng. Dùng button với aria-expanded và aria-controls trỏ đúng nội dung; tên truy cập cho biết thao tác và ngày của bản ghi. Chỉ hiện nút với thay đổi có dữ liệu lịch học.
- Render hàng chi tiết ngay sau hàng gốc, bên trong tbody, với một td colSpan đúng số cột đang hiển thị. Dùng ID của bản ghi, phân biệt hàng mở bằng nền vàng nhạt và đặt lịch trong vùng nền sáng thụt vào. Giữ ngày dự kiến ở hàng gốc. «Lịch học theo đề xuất» cho mục chưa áp dụng, đã hủy hoặc thất bại; «Lịch học đã áp dụng» cho mục APPLIED. Tuần theo T2–CN, giữ Bắt đầu/Kết thúc, 24 giờ, ngày nghỉ hiện «Nghỉ».
- Màn hẹp: đặt cùng nút trong header của thẻ và chi tiết ở thân thẻ, trước bản ghi kế tiếp. Dùng mỗi ngày một dòng khi hẹp, giữ đủ giờ bắt đầu/kết thúc. Mỗi breakpoint chỉ hiện một bản chi tiết. ID aria-controls duy nhất nếu hai markup cùng tồn tại.
- Dùng expandedId hiện có để mở tối đa một mục. Bấm lại thì đóng. Giữ focus trên nút sau thao tác và giữ thứ tự cuộn tự nhiên. Nếu bộ lọc loại bản ghi ra hoặc làm mới trả danh sách không còn bản ghi đó, thu gọn. Nếu bản ghi vẫn có mặt sau làm mới, có thể giữ trạng thái mở. Nút hủy lịch hẹn vẫn độc lập.
- File dự kiến là school-scheduled-changes.tsx và style liên quan trong school-operating-calendar.css. Nghiệm thu khi mở bản ghi đầu giữa nhiều hàng, đổi bản ghi, thu gọn, lọc/refresh, thao tác bàn phím, hiển thị desktop và mobile, các trạng thái và quyền hủy. Chạy typecheck Web và git diff --check theo quy tắc repo.

### Prompt bổ sung cho Antigravity — mở lịch ngay dưới bản ghi

> Chỉ triển khai mục 7 của docs/ai-review/school-operating-calendar-tabs-redesign-plan.md. Trong SchoolScheduledChanges, thay nút viền ở cột Chi tiết bằng nút chữ «Đổi lịch học» kèm chevron ngay trong cột Loại thay đổi. Chữ và icon cùng bấm được, dùng aria-expanded, aria-controls và focus-visible. Desktop render hàng chi tiết colSpan ngay sau đúng hàng gốc trong tbody. Mobile render chi tiết trong đúng thẻ. Dùng expandedId để chỉ mở một bản ghi mỗi lần. Giữ cách hiển thị giờ, trạng thái lịch theo đề xuất/đã áp dụng, dropdown trạng thái cụ thể đang chạy và quyền hủy. Kiểm bàn phím, đổi filter/refresh, desktop và màn hẹp. Tuân thủ yêu cầu PO về test script và dữ liệu, cập nhật báo cáo rồi dừng.

## 8. Màu loại ngày, trạng thái trường và thời hạn hợp đồng

Tham chiếu r2s-school-calendar-day-status-wireframe.svg và r2s-school-calendar-day-status-preview.png. Phần «Mẫu hiển thị theo loại ngày» ở cuối preview chỉ dùng để minh họa thiết kế.

- Ở /admin/calendar, gom tên trường và badge «Đang hoạt động» cùng một nhóm. Dùng chấm và chữ xanh trên nền xanh nhạt khi isActive. Hiện «Ngừng hoạt động» với nhãn tương phản khi trường ngừng. Badge lấy trạng thái trường hiện có. Ngày hết hợp đồng đọc ở vùng hợp đồng riêng. Nếu màn hẹp hoặc tên dài, cho badge xuống dòng.
- Hiển thị «Thời hạn hợp đồng» với hai mốc «Bắt đầu» và «Kết thúc», mỗi mốc dùng ngày dd/MM/yyyy cỡ lớn hơn nhãn. Desktop đặt nhóm hợp đồng phía phải cùng thẻ; màn hẹp xếp dưới tên trường. Dùng ngày hiện có từ school operating settings.
- Lịch tuần và lịch tháng dùng cùng màu, chữ và chú giải. Mỗi ô lấy loại ngày từ kết quả resolve hiện hành. Nên phân loại bằng giá trị trạng thái ổn định của UI tại nhánh resolver tương ứng, tránh suy từ tên ngày nghỉ do người dùng nhập. Giữ thứ tự áp dụng lịch và kết quả đã có.

| Loại ngày | Màu nền / chữ | Nhãn |
|---|---|---|
| Ngày học | Xanh dương nhạt / xanh đậm | Hiển thị giờ |
| Học bù | Xanh lá nhạt / xanh lá đậm | Học bù và giờ |
| Nghỉ theo lịch tuần | Xám xanh / xám đậm | Nghỉ theo lịch tuần |
| Ngày nghỉ của trường hoặc nhà xe | Vàng nhạt / nâu đậm | Hiển thị tên ngày nghỉ |
| Ngoài hợp đồng | Xám rất nhạt, viền đứt / xám đậm | Ngoài hợp đồng |
| Ngừng hoạt động | Hồng nhạt / đỏ trầm | Ngừng hoạt động |

- «Hôm nay» dùng viền xanh và nhãn chữ trên nền loại ngày đang có, giữ aria-current. Chú giải có từ ngữ đi kèm màu, tự xuống dòng khi hẹp. Ngày đệm của lưới tháng vẫn để trống. Nếu tải lịch ngoại lệ lỗi, giữ cảnh báo lịch cơ bản hiện có.
- Điểm sửa dự kiến là web/src/app/admin/calendar/page.tsx cho thẻ trường/hợp đồng, SchoolSchedule và school-schedule.css cho lịch. Nếu cần gắn loại ngày, cập nhật resolver phía Web theo cách thêm thông tin trình bày. Kiểm điểm dùng SchoolSchedule ở cả /admin/calendar và hồ sơ trường. API, quyền, modal, bộ lọc và tác vụ khác theo triển khai hiện hành.
- Nghiệm thu tuần 09–15/11/2026 của ảnh: 09–13 ngoài hợp đồng, 14–15 nghỉ theo lịch tuần, 15 vẫn có nhãn Hôm nay. Kiểm thêm trường ngừng hoạt động, ngày nghỉ trường/nhà xe, học bù, chú giải tuần/tháng, tên trường dài và màn hẹp. Dùng typecheck Web và git diff --check, tuân thủ chỉ thị PO về script test và dữ liệu.

### Prompt bổ sung cho Antigravity — màu lịch và thẻ hợp đồng

> Triển khai mục 8 của docs/ai-review/school-operating-calendar-tabs-redesign-plan.md sau khi duyệt wireframe. Ở /admin/calendar, đặt badge trạng thái có chấm và chữ cạnh tên trường. Tách hợp đồng thành «Bắt đầu» và «Kết thúc» với ngày dd/MM/yyyy dễ đọc. Lịch tuần và lịch tháng dùng cùng màu và chú giải cho sáu loại ngày. Dùng loại ngày theo nhánh resolver hiện có, giữ thứ tự ưu tiên và tên ngày nghỉ. «Hôm nay» dùng viền/nhãn riêng và giữ nền của loại ngày. Kiểm cả hai điểm dùng SchoolSchedule, màn hẹp và dữ liệu ngoại lệ. Giữ API, quyền và hai tab bên dưới. Chạy typecheck Web và diff check, cập nhật báo cáo repo rồi dừng.
