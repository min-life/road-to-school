# AI Review — Thiết kế vòng đời phương án, hợp đồng và thay đổi phân tuyến học sinh

## 1. Task Information
Date: 26/10/2026 (Asia/Saigon). Scope: API/Database/Web/Mobile analysis, Documentation. Mode: DISCUSSION / DESIGN ONLY. Status: WAITING_APPROVAL đối với thiết kế kỹ thuật, không implementation hoặc prompt.

## 2. Original Request
PO mô tả hủy ACTIVE bởi hai admin, expiry hợp đồng và giải phóng tài nguyên; sửa vị trí trường/bãi cascade hủy plan; sửa/gia hạn hợp đồng có guard; Parent cancel yêu cầu địa điểm; phân quyền duyệt và kiểm tra tối ưu mọi tuyến liên quan; duyệt loại học sinh khi không khả thi; disable loại khỏi tuyến/Trip; thêm học sinh mới bằng tạo plan hoặc tối ưu một cặp tuyến, chỉ áp dụng Trip sinh mới. Yêu cầu đánh giá DB/API/UI, chưa prompt.

## 3. Approved Scope
Chỉ đọc source và thiết kế tài liệu. PO đã trả lời: thay đổi nguồn được phép nhưng IN_PROGRESS/lịch sử giữ cũ; chưa có tuyến hai admin duyệt địa điểm, có tuyến chỉ System Admin; expiry giữ CANCELLED, chỉ DRAFT/ACTIVE → EXPIRED và hủy SCHEDULED; luồng thay đổi học sinh không sửa Trip đã Ready/điểm danh. Schema/API/wireframe cuối cùng vẫn chưa được duyệt triển khai. Không cài package, mutate DB, migrate, gọi provider hoặc soạn prompt.

## 4. Analysis & Decisions
Thiết kế đầy đủ tại school-route-lifecycle-student-change-design.md. Điểm nền tảng: Trip có roster riêng nhưng map/Trip Detail/navigation vẫn đọc Route hiện tại; sửa Route trực tiếp không bảo toàn Trip đang chạy/lịch sử hoặc invariant insertion route-only. Đề xuất Trip.routeSnapshot nullable JSON và resolver chung; giữ nguyên Trip đã chốt khi thay đổi nguồn. Không dùng navigationState làm snapshot route nghiệp vụ.

Source hiện cancel plan chỉ System Admin/DRAFT, chưa EXPIRED; địa điểm do hai admin approve chỉ update Student; School Admin direct address bypass và disable chỉ update status. Các điểm này cần thay đổi đồng bộ, không chỉ thêm UI. Tách reservation theo plan tương lai khỏi actual Trip occupancy. Contract renewal không revive plan terminal, ngày start >= ngày VN khi sửa. School location mới cho hai admin sửa trực tiếp trong scope, không cần bảng SchoolChangeRequest mới.

Preview thay địa điểm phải xét mọi Route hiệu lực chứa A, giữ toàn bộ B/C/D và constraints; tất cả feasible mới atomic cập nhật. Unavailable/provider lỗi không được coi infeasible để loại học sinh. Một route bất khả thi chặn cập nhật một phần; remove branch cập nhật địa điểm, loại membership/eligible roster, giữ polyline/thứ tự người khác. Outcomes APPROVED phải lưu khác nhau cho Parent. Insertion hai chiều atomic nhưng tuyệt đối không cập nhật Trips đã sinh; giữ roster từng Trip khi các thao tác khác tới sau để không retro-add học sinh mới.

Guard giữ Trip Ready/điểm danh thuộc luồng học sinh đã hỏi; không tự thay quyết định cascade hủy SCHEDULED do plan/expiry. Bản thiết kế nêu rõ ranh giới này. Đề xuất thêm edge policy còn chờ PO: cùng RoutePlan cho insertion ở bản đầu; xử lý Route rỗng; Parent cancel không OTP; lựa chọn tối thiểu snapshot/exclusion và constraints overrides.

