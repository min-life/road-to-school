# AI Review — Hé tab Sự cố để gợi ý cuộn ngang

## 1. Task Information
02/11/2026 Asia/Saigon. IMPLEMENTATION spacing follow-up. Source hoàn tất; native NOT_VERIFIED. Giữ pending work, không commit/push.

## 2. Original Request
PO thấy spacing quá lớn làm ẩn toàn bộ tab Sự cố; muốn hé icon/chữ như ảnh để gợi ý có tab nữa.

## 3. Approved Scope
Chỉ tinh chỉnh spacing Staff tabs. Giữ single-line/horizontal scroll, cỡ chữ/vùng chạm, Parent và gesture sheet.

## 4. Analysis & Decisions
Thu padding ngang từng tab12→4 và gap giữa tab8→4. Giữ icon/text gap6, minHeight44 và font12 để không làm chữ nhỏ hơn. Content vẫn rộng hơn viewport nên cuộn ngang như trước.

## 5. Implementation Details
mobile/app/trip/[id].tsx:2styles tabBarStaff/tabButtonStaff. Không sửa JSX hoặc hook. Task-only LATEST.diff và archive trước history/2026-11-02-before-peek-incident-tab.md/.diff; architecture addendum.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None. Không API/DB hoặc fake business records.

## 8. UI/UX Changes
Ở390px với bộ đếm từ ảnh, vị trí đầu thấy3tabs và icon/đầu chữ Sự cố tại mép phải. Vuốt để hiện toàn bộ. Không wrap hoặc cắt nội dung bên trong tab; chỉ viewport cuộn che phần ngoài.

## 9. Verification & Testing
PASS TypeScript --noEmit exit0. PASS AST source parity toàn bộ function screen (JSX, counters, callbacks, gesture) giống baseline; chỉ2style spacing đổi.
PASS RN-web JSX/styles thật với counters primitives từ ảnh:390px ban đầu text Sự cố có18.25px visible trong clip, icon nhìn thấy; text height16px một dòng. Cuộn phải thấy đủ tab, chọn Sự cố đổi state INCIDENTS;320px vẫn cuộn/chọn được. Không Trip/User/API mocks.
PASS git diff --check. Preview tạm xóa, tab đóng, viewport reset. Không tests mirror style/export lại cho2style changes. Native/full Trip NOT_VERIFIED.

## 10. Issues & Risks
Mức hé phụ thuộc chiều rộng/font/bộ đếm. Màn nhỏ hơn có thể hé tab trước thay vì Sự cố; cuộn vẫn hoạt động, không ép chữ nhỏ hoặc truncate. Không dependencies/commit/push.

## 11. Reviewer Focus
Giữ vùng chạm44px/font12 và khoảng icon6; gesture code nguyên trạng. Hint đến từ content overflow, không thêm chữ/icon giả.

## 12. Suggested Next Step
PO reload map và xem mép phải hàng tab ở vị trí cuộn đầu trên thiết bị.

## 13. Approval Status
PO yêu cầu trực tiếp theo ảnh; source/checks hoàn tất, chờ native acceptance.
