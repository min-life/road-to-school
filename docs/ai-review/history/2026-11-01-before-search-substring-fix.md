# AI Review — Popup chọn học sinh và tìm kiếm

## 1. Task Information
Task: Thiết kế lại popup card học sinh, thêm search. Date: 01/11/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: UI implementation. Status: COMPLETED implementation/static/build/presentation checks; native acceptance NOT_VERIFIED.

## 2. Original Request
PO: “Hãy design lại popup các card học sinh cho đẹp và chuẩn. Thêm search học sinh vào bên trong popup card học sinh để search học sinh.”

## 3. Approved Scope
Popup dùng chung ở Tạo báo nghỉ/Tạo yêu cầu đổi điểm. Bố cục đã nêu trước triển khai: header/đóng → search → card avatar/tên/mã/trường/dấu chọn. Dựa trên yêu cầu design+implement trực tiếp của PO, không mở màn hình/luồng nghiệp vụ mới. Không sửa các form, API/DB, dependencies hoặc Git commit/push. Giữ tất cả pending work, gồm chỉnh sửa sẵn có trong CreateAddressRequestView và .env.example.

## 4. Analysis & Decisions
Dùng cùng LinkedStudentPicker để hai màn nhận cùng popup, tách StudentPickerDialog cho presentation/search/keyboard. Không thêm library hoặc search endpoint. Search theo text hiển thị trong linked list đã nhận, không đổi thứ tự, policy hay selectedId. Giữ popup cùng chiều cao khi query đổi để ô tìm kiếm không nhảy do recenter; cap560 dựa viewport/safe area, không hardcode keyboard height. Tái sử dụng UserAvatar và KeyboardScrollView của V2. Search hỗ trợ Unicode tiếng Việt theo NFD, lower-case/đ, chia từ khóa; mọi từ phải có trong các trường kết hợp. Skill ui-ux-pro-max: focused search empty-state/no-result guidance phù hợp cho phản hồi và clear action; style vẫn theo theme V2, không sinh design system mới.

## 5. Implementation Details
- mobile/components/parent/linked-student-picker.tsx: giữ nguyên dropdown/fixed/loading/error và callbacks; thay inline Modal bằng StudentPickerDialog chỉ mount khi visible && !disabled && !fixed. Query tự reset khi đóng/mở, lựa chọn form không reset.
- mobile/components/parent/student-picker-dialog.tsx (mới): header, search, kết quả, cards, loading/error/empty/no-results. Sibling backdrop tránh bọc input/list trong Pressable. Đóng/chọn dismiss bàn phím; Android Back dùng cùng close. Giữ default status AVAILABLE/canSelectStudent predicate. Selected có màu+dấu tích+Đang chọn; unavailable có lock/text và disabled.
- mobile/utils/search-text.ts (mới): pure matchesSearchText(query, displayFields), không phụ thuộc business DTO hoặc API.
- mobile/scripts/search-text.test.ts (mới): sáu tests với text primitives, không tạo Student fixtures/API responses.
- Cập nhật bốn docs mobile-leave-student-card.md, mobile-parent-stop-requests.md, mobile-ui-implementation-status.md, mobile-keyboard-behavior.md. Archive report/diff trước tại history/2026-11-01-before-student-picker-search.md/.diff. LATEST.diff chỉ tám file task, so với baseline đầu task để không gom thay đổi pending trước đó.

## 6. Database Changes
None. Không truy vấn/mutate DB, seed hoặc gọi business mutation. Presentation preview dùng snapshot hai hồ sơ linked đã SELECT read-only trong task trước, nguyên trạng với hai avatar null. Không tự tạo tên/ảnh/học sinh hoặc API response để test.

## 7. API & Swagger Changes
None. Student/selection props không đổi, data hooks/API client giữ nguyên. Query search ở memory, không truyền qua network. Không thay OTP/trip/options hoặc guards của form. Không Swagger work vì không API changes.

## 8. UI/UX Changes
Khung trắng bo24 maxWidth420, gutter16, cao min(560, viewport - safeArea -32). Header nút đóng48 nằm ngoài vùng cuộn. Search nằm đầu KeyboardScrollView riêng trong modal, no autofocus, có clear48 và focus border. Card bo18/padding14/avatar48; tên15/21 bold, mã11/16, trường12/17 với icon. Tất cả text wrap, không truncation. Selected dùng theme navigationHighlight/navigationActive, dấu tích và text; card thường có vòng chọn, disabled vẫn hiển thị kèm lock/text. Search theo tên/mã/trường bỏ dấu/hoa thường, số kết quả polite, no-results có clear action. Chưa linked dùng empty/link hiện có. Không thêm animation ngoài fade Modal cũ. Accessibility labels, selected/disabled states, icon decorative hidden. Không tự thêm màu/theme tối mà app chưa hỗ trợ.

