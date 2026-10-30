# AI Review — Chuyến chiều đi không hiện Trang chủ phụ huynh

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Mobile/API source analysis / local DB readonly / Documentation. Type: Analysis. Status: COMPLETED for missing outbound trip diagnosis.

## 2. Original Request
Đã có tuyến nhưng UI Trang chủ phụ huynh không hiện, hỏi lý do.

## 3. Approved Scope
Điều tra code và dữ liệu local bằng SELECT read-only. Không sửa code/config, không cập nhật DB hoặc tạo dữ liệu test, không commit/push.

## 4. Analysis & Decisions
getParentHomeCards tìm các con qua parentStudentLink của currentUser, chỉ lấy trips SCHEDULED/IN_PROGRESS, roster của con có excluded_at NULL, scheduled_end_at >= now hoặc NULL. Chọn một chuyến ưu tiên cho mỗi con: IN_PROGRESS trước, trong nhóm chạy ưu tiên UNMARKED, rồi scheduled_start_at tăng dần. Không filter cứng serviceDate bằng ngày hiện tại; chuyến tương lai có thể hợp lệ nếu chưa hết giờ. Tuyến tồn tại không thay thế Trip/roster. Frontend lấy GET /trips/mobile/parent/home-cards, setParentCards(res.items), không tự lọc chiều hoặc ngày; refresh active8s.
Kiểm tra actual local DB theo DATABASE_URL trong api/.env, không hiển thị mật khẩu, giới hạn host loopback và PGOPTIONS default_transaction_read_only=on/statement_timeout. Database roadtoschool, clock truy vấn 30/10/2026 13:29:07 giờ Việt Nam (06:29:07 UTC). Tài khoản PARENT đã cung cấp có 2 con liên kết. Cả hai có roster active cho chuyến chiều đi a3e8934d-aceb-40b8-b968-f25d02334491, tuyến Don, ngày30/10, SCHEDULED/UNMARKED, lịch06:45-07:30. Chuyến bị loại do PAST_SCHEDULED_END, không phải thiếu liên kết con.
Chiều về599eb163-94fc-4c4c-9d17-d1f274ae177e cùng ngày lịch16:30-17:15 đang IN_PROGRESS, cả hai con có roster active, con1 PRESENT/con2 UNMARKED; là ưu tiên1 theo điều kiện source. Các chuyến tương lai cũng có nhưng ưu tiên sau. Nếu app hoàn toàn không có card thì cần xác minh response API đang chạy và DB/runtime/account thực tế; DB/config/source alone không chứng nhận ứng dụng đang dùng cùng môi trường. Thay status thành IN_PROGRESS không vượt được scheduled_end_at filter; SQL đổi status đã hướng dẫn trước không đủ để đưa chuyến hết giờ lên Home.

## 5. Implementation Details
No application code changes. Cập nhật LATEST.md/LATEST.diff, lưu review trước vào history/2026-10-30-before-parent-home-missing-trip-analysis.md và .diff. Không sửa API Home filter hoặc lịch chuyến.

## 6. Database Changes
None. Chỉ SELECT current_database/clock, liên kết tài khoản và các chuyến/roster của chính các con đã liên kết; không đọc mật khẩu người dùng hoặc mutate records. Các bản ghi UI TEST đã tồn tại do PO chuẩn bị từ trước, không tạo trong task này. Không seed/backfill/rollback-test.

## 7. API & Swagger Changes
None. Đọc TripsService.getParentHomeCards/controller và MobileApiClient/HomeScreen. Không gọi endpoint có xác thực hoặc API mutation. Swagger N/A.

## 8. UI/UX Changes
None. Chỉ giải thích logic chọn thẻ; không sửa thiết kế hoặc wireframe.

## 9. Verification & Testing
PASS: đọc điều kiện getParentHomeCards, sort và cách frontend nhận items/poll8s.
PASS: psql PostgreSQL18 đã cài, -X --no-password --set ON_ERROR_STOP=1 --csv; credential chỉ truyền qua biến môi trường của child process, host local; PGOPTIONS read-only + timeout. SELECT thực thi exit0, trả2 liên kết con và16 dòng roster của các chuyến hiện có. Kết quả chuyến sáng PAST_SCHEDULED_END cả hai con; chiều về ELIGIBLE/priority1.
PASS: git diff --check báo cáo.
NOT_VERIFIED: authenticated response/runtime app Expo thực tế, DB đang được process backend đang chạy sử dụng; không chạy typecheck/build vì không sửa application code.

## 10. Issues & Risks
Giờ kết thúc áp dụng cả IN_PROGRESS, nên chuyến đang chạy quá lịch cũng biến mất khỏi Home theo code hiện tại. Không tự coi đây là nghiệp vụ được PO duyệt để thay backend trong task chẩn đoán. Nếu app rỗng hoàn toàn thì dữ liệu config DB này vẫn có card chiều về hợp lệ; cần kiểm môi trường API/account/error, không kết luận mọi triệu chứng chỉ do chuyến sáng quá giờ. DB query priority dùng thứ tự giống source; tie cụ thể thêm trip_id để kết quả ổn định, không có tie liên quan kết luận này.

## 11. Reviewer Focus
Dùng scheduled_end_at timestamp thay vì chỉ service_date/scheduled_end_time text; so sánh UTC vì Prisma timestamp without timezone. Phân biệt route và trip, roster và parent link, backend filter và frontend rendering. Không tuyên bố kiểm chứng E2E từ SELECT.

## 12. Suggested Next Step
Nếu muốn kiểm tra UI chiều đi ngay, chốt điều chỉnh khung giờ chuyến local đã có sang khoảng thời gian phù hợp; chưa tự thực hiện cập nhật.

## 13. Approval Status
Chẩn đoán theo câu hỏi PO. WAITING FOR USER REVIEW / APPROVAL. Không sửa source hoặc DB.
