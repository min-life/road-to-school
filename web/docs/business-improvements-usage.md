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

Đã kiểm tra production build, TypeScript và unit tests độc lập; lint so sánh với HEAD không phát sinh lỗi mới. Đã kiểm tra một số tương tác browser read-only; chưa gửi mutation nghiệp vụ trên DB. Không seed/migrate hoặc tạo dữ liệu test trong đợt tích hợp này.


## Đồng bộ sau main 07/11/2026

### Trường học và học sinh
- **Trường học → thêm quản trị trường**: nhập đủ họ tên, email và số điện thoại. Nếu gửi email thất bại, tài khoản vẫn đã tạo; không tạo lại cùng tài khoản.
- **Danh sách trường/học sinh**: dùng Tỉnh/thành và Phường/xã để lọc. Danh sách địa giới chỉ gồm dữ liệu có trong phạm vi được phép; trường/học sinh cũ chưa có ID địa giới vẫn xuất hiện khi bỏ lọc.
- **Lập tuyến → Học sinh**: lọc địa giới không bỏ học sinh đã chọn. “Chọn đang hiển thị / Bỏ chọn đang hiển thị” chỉ áp dụng kết quả đang xem. Marker vẫn giữ các học sinh đã chọn ngoài bộ lọc.
- **Phân công**: danh sách tài xế/phụ xe xét đúng nhóm xe đang sửa. “Không khả dụng” là kết quả từ API, không thể ép chọn.

### Tổng quan và phương án
- “Chuyến cần chốt hành chính” mở tab **Cần xử lý hành chính**, giữ trường đang lọc.
- “Phương án cần tối ưu lại” mở danh sách đúng bộ lọc; dùng nút “Cần tối ưu lại ×” để bỏ lọc.
- Preview nguồn đã đổi/hết hạn: về cấu hình và tối ưu lại, không bấm lưu lại token cũ.
- **Ngày phục vụ đầu tiên** đọc từ API sau duyệt. Đây là ngày đủ điều kiện đầu tiên, không xác nhận đã tạo chuyến.
- Hủy phương án/duyệt đổi địa chỉ vẫn có kiểm tra dữ liệu cũ bằng fingerprint; thấy xung đột thì xem lại tác động/định tuyến trước khi xác nhận.

### Cài đặt bãi
- Chưa cấu hình: chọn địa chỉ và tọa độ, nhập bán kính >0 và <=500 km, bấm **Lưu cấu hình bãi**. Tâm map không phải tọa độ bãi đã chọn.
- Đã cấu hình: đổi tọa độ cần xem tác động và ngày hiệu lực từ ngày mai. Đặt lịch chưa hủy chuyến; đến hạn API mới đối soát. Hủy lịch trước hạn giữ các chuyến hiện tại.
- Bán kính lấy từ cấu hình hiện hành; lần đầu API mặc định 50 km.

### Kết thúc sự cố
- **Sự cố → Chi tiết → Kết thúc sự cố** áp dụng cho Không có người đón / Chậm do giao thông / Mất tín hiệu GPS.
- Nhập lý do và xác nhận. “Đóng cửa sổ” chỉ đóng giao diện.
- Cả hai admin được thao tác trong scope của mình; trạng thái đã kết thúc không có nút.
- “Vị trí cuối ghi nhận” có thể là điểm cũ khi mất GPS; không hiểu là vị trí xe hiện tại.

### Chi tiết chuyến
- **Hủy chuyến do học sinh vắng**: hai admin đúng scope, chỉ chiều về đang chờ chạy, phụ xe đã Ready, roster không rỗng và toàn bộ học sinh vắng có lý do.
- **Mở lại chuyến**: chỉ nhà xe, chuyến đã hủy nhưng chưa vận hành và chưa tới giờ xuất phát. Nhập lý do; có thể mở “Đổi nguồn lực” để chọn khác, hoặc giữ phân công cũ. Danh sách nguồn lực không giữ chỗ; API kiểm lại lịch/sức chứa khi lưu.
- Mở lại giữ mã chuyến, dùng lịch/roster hiện hành, giữ báo nghỉ còn hiệu lực và yêu cầu phụ xe Ready lại.
- **Chi tiết → Lịch sử xử lý**: xem mở lại/hủy toàn vắng/đính chính từ API. Admin chỉ xem correction; việc điểm danh/đính chính thuộc phụ xe.
- Form báo dữ liệu đổi/không đủ điều kiện: kiểm tra lại thông tin rồi mới thử lại; không có tự gửi lại mutation.

