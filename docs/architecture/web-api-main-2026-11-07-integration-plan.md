# Kế hoạch đồng bộ Web với API main — 07/11/2026

Trạng thái: **P0–P2 ĐÃ TRIỂN KHAI, ĐÃ KIỂM TRA READ-ONLY, CHỜ PO REVIEW** theo yêu cầu PO ngày 07/11/2026. P3 giữ chờ nguồn GET liên kết. Nội dung bên dưới lưu phạm vi đã duyệt; hướng dẫn dùng tại [Web usage](../../web/docs/business-improvements-usage.md).
Mốc đối chiếu: trước merge `3e1c10e` → merge `1f25771`, nhận `origin/main 4a7dc96`.
Phạm vi: SYSTEM_ADMIN và SCHOOL_ADMIN trên Web; không sửa API, Mobile, schema, DB, seed hoặc cài package.

## 1. Nguồn chuẩn và kết luận

Đã đối chiếu diff API vừa merge, controller, DTO, service và caller Web; tham khảo [FE_INTEGRATION_GUIDE](../FE_INTEGRATION_GUIDE.md). Khi khác nhau, dùng source API hiện tại.
Đây là kiểm toán source theo phạm vi đợt merge, không phải nghiệm thu runtime toàn hệ thống.

Web đã có nhiều tích hợp từ đợt trước; cần sửa các điểm lệch và bổ sung chức năng cụ thể, giữ workspace bản đồ/phân công đã duyệt.

Hai kết luận lịch sử nay đã thay đổi:
- API **đã có lọc địa giới** bằng provinceId/wardId cho trường, học sinh và preparation; không còn đúng nếu nói chỉ có province trong response.
- Dời bãi **đã có cron mỗi phút** trong SystemSettingsService.reconcileParkingLot. Có code cron không đồng nghĩa đã kiểm chứng cron chạy thành công trên máy đang dùng.

Base API hiện là /api/v1 theo api/src/main.ts; Web mặc định đã khớp. Tài liệu đối chiếu ngày 05/11 chỉ là mốc lịch sử, cần cập nhật mục liên quan khi triển khai.

## 2. Ma trận API mới và tình trạng Web

