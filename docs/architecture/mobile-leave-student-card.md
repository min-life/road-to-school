# Tạo báo nghỉ — chọn học sinh đồng bộ Đổi điểm

Cập nhật01/11/2026. Hai form dùng cùng dropdown/modal, không tự chọn học sinh đầu tiên khi vào form tổng quát. Popup đã được thiết kế lại với card và tìm kiếm; chưa commit/push các lần sửa01/11 này.

## Component dùng chung và bố cục

Cả [Tạo báo nghỉ](../../mobile/app/leave-notices/create.tsx) và [Form đổi điểm](../../mobile/components/parent/create-address-request-view.tsx) dùng [LinkedStudentPicker](../../mobile/components/parent/linked-student-picker.tsx), không còn hai implementation chọn con riêng. Component LeaveStudentCard cũ đã bỏ vì không còn consumer.

```text
HỌC SINH
[Chọn học sinh                              v]
                   ↓ nhấn để mở popup
[Avatar48] Tên · Mã học sinh · Trường         [✓ nếu chọn]
                   ↓ chọn một card
[Avatar40] Tên học sinh                  [v / Cố định]
           Mã học sinh · Trường
```

- Cùng nền trắng, border theme, bo12, padding14×12, khoảng cách8 và typography của dropdown Đổi điểm; tên14/20, metadata11/16, không shadow/card bo20 riêng như lần trước.
- Avatar40 của con đã chọn lấy đúng Student.avatarUrl qua UserAvatar; popup dùng avatar48 riêng từng con, giữ tên/mã/trường/checkmark. Thiếu hoặc lỗi ảnh dùng chữ đầu tên theo helper chung, không lấy avatar phụ huynh/ảnh con đầu hoặc tạo hình giả.
- Text metadata và tên tự wrap, không numberOfLines/ellipsis. Chưa chọn giữ nhãn Chọn học sinh; mode fixed giữ Học sinh khi chưa tải và badge Cố định, không mở popup.
- Popup dùng [StudentPickerDialog](../../mobile/components/parent/student-picker-dialog.tsx) chung, có TextInput tìm kiếm nhưng `autoFocus={false}`; không tự bật bàn phím. Avatar và trường/mã vẫn hiện đủ sau đồng bộ.

## Popup card và tìm kiếm — 01/11/2026

```text
[Icon] Chọn học sinh                         [×]
[Tìm theo tên, mã hoặc trường học]       [xóa]
N học sinh
[Avatar48] Tên học sinh                       [✓/○]
           Mã: ...
           Trường ...
           Đang chọn / Đã vô hiệu hóa (nếu có)
```

- Khung trắng bo24 rộng tối đa420, gutter16. Header có nút đóng48; card bo18/padding14, màu theme, viền vàng nâu và nền vàng nhạt khi chọn, cùng dấu tích và nhãn Đang chọn để không phụ thuộc màu. Tên/mã/trường wrap đầy đủ, không ellipsis.
- Chiều cao popup là min(560, chiều cao viewport trừ safe area và gutter32), giữ vị trí ô tìm kiếm ổn định khi kết quả thay đổi. Đây là kích thước khung, không phải offset/chiều cao bàn phím giả định. Nội dung cuộn trong KeyboardScrollView riêng; header đóng luôn ở ngoài vùng cuộn.
- Tìm ngay trong danh sách linked hiện có bằng [matchesSearchText](../../mobile/utils/search-text.ts), theo tên/mã/trường, không phân biệt hoa thường hoặc dấu tiếng Việt/đ. Từ cập nhật01/11 tiếp theo, toàn bộ chuỗi nhập phải là đoạn ký tự liên tiếp trong ít nhất một trường; không ghép các từ rải rác hoặc nối tên/mã/trường thành một chuỗi chung. Ví dụ `ăn`, `ĂN`, `an` đều khớp text `Nguyễn Văn A`; `ăx` không khớp. Query rỗng/whitespace hiện tất cả; query chỉ có dấu kết hợp Unicode không hiện tất cả. Chuẩn hóa khoảng trắng đầu/cuối/lặp, không sửa dữ liệu. Không sắp xếp lại dữ liệu hoặc đổi selection khi lọc. Không GET search, không gửi query hay lấy học sinh ngoài linked list.
- Có số kết quả, nút xóa query và trạng thái Không tìm thấy học sinh kèm Xóa tìm kiếm; không nhầm không khớp với chưa liên kết. Loading/error/retry và empty liên kết vẫn riêng. Query rỗng hiển thị toàn bộ danh sách, kể cả học sinh disabled (giữ policy của caller).
- Chọn card đóng popup/dismiss bàn phím; nút đóng, backdrop riêng và Android Back đóng tương tự. Popup chỉ mount khi mở nên query được xóa khi đóng rồi mở lại; selectedId của form giữ nguyên. Backdrop là sibling absolute, không bọc input/card và không chặn responder cuộn.
- TextInput có accessibilityLabel, không autoFocus; icon trang trí ẩn, card có selected/disabled và tên truy cập gồm tên/mã/trường. Search/clear/close đáp ứng hit target48. Không tự thêm animation ngoài fade Modal hiện có.

