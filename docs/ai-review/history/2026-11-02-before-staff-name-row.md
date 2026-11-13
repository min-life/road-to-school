# AI Review — Home Staff dùng card thu gọn của Parent

## 1. Task Information
02/11/2026 Asia/Saigon. IMPLEMENTATION follow-up. Source hoàn tất; native/authenticated acceptance NOT_VERIFIED. Bảo toàn pending shared Schedule task; không commit/push.

## 2. Original Request
PO làm rõ đang hỏi card Home, muốn đồng bộ với Parent. Qua câu hỏi tùy chọn, PO chọn Thu gọn/mở rộng giống Parent, giữ đủ xe, nhân sự, điểm danh và nút vận hành.

## 3. Approved Scope
Dùng chính ParentTripCard đã có làm mẫu/interface tương tác cho Driver/Attendant, giữ Parent mặc định và toàn bộ dữ liệu/actions Staff. PO đã chọn trực tiếp mẫu Parent và kiểu disclosure; không tạo thiết kế hoặc animation mới.

## 4. Analysis & Decisions
Staff card cũ dùng viền trái/tô summary riêng và mở toàn bộ. Reuse ParentTripCard sở hữu disclosure/animation/reduced motion/chevron/responsive layout. Thêm optional slots leading/summaryContent và optional accessibilityLabel cho nội dung Staff, không tạo wrapper/component trùng. Parent không truyền props mới nên giữ avatar/label/bố cục cũ. Staff vẫn truyền routeName vào display-name prop hiện hữu studentName của component trình bày, không thay DTO học sinh.

## 5. Implementation Details
- mobile/components/parent/trip-card.tsx: optional leading fallback UserAvatar nguyên bản; summaryContent dưới trường; accessibilityLabel fallback giữ nguyên biểu thức Parent. Không sửa state/effect/animation/StyleSheet.
- mobile/components/staff/staff-trip-card.tsx: root ParentTripCard keyed theo trip.id để reset disclosure khi đổi chuyến; bus leading và tags chiều/giờ vào summary slot, nhãn a11y gồm chiều/giờ. Body nghiệp vụ giữ nguyên; bỏ card/header styles riêng và padding body16 vì details Parent đã padding16.
- Home caller/props contract không đổi; không chuyển staff data vào Parent route hoặc hook. Schedule pending không thay.
- docs/architecture/mobile-staff-trip-card-ui.md current addendum; LATEST.md/.diff task-only hai source files, archive trước history/2026-11-02-before-home-card-parent-disclosure.md/.diff.

## 6. Database Changes
None. Không seed, record giả hoặc mutations.

## 7. API & Swagger Changes
None. Không đổi API/permissions/DTO hoặc gọi side effects để test.

## 8. UI/UX Changes
Card Staff bắt đầu thu gọn như Parent: bus, tên tuyến, trạng thái, trường, chiều/giờ và chevron. Mở card thấy xe, số chỗ/HS, tài xế/phụ xe/nhãn Bạn, readiness/điểm danh và CTA/Báo nghỉ như cũ. Viền, padding, disclosure animation và reduced-motion dùng chính Parent. Màn hẹp tự stack theo logic Parent. Parent visual/a11y defaults giữ nguyên; nội dung ẩn khỏi focus/accessibility khi thu gọn theo Parent.

## 9. Verification & Testing
PASS TypeScript --noEmit trên source cuối.
PASS source/AST parity Staff: toàn bộ body JSX (bindings/conditional/readiness/count/actions/disabled), tags và tính status/label trước return giống baseline. PASS Parent: toàn bộ state/effects trước return, StyleSheet, UserAvatar subtree và a11y-label fallback giống baseline.
PASS Chromium real ParentTripCard có leading/summaryContent: collapsed→expanded→collapsed, nhãn tên dài và breakpoint390x844/320x640; collapsed content không còn trong DOM visible text, không tràn ngang (320px clientWidth=scrollWidth=320). Preview chỉ display props/string từ ảnh và nội dung placeholder, không MobileHomeTrip/User/Student records hoặc mock API; không chứng minh full StaffTripCard data integration.
PASS Expo export --platform web gồm web/server bundles exit0, output ngoài repo staff-home-parent-disclosure-export. PASS git diff --check.
Không thêm tests mirror extraction hoặc chạy lại nghiệp vụ không đổi. Preview tạm xóa, tab đóng, viewport reset; giữ Metro có sẵn. Native/full operation states/font scaling/Báo nghỉ/Parent visual regression trên thiết bị NOT_VERIFIED; integration thiếu session/dữ liệu được cấp BLOCKED_BY_TEST_DATA_POLICY.

## 10. Issues & Risks
Muốn thao tác vận hành/Báo nghỉ phải mở card, theo lựa chọn PO. Shared disclosure thay đổi về sau tác động cả Parent và Staff; nên nghiệm thu cả ba vai trò. Header dài có thể xuống dòng, không cắt tên. Không dependency mới/commit/push.

## 11. Reviewer Focus
Staff thật sự render ParentTripCard, không sao chép animation/styles. Props mới optional, Parent fallback giữ nguyên. Body handlers/guards và pending Schedule source không đổi; trip.id key tránh giữ trạng thái mở của chuyến trước.

## 12. Suggested Next Step
PO reload Home Driver/Bus Attendant và chạm card để nghiệm thu thu gọn/mở rộng trên thiết bị.

## 13. Approval Status
PO chọn trực tiếp Thu gọn/mở rộng giống Parent. Source hoàn tất và checks PASS, chờ native acceptance.
