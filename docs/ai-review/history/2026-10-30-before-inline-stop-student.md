# AI Review — Style Đổi điểm theo Báo nghỉ

## 1. Task Information
Task: Đồng bộ style Đổi điểm đón/trả với Báo nghỉ, đặc biệt vị trí CTA. Ngày: 30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: UI styling. Status: COMPLETED frontend; native acceptance NOT_VERIFIED.

## 2. Original Request
PO yêu cầu trang Đổi điểm đón/trả có style như Báo nghỉ, giữ nguyên mọi nội dung/thao tác; nhất là vị trí nút Tạo yêu cầu đổi điểm phải giống Tạo báo nghỉ mới.

## 3. Approved Scope
Chỉ restyle trang lịch sử Đổi điểm theo bố cục tham chiếu Báo nghỉ mà PO chỉ định. Giữ bộ lọc5trạng thái, tên con, nội dung/kết quả yêu cầu, ngày giờ, Chi tiết, loading/error/refresh, total/pagination và luồng tạo-chọn con-form/OTP. Dùng variant opt-in để không áp style sang các route yêu cầu riêng. Chỉ local, không commit/push hoặc DB/dependency/API changes. Các pending work trước được bảo toàn.

## 4. Analysis & Decisions
Báo nghỉ có AppHeader/dấu +, filters padding12×5, nội dung padding16; empty paddingVertical60/gap8 bên trong ScrollView, CTA ngay dưới mô tả. RequestListView trước đó dùng custom header và centerBox flex1 căn giữa toàn vùng còn lại nên CTA bị thấp. Chọn appearance leave-history cho riêng change-stop; không đổi service/handlers. Giữ mô tả ngắn hiện có; đặt minHeight mô tả bằng hai dòng18×fontScale để CTA khớp vị trí với mô tả hai dòng của Báo nghỉ. Không hardcode y353 trong production; số này chỉ là phép đo preview inset0. Khi chữ lớn/nội dung dài, khung tăng và cuộn.

## 5. Implementation Details
Sửa mobile/app/parent/change-stop.tsx: thêm appearance="leave-history". Sửa mobile/components/parent/RequestListView.tsx: optional appearance default; opt-in AppHeader/HeaderAction, style overrides filter/card/footer/pagination; stateContent giữ đủ loading/error/empty, ở variant nằm trong ScrollView có refresh/inset. Giữ default header/layout và không áp variant cho route riêng. Thêm mobile/constants/request-history-styles.ts chứa style tương ứng Báo nghỉ.
Sửa docs/architecture/mobile-parent-stop-requests.md: appearance contract, layout/CTA/scroll/fontScale và verification; sửa mobile-parent-home-ui.md để tra cứu. Task-only LATEST.diff gồm5files theo baseline, không kéo logic aggregate/task xóa description cũ vào. Archive review/diff trước tại history/2026-10-30-before-stop-history-style.md/.diff.

## 6. Database Changes
None. Không truy vấn/mutate DB, seed, mock records hoặc chạy SQL/migrations.

## 7. API & Swagger Changes
None. API client/backend/contracts/Swagger và service gộp history giữ nguyên. Không thêm request hoặc sửa luồng OTP/duyệt/hủy.

## 8. UI/UX Changes
Header/back/dấu + cùng component/kích thước/safe area như Báo nghỉ. HeaderAction giữ accessibilityLabel Tạo yêu cầu đổi điểm và handleCreateRequest; empty CTA giữ nguyên nhãn đầy đủ. Filters giữ năm trạng thái, horizontal scroll ẩn indicator. Empty: icon64/title16/subtitle12-18/gap8/paddingVertical60; nút vàng bo12 nằm dưới mô tả, không căn giữa viewport. Vùng mô tả tối thiểu2dòng theo fontScale, không cắt chữ hoặc đặt nút tuyệt đối.
Card bo16/padding16/gap12/shadow0.04, địa chỉ nền phụ; giữ tên con/type/status/summary/resolution/date/detail. Footer/pagination wrap khi hẹp, giữ Trước/Sau/total. Chỉ variant của change-stop đổi style; route riêng mặc định giữ kiểu cũ. Không thêm input/animation hoặc thay nghiệp vụ. Wireframe: PO chỉ định tham chiếu và vị trí, đã thông báo bố cục trước sửa; không dừng hỏi lại cho restyle trực tiếp này.

