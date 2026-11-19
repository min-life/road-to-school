# Kế hoạch thiết kế lại modal tạo tài khoản nhân sự trường

## 1. Mục tiêu và phạm vi

Áp dụng cho modal tạo quản trị trường trong tab Nhân viên trường và modal tạo giáo viên ở trang Giáo viên. Dùng wireframe r2s-school-personnel-account-wireframe.svg và preview r2s-school-personnel-account-preview.png trong thư mục visualizations của phiên. Phần minh họa thông báo bên dưới hai modal là phản hồi sau khi gửi form.

Chỉ thay đổi bố cục và nội dung Web ở hai luồng tạo. Giữ API, payload, vai trò, phân quyền, cách cấp mật khẩu, kênh bàn giao, validation và điều kiện gọi cấp lại mật khẩu.

## 2. Bố cục và nội dung

- Dùng cùng mẫu modal, tiêu đề «Tạo tài khoản quản trị trường» hoặc «Tạo tài khoản giáo viên». Giữ tên trường trong modal quản trị để xác nhận đúng trường. Modal giáo viên bỏ mô tả nhiệm vụ chung.
- Giữ ba ô bắt buộc theo thứ tự Họ và tên, Email, Số điện thoại. Đặt «Nhập email của người nhận tài khoản.» ngay dưới Email. Dùng nhãn và trạng thái bắt buộc rõ ràng. Bỏ tooltip lặp ý và banner giải thích cách gán vai trò hoặc sinh mật khẩu.
- Footer có «Hủy» và CTA vàng «Tạo tài khoản», với trạng thái «Đang tạo…». Giữ dữ liệu nhập khi lỗi, ngăn gửi lặp khi đang xử lý. Sử dụng thành phần dialog và input hiện có. Đảm bảo nút đóng có tên truy cập, focus không rơi ra nền và quay về nút mở khi đóng. Trên màn hẹp, thân modal cuộn được khi cần.

## 3. Phản hồi người dùng

| Kết quả tạo | Nội dung Web |
|---|---|
| SENT | «Đã tạo tài khoản. Nhắc người nhận kiểm tra email để đăng nhập.» |
| FAILED | «Đã tạo tài khoản, email chưa gửi được. Dùng “Cấp lại mật khẩu” để gửi lại.» Tải lại danh sách để người dùng thao tác trên tài khoản đã tạo. |
| CONSOLE | «Đã tạo tài khoản. Thông tin đăng nhập chưa được gửi qua email.» |
| Response cũ thiếu trạng thái | «Đã tạo tài khoản.» |
| Yêu cầu tạo bị từ chối | Hiển thị lỗi nhập liệu cạnh trường nếu xác định được. Với lỗi không phân loại được, dùng «Không thể tạo tài khoản. Vui lòng thử lại.» và giữ dữ liệu nhập. |

Dùng trạng thái từ response để chọn nội dung. Nội dung hiển thị chỉ nêu kết quả và việc người dùng làm tiếp. Bỏ mã role, cơ chế sinh mật khẩu, console/chế độ email và thông tin hạ tầng khỏi hai luồng. Giữ các lỗi nghiệp vụ an toàn đã biết, tránh hiển thị trực tiếp chuỗi lỗi lạ từ API hoặc thông tin nhạy cảm. Giữ logging và cấu hình theo triển khai hiện hành.

## 4. Vị trí sửa và nghiệm thu

- Các file dự kiến là create-school-admin-modal.tsx, school-employees-tab.tsx trong chi tiết trường, add-teacher-modal.tsx và page.tsx của trang Giáo viên. Tái sử dụng lời nhắn chung nếu phù hợp và giữ nguyên các luồng cấp lại hoặc tạo tài xế ngoài phạm vi.
- Kiểm hai modal trên desktop và màn hẹp, nhãn bắt buộc, focus bàn phím, email/số điện thoại sai định dạng, tải và lỗi. Kiểm SENT, FAILED, CONSOLE và response cũ, bảo đảm thông báo không khẳng định email đã gửi khi chưa có trạng thái tương ứng và tài khoản tạo thành công vẫn được làm mới trên danh sách.
- Chạy typecheck Web và git diff --check. Tuân thủ chỉ thị PO về test scripts và Test Data Policy. Ghi phần runtime chưa kiểm chứng, cập nhật báo cáo và diff repo.

## Prompt cho Antigravity

> Triển khai hai modal theo docs/ai-review/school-personnel-account-modal-redesign-plan.md sau khi duyệt wireframe. Dùng cùng kiểu modal và giữ họ tên, email, số điện thoại bắt buộc. Giữ ngữ cảnh trường trong modal quản trị. Bỏ banner gán vai trò/sinh mật khẩu và đưa gợi ý địa chỉ email ngay dưới ô Email.
>
> Chuẩn hóa thông báo tạo tài khoản theo bảng mục 3. Phân biệt tài khoản tạo thành công với kết quả gửi email. FAILED hướng đến «Cấp lại mật khẩu» trên tài khoản đã tạo. CONSOLE dùng thông báo email chưa gửi mà không nêu chế độ vận hành. Lỗi không phân loại dùng lời nhắn an toàn. Giữ owner role, API, payload, xử lý bàn giao và tải lại danh sách hiện có.
>
> Đọc quy tắc repo, kiểm git status, bảo toàn việc đang làm. Chỉ sửa Web của hai luồng tạo. Kiểm typecheck, diff, bàn phím, màn hẹp, trạng thái gửi/lỗi và response cũ. Giữ chỉ thị PO về script test và dữ liệu. Cập nhật báo cáo rồi dừng.
