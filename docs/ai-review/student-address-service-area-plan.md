# Kế hoạch kiểm tra phạm vi phục vụ khi thêm học sinh

## 1. Phạm vi và nghiệp vụ

- Áp dụng modal «Thêm học sinh mới» trên /admin/students của SCHOOL_ADMIN. Dùng r2s-student-address-service-area-wireframe.svg và r2s-student-address-service-area-preview.png. Kết quả ở ngay dưới ô địa chỉ, phía trên bản đồ.
- Tự kiểm tra khi người dùng chọn gợi ý có tọa độ, ghim hoặc chỉnh vị trí trên bản đồ. Khi mới nhập chữ, autocomplete hoạt động như hiện tại và gợi ý xác định vị trí. Phạm vi chỉ tính cho tọa độ xác định.
- Đề xuất cảnh báo khi ngoài phạm vi và vẫn cho lưu hồ sơ nếu dữ liệu form hợp lệ. Giữ địa chỉ tùy chọn và điều kiện cặp địa chỉ/tọa độ hiện hành. Kiểm tra ở modal không cấp quyền xếp tuyến. Preview/confirm/chèn học sinh tiếp tục kiểm tra theo nghiệp vụ hiện có.

## 2. API đề xuất để PO duyệt

Dùng API mới cho nghiệp vụ mới. Endpoint dự kiến POST /schools/:schoolId/students/service-area-check, xử lý chỉ đọc. Dùng POST để gửi tọa độ trong body, không đưa tọa độ vào URL. Chỉ SCHOOL_ADMIN của đúng trường được gọi, kiểm quyền ở cả endpoint và service.

- Request đề xuất gồm latitude và longitude dạng số, hữu hạn, lần lượt trong [-90, 90] và [-180, 180]. Không cần ID học sinh, tên, số điện thoại hay dòng địa chỉ.
- Response đề xuất là một field status với IN_SERVICE_AREA, OUT_OF_SERVICE_AREA hoặc UNAVAILABLE. HTTP 200 cho ba kết quả nghiệp vụ, kể cả bãi chưa cấu hình hoặc cấu hình không hợp lệ. HTTP 400 cho UUID/toạ độ không hợp lệ, 401 khi chưa đăng nhập, 403 sai quyền/phạm vi, 404 nếu không tìm thấy trường hợp lệ trong phạm vi. Lỗi server theo cơ chế hiện hành và UI cho thử lại. Không trả vị trí bãi, bán kính hay địa chỉ học sinh.
- Dùng ngày Việt Nam để lấy địa giới trường và vị trí bãi trung tâm đang hiệu lực, kể cả lịch dời bãi đến ngày áp dụng và chưa đối soát. Tái sử dụng effectiveSchool, dữ liệu PARKING_LOT và phép đo Haversine metresBetween. Có thể tái sử dụng SystemSettingsService.getParkingLot hoặc phần đọc tương đương có cùng quy tắc. Chỉ đọc dữ liệu cho endpoint kiểm tra.
- Ngoài phạm vi nếu khoảng cách lớn hơn bán kính hoặc hai tỉnh/thành đã xác định khác nhau. Điểm đúng biên được chấp nhận theo điều kiện bán kính. Dùng nguồn VietMap phía server để xác định tỉnh của tọa độ khi cần. Khi thiếu tỉnh một bên, vẫn quyết định theo bán kính như nghiệp vụ hiện có. Có thể kết luận ngoài phạm vi theo bán kính trước để tránh reverse geocode thừa. Không lọc theo phường/xã.
- Không tạo học sinh, cập nhật bãi, đối soát lịch, ghi dữ liệu hoặc trả metadata hạ tầng từ endpoint. Giữ API tạo và payload multipart cũ. Sửa Swagger và hướng dẫn tích hợp FE cho endpoint sau khi duyệt contract.

Endpoint, tên field, enum và mã trả về ở trên là đề xuất để PO xác nhận trước khi triển khai.

## 3. Web Admin

| Trạng thái | Phản hồi |
|---|---|
| Chưa nhập địa chỉ | Chưa hiện kết quả phạm vi. |
| Có chữ, chưa xác định tọa độ | «Chọn vị trí từ gợi ý hoặc trên bản đồ.» |
| Đang kiểm tra tọa độ mới | «Đang kiểm tra phạm vi». |
| Trong phạm vi | «Trong phạm vi phục vụ». |
| Ngoài phạm vi | «Ngoài phạm vi phục vụ. Có thể lưu hồ sơ. Điểm đón này chưa đủ điều kiện lập tuyến.» |
| Thiếu cấu hình hoặc lỗi gọi | «Chưa thể kiểm tra phạm vi» và «Thử lại» cho tọa độ hiện tại. |