Kiểm chứng 07/11/2026: build/typecheck PASS, 16 tests PASS; lint đối chiếu HEAD không phát sinh lỗi mới (50 lỗi có sẵn trong các file liên quan). Playwright read-only với System Admin xác nhận link chốt hành chính, bộ lọc cần tối ưu lại, bộ lọc địa giới rỗng, ba trường bắt buộc khi tạo quản trị trường, form kết thúc sự cố và roster chuyến. Desktop 1440×900 và mobile 390×844 không tràn ngang ở các màn đã đo; footer form kết thúc sự cố nằm trong viewport. Không gửi mutation nghiệp vụ.

Còn NOT_VERIFIED: tương tác đăng nhập School Admin, mutation thành công/xung đột, provider/cron, bộ lọc địa giới có lựa chọn (dữ liệu hiện có thiếu ID), preparation/candidate khi bãi chưa được cấu hình. Không tự cấu hình bãi hoặc seed để vượt qua điều kiện API.

## School Admin: tài khoản, học sinh và phân công (07/11/2026)

- **Giáo viên → Chi tiết hoặc ⋯ → Cấp lại mật khẩu:** kiểm tra email rồi xác nhận. Mật khẩu cũ được thay; nếu FAILED, tài khoản đã thay mật khẩu nhưng email chưa gửi được. Không tạo giáo viên lần nữa; cấp lại sau khi xử lý việc gửi email. CONSOLE chỉ là bàn giao ở môi trường phát triển.
- **Học sinh → Chi tiết:** lỗi tải tuyến/lịch sử có Thử lại, không đồng nghĩa chưa phân tuyến. Lịch sử thu hồi liên kết chỉ hiện khi API có audit hợp lệ, không thay danh sách phụ huynh hiện hành.
- **Đổi địa chỉ:** học sinh chưa có phương án DRAFT/ACTIVE mới đổi trực tiếp. Gõ địa chỉ phải chọn/xác nhận lại vị trí; không lấy tâm bản đồ làm tọa độ học sinh. Nếu có tuyến, cần nhà xe xử lý lộ trình.
- **Ngừng học sinh:** phải tải được tác động trước khi xác nhận; gặp lỗi dùng Thử lại. **Yêu cầu địa chỉ:** Phê duyệt khóa khi chưa xác minh hoặc đang có tuyến; Từ chối giữ quyền hiện hành.
- **Chuyến → Đổi phụ xe:** tìm giáo viên và chuyển trang; người đã chọn được giữ. Backend kiểm tra lịch/điều kiện cuối cùng.
- **Báo nghỉ/Sự cố:** sau lỗi 400/409 danh sách được cập nhật; chọn lại nhân sự rồi xác nhận nếu vẫn đủ điều kiện. Không tự gửi lại thao tác.

Chưa có GET liên kết phụ huynh cho admin nên chưa bổ sung danh sách và thu hồi liên kết từ đó. Không thay API hoặc quyền các vai trò.

## System Admin: cấp lại mật khẩu nhân sự (07/11/2026)

- **Tài xế → ⋯ → Cấp lại mật khẩu**, hoặc mở **Chi tiết tài xế → Cấp lại mật khẩu**.
- **Trường học → Chi tiết trường → Nhân viên trường → Cấp lại mật khẩu** trên dòng Quản trị trường. Nhà xe không cấp lại cho Giáo viên phụ xe.
- Chỉ hiện cho tài khoản đang hoạt động và có email. Dialog cho kiểm tra người nhận trước khi xác nhận; không hiển thị mật khẩu trên Web.
- SENT: đã cấp và gửi email. CONSOLE: bàn giao tại console API môi trường phát triển. FAILED: mật khẩu đã thay nhưng email chưa gửi được; giữ dialog và thông báo, không tạo lại tài khoản. Xác nhận cấp lại lần nữa sẽ sinh mật khẩu khác.
- Trong lúc gửi, khóa nút và thao tác đóng để tránh gửi lặp. API kiểm quyền/trạng thái/xung đột cuối cùng; lỗi không báo thành công. Không thu hồi phiên đang chạy khi cấp lại (hành vi API hiện hành).
