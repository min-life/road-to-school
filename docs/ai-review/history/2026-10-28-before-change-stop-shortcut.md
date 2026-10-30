# AI Review — Collapsing Parent Home Header
## 1. Task Information
28/10/2026. Mobile UI + docs. IMPLEMENTATION, COMPLETED local; device limits below. Không commit/push.
## 2. Original Request
Header/tiện ích theo ảnh và hoàn toàn phong cách V1; cuộn đưa tiện ích ngang avatar. Chỉ style, không đổi nghiệp vụ.
## 3. Approved Scope
Home PARENT header/scroll và Tabs header visibility; giữ tất cả pending work. V1 chỉ đọc. Không API/DB/dependencies/Git writes. Hai ảnh giống nhau, compact dựa mô tả PO và V1 source.
## 4. Analysis & Decisions
Đọc AGENTS/docs/handoff/LATEST và Parent Home UI, V1 home screen/layout/headers, xem hai ảnh. Dùng ui-ux-pro-max guidelines đã đọc trong session. Wireframe expanded/compact trình bày trước code, triển khai theo chỉ thị PO. Giữ Báo nghỉ/Làm mới V2; không thêm Đổi điểm/Báo cáo từ mockup. Single-instance controls tránh chồng vùng bấm/accessibility khi fade.
## 5. Implementation Details
Thêm mobile/components/parent/home-scroll-view.tsx; sửa mobile/app/(tabs)/index.tsx và _layout.tsx. Component sở hữu Animated.ScrollView, đo row/label/viewport, safe inset, avatar/fallback và header. Chỉ ẩn navigator header index/PARENT; utility cũ giữ cho staff. Body Home không đổi. Mở rộng guide mobile-parent-home-ui, cập nhật navigation/status/handoff. Archive LATEST cũ. Xóa preview entry tạm khỏi repo.
## 6. Database Changes
None. Không truy vấn/ghi DB hoặc tạo dữ liệu để test.
## 7. API & Swagger Changes
None. onOpenLeave dùng route cũ, onRefreshAction callback cũ, NotificationBell/unread và API contexts giữ nguyên. Không POST/login/OTP.
## 8. UI/UX Changes
Expanded: avatar từ user, lời chào/tên, phụ đề, chuông; thẻ trắng bo16 với2 nút tròn vàng nhạt. Compact: avatar nhỏ, tiện ích/chuông ngang hàng, greeting/nhãn fade. Single controls, no duplicate links. Safe inset một lần, max560, font row/label đo thực tế, content padding theo expanded height, short-page scroll travel, giữ pull-to-refresh và offset spinner. Cuộn về đầu restore. Header/role khác không đổi. Chỉ thị PO là căn cứ implement; chưa có nghiệm thu UI riêng.
## 9. Verification & Testing
PASS Mobile npx --no-install tsc --noEmit. PASS Expo export all iOS/Android/Web/server ngoài repo. PASS static parity API/useEffect/useCallback/useActiveRefresh/quick-leave bodies từ baseline task; toàn bộ body Home JSX không đổi. PASS git diff --check.
PASS Chromium IAB isolated actual component, no business records/API:375px expanded actions top120, bell top44; compact cả3 top44, target48; clicks2 gọi local callbacks đúng2; scroll-up restores greeting/card. 320px controls không đè nhau, no horizontal overflow và restore. Safe top30 là harness geometry; avatar fallback only, notification slot inert. Đây không phải authenticated/native UAT. Preview entry/tab/server đã dọn.
NOT_VERIFIED: iPhone/Android/Safari iOS/Chrome Android, native refresh, real avatar/network fallback, Dynamic Type/reduced motion và session/Trip runtime. Mobile không có lint script/config; không cài thêm. Không tạo dữ liệu/phiên test; nghiệp vụ thiếu dữ liệu vẫn NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY.
## 10. Issues & Risks
Chưa nghiệm thu scroll/refresh trên iPhone; animation JS driver như V1. Hai ảnh gửi trùng nhau, hình compact dùng source V1/mô tả PO. Inconsistency route lịch tuần rỗng có trước vẫn giữ. Không thêm ba nút nghiệp vụ để khớp ảnh. Cần xác minh native font/accessibility/performance với dữ liệu hợp lệ.
## 11. Reviewer Focus
Header ownership/safe inset/refresh offset, short-content scroll, single controls/hitboxes, greeting accessibility, callbacks/body preservation; giữ mọi pending changes khác. LATEST.diff chỉ thay đổi source task này so snapshot trước task.
## 12. Suggested Next Step
PO kiểm tra cuộn xuống/lên và kéo làm mới trên iPhone Expo.
## 13. Approval Status
Implementation theo yêu cầu PO; WAITING FOR USER REVIEW / APPROVAL cho nghiệm thu. Không commit/push.
