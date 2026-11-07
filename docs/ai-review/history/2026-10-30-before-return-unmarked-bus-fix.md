# AI Review — Bốn trường hợp icon bus chiều về

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: Analysis / Review. Status: COMPLETED for audit only. DISCUSSION MODE.

## 2. Original Request
Rà soát4 trường hợp chiều về: đang di chuyển/đã điểm danh; đang di chuyển/chưa điểm danh; đã đến/đã xuống; đã đến/chưa xuống. Xác định bus mất ở đâu và phần nào đã xử lý.

## 3. Approved Scope
Chỉ rà soát code và kiểm chứng hàm thuần. Không implement, sửa enum/backend/API/DB, không tạo dữ liệu hoặc commit/push.

## 4. Analysis & Decisions
| Trường hợp | Dữ liệu hiện có dùng kiểm tra | Bus/position | Tag header | Đánh giá |
| --- | --- | --- | --- | --- |
| TH1 Đang di chuyển + đã điểm danh | IN_PROGRESS, TO_PARKING, PRESENT, alighted=false | Có,2/3 từ trường đến điểm trả | Đã điểm danh | Đã xử lý vị trí minh họa |
| TH2 Đang di chuyển + chưa điểm danh | IN_PROGRESS, TO_PARKING, UNMARKED, alighted=false | Mất,position=null | Chưa điểm danh | Chưa xử lý ổn; điều kiện return loại bus nếu chưa PRESENT |
| TH3 Đã đến + đã xuống | IN_PROGRESS, TO_PARKING, PRESENT, alighted=true | Có,tại đích1; thay node home | Đã xuống xe | Đã xử lý theo xác nhận xuống xe của đúng con; không phải event xe đến độc lập |
| TH4 Đã đến + chưa xuống | Không có event đến điểm trả riêng; nếu PRESENT/alighted=false | Vẫn ở2/3,không ở đích | Đã điểm danh | Chưa xử lý mốc đến và nhãn Chưa xuống xe cho return |

TH4 nếu attendance còn UNMARKED cũng mất bus theo TH2. schoolArrived của Home chỉ true cho TO_SCHOOL; trường này không phải arrival điểm trả, nên không dùng nó để suy ra return arrival. JourneyStagePosition cũng không sử dụng schoolArrived cho TO_PARKING.
Đã đến không là một giá trị TripStatus hiện có. Client operational viewer có isAlighted/alightedAt từng con và school arrival, không mốc độc lập xe đến điểm trả. TH3 giờ thực từ alightedAt nếu có, không biến timestamp này thành event đến trước khi con xuống.
Phân biệt bus bị ẩn trong card với cả card biến mất: helper COMPLETED+PRESENT+alighted vẫn trả1 (nhánh trước COMPLETED), nhưng Home API chỉ lấy SCHEDULED/IN_PROGRESS và chưa quá scheduled_end_at. Khi Trip COMPLETED hoặc quá giờ, card có thể bị bỏ/chuyển chuyến khác, không đảm bảo còn xem TH3 trên Home. Đây không phải lỗi render bus riêng.

## 5. Implementation Details
No application code changes. Cập nhật LATEST.md/LATEST.diff; lưu review trước vào history/2026-10-30-before-return-four-cases-audit.md và .diff. Không thêm test file hoặc thay assertions hiện có.

## 6. Database Changes
None. Không truy cập DB hoặc gọi mutations, không seed/records/fixtures/API giả. Chỉ dùng primitive enum/boolean cho hàm thuần.

## 7. API & Swagger Changes
None. Đối chiếu OperationalStateResponse và Home filter đã đọc trong phiên. Swagger N/A. Không tạo status/event mới.

## 8. UI/UX Changes
None. Chỉ ghi nhận TH2 bus mất và TH4 chưa có phân biệt đến điểm trả/chưa xuống. Không đổi vị trí, tag, callback hoặc permissions.

## 9. Verification & Testing
PASS: trích đúng journeyStagePosition và studentJourneyBadge từ source bằng TypeScript AST, transpile bằng dependency hiện có trong bộ nhớ rồi gọi qua node:vm.4 trường hợp chính trả đúng 2/3/null/1/2/3, nhãn Đã điểm danh/Chưa điểm danh/Đã xuống xe/Đã điểm danh.
PASS:3 edge assertions: TO_PARKING không dùng schoolArrived; COMPLETED+PRESENT+alighted ->1; COMPLETED+PRESENT+chưa xuống ->null.
PASS: static assertions bus chỉ render khi stagePosition!==null và Home schoolArrived chỉ kích hoạt cho TO_SCHOOL.
PASS: git diff --check báo cáo.
NOT_VERIFIED: UI thật trên Expo/iPhone/Android và API event thực tế. Không chạy lại build/typecheck vì không sửa application code. Kết quả hàm không được coi là runtime UAT.

## 10. Issues & Risks
TH2 tổ hợp có thể xuất hiện khi sửa status qua SQL bỏ start validation: startTrip chiều về bình thường chặn UNMARKED; UI hiện vẫn cần xử lý thông tin chưa đầy đủ mà không tự nhận con đã lên. TH4 thiếu dữ liệu arrival độc lập, không thể tự đặt bus ở đích dựa trên lịch hoặc khẳng định con đã xuống. TH3 chỉ hiện khi Home còn giữ card đủ điều kiện, không có history cho completed.

## 11. Reviewer Focus
Phân biệt global trip status, attendance, own alighting và event xe đến. TH3 yêu cầu attendance PRESENT hợp lệ; không suy ra alighting từ status COMPLETED. TH4 không tái dùng isSchoolArrived của chiều đi. Thông báo rõ audit không phải fix.

## 12. Suggested Next Step
Ưu tiên xử lý TH2 bằng phương án hiển thị bus trung tính khi thiếu xác nhận điểm danh, đồng thời giữ tag Chưa điểm danh; chưa implement trước khi PO yêu cầu.

## 13. Approval Status
Rà soát theo yêu cầu PO. WAITING FOR USER REVIEW / APPROVAL. Không sửa application code hoặc DB.
