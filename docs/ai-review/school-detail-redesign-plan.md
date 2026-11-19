# Kế hoạch thiết kế lại trang hồ sơ trường

## 1. Phạm vi

Áp dụng Web Admin tại /admin/schools/:id. Dùng bản r2s-school-detail-wireframe.svg và r2s-school-detail-preview.png trong thư mục visualizations của phiên. Giữ bảng màu, shell, quyền, API và nghiệp vụ hiện hành. Kiểm tra git status và bảo toàn các thay đổi đang có về cập nhật tên/ảnh, wizard và danh sách trường.

## 2. Hồ sơ và thao tác

- Giữ đường về danh sách theo BackLink/returnTo. Thu gọn khối hồ sơ, gồm ảnh hoặc biểu tượng, tên trường, địa chỉ và badge trạng thái hiện có. Hàng dưới hiển thị hợp đồng với hai nhãn Bắt đầu, Kết thúc và nút Xem bản đồ. Giữ hành vi mở/thu bản đồ chỉ xem.
- Hiển thị «Chỉnh sửa thông tin» theo quyền hiện có. Dùng chính EditSchoolModal đang dùng, giữ cập nhật tên/ảnh và các tác vụ chỉnh sửa đã triển khai.
- Đưa hành động trạng thái vào menu ba chấm, dùng «Hẹn ngừng hoạt động» với trường đang hoạt động và «Kích hoạt lại» với trường đã ngừng. Tái sử dụng SchoolStatusDialog, date picker, xác nhận, toast và xử lý sau lưu. Đối chiếu quyền với các guard hiện hành trước khi render. Nếu dùng TableActions, tái sử dụng forceMenu hiện có để menu vẫn hiển thị khi chỉ có một mục. Có nhãn nút, điều hướng bàn phím và trả focus khi đóng.

## 3. Lịch vận hành

- Giữ điều hướng cấp trang và giá trị query tab hiện hành cho Lịch vận hành, Nhân viên trường, Học sinh, Phương án tuyến và Chuyến xe. Chuyển SchoolSchedule từ khối hồ sơ vào đầu tab Lịch vận hành. Giữ trạng thái tab phụ như hiện tại và kiểm việc chuyển qua tab khác rồi quay lại.
- Dùng tiêu đề «Lịch học tuần», hiển thị chính xác khoảng ngày Thứ 2–Chủ nhật, kể cả tuần vắt qua tháng hoặc năm. Nút trước/sau vẫn chuyển theo tuần. Giữ «Tuần hiện tại» khi đang xem tuần khác và dialog «Xem lịch tháng». Đánh dấu hôm nay theo ngày Việt Nam, gồm nhãn chữ và trạng thái truy cập.
- Hiển thị trực tiếp nhãn do phép tính hiện có trả về, gồm Ngoài hợp đồng, Ngừng hoạt động, Nghỉ hoặc tên ngày nghỉ. Ngày học hiển thị giờ và đánh dấu Học bù khi áp dụng. Giữ resolver, thứ tự ưu tiên lịch và dữ liệu hiện có. Tuần trong ảnh 09–15/11/2026 có 09–13 ngoài hợp đồng, không hiển thị cùng nhãn Nghỉ của cuối tuần.
- Đưa tab con «Ngày nghỉ & học bù» và «Thay đổi đã hẹn» vào cùng một khung, dùng gạch chân cho tab con để phân biệt với tab cấp trang. Giữ trạng thái, keyboard navigation, badge số thay đổi chờ áp dụng và cách mount hiện có của hai panel nếu cần để giữ dữ liệu.
- Controls nằm trong nội dung tab phù hợp. Tab nghỉ/học bù giữ Chỉ chờ duyệt, Làm mới và nút thêm theo vai trò. Tab thay đổi đã hẹn giữ Làm mới và thao tác hủy theo quyền. Làm mới ở panel tải lại dữ liệu panel đó. Giữ thông báo đang tải và lỗi tách với rỗng. Khi tải thành công và rỗng, dùng «Chưa có lịch nghỉ hoặc học bù» ở chế độ tất cả và «Không có yêu cầu chờ duyệt» ở chế độ lọc chờ duyệt.
- Sau tạo/hủy ngày nghỉ, duyệt/từ chối học bù, thay đổi lịch hẹn hoặc chỉnh sửa/trạng thái trường thành công, kiểm các lần tải lại hiện có. Nếu lịch tuần còn mounted và giữ dữ liệu cũ, dùng refreshKey hiện có để tải lại cùng schoolId. Giữ tuần đang xem trong phiên nếu không cần reset. Khi lịch ngoại lệ tải lỗi, tiếp tục hiển thị cảnh báo lịch cơ bản theo fallback hiện hành.

