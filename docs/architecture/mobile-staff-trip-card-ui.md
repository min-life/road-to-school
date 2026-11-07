# Staff Home trip card — Parent style

## Sửa hàng tên02/11/2026

Tên tài xế/phụ xe dùng flex1/minWidth0 trong row không wrap; nhãn Bạn flexShrink0/căn đầu. Khắc phục chữ Xế rớt dòng do tên bị co, vẫn cho tên dài wrap tự nhiên và không ellipsis. Typecheck và RN-web390/320px với tên từ ảnh PASS (height=lineHeight22px); native chưa nghiệm thu.

## Hiện hành02/11/2026 — Dùng chính disclosure Parent

PO chọn thu gọn/mở rộng giống Parent. StaffTripCard nay render ParentTripCard (key trip.id), bus leading, summary tags chiều/giờ và accessibility label riêng. ParentTripCard thêm ba optional props leading/summaryContent/accessibilityLabel; Parent mặc định giữ avatar/label/state/styles/effects cũ. Staff body/trạng thái/guards/callbacks giữ nguyên; bỏ summary/card styles riêng và body padding để dùng details padding của Parent. Card bắt đầu đóng, mở mới thấy đầy đủ operations. Typecheck/source parity, Chromium shared disclosure390/320px và web/server export PASS; native/full real Staff card chưa nghiệm thu. Phần card luôn mở bên dưới là lịch sử trước yêu cầu mới.

01/11/2026: PO duyệt wireframe `staff-trip-card-wireframe.html`, sau đó triển khai cho cả DRIVER/BUS_ATTENDANT.

## Source và bố cục

`mobile/components/staff/staff-trip-card.tsx` là file application duy nhất thay đổi. Giữ nguyên props contract/caller tại Home. Dùng `parentHomeStyles.tripCard`, identity/status pill, primary/leave buttons và `colors`/`journeyTones` hiện có; local styles chỉ bố cục riêng staff. Không sửa card Parent hoặc shared staffHomeStyles đang được những phần Home khác sử dụng.

Card mở đầy đủ, không disclosure. Summary nền kem, icon bus trong vòng tròn vàng, tên tuyến/trạng thái/trường, tags chiều và giờ. Thân trắng: phương tiện/sức chứa/số HS, hàng tài xế và phụ xe, nhãn Bạn theo `isCurrentUser`, thông tin vận hành và CTA. Tên tuyến/nhân sự/trường được xuống dòng. Không tự cắt tên tuyến hay loại biển số nếu API đã gộp biển số trong routeName. Ngày chạy không lặp trong card vì Home đã hiển thị `journeyServiceDate(homeTrip.serviceDate)` ngay trên card.

## Trạng thái và thao tác

- WAITING_ASSIGNMENT giữ ưu tiên badge Chờ phân công, dùng tone warning của theme.
- SCHEDULED giữ nguyên readiness và ba nội dung chờ/sẵn sàng theo vai trò.
- IN_PROGRESS giữ markedCount/totalStudents/presentCount/absentCount; chỉ tách bố cục để đọc dễ hơn.
- Trạng thái khác không có khối operation như trước.
- CTA giữ nguyên `onViewDetail`, text riêng Driver/Attendant. Báo nghỉ chỉ hiện khi `canReportLeave`; `isReportingLeave` vẫn khóa nút và hiện spinner, `onReportLeave` không đổi. Bổ sung accessibilityRole và busy/disabled semantics, không đổi quyền.

## Kiểm chứng và giới hạn

PASS TypeScript và self-check AST so với HEAD: giữ mọi binding trip cũ (ngày được đối chiếu tại Home), điều kiện readiness/status/assignment/current-user/leave, callback/disabled và các thông báo vận hành. Không còn numberOfLines cắt tên. Không tạo fixtures nghiệp vụ, fake API responses hoặc gọi API/DB.

Bundle kết quả chi tiết tại docs/ai-review/LATEST.md. Wireframe đã xem trên Chromium ở task thiết kế; không coi đó là runtime kiểm tra StaffTripCard mới. Full integration/visual/native `NOT_VERIFIED`, các trạng thái cần real assigned trip/data `BLOCKED_BY_TEST_DATA_POLICY` khi chưa có nguồn dữ liệu được phép cho agent kiểm thử. Cần PO nghiệm thu card thật trên điện thoại, đặc biệt tên dài/font scale, trạng thái chờ và nút báo nghỉ. Không thêm package, đổi backend hoặc commit/push.
