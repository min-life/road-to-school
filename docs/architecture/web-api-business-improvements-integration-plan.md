# Kế hoạch tích hợp Web theo API sau pull main

Ngày: 05/11/2026. Trạng thái: PO đã duyệt triển khai; đã tích hợp Web ngày 05/11/2026. Build/typecheck và kiểm thử độc lập đã qua; kiểm thử mutation với DB và browser còn NOT_VERIFIED.

## 1. Phạm vi và nguồn chuẩn

- Triển khai Web cho SYSTEM_ADMIN và SCHOOL_ADMIN theo quyền API thực tế; không sửa API, Prisma, DB, Mobile, thuật toán tối ưu hoặc luồng phê duyệt.
- Đọc docs/FE_INTEGRATION_GUIDE.md để hiểu nghiệp vụ, đối chiếu controller/DTO/service trước khi bind. Mâu thuẫn thì dùng code API và ghi lại điểm lệch.
- Giữ workspace bản đồ/phân công, các tab và component đã duyệt. Không thêm trang riêng cho từng thao tác.
- Không cài package, tự seed/migrate, commit/push. Tái sử dụng component UI, toast, API client và status labels.

## 2. Thứ tự thực hiện

| Đợt | Công việc | Kết quả |
| --- | --- | --- |
| 1 | Contract Web và sửa lỗi binding đã xác nhận | Đúng expectedFingerprint, enum, trường phản hồi; không đổi payload backend |
| 2 | Dời bãi và phương án cần tối ưu lại | Hiển thị đúng ngày hiệu lực, trạng thái đang hẹn/đã áp dụng; tối ưu đúng vị trí hiện hành |
| 3 | Ngừng/kích hoạt tài nguyên, bàn giao thay thế | Modal tác động cho xe, tài xế, nhân viên; giữ phân quyền |
| 4 | Điều kiện đổi phân công, preview cũ | Không mời thao tác đã bị API chặn; xử lý dữ liệu thay đổi/409 |
| 5 | Ba loại sự cố mới | Nhãn, bộ lọc và chi tiết tiếng Việt; bản đồ khi có tọa độ hợp lệ |
| 6 | Kiểm chứng và bàn giao | Typecheck, lint phạm vi, diff, kiểm tra UI và hướng dẫn theo màn hình |

Mỗi đợt hoàn thành là một mốc kiểm chứng; không refactor diện rộng hoặc di chuyển component không liên quan.

## 3. Contract và lỗi binding

Files chính: web/src/lib/types.ts, web/src/lib/api-client.ts, web/src/lib/status-labels.ts.

- Bổ sung parking scheduledChange/effectiveDate và các số liệu impact thực tế.
- RoutePlan nhận needsReoptimization/reoptimizationReason ở list/detail.
- Vehicle nhận isActive; query status ALL/ACTIVE/INACTIVE.
- Bổ sung methods GET deactivation-impact, PATCH status và response theo từng tài nguyên, không ép cả ba thành một DTO giả định.
- Trip detail nhận trường thực tế về thời gian bắt đầu/sẵn sàng. Roster vẫn dùng UNMARKED/PRESENT/ABSENT.
- Thêm NO_GUARDIAN_AT_STOP, TRAFFIC_DELAY, GPS_SIGNAL_LOST.
- Sửa CancellationImpact đọc expectedFingerprint và gửi lại đúng trường. Không dựng frozenTripsCount khi response không có.
- Chỉ chuẩn hóa lỗi theo status và nội dung/code API thực tế; không coi mọi lỗi 400 là 409.

## 4. Cài đặt bãi xe và tối ưu phương án

### Màn hình và wireframe

Cài đặt / Bãi xe:

```text
Bãi xe trung tâm
[Vị trí hiện tại + bản đồ đang có]

Thay đổi đã hẹn                         [Hủy lịch thay đổi]
Vị trí mới: ...                 Hiệu lực: dd/mm/yyyy
[Áp dụng vị trí mới] — chỉ hiện khi đã đến ngày hiệu lực

[Đổi vị trí]
```

Form thay đổi tái sử dụng picker đang có, thêm ngày hiệu lực và lý do:

```text
Vị trí mới          [địa chỉ + chọn trên bản đồ]
Ngày hiệu lực       [chọn ngày]
Lý do               [nội dung]
                                      [Hủy] [Xem tác động]
```

Modal xác nhận:

```text
Xác nhận hẹn dời bãi
Vị trí ...                       Ngày hiệu lực ...
[N phương án cần tối ưu lại] [M chuyến sẽ hủy]
[K chuyến trước ngày hiệu lực được giữ]
                              [Quay lại] [Xác nhận]
```

