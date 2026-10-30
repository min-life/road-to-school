# AI Review — Bốn trường hợp icon bus chiều đi

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: Analysis / Review. Status: COMPLETED for audit. DISCUSSION MODE.

## 2. Original Request
Tiếp tục rà4 trường hợp chiều đi: đang chạy/chưa điểm danh; đang chạy/đã điểm danh; đến trường/đã xuống; đến trường/chưa xuống. Kiểm tra đã xử lý chưa và bus có mất không.

## 3. Approved Scope
Chỉ rà soát và kiểm chứng source hiện tại. Không implement thêm hoặc sửa code/DB/API; giữ fix TH2 chiều về và TH4 chiều về deferred, không commit/push.

## 4. Analysis & Decisions
Cả4 trường hợp chiều đi đều có nhánh xử lý và vị trí khác null với dữ liệu hợp lệ, card còn được Home chọn.
| Trường hợp | Bus trên rail | Header tag | Kết quả |
| --- | --- | --- | --- |
| TH1 IN_PROGRESS + UNMARKED, chưa đến trường | 1/3 toàn rail (=2/3 chặng xuất phát tới điểm đón) | Chưa điểm danh, amber | Hiện, đã xử lý |
| TH2 IN_PROGRESS + PRESENT, chưa đến trường/chưa xuống | 5/6 toàn rail (=2/3 chặng điểm đón tới trường) | Đã điểm danh, blue | Hiện, đã xử lý |
| TH3 Xe đến trường + PRESENT + isAlighted=true | 1, bus thay icon trường | Đã xuống xe, green | Hiện, đã xử lý |
| TH4 Xe đến trường + PRESENT + isAlighted=false | 1, bus thay icon trường | Chưa xuống xe, purple | Hiện, đã xử lý, khác TH4 chiều về |

TH2 có nhịp0.5 tại điểm đón1600ms chỉ khi quan sát thật UNMARKED->PRESENT lúc card mở và chuyến đang IN_PROGRESS, sau đó5/6. Mở card đã PRESENT không phát lại nhịp. Không coi đây là GPS hoặc event xe đến/rời pickup.
Xe đến trường được derive từ isSchoolArrived hoặc arrivedAtSchoolAt hợp lệ của đúng trip. Không có enum TripStatus riêng Đã đến trường. School arrival không tự xác nhận từng con đã xuống. Nếu UNMARKED khi global arrived, bus vẫn1 nhưng tag Chưa điểm danh, không chuyển giả sang PRESENT/alighted.
Card không còn trên Home là vấn đề khác: API chỉ chọn SCHEDULED/IN_PROGRESS và chưa quá scheduled_end_at, mỗi con một trip ưu tiên. COMPLETED hoặc quá giờ có thể làm cả card biến mất/chọn chuyến khác; không được báo lỗi riêng icon. Helper vẫn trả1 khi có confirmed school arrival/own alighting trước nhánh COMPLETED, nhưng không tạo history card mới.

## 5. Implementation Details
No application code changes. Chỉ LATEST.md/LATEST.diff; lưu review/diff fix TH2 chiều về trước tại history/2026-10-30-before-outbound-four-cases-audit.md và .diff, bảo toàn bằng chứng task trước.

## 6. Database Changes
None. Không truy cập hoặc ghi DB/seed, không fixtures nghiệp vụ, không fake API responses. Các ca kiểm chứng chỉ enum/boolean thuần.

## 7. API & Swagger Changes
None. Đọc getParentHomeCards, Home usage và các field school arrival đã có; không gọi API hoặc thay contracts/Swagger.

## 8. UI/UX Changes
None. Bảng phản ánh hiện trạng code, không phải thiết kế mới hoặc sửa wireframe. Xác nhận TH4 chiều đi đã được xử lý độc lập school-arrival, TH4 chiều về vẫn deferred theo PO.

## 9. Verification & Testing
PASS: đối chiếu parent-journey-stage.ts, student-journey.tsx, Home card bindings, time helpers, backend Home filter và module spec.
PASS: trích đúng journeyStagePosition/studentJourneyBadge bằng TypeScript AST, transpile trong bộ nhớ với dependency có sẵn và chạy node:vm.4 ca chính cho positions1/3,5/6,1,1, đều khác null và tags/tone đúng bảng.
PASS: edge assertions boarding frame0.5, arrived+UNMARKED không tự xác nhận attendance, COMPLETED+school arrival trả1 trong helper; static bus render guard và replacement-node guards khớp.
PASS: git diff --check báo cáo.
NOT_VERIFIED: Expo Go iPhone/Android, layout/animation và API event runtime thật. Không chạy lại typecheck/build hoặc25-test suite vì không thay source và suite đã đạt ở task trước; không coi checks hàm là UAT.

## 10. Issues & Risks
Nếu chỉ đổi trip.status sang IN_PROGRESS nhưng không có school arrival thì UI không thể suy ra đã đến trường: PRESENT vẫn5/6. Không dùng COMPLETED làm thay thế sự kiện đến trường. Thiếu dữ liệu cập nhật có polling latency và có thể thấy mốc trước; chưa kiểm chứng native. ABSENT/CANCELLED ẩn bus có chủ đích ngoài4 trường hợp được hỏi.

## 11. Reviewer Focus
Không nhầm2/3 từng chặng với2/3 toàn rail chiều đi. Phân biệt arrival chung và alighting từng con, nhịp boarding1600ms và vị trí thật. Không suy ra bus mất khi toàn card bị Home filter loại.

## 12. Suggested Next Step
Nghiệm thu4 trường hợp chiều đi trên Expo Go iPhone với dữ liệu chuyến và các mốc xác nhận hợp lệ do PO chuẩn bị.

## 13. Approval Status
Audit theo yêu cầu PO. WAITING FOR USER REVIEW / APPROVAL. Không sửa application code hoặc DB; TH4 chiều về vẫn deferred.