| Nhóm | API hiện tại | Web hiện tại | Hành động |
| --- | --- | --- | --- |
| Nhân sự | Tạo DRIVER/SCHOOL_ADMIN/BUS_ATTENDANT bắt buộc email + phone | Tài xế/giáo viên đã yêu cầu; tạo quản trị trường còn cho email hoặc phone | Sửa form tạo quản trị trường và type request |
| Địa giới | provinceId, wardId; 2 API location-options | api-client/types/UI chưa có ID/options/filter | Thêm filter server-side đúng scope |
| Candidate nhóm xe | Driver và phụ xe nhận query vehicleId | Hai caller chưa truyền vehicleId | Truyền xe nhóm hiện tại; tránh ứng viên đang gán bị xem là nhóm khác |
| Hủy phương án | Bắt buộc fingerprint từ cancellation-impact | Đã fetch/gửi fingerprint, khóa submit khi thiếu | Giữ; siết type required và kiểm chứng 409 |
| Duyệt địa chỉ | REOPTIMIZED cần previewToken + fingerprint | Đã có preview và gửi hai giá trị | Kiểm guard trước submit; sửa copy hiệu lực từ ngày mai; refresh khi 409 |
| Preview lập tuyến | Confirm kiểm lại thành viên/nguồn lực; hết token 404, dữ liệu đổi 409 | Hiển thị lỗi nhưng vẫn giữ preview cũ có thể bấm lưu lại | Đánh dấu preview hết hiệu lực; yêu cầu tối ưu lại, không tự retry mutation |
| Ngày phục vụ đầu | firstServiceDate trên plan/approve/readiness | Chưa có type hoặc hiển thị | Hiển thị từ response sau duyệt, không tự tính hoặc nói Trip đã sinh |
| Tổng quan | Thêm ADMIN_FINALIZATION và REOPTIMIZATION | tasks.map đã render kind mới; link/đích chưa khớp đầy đủ | Sửa điều hướng và nối filter, không tạo dashboard khác |
| Bãi xe | GET chưa cấu hình trả 409; PUT đầu tiên áp dụng ngay; radius >0..500 | Form bị disabled khi parkingLot=null; chưa có radius | Tách trạng thái chưa cấu hình/lỗi tải, mở form cấu hình đầu; thêm radius |
| Dời bãi | Đặt lịch chưa hủy Trip/chưa gắn cờ plan; đến hạn mới đối soát | Có impact/hẹn/hủy/apply nhưng copy có thể hiểu đã tối ưu lại ngay | Sửa nhãn thời điểm; giữ dữ liệu impact, không nói đã áp dụng lúc đặt lịch |
| Sự cố | POST close cho 3 loại mới; locationSource/capturedAt | Có map và nhãn loại mới, chưa có close và chưa phân biệt vị trí cũ | Thêm đóng có lý do + expectedStatus; hiển thị nguồn/thời gian vị trí |
| Chuyến | cancel-all-absent; reopen; operationAudit | Chi tiết/roster đã có, chưa gắn 3 phần này | Bổ sung action theo role và lịch sử nghiệp vụ gọn |
| Điểm danh correction | Chỉ BUS_ATTENDANT | Web dùng cho hai admin | Chỉ đọc kết quả/audit, không thêm nút sửa điểm danh admin |
| Parent link | SCHOOL_ADMIN được revoke có reason; detail có parentLinkAudit | Chưa có UI/API client; chưa thấy GET danh sách link hiện hành cho admin | Chỉ đưa vào giai đoạn chờ contract dữ liệu, không đoán parentId |
| Ngừng tài nguyên | Mutation chặn Ready/đã điểm danh/đang chạy | Dialog impact mới chỉ diễn giải blocker đang chạy | Giữ BE quyết định, refresh impact/giữ lỗi chính xác; không tự cấp quyền |
| Snapshot | Giữ lịch sử; đồng bộ địa chỉ/roster từ mai; Ready giữ giờ khi chỉ đổi giờ | Trip dùng detail/roster, chưa dùng operationAudit | Giữ response Trip làm chuẩn, không lấy profile hiện tại thay điểm lịch sử |

## 3. P0 — Sửa các luồng hiện tại dễ lỗi

### 3.1 Tạo quản trị trường

Màn: Trường học → Chi tiết → Nhân viên trường → Thêm quản trị viên.
- Cả email và SĐT có dấu bắt buộc; bỏ hướng dẫn “hoặc”.
- Validate theo DTO nhân sự trường, chuẩn hóa input phù hợp; không dùng regex đầu số chứa ký tự | trong character class.
- createSchoolAdmin request bắt buộc email/phone; phản ánh credentialDeliveryStatus giống form nhân sự đã có.
- Không ép bổ sung số điện thoại cho tài khoản cũ.

Files: web/src/app/admin/schools/[id]/_components/create-school-admin-modal.tsx; web/src/lib/api-client.ts; types liên quan.
Bằng chứng: api/src/schools/dto/create-school-admin.dto.ts; form hiện còn gửi trimmedEmail || undefined và trimmedPhone || undefined.

### 3.2 Candidate phân công đúng nhóm

Màn: Chi tiết phương án → Phân công → Chọn tài xế/phụ xe.
- getCandidateDrivers(planId, vehicleId?) và getCandidateBusAttendants(planId, vehicleId?).
- Caller truyền selected group.vehicleId, không đổi payload gán nhóm.
- Giữ isEligible/reason do API trả, không bỏ disable bằng suy luận UI.
- Sau lỗi 400/409 tải lại plan/readiness/candidates; không tự gửi lại.
Files: web/src/lib/api-client.ts; web/src/app/admin/routes/plans/[id]/_components/route-plan-assignments.tsx.
Bằng chứng: api/src/routes/routes.controller.ts và resource-availability.service.ts.

