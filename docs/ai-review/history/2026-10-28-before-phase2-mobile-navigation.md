# AI Review — Tạo tài khoản phụ huynh local
## 1. Task Information
28/10/2026. Local DB / pgAdmin. COMPLETED.
## 2. Original Request
Tạo một tài khoản PARENT với thông tin PO cung cấp; PO đồng ý tiếp tục điều khiển pgAdmin.
## 3. Approved Scope
Chỉ tài khoản được yêu cầu; không seed, thêm học sinh hoặc liên kết dữ liệu khác.
## 4. Analysis & Decisions
Đọc User schema/auth hashing; kiểm tra email/phone chưa tồn tại. Dùng bcrypt cost10 theo implementation và mật khẩu PO đã chốt trước đó. Không lưu thông tin cá nhân/hash/password trong repo.
## 5. Implementation Details
Chạy SQL trong Query Tool pgAdmin trên database local project; script ngoài repo, có guard database/port và chống trùng. Không thay source/schema/config. Bảo toàn thay đổi NetworkBanner chưa commit.
## 6. Database Changes
Thêm đúng một User role PARENT, active/verified true. Không migration, không cập nhật bản ghi hiện có, không thêm parentStudentLink.
## 7. API & Swagger Changes
None. Không gọi login/API mutation để test.
## 8. UI/UX Changes
None. Dùng skill computer-use đã nạp trong session để thao tác pgAdmin; không thay UI project.
## 9. Verification & Testing
PASS: pgAdmin Data Output trả một dòng đúng role/trạng thái sau script. PASS: Prisma read-only trên kết nối backend thấy đúng một tài khoản khớp email/phone; bcrypt compare mật khẩu đã thống nhất đạt. Không tạo session đăng nhập để kiểm tra. Các lỗi điều khiển cửa sổ trước đó được xử lý bằng mở Query Tool mới/nạp file và quan sát kết quả; không rerun INSERT sau khi đã thấy thành công.
## 10. Issues & Risks
Tài khoản chưa liên kết học sinh; không tự tạo quan hệ ngoài yêu cầu. SQL tạm nằm ngoài repo và không đưa vào Git.
## 11. Reviewer Focus
Đúng tài khoản được yêu cầu, không trùng; hash theo backend; không có credentials hoặc PII trong review.
## 12. Suggested Next Step
PO đăng nhập Mobile bằng tài khoản vừa tạo.
## 13. Approval Status
Tạo tài khoản được PO chỉ định rõ. Hoàn tất; không commit/push.