## 4. Bố cục và file dự kiến

- File chính web/src/app/admin/schools/[id]/page.tsx và _components/school-detail.css. Tái sử dụng SchoolSchedule, SchoolOperatingCalendar, ServiceCalendarPanel và SchoolScheduledChanges. Tìm caller trước khi chỉnh component dùng chung, giữ bố cục các màn ngoài phạm vi nếu chúng tái sử dụng.
- Desktop theo preview. Khi vùng nội dung hẹp do sidebar hoặc viewport, cho nhóm hợp đồng và thao tác xuống hàng. Dãy tab và lịch tuần có thể cuộn ngang trong vùng riêng để giữ thứ tự ngày. Không tạo tràn ngang toàn trang.
- Nghiệm thu tại 1440/1024/390 px và desktop khi sidebar mở/thu. Kiểm địa chỉ dài, ảnh thiếu, bản đồ mở/thu, xác nhận trạng thái, đổi tab, modal tháng và điều hướng tuần qua tháng/năm. Kiểm bằng chuột và bàn phím.
- Kiểm cùng dữ liệu hợp đồng/lịch trước và sau. Kiểm ngày ngoài hợp đồng, nghỉ thường, ngày nghỉ có tên dài, học bù, đang tải, lỗi và hai trạng thái rỗng. Kiểm quyền và việc cập nhật lịch sau các thao tác đã được PO cho phép.
- Chạy npx --no-install tsc --noEmit trong web và git diff --check. Ghi phần runtime chưa kiểm chứng. Không chạy script test hay tạo dữ liệu theo yêu cầu PO.

## Prompt cho Antigravity

> Triển khai redesign hồ sơ trường /admin/schools/:id theo docs/ai-review/school-detail-redesign-plan.md. Đọc AGENTS.md và web/AGENTS.md, kiểm tra git status, bảo toàn các thay đổi đang làm. Dùng r2s-school-detail-wireframe.svg và r2s-school-detail-preview.png nếu truy cập được. Cập nhật giao diện Web theo bảng màu và component hiện có.
>
> Thu gọn header hồ sơ, tách Bắt đầu/Kết thúc hợp đồng có nhãn, giữ Xem bản đồ và BackLink. Giữ Chỉnh sửa thông tin với EditSchoolModal hiện tại, chuyển Hẹn ngừng hoạt động/Kích hoạt lại vào menu ba chấm và tái sử dụng SchoolStatusDialog. Giữ guard quyền và các thay đổi tên/ảnh đã có.
>
> Đưa SchoolSchedule vào đầu tab Lịch vận hành. Hiển thị khoảng ngày tuần, đánh dấu hôm nay theo giờ Việt Nam và dùng nhãn thật của resolver cho ngày ngoài hợp đồng, ngày nghỉ và ngừng hoạt động. Giữ giờ học, học bù, chuyển tuần, Tuần hiện tại và Xem lịch tháng. Giữ nguyên query tab và bốn tab còn lại. Gom hai tab con Ngày nghỉ & học bù và Thay đổi đã hẹn vào panel có tab gạch chân. Giữ controls đúng tab và role, phân biệt tải/lỗi/rỗng. Kiểm lịch tuần được cập nhật sau thao tác quản lý lịch hoặc trường, dùng refreshKey hiện có nếu cần. Giữ API và nghiệp vụ.
>
> Nghiệm thu theo mục 4. Chạy typecheck Web và git diff --check, giữ chỉ thị PO về script test, dữ liệu, dependency, env và Git. Cập nhật báo cáo review 13 mục và LATEST.diff theo quy định repo. Nêu kết quả kiểm thực tế và phần chưa xác minh rồi dừng.