- Thay địa điểm hoặc ngày sau preview phải bỏ impact/fingerprint cũ và kiểm tra lại.
- Thành công hiển thị lịch đã hẹn; không báo vị trí hiện tại đã đổi, không báo hủy phương án.
- Hủy lịch có xác nhận và cảnh báo ngắn đúng thực tế: không hứa phục hồi chuyến đã hủy.
- Chưa có bằng chứng cron gọi apply; kế hoạch dùng endpoint apply-scheduled-change hiện có cho SYSTEM_ADMIN khi đến hạn, refetch và xác nhận applied=true rồi mới báo thành công. Không tự gọi bằng timer, GET hoặc render. Nếu PO yêu cầu hoàn toàn tự động thì cần task backend riêng.

Danh sách/chi tiết phương án:

```text
Tên phương án                   [Chưa duyệt] [Cần tối ưu lại]
Lý do: ...                                      [Tối ưu lại]
[Bản đồ và panel Tuyến / Phân công giữ nguyên]
```

- Notice nằm ngoài vùng cuộn, không nhét thêm tab hay che map.
- POST /routes/route-plans/:id/re-optimize chỉ SYSTEM_ADMIN; xác nhận việc phương án quay về Chưa duyệt và cần trường duyệt lại.
- Thành công refetch list/detail/map/approval readiness và selection còn tồn tại; không tự duyệt hay tự sinh lại chuyến.
- SCHOOL_ADMIN chỉ thấy lý do cần tối ưu và kết quả mới để duyệt theo khả năng API. Không gọi mutation của nhà xe.
- Quan trọng: API tối ưu dùng bãi hiện tại, không đọc scheduledChange. Nếu phương án cần tối ưu vì dời bãi nhưng lịch chưa áp dụng, hiện trạng thái chờ và khóa CTA tối ưu theo bãi mới. Sau khi áp dụng, tải lại bãi rồi cho tối ưu. Không đổi bãi tạm ở frontend để giả lập kết quả mới.
- Nếu scheduledChange đã bị hủy nhưng flag còn, không tự xóa flag. Cho xem lý do và tối ưu theo vị trí hiện tại khi API cho phép.

Files dự kiến: settings/page.tsx; routes/page.tsx; routes/plans/[id]/page.tsx; _components/system-route-plan-workspace.tsx, saved-route-plan-workspace.tsx và CSS liên quan. Kiểm tra caller thực tế trước khi sửa shared component để không đổi layout School Admin ngoài phạm vi cần tích hợp.

## 5. Ngừng hoạt động và bàn giao tài nguyên

Màn hình: xe; tài xế và chi tiết tài xế; nhân viên trường và các caller quản lý giáo viên liên quan.

```text
Ngừng hoạt động tài xế / xe / nhân viên
Tên tài nguyên ...
[N tuyến ảnh hưởng] [M chuyến đã lên lịch] [K chuyến đang chạy]
Thay thế             [tìm/chọn ứng viên hợp lệ]
[Lỗi điều kiện tại đây nếu bị chặn]
                              [Quay lại] [Xác nhận ngừng]
```

- Tải impact trước; nếu có chuyến đang chạy và API chặn thì chỉ hiển thị lý do, không bật nút xác nhận.
- Cần thay thế thì chọn tài nguyên đúng loại, active và đúng trường/scope theo API; không loại ứng viên bằng phỏng đoán và không coi danh sách active là chắc chắn rảnh.
- Không đổi trạng thái bằng optimistic update. API thành công mới refetch và toast.
- Kích hoạt dùng hành động rõ ràng theo trạng thái. Quy tắc TableActions: một hoặc hai thao tác hiện trực tiếp, không menu chỉ một mục.
- Recheck impact khi đổi đối tượng hoặc mở lại modal; 400/409 giữ input, giải thích và tải lại theo lỗi thực tế.
- Shared dialog layout có thể tái sử dụng; mapping endpoint/payload/impact theo từng loại và role, không sao chép ba modal toàn bộ.

Files: vehicles/page.tsx, drivers/page.tsx, drivers/[id]/page.tsx, schools/[id]/_components/school-employees-tab.tsx, teachers pages nếu caller thuộc quyền; component dùng nhiều route đặt components/admin/common hoặc domain phù hợp, route-private đặt _components.

## 6. Chuyến, hủy phương án và yêu cầu đổi địa chỉ

