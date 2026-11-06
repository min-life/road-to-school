# AI Review — Thu gọn tiện ích Trang chủ khi kéo nhẹ

## 1. Task Information
Task: Sửa nền tiện ích Báo nghỉ/Đổi điểm đè avatar khi kéo chậm. Date:01/11/2026, Asia/Saigon. Mode: IMPLEMENTATION theo yêu cầu trực tiếp PO. Branch dongnnp/mobile/refactor-ui. Scope Mobile presentation/docs, local, chưa commit/push. Frontend implementation hoàn tất; native acceptance chưa xác minh.

## 2. Original Request
PO: nền thẻ tiện ích đè avatar khi kéo từ từ; yêu cầu kéo nhẹ là tự động nhảy lên luôn, không kéo thẻ từ từ.

## 3. Approved Scope
Giữ layout expanded/compact và các nút hiện có, chỉ thay cơ chế chuyển giữa hai trạng thái. Đã thông báo trước code: y>8 thu gọn ngay, y<=0 mở lại, nội dung theo header để không giữ khoảng trống. Không UI screen mới, API/backend/DB/dependency changes, không commit/push hoặc discard pending work. Không yêu cầu duyệt lại lựa chọn trình bày đã được PO chỉ định.

## 4. Analysis & Decisions
ParentHomeScrollView cũ bind Animated.Value trực tiếp contentOffset.y rồi nội suy top/left/right/height/background/shadow của utility card. Kéo chậm giữ mọi trạng thái trung gian nên nền có thể đi qua vùng avatar. Chọn hai bố cục cuối cố định, threshold8 chống chạm nhẹ; hysteresis giữ compact khi y>0, tránh bật/tắt quanh8. Không scrollTo cưỡng bức hoặc chặn cuộn body. Safe area và row/label measured heights giữ nguyên. Ui-ux-pro-max targeted UX search Reduced Motion/Motion Sensitivity phù hợp: bỏ parallax/animation kéo dài, giữ trạng thái cuối đọc được; không thêm dependencies.

## 5. Implementation Details
- mobile/components/parent/home-scroll-view.tsx: bỏ Animated.Value/interpolate/fade/useRef, dùng ScrollView/View và compact state. onScroll cập nhật binary rồi forward event cũ; headerHeight chi phối header+paddingTop, tiện ích/avatar/greeting chỉ dùng endpoint styles. COLLAPSE_THRESHOLD=8, minHeight viewport+9 đủ cho empty/short crossing, bỏ minHeight bằng toàn collapse distance.
- docs/architecture/mobile-parent-home-ui.md: thêm spec hiện hành, ngưỡng/thao tác/geometry/content/a11y/refresh/verification; thay cơ chế nội suy cũ nhưng không xóa lịch sử khác.
- docs/architecture/mobile-ui-implementation-status.md: cập nhật task và link spec.
- Archive review trước history/2026-11-01-before-home-utility-snap.md/.diff; LATEST.diff chỉ3files so với baseline đầu task. Không gom pending journey/schedule/OTP/search/FAB/env.

## 6. Database Changes
None. Không DB query/mutation, seeds, records test hoặc fake User/Student/Trip DTO/API responses. Interactive preview chỉ presentation props, counter callbacks và nội dung hình học trung tính.

## 7. API & Swagger Changes
None. NotificationBell production và onOpenLeave/onChangeStop/onScroll/onLayout/RefreshControl handlers giữ nguyên. Không đổi client, Home data fetching hoặc API permission/contract; Swagger không áp dụng.

