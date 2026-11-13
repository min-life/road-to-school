# Quy tắc component và tên file

Áp dụng cho code mới hoặc file được đổi tên trong phạm vi đã giao. Không đổi tên hàng loạt
code cũ chỉ vì có tài liệu này. Xem [chỉ mục](README.md) và [kiến trúc](web-architecture.md).

## 1. Một quy ước cho RoadToSchool

| Đối tượng | Quy ước | Ví dụ trong repo |
| --- | --- | --- |
| Component React | PascalCase | `AddSchoolModal`, `RoutePlanAssignments` |
| File component | kebab-case.tsx | `add-school-modal.tsx`, `route-plan-assignments.tsx` |
| CSS cạnh component | Cùng tên gốc .css | `add-school-modal.css` |
| Function, prop, biến | camelCase | `onUpdated`, `handleSubmit`, `hiddenRouteIds` |
| Hook | use + PascalCase; file use-kebab-case.ts | `useAuth` đang ở provider; hook mới riêng có thể là `use-route-visibility.ts` |
| Store | domain-store.ts; factory/hook theo kiểu store thực tế | `route-plan-draft-store.ts`, `createRoutePlanDraftStore` |
| Helper thuần | domain-purpose.ts | `route-plan-assignment-state.ts`, `pagination-items.ts` |
| Test | Cùng tên gốc .test.ts | `route-plan-assignment-state.test.ts` |
| Tài liệu | kebab-case.md | `web-architecture.md`, `component-conventions.md` |

Ngoại lệ framework: giữ `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`
và `[id]`. File agent phải là **`AGENTS.md`**, không tạo thêm `agents.md` song song.
Không áp dụng PascalCase filename của repo tham chiếu vào một nhánh mới trong repo này.

## 2. Tên phản ánh trách nhiệm

Ưu tiên `<Domain><Purpose>`; tên phải giúp tìm bằng nghiệp vụ, không phụ thuộc vị trí giao diện.

| Hậu tố | Dùng khi |
| --- | --- |
| `Table`, `Filters`, `Toolbar` | Bảng dữ liệu, bộ lọc, cụm thao tác |
| `Panel`, `Section`, `Card` | Khu vực nghiệp vụ, một phần nội dung, một record |
| `Modal` | Form hoặc thao tác trong hộp thoại, theo cách đặt tên đang có |
| `Dialog` | Xác nhận/chọn lựa ngắn; giữ tên canonical cũ nếu đang khác |
| `Form`, `Field` | Form có thể tách khỏi dialog; một field dùng lại |
| `Map`, `Picker`, `Control` | Bản đồ, chọn địa điểm/đối tượng, điều khiển hiển thị |
| `Provider`, `Guard` | Cấp context/store, kiểm tra quyền truy cập |
| `Workspace` | Khung phối hợp nhiều panel/trạng thái của cùng công việc |

Tránh `NewModal`, `Final`, `V2`, `Redesign`, `Component1`, `CommonUtils` hoặc tên Việt không dấu.
Không đổi `Modal` thành `Dialog` chỉ để giống reference. Ví dụ tốt:
`PreviewStudentsPanel` / `preview-students-panel.tsx`,
`RouteMapVisibilityControl` / `route-map-visibility-control.tsx`.

## 3. Đặt đúng chỗ

| Phạm vi | Thư mục |
| --- | --- |
| Route entry của Next | `src/app/<route>/page.tsx` |
| Component chỉ dùng trong một route và các route con | `src/app/<route>/_components/` |
| UI nền tảng không biết nghiệp vụ | `src/components/ui/` |
| Dùng chung giữa các module Admin | `src/components/admin/common/` |
| UI nghiệp vụ dùng ở nhiều route | `src/components/admin/schools/`, `routes/`, `trips/`… |
| Shared provider/trình bày toàn ứng dụng | `src/components/shared/` |
| Auth | `src/components/auth/` |
| UI state chia sẻ thật sự | `src/stores/` hoặc `src/stores/<domain>/` |
| API/types/helper hiện tại | `src/lib/` |