- Chi tiết chuyến giữ nguyên map/panel điểm danh. Nút đổi phân công vẫn xét role, status và điều kiện hiện tại; bổ sung kiểm tra ready/start/attendance đã ghi theo source API.
- Dùng nhãn ngắn như Đã sẵn sàng / Đã bắt đầu / Đã ghi điểm danh với lý do cạnh hành động, không diễn đạt chung là đang chạy cho mọi frozen state.
- Nếu dữ liệu chưa tải đủ thì chưa cho submit; mutation vẫn do API xác thực cuối cùng.
- Đang mở modal mà server trả 409: bỏ dữ liệu preview đã lỗi thời, refetch detail/roster, dừng submit và thông báo rõ. Không tự thử mutation lặp lại.
- Modal hủy: sửa fingerprint; số chuyến hủy lấy đúng scheduledTripsCount. Chỉ hiện số bảo toàn có thật trong response, không cộng nhầm hoặc đoán frozen count.
- Yêu cầu đổi địa chỉ: giữ luồng kiểm tra tuyến/duyệt hiện tại, xóa preview token/fingerprint khi lỗi xung đột hoặc thay input liên quan; buộc xem trước lại. Giữ aliases API đang hỗ trợ.

Files: trips/[id]/page.tsx; _components/trip-assignment-modal.tsx; components/admin/routes/cancel-route-plan-modal.tsx; components/admin/requests/request-detail-modal.tsx.

## 7. Sự cố mới

Giữ màn hình bảng và modal hiện có. Thêm ba loại vào bộ lọc, nhãn và màu có ý nghĩa; loại chưa nhận diện dùng Không xác định, không lộ enum.

```text
Chi tiết sự cố — Chậm do giao thông
[Trạng thái]  Thời điểm ...  Chuyến ...
Nội dung ...
Học sinh liên quan — chỉ khi có dữ liệu/được phép
[Vị trí sự cố — bản đồ nhỏ khi có tọa độ hợp lệ]
                                              [Đóng]
```

- Không in JSON/bằng chứng kỹ thuật trở lại giao diện.
- Không có tọa độ thì hiện Chưa có vị trí, không dựng marker (0,0).
- Không mở nút tạo sự cố hoặc áp dụng ARRIVED/REPLACED cho loại mới khi API không cấp quyền/không hỗ trợ.
- Phạm vi dữ liệu School Admin giữ theo API hiện có, không fetch danh sách toàn hệ thống rồi lọc cục bộ.

Files: incidents/page.tsx và component chi tiết đang được caller sử dụng; lib/types.ts, status labels phù hợp.

## 8. Điểm backend cần xác minh, không tự sửa

1. Chưa thấy cron áp dụng bãi: dùng thao tác áp dụng có chủ đích như mục 4, không tuyên bố tự động.
2. Parking cancellation hiện lọc status SCHEDULED nhưng không dùng frozenTripWhere. Web phải mô tả đúng impact API; không hứa mọi chuyến sẵn sàng/điểm danh được giữ trong luồng dời bãi.
3. Re-optimize dùng bãi hiện tại; chưa hỗ trợ tối ưu trước theo bãi tương lai.
4. Không tự đặt thêm điều kiện duyệt/sinh chuyến dựa trên needsReoptimization nếu contract không quy định; phân biệt cảnh báo UI với quyền nghiệp vụ phía server.
5. Cancel scheduled change chưa có bằng chứng rollback chuyến/flags; không hứa hoàn tác toàn bộ.

## 9. Tiêu chí nghiệm thu

- Contract map truy vết tới DTO/controller/service; không dùng endpoint/payload chỉ có trong guide.
- SYSTEM_ADMIN không có nút duyệt; SCHOOL_ADMIN không có nút tối ưu, sinh chuyến thủ công hay sửa tài nguyên nhà xe.
- Ngày YYYY-MM-DD dùng theo ngày Việt Nam, không lệch ngày do UTC conversion; ngày mặc định/ngày tối thiểu theo API.
- Chặn submit lặp; toast sau kết quả thật; lỗi field trong form, lỗi xung đột yêu cầu refresh/preview lại.
- Nhãn DRAFT = Chưa duyệt, ACTIVE = Đang hoạt động; giữ enum gửi API.
- Loading/error/empty/inactive/read-only hoạt động; không thiếu/đoán dữ liệu impact.
- Desktop/tablet/mobile và viewport thấp: header/footer modal không cắt, dropdown không đẩy chiều cao vô hạn, cuộn tới mục cuối, Escape/focus phù hợp.
- Kiểm chứng: tsc --noEmit, lint file liên quan, git diff --check; unit tests độc lập cho mapping trạng thái/điều kiện quan trọng khi cần. Không tự chạy mutation/seed trên DB để test. Runtime thiếu dữ liệu/quyền ghi rõ NOT_VERIFIED/BLOCKED_BY_TEST_DATA_POLICY.
- Bàn giao liệt kê từng màn hình đổi gì, API dùng, quyền, cách sử dụng và giới hạn backend. Không commit/push nếu chưa được yêu cầu.

## 10. Phê duyệt

PO đã duyệt bằng yêu cầu “triển khai cho tôi đi”. Đã triển khai theo các nhóm ở trên; hướng dẫn tại web/docs/business-improvements-usage.md, kết quả kiểm chứng tại docs/ai-review/LATEST.md.