- Quy về một luồng cập nhật tọa độ hợp lệ sau khi chọn gợi ý hoặc kết thúc thao tác ghim/kéo. Khi gõ sửa địa chỉ thủ công hoặc xóa địa chỉ, loại bỏ tọa độ cũ và kết quả cũ. Phân biệt chỉnh tay với cập nhật chữ tương ứng do reverse geocode để không vô tình xóa vị trí vừa ghim.
- Gắn kết quả và lỗi với schoolId cùng tọa độ/version hiện tại. Bỏ phản hồi đến muộn của autocomplete, place detail, reverse geocode hoặc API kiểm phạm vi nếu người dùng đã đổi điểm. Hủy hoặc bỏ qua request khi đóng modal/đổi scope. Tránh gọi trùng khi tọa độ không đổi. Nút thử lại kiểm đúng vị trí hiện tại.
- Hiện kết quả bằng chữ và màu, thông báo trạng thái qua vùng aria-live phù hợp. CTA tạo giữ điều kiện hiện hành, gồm việc chỉ gửi địa chỉ kèm tọa độ đã xác định. Kết quả kiểm phạm vi không thêm dữ liệu vào payload tạo hồ sơ.

## 4. File dự kiến và nghiệm thu

- API: students.controller.ts, students.service.ts, DTO dưới api/src/students; dùng các helper có sẵn của trường, bãi, địa giới và khoảng cách. Web: add-student-modal.tsx và api-client.ts, chỉ sửa VietMapPicker nếu cần giữ liên kết giữa reverse geocode và tọa độ, bảo toàn các caller khác. Cập nhật docs/FE_INTEGRATION_GUIDE.md.
- Kiểm chọn gợi ý, ghim/kéo, nhập/xóa chữ, sửa điểm A sang B nhanh rồi A trả về sau, đóng/reopen modal và retry điểm mới. Kiểm địa chỉ tùy chọn, giữ khả năng tạo hồ sơ hợp lệ, điểm đúng biên/ngoài biên, khác tỉnh, thiếu tỉnh, chưa có cấu hình bãi và đổi bãi tới ngày hiệu lực. Kiểm scope sai trường và dữ liệu không hợp lệ.
- Kiểm trạng thái trong modal trên desktop và màn hẹp. Chạy typecheck Web/API và git diff --check. Kiểm Swagger local. Tuân thủ chỉ thị PO tuyệt đối không chạy script test, không tạo dữ liệu kiểm thử hoặc sửa env. Ghi phần runtime chưa xác minh.

## Prompt cho Antigravity

> Sau khi PO duyệt wireframe và contract đề xuất ở mục 2, triển khai docs/ai-review/student-address-service-area-plan.md. Đọc AGENTS.md, các tài liệu nền và web/AGENTS.md, kiểm git status và bảo toàn thay đổi đang có.
>
> Thêm API kiểm phạm vi chỉ đọc cho SCHOOL_ADMIN đúng trường, nhận tọa độ và trả trạng thái tối thiểu như contract đã duyệt. Dùng bãi và địa giới trường theo ngày hiệu lực Việt Nam, bán kính Haversine, so tỉnh/thành khi đủ dữ liệu. Giữ payload API tạo học sinh, quy tắc xếp tuyến và schema hiện hành.
>
> Trong AddStudentModal, tự kiểm khi chọn gợi ý hoặc ghim/chỉnh tọa độ. Hiện kết quả dưới ô địa chỉ, bỏ kết quả cũ khi đổi nội dung/vị trí và tránh phản hồi đến muộn. Có trạng thái đang kiểm, trong/ngoài phạm vi và chưa thể kiểm kèm thử lại. Ngoài phạm vi cảnh báo, vẫn lưu hồ sơ nếu các điều kiện hiện hành đạt.
>
> Cập nhật Swagger và tài liệu FE. Nghiệm thu theo mục 4, chạy typecheck API/Web và git diff --check. Tuyệt đối không chạy script test. Giữ chỉ thị PO về dữ liệu, env và Git. Cập nhật báo cáo rồi dừng.
