# AI Review — Hàng tab Staff một dòng

## 1. Task Information
02/11/2026 Asia/Saigon. IMPLEMENTATION layout fix. Source hoàn tất; native NOT_VERIFIED. Đầu task checkout sạch; không commit/push.

## 2. Original Request
PO muốn tab giãn ngang, không xuống dòng sau ảnh chỉ ra tên tab/bộ đếm lệch hàng.

## 3. Approved Scope
Chỉ layout bốn tab Driver/Bus Attendant trong Trip. Giữ Parent, dữ liệu/handlers/counts và nghiệp vụ.

## 4. Analysis & Decisions
Fixed equal-width cells ép nhãn dài thành hai dòng. Dùng ScrollView ngang với content flexGrow1, button natural width không shrink, text numberOfLines1. Giữ font12px Parent, giảm gap/padding ngang riêng Staff để390px thấy đủ bốn tab. Màn hẹp cho cuộn ngang, không ép font nhỏ hoặc cắt nội dung.

## 5. Implementation Details
mobile/app/trip/[id].tsx: Staff View đổi ScrollView, outer flexGrow0 tránh chiếm chiều cao; bốn Text numberOfLines1 và flexShrink0; staff buttons flexBasis auto/grow1/shrink0, gap3/paddingHorizontal0. Parent branch/styles không đổi. Task-only LATEST.diff; archive trước history/2026-11-02-before-single-line-map-tabs.md/.diff; architecture addendum.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None. Không gọi API/DB hoặc tạo business records.

## 8. UI/UX Changes
Icon, tên và bộ đếm trên một hàng, cùng chiều cao. Màn390px preview thấy đủ bốn tab; màn320px cuộn trong hàng để tới Sự cố, không xuống dòng. Parent ba tab giữ nguyên.

## 9. Verification & Testing
PASS TypeScript --noEmit exit0. PASS AST: Parent branch giống baseline;4Text single-line; callbacks và mọi count expression giữ nguyên.
PASS RN-web preview trích chính Staff JSX/styles với primitive counters từ ảnh (không Trip/User/mock API):390px thấy đủ4tab một dòng;320px label height16px, Sự cố/Thông tin vẫn truy cập khi cuộn; state đổi ATTENDANCE/INCIDENTS/INFO đúng.
PASS git diff --check. Preview tạm xóa, tab đóng, viewport reset; Metro có sẵn giữ nguyên. Không thêm tests mirror layout hoặc export lại cho chỉnh nhỏ. Native/font-scale và full authenticated Trip NOT_VERIFIED.

## 10. Issues & Risks
Màn hẹp, chữ lớn hoặc bộ đếm dài có thể cần vuốt ngang. Không thay cỡ font hoặc đếm số. Không dependency mới/commit/push.

## 11. Reviewer Focus
Text không shrink/wrap; row không bị ép cùng width; Parent không đổi; callbacks/counts giữ nguyên.

## 12. Suggested Next Step
PO reload map và kiểm tra hàng tab trên thiết bị.

## 13. Approval Status
PO yêu cầu trực tiếp; source và checks hoàn tất, chờ native acceptance.
