# AI Review — NetworkBanner safe area

## 1. Task Information
28/10/2026. Mobile / Documentation. Fix. COMPLETED; physical-device acceptance outstanding.
## 2. Original Request
Sửa NetworkBanner bị dính tai thỏ iPhone.
## 3. Approved Scope
Safe area của NetworkBanner. Không đổi retry/auth/network state, màn hình hoặc API.
## 4. Analysis & Decisions
RootNavigation đặt banner trước Stack trong View full-screen; banner trước đây là View với padding10, không xử lý top inset. Dùng SafeAreaView của dependency đã có, edges top/left/right; không dùng chiều cao status bar cố định hoặc bù bottom inset không liên quan. Áp dụng quy tắc safe area đã đọc; đây là sửa layout lỗi hiện hữu, không phải màn hình/wireframe mới.
## 5. Implementation Details
mobile/components/NetworkBanner.tsx: import SafeAreaView và thay root View. Giữ style/padding, nội dung, onRetry, disabled và spinner. Nền banner tiếp tục phủ vùng trên, nội dung nằm trong vùng an toàn theo thiết bị. Archive báo cáo trước vào history/2026-10-28-before-network-banner-safe-area.*; cập nhật LATEST.md/diff.
## 6. Database Changes
None.
## 7. API & Swagger Changes
None; không áp dụng. Không giả lập lỗi mạng qua DB/API mutation.
## 8. UI/UX Changes
Banner nhận top/left/right insets động, tránh notch/status bar và cạnh ngang. Không thêm provider hoặc dependency. Nội dung mạng và nút Thử lại giữ nguyên.
## 9. Verification & Testing
PASS: Mobile TypeScript check, node node_modules/typescript/bin/tsc --noEmit --incremental false, exit0. PASS: diff/scope/whitespace review. Không thêm unit test lặp lại JSX cho thay đổi nhỏ. NOT_VERIFIED: render trực tiếp trên iPhone notch/Dynamic Island, xoay màn hình và retry runtime; chưa có thiết bị kết nối để nghiệm thu. Không chạy lại bundle/tests nghiệp vụ không liên quan.
## 10. Issues & Risks
Cần review thực tế trên iPhone có lỗi kết nối; static check không chứng minh ảnh render. Không hardcode khoảng đẩy theo model máy.
## 11. Reviewer Focus
Mở trạng thái mất kết nối trên iPhone: chữ và Thử lại nằm dưới tai thỏ, không bị che; retry/loading hoạt động như trước. Khi banner ẩn, không có wrapper safe-area mới thường trực trong root.
## 12. Suggested Next Step
Reload Expo trên iPhone và xem NetworkBanner khi mất kết nối.
## 13. Approval Status
Fix được PO yêu cầu. WAITING FOR USER REVIEW / APPROVAL trên thiết bị; chưa commit/push.