### 3.3 Điều hướng Tổng quan

- ADMIN_FINALIZATION hiện trả /admin/trips/admin-finalizations, Web hiện có /admin/trips?tab=finalizations; path cũ có thể rơi vào [id].
- Chuẩn hóa link kind đã biết ở Web và thêm alias redirect cho URL cũ, giữ schoolId. Không sửa href API.
- API client getAdminFinalizations thêm schoolId; panel nhận scope, không hiển thị toàn nhà xe khi bấm từ thống kê một trường.
- REOPTIMIZATION: đọc needsReoptimization từ URL, truyền listRoutePlans; giữ filter ở URL qua pagination/back. API không gửi status sẽ xét DRAFT/ACTIVE.
- tasks.kind mới vẫn render fallback; không hardcode chỉ 4 kind.
Files: web/src/lib/admin-overview.ts; web/src/app/admin/page.tsx; web/src/app/admin/routes/page.tsx; web/src/app/admin/trips/page.tsx; trips/_components/admin-finalizations-panel.tsx; api-client.ts; alias route-private mới nếu cần.

### 3.4 Cấu hình bãi lần đầu và preview lỗi thời

- GET bãi 409 “chưa cấu hình” là trạng thái cần cấu hình, không phải lỗi mạng; phân biệt bằng contract/code thực tế, không nuốt mọi 409 thành rỗng.
- Cho nhập địa chỉ/chọn tọa độ và PUT đầu tiên trực tiếp. Tọa độ chưa chọn là null; tâm map mặc định chỉ để xem, không coi là bãi đã cấu hình.
- Khi đã có bãi: đổi tọa độ phải xem tác động + ngày từ mai; trường hợp đổi nhãn không đổi tọa độ giữ nhánh hiện có.
- maxOperatingRadiusKm hiển thị giá trị GET, validate >0 và <=500; request không gửi thì API giữ giá trị cũ. Chưa cấu hình thì dùng default 50 của API.
- Chuẩn hóa copy dời bãi: “Đã hẹn dời bãi”; tác động diễn ra khi đến hạn. Hủy lịch trước hạn giữ chuyến gốc.
- Preview confirm 404/409: giữ lựa chọn/input để người dùng điều chỉnh, vô hiệu hóa lưu preview cũ, cung cấp “Tối ưu lại”. Không tự tối ưu hoặc confirm lại.
Files: settings/page.tsx, lib/types.ts, lib/api-client.ts, routes/create/page.tsx, component lưu preview liên quan.

## 4. P1 — Bổ sung bộ lọc tỉnh và phường/xã

### Contract

- GET /schools/location-options — SYSTEM_ADMIN.
- GET /schools/:schoolId/students/location-options — SYSTEM_ADMIN hoặc SCHOOL_ADMIN đúng trường.
- Response: {provinces:[{id,name}], wards:[{id,name,provinceId}]}.
- GET /schools, GET /schools/:schoolId/students, GET /routes/preparation/:schoolId nhận provinceId?/wardId?.
- Hai ID là String ID VietMap, không phải mã hành chính Nhà nước; không suy từ tên tỉnh.
- Query bỏ trống thì bỏ tham số, không gửi chuỗi rỗng. Có cả hai thì AND.
- Options dựa trên DB đúng scope, không dựa trên riêng trang phân trang và không gọi VietMap khi mở bộ lọc.
- Dữ liệu cũ chưa có ID vẫn hiện khi không lọc, không tự backfill/đoán ID.
- Tỉnh đổi thì xóa phường không thuộc tỉnh mới; không tự chọn tỉnh theo trường/bãi.

### Wireframe đề xuất — chờ duyệt

Danh sách trường:
[ Tìm trường… ] [ Trạng thái ] [ Tỉnh/thành ] [ Phường/xã ]

Danh sách học sinh:
[ Tìm học sinh… ] [ Trạng thái ] [ Địa chỉ ] [ Phân tuyến ]
[ Tỉnh/thành ] [ Phường/xã ]             [ Xóa bộ lọc ]

