# AI Review — Bỏ chiều cao dư của sheet thu gọn Staff

## 1. Task Information
02/11/2026 Asia/Saigon. IMPLEMENTATION layout fix. Source hoàn tất; native NOT_VERIFIED. Bảo toàn pending tab-row changes, không commit/push.

## 2. Original Request
PO chỉ khoảng trắng dưới tiêu đề sheet thu gọn, ngay trên nút Hoàn thành chuyến xe.

## 3. Approved Scope
Chỉnh chiều cao thu gọn Driver/Bus Attendant theo nội dung, giữ footer vàng, Parent và nghiệp vụ.

## 4. Analysis & Decisions
Sheet dùng COLLAPSED_HEIGHT115px cho mọi role trong khi staff header thấp hơn; footer đã được đo/offset đúng, phần dư nằm trong sheet. Đo header bằng onLayout riêng Staff, collapsedHeight=header+paddingBottom hiện hữu. Parent/fallback trước đo giữ115. Cập nhật toàn bộ toggle/gesture clamp/midpoint/snap và dependency dùng chiều cao mới; effect chỉ đồng bộ khi sheet đang collapsed, không kéo sheet expanded về nhỏ.

## 5. Implementation Details
Chỉ mobile/app/trip/[id].tsx: thêm staffHeaderHeight, đưa pure showTripAction/offset lên trước gesture hooks để tính sheetBottomPadding/collapsedHeight. Header onLayout Staff; effect cập nhật Animated height khi collapsed. Không đổi footer content, styles, map/engine hoặc handlers nghiệp vụ. LATEST.diff task-only, archive trước history/2026-11-02-before-fit-collapsed-trip-sheet.md/.diff; architecture addendum.

## 6. Database Changes
None. Không records/seed/mutation.

## 7. API & Swagger Changes
None. Không API calls để test.

## 8. UI/UX Changes
Sheet Staff thu gọn vừa tiêu đề và padding chuẩn, bỏ khoảng rỗng do chiều cao115px cố định. Tên/thời gian xuống dòng vẫn tăng chiều cao đo được để không cắt chữ. Footer ngoài tab và joystick tiếp tục theo chiều cao sheet/footer hiện hữu. Parent giữ collapsed115 như trước.

## 9. Verification & Testing
PASS TypeScript --noEmit exit0. PASS4/4 action role/status tests hiện hữu.
PASS assert self-check thực thi chính collapsedHeight expression và gesture/toggle/effect callbacks tách qua AST: staff header68+padding10=78; header108=118; safe-area padding44=112; Parent/fallback115. Drag clamp và midpoint/snap dùng min80 trong test; toggle đóng80/mở600; resize effect cập nhật collapsed và không cắt expanded. Chỉ control/layout primitives, không Trip/User/API mock.
PASS onPress/disabled source parity. PASS Expo export --platform web gồm web/server bundles exit0, output ngoài repo fit-collapsed-trip-sheet-export. PASS git diff --check.
Không thêm tests mirror style. Full native onLayout/font scaling/rotation/gesture/real Trip screenshots NOT_VERIFIED; source/build không chứng minh nghiệm thu trên thiết bị.

## 10. Issues & Risks
Khung đầu vẫn dùng115px tới lần đo header đầu; sau đó tự khớp. Giữ padding chuẩn hiện hữu, không xóa toàn bộ khoảng cách nội dung. Native cần nghiệm thu với tiêu đề dài. Không dependencies hoặc commit/push.

## 11. Reviewer Focus
Không chỉ giảm hằng số: đo nội dung và cập nhật mọi min/snap/deps. Parent giữ115; footer/joystick offset không đổi. Effect không can thiệp expanded sheet.

## 12. Suggested Next Step
PO reload map và thu gọn để kiểm tra vùng ngay phía trên nút vận hành trên thiết bị.

## 13. Approval Status
PO yêu cầu sửa trực tiếp theo ảnh; source/checks hoàn tất, chờ native acceptance.
