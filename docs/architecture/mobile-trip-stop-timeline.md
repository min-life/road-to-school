# Theo dõi lộ trình — timeline dọc Điểm đón

Cập nhật01/11/2026, Mobile V2, local chưa commit/push.

## Vị trí và phạm vi

Trang chủ phụ huynh → mở card chuyến → Theo dõi lộ trình → `/trip/[id]` → tab **Điểm đón**. Implementation tại [MobileTripDetailScreen](<../../mobile/app/trip/[id].tsx>), nhánh `activeTab === 'STOPS'` dùng chung cho các vai trò vốn có quyền xem chuyến; không thay quyền hoặc hiển thị dữ liệu riêng của vai trò khác.

Chỉ thay cách trình bày danh sách thành timeline dọc. Bản đồ, marker/avatar, GPS/navigation, sheet gestures, tab Thông tin/gọi điện, Điểm danh/Sự cố và hành vi vận hành không đổi. Không thêm endpoint/schema/dependency hoặc record test.

## Bố cục và màu

```text
(Số thứ tự)   [Tên bãi / trường / học sinh     Giờ dự kiến]
     │        [Địa chỉ đầy đủ]
     │        [Tag điểm danh/lý do vắng nếu có quyền]
(Số tiếp)     [Thông tin điểm tiếp theo ...]
     │
(Số cuối)     [Thông tin điểm cuối ...]
```

- Rail trái26px, vòng số26/bo13 nền xanh `#2563EB`, chữ trắng như trước; card phải flex/minWidth0. Giữ stop.stopOrder từ API, không tự đổi số hoặc sắp xếp lại.
- Connector2px màu border hiện có `#E2E8F0`, chỉ giữa các điểm; không có đuôi sau điểm cuối và không connector nếu chỉ có một điểm. Không thể hiện vị trí bus/GPS/tiến độ đã hoàn thành bằng đường này.
- Card vẫn nền `#F8FAFC`, viền `#E2E8F0`, bo12/padding12. Tên navy `#0F172A`, giờ xanh `#2563EB`, địa chỉ xám `#64748B`; tag giữ toàn bộ màu/icon/text xanh lá/đỏ/hổ phách và nền trắng.
- Row cách16px; rail tự stretch theo chiều cao card. Connector top42/bottom-24 tương ứng marker26/top12, row gap16 và khoảng hở4px với vòng kế tiếp, không giả định chiều cao nội dung. Khi đổi kích thước marker/gap phải đồng bộ geometry này.
- Header tên/giờ wrap khi hẹp, giờ maxWidth100%; bỏ giới hạn1dòng tên và2dòng địa chỉ để không mất thông tin. Lý do/tag dài có maxWidth100% và text co/wrap. Không cố định chiều cao card hoặc thêm thao tác giả.

## Dữ liệu và bảo toàn nghiệp vụ

`visibleStops` vẫn xuất phát từ `trip.stops`, cập nhật attendanceStatus/absenceReason/attendanceMarkedAt từ operationalState.children khi có. Không thêm sort/filter hoặc dựa vào index để đổi thứ tự. Backend [MobileTripDetailStop](../../mobile/services/api-client.ts) và privacy masking giữ nguyên.

| Nội dung | Mapping giữ nguyên |
| --- | --- |
| Mốc số | stop.stopOrder; key stop.id hoặc idx như trước |
| Bãi xe | PARKING_START/PARKING_END → Bãi xe trung tâm |
| Trường học | SCHOOL_ARRIVAL/SCHOOL_DEPARTURE → trip.schoolName |
| Học sinh | stop.studentName hoặc Điểm đón học sinh; tên đã ẩn danh vẫn dùng nguyên dữ liệu API |
| Giờ/địa chỉ | plannedArrivalTime nếu có; addressText đầy đủ |
| Tag riêng của con | Chỉ isParent && stop.isMyChild |
| PRESENT | isAlighted → Đã xuống xe an toàn; còn lại Đã có mặt trên xe |
| ABSENT | Vắng mặt + absenceReason hoặc Không có lý do |
| Trạng thái còn lại | Chưa điểm danh |
| Không có điểm | Giữ Không có điểm dừng |

Không lấy avatar/tên con từ nguồn mới, không lộ PII của học sinh khác, không thêm alighting/attendance enum hoặc API. Phần điều kiện tag giữ nguyên JSX; staff không được thêm tag riêng của phụ huynh. Timeline dùng cho cả chiều đi/về theo thứ tự server, không tự đảo tuyến.

## Responsive, cuộn và mở rộng

ScrollView của tab và vùng sheet hiện có tiếp tục sở hữu cuộn; không thêm list lồng, input, autofocus, animation hoặc keyboard inset. Row không có onPress vì điểm dừng trước đó không có hành động nhấn. Khi bổ sung nội dung sau này, giữ card linh hoạt và node/connector ở rail riêng, không gán trạng thái hành trình giả từ màu đường nối.

## Kiểm chứng và giới hạn

Typecheck/export all; kiểm tra source ngoài STOPS JSX và các style liên quan không đổi. Giữ nguyên JSX tag và tất cả style không liên quan. Chromium IAB preview dùng actual JSX/style và4điểm từ SELECT read-only local (bãi/trường/con đang liên kết), không fake business records/API response;320×568/390×844/844×390/1440×900 không tràn ngang,3connector cho4điểm, rail theo chiều cao card, màn ngang cuộn được.

Preview dùng raw route_stops/attendance/school fields hiện có, không dựng phiên API/route snapshot/resolved-route; stopOrder raw có thể khác phép đánh lại số của backend. Không xem preview như kiểm chứng data/permission của phiên đăng nhập. Thiếu dữ liệu hiển thị lý do vắng dài/PRESENT/alighted trong snapshot thì không tạo hoặc sửa records để test. Native Expo Go iPhone/Android, sheet gestures, VoiceOver/font scale và các trạng thái dữ liệu khác còn NOT_VERIFIED. Chi tiết lệnh, ảnh và giới hạn tại [AI Review](../ai-review/LATEST.md).
