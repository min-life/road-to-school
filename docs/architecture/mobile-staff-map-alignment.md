# Staff map alignment — preserve Parent

## Hiện hành02/11/2026 — Ổn định gesture sau measured height

PO báo kéo giật sau fix min height. Giữ min theo header nhưng PanResponder dùng collapsedHeightRef/deps ổn định; isSheetDragging chặn resize effect/onLayout feedback, header flexShrink0. Grant stop spring, bỏ completion finished=false, expanded ref cập nhật ngay; release/terminate reset dragging và snap theo min mới. Header giữ native responder trong drag. RED4cases→GREEN6gesture+4role/status, typecheck, Chromium callback harness và web/server export PASS; Android/WebView thực tế chưa nghiệm thu. Các self-check min/snap ở task trước không đủ chứng minh lifecycle interaction.

## Hiện hành02/11/2026 — Chiều cao sheet Staff theo header

Khoảng trắng thu gọn do min115px lớn hơn header. Staff nay đo sheetHandleArea, min=headerHeight+paddingBottom hiện hữu; toggle/drag clamp/midpoint/snap cùng dùng min đo được. Effect đồng bộ min khi collapsed, không can thiệp expanded. Parent và fallback trước đo vẫn115px. Footer vàng/offset và joystick không đổi. Typecheck,4role/status tests, actual callback primitive self-check và web/server export PASS; native onLayout/real screenshots chưa nghiệm thu.

## Hiện hành02/11/2026 — Tab Staff một dòng

PO yêu cầu tên/bộ đếm cùng hàng, không wrap. Staff dùng ScrollView ngang với natural button widths, text numberOfLines1/shrink0; font12px giữ Parent, gap/padding nhỏ riêng Staff. Preview390px thấy đủ4tabs;320px cuộn ngang khi thiếu chỗ. Parent/counters/handlers không đổi. Typecheck/source parity/RN-web PASS; native chưa nghiệm thu. Quyết định fixed equal-width/wrap ở phần lịch sử được thay bằng yêu cầu này.

## Hiện hành02/11/2026 — Trả vận hành về footer ngoài tab

PO đổi ý và yêu cầu nút ở ngoài tab như ban đầu. showTripAction nay render footer sibling sau sheet, độc lập activeTab/isExpanded. Đo footer gồm safe-area/border bằng onLayout; sheet bottom=offset, joystick bottom=sheetHeightAnim+offset+16. Role/status không có action dùng offset0. Giữ nút vàng Home, guards/labels/handlers và Parent mặc định. Typecheck,4role/status tests, source parity/ancestry và web/server export PASS; native layout/touch chưa nghiệm thu. Quyết định đặt action trong INFO bên dưới là lịch sử, được thay thế bởi yêu cầu này.

## Cập nhật mới nhất: nút vàng dùng chung Home — 02/11/2026

PO chốt nút thao tác dùng vàng. primaryActionBtn/Text dùng trực tiếp parentHomeStyles.primaryBtn/Text; modal/QR/report kế thừa cùng style. Nút gọn vàng/chữ tối; secondary vàng nhạt. Bỏ bgReady/Start/Arrive/Complete và confirmBg overrides. Disabled/quyền/handlers giữ nguyên, không sửa Home/Parent reference hoặc badge/progress/camera overlay. Typecheck, actual style identity/palette và callback AST parity PASS; native/modal/font-scale chưa nghiệm thu.

## Cập nhật mới nhất: bàn giao Auto→Manual và tab Sự cố — 02/11/2026

Auto tới trong100m của target PICKUP/DROPOFF gọi change(TEST_JOYSTICK) trước ADVANCE rồi return; reuse SWITCH/position preservation hiện hữu, dừng auto và chờ joystick. Busy/routeBusy guards tránh tranh chấp. Khoảng cách địa lý, không độ dài đường còn lại; trường/bãi/GPS giữ nguyên. Nút Báo sự cố chuyển từ header vào đầu tab INCIDENTS, giữ guard staff+(SCHEDULED hoặc canReport), onPress/reasons/modal. Không mở rộng quyền báo cáo.44tests/typecheck/web-server export/source checks PASS; native/real Trip/API side effects chưa kiểm chứng.

## Cập nhật mới nhất: vận hành nằm trong INFO — 02/11/2026

PO yêu cầu bỏ cụm nút ghim đáy khi thu gọn. Nội dung Driver start/arrive/complete và Attendant readiness chuyển nguyên vào ScrollView INFO, ngay dưới thẻ giáo viên; chỉ hiện expanded+INFO, giữ mọi guards/disabled/handlers. Bỏ footer đo chiều cao/offset và style fixed; sheet bottom0/safe-area padding, joystick bottom=sheetHeightAnim+16px. Helper đổi tên hasTripAction, logic role/status giữ nguyên. Typecheck,4role/status tests, source parity/ancestry và web/server export PASS; native/real Trip/scroll acceptance chưa kiểm chứng. Các mô tả footer ghim đáy/offset trong phần lịch sử dưới đây không còn áp dụng.

## Cập nhật mới nhất: tốc độ cùng hàng chế độ — 02/11/2026

Theo ảnh PO, speed stepper chuyển cùng hàng Auto/Manual và bỏ nhãn Tốc độ mô phỏng. TestMode dùng row nowrap, hai mode buttons flex1/nhãn wrap khi hẹp, stepper spacing gọn. Điều kiện hiện và callbacks giữ nguyên; không thay engine/joystick/Parent. Typecheck, callback parity, RN-web390/320px với120km/h và tăng/giảm PASS. Native/font scaling chưa kiểm chứng.

## Cập nhật mới nhất: joystick trong suốt — 02/11/2026

PO yêu cầu tối giản: vòng ngoài transparent viền xám mảnh, núm xám rgba; bỏ nền trắng, vàng, icons và shadow/elevation. Vùng chạm120px/núm44px, vị trí và toàn bộ gesture/stop/a11y giữ nguyên. Typecheck/source parity PASS; giao diện mới chưa kiểm tra trực tiếp browser/native. Phần mô tả trắng/vàng/Ionicons dưới đây là lịch sử trước yêu cầu này.

## Cập nhật mới nhất: joystick lái thủ công — 02/11/2026

PO yêu cầu đổi bốn nút hướng thành joystick ở góc dưới phải map. TripJoystick dùng PanResponder/Ionicons, kéo360°, dead zone và clamp; release/cancel/multitouch/background/unmount dừng. Chỉ Driver testMode/TEST_JOYSTICK và sheet collapsed thấy control. Vị trí theo sheetHeightAnim + footerHeight +16px; mở rộng sheet ẩn control. Bỏ bốn nút trong card trên, giữ mode/speed. Engine giữ pressStartedAt từ đầu hold để steering liên tục không tạo short-tap giả khi release. Parent/Attendant UI và nghiệp vụ không đổi.36tests, typecheck, web/server export và RN-web390/320px PASS; native/real Trip và screen-reader acceptance chưa kiểm chứng.

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
