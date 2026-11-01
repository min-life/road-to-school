# Liên hệ nhân sự trong thông tin chuyến xe

Cập nhật31/10/2026. Phạm vi: Mobile, thay đổi local chưa commit/push. Yêu cầu mới thay phần hiển thị số bằng nút gọi; mô tả hiển thị số/sao chép trước đây đã được thay thế.

## Vị trí và nguồn dữ liệu

Trang chủ phụ huynh → mở card chuyến → **Theo dõi lộ trình** → `/trip/[id]` → mở rộng thẻ phía dưới bản đồ → tab **Thông tin**.

[Màn chi tiết chuyến](<../../mobile/app/trip/[id].tsx>) giữ các thẻ phương tiện, tài xế phụ trách và giáo viên phụ xe. Hai thẻ nhân sự chỉ hiển thị vai trò/tên, có nút icon điện thoại bên phải. Không còn dòng số điện thoại, nhãn Số điện thoại hoặc số để sao chép trong tab này.

| Thẻ | Tên hiển thị | Số dùng để mở Điện thoại |
| --- | --- | --- |
| Tài xế phụ trách | `trip.driverName` | `trip.driverPhone` |
| Giáo viên phụ xe | `trip.busAttendantName` | `trip.busAttendantPhone` |

Các trường đã có trong `MobileTripDetail` và GET `/trips/mobile/:id` của [API client](../../mobile/services/api-client.ts). [Backend](../../api/src/trips/trips.service.ts) lấy số từ `assignedDriver.phone` và `assignedBusAttendant.phone` của chuyến thực tế; không lấy mặc định của tuyến hoặc số phụ huynh. Không thêm API/field mới hoặc chỉnh dữ liệu liên hệ.

## Component và hành vi gọi

- [TripContactCallButton](../../mobile/components/trip-contact-call-button.tsx) nhận `phone?: string | null`, `contactLabel: string`. Dùng chung cho hai thẻ, nút tròn48px nền vàng, icon call-outline; vùng nhận nhấn48×48 và tên accessibility Gọi tài xế phụ trách/Gọi giáo viên phụ xe.
- Nhấn nút có số hợp lệ: `Linking.openURL('tel:...')` bàn giao cho ứng dụng Điện thoại/hệ điều hành để phụ huynh tiếp tục gọi. Không request quyền CALL_PHONE, không ACTION_CALL hay API gọi điện, không sửa app.json/Info.plist/Android manifest. Xác nhận/ứng dụng xử lý liên kết cụ thể phụ thuộc hệ điều hành và thiết bị.
- Thiếu số/null/undefined/rỗng/toàn khoảng trắng: nút vẫn nhấn được và hiện Alert **Không có số điện thoại**, kèm vai trò chưa có số. Không tự báo lỗi khi vừa mở tab.
- Chuỗi số không hợp lệ: Alert **Số điện thoại không hợp lệ**. Nếu hệ điều hành từ chối/mở liên kết thất bại: Alert **Không thể mở bàn phím gọi điện**. Không lộ số qua log hoặc popup lỗi.
- Trong lúc bàn giao, nút hiện spinner/busy và khóa tạm; ref chống double tap. Không khóa nút chỉ vì thiếu số, vì cần phản hồi lỗi theo yêu cầu PO.
- [phoneDialUrl](../../mobile/utils/phone-link.ts) chỉ nhận chuỗi số, dấu + đầu và ký tự định dạng space/ngoặc/chấm/gạch ngang; giữ số0/+ và mã quốc gia đã được cung cấp, không tự đổi đầu số. Bỏ separator để tạo URI tel; từ chối URL có sẵn, chữ lẫn số, ký tự command/extension/query như `*`, `#`, `;`, `,`, `?`.

## Bố cục và phạm vi

Vai trò/tên vẫn bên cạnh icon person/school; text có flex1/minWidth0 và tự wrap khi hẹp, nút48 cố định không co. Xóa style contactPhoneRow/Label/Value hết dùng. Thẻ phương tiện, chiều cao/gesture sheet, scroll/safe area, bản đồ/avatar, route, refresh, phân quyền và API nghiệp vụ giữ nguyên. Tab Thông tin vẫn dùng chung cho các vai trò vốn có quyền xem chuyến.

## Kiểm chứng

Kết quả lệnh và giới hạn môi trường ghi tại [AI Review](../ai-review/LATEST.md). [Pure tests](../../mobile/scripts/phone-link.test.ts) kiểm tra chuẩn hóa URI và từ chối đầu vào không phải số; handler tests trong TEMP chỉ mock primitive platform opener/Alert, không mở Điện thoại thật, gọi API hoặc tạo User/Trip records. Typecheck/build không thay kiểm thử handset.

Cần kiểm tra Expo Go iPhone/Android với chuyến có dữ liệu hợp lệ: tab không hiện số, hai nút mở đúng số người phụ trách; thiếu số báo đúng lỗi; thiết bị thiếu ứng dụng nhận liên kết báo lỗi; tên dài vẫn wrap/cuộn. Native dialer/handoff, VoiceOver và cuộc gọi thực tế NOT_VERIFIED; agent không mở liên kết tel thật hoặc thực hiện cuộc gọi trong task.