## 5. Implementation Details
No application code changes. Tạo docs/ai-review/school-route-lifecycle-student-change-design.md (13 phần phân tích), cập nhật LATEST.md/LATEST.diff. Báo cáo trước archive tại history/2026-10-26-124616-before-school-route-change-design.md/.diff. Không thay implementation cũ.

## 6. Database Changes
None implemented. Đề xuất không bảng mới: thêm EXPIRED vào RoutePlanStatus, CANCELLED vào RequestStatus; nullable Trip.routeSnapshot, StudentUpdateRequest.resolution, Route.routingConstraints; đề xuất TripAttendance.excludedAt/exclusionReason để giữ audit thay delete; contract snapshot trong scheduleScope JSON hiện có. Migration/legacy snapshot population cần approval riêng trong plan implementation; không backfill hoặc tạo history giả phiên này.

## 7. API & Swagger Changes
None implemented. Đề xuất mở rộng cancel plan với impact/CAS và role scope; school location/contract, parking cascade; parent cancel request; routing-preview + approve outcomes; disable impact; insertion-options/preview/confirm. GET thuần đọc, explicit preview POST mới được gọi provider trong implementation được duyệt; Swagger update bắt buộc khi triển khai. Không mở quyền duyệt DRAFT → ACTIVE cho System Admin.

## 8. UI/UX Changes
Draft wireframes: Settings tabs Trường/Bãi/Hợp đồng theo role; impact modal số plan/Trip/tài nguyên; modal request có Kiểm tra dẫn preview trước/sau và buttons theo feasible/infeasible/unavailable; Parent thấy outcome; màn thêm vào cặp tuyến ghi rõ áp dụng chuyến tạo sau. Chưa code/render/nghiệm thu UI; cần PO duyệt cấu trúc cuối.

## 9. Verification & Testing
Đã kiểm tra git status (217 entries đầu task), schema, cancel/preview/generation/Trip/navigation sources, resource reservation/Driver rules, StudentRequest approval và Parent/controller endpoints, disable Student, School/Parking services/controllers, Settings/Request UI và tài liệu kiến trúc liên quan. Source khẳng định Trip đọc live route và adapter VRP/TSP có fallback. Không chạy tsc/tests/build vì chỉ thiết kế; không gọi VietMap, SMTP/OTP hoặc DB. Runtime NOT_VERIFIED; UAT side effects cần scope Test Data Policy. Không dùng số tests task trước làm verification mới.

## 10. Issues & Risks
Snapshot là điều kiện thiết kế quan trọng để giữ lịch sử và không kéo học sinh vào Trip cũ. Ready/attendance trước Start phải được tách khỏi SCHEDULED còn trống. Khóa/CAS cần đồng bộ với TripOperation/generation/expiry, provider ngoài transaction. Constraints overrides không được âm thầm ảnh hưởng các Route khác; historical School contract không bị overwrite trên plan cũ. Exclusion không phải ABSENT/withdrawal. Các phần thêm ngoài quyết định rõ đều được đánh dấu đề xuất.

## 11. Reviewer Focus
Tính đúng dữ liệu snapshot/parent privacy/navigation fingerprint; reservation vs actual occupancy; expiry theo VN và cron trễ; partial solver success vs strict all-routes; route-only insertion vs existing SCHEDULED roster; School Admin địa điểm chưa có tuyến vs đã có tuyến; cancel request race approve; Route rỗng/leave/QR/exclusion và không tự phục hồi khi enable/gia hạn.

## 12. Suggested Next Step
PO xem và duyệt hướng snapshot/DB, draft UI/API cùng edge policies trong mục 12 của bản thiết kế trước khi tạo prompt triển khai.

## 13. Approval Status
Bốn quyết định nghiệp vụ bổ sung do PO cung cấp đã ghi nhận; agent không tự cấp approval schema/API/wireframe hoặc implementation. Chưa soạn prompt hoặc sửa code. STOP-AFTER-TASK, chờ PO phản hồi thiết kế.
