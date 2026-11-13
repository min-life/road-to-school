# System Admin — kiểm tra kết nối API Web

Ngày 07/11/2026. Phạm vi: source hiện hành trong working tree, không chỉ HEAD. Đây là kiểm tra kết nối/caller/quyền, không phải nghiệm thu toàn bộ nghiệp vụ runtime.

## Kết luận

Chưa gắn đầy đủ. Hai thiếu sót đã xác nhận: cấp lại mật khẩu tài xế và cấp lại mật khẩu quản trị trường. Các nhóm vận hành chính có caller Web. Không tính endpoint chỉ dành Mobile hoặc School Admin là thiếu chức năng System Admin.

## Các nhóm đã có kết nối

| Màn hình/nhóm | Kết nối tìm thấy |
|---|---|
| Tổng quan | GET admin/overview, liên kết công việc theo filter/scope |
| Trường | Danh sách/địa giới/detail/tạo; location-impact/location/contract/schedule/status; lịch thay đổi và hủy thay đổi |
| Nhân viên trường | Danh sách/detail client, tạo SCHOOL_ADMIN; tác động/ngừng/kích hoạt theo quyền |
| Xe và tài xế | Danh sách/tạo/detail tài xế; tác động và ngừng/kích hoạt/bàn giao nguồn lực; lịch tài xế dùng GET trips rồi lọc driverId |
| Phương án tuyến | Preparation, optimize-preview, cancel-return, confirm-plan, danh sách/detail/readiness, hủy+impact/fingerprint, re-optimize, candidate và phân xe/tài xế theo nhóm |
| Học sinh trong trường | Danh sách/detail/địa giới/routing; insertion-options, insertion preview/confirm |
| Chuyến | Danh sách/detail/generate, đổi phân công theo quyền, attendance/navigation/operational-state readonly; mở lại, hủy toàn vắng, chốt hành chính và audit |
| Báo nghỉ | Danh sách/detail, replacement-candidates/assign-replacement/cancel-trip theo scope và quyền |
| Sự cố | Danh sách/detail, replacement-candidates/resolve/cancel-trip/close; Web không thay phụ xe xác nhận auto incident |
| Yêu cầu | System list/detail/routing-preview/approve/reject, preview token/fingerprint |
| Cài đặt/lịch | GET/PUT parking, impact, hủy/áp dụng thay đổi đã hẹn; lịch nhà xe, xem lịch trường, quyết định học bù; đổi mật khẩu/avatar |
| Thông báo | List/summary/target/read/read-all |

Nguồn đối chiếu: controllers trong api/src; web/src/lib/api-client.ts và các lib admin-overview/notifications; route handlers/components dưới web/src/app/admin và web/src/components/admin. Đã lần caller thực tế, không coi có method trong client là đã có UI.

## Thiếu đã xác nhận

### SYS-01 — Cấp lại mật khẩu tài xế

- API: POST `/drivers/:id/credentials/resend`, HTTP200, không body, SYSTEM_ADMIN.
- Source: api/src/drivers/drivers.controller.ts → resendCredentials; auth/personnel-credentials.service.ts → resend.
- Web: api-client chưa có caller endpoint này. drivers/page.tsx và drivers/[id]/page.tsx chỉ có chi tiết/trạng thái/lịch, chưa có action cấp lại.
- Tác động: tài xế quên mật khẩu hoặc tạo tài khoản thành công nhưng gửi email FAILED chưa có thao tác quản trị cấp lại ở màn hình tài xế.

### SYS-02 — Cấp lại mật khẩu School Admin

- API: POST `/schools/:id/employees/:employeeId/credentials/resend`, không body; service cho SYSTEM_ADMIN cấp lại cho SCHOOL_ADMIN. Không cho nhà xe cấp lại cho BUS_ATTENDANT.
- Client có resendSchoolEmployeeCredentials nhưng hiện chỉ được dùng qua ResendCredentialsDialog ở teachers list/detail của School Admin.
- Màn hình Trường → Nhân viên trường (school-employees-tab.tsx) chưa có action gọi resend cho SCHOOL_ADMIN; hiện có tạo và ngừng/kích hoạt.
- Tác động: đã báo FAILED khi tạo tài khoản quản trị trường nhưng chưa có thao tác gửi/cấp lại tại đó.

Cả hai endpoint sinh/lưu mật khẩu mới trước khi gửi mail. UI cần xác nhận, khóa gửi lặp, phân biệt SENT/FAILED/CONSOLE. FAILED không đồng nghĩa chưa đổi mật khẩu; không tạo tài khoản mới để thử lại. Đây là ghi nhận, chưa triển khai.

## Không phải thiếu API System Admin

- Duyệt RoutePlan, phân giáo viên phụ xe và revoke liên kết phụ huynh là quyền SCHOOL_ADMIN; không đưa vào nhà xe.
- Start/arrive/complete, Ready, điểm danh/xuống xe/QR/correction và confirm auto incident là nghiệp vụ Mobile theo role.
- SA-04 thiếu GET liên kết cho School Admin không phải lý do cấp SYSTEM_ADMIN quyền revoke.
- GET routes danh sách có client nhưng không có caller hiện tại: Web tổ chức theo RoutePlan và đọc detail từng tuyến. Chưa đủ cơ sở gọi đây là thiếu tính năng; không bắt buộc một endpoint có một màn hình riêng.
- updateSchool và cancelParentUpdateRequest còn method không caller; không dùng chúng để kết luận cần UI nhà xe (cập nhật trường đang đi qua endpoint chuyên biệt, hủy yêu cầu thuộc phụ huynh).

## Mức kiểm chứng

- Đã đối chiếu source controller/service/client/caller trên working tree và tài liệu integration plan hiện hành.
- Không chạy lại browser toàn bộ System Admin, không gửi mutation, không sửa API/DB/application code trong lượt này. Không tuyên bố mọi payload, filter, pagination, quyền và nhánh xung đột đều đã nghiệm thu.
- Build/tsc19 tests PASS thuộc lượt triển khai School Admin ngay trước đó, không phải bằng chứng E2E System Admin của lượt kiểm toán này.
- NOT_VERIFIED: cấp/giao email thật, phân công/xung đột, cron, dữ liệu nguồn lực lớn và toàn bộ regression runtime. BLOCKED_BY_TEST_DATA_POLICY nếu cần sinh dữ liệu để nghiệm thu.

## Bước tiếp theo

Hoàn thiện SYS-01/SYS-02 bằng action/dialog chung đã có; giữ API, quyền và dữ liệu, không tạo tài khoản hay gửi email để test khi chưa được PO cho phép đúng tác vụ.

## Cập nhật triển khai SYS-01/SYS-02

PO đã duyệt và Web đã bổ sung hai thao tác ngày07/11/2026. Các mục “thiếu” bên trên là bằng chứng trước sửa. Dùng chung dialog xác nhận với giáo viên; client thêm POST driver resend không body và encode ID. Nhân viên trường có kiểm riêng role SCHOOL_ADMIN; không mở quyền cấp lại BUS_ATTENDANT cho nhà xe.

Build/tsc19tests PASS; lint5files13 lỗi baseline,13 hiện tại,0 mới. Playwright: mở dialog tài xế và quản trị trường trên desktop/mobile390×844, footer trong viewport/Escape đóng;9 dòng giáo viên của trường không có nút cấp lại; không gửi POST credentials. Cấp lại/gửi email thật và nhánh lỗi mutation vẫn NOT_VERIFIED, không đổi dữ liệu để nghiệm thu.
