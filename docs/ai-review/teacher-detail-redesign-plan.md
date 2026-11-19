# Kế hoạch thiết kế lại trang chi tiết giáo viên

## 1. Phạm vi

Áp dụng trang /admin/teachers/:id. Tham chiếu r2s-teacher-detail-wireframe.svg và r2s-teacher-detail-preview.png trong thư mục visualizations của phiên. Preview dùng dữ liệu liên hệ minh họa và thể hiện menu đang mở. Giao diện thực tế hiển thị thông tin đã được cấp quyền từ response hiện có.

Giữ shell, palette, BackLink theo returnTo, SchoolAdminGuard và GET chi tiết nhân viên theo trường. Giữ dữ liệu, phân quyền và modal hiện hành.

## 2. Bố cục

- Căn thẻ hồ sơ và thẻ liên hệ theo mép trái của nội dung. Giới hạn bề rộng để các trường vẫn dễ đọc. Giữ «Danh sách giáo viên» với ngữ cảnh quay lại.
- Thẻ hồ sơ gồm avatar chữ cái, tên giáo viên làm tiêu đề, nhãn «Giáo viên» và một badge trạng thái có chấm kèm chữ. Dùng xanh lá cho đang hoạt động và tông trung tính cho ngừng hoạt động. Bỏ dòng vai trò kỹ thuật và các trường lặp bên dưới. Khi thiếu tên trường từ dữ liệu hiện có, bỏ câu «Trường học của bạn» và giữ scope trường trong quyền truy cập.
- Thẻ «Thông tin liên hệ» đặt Email và Số điện thoại trong hai cột, dùng nhãn rõ và chữ đậm hơn. Khi thiếu dữ liệu hiển thị «Chưa cập nhật». Địa chỉ email dài có thể xuống dòng. Màn hẹp chuyển thành một cột, giữ tên, badge và menu trong vùng nhìn thấy.

## 3. Menu quản lý tài khoản

- Dùng nút chữ «Quản lý tài khoản» kèm chevron ở góc header. Menu đóng mặc định. Kiểm khả năng tái sử dụng menu hiện có với trigger chữ, giới hạn thay đổi component dùng chung nếu phải thêm option.
- «Cấp lại mật khẩu» chỉ hiện khi thỏa điều kiện hiện hành về scope trường, vai trò, tài khoản đang hoạt động và có email. Mở ResendCredentialsDialog hiện tại.
- Trạng thái hoạt động có «Ngừng hoạt động» với chữ màu cảnh báo. Trạng thái ngừng hiển thị «Kích hoạt» theo điều kiện hiện có. Mở ResourceStatusDialog và tải lại hồ sơ sau lưu thành công. Menu chỉ hiển thị khi có thao tác được phép.
- Giữ thao tác menu qua bàn phím, focus-visible và trả focus phù hợp khi đóng menu hoặc modal. Giữ trạng thái tải/lỗi và đường quay lại. Thông báo tải lỗi dùng ngôn ngữ thao tác, tránh hiển thị lỗi kỹ thuật không nhận diện.

## 4. File dự kiến và nghiệm thu

- Điểm sửa chính là web/src/app/admin/teachers/[id]/page.tsx và style riêng nếu cần. Giữ endpoint, payload, cấu hình, quyền và hành vi của hai modal quản trị. Không đưa mã vai trò hoặc UUID ra nội dung trang.
- Nghiệm thu tài khoản đang hoạt động, ngừng, thiếu email/số điện thoại, tên dài, quay lại đúng danh sách, thao tác bàn phím, desktop và màn hẹp. Kiểm menu bảo toàn đúng các trường hợp hiển thị nút và việc refresh trạng thái sau thao tác đã được phép.
- Chạy typecheck Web và git diff --check. Tuân thủ yêu cầu PO về script test và Test Data Policy. Ghi phần runtime chưa kiểm chứng và cập nhật báo cáo repo.

## Prompt cho Antigravity

> Sau khi PO duyệt wireframe, triển khai docs/ai-review/teacher-detail-redesign-plan.md. Giữ palette và shell hiện tại. Tại /admin/teachers/:id, bố trí thẻ hồ sơ có avatar chữ cái, tên, nhãn Giáo viên và một badge trạng thái. Bỏ dòng vai trò kỹ thuật và các thông tin trùng. Nhóm Email và Số điện thoại trong thẻ Thông tin liên hệ, hai cột desktop và một cột trên màn hẹp.
>
> Đưa Cấp lại mật khẩu và Ngừng hoạt động/Kích hoạt vào menu có nhãn Quản lý tài khoản. Menu đóng mặc định, giữ quyền, điều kiện hiển thị, cả hai dialog hiện có và tải lại sau khi cập nhật trạng thái. Giữ BackLink/returnTo và SchoolAdminGuard. Nghiệm thu theo mục 4. Đọc quy tắc repo, bảo toàn thay đổi đang có, chạy typecheck và diff check, tuân thủ chỉ thị PO về script test và dữ liệu, cập nhật báo cáo rồi dừng.
