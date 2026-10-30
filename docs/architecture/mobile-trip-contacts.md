# Liên hệ nhân sự trong thông tin chuyến xe

Cập nhật 30/10/2026. Phạm vi: Mobile, thay đổi local chưa commit/push.

## Vị trí và nguồn dữ liệu

Trang chủ phụ huynh → mở card chuyến → **Theo dõi lộ trình** → `/trip/[id]` → mở rộng thẻ phía dưới bản đồ → tab **Thông tin**.

[Màn chi tiết chuyến](<../../mobile/app/trip/[id].tsx>) giữ các thẻ phương tiện, tài xế phụ trách và giáo viên phụ xe. Hai thẻ nhân sự hiển thị vai trò, tên và một hàng điện thoại có biểu tượng, nhãn **Số điện thoại** và số có thể chọn để sao chép. Không thêm thao tác gọi điện tự động.

| Thẻ | Tên | Số điện thoại |
| --- | --- | --- |
| Tài xế phụ trách | `trip.driverName` | `trip.driverPhone` |
| Giáo viên phụ xe | `trip.busAttendantName` | `trip.busAttendantPhone` |

Các trường đã có trong `MobileTripDetail` và GET `/trips/mobile/:id` của [API client](../../mobile/services/api-client.ts). [Backend](../../api/src/trips/trips.service.ts) lấy số từ `assignedDriver.phone` và `assignedBusAttendant.phone` của chuyến thực tế; không lấy mặc định của tuyến hoặc số phụ huynh. Trước task này số đã được render dưới dạng chữ phụ; task làm rõ cách hiển thị, không thêm API/field mới.

## Bố cục và trạng thái thiếu dữ liệu

- Hàng điện thoại dùng chung các style `contactPhoneRow`, `contactPhoneLabel`, `contactPhoneValue`; màu từ theme V2.
- Cho phép xuống dòng khi màn hình hẹp hoặc chữ lớn, không dùng `numberOfLines` để cắt số. Tab giữ vùng cuộn sẵn có.
- Bỏ khoảng trắng hai đầu số khi hiển thị; null/undefined/chuỗi rỗng hoặc toàn khoảng trắng hiện **Chưa cập nhật**, không tạo số mẫu.
- Số có nhãn accessibility phân biệt tài xế/giáo viên; biểu tượng trang trí không đọc riêng.
- Không đổi chiều cao sheet thu gọn, thao tác kéo/mở tab, safe area, bản đồ, avatar, route, refresh, phân quyền hoặc API nghiệp vụ. Tab Thông tin vẫn dùng chung cho các vai trò có quyền xem chuyến.

## Kiểm chứng

Kết quả lệnh của task và giới hạn môi trường ghi tại [AI Review](../ai-review/LATEST.md). Cần kiểm tra trên Expo Go với chuyến hiện có: mở tab Thông tin, đối chiếu đúng người phụ trách và số, thử chọn/sao chép, chữ lớn và cuộn trên màn hình hẹp. Chưa nghiệm thu trên iPhone/Android thật; không tự tạo hoặc sửa số điện thoại để test.