Lập tuyến → panel Học sinh:
[ Tìm học sinh… ]
[ Tỉnh/thành ] [ Phường/xã ]
Đã chọn N học sinh — danh sách đang lọc không thay lựa chọn.

- Dùng FilterToolbar/FilterField/Select sẵn có, wrap responsive; không thêm sidebar hoặc modal lọc mới.
- Danh sách trường/học sinh lọc tại API trước count/pagination; đổi filter reset page=1.
- Lập tuyến: tách state danh sách đang xem và tập studentIds đã chọn. Đổi filter không gọi logic mặc định chọn lại toàn bộ, không xóa học sinh khuất filter.
- Giữ cache dữ liệu học sinh đã chọn cho marker/tóm tắt; xử lý response cũ về muộn. Nút chọn tất cả/bỏ chọn phải ghi rõ phạm vi danh sách đang xem.
- Không đổi eligibility/optimize/confirm/studentIds payload do việc lọc.

Files: api-client.ts, types.ts; schools/page.tsx; students/page.tsx; components/admin/students/student-table.tsx (kiểm caller cùng trường); routes/create/page.tsx và picker private/shared hiện có.
Chỉ tạo shared geography-filter nếu thực sự dùng chung các màn; component shared không import route-private.

## 5. P2 — Thao tác sự cố và chuyến trên màn hiện có

### 5.1 Đóng sự cố

Màn Sự cố → Chi tiết, tái sử dụng LifecycleDialog và style vừa duyệt.
- Chỉ NO_GUARDIAN_AT_STOP, TRAFFIC_DELAY, GPS_SIGNAL_LOST; SYSTEM_ADMIN hoặc SCHOOL_ADMIN đúng scope.
- Chỉ trạng thái chưa kết thúc; không CLOSED/RESOLVED/CONFIRMED.
- POST /incidents/:id/close {reason, expectedStatus}; reason trim, bắt buộc, <=500.
- Footer “Đóng cửa sổ” phân biệt “Kết thúc sự cố”; mở form lý do gọn trong dialog, không popup chồng.
- 409 tải lại detail/list, giữ lý do cho người dùng; không tự close lại.
- CLOSED_BY_ADMIN hiển thị tiếng Việt, không rơi vào nhãn thay thế nhân sự.
- Map đọc context.locationSource/capturedAt/addressText: LAST_KNOWN ghi “Vị trí cuối ghi nhận”; UNKNOWN không vẽ pin giả. Không in raw JSON.
Files: incidents/page.tsx; incidents/_components/incident-location.tsx; component đóng sự cố private; api-client.ts; types.ts.

### 5.2 Chuyến toàn bộ học sinh vắng

Màn Chi tiết chuyến; giữ map/panel và thanh thống kê.
- SYSTEM_ADMIN/SCHOOL_ADMIN đúng trường; chiều về TO_PARKING, SCHEDULED, chưa start, đã Ready.
- Roster GET /trips/:id/attendance không rỗng; active roster đều ABSENT có lý do, chưa alighted.
- Nút “Hủy chuyến do học sinh vắng” → modal xác nhận lý do <=500.
- POST /trips/:id/cancel-all-absent {reason}; chỉ cập nhật UI thành công sau response.
- Không tính từ counters operational-state vì R07; server kiểm lại tại mutation.

### 5.3 Mở lại chuyến

- Chỉ SYSTEM_ADMIN; SCHOOL_ADMIN không có nút.
- Nút trong thao tác Chi tiết chuyến CANCELLED, trước giờ xuất phát cũ, chưa có bằng chứng xuất phát/nhận trẻ.
- POST /trips/:id/reopen {reason, vehicleId?, driverId?, busAttendantId?}.
- Lý do bắt buộc <=500. Mặc định giữ phân công cũ; nếu đổi dùng nguồn danh sách có quyền hiện có, không gắn nhãn “khả dụng” khi chưa kiểm availability.
- Không dùng modal đổi phân công thường cho CANCELLED vì contract hiện chỉ cho SCHEDULED.
- Backend quyết định lịch hiện hành/giờ mới/nguồn lực/roster và có thể trả 409 dù UI cho mở form.
- Thành công giữ tripId, tải lại detail/roster/operational-state, không sao chép roster cũ và không tự Ready.
- Giữ đơn nghỉ học sinh còn hiệu lực; không reset mọi học sinh thành chưa điểm danh ở frontend.