## 9. Verification & Testing
PASS: final Mobile npx --no-install tsc --noEmit exit0.

PASS: Expo export all iOS/Android/Web/server exit0, TEMP/rts-parent-stop-style-export; log TEMP/rts-parent-stop-style-export.log. Chạy sau bổ sung fontScale/minHeight; sau export chỉ thu hẹp điều kiện opacity về variant (không logic/data) và final tsc đã chạy lại. Warning NO_COLOR/FORCE_COLOR không chặn build.

PASS: Chromium IAB isolated layout SSR từ JSX/style empty thật của hai file + AppHeader/HeaderAction thật bằng React Native Web, Ionicons glyph/font thật; không mount screen/controller/API hoặc tạo business fixtures. Insets0 là geometry preview, không notch nghiệm thu.390px CTA Leave/Stop cùng y353,h40, căn giữa, khác bề ngang theo nhãn.320px đối chiếu tuần tự cùng viewport: cả hai y353, không overflow ngang.1440px Stop không tràn ngang, CTA y353. Không dùng phép đo này làm fixed coordinate.

Preview ban đầu thiếu showsHorizontalScrollIndicator=false (không phải code production), tạo thanh cuộn cao15px; đã sửa harness đúng prop nguồn rồi reload/đo lại. MinHeight mô tả xử lý chênh1/2dòng. Screenshot cuối390px: C:/Users/phuon/AppData/Local/Temp/rts-stop-history-style-390.png. Tab đã đóng, viewport reset, server51607 riêng dừng; không tạo preview route trong repo.
PASS: AST3controllers fetchRequests/handleCreateRequest/getStatusBadge giữ byte-identical; item fields/API call counts/pagination actions và5status labels giữ. SHA25612protectedfiles giữ, gồm Báo nghỉ, service history, selector, Home, profile pending, form/OTP/API/routes riêng/package/lock. Diff/whitespace và module links kiểm tra.
NOT_VERIFIED: authenticated list/card population và navigation end-to-end, Expo Go iPhone/Android, native VoiceOver/Dynamic Type/Safari/Chrome mobile. Không chạy fake API/records/mutation để ép PASS. Không viết unit test mirror styling; Mobile chưa có lint script.

## 10. Issues & Risks
Preview chỉ chứng minh layout empty/header/filter, không thay nghiệm thu card có dữ liệu hoặc native font metrics. Mô tả/tiêu đề dài hoặc font lớn có thể tăng chiều cao; giữ cuộn và không hứa pixel y cố định trên mọi thiết bị. Rủi ro gộp nhiều GET/offset pagination từ task trước không đổi. Không chỉnh source Báo nghỉ hoặc service để phục vụ style.

## 11. Reviewer Focus
CTA đúng vị trí trong document flow, hai entry create dùng cùng callback/guard, không bị mất nhãn empty hoặc các trạng thái/filter/data fields/pagination. Variant chỉ bật ở change-stop, default routes vẫn như trước. Kiểm tra safe area một lần, scroll khi state cao, dynamic fontScale và minHeight2dòng không clip chữ. Native/records UAT chưa được báo PASS.

## 12. Suggested Next Step
Mở Đổi điểm đón/trả và Báo nghỉ trên Expo Go iPhone để đối chiếu CTA và kiểm tra lịch sử thực tế.

## 13. Approval Status
Implement theo yêu cầu trực tiếp của PO. WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push task này, không tự đánh dấu nghiệm thu thiết bị.