## Props và quyền chọn

LinkedStudentPicker giữ các props students/selectedId/loading/error/disabled/onSelect/onRetry/onLink, bổ sung:

- `fixed?: boolean`, mặc định false: readonly dropdown có Cố định; không mở modal hoặc cho đổi con. Hai form dùng cùng mode khi vào từ hồ sơ con.
- `canSelectStudent?: (student: ParentLinkedStudentItem) => boolean`: caller quyết định khả năng chọn. Mặc định theo AVAILABLE như Đổi điểm trước đây. Báo nghỉ truyền predicate cho toàn bộ linked list để giữ chính sách chọn vốn có của màn này; backend/GET options vẫn quyết định điều kiện báo nghỉ, không mở rộng quyền API. Không dùng chính sách Đổi điểm áp ngầm sang Báo nghỉ.

Dropdown và modal sở hữu state visible tại component; data/API/selection nghiệp vụ vẫn ở từng form. Cả hai form tổng quát bắt đầu với nhãn Chọn học sinh, không tự chọn con đầu, kể cả chỉ có một con liên kết. Nhấn dropdown mở popup tất cả con đang liên kết; chọn card đóng popup và hiển thị avatar/tên/mã/trường của con trên dropdown. Báo nghỉ chọn con vẫn setSelectedStudentId và xóa selectedTripId. Nếu vào từ hồ sơ/chuyến có studentId, giữ con đó cùng nhãn Cố định, không cho đổi con. Đổi điểm vẫn chỉ chọn AVAILABLE; Báo nghỉ giữ policy/API của riêng màn này.

## Tích hợp và trạng thái

- Báo nghỉ đọc GET linked students khi vào màn hình hoặc nhấn Thử lại, không gọi lại danh sách chỉ vì vừa chọn con. Giữ loading/error/retry và active guard cho response sau unmount. Lỗi không bị coi là danh sách rỗng; không có con có Liên kết học sinh/empty component như Shared Picker.
- Khi chưa chọn con, không gọi GET chuyến/options; vùng chuyến nhắc ngắn Chọn học sinh để xem chuyến xe phù hợp thay vì báo không có chuyến. Chọn con mới bắt đầu đọc options theo ngày/chiều hiện có. Nút OTP vẫn khóa khi chưa có chuyến hợp lệ, không tự gửi OTP.
- Form Đổi điểm global/fixed đều dùng Shared Picker; fixed nhận trực tiếp profile detail hiện có, không GET mới. Error/loading detail được hiện một lần thay vì lặp dưới thẻ.
- Giữ calendar modal và overlay riêng của Báo nghỉ; chỉ xóa modal/styles chọn con riêng hết dùng. Không đổi chuyến/ngày/chiều/lý do/OTP/cooldown, reset địa chỉ/guards của Đổi điểm hoặc API contracts.
- Không backend, schema, packages hoặc assets mới. Thay đổi của card bo20/LeaveStudentCard trong review cũ là lịch sử đã được thay thế.

## Kiểm chứng và giới hạn

Source/AST phải giữ các controllers/options/OTP/cooldown và API call arguments; typecheck/Expo export phải đạt. Preview chỉ dùng component/style/UserAvatar thật và trường hồ sơ từ SELECT read-only local, không mock API hoặc tạo Student/Trip records. Mode mutable/fixed và row popup được trình bày cùng nhau chỉ để so sánh, không phải integrated form đang hoạt động.

Pure tests tìm kiếm dùng text/number, không fake business DTOs. SSR Chromium chỉ kiểm tra JSX/style các trạng thái query trên snapshot hồ sơ thật đã SELECT trước đây; portal/viewport/scroll được adapter cho trình bày, không chứng nhận tương tác. Native iPhone/Android popup, callback selection/focus, keyboard/VoiceOver/Dynamic Type và ảnh thật chưa được nghiệm thu bởi SSR/typecheck. Kết quả thực tế và giới hạn tại [AI Review](../ai-review/LATEST.md).
