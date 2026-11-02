# Staff map alignment — preserve Parent

## Cập nhật mới nhất: icon thông tin xe Staff — 01/11/2026

Theo yêu cầu bỏ PNG ở Staff, thẻ phương tiện tab Thông tin dùng Ionicons bus-outline24px màu #D97706 (icon đang dùng tại Parent student-detail/route-detail). Parent Trip INFO vẫn giữ Image Bus.png theo chỉ thị bảo toàn Parent. Người/trường/tab vốn dùng Ionicons nên không đổi; không ảnh hưởng marker trên map. Typecheck và source parity PASS; native chưa kiểm chứng.

## Cập nhật mới nhất: hàng tab Staff — 01/11/2026

Staff bỏ ScrollView ngang, dùng lại tabBarParent/tabButtonParent/tabButtonTextParent để chia đều bốn tab Thông tin, Điểm đón, Điểm danh, Sự cố. Style Staff nhỏ cho phép nhãn xuống dòng và gạch chân cùng đáy; giữ đủ bộ đếm và callback. Parent ba tab và style gốc không đổi. TypeScript, web/server export và preview RN-web390/320px PASS; chưa kiểm chứng native/authenticated Trip. Các cập nhật icon/pin/footer trước tiếp tục giữ nguyên.

## Cập nhật mới nhất: dùng icon xe/trường của Parent — 01/11/2026

PO yêu cầu Staff dùng luôn icon Parent. Đã bỏ nhánh SVG và CSS staff-map-icon riêng; ba vai trò dùng cùng HTML/CSS 🏫/🚌 và kích thước/anchor gốc của Parent. Xóa module staff-map-marker.ts chỉ chứa SVG nay không còn caller và test kỳ vọng SVG cũ. Pin học sinh vẫn dùng chữ cái đầu tên theo cập nhật bên dưới; footer/quyền không đổi. Các phần SVG staff/30×30 cũ trong tài liệu là lịch sử, không còn implementation hiện hành.

11/11 tests còn liên quan, TypeScript và web/server export PASS. Source check so với HEAD xác nhận HTML xe và CSS school-marker gốc Parent giữ nguyên. Chưa nghiệm thu lại trên Android/iPhone; emoji vẫn phụ thuộc cách vẽ của hệ điều hành như Parent hiện tại.

## Cập nhật theo PO: chữ cái tên thay số — 01/11/2026

PO yêu cầu điểm đón/trả Staff hiện chữ cái đầu tên học sinh như Parent, thay số2/3. Staff nay gọi trực tiếp `window.createChildMapPin(null, s.name)` để dùng đúng phép lấy ký tự/in hoa/fallback của Parent; không cấp studentId vào pin Staff hoặc thêm tải avatar. Bỏ numberedMapPinScript/createNumberedMapPin riêng. `s.name` vẫn từ projection tên hiện hữu, không đổi API/data; số thứ tự còn trong accessibility label để định vị điểm. Parent không đổi. Các mục pin số dưới đây là snapshot triển khai trước yêu cầu đính chính này.

12/12 tests PASS (5staff marker initials/frame/injection/icons,3existing child boundary,4footer); TypeScript và web/server export PASS. Không chạy lại native acceptance; parent initials renderer giữ nguyên, chỉ Staff caller tái sử dụng nó.

01/11/2026: PO duyệt wireframe và chốt **Parent hiện tại là mẫu giữ nguyên**. Chỉ điều chỉnh hiển thị Driver/Bus Attendant trong Trip detail; không áp dụng bản vẽ lại Parent của wireframe vào app.

## Source và giới hạn thay đổi

- `mobile/app/trip/[id].tsx`: staff pickup/dropoff dùng pin số theo khung Parent; school/vehicle dùng outline SVG ổn định chỉ khi `isDriverOrAttendant`. Parking P giữ nguyên. Parent vẫn emoji trường/xe, marker con/avatar và các nhánh marker cũ. Source map memo thêm boolean role, không thêm polling hoặc GPS publisher.
- `mobile/utils/child-map-marker.ts`: chỉ trích SVG có sẵn thành `mapPinSvg` cho staff reuse. Giá trị xuất ra của `childMapPinCss`, `childMapPinScript`, `childMapPinSize` so với HEAD được kiểm tra bằng equality và giữ nguyên tuyệt đối.
- `mobile/utils/staff-map-marker.ts`: dựng pin số dùng cùng SVG/CSS Parent, textContent giữ đủ số nhiều chữ số và không chèn nhãn vào HTML. Không đăng ký pin staff vào danh sách avatar Parent. SVG trường/xe tĩnh không phụ thuộc font emoji. CSS staff-only border-box căn icon đúng30×30 với Leaflet size/anchor; không đổi CSS marker Parent.
- `mobile/utils/trip-map-layout.ts`: footer chỉ hiện khi có nhánh nội dung thực: Driver SCHEDULED/IN_PROGRESS, Attendant SCHEDULED; Parent/terminal/undefined không có footer.

## Sheet và footer

Bỏ offset74px cố định. Đo toàn bộ footer bằng `onLayout`, gồm padding safe area và border; sheet đặt ngay trên chiều cao đo được, không cộng inset lần nữa. Attendant đang chạy không có nội dung footer nên không chừa khoảng rỗng. Footer buttons/badge/text/handlers/disabled conditions giữ nguyên; không thay capabilities. Parent tiếp tục bottom0, chiều cao sheet và padding safe area hiện có; sheet/info styles không thiết kế lại.

Không sửa nội dung tabs, QR, điểm danh, navigation controls, start/arrive/complete hoặc cơ chế tải Trip/location/history. Không sửa Parent planned route map và VietMapPicker.

## Kiểm chứng

- 11/11 tests:4footer visibility,4staff marker DOM/number/injection/SVG và3existing child-script boundary tests. Chỉ enum/text/DOM primitives; không giả business records/API responses.
- TypeScript app PASS; Expo export all Android/iOS/web/server PASS trên source cuối. Không phải APK/native runtime.
- Source parity: parent pin CSS/script/size byte-identical; mọi operation handler/capability/map update/fetch được giữ. Toàn bộ children của footer JSX giống HEAD sau normalize EOL.
- Chromium gallery sử dụng chính CSS/script/SVG source: Parent và staff pin24×30, staff school/bus30×30; số27 không bị rút thành2. Không khởi tạo map/GPS hoặc business trip trong gallery.

Full Trip runtime/native screenshot, vị trí xe thật, footer onLayout trên Android/iPhone, font scale/rotation và pixel regression Parent **NOT_VERIFIED**. Các kiểm tra tích hợp cần dữ liệu/quyền thực **BLOCKED_BY_TEST_DATA_POLICY**; không dùng fixture Trip/User giả để chứng minh giao diện. PO cần nghiệm thu parent giữ nguyên và staff expanded/compact/footer ở SCHEDULED/IN_PROGRESS/terminal trên thiết bị.