### 5.4 Audit và ngày phục vụ

- Thêm type có kiểm tra cho operationAudit; hiển thị lịch sử thu gọn trong “Chi tiết” gồm thao tác, lý do, người thực hiện, thời điểm.
- Không in snapshot before/after JSON khổng lồ lên UI.
- Correction do phụ xe thực hiện: Web chỉ đọc audit, không gọi endpoint BUS_ATTENDANT.
- firstServiceDate hiển thị trên chi tiết phương án/sau duyệt khi có; null không tự tính từ activatedAt+1. Nhãn “Ngày phục vụ đầu tiên”, không “Đã sinh chuyến”.
Files nhóm chuyến: trips/[id]/page.tsx; _components/trip-attendance.tsx (chỉ đọc roster); dialog hành động private; api-client.ts; types.ts.
Files phương án: saved/system workspace, approval/readiness component hiện có; giữ phân công theo vai trò.

Wireframe hành động gọn — chờ duyệt:
Header chuyến [Trạng thái] [Thao tác]
Chi tiết thu gọn → metadata / Lịch sử xử lý
Map | Học sinh / Điểm dừng (giữ nguyên)

Dialog hành động:
Tên thao tác
Tóm tắt chuyến và tác động
[Lý do *]
[Nguồn lực tùy chọn — chỉ mở lại]
[Quay lại] [Xác nhận]

## 6. P3 — Thu hồi liên kết phụ huynh: có API ghi, thiếu dữ liệu để làm UI an toàn

POST /schools/:schoolId/students/:studentId/parent-links/:parentId/revoke {reason} chỉ SCHOOL_ADMIN.
Detail học sinh có parentLinkAudit nhưng hiện không trả danh sách parent links đang tồn tại; audit REVOKED không thể thay danh sách hiện hành.
Chưa tìm thấy GET admin tương ứng trong controller học sinh/trường. Không dùng guardianPhone suy parentId, không đọc trực tiếp DB từ Web, không cấp SYSTEM_ADMIN quyền revoke.

Kế hoạch:
1. Xác nhận nguồn GET hiện hành hoặc contract đọc liên kết với backend owner.
2. Khi đủ contract: SCHOOL_ADMIN xem “Phụ huynh liên kết” trong chi tiết học sinh, chọn đúng liên kết, nhập lý do, xác nhận thu hồi.
3. Giữ các link khác và lịch sử; đổi guardianPhone không tự unlink.
Phần audit readonly có thể bổ sung trước, nhưng action revoke chờ có nguồn parentId hợp lệ. Không sửa backend trong kế hoạch này.

## 7. Các phần giữ nguyên và giới hạn API

- Hủy plan đã có impact/fingerprint, lỗi clear impact và nút kiểm lại; không viết lại luồng.
- Request địa chỉ đã có preview/fingerprint; chỉ bổ sung guard/hiệu lực từ ngày mai, không thay thuật toán.
- Trip assignment đã có expectedVehicleId/expectedDriverId/expectedBusAttendantId và khóa Ready/đã điểm danh.
- Reoptimization, resource handover, lịch nghỉ/cài đặt đã có; không tạo lại các module.
- Có đủ xe/tài xế/phụ xe không đồng nghĩa readiness=true: dùng isReadyForApproval/blockers của API, hiển thị cả blocker cấp phương án như STUDENT_ALREADY_ASSIGNED/RESOURCE_UNAVAILABLE.
- R01/R02/R07/R08/R09 trong guide còn được ghi là bug API hoãn sửa. Không tuyên bố frontend xử lý triệt để:
  - Web admin dùng roster attendance cho danh sách/thống kê, không lấy counters sai làm dữ liệu thật.
  - Mutation 400/409 giữ form/message và reload dữ liệu liên quan, không optimistic success.
  - Không thêm Start/Complete/Correction/điểm danh cho admin vì thấy endpoint mới.
