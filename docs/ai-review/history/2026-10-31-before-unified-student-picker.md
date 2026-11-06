# AI Review — Nút gọi điện trong thông tin chuyến

## 1. Task Information
Task: Icon gọi điện thay số điện thoại trong tab Thông tin chuyến. Date: 31/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: Frontend implementation. Status: COMPLETED frontend; native dialer acceptance NOT_VERIFIED.

## 2. Original Request
PO yêu cầu bỏ hiển thị số điện thoại ở tab Thông tin sau Theo dõi lộ trình; thay nút icon điện thoại mở bàn phím gọi để phụ huynh liên hệ trực tiếp. Nếu không có số thì báo lỗi.

## 3. Approved Scope
Chỉ thay cách trình bày/thao tác liên hệ hai nhân sự trong tab hiện có. Giữ role/name/vehicle/permissions và toàn bộ map, navigation, polling/attendance/business logic. Dùng Linking có sẵn; không dependency/backend/API/schema/native config changes. User đã chỉ định hành vi/bố cục nhỏ, không màn hình mới cần wireframe mới. Local, không commit/push; giữ pending work trước.

## 4. Analysis & Decisions
driverPhone/busAttendantPhone đã có trong MobileTripDetail và lấy từ nhân sự assigned của Trip. Xóa dòng số/nhãn/chưa cập nhật và đưa icon48 bên phải tên. Khi nhấn mới validate số, thiếu số vẫn là nút enabled để hiện lỗi đúng yêu cầu. Số hợp lệ dùng tel: qua React Native Linking.openURL, bàn giao cho ứng dụng/hệ điều hành. Đã đối chiếu installed RN source: Android IntentModule dùng ACTION_VIEW, iOS RCTLinkingManager gọi UIApplication openURL. Không dùng ACTION_CALL hoặc thêm quyền gọi. Không canOpenURL gây yêu cầu thêm platform query config; xử lý reject từ openURL.

## 5. Implementation Details
Sửa mobile/app/trip/[id].tsx: import TripContactCallButton, thay đúng hai phone rows bằng nút dùng driverPhone/busAttendantPhone, text identity minWidth0, xóa3styles hết dùng.
Thêm mobile/components/trip-contact-call-button.tsx: phone/contactLabel props, missing/invalid/platform error Alerts, opening state/ref, Pressable48 và a11y. Thêm mobile/utils/phone-link.ts và mobile/scripts/phone-link.test.ts. Cập nhật docs/architecture/mobile-trip-contacts.md để thay mô tả số/sao chép cũ bằng call handoff. LATEST.diff chỉ5files theo baseline. Archive review trước tại history/2026-10-31-before-trip-contact-call.md/.diff.

## 6. Database Changes
None. Không truy vấn/sửa DB, SQL/migrations/seed hoặc thay số liên hệ, không tạo User/Trip/Student fixtures.

## 7. API & Swagger Changes
None. Backend/API client/contract/Swagger và request cadence không đổi. Hai nút dùng trường số hiện có của nhân sự assigned, không lấy tuyến mặc định hoặc guardian phone. Nút không gọi API nghiệp vụ, timer/polling không đổi.

## 8. UI/UX Changes
Thông tin: giữ vai trò/tên/vehicle, xóa text số và nhãn Số điện thoại. Nút tròn vàng/call-outline20 bên phải, touch48×48, text tên wrap và minWidth0; không ellipsis hoặc đổi safe area/sheet/scroll. Thiếu số/null/undefined/whitespace → Alert Không có số điện thoại + contact role. Số không hợp lệ → Alert Số điện thoại không hợp lệ. openURL thất bại → Alert Không thể mở bàn phím gọi điện. Chỉ báo lỗi khi nhấn.
Valid phone → normalized tel URI, giữ0/+ và country prefix, bỏ display separators; reject arbitrary URL/letters/USSD/command/query chars, không tự chuyển đầu số. Busy spinner/disabled và ref chặn nhấn liên tiếp; missing number không disabled. AccessibilityLabel Gọi tài xế phụ trách/Gọi giáo viên phụ xe, hint mở bàn phím gọi, busy/disabled đúng. Không hiện số qua label/log/error popup. Các vai trò có quyền xem tab cũ vẫn được dùng như trước; hệ điều hành quyết định ứng dụng/xác nhận handoff cụ thể.

## 9. Verification & Testing
PASS: final mobile npx --no-install tsc --noEmit exit0.
PASS:7 pure node:test phone-string cases (missing/leading0/international+/formatting/invalid punctuation/text/command/query) exit0; TypeScript transpiled into TEMP, no records/API/device dialer.
PASS:5 production-handler checks extracted by AST into isolated VM, only primitive strings/native-opener and Alert in-memory mocks: missing phone never opens, invalid URL never opens, valid normalized tel forwarded once/busy cleared, platform reject alerts/clears busy, double tap during pending opener calls once. TEMP/rts-trip-contact-call-handlers.test.cjs. No fake business responses or actual call.
PASS: Expo export all iOS/Android/Web/server exit0, TEMP/rts-trip-call-button-export; log TEMP/rts-trip-call-button-export.log. Warning NO_COLOR/FORCE_COLOR không chặn build.
PASS: AST28 original function/memo declarations giữ byte-identical; vehicle card giữ, đúng2button mappings, contact phone rows/styles removed.10protectedfiles SHA256 giữ API/backend/maps/avatar/prior Leave/Đổi điểm/package/lock/app.json. Whitespace/task diff/module links/13sections checked.
NOT_VERIFIED: native iPhone/Android dialer handoff/OS prompts, absence of OS phone handler, UI rendering/VoiceOver/large text on device, authenticated navigation and real calls. Không mở tel thật hoặc gọi điện để kiểm thử; không browser UI preview trong task này. Mobile chưa có lint script.

## 10. Issues & Risks
Khả năng nhận tel link và UX xác nhận phụ thuộc thiết bị/hệ điều hành/ứng dụng mặc định; không bảo đảm desktop hoặc simulator có trình gọi. Nếu Linking reject đã có Alert, nhưng OS behavior cần UAT. Utility chỉ chấp nhận phone display formats, không USSD/extension commands; malformed stored number báo lỗi thay vì tự đoán. Nút thiếu số vẫn nhấn được có chủ đích. Không phát hiện lỗi type/build/test.

## 11. Reviewer Focus
Ẩn số trong Text nhưng vẫn ghép đúng assigned driver/attendant phone. Missing remains tappable with error; no auto dial on mount or opening tab. Validate raw phone before tel handoff/no unexpected URL command. Busy/ref/finally và native error handling. Preserve all map/controller/permission logic and existing pending work; không đòi quyền native/cài package hoặc gọi điện thật trong tests.

## 12. Suggested Next Step
Trên Expo Go iPhone, mở tab Thông tin và kiểm tra nút đưa đúng số vào ứng dụng Điện thoại; chưa cần bấm xác nhận gọi.

## 13. Approval Status
Implementation theo yêu cầu trực tiếp của PO. WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push hoặc tự thực hiện cuộc gọi.
