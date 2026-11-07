# Đổi điểm: lịch sử trước, tạo mới mới chọn học sinh

30/10/2026, Mobile V2, local chưa commit/push. Chỉ thay luồng frontend theo chỉ thị PO; Báo nghỉ, backend, API contract, OTP, phê duyệt và hủy yêu cầu giữ nguyên. Form địa chỉ được dùng chung và bổ sung chọn học sinh trong cùng trang theo cập nhật mới nhất bên dưới.

## Luồng và bố cục

### Hiện hành01/11/2026 — tạo bằng nút + nổi

Trang lịch sử `/parent/change-stop` dùng [FloatingAddButton](../../mobile/components/navigation/floating-add-button.tsx) màu vàng,58×58/bo29, icon add32 và shadow giống hệt Theo dõi. Đây là điểm tạo duy nhất của trang này: bỏ dấu+ ở header và bỏ CTA chữ Tạo yêu cầu đổi điểm trong trạng thái rỗng. Callback `handleCreateRequest` không đổi; vẫn mở `/parent/change-stop/create`, giữ disabled guard/fixed student params khi áp dụng. Nút có accessibilityLabel Tạo yêu cầu đổi điểm dù không hiển thị chữ.

Báo nghỉ `/leave-notices` cũng dùng cùng nút nổi, bỏ dấu+ header và Tạo báo nghỉ mới trong empty. Giữ route `/leave-notices/create` và selectedStudentId nếu có. Theo dõi chuyển sang shared component nhưng giữ handleAddPress/bottom16/right20 và toàn bộ chức năng liên kết cũ.

Hai trang không có tab bar đặt FAB ở `bottom=insets.bottom+16`, `right=insets.right+20`; content/list/footer chừa `insets.bottom+90` để không bị che. Nút luôn hiện ở loading/error/empty/list. RequestListView chỉ bật FAB và bỏ CTA khi `appearance=leave-history`; các lịch sử riêng từng con/default (thông tin/địa chỉ) giữ header/CTA như trước. Chỉ đổi presentation, không API hoặc data hooks. Các đoạn về CTA/header30/10 dưới đây là lịch sử đã được thay thế về vị trí nút tạo.

```text
Trang chủ → Đổi điểm → Đổi điểm đón/trả (lịch sử)
  [Quay lại] [Đổi điểm đón/trả] [+]
  [Tất cả] [Chờ duyệt] [Đã duyệt] [Đã từ chối] [Đã hủy]
  [Tên con · Trạng thái · Địa chỉ đề xuất · Kết quả · Thời gian · Chi tiết]
  [Trước] [Trang / Tổng số] [Sau]
                      ↓ Tạo mới / CTA khi lịch sử rỗng
              Tạo yêu cầu đổi điểm (cùng một form)
                [Học sinh                 v] → modal chọn con AVAILABLE
                [Địa chỉ hiện tại]
                [Tìm kiếm địa chỉ mới]
                [Bản đồ · Địa chỉ đề xuất · Tọa độ]
                [Tiếp tục xác thực OTP]
```

Tái sử dụng RequestListView; sau thao tác tạo mới mở thẳng `/parent/change-stop/create`. Thẻ Học sinh ở đầu form mở modal cùng kiểu Tạo báo nghỉ, không navigate qua màn chọn con riêng. Home vẫn dùng cùng callback `/parent/change-stop` cho tiện ích expanded/compact. Học sinh DISABLED không được chọn để tạo mới, nhưng lịch sử vẫn được đọc nếu còn liên kết. Không tự chọn con đầu tiên hoặc mở form khi vừa vào lịch sử.

## Hiện hành — chọn con ngay trên form (30/10/2026)

