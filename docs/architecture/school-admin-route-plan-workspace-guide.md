# School Admin — Hướng dẫn đồng bộ trang chi tiết phương án tuyến

Ngày: 30/10/2026. Cập nhật: 01/11/2026. Trạng thái: **ĐÃ TRIỂN KHAI / CHỜ NGHIỆM THU TRÊN DỮ LIỆU PHƯƠNG ÁN**.

## 1. Phạm vi hiện tại

System Admin đã dùng giao diện bản đồ + hai tab Tuyến / Phân công tại `/admin/routes/plans/[id]`. Sau tạo nháp chuyển đến URL này với `tab=assignments`. Vào từ danh sách không có tab thì mặc định Tuyến. `routeId` lưu tuyến đang xem; `returnTo` giữ nơi quay lại. Không có bước phân công bắt buộc.

School Admin và System Admin dùng chung `SavedRoutePlanWorkspace` tại `/admin/routes/plans/[id]`. School Admin có phân công giáo viên và thanh điều kiện duyệt riêng; xe/tài xế chỉ xem. Legacy vẫn được giữ trong source để đối chiếu trong giai đoạn nghiệm thu.

## 2. Wireframe — Product Owner đã duyệt triển khai ngày 01/11/2026

```text
← Danh sách phương án
Tên phương án [Nháp/Đã duyệt/Đã hủy/Hết hạn]     [Thao tác theo quyền]
Trường · Số tuyến · Số học sinh
┌───────────────────────────┬─────────────────────────────┐
│                           │  Tuyến  |  Phân công        │
│                           │  Chọn tuyến đang xem        │
│          BẢN ĐỒ           ├─────────────────────────────┤
│                           │ Nội dung tab                │
│                           │ (danh sách dài cuộn riêng)  │
└───────────────────────────┴─────────────────────────────┘
[Trạng thái điều kiện duyệt]                  [Duyệt phương án]
```

Thanh duyệt chỉ hiện khi phù hợp trạng thái/quyền, nằm ngoài vùng cuộn. Không có nút duyệt dành cho nhà xe. Trên màn hình hẹp dùng chuyển Bản đồ / Nội dung và tránh tràn ngang.

## 3. Quyền và trạng thái phải giữ

- Trường chỉ truy cập phương án thuộc trường mình; backend vẫn là nơi kiểm tra quyền.
- Xe và tài xế: chỉ xem; không hiển thị thao tác thay xe hoặc phân công tài xế.
- Giáo viên phụ xe: giữ chọn ứng viên hợp lệ và API phân công theo nhóm xe đang có.
- DRAFT: chỉ SCHOOL_ADMIN được duyệt, đủ điều kiện theo API readiness. Phân công chưa đủ không đồng nghĩa nháp chưa được lưu.
- ACTIVE: giữ ý nghĩa thay đổi phân công mặc định chỉ cho chuyến chưa được tạo; không tự cập nhật chuyến đã có.
- CANCELLED / EXPIRED: chỉ đọc. Không mở lại tính năng tối ưu/lập tuyến như nháp chưa lưu.
- Hủy ACTIVE của trường: giữ điều kiện hiện có và kiểm tra tác động/lý do trong CancelRoutePlanModal; không cấp quyền hủy DRAFT cho trường.

## 4. Hiển thị dữ liệu

- Tab Tuyến mặc định: chiều đi/về, thông tin tuyến, số học sinh, quãng đường, thời gian dự kiến, thứ tự điểm dừng; chọn điểm để focus bản đồ.
- Tab Phân công: nhóm theo vehicleId; xe/tài xế read-only, giáo viên có nút phân công theo quyền. Mỗi nhóm hiển thị các tuyến liên quan.
- Trường nhìn thiếu tài xế phải thấy “Nhà xe chưa phân công tài xế”, không phải lời nhắc trường phải tự sửa.
- Điều kiện duyệt dùng `getApprovalReadiness`; hiển thị gọn, mở blockers khi cần. Không suy ra đủ điều kiện chỉ từ tài xế/giáo viên đã có.
- Có lỗi cũ: summary fields như `missingVehicleRoutes` và thông tin school/count có thể không khớp response thực tế, gây `undefined`. Trước khi sửa School Admin phải đối chiếu DTO/service + response GET thực tế. Không thay undefined thành 0 để giả báo đủ.
- Không thêm dữ liệu điểm danh/GPS thực tế vào bản đồ phương án; đây là tuyến kế hoạch.

## 5. File và API cần xem khi triển khai