Chọn vị trí theo phạm vi sử dụng thực tế, không theo kích thước component:

- UI riêng của một route đặt trong `_components` cạnh route. Nếu dùng ở cả trang danh sách
  và trang chi tiết của cùng nhánh, đặt tại tổ tiên chung gần nhất của hai trang.
- UI được dùng bởi các nhánh route khác nhau đặt trong `src/components/admin/<domain>/`.
  Ví dụ `StudentTable`, `WeeklyScheduleBuilder`, `RouteMap` hiện có nhiều caller nên giữ dùng chung.
  `RequestDetailModal` dùng ở cả yêu cầu và chi tiết học sinh nên nằm tại `components/admin/requests/`.
- Route có thể import shared component; shared component không import từ `app/**/_components`.
  Các nhánh route khác nhau không import component riêng của nhau. Khi phát sinh dùng chung,
  chuyển component lên domain/shared thích hợp và cập nhật các caller trong cùng thay đổi.
- CSS riêng đặt cạnh component; helper/hook chỉ phục vụ route có thể ở `_lib`/`_hooks` cạnh route.
  Các helper/hook dùng chung giữ ở vị trí chung hiện có; không sao chép API client vào từng route.

Ví dụ cấu trúc (có cả file minh họa, không phải danh mục đầy đủ; xem chỉ mục kiến trúc để tìm file thật):

```text
src/app/admin/incidents/
  page.tsx
  _components/
    incident-filters.tsx
    incident-detail-modal.tsx
src/components/
  ui/                         # Primitive dùng chung
  admin/common/               # Pagination, TableActions...
  admin/students/              # StudentTable dùng nhiều route
  admin/routes/                # RouteMap dùng nhiều luồng
```

`_components` là private folder của Next.js, không tạo URL. Vị trí thư mục không tự quyết định
Server/Client Component hay cải thiện hiệu năng; vẫn phải kiểm tra ranh giới `use client` và import.
Xem [hướng dẫn Next.js](https://nextjs.org/docs/app/getting-started/project-structure).

Code cũ giữ vị trí hiện tại cho đến khi có task refactor được giao rõ ràng. Không di chuyển hoặc
đổi tên hàng loạt chỉ để áp dụng tài liệu, không đưa domain sang `features/`, CSS Modules,
monorepo hoặc service layer khác ngoài phạm vi đã duyệt.

## 4. Khi nào tách hoặc tái sử dụng

- Mặc định một component chính được export/file. Private helper nhỏ có thể ở cùng file.
- Tách khi có trách nhiệm riêng, được dùng lại hoặc giúp đọc main component rõ hơn;
  không tạo component chỉ để bọc một `div` hay chia theo số dòng máy móc.
- Primitive/shared UI nhận dữ liệu và callback; không tự thêm role, API mutation hoặc quy tắc nghiệp vụ.
- Trước khi viết mới: tìm component tương đương và caller bằng `rg`; ưu tiên variant/prop opt-in
  khi có mẫu chung. Không đổi default của shared component nếu task chỉ giao một màn hình.
- CSS primitive dùng `ui-*`; CSS domain có prefix cụ thể như `school-wizard-*`, `saved-plan-*`.
  Không dùng `.title`, `.card`, `button`, `label` global để sửa một module.
- Không thêm store cho mọi form. State chỉ dùng trong một component dùng `useState`;
  store theo workflow có provider/factory riêng khi cần tránh rò state giữa các phiên làm việc.

## 5. Khi đổi tên hoặc tạo file

Kiểm tra import/export, caller cả hai role, CSS import, test và link tài liệu. Giữ public props,
handler và đường dẫn khi task chỉ là style. Cập nhật đúng hàng trong chỉ mục kiến trúc nếu entry
thay đổi. Các giới hạn số dòng ở WORKING_RULES là chỉ dẫn, không phải lý do để refactor ngoài phạm vi.