- [change-stop/create.tsx](../../mobile/app/parent/change-stop/create.tsx) mở [CreateAddressRequestView](../../mobile/components/parent/create-address-request-view.tsx) ở chế độ chọn con. Giữ đầy đủ notice phê duyệt, địa chỉ hiện tại, tìm kiếm/gợi ý VietMap, bản đồ270px, địa chỉ/tọa độ đề xuất và nút OTP.
- [LinkedStudentPicker](../../mobile/components/parent/linked-student-picker.tsx) dùng chung trực tiếp với Tạo báo nghỉ, nhận danh sách/thông tin chọn/loading/error/callback. Dropdown bo12, padding14×12, label uppercase; avatar40, tên và metadata mã/trường wrap đầy đủ. Popup [StudentPickerDialog](../../mobile/components/parent/student-picker-dialog.tsx) bo24, card riêng có avatar48/mã/trường/checkmark, có tìm kiếm tên/mã/trường không phân biệt dấu. Đóng/backdrop/Android Back và KeyboardScrollView theo viewport/safe area; search không autoFocus. `fixed` hiện Cố định và không mở popup. `canSelectStudent?` vẫn do caller quyết định; Đổi điểm giữ AVAILABLE, không đổi guard. Tìm kiếm chỉ lọc linked list, không GET mới hoặc đổi lựa chọn khi query đổi. [Props, search, layout và kiểm chứng](mobile-leave-student-card.md#popup-card-và-tìm-kiếm--01112026).
- Đồng bộ01/11/2026: Tạo báo nghỉ không còn tự chọn con đầu; cả hai form tổng quát đều bắt đầu bằng Học sinh → Chọn học sinh → popup card các con. Chế độ cố định khi vào từ hồ sơ giữ nguyên. Không sửa code/guard hoặc cách chọn của Đổi điểm trong lần này.
- Chưa chọn con: form vẫn hiển thị toàn bộ các phần, nhưng input/bản đồ/OTP chưa được bật. Bản đồ dùng placeholder trung tính thay vì tải tile khi chưa biết con. Chưa có con: có Liên kết học sinh ở thẻ và TrackingEmptyState hiện có trong modal; không tự tạo dữ liệu. Lỗi danh sách/detail có Thử lại, không coi lỗi mạng như danh sách rỗng.
- [useAddressRequestStudent](../../mobile/hooks/use-address-request-student.ts) đọc GET linked students/focus và detail của ID đã chọn; response scope cũ bị bỏ qua. Không tự chọn con đầu. Nếu con không còn liên kết sau refresh, bỏ lựa chọn; lỗi danh sách khóa thao tác gửi cho tới khi đọc được danh sách hợp lệ.
- Đổi con xóa search/suggestions/địa chỉ/tọa độ nháp, hủy debounce; draft/search/lookup generation, mounted và activeStudentId guards chặn kết quả trả chậm hoặc message map của con trước. Reset trước paint, map keyed theo studentId để marker cũ không còn. Chọn lại đúng cùng con giữ nháp. Tạm khóa đổi con/input/map khi đang gửi OTP; không có draft địa chỉ con A gửi cho con B.
- Chỉ gửi khi detail của con AVAILABLE đã tải và có địa chỉ/tọa độ hợp lệ, không tìm kiếm/reverse/submitting. Request OTP giữ nguyên type ADDRESS_UPDATE/proposedData, params điều hướng OTP và validation backend. Không gọi mutation để kiểm thử.
- [Route có studentId](<../../mobile/app/parent/create-request/address/[studentId].tsx>) là wrapper của cùng view, truyền fixedStudentId và key; thẻ dùng chính LinkedStudentPicker mode fixed, nhận profile detail thực để giữ avatar/mã/trường/Cố định, không mở chọn con khác. ID thiếu/sai/quyền lỗi không thành chế độ tổng hợp. Route cũ [select-student.tsx](../../mobile/app/parent/change-stop/select-student.tsx) redirect tới form mới để giữ deep link, không còn màn chọn con riêng.
- KeyboardScrollView tiếp tục là chủ sở hữu cuộn input cho cả hai điểm vào. Không thêm thư viện, keyboard offset cố định hoặc KeyboardAvoidingView. Modal chỉ là danh sách đọc/chọn, có ScrollView riêng.

Nội dung/điểm chọn con trong các mục trước được thay bởi cập nhật này. Bộ gộp lịch sử, appearance và các callback lịch sử không đổi trong task form này.

## Style đồng bộ Báo nghỉ — 30/10/2026 (lịch sử vị trí CTA)

Route Đổi điểm bật `appearance="leave-history"` trong RequestListView. Các route yêu cầu riêng từ Hồ sơ học sinh giữ appearance mặc định. Đây là biến thể trình bày, không thêm loader, filter/status nghiệp vụ hoặc callback điều hướng.

- Cùng AppHeader/HeaderAction với Báo nghỉ: tiêu đề/back bên trái, nút dấu **+** bên phải có accessibilityLabel **Tạo yêu cầu đổi điểm**, cùng safe area và kích thước48px.
- Dải trạng thái giữ đủ năm bộ lọc của yêu cầu; padding pill12×5, nền trắng, active navy như Báo nghỉ. Cuộn ngang và ẩn thanh cuộn sẵn có.
- Loading/error/empty nằm trong ScrollView có padding16 và bottom inset; empty có paddingVertical60, icon tròn64, title16, description12/18, gap8. Không căn giữa toàn bộ chiều cao màn hình như trước. Nút vàng **Tạo yêu cầu đổi điểm** nằm ngay dưới mô tả, cùng cách đặt với **Tạo báo nghỉ mới**.
- Mô tả ngắn của Đổi điểm vẫn giữ nguyên; vùng mô tả có chiều cao tối thiểu tương đương hai dòng18×fontScale để CTA không bị kéo lên so với mô tả hai dòng ở Báo nghỉ. Đây là minHeight theo chữ, không tọa độ tuyệt đối của nút; văn bản dài vẫn mở rộng/cuộn, không cắt chữ hoặc bù bàn phím cố định.
- Card trắng bo16/padding16/gap12/shadow nhẹ; địa chỉ trong nền phụ, footer wrap khi hẹp. Giữ đầy đủ tên con, loại yêu cầu, badge trạng thái, địa chỉ đề xuất, resolution, thời gian và Chi tiết. Giữ total, Trước/Sau và số trang; pagination được xuống dòng khi hẹp.
- Lịch sử rỗng vẫn có CTA và dấu +; có dữ liệu dùng dấu + trên header như Báo nghỉ. Cả hai giữ cùng handleCreateRequest và nay mở form có chọn con inline. Retry/refresh, guard và disabled giữ nguyên.

Style nằm tại [request-history-styles.ts](../../mobile/constants/request-history-styles.ts). Riêng task style lịch sử không sửa form/bộ chọn; task hiện hành đã dùng chung form và chọn con inline như mô tả trên. Source Báo nghỉ/OTP và service gộp yêu cầu vẫn giữ nguyên. Kiểm chứng layout lịch sử dùng JSX/style thật tách riêng để SSR bằng React Native Web, không mock API/records:320/390px CTA hai trang cùng y353 trong preview inset0, không tràn ngang; desktop1440px không tràn. Không dùng số đo preview làm tọa độ trong production hoặc coi là nghiệm thu iPhone thật.

Back dùng `router.push`/`router.back`: form có thẻ chọn con → lịch sử → Trang chủ; đóng modal chỉ trở lại form và giữ nháp khi chưa đổi con. Sau xác thực OTP thành công vẫn tới danh sách yêu cầu riêng của con như V2; task này không thay màn OTP hoặc logic gửi/duyệt/hủy. Các điểm vào yêu cầu riêng từ Hồ sơ học sinh vẫn giữ route và studentId.

## Source và component contract

- [change-stop.tsx](../../mobile/app/parent/change-stop.tsx): route lịch sử, RequestListView với `requestType="ADDRESS_UPDATE"`, không truyền studentId, createRoute trỏ `/parent/change-stop/create`.
- [select-student.tsx](../../mobile/app/parent/change-stop/select-student.tsx): redirect tương thích tới form mới; bộ chọn nằm trong LinkedStudentPicker trên form.
- [RequestListView.tsx](../../mobile/components/parent/RequestListView.tsx): `studentId?: string`; có ID giữ API và hành vi tạo yêu cầu riêng; bỏ prop này để hiển thị tổng hợp. ID rỗng từ URL lỗi báo lỗi, không chuyển thành chế độ tổng hợp. `appearance?: 'default' | 'leave-history'` mặc định default, dùng leave-history riêng cho trang Đổi điểm; các props `requestType/title/createRoute/createButtonLabel/emptyMessage` giữ nguyên.
- [parent-request-history.ts](../../mobile/services/parent-request-history.ts): `listLinkedStudentRequests(query, isCurrent?)` đọc các API hiện có và trả StudentUpdateRequestListResponse; query gồm page/limit/type/status, page/limit là số nguyên dương do view cung cấp (hiện10 mỗi trang). isCurrent là guard để ngừng đọc tiếp khi chuyển filter/blur/unmount.
- [Home](<../../mobile/app/(tabs)/index.tsx>), OTP, detail và các route danh sách yêu cầu riêng không cần chỉnh source. Form cũ chuyển thành shared view như cập nhật trên; không tạo component lịch sử hoặc form địa chỉ trùng lặp.

View tổng hợp thêm tên con trên mỗi card; giữ địa chỉ, badge trạng thái, resolution, ngày giờ và route detail. Nút tạo trên header mới dùng HeaderAction48; ở appearance mặc định vẫn giữ Tạo mới/minHeight44. Header/safe area/FlatList/pull refresh theo view sẵn có; form mới vẫn dùng input và KeyboardScrollView cũ. Tab yêu cầu riêng cũng hưởng focus refresh và guard chống response cũ; không đổi contract/validation hay quyền thao tác.

## Nguồn dữ liệu, phân trang và lỗi

Backend hiện chỉ có GET danh sách yêu cầu theo từng học sinh, không có GET tổng hợp cho Parent. Frontend không sửa API client/contract:

1. GET `/parents/students` lấy ID đang liên kết; không lọc bỏ học sinh DISABLED khỏi lịch sử.
2. GET `/parents/students/:id/update-requests` cho từng ID, gửi type ADDRESS_UPDATE và status khi có bộ lọc. Backend vẫn kiểm tra liên kết và lọc theo parentId; không lấy yêu cầu của phụ huynh khác.
3. Muốn trang p, kích thước L: lấy tối đa p×L yêu cầu mới nhất của mỗi con. Mỗi GET giới hạn100 như backend; đọc thêm trang của con khi cần. Chỉ chạy tối đa ba luồng con đồng thời, không fan-out không giới hạn.
4. Gộp, sắp createdAt giảm dần (id là tie-break phía client), rồi cắt trang chung10; cộng total thật từ từng con và tính totalPages. Không chỉ lấy trang p riêng của từng con vì sẽ bỏ sót thứ tự chung. Khi tổng trang giảm, trả trang cuối còn hợp lệ.

Không có con → lịch sử rỗng, vẫn có Tạo mới; thẻ chọn con trên form/modal hiển thị empty + Liên kết học sinh. Một nhánh GET lỗi → báo lỗi/Thử lại, không trình bày danh sách thiếu như đủ. Khi đổi filter, về trang1; focus lại tải trang1, hỗ trợ pull refresh. Generation guard chặn response cũ, ngừng các batch/page tiếp theo khi rời màn; request đã gửi không hủy transport. Lỗi danh sách xóa card cũ, không thêm record hoặc request giả.

Giới hạn: đây là gộp nhiều GET, không phải snapshot database nguyên tử. Dữ liệu đổi trong lúc phân trang có thể làm total/thứ tự thay đổi như phân trang offset hiện có; timestamp trùng phụ thuộc thứ tự backend trước khi client tie-break. Chi phí đọc tăng theo số con và độ sâu trang; không tải hết lịch sử khi chỉ xem trang đầu, không thêm polling liên tục. Muốn tối ưu hơn cần một task API tổng hợp được duyệt riêng, không tự triển khai ở task UI này.

## Kiểm chứng và nghiệm thu

Kết quả thực tế, phạm vi file và giới hạn ghi tại [AI Review](../ai-review/LATEST.md). Typecheck và Expo export iOS/Android/Web/server phải đạt; kiểm tra manifest nhận route lịch sử, form create và redirect select-student; đối chiếu source của guard AVAILABLE và các route form/OTP/detail. Kiểm tra reset/guard bằng primitive UI state, không fixtures Student/Request/API giả hoặc ghi DB để test. Preview empty form SSR từ JSX/style thật xác minh selector ở trên địa chỉ, input readonly và vùng cuộn; không chạy loader hoặc API/map thật.

Chưa nghiệm thu luồng có xác thực trên Expo Go iPhone/Android. Cần kiểm tra lịch sử nhiều con/trạng thái/phân trang, rỗng/lỗi, tạo mới/chọn con/back, và refresh sau kết quả yêu cầu trên dữ liệu đã có. Không coi export thành công là bằng chứng hành vi thiết bị hoặc gửi OTP/duyệt thật.
