# AI Review — Khác biệt map theo ảnh Parent/Staff

## 1. Task Information
Date 01/11/2026 Asia/Saigon. Type Read-only Diagnosis. Scope Mobile Trip map UI. Status COMPLETED source diagnosis; device reproduction NOT_VERIFIED.

## 2. Original Request
PO cung cấp 4 ảnh khoanh vùng marker và chân bottom sheet, giải thích rằng Parent và Driver/Bus Attendant nhìn khác nhau dù dùng chung screen.

## 3. Approved Scope
Đối chiếu ảnh và code, chưa có yêu cầu sửa map. Giữ toàn bộ source changes pending trước task.

## 4. Analysis & Decisions
Dùng chung file không đồng nghĩa layout/marker đồng nhất: screen chứa các nhánh role/data và phần geometry dùng fixed constants.

Marker:
- trip/[id].tsx:417-429: staff/default stop dùng số stopOrder trong student-marker tròn xanh; ownChildPin dựa isMyChild/studentId/PICKUP hoặc DROPOFF chuyển sang child-map-marker portrait/pin. Parent-only avatar fetch/update ở line220/570. Đây là khác nội dung theo dữ liệu/quyền trong renderer chung.
- Parking và school vẫn cùng nhánh class cho mọi role (line420/422); vehicle line458. School/vehicle dùng emoji 🏫/🚌 nên có khả năng khác hình trên Android/iOS. Ảnh còn khác thiết bị, chuyến và trạng thái/zoom; chưa xác minh runtime, không kết luận mọi khác marker đều vì role hoặc phiên bản app.
- CSS dimensions school30 so với divIcon mặc định28 cũng tồn tại trong cùng template, cần chuẩn hóa size/anchor nếu PO yêu cầu; không sửa trong task phân tích.

Bottom sheet:
- line53-56: COLLAPSED_HEIGHT115, EXPANDED_HEIGHT72% SCREEN_HEIGHT lấy từ Dimensions.get(window), FIXED_BOTTOM_ACTION_HEIGHT74.
- line831-836: Parent offset0; staff nonterminal offset74+insets.bottom.
- line1063-1068: Animated.View bottom=bottomActionOffset và height=sheetHeightAnim; content padding khác theo showBottomAction.
- line2044+: fixedBottomActionContainer height tự theo nội dung/padding, không đo; style line3306 có paddingTop10, paddingBottom inset+8, border; action button chỉ paddingVertical13 và text.
=> Source xác nhận layout đáy khác theo role và có rủi ro hở map vì sheet đặt theo74 cố định trong khi footer cao theo nội dung, nhất là font/thiết bị khác. Chưa đo runtime nên không khẳng định chính xác số pixel dải hở ở ảnh.
- Trường hợp cụ thể xác nhận từ code: Bus Attendant IN_PROGRESS vẫn showBottomAction=true và chừa74+inset nhưng nhánh nội dung attendant chỉ render ở SCHEDULED, nên có footer trống/reserved space không cần thiết.

Top controls:
- line922: Căn giữa/Theo xe chỉ hiện khi engine.position hoặc navigation.latestPosition; Tham chiếu còn cần isDriverActiveNavigation.
- TripNavigationControls canPublish chỉ theo isDriver; TEST_AUTO/TEST_JOYSTICK hiện theo testMode. Parent ảnh Chưa có vị trí còn staff ảnh Mất cập nhật/đang chạy là khác dữ liệu/state, không phải chứng minh khác renderer.

Hướng sửa đề xuất, chưa thực hiện: chuẩn hóa marker shape/size/anchor và dùng icon đồ họa ổn định, vẫn phân biệt own-child portrait với số thứ tự staff; bottom sheet dùng cùng cách bố trí, footer chỉ render khi thực sự có nội dung và đo chiều cao thực thay hằng74. Giữ quyền/controls/publisher khác theo role.

## 5. Implementation Details
No application code changes. Chỉ report; bảo toàn LATEST trước vào history/2026-11-01-before-map-ui-differences.md/.diff.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None. Không backend/API requests hoặc mock responses.

## 8. UI/UX Changes
None implemented. Các điểm đề xuất ở mục4 cần PO giao phạm vi và duyệt bố cục nếu refactor UI đáng kể.

## 9. Verification & Testing
Đọc source Trip map, child marker và navigation controls, đối chiếu ảnh. Không build/tests vì không sửa app. NOT_VERIFIED layout/marker runtime Android/iOS; chưa đo vị trí footer/sheet trên thiết bị. Không dùng ảnh của các chuyến khác nhau làm chứng minh lỗi GPS hoặc dữ liệu đồng bộ.

## 10. Issues & Risks
Có vấn đề layout tiềm năng từ footer fixed offset và footer attendant rỗng được xác nhận theo code. Mức hở trong ảnh cần đo thật. Không xóa role-specific child pins/driver permissions để ép mọi ảnh giống nhau.

## 11. Reviewer Focus
Chỉ khác styling hay khác mục đích; giữ privacy và actions. Đo footer thực/không footer/long text/font scale trước sửa; kiểm tra icon dimensions/anchor và cross-platform emoji.

## 12. Suggested Next Step
PO chốt sửa thống nhất marker và vùng đáy bottom sheet, giữ các khác biệt chức năng theo role.

## 13. Approval Status
Hoàn tất giải thích nguồn khác biệt. Chưa được yêu cầu implement map changes.
