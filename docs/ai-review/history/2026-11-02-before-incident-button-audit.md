# AI Review — Chuyển nút vận hành vào tab Thông tin

## 1. Task Information
02/11/2026 Asia/Saigon. IMPLEMENTATION follow-up. Source hoàn tất; native acceptance NOT_VERIFIED. Bảo toàn pending work joystick/tốc độ; không commit/push.

## 2. Original Request
PO yêu cầu đưa nút đáy màn hình (ảnh: Còn2học sinh chưa xuống xe) vào tab Thông tin để thu gọn không còn kẹt nút.

## 3. Approved Scope
Di chuyển toàn bộ cụm vận hành Driver/Bus Attendant vào INFO. Giữ điều kiện, nhãn/disabled, handlers và quyền. Parent giữ nguyên. Không đổi nghiệp vụ/API/DB.

## 4. Analysis & Decisions
Footer cũ absolute và đo chiều cao để đẩy sheet lên nên luôn chiếm đáy, kể cả khi thu gọn hoặc tab khác. Chuyển nguyên nội dung role/status vào ScrollView INFO, ngay sau thẻ giáo viên. Bỏ đo footer/offset/style ghim đáy; sheet bottom0 và dùng safe-area padding chung. Joystick bám sheetHeightAnim+16px, không cộng footer không còn tồn tại.

## 5. Implementation Details
- mobile/app/trip/[id].tsx: showTripAction trong expanded INFO ScrollView; style tripInfoActions padding top4/bottom12. Bỏ bottomActionHeight/state/onLayout/offset, fixedBottomActionContainer và root footer. Sheet bottom0/paddingBottom=insets.bottom+10. Joystick offset được đồng bộ.
- mobile/utils/trip-map-layout.ts: đổi tên hasTripBottomAction thành hasTripAction và cập nhật comment vì không còn footer; logic role/status không đổi.
- mobile/scripts/trip-map-layout.test.ts: cập nhật tên helper/descriptions, giữ4test và toàn bộ assertions.
- architecture addendum, LATEST.md/.diff; archive báo cáo trước history/2026-11-02-before-info-trip-actions.md/.diff. Diff riêng từ working baseline đầu task, không gộp pending work trước.

## 6. Database Changes
None. Không seed/record/mutation/migration hoặc dữ liệu nghiệp vụ tự tạo.

## 7. API & Swagger Changes
None. Handlers/capabilities không đổi, không gọi API side effects để test.

## 8. UI/UX Changes
Nút bắt đầu/đến trường/hoàn thành hoặc trạng thái chờ/khóa của Driver và xác nhận sẵn sàng của Attendant ở cuối nội dung INFO, cuộn cùng ba thẻ thông tin. Thu gọn sheet/chuyển tab thì nút ẩn; không còn footer hoặc khoảng đệm cho footer. Parent không có action như cũ. Attendant cần vào INFO để xác nhận sẵn sàng theo vị trí mới.

## 9. Verification & Testing
PASS TypeScript app --noEmit exit0.
PASS4/4 tests role/status action availability, không business records.
PASS AST self-check so với baseline: biểu thức role/status, nhãn, style button, disabled và callbacks trong action container giống bản cũ sau bỏ comment/normalize indentation; mọi handle* variable declarations giữ nguyên. Action có ancestors ScrollView, activeTab INFO và isExpanded. Parent tabs giữ nguyên. Không còn references footer measurement/offset/style hoặc tên helper cũ trong mobile source.
PASS Expo export --platform web gồm web/server bundles exit0, output ngoài repo info-trip-actions-export. PASS git diff --check.
Không thêm test mirror layout. Full authenticated Trip/native WebView/safe area/scroll/touch acceptance NOT_VERIFIED; không tạo Trip/User/mock API để chứng minh UI (BLOCKED_BY_TEST_DATA_POLICY khi thiếu session/dữ liệu được cấp). Không coi preview task trước là kết quả mới.

## 10. Issues & Risks
Ở màn nhỏ có thể cần cuộn INFO để tới nút; button vẫn nằm trong ScrollView. Cần nghiệm thu expanded/collapsed và safe area trên thiết bị. Không thêm dependency hoặc commit/push.

## 11. Reviewer Focus
Không đổi điều kiện start/arrive/complete/ready. Cụm action thực sự là con INFO ScrollView, không chỉ ẩn footer theo isExpanded. Không offset mồ côi hoặc khoảng trống đáy; joystick bám sheet mới; Parent nguyên trạng.

## 12. Suggested Next Step
PO reload app, mở INFO và thu gọn sheet để nghiệm thu vị trí nút trên thiết bị.

## 13. Approval Status
PO yêu cầu trực tiếp theo ảnh, thực hiện trong map đã duyệt. Source hoàn tất và kiểm tra an toàn đạt; chờ native acceptance.
