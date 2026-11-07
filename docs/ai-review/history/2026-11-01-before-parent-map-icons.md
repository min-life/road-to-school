# AI Review — Staff map pin hiển thị chữ cái đầu tên

## 1. Task Information
Date01/11/2026 Asia/Saigon. Scope Mobile UI. Type Follow-up Fix. Status COMPLETED source; native acceptance NOT_VERIFIED.

## 2. Original Request
PO yêu cầu pin điểm đón/trả Driver/Bus Attendant thay số2/3 bằng chữ cái đầu tên học sinh giống Parent.

## 3. Approved Scope
Chỉ nội dung nhãn pin Staff. Giữ Parent, hình dạng/kích thước pin, icon xe/trường, footer và nghiệp vụ đã triển khai. Không commit/push.

## 4. Analysis & Decisions
Parent đã có createChildMapPin lấy ký tự đầu/in hoa/fallback. Staff gọi trực tiếp createChildMapPin(null,s.name) thay factory số, nên không thêm một cách xử lý tên khác. null ID giữ pin Staff không gắn lookup avatar học sinh; không thêm avatar request. Số thứ tự vẫn có trong aria-label/metadata của điểm dừng, không còn hiển thị trên mặt pin.

## 5. Implementation Details
- mobile/app/trip/[id].tsx: bỏ import/embed numberedMapPinScript; đổi numberedPin thành staffStopPin và call Parent renderer bằng tên thay order.
- mobile/utils/staff-map-marker.ts: xóa factory pin số không dùng nữa, giữ nguyên school/bus SVG.
- mobile/scripts/staff-map-marker.test.ts: dùng Parent script thật, thêm kiểm tra initial tiếng Việt/fallback, giữ frame/injection/icon checks; minimalDOM thêm style cho renderer Parent.
- docs/architecture/mobile-staff-map-alignment.md: addendum quyết định mới thay snapshot pin số cũ.
- LATEST.md/.diff: báo cáo và diff riêng correction. Bảo toàn report cũ tại history/2026-11-01-before-staff-map-initials.md/.diff. Không đụng StaffTripCard pending hoặc các source changes map trước task ngoài phần đính chính.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None. Dùng s.name trong map snapshot hiện có, không đổi projection/API/data.

## 8. UI/UX Changes
Ví dụ Nguyễn… thành N, Đông… thành Đ theo chính Parent renderer. Không thay giao diện Parent, marker geometry, bus/school icons hoặc thao tác map. Tên vẫn dùng textContent, không chèn HTML động.

## 9. Verification & Testing
PASS12/12 tests/3suites qua TypeScript đã cài + node:test/assert:5staff marker (frame, initials tiếng Việt, fallback, HTML text safety, fixed icons),3child script boundaries,4footer visibility. Chỉ text/enums/minimalDOM, không fake business records/API.
PASS app TypeScript --noEmit exit0.
PASS Expo export --platform web exit0 (web/server bundles), output staff-map-initials-export ngoài repo application. Không chạy lại Android/iOS export hoặc native UAT cho thay đổi nhỏ này; kết quả all-platform task trước không được báo là mới.
PASS không còn numberedMapPinScript/createNumberedMapPin/numberedPin ở production và test liên quan; source whitespace check sạch.
PASS correction-only diff được dựng từ patch giao map trước và HEAD với assertions kiểm tra context/removed lines; không stage/reset source.
NOT_VERIFIED native UI/real trip integration. Không khởi động server mới, không API/DB mutations hoặc package install.

## 10. Issues & Risks
Nhiều học sinh có thể trùng chữ cái đầu như Parent; popup/metadata/aria-label vẫn phân biệt theo điểm và tên. Tên hiển thị theo dữ liệu hiện có; không tự chỉnh tên nghiệp vụ. Cần xem lại pin trên điện thoại.

## 11. Reviewer Focus
Staff uses the actual Parent initials renderer, no residual numeric face; Parent source unchanged; avatar lookup không mở rộng; metadata/handlers/footer giữ nguyên.

## 12. Suggested Next Step
PO reload app và kiểm tra các pin điểm đón/trả của Driver/Bus Attendant.

## 13. Approval Status
PO đã yêu cầu thay đổi trực tiếp. Source completed; native acceptance WAITING FOR USER REVIEW. Chưa commit/push.
