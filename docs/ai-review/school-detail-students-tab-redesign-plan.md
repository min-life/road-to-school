# Kế hoạch thiết kế lại tab Học sinh trong hồ sơ trường

## 1. Phạm vi

Áp dụng tab Học sinh tại /admin/schools/:id?tab=students của SYSTEM_ADMIN. Dùng r2s-school-detail-students-tab-wireframe.svg và r2s-school-detail-students-tab-preview.png trong thư mục visualizations của phiên. Các tiêu đề trạng thái ngoài thẻ trong preview là chú thích của bản vẽ.

Giới hạn thay đổi vào nhánh readOnly hiện tại của StudentTable tại hồ sơ trường. Giữ header hồ sơ, điều hướng tab và trang /admin/students của SCHOOL_ADMIN, gồm luồng thêm, in thẻ, nhập/xuất đang có. Dùng API, payload và quyền hiện hành.

## 2. Bộ lọc và trạng thái kết quả

- Dùng một thẻ chung cho bộ lọc và kết quả. Giữ tìm kiếm theo tên/mã, Trạng thái, Tình trạng địa chỉ, Phân tuyến, Tỉnh/thành và Phường/xã. Hai ô địa giới đặt riêng. Giữ logic lọc kết hợp, dữ liệu theo đúng trường, đổi tỉnh cập nhật danh sách phường, liên kết có query và reset về trang 1.
- Dùng viền/nền nhẹ trên ô đang áp dụng điều kiện. Giá trị đã chọn luôn đọc được bằng chữ và focus bàn phím có kiểu riêng. Đặt duy nhất nút «Xóa bộ lọc» ngay trong toolbar khi có điều kiện, ở cùng vị trí dù có kết quả hay rỗng. Tận dụng handleResetFilters. Khi nút xóa biến mất sau reset bằng bàn phím, đưa focus về ô tìm kiếm.
- Sau phản hồi thành công có bộ lọc và totalItems bằng 0, giữ toolbar và hiện thông báo gọn «Không tìm thấy học sinh phù hợp» ngay bên dưới. Không render tiêu đề, bảng hoặc phân trang ở trạng thái này. Khi phản hồi thành công ở bộ lọc mặc định, trang đầu và totalItems bằng 0, dùng thông báo «Trường chưa có học sinh». Nếu trang hiện tại nằm ngoài phạm vi khi dữ liệu thay đổi, dùng logic đưa về trang hợp lệ.
- Tách trạng thái tải và lỗi khỏi rỗng, giữ thao tác Thử lại. Chỉ dùng kết quả request mới nhất trong scope trường/bộ lọc. Khi đổi điều kiện rồi tải lại, tránh hiển thị thông báo rỗng theo kết quả cũ. Màn hẹp cho các ô lọc xuống hàng và chỉ cuộn ngang trong vùng bảng khi cần.

## 3. Bảng có dữ liệu và thao tác

- Dùng năm cột «Học sinh», «SĐT phụ huynh», «Tình trạng địa chỉ», «Trạng thái» và «Thao tác». Gộp mã dưới tên, giữ avatar hiện có. Tên học sinh là ContextLink tới chi tiết trong đúng hồ sơ trường và giữ ngữ cảnh quay lại. Bỏ cột mã riêng và nút Chi tiết lặp.
- Giữ hiển thị số điện thoại và trạng thái theo quyền. Số điện thoại che trong preview chỉ là dữ liệu minh họa. Giữ PaginationControl, số lượng khớp truy vấn, giới hạn dòng và thứ tự theo nguồn dữ liệu.
- Giữ «Thêm vào tuyến» trên dòng đúng điều kiện hiện hành: SYSTEM_ADMIN, học sinh Khả dụng, có địa chỉ và kết quả hasActiveMembership đã xác nhận là false. Nếu membership đang tải hoặc lấy lỗi, chưa hiện nút. Dùng InsertStudentModal, quyền, API preview/confirm và các kiểm tra hiện hành. Không dùng badge Khả dụng, địa chỉ hoặc bộ lọc để suy ra đủ điều kiện chèn.
- Giữ thao tác trong scope quản trị nhà xe. Không thêm quyền tạo, chọn để in, đổi trạng thái học sinh hoặc import/export vào tab hồ sơ trường.

## 4. File dự kiến và nghiệm thu

- File chính là web/src/components/admin/students/student-table.tsx và student-table.css. Có thể điều chỉnh student-filters.tsx nếu cần để biểu thị filter active theo biến thể hồ sơ trường. Chỉ sửa caller web/src/app/admin/schools/[id]/page.tsx nếu cần truyền biến thể UI. Tái sử dụng FilterToolbar, GeographyFilter, ContextLink, TableActions và PaginationControl.
- Kiểm bộ lọc trong ảnh gồm Đã vô hiệu hóa, Chưa có địa chỉ và Chưa có tuyến. Kiểm reset từ trạng thái rỗng/có kết quả, chỉ lọc tỉnh/phường, liên kết vào tab có query, thay đổi bộ lọc nhanh, đổi trang, trường chưa có học sinh, loading và lỗi.
- Kiểm tên mở đúng chi tiết và quay lại đúng trường/tab. Đối chiếu học sinh có thể chèn, đã có tuyến, chưa có địa chỉ, vô hiệu hóa, lỗi kiểm membership. Kiểm lại /admin/students của SCHOOL_ADMIN với các chức năng riêng hiện có.
- Kiểm bố cục 1440/1024/390 px, sidebar mở/thu, tên và địa giới dài, bàn phím và focus. Chạy npx --no-install tsc --noEmit trong web và git diff --check. Tuyệt đối không chạy script test. Tuân thủ Test Data Policy. Báo phần runtime chưa xác minh, cập nhật báo cáo và diff theo quy tắc repo.

## Prompt cho Antigravity

> Triển khai tab Học sinh trong hồ sơ trường theo docs/ai-review/school-detail-students-tab-redesign-plan.md sau khi PO duyệt wireframe. Đọc AGENTS.md và web/AGENTS.md, kiểm tra git status và bảo toàn thay đổi đang có. Dùng r2s-school-detail-students-tab-wireframe.svg và r2s-school-detail-students-tab-preview.png làm tham chiếu.
>
> Chỉnh nhánh readOnly của StudentTable trong hồ sơ trường. Giữ đủ bộ lọc, tách Tỉnh/thành và Phường/xã, làm rõ ô đang lọc và đặt một nút Xóa bộ lọc trong toolbar. Khi lọc không ra kết quả, giữ toolbar và hiện thông báo gọn thay cho bảng rỗng. Tách trạng thái trường chưa có học sinh, đang tải và lỗi. Giữ query, ngữ cảnh trường, phân trang và xử lý request cũ.
>
> Gộp mã dưới tên học sinh. Dùng ContextLink từ tên để vào chi tiết và bỏ nút Chi tiết lặp. Giữ Thêm vào tuyến theo đúng điều kiện hiện hành, dùng modal và API cũ. Giới hạn layout mới vào hồ sơ trường của SYSTEM_ADMIN, bảo toàn /admin/students của SCHOOL_ADMIN và contract hiện có.
>
> Nghiệm thu theo mục 4, chạy typecheck Web và git diff --check, tuyệt đối không chạy script test. Giữ chỉ thị PO về dữ liệu, env, dependency và Git. Cập nhật báo cáo rồi dừng.
