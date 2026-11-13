# Kiểm toán School Admin — độ phủ API trên Web

Ngày 07/11/2026. Phạm vi: toàn bộ nhánh SCHOOL_ADMIN trong `web/`, so với controller/service/DTO API hiện hành và working tree P0–P2. Đây là kiểm toán source, không phải nghiệm thu runtime.
PO quản lý cả SYSTEM_ADMIN và SCHOOL_ADMIN; các đợt tiếp theo không giới hạn Web chỉ ở nhà xe. Việc mở rộng quyền backend vẫn theo đúng role hiện hành.

## 1. Kết luận
Các luồng nghiệp vụ chính đã có caller Web, nhưng chưa đủ toàn bộ khả năng API. Có ba thiếu sót Web đã xác minh và một khoảng thiếu API đọc cho P3. Không cần xây lại toàn bộ School Admin.

## 2. Ma trận chức năng
Đường dẫn API dưới đây bỏ prefix `/api/v1` cho ngắn. “Đã gắn” nghĩa có caller và UI theo source, không đồng nghĩa mutation đã được test với DB.

| Màn hình | Chức năng/API | Kết quả source | Điểm bắt đầu Web |
|---|---|---|---|
| Tổng quan | GET /admin/overview theo trường; task links | Đã gắn, School Admin lấy schoolId từ user | app/admin/page.tsx; lib/admin-overview.ts |
| Học sinh | GET/POST /schools/:schoolId/students; tìm kiếm/phân trang/địa giới | Đã gắn; POST dành SCHOOL_ADMIN | components/admin/students/student-table.tsx; app/admin/students/_components/add-student-modal.tsx |
| Chi tiết học sinh | GET detail, GET disable-impact, PATCH status | Đã gắn; ngừng/kích hoạt có modal tác động | app/admin/students/[id]/page.tsx; components/admin/students/status-confirm-modal.tsx |
| Địa chỉ và yêu cầu | GET danh sách/detail/history; approve/reject; PATCH địa chỉ trực tiếp | Đã gắn nhánh School Admin; đổi ảnh hưởng tuyến vẫn do backend quyết định | app/admin/requests/page.tsx; components/admin/requests/request-detail-modal.tsx; student detail |
| Giáo viên phụ xe | GET list/detail, POST employees, GET deactivation-impact, PATCH status | Đã gắn, nhân sự BUS_ATTENDANT cùng trường | app/admin/teachers/**; ResourceStatusDialog |
| Bàn giao tài khoản giáo viên | POST employees/:id/credentials/resend; credentialDeliveryStatus của create | CHƯA ĐỦ: không có nút cấp lại; create đang bỏ qua delivery status | add-teacher-modal.tsx; teachers/page.tsx; api-client.ts |
| Phương án tuyến | GET list/detail/routes/readiness; candidate phụ xe; PATCH assignments/bus-attendant; POST approve | Đã gắn; candidate đã gửi vehicleId; duyệt chỉ SCHOOL_ADMIN | routes/plans/[id]/_components/saved-route-plan-workspace.tsx, route-plan-assignments.tsx; school-route-plan-approval.tsx |
| Hủy phương án | GET cancellation-impact; POST cancel kèm reason/fingerprint | Đã gắn theo quyền/trạng thái, không mặc định School Admin được hủy mọi trạng thái | saved-route-plan-workspace.tsx; cancel-route-plan-modal.tsx |
| Chuyến xe | GET list/detail/attendance/navigation; PATCH phụ xe theo quyền; lịch sử operationAudit | Đã gắn; dùng roster cho thống kê/guard, map/GPS readonly | trips/page.tsx; trips/[id]/page.tsx; trip-assignment-modal.tsx; lib/trip-location.ts |
| Hủy do toàn học sinh vắng | POST /trips/:id/cancel-all-absent | Đã gắn P2, guard đúng trường/chiều về/Ready/toàn ABSENT/chưa chạy; API kiểm cuối | trips/[id]/_components/trip-actions.tsx |
| Báo nghỉ | GET list/detail/candidates; assign-replacement; cancel-trip | Đã gắn; School Admin xử lý báo nghỉ phụ xe, không thay tài xế | leave-notices/page.tsx và _components |
| Sự cố | GET list/detail/candidates; resolve/cancel-trip phụ xe; close 3 loại mới | Đã gắn theo role/status; không cấp quyền xác nhận OFF_ROUTE/LATE_STOP của phụ xe cho admin | incidents/page.tsx và _components |
| Lịch vận hành | GET settings/scheduled-changes/calendar; POST ngày nghỉ/học bù; cancel ngày nghỉ | Đã gắn, trường đọc lịch nhà xe + lịch mình; học bù chờ nhà xe duyệt | calendar/page.tsx; SchoolSchedule; SchoolOperatingCalendar; ServiceCalendarPanel |
| Thông báo | list/summary/target; read/read-all | Đã gắn thông qua lib riêng, không chỉ api-client | lib/notifications.ts; components/admin/notifications |
| Tài khoản | me/change-password/avatar/logout/refresh | Đã gắn; đổi tên API chỉ PARENT nên không coi là thiếu School Admin | settings/page.tsx; auth-provider; api-client |
| Liên kết phụ huynh | GET detail parentLinkAudit; POST revoke | Audit CHƯA hiển thị. Revoke chưa gắn do thiếu GET danh sách link hiện hành cho admin | students/[id]/page.tsx; StudentDetail type |

## 3. Thiếu sót cần xử lý

### SA-01 — Cấp lại mật khẩu giáo viên: có API, chưa có Web
- API: POST `/schools/:id/employees/:employeeId/credentials/resend`, HTTP 200, không body.
- Controller `api/src/schools/schools.controller.ts` từ dòng 482; SCHOOL_ADMIN chỉ cho BUS_ATTENDANT cùng trường. SYSTEM_ADMIN dùng cho SCHOOL_ADMIN.
- Web chưa có client method hoặc caller chứa `credentials/resend`; trang list/detail giáo viên mới có chi tiết và status.
- Cần xác nhận trước thao tác vì backend **đổi mật khẩu trước khi gửi email**; đây không phải chỉ gửi lại email cũ.
- Xử lý response SENT/FAILED/CONSOLE; FAILED không được báo mật khẩu cũ vẫn còn dùng được. Không hiển thị mật khẩu trên Web.

### SA-02 — Tạo giáo viên bỏ qua kết quả gửi email
- API tạo nhân sự trả `credentialDeliveryStatus`, có thể HTTP thành công nhưng FAILED.
- `app/admin/teachers/_components/add-teacher-modal.tsx` await createTeacher rồi gọi `onSuccess()` không truyền response.
- `app/admin/teachers/page.tsx` luôn toast “Đã tạo tài khoản giáo viên thành công.”
- Cần truyền response về và tái sử dụng cách phân biệt status của `school-employees-tab.tsx`; khi FAILED, tài khoản đã tạo, hướng sang SA-01, không tạo lại.
- Rủi ro: người quản trị hiểu là thông tin đăng nhập đã bàn giao thành công trong khi email chưa gửi được.

### SA-03 — Lịch sử thu hồi đã có dữ liệu nhưng chưa trình bày
- `StudentsService.getStudent` trả `parentLinkAudit`; DTO khai báo unknown.
- Web StudentDetail/type và detail page chưa đọc trường này; không có lịch sử thu hồi trong hồ sơ học sinh.
- Có thể bổ sung khối readonly thu gọn, parse defensively, hiển thị action/reason/time, tránh raw JSON. Chưa đủ dữ liệu tên actor/phụ huynh thì không tự suy danh tính.

### SA-04 — Thu hồi liên kết P3: thiếu API đọc cho admin
- Có POST `/schools/:schoolId/students/:studentId/parent-links/:parentId/revoke`, chỉ SCHOOL_ADMIN đúng trường.
- GET detail hiện không trả parentLinks; GET `/parents/students` chỉ PARENT và lấy user.id hiện tại.
- Cần chốt GET danh sách liên kết hiện hành theo học sinh cho SCHOOL_ADMIN trước khi thêm action revoke. Tái sử dụng ParentStudentLink; chưa có lý do thêm bảng.
- Không lấy guardianPhone/audit cũ/request cũ suy parentId; không cho SYSTEM_ADMIN gọi revoke vì UI chung.

## 4. Những thứ không phải thiếu chức năng School Admin
- Tạo/tối ưu RoutePlan, chọn xe/tài xế mặc định, sinh chuyến thủ công: SYSTEM_ADMIN.
- Duyệt học bù, chốt chuyến hành chính, mở lại chuyến hủy, hẹn thay đổi cốt lõi của trường: SYSTEM_ADMIN theo API.
- Start/complete, ghi GPS, Ready/điểm danh/đính chính/xác nhận lệch tuyến hoặc đón trả chậm: nhân sự Mobile theo role.
- Hủy học bù chưa được API hỗ trợ; không tự thêm nút.
- Không có API sửa chung họ tên/phone giáo viên qua admin trong phần đã kiểm; không coi lack UI edit là endpoint bị bỏ quên.

## 5. Mức kiểm chứng và ưu tiên
- Đã kiểm controller roles và đường dẫn, service relevant contracts, DTO, api-client, caller trực tiếp lẫn lib/helper. Các method dùng dạng xuống dòng và `apiClient.request` được kiểm riêng để tránh kết luận nhầm là không có caller.
- Không chạy mutation, không tạo data, không dùng token PARENT giả danh admin. Chưa thực hiện browser UAT School Admin trong lượt này.
- Không khẳng định mọi payload, tình huống xung đột, lịch/hợp đồng hoặc phân quyền đều đã nghiệm thu end-to-end. Một số bug API đã được ghi ở FE guide vẫn cần backend xử lý.
- Ưu tiên tiếp theo: SA-01 + SA-02 thành một luồng bàn giao tài khoản hoàn chỉnh; SA-03 readonly; SA-04 sau duyệt GET contract.
- Không sửa application code/backend trong lượt kiểm toán. Kết quả P0–P2 đang có vẫn giữ nguyên trong working tree.


## 6. Cập nhật sau kiểm tra trực tiếp School Admin

Đã đăng nhập tài khoản School Admin có sẵn, mở 11 đường dẫn desktop/mobile và một số form read-only ngày 07/11/2026. Không còn chỉ là kiểm toán source. Phát hiện thêm GET trường403 ở danh sách chuyến, lỗi routing409 bị hiện thành chưa phân tuyến, Tổng quan tràn ngang mobile, cùng các rủi ro form/validation/recovery qua source. Ma trận13 findings, bằng chứng, wireframe và các bước triển khai được cập nhật tại [school-admin-completion-plan.md](school-admin-completion-plan.md). Chưa chạy business mutations, không coi coverage bằng nghiệm thu mọi case.

## 7. Cập nhật sau triển khai kế hoạch

PO đã duyệt và Web đã thực hiện SA-01/02/03, SA-05–13. Xem kết quả và giới hạn nghiệm thu tại [kế hoạch §10](school-admin-completion-plan.md#10-kết-quả-triển-khai-07112026). SA-04 vẫn HELD do thiếu GET liên kết phụ huynh; không thay backend. Báo cáo kiểm toán các mục trước là bằng chứng trước sửa, không phải trạng thái lỗi hiện tại.
