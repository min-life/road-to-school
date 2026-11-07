# Sử dụng các tích hợp API mới trên Web

Source API là contract cuối cùng khi tài liệu tích hợp có chỗ khác nhau. Các thao tác dưới đây không thay quyền của hai vai trò; tính khả dụng cuối cùng do backend kiểm tra.

## 1. Dời bãi xe — System Admin

Vào **Cài đặt → Bãi xe**, hoặc `/admin/settings?tab=parking`.

1. Chọn địa chỉ/tọa độ mới và ngày hiệu lực từ ngày mai trở đi.
2. Bấm **Xem tác động / Lưu địa chỉ**. Nếu chỉ đổi nhãn địa chỉ, tọa độ giữ nguyên và không có lịch đang hẹn, API cập nhật trực tiếp.
3. Khi đổi tọa độ, đọc số phương án cần tối ưu lại, số chuyến hủy từ ngày hiệu lực và số chuyến trước ngày đó giữ nguyên. Nhập lý do rồi xác nhận.
4. Vị trí hiện tại chưa đổi. Khối **Thay đổi đã hẹn** hiển thị địa chỉ mới và ngày hiệu lực; form đổi tiếp tạm khóa để tránh ghi đè lịch đang hẹn.
5. Đến ngày hiệu lực, bấm **Áp dụng vị trí mới** và xác nhận. Web chỉ báo đã áp dụng khi API trả `applied=true`.
6. Có thể **Hủy lịch thay đổi**, nhưng thao tác này không tự phục hồi các chuyến đã hủy hoặc xóa các cờ cần tối ưu lại.

Chưa thấy cron gọi hàm apply trong source hiện tại: Web không hứa tự động áp dụng và không tự gọi mutation bằng timer/render. Số chuyến hủy theo impact API; không tự tuyên bố mọi SCHEDULED đã sẵn sàng đều được giữ trong luồng dời bãi.

## 2. Phương án cần tối ưu lại — hai vai trò

Danh sách phương án và tab phương án trong chi tiết trường có nhãn **Cần tối ưu lại**. Mở chi tiết để xem lý do; bản đồ, tab Tuyến/Phân công và lựa chọn hiển thị tuyến giữ nguyên.

- **System Admin:** nếu còn lịch dời bãi chưa áp dụng, mở **Cài đặt bãi xe** để xử lý. Sau đó bấm **Kiểm tra lại → Tối ưu lại → Xác nhận tối ưu**. API dùng bãi hiện hành, giữ phân bổ học sinh/xe và cập nhật lộ trình/thời gian. Kết quả quay về **Chưa duyệt**.
- **School Admin:** thấy lý do và trạng thái chờ nhà xe, không có nút tối ưu. Sau khi nhà xe tối ưu, làm mới chi tiết, kiểm tra lộ trình/phân công và dùng thao tác duyệt hiện có khi API cho phép.

Tối ưu lại không tự duyệt và không tự sinh lại các chuyến đã hủy. Nếu API không thể tối ưu, dialog giữ lỗi; không báo thành công hoặc sửa đường trên bản đồ bằng dữ liệu giả.

## 3. Ngừng/kích hoạt và bàn giao

| Vai trò | Màn hình |
| --- | --- |
| System Admin | Phương tiện; Tài xế và chi tiết tài xế; Nhân viên trong chi tiết trường |
| School Admin | Giáo viên và chi tiết giáo viên; bảng nhân viên trường mình nếu có quyền truy cập |

Bấm **Ngừng hoạt động** để xem tác động. Có chuyến đang chạy thì nút xác nhận bị khóa. Có tuyến/chuyến cần bàn giao thì tìm và chọn người/xe thay thế; danh sách có phân trang, cùng loại/role và cùng trường đối với nhân viên. Danh sách đang hoạt động không có nghĩa chắc chắn rảnh: backend kiểm tra lịch trùng/sức chứa khi xác nhận.

Sau thành công, danh sách được tải lại. Tài nguyên ngừng hoạt động có nút **Kích hoạt**. Nếu lỗi do dữ liệu đã đổi, bấm **Kiểm tra lại**, chọn lại ứng viên và xác nhận; không tự retry mutation.

## 4. Đổi phân công chuyến và hủy phương án

- Chi tiết chuyến chỉ cho đổi khi còn SCHEDULED, đúng quyền/policy hiện hành và chưa có dấu hiệu đóng băng: đã bắt đầu, phụ xe sẵn sàng hoặc đã ghi điểm danh PRESENT/ABSENT.
- Không tải được roster hoặc thiếu trường readiness/start thì chưa mở sửa; dùng Làm mới điểm danh hoặc tải lại chi tiết.
- Form kiểm tra lại detail/roster trước khi PATCH. Nếu API trả 409, đóng form, thông báo lỗi và tải lại dữ liệu. System Admin vẫn chỉ sửa xe/tài xế; School Admin chỉ sửa phụ xe.
- Hủy phương án gửi đúng `expectedFingerprint` từ impact; nếu tác động lỗi thời thì bấm **Kiểm tra lại**. Số chuyến hủy là số chưa đóng băng API trả, không tự dựng số chuyến đóng băng bị thiếu.
- Duyệt đổi địa chỉ thất bại sẽ bỏ preview cũ; **Kiểm tra tuyến** lại trước khi duyệt tiếp. Không dùng token cũ hoặc đổi enum điểm danh.

## 5. Sự cố mới — hai vai trò

Trong **Sự cố**, bộ lọc có **Không có người đón tại điểm dừng**, **Chậm do giao thông**, **Mất tín hiệu GPS**. Bấm **Chi tiết** để xem nội dung, trạng thái và vị trí sự cố khi có tọa độ hợp lệ; không có tọa độ thì hiện **Chưa có vị trí**. Không in JSON kỹ thuật.

Web không có nút tạo cho các sự cố này vì endpoint tạo thuộc Mobile Driver/Bus Attendant. Các nút xử lý có mặt/thay thế vẫn chỉ dành cho sự cố nhân sự và vai trò được API cho phép.

## 6. Giới hạn kiểm chứng

Đã kiểm tra production build, TypeScript và unit tests độc lập; lint so sánh với HEAD không phát sinh lỗi mới. Chưa kiểm thử tương tác browser và mutation thật trên DB. Không seed/migrate hoặc tạo dữ liệu test trong đợt tích hợp này.
