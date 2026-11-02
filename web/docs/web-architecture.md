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
| Lịch và bản đồ trường | `src/app/admin/schools/[id]/_components/school-schedule.tsx`, `school-detail.css` | Lịch tuần 7 cột có thứ/ngày/giờ, chuyển tuần; nút Xem lịch tháng mở modal rộng, giờ đầy đủ, ngày nghỉ nền xám và hôm nay có viền; suy ra từ weeklySchedule, không phải lịch ngày lễ; map chỉ đọc, mặc định thu gọn |
| Các tab của trường | `src/app/admin/schools/[id]/_components/school-employees-tab.tsx`, `school-routes-tab.tsx`, `school-trips-tab.tsx` | `C/students/student-table.tsx` dùng chung; school page chọn tab qua URL |
| Học sinh trong trường | `src/app/admin/schools/[id]/students/[studentId]/page.tsx` | Kiểm tra caller trước khi nhầm với detail dành cho trường |
| Học sinh School Admin | `src/app/admin/students/page.tsx`, `[id]/page.tsx`, `_components/add-student-modal.tsx` | Filters/table/routing section/insert modal dùng chung trong `C/students/` |
| Tài xế `/admin/drivers` | `src/app/admin/drivers/page.tsx`, `_components/add-driver-modal.tsx`; `[id]/page.tsx`, `[id]/_components/driver-schedule.tsx` | CSS detail cạnh schedule; lịch dùng GET trips hiện có |
| Giáo viên `/admin/teachers` | `src/app/admin/teachers/page.tsx`, `[id]/page.tsx`, `_components/add-teacher-modal.tsx` | SchoolAdminGuard, role/employee scope giữ tại caller |
| Xe `/admin/vehicles` | `src/app/admin/vehicles/page.tsx`, `_components/add-vehicle-modal.tsx` | Bãi xe dùng dữ liệu một bãi tập trung, không copy multi-depot của reference |
| Phương án/tuyến | `src/app/admin/routes/page.tsx`, `create/page.tsx`, `plans/[id]/page.tsx`, `[id]/page.tsx` | Xem §3; không nhầm route detail với plan detail |
| Chuyến `/admin/trips` | `src/app/admin/trips/page.tsx`, `[id]/page.tsx`, `C/trips/trips-table.tsx` | Manual generate modal dùng chung trong `C/trips/`; assignment tại `src/app/admin/trips/[id]/_components/trip-assignment-modal.tsx` |
| Báo nghỉ | `src/app/admin/leave-notices/page.tsx`, `_components/replacement-modal.tsx`, `cancel-trip-modal.tsx` cạnh page | Role/capability API và trạng thái trip; không tự thêm luồng duyệt báo nghỉ |
| Sự cố | `src/app/admin/incidents/page.tsx`, `_components/resolve-incident-modal.tsx` cạnh page | Detail đang trong page; không hiển thị raw JSON kỹ thuật thay thông tin nghiệp vụ |
| Yêu cầu | `src/app/admin/requests/page.tsx`, `C/requests/request-detail-modal.tsx` | Modal dùng lại tại chi tiết học sinh; giữ loại yêu cầu, quyền và callback hiện có |
| Thông báo | `src/app/admin/notifications/page.tsx`, `C/notifications/notification-provider.tsx`, `notification-bell.tsx`, `notification-list.tsx` | `src/lib/notifications.ts`, `refresh-loop.ts` |
| Cài đặt | `src/app/admin/settings/page.tsx` | Không tự thêm cấu hình chưa có API |

## 3. Tuyến và hai vai trò

**Lập mới:** `src/app/admin/routes/create/page.tsx` sở hữu API chuẩn bị/tối ưu/xác nhận.
`RoutePlanDraftProvider` cấp store theo workflow. Component riêng nằm trong
`src/app/admin/routes/create/_components/`: provider, `preview-students-panel.tsx`,
`save-route-plan-dialog.tsx/.css`. Bộ chọn trường của danh sách tuyến ở
`src/app/admin/routes/_components/school-select-modal.tsx`. Component dùng chung ở `C/routes/`:

- `route-planning-workspace.tsx/.css`: khung map/panel responsive, cấu hình modal và footer.
- `preview-route-selector.tsx`: chọn đường đang hiện, xem một tuyến, gom lịch trùng giờ.

**Phương án đã lưu:** `src/app/admin/routes/plans/[id]/page.tsx` phân nhánh:

| Role | UI đang dùng | Ranh giới |
| --- | --- | --- |
| SYSTEM_ADMIN | `src/app/admin/routes/plans/[id]/_components/saved-route-plan-workspace.tsx/.css` | Map + tabs Tuyến/Phân công; thao tác nhà xe theo quyền |
| SCHOOL_ADMIN | Cùng `SavedRoutePlanWorkspace` | School scope, phân giáo viên và duyệt qua `src/components/admin/routes/school-route-plan-approval.tsx` |

Sau merge giao diện School Admin, workspace chung dùng quyền theo role và readiness hiện có.
`route-plan-assignments.tsx` trong `_components`: nhóm xe, handlers ứng viên/phân công;
`compact` là opt-in của workspace. `route-plan-assignment-state.ts` trong shared domain:
tiến độ nhà xe và tab mặc định, không phải readiness phê duyệt. `approval-readiness-card.tsx`
vẫn được legacy dùng và nằm cạnh workspace; không xoá nếu chưa kiểm tra caller.
`route-map-visibility-control.tsx` còn trong source nhưng workspace mới từ nhánh merge không dùng control này.

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

Từ `web/`: typecheck, lint file đổi, `git diff --check`; xem root policy trước khi chạy test/API.
Các test cục bộ liên quan gồm `schools.test.ts`, `students.test.ts`, `routes.test.ts` trong
folder domain; `route-plan-assignment-state.test.ts`; `pagination-items.test.ts`;
`src/stores/toast-store.test.ts`, `src/stores/routes/route-plan-draft-store.test.ts`.
Chỉ chạy test không ghi DB; test pass không thay browser verification.

Khi rename/move/đổi caller: sửa đúng hàng ở đây. Khi đổi style chung: sửa design.
Không ghi số lượng PASS hay trạng thái deploy cố định vào chỉ mục. Các file lớn/legacy là
hiện trạng, không phải yêu cầu tự refactor toàn bộ trong task style.
