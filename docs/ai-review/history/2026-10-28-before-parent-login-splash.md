# AI Review — Tiện ích Đổi điểm
## 1. Task Information
28/10/2026. Mobile + docs. IMPLEMENTATION. COMPLETED local, pending device/data UAT. Chưa commit/push.
## 2. Original Request
Thêm nút Đổi điểm ở thẻ tiện ích phụ huynh.
## 3. Approved Scope
Thêm shortcut thực sự dùng luồng V2, giữ Báo nghỉ/Làm mới và toàn bộ pending work. Không sửa API/DB/schema/dependencies hoặc Git commit/push.
## 4. Analysis & Decisions
Đọc AGENTS/docs/handoff/LATEST, rà Student Detail, address-request list/create và header. Existing flow cần studentId, nên thêm bộ chọn con riêng; không chọn từ home trip cards vì sẽ bỏ sót con chưa có chuyến. Dùng quy tắc AVAILABLE như Student Detail. Bố cục và flow đã trình bày trước code, theo yêu cầu implement của PO.
## 5. Implementation Details
Sửa home-scroll-view.tsx thêm onChangeStop và action location-outline giữa2 nút cũ; index.tsx nối /parent/change-stop. Thêm parent/change-stop.tsx với GET getLinkedStudents, loading/error/retry/empty/link, focus refresh và stale-response guard; chọn con mở /parent/update-requests/address/[studentId]. Cập nhật guide Parent Home và handoffs; archive report trước task. Không sửa màn requests/OTP.
## 6. Database Changes
None. Không đọc/ghi DB, seed, records hoặc session test.
## 7. API & Swagger Changes
None. Chỉ tái sử dụng GET đã có; không endpoint/contract mới, không mutation để test.
## 8. UI/UX Changes
Expanded/compact đủ Báo nghỉ/Đổi điểm/Làm mới; target48. Bộ chọn mới có AppHeader/scroll list, status disabled, tên/trường wrap và inset đáy. Bộ chọn không đổi dữ liệu; giữ luồng yêu cầu/duyệt hiện có. Chưa có nghiệm thu UI riêng của PO.
## 9. Verification & Testing
PASS Mobile npx --no-install tsc --noEmit. PASS Expo export all iOS/Android/Web/server, ngoài repo. PASS git diff --check.
PASS Chromium IAB isolated header320px: expanded3 labels; compact nút x80/136/192 width48 và y44 cùng chuông; click Đổi điểm gọi callback cục bộ1 lần. Không data/API; preview entry/tab/server đã dọn.
NOT_VERIFIED: iPhone/native/browser mobile và full selector→request→OTP có dữ liệu thật. BLOCKED_BY_TEST_DATA_POLICY nếu cần tạo học sinh/liên kết/trip để test; không tự thêm data. Không gửi yêu cầu/OTP. Mobile không có lint script/config, không cài thêm.
## 10. Issues & Risks
Bộ chọn cần học sinh liên kết hợp lệ; empty có link tới luồng liên kết cũ. Rule disabled lấy cùng AVAILABLE với Student Detail; backend vẫn kiểm quyền. Header compact dưới320px/largest Dynamic Type chưa nghiệm thu. Các issue route cũ ngoài shortcut không sửa.
## 11. Reviewer Focus
Truyền studentId đúng, không gọi create-address trực tiếp/bỏ qua request list; AVAILABLE disabled; GET focus cleanup; giữ2 action cũ và kích thước compact. Diff chỉ task này so snapshot, không trộn pending work trước.
## 12. Suggested Next Step
PO thử Đổi điểm trên iPhone với học sinh liên kết hợp lệ.
## 13. Approval Status
PO đã yêu cầu triển khai. WAITING FOR USER REVIEW / APPROVAL cho nghiệm thu. Chưa commit/push.
