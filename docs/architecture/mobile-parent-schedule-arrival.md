# Lịch học & Xe đưa đón — giờ đến dự kiến

Cập nhật01/11/2026, Mobile PARENT, local chưa commit/push.

## Vị trí và bố cục

[parent/schedule.tsx](../../mobile/app/parent/schedule.tsx) thêm [ScheduleArrivalTime](../../mobile/components/parent/schedule-arrival-time.tsx) bên dưới tên tuyến/trường, phía trên footer xe/thao tác. Giữ nguyên badge khung giờ bắt đầu–kết thúc, chiều, trạng thái, biển số/hãng xe, Báo nghỉ và Xem lộ trình; không thay bộ chọn tuần/ngày, Hôm nay, tải lại, refresh hoặc trạng thái empty/error của lịch.

```text
[Giờ bắt đầu – kết thúc] [Chiều] [Trạng thái]
Tên tuyến / Trường
[Cờ] Đến trường / Đến điểm trả dự kiến     HH:mm
[Biển số, hãng xe]
[Báo nghỉ]                        [Xem lộ trình]
```

Dòng mới nền kem theo theme/bo10, label xám/icon vàng nâu, giờ navy đậm; flexWrap/minWidth0, không cắt text hoặc cố định chiều cao. Lỗi giờ đến không làm mất nội dung/thao tác còn lại. Không thêm input, bàn phím, animation hoặc thư viện.

## Nguồn dữ liệu và ý nghĩa

| Trường hợp | Nguồn giờ hiển thị |
| --- | --- |
| TO_SCHOOL, chuyến thật hoặc virtual | scheduledEndTime của item lịch → Đến trường dự kiến |
| TO_PARKING, chuyến thật | GET chi tiết chuyến hiện có, stopType=DROPOFF, studentId đúng con và isMyChild=true → plannedArrivalTime → Đến điểm trả dự kiến |
| TO_PARKING, virtual/chưa tạo | Chưa có giờ dự kiến; không gọi detail với ID virtual |
| Thiếu stop/giờ hoặc giờ không hợp lệ | Chưa có giờ dự kiến |
| Đang đọc chi tiết | Spinner và Đang tải... |
| Lỗi GET | Chưa tải được + nút retry có accessibilityLabel |

API lịch [MobileScheduleItem](../../mobile/services/api-client.ts) chỉ có scheduledStartTime/scheduledEndTime. Theo [getParentStudentSchedule](../../api/src/trips/trips.service.ts), giờ kết thúc chiều đi là mốc trường; chiều về là hết tuyến về bãi. Không dùng giờ về bãi làm giờ trả con và không tính ETA/GPS/duration giả. Không dùng route mặc định hoặc plannedArrivalTime tuyến hiện tại cho ngày virtual vì chưa có snapshot theo ngày/điểm trả trong payload lịch.

Component dùng journeyClock đã có trong [parent-journey.ts](../../mobile/utils/parent-journey.ts) để kiểm tra/format HH:mm; không sửa helper này hoặc thời gian API. Đây là **giờ theo lịch**, không phải ETA trực tiếp hay giờ đến thực tế.

## Component, refresh và quyền

`ScheduleArrivalTime({ trip: MobileScheduleItem, studentId: string, identity: string })`. identity nhận scope của màn lịch gồm actor/role/con/tuần. Chiều đi và virtual render row tĩnh, không tạo refresh loop/GET mới. Nhánh ReturnArrivalTime chỉ mount cho chiều về thật của ngày đang hiển thị; không gọi detail cho toàn bộ tuần.

Nhánh thật dùng GET getMobileTripDetail và useActiveRefresh12s hiện có: focus/app foreground mới chạy, cleanup scope hủy kết quả cũ, coalesce retry và không chồng request. Key chứa identity/con/trip/route/direction/start/end để reset khi ngữ cảnh hoặc lịch đổi. Kiểm tra detail.id/direction đúng, sau đó lấy đúng DROPOFF của con được đánh dấu isMyChild. Không dùng thông tin học sinh khác. Lỗi403/404 ngừng polling tự động; retry/focus có thể đọc lại. Lỗi đọc xóa giá trị cũ thay vì giữ giờ cũ như dữ liệu mới.

Retry48px nằm trong card đang có điều hướng; stopPropagation ngăn mở lộ trình khi chỉ muốn thử tải giờ. Request chỉ GET, không gửi OTP/báo nghỉ hoặc sửa dữ liệu. Không thêm endpoint/DTO/backend/schema/package, không đổi quyền liên kết.

## Kiểm chứng và giới hạn

Typecheck/export và source parity của màn lịch trước/sau (chỉ thêm import+row). Kiểm tra helper clock với primitives, selector với2điểm trả trong snapshot đã SELECT read-only của task timeline trước, không fake business records/API responses. Kiểm tra không chọn PARKING_END. Source guards/refresh được rà soát; chưa chứng nhận fetch runtime trong phiên có xác thực. Kết quả thực tế, preview và giới hạn tại [AI Review](../ai-review/LATEST.md).

Virtual chiều về thiếu giờ trả riêng là giới hạn contract hiện có; muốn đầy đủ cần PO duyệt mở rộng API theo ngày sau này. Native iPhone/Android, dữ liệu thay đổi khi polling, retry/403 và VoiceOver/font scale còn NOT_VERIFIED. Không tạo chuyến/challenge/records để test.
