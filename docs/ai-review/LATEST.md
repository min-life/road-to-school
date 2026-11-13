# RoadToSchool — Gắn splash cho Tài xế

## 1. Task Information

13/11/2026, giờ Việt Nam. Mobile. Triển khai. Trạng thái `COMPLETED`.

## 2. Original Request

Người dùng yêu cầu thực hiện cách gắn SVG đã trao đổi ở lượt trước.

## 3. Approved Scope

Dùng biểu tượng người lái xe từ SVG người dùng cung cấp ở màn chào sau khi tài khoản Tài xế đăng nhập thành công.

## 4. Analysis & Decisions

Màn chào đã chọn ảnh dựa vào vai trò. Dùng asset riêng cho splash vì màn chi tiết chuyến cũng dùng `Bus.png`. Xuất PNG trong suốt 288 × 288 từ SVG gốc bằng Sharp đã có trong workspace.

## 5. Implementation Details

- [RoleSplash.tsx](../../mobile/components/RoleSplash.tsx) dùng ảnh mới cho nhánh `DRIVER`.
- [login-splash.svg](../../mobile/assets/driver/login-splash.svg) lưu đúng tệp thiết kế đã cung cấp.
- [login-splash.png](../../mobile/assets/driver/login-splash.png) là ảnh runtime, 12.105 byte.
- Bản phân tích trước triển khai nằm ở [history](history/2026-11-13-driver-login-splash-analysis.md).

## 6. Database Changes

None.

## 7. API & Swagger Changes

None.

## 8. UI/UX Changes

Biểu tượng 72 × 72 nằm giữa vòng tròn hiện có phía trên nhãn “Tài xế”. Màn chào hiện trong 1,2 giây sau đăng nhập thủ công rồi vào Trang chủ. Phạm vi bố cục đã được mô tả ở lượt trao đổi trước khi người dùng yêu cầu triển khai.

## 9. Verification & Testing

- PASS `tsc --noEmit --incremental false` trong Mobile.
- PASS `expo export --platform android --platform ios --dump-assetmap`. Hai gói cùng trỏ tới ảnh mới và nội dung PNG trong gói trùng với asset.
- PASS đối chiếu SVG với tệp người dùng gửi và kiểm tra PNG có vùng trong suốt.
- PASS `git diff --check` và kiểm tra phạm vi diff.
- NOT_VERIFIED đăng nhập và hiển thị trên điện thoại.

## 10. Issues & Risks

Cần kiểm tra ảnh và thời điểm chuyển màn khi đăng nhập bằng thiết bị thật.

## 11. Reviewer Focus

Xác nhận ảnh xuất hiện ở nhánh `DRIVER` và thời lượng màn chào là 1,2 giây.

## 12. Suggested Next Step

Đăng nhập bằng tài khoản Tài xế trên điện thoại để xem splash.

## 13. Approval Status

READY FOR USER REVIEW.