- Chưa có endpoint thay plan cùng nhóm học sinh; không thiết kế nút thay phương án dựa vào giả định có API.
- Migration mới đã có trong repo; trạng thái applied trong guide là thông tin lịch sử, chưa xác nhận DB đang chạy trong lượt này. Không migrate/seed tự động.

## 8. Thứ tự triển khai và tiêu chí hoàn thành

1. **P0**: form quản trị trường; candidate theo nhóm; link/filter Tổng quan; cấu hình bãi đầu tiên; preview lỗi thời. Chặn sai request trước.
2. **P1**: types/API địa giới → trường/học sinh → preparation với selection độc lập.
3. **P2**: đóng sự cố → hai hành động chuyến → audit/firstServiceDate; giữ bố cục đã duyệt.
4. **P3**: revoke phụ huynh sau khi có nguồn dữ liệu đúng quyền.

Mỗi giai đoạn:
- Tsc, lint file liên quan, diff check; test pure query/role/date/guard không ghi DB.
- Browser desktop/mobile/viewport thấp, keyboard/Escape/focus, cuộn tới cuối.
- Kiểm GET bằng tài khoản đã có; xác nhận scope schoolId, URL filter/pagination/back.
- Không bấm xác nhận mutation trên DB để test khi chưa được PO cấp phép đúng tác vụ. Nhánh thành công/race/cron/provider đánh dấu NOT_VERIFIED nếu chưa chạy.
- Không ghi đè thay đổi API local; không commit/push khi chưa được giao.

Checklist nghiệm thu trọng điểm:
- Không thể submit thiếu email hoặc phone khi tạo nhân sự mới.
- Candidate cùng nhóm không bị loại do thiếu vehicleId; nhóm khác vẫn bị chặn.
- Hai task Tổng quan mở đúng màn và đúng tập bản ghi.
- Trường chưa cấu hình bãi có thể mở form cấu hình, không gửi tọa độ tâm bản đồ mặc định.
- Filter tỉnh/phường không chỉ lọc một trang và không thay studentIds đã chọn.
- Preview hết hạn không tiếp tục gửi lưu token cũ.
- Close/reopen/cancel-all-absent đúng role, lý do, trạng thái và refresh.
- Trip lịch sử không đổi điểm theo profile hiện tại; audit và firstServiceDate không bị diễn giải sai.

## 9. Phê duyệt

Đề xuất duyệt P0 → P2 theo các wireframe gọn ở trên; P3 tách chờ xác minh contract.
Không yêu cầu đổi API, database, thư viện hoặc luồng nghiệp vụ. Sau PO duyệt mới triển khai.

## 10. Kết quả triển khai

- Đã nối P0–P2 trên Web theo phạm vi trên; không sửa API/DB/Mobile/dependencies.
- Build production, typecheck và kiểm thử độc lập đã chạy. Chi tiết lệnh/kết quả ở báo cáo AI Review.
- Sau khi PostgreSQL/API hoạt động lại, đã kiểm tra read-only System Admin: Tổng quan → chốt hành chính, needsReoptimization, địa giới rỗng, form nhân sự bắt buộc, kết thúc sự cố và roster chuyến. Kiểm tra desktop/mobile không tràn ngang ở màn đã đo.
- Chưa kiểm thử phiên School Admin và các mutation/cron/provider. Bãi chưa cấu hình khiến preparation bị API chặn; địa giới hiện có chưa có ID nên chưa kiểm bộ lọc có lựa chọn. Không tạo dữ liệu hoặc lưu cấu hình bãi để test.
- P3 không có action revoke, không suy parentId hoặc tạo backend mới.
