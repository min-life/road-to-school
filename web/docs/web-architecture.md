# Kiến trúc Web — tìm đúng file

Snapshot source **02/11/2026**, bao gồm thay đổi cục bộ hiện có; không phải chứng nhận đã merge/deploy.
Đường dẫn dưới đây tính từ `web/`. Trước khi sửa vẫn kiểm tra import và guard hiện hành.
Xem [chỉ mục](README.md), [quy tắc component](component-conventions.md).

## 1. Khung chung và dữ liệu

Stack trong `package.json`: Next.js 16 / React 19 / TypeScript / Tailwind 4 / Zustand /
MapLibre / Radix Toast. Alias `@/*` trỏ tới `src/*`. Không có monorepo hay shared package.

| Trách nhiệm | File nguồn |
| --- | --- |
| Font local, AuthProvider, ToastProvider | `src/app/layout.tsx` |
| Theme và các CSS global được import | `src/app/globals.css` |
| Shell, guard, logout, notification provider | `src/app/admin/layout.tsx` |
| Sidebar/header, role menu | `src/components/admin/admin-sidebar.tsx`, `admin-header.tsx`, `admin-nav.config.ts` cùng thư mục |
| Shell CSS / responsive | `src/components/admin/admin-shell.css` |
| Login/reset password shell | `src/components/auth/auth-page-shell.tsx`, `src/app/login/page.tsx`, `src/app/forgot-password/page.tsx` |
| Phiên auth | `src/components/auth/auth-provider.tsx`, `auth-guard.tsx`, `src/lib/auth-storage.ts` |
| HTTP, refresh/error mapping, DTO frontend | `src/lib/api-client.ts`, `src/lib/types.ts` |
| Đi tới/đi về theo ngữ cảnh | `src/components/admin/common/context-navigation.tsx`, `src/lib/back-navigation.ts` |
| Toast dùng chung | `src/components/shared/toast-provider.tsx`, `src/stores/toast-store.ts` |
| Ngừng/kích hoạt xe, tài xế, nhân viên | `src/components/admin/common/resource-status-dialog.tsx`, `src/lib/resource-status.ts` (đường dẫn scope + impact), `api-client.ts` (payload theo loại) |
| Ngày Việt Nam và điều kiện đổi phân công chuyến | `src/lib/business-improvements.ts`; kiểm chứng độc lập trong `.test.ts` cạnh helper |

**Auth hiện tại:** AuthProvider dùng apiClient/authStorage; source hiện lưu token/user qua
localStorage. Đây là mô tả implementation, không phải đề xuất thay auth trong task UI.
Không chép mô hình proxy HttpOnly cookie của repo tham chiếu hoặc in token ra báo cáo.

**State:** dữ liệu server thuộc page/provider đang gọi `apiClient`; state chỉ một màn dùng React.
Draft lập tuyến dùng factory `src/stores/routes/route-plan-draft-store.ts` qua
`src/app/admin/routes/create/_components/route-plan-draft-provider.tsx`; không persist draft/token vào global store.
Toast là store toàn app. Không thêm một store/caching library mới chỉ để sửa CSS.

## 2. Tìm module theo tính năng

