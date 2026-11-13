# AI Review — Dùng chung icon xe/trường của Parent

## 1. Task Information
Date01/11/2026 Asia/Saigon. Scope Mobile map UI. Type Follow-up implementation. Status COMPLETED source; native acceptance NOT_VERIFIED.

## 2. Original Request
PO xác nhận dùng icon xe và trường hiện có của Parent cho Driver/Bus Attendant.

## 3. Approved Scope
Chỉ thay Staff icon để dùng chung Parent; giữ Parent, pin chữ cái học sinh, footer, data và quyền/operations. Không commit/push.

## 4. Analysis & Decisions
Parent dùng HTML emoji 🏫/🚌 trên school-marker. Bỏ các conditional SVG staff, CSS override và size/anchor staff riêng, để dùng chung đúng định nghĩa gốc Parent. Không chuẩn hóa lại emoji Parent hoặc thiết kế icon mới.

## 5. Implementation Details
- mobile/app/trip/[id].tsx: xóa import SVG, CSS staff-map-icon và schoolStop chỉ dùng để phân nhánh icon; trường/xe dùng chung HTML Parent, kích thước/anchor school về giá trị Parent chung. staffMap còn cho pin điểm đón/trả dùng tên, không ảnh hưởng icon xe/trường.
- Xóa mobile/utils/staff-map-marker.ts là module SVG do agent thêm trong task trước, không còn caller sau thay đổi.
- mobile/scripts/staff-map-marker.test.ts: bỏ import và duy nhất test đòi SVG staff đã không còn đúng yêu cầu; giữ toàn bộ tests initials/frame/fallback/injection.
- docs/architecture/mobile-staff-map-alignment.md: addendum latest chốt common Parent icons, đánh dấu phần SVG trước là lịch sử.
- LATEST.md/.diff và archive history/2026-11-01-before-parent-map-icons.md/.diff. Diff riêng so với working baseline đầu task; không trộn source StaffTripCard/initials/footer đang pending.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None. Không API/DB calls hoặc payload/controller/capability changes.

## 8. UI/UX Changes
Parent/Driver/Attendant cùng icon trường🏫 và xe🚌, nền tròn vàng/CSS/size/anchor chung theo Parent. Parent không đổi. Pin tên học sinh và số thứ tự trong metadata/aria-label giữ nguyên, các controls role riêng giữ nguyên.

## 9. Verification & Testing
PASS11/11 tests/3suites:4staff initials/frame/fallback/injection,3existing child-script boundaries,4footer visibility. Không fake business data hoặc API responses.
PASS TypeScript app --noEmit exit0.
PASS Expo export web/server exit0, output shared-parent-map-icons-export ngoài application repo. Không báo export all ở task cũ là kết quả mới; Android/iOS native runtime chưa chạy.
PASS source check: CSS school-marker và vehicle HTML khớp HEAD gốc Parent; school HTML dùng chung; không staff-map-icon/staffSchoolSvg/staffBusSvg overrides. rg không còn references helper SVG bị xóa trong mobile code. PASS source whitespace check.
NOT_VERIFIED device rendering/native screenshots/real trip integration. Không thêm dependencies hoặc khởi động server test.

## 10. Issues & Risks
Cùng emoji như Parent vẫn có thể khác nét vẽ giữa hệ điều hành; đây là đúng lựa chọn dùng Parent hiện tại, không đổi Parent sang SVG. Cần reload app để nhận source mới. Chưa commit/push.

## 11. Reviewer Focus
Không còn override Staff xe/trường; Parent CSS/HTML nguyên bản; pin chữ cái và footer/handlers còn giữ. Module SVG bị xóa chỉ sau rà callers.

## 12. Suggested Next Step
PO reload app và đối chiếu icon xe/trường giữa ba vai trò trên thiết bị.

## 13. Approval Status
PO đã yêu cầu trực tiếp. Implementation completed, native acceptance WAITING FOR USER REVIEW. Không có yêu cầu commit/push.