## 8. UI/UX Changes
Expanded giữ avatar48/greeting/chuông và thẻ trắng+nhãn. Kéo y>8 chuyển ngay sang avatar scale0.8, utility top14+(rowHeight-48)/2,left/right76,height48, không shadow/nền trắng; greeting/nhãn ẩn. Header/content padding cùng chuyển, không intermediate background crossing. Compact giữ tới y<=0 rồi mở lại; negative pull-down vẫn expanded. Nút48, accessibility labels, single instances, greeting hidden a11y khi compact, safe top/left/right/max560 và measured font layout giữ nguyên. Không animation nên reduced-motion cũng tức thì. Body tiếp tục cuộn tự nhiên; không native snapTo/scrollTo. Refresh spinner offset expanded ở đầu trang giữ nguyên.

## 9. Verification & Testing
PASS npx --no-install tsc --noEmit sau app edit cuối, exit0.
PASS Expo export --platform all exit0: TEMP/rts-home-snap-export-8f464d3526ce4adfb7a0ee5c67baca04; iOS/Android/web bundles, không native app runtime.
PASS Chromium IAB interactive preview component logic/layout thực:390×844 y4/8→nút top120 (expanded), y11→top44 (compact), quay y8 vẫn44, y0→120. Utility background/avatar bounding boxes không giao nhau ở các điểm kiểm tra. Không overflow ngang. Báo nghỉ/Đổi điểm callbacks mỗi nút2lần ở hai states, chuông1lần.
PASS short320×568: max scroll9, compact tại9, về0 mở lại, không flicker/overflow hoặc kéo hết distance cũ mới collapse. Desktop1440×900 expanded/compact không overlap/overflow. Inset30 chỉ geometry thử nghiệm, không phải notch iOS UAT.
Preview dùng actual component copied vào ignored .expo path để bundle, notification presentation slot với counter và icon-font adapter; không mount auth/API/NotificationBell hooks, không fixtures nghiệp vụ. Harness Metro trực tiếp ban đầu lỗi resolver/SHA-1 trên Windows; chuyển sang Expo CLI export:embed có sẵn thì bundle thành công, không sửa config project để ép check. File entry/component tạm dưới .expo đã xóa, IAB tab closed/viewport reset, riêng Python server51614 đã dừng; Metro8081 của PO giữ nguyên. Screenshot TEMP/rts-home-utility-snap-preview.png.
PASS10protected hashes: Home index, journey/card/status/telemetry/API client, backend service, package/lock/env giữ nguyên. Scoped diff/whitespace review đạt. Không thêm unit tests chỉ lặp style; kiểm chứng interaction bằng preview thực. Project không có lint script, không cài linter.
NOT_VERIFIED: thao tác kéo tay/overscroll/pull-to-refresh native Expo iPhone/Android, Safari/Chrome mobile, Dynamic Type/VoiceOver và tích hợp authenticated navigation. Preview counters chỉ chứng minh callback wiring, không thay nghiệm thu routes/backend.

## 10. Issues & Risks
Hai trạng thái chuyển tức thì đúng yêu cầu; layout body đổi theo header nên có bước nhảy khi collapse/expand, không tween. Native scroll anchoring/refresh/bounce cần đối chiếu iPhone thực. Không khẳng định đã kiểm tra notch hoặc native gestures chỉ từ Chromium geometry. Không sửa phần hành trình hoặc các pending features khác.

## 11. Reviewer Focus
Kiểm tra kéo rất nhẹ ở đầu trang, vùng quanh8 và về0; utility background không đi qua avatar. Trang ngắn/empty vẫn vượt ngưỡng nhưng không tạo vùng kéo dài theo chiều cao thẻ cũ. Callback/refresh/scroll/layout/a11y và safe area giữ nguyên; diff chỉ presentation component+2docs, không ảnh hưởng nhánh staff.

## 12. Suggested Next Step
Reload Expo Go trên iPhone, kéo nhẹ Trang chủ lên rồi kéo về đầu để xác nhận cảm giác thu gọn/mở lại trên thiết bị thật.

## 13. Approval Status
Implementation theo yêu cầu trực tiếp PO; WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push; không mở rộng phạm vi API/DB hoặc tự chứng nhận native acceptance.
