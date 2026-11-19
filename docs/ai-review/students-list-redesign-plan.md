# Kế hoạch thiết kế lại trang danh sách học sinh

## 1. Phạm vi

Áp dụng /admin/students của SCHOOL_ADMIN. Dùng bản r2s-students-list-wireframe.svg và r2s-students-list-preview.png trong thư mục visualizations của phiên. Bản mới nhất đặt nút «Thêm học sinh» ở góc phải đầu trang trong cả hai trạng thái.

StudentTable còn được dùng ở hồ sơ trường dành cho SYSTEM_ADMIN. Giới hạn layout mới theo điểm dùng /admin/students. Giữ nhánh chỉ đọc, phạm vi trường và quyền Thêm vào tuyến tại hồ sơ trường. Giữ shell, màu, component, API, payload, modal và nghiệp vụ hiện hành.

## 2. Đầu trang, bộ lọc và trạng thái dữ liệu

- PageHeader có đúng một nút «Thêm học sinh» ở góc phải, giữ AddStudentModal, toast và refresh danh sách sau tạo. Bỏ nút trong bảng/khung rỗng và bỏ onAddClick khỏi StudentTable nếu sau khi kiểm caller không còn dùng.
- Phân biệt đang tải, lỗi, trường chưa có học sinh và lọc không có kết quả. Chỉ hiện «Chưa có học sinh» khi request đúng scope tải thành công, trang đầu, bộ lọc mặc định và meta.totalItems bằng 0. Khung chỉ có biểu tượng và nội dung ngắn. Khi đó ẩn toolbar, header bảng, checkbox, thanh in và phân trang.
- Khi kết quả lọc bằng 0, giữ toolbar và hiện «Không tìm thấy học sinh phù hợp» cùng một nút «Xóa bộ lọc». Tránh lặp nút xóa giữa toolbar và khung rỗng. Dùng một điều kiện active cho tìm kiếm theo giá trị thực gửi API, trạng thái, tình trạng địa chỉ, phân tuyến, provinceId và wardId. Reset giữ cách đưa về trang 1 hiện có. Nếu trang hiện tại trống nhưng API còn kết quả ở trang khác, xử lý về trang hợp lệ, tránh báo trường chưa có học sinh.
- Gộp bộ lọc và danh sách vào cùng thẻ. Giữ tìm kiếm họ tên/mã và các trường lọc hiện có. Đổi nhãn «Địa chỉ» thành «Tình trạng địa chỉ». Tỉnh/thành và Phường/xã là hai select riêng. Giữ lựa chọn theo dữ liệu địa giới của trường, hành vi reset phường khi đổi tỉnh, link mở bộ lọc theo query và điều kiện lọc hiện hành.

## 3. Bảng và thanh in thẻ

- Dùng cột Học sinh có avatar, tên liên kết mở chi tiết và mã ngay bên dưới. Bỏ cột mã riêng và thao tác «Chi tiết» lặp trong bảng School Admin. Giữ ContextLink để quay về đúng ngữ cảnh. Các cột còn lại gồm Số điện thoại phụ huynh, Tình trạng địa chỉ, Trạng thái và Thao tác. Dùng menu ba chấm cho kích hoạt/vô hiệu hóa, giữ StatusConfirmModal, quyền và xử lý liên quan.
- Dữ liệu liên hệ vẫn hiển thị theo phạm vi hiện hành. Số điện thoại ẩn trong preview chỉ là dữ liệu minh họa. Không suy ra phân tuyến từ trạng thái địa chỉ hay trạng thái học sinh.
- Giữ checkbox đầu bảng chỉ chọn trang hiện tại, bao gồm trạng thái indeterminate. Giữ tập lựa chọn qua trang và bộ lọc trong cùng trường. Khi chọn, hiển thị thanh «Đã chọn n học sinh», «Bỏ chọn» và «In thẻ (n)» ngay trên bảng. Hiện thanh khi có lựa chọn hoặc đang chuẩn bị in. Nếu bộ lọc tạm ẩn các hàng đã chọn, vẫn giữ thanh và tổng lựa chọn. Tách trạng thái theo trường như hiện tại.
- Giữ StudentCardPrinter, danh sách ID gửi sang trình in, hủy in và lỗi in. Không mở rộng quyền in, quy tắc chọn hoặc dữ liệu in.

## 4. Vị trí sửa và nghiệm thu

- File chính là web/src/app/admin/students/page.tsx, web/src/components/admin/students/student-table.tsx, student-filters.tsx và student-card-selection.tsx nếu cần tinh chỉnh thanh in. Tận dụng PageHeader, FilterToolbar, GeographyFilter, TableActions, PaginationControl và các modal hiện có. Style mới giới hạn theo màn.
- Cho filter xuống hàng ở 1440/1024/390 px theo chiều rộng nội dung, kể cả khi sidebar mở/thu. Bảng cuộn trong khung nếu cần, trang không cuộn ngang. Kiểm focus, menu và checkbox bằng bàn phím, tên/email hoặc dữ liệu dài theo các cột thực tế, nút đầu trang và khả năng đọc thông báo.
- Kiểm nút Thêm học sinh chỉ xuất hiện một lần khi trường chưa có dữ liệu, khi lọc rỗng và khi có dữ liệu. Kiểm loading/lỗi riêng, reset từng nhóm lọc, địa giới và phân trang. Kiểm chọn nhiều trang, lọc rỗng sau khi chọn, bỏ chọn, trạng thái in và nhánh SYSTEM_ADMIN ở hồ sơ trường.
- Chạy typecheck Web với npx --no-install tsc --noEmit và git diff --check. Tuân thủ chỉ thị PO về script test và Test Data Policy. Ghi phần runtime chưa xác minh, cập nhật báo cáo 13 mục và diff theo quy tắc repo.

## Prompt cho Antigravity

> Triển khai /admin/students theo docs/ai-review/students-list-redesign-plan.md sau khi PO duyệt wireframe. Đọc AGENTS.md, tài liệu nền và web/AGENTS.md. Kiểm git status và bảo toàn thay đổi đang có. Dùng r2s-students-list-wireframe.svg và r2s-students-list-preview.png bản mới nhất.
>
> Giữ duy nhất nút «Thêm học sinh» trong PageHeader góc phải, kể cả khi danh sách trống. Bỏ nút thêm trong bảng và khung rỗng. Sau khi xác nhận trường chưa có học sinh, chỉ hiện khung «Chưa có học sinh». Nếu lọc không khớp thì giữ toolbar, hiển thị «Không tìm thấy học sinh phù hợp» và một nút xóa bộ lọc. Tính cả tỉnh/thành và phường/xã, giữ chúng là hai ô chọn riêng. Tách loading và lỗi.
>
> Gộp mã dưới tên học sinh, giữ link vào chi tiết và menu ba chấm cho thao tác theo quyền. Chỉ hiện thanh in khi có lựa chọn hoặc đang chuẩn bị in. Giữ lựa chọn qua trang/bộ lọc theo schoolId, checkbox đầu bảng chọn đúng trang hiện tại và giữ luồng in hiện có. Giới hạn layout mới vào /admin/students của SCHOOL_ADMIN, bảo toàn StudentTable tại hồ sơ trường của SYSTEM_ADMIN, API, payload và modal.
>
> Nghiệm thu theo mục 4. Chạy typecheck Web và git diff --check. Giữ quy tắc PO về script test, dữ liệu, dependency, env và Git. Cập nhật báo cáo rồi dừng.
