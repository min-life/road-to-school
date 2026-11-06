# AI Review — Nút + nổi cho Báo nghỉ và Đổi điểm

## 1. Task Information
Task: Thay nút tạo chữ ở lịch sử Báo nghỉ/Đổi điểm bằng dấu+ theo style Theo dõi. Date:01/11/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: UI implementation. Status: COMPLETED source/static/build/presentation; native acceptance NOT_VERIFIED.

## 2. Original Request
PO yêu cầu thêm nút+ tạo mới ở trang Báo nghỉ và báo Đổi điểm, style như trang Theo dõi; bỏ Tạo báo nghỉ mới và Tạo yêu cầu đổi điểm dạng chữ.

## 3. Approved Scope
Hai trang lịch sử root; dùng style Floating Action Button (FAB) thật của Theo dõi. Đã mô tả bố cục trước code: một nút tròn vàng góc dưới phải, không giữ nút tạo trùng ở header/empty, chừa content inset. Tái sử dụng component chung, không đổi nghiệp vụ/route/API/DB/dependency. Theo dõi chỉ chuyển phần presentation sang component chung. Các RequestListView mặc định riêng từng con giữ UX cũ. Không commit/push; bảo vệ toàn bộ pending work.

## 4. Analysis & Decisions
Theo dõi dùng FAB vàng58×58/bo29, add32, right20/bottom16, shadowOpacity.25/radius8/elevation6. Hai trang mục tiêu đã có dấu+ nhỏ ở header và CTA chữ trong empty; chuyển thành một FAB duy nhất để giống nguồn tham chiếu. Dùng chung FloatingAddButton để không duplicate style. Trang không có tab bar thêm insets.bottom/right cho nút và90px clearance cho scroll/list/footer. Theo dõi giữ offset/layout tab cũ. Không tạo route hoặc thay handler eligibility.

## 5. Implementation Details
- mobile/components/navigation/floating-add-button.tsx (mới): FloatingAddButton(label,onPress,disabled?,bottom?,right?), defaults bottom16/right20. Export FLOATING_ADD_CONTENT_INSET=90. Style từ Theo dõi, thêm role/disabled state và icon decorative hidden.
- mobile/app/(tabs)/tracking.tsx: thay local FAB bằng shared component, giữ handleAddPress/label và offsets; dùng constant90 cho list/empty clearance, bỏ local fab styles hết dùng. Empty/link/card/unlink vẫn nguyên.
- mobile/app/leave-notices/index.tsx: bỏ HeaderAction add và empty CTA Tạo báo nghỉ mới cùng styles hết dùng. Thêm FAB Tạo báo nghỉ sau ScrollView, route/selectedStudentId giống callback cũ; paddingBottom=insets.bottom+90.
- mobile/components/parent/RequestListView.tsx: khi appearance=leave-history, bỏ header action và empty CTA, thay FAB luôn hiện ngoài state/list. Giữ handleCreateRequest và disabled guard. List/state ScrollView chừa bottom+90. Appearance default vẫn header/empty CTA và padding24 như cũ, không ảnh hưởng lịch sử thông tin/địa chỉ riêng từng con.
- docs/architecture/mobile-parent-stop-requests.md và mobile-ui-implementation-status.md: source/props/offset/route/guard/phạm vi, ghi rõ CTA/header30/10 là lịch sử bị thay thế.
- Archive report trước tại history/2026-11-01-before-history-floating-add.md/.diff. LATEST.diff chỉ6files theo baseline task, không gom pending UI/forms/OTP/search trước đó.

## 6. Database Changes
None. Không đọc/ghi DB hoặc tạo records/seed/challenges.

## 7. API & Swagger Changes
None. No API client/contract/Swagger changes. Không gọi POST/mutation hoặc fake data để kiểm thử. Hành động tạo chỉ điều hướng tới form hiện có, không tự gửi yêu cầu.

