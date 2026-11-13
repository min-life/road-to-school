# AI Review — Đồng bộ hàng tab map Staff với Parent

## 1. Task Information
01/11/2026 Asia/Saigon. Mobile Trip detail UI follow-up. Source COMPLETED; native acceptance NOT_VERIFIED.

## 2. Original Request
PO chỉ ra các tab trong sheet map Staff vẫn chưa giống Parent, trong phạm vi đã duyệt đồng bộ map và giữ chức năng theo vai trò.

## 3. Approved Scope
Chỉnh hàng tab Driver/Bus Attendant theo Parent hiện tại; giữ bốn tab, bộ đếm, handlers và quyền riêng. Parent giữ nguyên. Không mở rộng sang card, marker, backend hoặc footer.

## 4. Analysis & Decisions
Parent dùng ba ô chia đều trong View cố định; Staff dùng ScrollView ngang bốn tab với padding/font riêng, làm Sự cố nằm ngoài khung. Staff dùng lại tabBarParent, tabButtonParent, tabButtonTextParent, thêm ba style nhỏ dành riêng Staff để co và xuống dòng nhãn. Không thêm component hoặc dependency.

## 5. Implementation Details
- mobile/app/trip/[id].tsx: Staff ScrollView thành View, dùng style Parent; minWidth0, text flexShrink và center, alignItems stretch để gạch chân cùng đáy khi nhãn xuống dòng.
- Parent JSX và các style Parent hiện có không đổi. Staff callback và count expressions giữ nguyên.
- docs/architecture/mobile-staff-map-alignment.md: thêm cập nhật tab; LATEST.diff chỉ chứa thay đổi source task này từ working baseline, không trộn pending work trước đó.
- Archive báo cáo trước tại history/2026-11-01-before-staff-map-tabs.md/.diff.

## 6. Database Changes
None. Không seed, thay bản ghi hoặc tạo Trip/User/Student giả.

## 7. API & Swagger Changes
None. Không API calls hoặc payload/permission changes.

## 8. UI/UX Changes
Bốn tab Thông tin, Điểm đón, Điểm danh, Sự cố cùng hàng chia đều, dùng typography/spacing/gạch chân Parent. Không cần vuốt ngang; màn hình hẹp xuống dòng giữ đủ tên và bộ đếm. Parent vẫn ba tab gốc.

## 9. Verification & Testing
PASS TypeScript app --noEmit sau source edit.
PASS Expo export --platform web, gồm web/server bundles, exit0; output ngoài repo: staff-map-tabs-export.
PASS Chromium RN-web preview390x844 và320x640; cả bốn nhãn thấy được, chuyển INFO/STOPS/ATTENDANCE/INCIDENTS đúng state;320px clientWidth=scrollWidth=320.
Preview trích chính JSX/style từ source bằng TypeScript AST; chỉ thay biểu thức bộ đếm bằng số nguyên hiển thị từ ảnh PO, không tạo business record hoặc mock API. Preview không tải map/Trip/auth. File preview tạm đã xóa, tab đóng, viewport reset; server đang có giữ nguyên.
PASS source assertions: Parent tab branch giống baseline; Staff callbacks/count expressions giữ nguyên; phần nội dung và operations sau tab bar giữ nguyên. Source diff chỉ layout tab Staff.
Không thêm test mirror style; tests marker/footer không cần chạy lại vì task không chạm các phần đó. Full native và authenticated Trip NOT_VERIFIED; integration cần dữ liệu/quyền thật BLOCKED_BY_TEST_DATA_POLICY.

## 10. Issues & Risks
RN-web không chứng minh font metrics/touch layout Android/iOS. Font lớn hoặc bộ đếm dài có thể làm hàng tab cao hơn để giữ đủ chữ. Không commit/push.

## 11. Reviewer Focus
Parent branch nguyên vẹn; Sự cố hiện cùng ba tab còn lại; Điểm danh và bộ đếm vẫn giữ; không có thay đổi operations/capabilities.

## 12. Suggested Next Step
PO reload app và nghiệm thu hàng tab Driver/Bus Attendant trên thiết bị.

## 13. Approval Status
Follow-up trong phạm vi map UI đã được PO duyệt; hoàn tất source và kiểm tra an toàn. Native acceptance WAITING FOR USER REVIEW.