- `web/src/app/admin/routes/plans/[id]/page.tsx`: hai vai trò dùng workspace chung, key theo user/role/school/plan để không giữ dữ liệu phiên cũ.
- `web/src/components/admin/routes/saved-route-plan-workspace.tsx`: khung chung; kiểm tra vai trò và schoolId, tab mặc định Tuyến cho trường.
- `web/src/components/admin/routes/school-route-plan-approval.tsx`: thanh điều kiện duyệt và dialog xác nhận; chỉ hiển thị cho trường trên DRAFT.
- `web/src/components/admin/routes/route-planning-workspace.tsx`: khung map/panel responsive, footer tùy chọn.
- `web/src/components/admin/routes/route-plan-assignments.tsx`: handlers ứng viên/phân công hiện có; `compact` opt-in, mặc định false để không đổi giao diện cũ.
- `web/src/components/admin/routes/approval-readiness-card.tsx`: hành vi phê duyệt cần giữ, kiểm tra câu chữ theo business rule trước khi tái sử dụng.
- `web/src/components/admin/routes/cancel-route-plan-modal.tsx`: tác động hủy, lý do và API.
- `getRoutePlanDetail`, `getRouteDetail`, `getApprovalReadiness`, `getCandidateBusAttendants`, `assignBusAttendantGroup`, `approveRoutePlan`; không cần thay API để đồng bộ bố cục.

## 6. Trình tự triển khai đề xuất

1. Duyệt wireframe School Admin và ma trận hành động theo trạng thái.
2. Đối chiếu readiness contract, lập phương án mapping frontend tối thiểu, tránh đụng backend.
3. Tách phần hiển thị dùng chung từ workspace, truyền role/actions rõ ràng; không hardcode quyền từ hình thức UI.
4. Gắn phân công giáo viên và khu vực duyệt bằng handlers hiện có; giữ modal xác nhận và lỗi API.
5. Giữ URL chi tiết duy nhất, tab/routeId/returnTo; trạng thái lưu và phân công tách biệt.
6. Kiểm chứng rồi mới chuyển nhánh SCHOOL_ADMIN khỏi legacy. Không xóa legacy trước khi đủ hành vi thay thế.

## 7. Checklist kiểm chứng

- Hai vai trò thấy đúng hành động; trường không có nút đổi xe/tài xế, nhà xe không có nút duyệt/đổi giáo viên.
- Trường A không truy cập được phương án trường B; 401/403 không giữ dữ liệu của phiên cũ.
- Lưu nháp không tự duyệt/sinh chuyến; phân công không bắt buộc để có nháp.
- Đủ/thiếu điều kiện, lỗi readiness, lỗi ứng viên, lỗi phân công, lỗi duyệt có thông báo và retry phù hợp.
- Duyệt thành công cập nhật status; không gọi API lặp do bấm liên tục.
- ACTIVE giữ cảnh báo phạm vi áp dụng; CANCELLED/EXPIRED read-only.
- F5, Back, link từ danh sách/trường và tab/tuyến đang xem đúng.
- Desktop/tablet/mobile, danh sách nhiều xe/học sinh, tên dài, bàn phím và focus modal.
- Dùng mock/in-memory cho kiểm thử; không tự seed, sửa DB hoặc gọi mutation API nếu PO chưa cấp quyền kiểm thử dữ liệu.

## 8. Ghi nhận triển khai ngày 01/11/2026

PO yêu cầu đồng bộ với System Admin theo tài liệu này và xác nhận sau khi wireframe được trình bày trong chat. Đã triển khai workspace chung, quyền/phân công/duyệt theo vai trò, footer ngoài vùng cuộn, trạng thái chỉ xem và URL hiện có. Giữ API phân công/duyệt/hủy hiện có.

Readiness dùng đúng contract `summary.totalRoutes`, `routesWithVehicle`, `routesWithDriver`, `routesWithBusAttendant`; điều kiện duyệt lấy từ `isReadyForApproval` và blockers, không tự suy ra từ số lượng nhân sự. Response readiness không có schoolName/totalVehicles; thông tin trường lấy từ plan. Vô hiệu hóa điều kiện cũ ngay khi refresh/phân công, có retry khi lỗi.

Form thêm giáo viên bắt buộc email và SĐT ở Web. Theo yêu cầu PO ngày 01/11/2026, BE được giữ nguyên như trước task UI: email bắt buộc, SĐT tùy chọn tại API. Tooltip dùng portal ra ngoài vùng cuộn modal và định vị theo viewport.

Typecheck/kiểm tra source không thay nghiệm thu thao tác với phương án thật. Không tự tạo tuyến, xe, học sinh hoặc giáo viên để nghiệm thu; xem kết quả và giới hạn tại `docs/ai-review/LATEST.md`.