## 8. UI/UX Changes
Nút tròn vàng58, icon32, shadow và pressed opacity.85 đồng nhất Theo dõi. Báo nghỉ/Đổi điểm root chỉ còn một visible create control ở bottom/right safe area; text tên hành động vẫn tồn tại dưới dạng accessibilityLabel. Empty state giữ icon/title/description nhưng không có CTA chữ. Loading/error/empty/list đều thấy FAB; default RequestListView không đổi. Clearance90 giúp last item/footer có thể cuộn qua vị trí FAB. Không thêm input/keyboard/animation. Back/filter/status/card/pagination/cancel/link và fixed student context giữ nguyên.

## 9. Verification & Testing
PASS: Mobile npx --no-install tsc --noEmit exit0 sau final application edits.
PASS: Expo export --platform all exit0, TEMP/rts-history-floating-add-export-604cecca21c54bb08a5b06c8b3bbcfa3, log cùng prefix+.log; không application edits sau typecheck/build.
PASS static AST/source:13 declarations giữ nguyên theo task-start:4Tracking handlers/data,5Leave fetch/refresh/cancel/status/options,4Request fetch/create/status/renderRequestItem. Style comparison object xác minh shared button giữ toàn bộ original Tracking FAB properties; right20/bottom16 chuyển thành prop defaults. Leave CTA chữ đã bỏ, selected-child route params giữ nguyên.
PASS:11protected SHA256 gồm các form/OTP/picker/API/history service/package/lock/.env.example giữ đúng task-start snapshot. Scoped whitespace, module links và13sections review.
PASS presentation-only Chromium IAB: actual Header/FAB và empty-state JSX/styles của hai trang, callback no-op, không mounted data/auth hooks hoặc fake API/records.390×844 hai trang chỉ có Back + một FAB; FAB58×58, bottom50 khi truyền inset34.320×568: FAB58, right20/bottom50, không overflow ngang; desktop1440×900 không overflow. Preview không bao gồm status filters/data cards; không chứng nhận full route/auth/navigation. Screenshot TEMP/rts-history-floating-add-preview.png. Tab đóng, viewport reset, server51614 riêng dừng; không động Metro của PO.
Hygiene: first edit wrapper đặt nhầm quanh item đã được phát hiện bằng diff và sửa trước typecheck; renderRequestItem final text parity PASS. Static style script ban đầu parse object literal thiếu ngoặc, harness import relative thiếu alias; đã sửa harness ngoài repo, không sửa app để ép checks. Không thêm unit tests mirror style cho thay đổi presentation này. Mobile không có lint script.
NOT_VERIFIED: native Expo Go iPhone/Android hit testing/safe area/VoiceOver, full populated list/footer scroll và route actions trong phiên có xác thực. Không fake requests hoặc gọi mutation để test. Layout/style preview không thay UAT.

## 10. Issues & Risks
Scope FAB của RequestListView dựa appearance=leave-history, hiện chỉ root Đổi điểm dùng. Các lịch sử riêng từng con/default không tự chuyển FAB ngoài phạm vi yêu cầu. Safe-area logic dựa insets thực khi chạy native, preview chỉ truyền34 để đo offset. Populated footer navigation/disabled profile cần native/auth UAT; handler/source giữ nguyên nhưng không tuyên bố runtime đã nghiệm thu. Pending .env.example/cache và các task trước giữ nguyên.

## 11. Reviewer Focus
Đối chiếu style+size với Tracking reference, đảm bảo chỉ có một điểm tạo trên hai trang root; labels truy cập đúng dù text CTA bỏ. Kiểm tra selectedStudentId/handleCreateRequest guard/default appearance không đổi. Đảm bảo clearances ở cả state ScrollView và populated FlatList/footer, không che cancel/detail/pagination. Không đổi API, filters hoặc renderRequestItem; diff task-only và pending work được bảo toàn.

## 12. Suggested Next Step
Trên Expo Go iPhone, mở Báo nghỉ/Đổi điểm rồi dùng dấu+ để kiểm tra đúng form và cuộn tới cuối danh sách.

## 13. Approval Status
Implementation theo yêu cầu trực tiếp PO; WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push, không tự chứng nhận native acceptance hoặc cấp quyền tạo dữ liệu test.