**Quy tắc tổ chức cho code mới:** UI riêng một nhánh route đặt cạnh route trong `_components`;
UI dùng ở nhiều nhánh đặt trong `src/components/admin/<domain>/`, primitive ở `src/components/ui/`.
Shared component không phụ thuộc `app/**/_components`. Chi tiết và ví dụ tại
[quy tắc vị trí component](component-conventions.md#3-đặt-đúng-chỗ).
Bảng bên dưới mô tả đường dẫn thực tế sau khi chuyển component riêng về route sở hữu.

`C/` trong bảng = `src/components/admin/`. CSS feature thường nằm cạnh component cùng tên;
kiểm tra import trước khi tạo file style mới. Entry dưới `src/app/admin/` có thể tự chứa UI và data fetching.

| Nhu cầu / route | Entry và component chính | CSS/helper cần xem |
| --- | --- | --- |
| Tổng quan `/admin` | `src/app/admin/page.tsx`, `_components/overview-banner.tsx`, `overview-trips.tsx` cạnh page | `src/app/admin/_components/overview-banner.css`, `src/lib/admin-overview.ts` |
| Trường `/admin/schools` | `src/app/admin/schools/page.tsx`, `C/schools/admin-schools-guard.tsx` | `src/app/admin/schools/layout.tsx` |
| Tạo trường | `src/app/admin/schools/_components/add-school-modal.tsx` | CSS cạnh modal; builder, picker và helper dùng chung trong `C/schools/` |
| Chi tiết/sửa trường | `src/app/admin/schools/[id]/page.tsx`, `_components/edit-school-modal.tsx`, `create-school-admin-modal.tsx` cạnh page | `C/schools/school-status-dialog.tsx`; lịch nhóm theo giờ trong `school-schedule.tsx` |
| Lịch và bản đồ trường | `C/schools/school-schedule.tsx/.css`, `schools/[id]/_components/school-detail.css` | Lịch tuần/tháng kết hợp weeklySchedule, hợp đồng, ngày nghỉ/học bù và thay đổi đã hẹn; map chỉ đọc, mặc định thu gọn |
| Lịch vận hành trường / lịch nghỉ nhà xe | `src/app/admin/calendar/page.tsx`, `src/app/admin/settings/page.tsx?tab=holidays` | School Admin giữ lịch trường. System Admin quản lý lịch nghỉ nhà xe trong Cài đặt; menu không có Lịch vận hành. URL calendar cũ chuyển tới Cài đặt hoặc lịch trong chi tiết trường khi có schoolId. ServiceCalendarPanel operatorOnly chỉ hiển thị lịch nhà xe; lịch trường giữ tại chi tiết trường. |
| Các tab của trường | `src/app/admin/schools/[id]/_components/school-employees-tab.tsx`, `school-routes-tab.tsx`, `school-trips-tab.tsx` | `C/students/student-table.tsx` dùng chung; school page chọn tab qua URL |
| Học sinh trong trường | `src/app/admin/schools/[id]/students/[studentId]/page.tsx` | Kiểm tra caller trước khi nhầm với detail dành cho trường |
| Học sinh School Admin | `src/app/admin/students/page.tsx`, `[id]/page.tsx`, `_components/add-student-modal.tsx` | Filters/table/routing section/insert modal dùng chung trong `C/students/` |
| Tài xế `/admin/drivers` | `src/app/admin/drivers/page.tsx`, `_components/add-driver-modal.tsx`; `[id]/page.tsx`, `[id]/_components/driver-schedule.tsx` | CSS detail cạnh schedule; lịch dùng GET trips hiện có |
| Giáo viên `/admin/teachers` | `src/app/admin/teachers/page.tsx`, `[id]/page.tsx`, `_components/add-teacher-modal.tsx` | SchoolAdminGuard, role/employee scope giữ tại caller |
| Xe `/admin/vehicles` | `src/app/admin/vehicles/page.tsx`, `_components/add-vehicle-modal.tsx` | Bãi xe dùng dữ liệu một bãi tập trung, không copy multi-depot của reference |
| Phương án/tuyến | `src/app/admin/routes/page.tsx`, `create/page.tsx`, `plans/[id]/page.tsx`, `[id]/page.tsx` | Xem §3; không nhầm route detail với plan detail |
| Chuyến `/admin/trips` | `src/app/admin/trips/page.tsx`, `[id]/page.tsx`, `C/trips/trips-table.tsx` | Manual generate modal dùng chung trong `C/trips/`; assignment tại `src/app/admin/trips/[id]/_components/trip-assignment-modal.tsx` |
| Báo nghỉ | `src/app/admin/leave-notices/page.tsx`, `_components/replacement-modal.tsx`, `cancel-trip-modal.tsx` cạnh page | Role/capability API và trạng thái trip; không tự thêm luồng duyệt báo nghỉ |
| Sự cố | `src/app/admin/incidents/page.tsx`, `_components/resolve-incident-modal.tsx` cạnh page | Detail và xử lý/hủy dùng LifecycleDialog với className opt-in `incident-dialog`; style riêng tại `_components/incident-modals.css`, không đổi style dialog khác. `_components/incident-location.tsx` hiển thị vị trí ba loại sự cố mới. RouteMap hỗ trợ marker INCIDENT riêng, không gắn nhãn học sinh cho sự cố |
| Yêu cầu | `src/app/admin/requests/page.tsx`, `C/requests/request-detail-modal.tsx` | Modal dùng lại tại chi tiết học sinh; giữ loại yêu cầu, quyền và callback hiện có |
| Thông báo | `src/app/admin/notifications/page.tsx`, `C/notifications/notification-provider.tsx`, `notification-bell.tsx`, `notification-list.tsx` | `src/lib/notifications.ts`, `refresh-loop.ts` |
| Cài đặt | `src/app/admin/settings/page.tsx` | Ngày hiệu lực dời bãi, impact và áp dụng/hủy lịch qua API hiện có; xem `business-improvements-usage.md` |

## 3. Tuyến và hai vai trò

**Lập mới:** `src/app/admin/routes/create/page.tsx` sở hữu API chuẩn bị/tối ưu/xác nhận.
`RoutePlanDraftProvider` cấp store theo workflow. Component riêng nằm trong
`src/app/admin/routes/create/_components/`: provider, `preview-students-panel.tsx`,
`save-route-plan-dialog.tsx/.css`. Bộ chọn trường của danh sách tuyến ở
`src/app/admin/routes/_components/school-select-modal.tsx`. Component dùng chung ở `C/routes/`:

- `route-planning-workspace.tsx/.css`: khung map/panel responsive, ô thời gian trực tiếp trên map (không modal) và footer.
- Preview có tab chính Tuyến/Học sinh; tab con Chiều đi/Chiều về chỉ lọc danh sách đang xem, không đổi đường đang hiện trên map.
- `preview-route-selector.tsx`: card tuyến đi/về hiển thị xe, sức chứa, quãng đường, thời gian và nhóm lịch chạy; bấm xem điểm dừng, không có checkbox trong danh sách.

**Phương án đã lưu:** `src/app/admin/routes/plans/[id]/page.tsx` phân nhánh:

| Role | UI đang dùng | Ranh giới |
| --- | --- | --- |
| SYSTEM_ADMIN | `src/app/admin/routes/plans/[id]/_components/system-route-plan-workspace.tsx/.css` | Giao diện nhà xe trước merge: trạng thái/CTA phân công ở header, tick hiển thị tuyến độc lập |
| SCHOOL_ADMIN | `SchoolRoutePlanWorkspace` trong `saved-route-plan-workspace.tsx` | Giữ giao diện mới từ nhánh School Admin; school scope, phân giáo viên và duyệt qua `src/components/admin/routes/school-route-plan-approval.tsx` |

`SavedRoutePlanWorkspace` chọn giao diện theo role. System dùng lại thiết kế trước merge;
School giữ nguyên logic từ nhánh mới. CSS System có scope `.system-route-plan-workspace`
để không đổi giao diện School. Hai nhánh vẫn dùng quyền và component phân công hiện có.
`saved-plan-routes-panel.tsx` trong `_components`: tab con Chiều đi/Chiều về, card đầy đủ thông tin và vùng cuộn điểm dừng của System workspace; chọn chiều/card không thay visibility trên map.
`route-plan-assignments.tsx` trong `_components`: nhóm xe, handlers ứng viên/phân công;
`compact` là opt-in của workspace. `route-plan-assignment-state.ts` trong shared domain:
tiến độ nhà xe và tab mặc định, không phải readiness phê duyệt. `approval-readiness-card.tsx`
vẫn được legacy dùng và nằm cạnh workspace; không xoá nếu chưa kiểm tra caller.
`components/admin/routes/route-map-visibility-control.tsx/.css` dùng chung ở preview tạo tuyến và System workspace: chọn nhiều đường hiển thị độc lập với card đang xem. School workspace không bị đổi bộ chọn tuyến.

Cả hai role hiện đi qua `/admin`, không có router `SchoolApiGate` như repo tham chiếu.
Source menu tại `admin-nav.config.ts` chỉ là hiển thị; guard và backend vẫn quyết định quyền.
Hướng dẫn đồng bộ trường trong tương lai:
[school-admin-route-plan-workspace-guide.md](../../docs/architecture/school-admin-route-plan-workspace-guide.md).

## 4. Shared UI và nơi sửa lỗi dùng chung

| Vấn đề | Component / style |
| --- | --- |
| Tiêu đề/action của page | `src/components/ui/page-header.tsx/.css` |
| Control form | `src/components/ui/button.tsx`, `input.tsx`, `select.tsx`, `textarea.tsx`, `ui.css` |
| Bảng/badge/card | `src/components/ui/table.tsx/.css`, `badge.tsx`, `card.tsx` |
| Filter | `src/components/ui/filter-toolbar.tsx/.css`, `src/components/admin/common/school-select-filter.tsx` |
| Pagination, row actions | `src/components/admin/common/pagination-control.tsx`, `pagination.css`, `table-actions.tsx/.css` |
| Bản đồ tuyến | `src/components/admin/routes/route-map.tsx/.css` → `src/components/ui/map.tsx/.css` |
| Tìm/chọn địa điểm trường | `src/components/admin/schools/vietmap-picker.tsx`, `src/lib/vietmap/vietmap.service.ts` |

Tìm caller trước khi sửa shared file. Không đổi defaults của shared component để giải quyết
một màn hình nếu chưa kiểm tra role/caller khác; dùng prop opt-in như schedule table layout.

## 5. Kiểm chứng và giữ chỉ mục đúng

### School lifecycle

- Contract bổ sung: `src/lib/school-lifecycle.ts`; request trong `api-client.ts`.
  Không ghi đè `status` lưu trên server: dùng `effectivePlanStatus` khi trình bày/kiểm tra thao tác.
- `components/admin/schools/school-operating-calendar.tsx` tách tab ngày nghỉ/học bù và thay đổi đã hẹn, đếm PENDING; dùng chung ở `admin/calendar` và chi tiết trường. Cài đặt dẫn tới trang lịch chung. School Admin chỉ xem lịch hẹn, quản lý lịch trong phạm vi trường.
- `ServiceCalendarForm` và `LifecycleDialog` dùng native dialog; style giới hạn trong `lifecycle-*`.
- `components/admin/schools/school-schedule.tsx` lấy calendar + scheduled changes để chiếu lịch dự kiến;
  `service-calendar.ts` dùng `amlich.js` UTC+7, có kiểm thử ngày không tồn tại/tháng nhuận.
- `trips` có tab `finalizations`, component riêng `_components/admin-finalizations-panel.tsx`.
  `trips/[id]` kiểm tra hiệu lực trước đổi phân công và hiển thị audit; không tạo điểm danh.
  Tab Điểm danh mặc định đọc `GET /trips/:id/attendance` qua `use-trip-attendance.ts`;
  thống kê, tìm/lọc và phân trang trong `_components/trip-attendance.tsx`.
  Tab Điểm dừng dùng `_components/trip-stops-panel.tsx`; CSS giới hạn `trip-detail-*`.
  Roster làm mới mỗi 15 giây khi trang hiện, tách lỗi khỏi GPS và gắn với trip/user/role/school.
  Admin chỉ xem giờ điểm danh/xuống xe; thao tác ghi nhận vẫn thuộc Mobile của giáo viên phụ xe.
- Cách dùng và giới hạn backend: [school-lifecycle-usage.md](school-lifecycle-usage.md).

Từ `web/`: typecheck, lint file đổi, `git diff --check`; xem root policy trước khi chạy test/API.
Các test cục bộ liên quan gồm `schools.test.ts`, `students.test.ts`, `routes.test.ts` trong
folder domain; `route-plan-assignment-state.test.ts`; `pagination-items.test.ts`;
`src/stores/toast-store.test.ts`, `src/stores/routes/route-plan-draft-store.test.ts`.
Chỉ chạy test không ghi DB; test pass không thay browser verification.

Khi rename/move/đổi caller: sửa đúng hàng ở đây. Khi đổi style chung: sửa design.
Không ghi số lượng PASS hay trạng thái deploy cố định vào chỉ mục. Các file lớn/legacy là
hiện trạng, không phải yêu cầu tự refactor toàn bộ trong task style.

## 5. Tích hợp quản lý tài nguyên và điều kiện vận hành

- Hướng dẫn thao tác theo vai trò: [business-improvements-usage.md](business-improvements-usage.md).
- `ResourceStatusDialog`: dùng ở bảng/chi tiết xe, tài xế và nhân viên trường/giáo viên. Lấy impact trước, chặn chuyến IN_PROGRESS, tìm ứng viên theo role/school với phân trang; server quyết định khả dụng và bàn giao cuối cùng. Không giữ bản sao dữ liệu trong Zustand.
- `RoutePlanReoptimization` trong `components/admin/routes/`: notice chung cho cả hai workspace; chỉ System Admin gọi re-optimize. Không tối ưu khi còn scheduledChange chưa áp dụng; không tự duyệt hay sinh chuyến.
- Cài đặt hỗ trợ deep link `/admin/settings?tab=parking`; scheduledChange khác bãi hiện hành. API apply chỉ được gọi từ thao tác xác nhận khi đến ngày hiệu lực.
- `TripAssignmentModal` kiểm tra lại GET detail/roster trước PATCH; page giữ điều kiện role/policy cũ và bổ sung ready/start/attendance. Thiếu dữ liệu không mặc định là cho phép sửa.
- Hủy phương án dùng `expectedFingerprint` của cancellation-impact; không tự tính frozenTripsCount khi API không trả. Preview yêu cầu đổi địa chỉ bị vô hiệu sau lỗi duyệt để kiểm tra lại.