## 9. Verification & Testing
PASS: final Mobile npx --no-install tsc --noEmit exit0 sau sửa stable dialog height.
PASS: node --experimental-strip-types --test scripts/search-text.test.ts,6/6 tests exit0: blank query, Vietnamese marks/đ/case/composed accents, partial code/leading zeros, multiword across fields, missing token, absent fields/literal punctuation. Node MODULE_TYPELESS_PACKAGE_JSON warning không chặn tests; không sửa package để xử lý warning.
PASS: final Expo export --platform all exit0, TEMP/rts-student-search-final-export-b8c1341914074e1cbfa76fd430a99f0c, log cùng tên+.log; không application changes sau final checks. Export trước stable-height cũng đạt nhưng không dùng làm final evidence.
PASS:11 protected file SHA256 giữ nguyên so với task-start baseline, gồm hai forms đang có pending work, API/data hooks/OTP helpers/UserAvatar/keyboard wrappers/package/lock/.env.example. Scoped diff whitespace và report13sections.
PASS presentation-only: Chromium IAB SSR dùng actual dialog JSX/style/search helper/UserAvatar và snapshot hai hồ sơ thật trước đây. Kiểm tra320×568,390×844,844×390,1440×900 không overflow ngang; landscape có scroll area285px/content333px. Main/match query có cùng search top232px ở390, không recenter. Render riêng đầy đủ2cards, match1card, no-results0cards; selected/checkmark/info/avatar fallback và clear action hiển thị. Search không focus lúc vào. Screenshot TEMP/rts-student-picker-search-preview.png. Tab đóng, viewport reset, server51614 riêng dừng; server Metro của PO không động tới.
LIMITATION: SSR adapters dùng View thay portal Modal, ScrollView thay keyboard wrapper và injected query/viewport để kiểm tra presentation; không có API mock. Không chứng nhận search typing/select/clear/close native hoặc keyboard behavior từ SSR. Interactive TEMP Metro harness không resolve được React do cấu hình ngoài project; bỏ cách đó, không thay production config để ép chạy. Một typecheck gọi nhầm root bị npx --no-install từ chối vì không có compiler tại root; không install, đã chạy lại đúng mobile exit0.
NOT_VERIFIED: integrated authenticated form, actual popup tapping/selection/disabled record, real photo loading, Expo Go iPhone/Android/Safari iOS/Chrome Android keyboard, VoiceOver/largest Dynamic Type. BLOCKED_BY_TEST_DATA_POLICY cho real-avatar/disabled-profile runtime cases chưa có dữ liệu phù hợp; không sửa records để tạo điều kiện test. Mobile không có lint script, không cài thêm tool.

## 10. Issues & Risks
Preview hồ sơ thực chỉ có hai con AVAILABLE và avatar null, không chứng nhận ảnh thật hoặc disabled case. Large linked lists render bằng scroll như component cũ; không API fanout mới hoặc virtualization dependency. Tìm kiếm là substring từng từ, không fuzzy/typo/ETA hay dữ liệu mock. Card lọc khỏi kết quả vẫn giữ selectedId; đóng rồi mở hiển thị toàn bộ list. Native keyboard/modal UAT còn thiếu. Các thay đổi trước task được bảo toàn và không được mô tả như của task này.

## 11. Reviewer Focus
Đối chiếu selection policy/callbacks, fixed/disabled guards và lifecycle unmount reset query. Kiểm tra no-data so với no-search-results, không lọc mất học sinh disabled thay vì cho thấy trạng thái. Tất cả field/avatar đúng từng student; không lấy parent avatar. Bounded scroll/viewport, không nested keyboard inset, no autofocus và không bọc backdrop quanh input/card. Tìm kiếm chỉ linked fields, không network hoặc business side effect. Kiểm tra diff baseline không chứa .env/pending form changes.

## 12. Suggested Next Step
Trên Expo Go iPhone, kiểm tra popup ở cả hai form: gõ tên/mã/trường, xóa search, chọn card và cuộn khi bàn phím mở.

## 13. Approval Status
Implementation theo yêu cầu trực tiếp của PO; WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push; không tự cấp quyền tạo test data hoặc chứng nhận native acceptance.
