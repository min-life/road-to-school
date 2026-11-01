# Tạo báo nghỉ — chọn học sinh đồng bộ Đổi điểm

Cập nhật31/10/2026, local chưa commit/push. Yêu cầu mới thay card riêng bằng cùng dropdown/modal đang dùng ở Tạo yêu cầu đổi điểm; giữ avatar và toàn bộ thông tin của task trước.

## Component dùng chung và bố cục

Cả [Tạo báo nghỉ](../../mobile/app/leave-notices/create.tsx) và [Form đổi điểm](../../mobile/components/parent/create-address-request-view.tsx) dùng [LinkedStudentPicker](../../mobile/components/parent/linked-student-picker.tsx), không còn hai implementation chọn con riêng. Component LeaveStudentCard cũ đã bỏ vì không còn consumer.

```text
HỌC SINH
[Avatar40] Tên học sinh                  [v / Cố định]
           Mã học sinh · Trường
```

- Cùng nền trắng, border theme, bo12, padding14×12, khoảng cách8 và typography của dropdown Đổi điểm; tên14/20, metadata11/16, không shadow/card bo20 riêng như lần trước.
- Avatar40 của con đã chọn lấy đúng Student.avatarUrl qua UserAvatar; popup cũng dùng avatar40 riêng từng con, giữ tên/mã/trường/checkmark. Thiếu hoặc lỗi ảnh dùng chữ đầu tên theo helper chung, không lấy avatar phụ huynh/ảnh con đầu hoặc tạo hình giả.
- Text metadata và tên tự wrap, không numberOfLines/ellipsis. Chưa chọn giữ nhãn Chọn học sinh; mode fixed giữ Học sinh khi chưa tải và badge Cố định, không mở popup.
- Popup cùng màu, row/selection/close/scroll/safe-area và hành vi dismiss keyboard của Shared Picker; không có TextInput hoặc autoFocus mới. Avatar và trường/mã vẫn hiện đủ sau đồng bộ.

## Props và quyền chọn

LinkedStudentPicker giữ các props students/selectedId/loading/error/disabled/onSelect/onRetry/onLink, bổ sung:

- `fixed?: boolean`, mặc định false: readonly dropdown có Cố định; không mở modal hoặc cho đổi con. Hai form dùng cùng mode khi vào từ hồ sơ con.
- `canSelectStudent?: (student: ParentLinkedStudentItem) => boolean`: caller quyết định khả năng chọn. Mặc định theo AVAILABLE như Đổi điểm trước đây. Báo nghỉ truyền predicate cho toàn bộ linked list để giữ chính sách chọn vốn có của màn này; backend/GET options vẫn quyết định điều kiện báo nghỉ, không mở rộng quyền API. Không dùng chính sách Đổi điểm áp ngầm sang Báo nghỉ.

Dropdown và modal sở hữu state visible tại component; data/API/selection nghiệp vụ vẫn ở từng form. Báo nghỉ chọn con vẫn setSelectedStudentId và xóa selectedTripId; Shared Picker đóng popup. isParent/isFixedStudent và cơ chế tự chọn con đầu của Báo nghỉ giữ như source trước. Đổi điểm vẫn không tự chọn con và chỉ AVAILABLE.

## Tích hợp và trạng thái

- Báo nghỉ giữ GET linked students và dependency chọn con hiện có; bổ sung loading/error/retry và active guard cho response sau unmount/scope change. Lỗi không bị coi là danh sách rỗng; retry chỉ gọi lại GET. Không có con có Liên kết học sinh/empty component như Shared Picker.
- Form Đổi điểm global/fixed đều dùng Shared Picker; fixed nhận trực tiếp profile detail hiện có, không GET mới. Error/loading detail được hiện một lần thay vì lặp dưới thẻ.
- Giữ calendar modal và overlay riêng của Báo nghỉ; chỉ xóa modal/styles chọn con riêng hết dùng. Không đổi chuyến/ngày/chiều/lý do/OTP/cooldown, reset địa chỉ/guards của Đổi điểm hoặc API contracts.
- Không backend, schema, packages hoặc assets mới. Thay đổi của card bo20/LeaveStudentCard trong review cũ là lịch sử đã được thay thế.

## Kiểm chứng và giới hạn

Source/AST phải giữ các controllers/options/OTP/cooldown và API call arguments; typecheck/Expo export phải đạt. Preview chỉ dùng component/style/UserAvatar thật và trường hồ sơ từ SELECT read-only local, không mock API hoặc tạo Student/Trip records. Mode mutable/fixed và row popup được trình bày cùng nhau chỉ để so sánh, không phải integrated form đang hoạt động.

Native iPhone/Android popup, callback selection/focus, keyboard/VoiceOver/Dynamic Type và ảnh thật chưa được nghiệm thu bởi SSR/typecheck. Kết quả thực tế và giới hạn tại [AI Review](../ai-review/LATEST.md).
