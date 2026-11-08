# Kế hoạch UI/UX — Không gian lập phương án tuyến

Ngày: 2026-10-28. Trạng thái: PLANNING, chờ PO duyệt trước khi code.

## 1. Phạm vi và giới hạn

Chỉ tổ chức lại giao diện `/admin/routes/create`: bản đồ và bảng thao tác dùng chung một bố cục trong hai trạng thái thiết lập/kết quả. Không đổi API, dữ liệu đang gắn, thuật toán, validation, phân quyền, lifecycle draft, URL hoặc luồng nghiệp vụ. Không sửa API/Mobile/DB, cài package, seed, commit/push.

Ảnh mockup chỉ tham khảo bố cục: giữ logo, map provider, marker và component thật của dự án. Không bổ sung clustering, thuật toán phân tuyến, filter dữ liệu hoặc phân trang mới chỉ vì chúng xuất hiện trong ảnh. Không tự sửa các bất nhất dữ liệu phát hiện khi refactor; báo riêng.

## 2. Wireframe đề xuất

### Thiết lập
```text
← Quay lại theo ngữ cảnh     Lập phương án tuyến
Tên trường · Lịch học hiện tại
┌─────────────────────────────┬───────────────────────────┐
│                             │ Tổng học sinh / xe / chỗ   │
│                             │ [Học sinh] [Xe]            │
│                             │ Bộ lọc và tìm kiếm hiện có│
│          BẢN ĐỒ             ├───────────────────────────┤
│                             │ Danh sách tab hiện tại ↕  │
│                             │ Checkbox + thông tin cũ   │
│                             ├───────────────────────────┤
│                             │ ▸ Cấu hình thời gian      │
├─────────────────────────────┴───────────────────────────┤
│ Cảnh báo / tóm tắt                    [Tối ưu phương án] │
└─────────────────────────────────────────────────────────┘
```

### Kết quả
```text
← Quay lại theo ngữ cảnh     Lập phương án tuyến
Tên trường · Xem kết quả
┌─────────────────────────────┬───────────────────────────┐
│                             │ Đã xếp / chưa xếp / số tuyến│
│       BẢN ĐỒ TUYẾN          │ [Chiều đi][Chiều về][Học sinh]│
│                             ├───────────────────────────┤
│ Hình học và điểm dừng       │ Danh sách tuyến / học sinh↕│
│ từ kết quả hiện có         │ Chi tiết tuyến được chọn  │
│                             │ Thao tác hiện có          │
├─────────────────────────────┴───────────────────────────┤
│ Cảnh báo        [Chỉnh thiết lập] [Lưu phương án nháp]   │
└─────────────────────────────────────────────────────────┘
```

Không điều hướng khi tối ưu: trang hiện đã dùng previewResult, chỉ tái tổ chức render. Chỉ sau lưu thành công mới chạy redirect hiện tại.

## 3. Quy tắc bố cục, cuộn và khả năng tiếp cận

- Desktop: bản đồ trái co giãn; bảng phải khoảng 400–440px khi đủ rộng. Vùng làm việc theo chiều cao khả dụng, không theo số bản ghi. Không ép tỷ lệ cố định khi khiến bản đồ quá hẹp.
- Chỉ một vùng cuộn nội dung chính trong bảng đang mở. Tab, tìm kiếm, tóm tắt và nút chính không bị cuộn mất. Bỏ các giới hạn chiều cao/overflow lồng nhau của card cũ.
- Cấu hình mở ngay trong bảng, thay vùng danh sách bằng vùng cấu hình có nút trở lại; vẫn một vùng cuộn. Giữ tất cả input, giới hạn, giá trị và overrides hiện có; phần ngoài hiển thị tóm tắt. Không thêm modal nhiều lớp.
- Nếu không đủ chiều ngang: chuyển chế độ xem Bản đồ / Thiết lập (hoặc Kết quả), không bỏ state. Màn nhỏ cuộn tự nhiên, CTA không che nội dung hoặc bàn phím. Nếu chiều cao quá thấp hoặc zoom lớn, cho phép trang cuộn thay vì cắt thông tin.
- Tab có semantics, bàn phím và focus rõ; icon có tên truy cập; checkbox luôn có nhãn. Lỗi/cảnh báo không chỉ phân biệt bằng màu. Không đưa focus tự động vào map làm mất vị trí nhập liệu.
- Dùng token và component sẵn có; CSS giới hạn trong workspace, không sửa theme toàn hệ thống.

## 4. Giữ nguyên data binding và nghiệp vụ

| Phần | Giữ nguyên | Chỉ thay UI |
|---|---|---|
| Dữ liệu chuẩn bị | prepData, schoolId, effects tải dữ liệu | Vị trí và trạng thái loading/error |
| Học sinh | eligible/ineligible, selectedStudentIds, tìm kiếm, select all và toggle | Gom vào tab Học sinh; giữ lý do không đủ điều kiện |
| Xe | available/unavailable, selectedVehicleIds, search, select all | Gom vào tab Xe; giữ thông tin không khả dụng |
| Ràng buộc | maxRouteDurationMinutes, defaultStopServiceSeconds, stopServiceOverrides | Đưa vào vùng cấu hình thu gọn |
| Tối ưu | handleRunOptimization, payload, filter overrides, disabled, lỗi | Nút ở footer, loading ngay tại chỗ |
| Kết quả | previewResult, summary, tuyến, học sinh, missingDirection, reason | Bảng phải, số liệu gọn; không tính lại phân nhóm dữ liệu |
| Bản đồ | schoolLocation, parkingLocation, points, polylineGeometry, focus và click handlers | Kích thước, vị trí, resize khi container đổi |
| Hủy tuyến về | handleCancelReturnRoute, xác nhận, pending và kết quả cập nhật | Giữ nút trong chi tiết tuyến về |
| Chỉnh thiết lập | handleCancelAllAndRecreate và hộp xác nhận; giữ cấu hình, bỏ preview | Nút ở footer |
| Lưu nháp | handleConfirmRoutePlan, previewToken, confirm, toast, redirect | Đổi vị trí và nhãn hiển thị |
| Quay lại | BackLink/returnTo/fallback hiện tại | Giữ nguyên |

Thiếu chỗ vẫn theo quy tắc hiện tại, không thêm điều kiện chặn tối ưu. Đủ chỗ không đồng nghĩa phương án khả thi. Giữ toàn bộ trạng thái loading/error/empty, dữ liệu thiếu vị trí, không có tuyến và thao tác pending.

State mới chỉ phục vụ hiển thị: tab thiết lập, mở cấu hình, chế độ xem màn nhỏ, vị trí cuộn từng tab. Không sao chép selection hoặc response sang store mới; giữ provider và scope hiện tại. Không refetch khi đổi tab, không tự tối ưu khi đổi lựa chọn, không tự lưu.

Trong tab Học sinh ở kết quả, giữ bản đồ tuyến đã xem gần nhất bằng state hiển thị riêng cho map, không sửa activePreviewTab/activeRouteIndex nghiệp vụ để ép chọn tuyến khác. Nếu tuyến không còn trong response hoặc chưa có tuyến thì hiện trạng thái bản đồ trống phù hợp; không vẽ hình học giả. Thay đổi này chỉ quyết định nội dung bản đồ đang nhìn, không đổi response hay xử lý học sinh.

## 5. Các file dự kiến

- Sửa `web/src/app/admin/routes/create/page.tsx`: giữ hooks, selectors và handlers; thay cây bố cục setup/preview, thêm state hiển thị cần thiết.
- Thêm `web/src/components/admin/routes/route-planning-workspace.tsx`: khung bản đồ, bảng thao tác, footer nhận nội dung qua props; không gọi API.
- Thêm `web/src/components/admin/routes/route-planning-workspace.css`: grid, chiều cao, overflow, responsive có scope.
- Chỉ sửa `web/src/components/admin/routes/route-map.tsx` nếu cần nhận chiều cao co giãn/resize container; không thay nguồn dữ liệu, marker, provider hoặc cách tính hình học.
- Tái dùng store/provider và UI components hiện có. Không dự kiến sửa `ui.css`, store nghiệp vụ, api-client hoặc types API.
- Cập nhật báo cáo local LATEST.md/LATEST.diff theo quy định, không đưa hai file này vào commit.

## 6. Trình tự triển khai sau khi duyệt

1. Chụp baseline diff và kiểm kê bindings/handlers/điều kiện disable, bảo vệ uncommitted work.
2. Dựng khung workspace và CSS responsive, chuyển JSX hiện có vào slots. Không viết lại tầng dữ liệu.
3. Gom hai bộ chọn vào tab thiết lập; chuyển cấu hình, giữ mọi chức năng hiện tại.
4. Đưa preview vào cùng khung: map trái, ba tab kết quả phải; giữ chi tiết tuyến và các thao tác.
5. Hoàn thiện trạng thái rỗng/lỗi/pending, chiều cao thấp, bàn phím và focus; kiểm tra không mất lựa chọn khi đổi tab.
6. So sánh baseline và chạy kiểm chứng, ghi báo cáo và dừng.

## 7. Kiểm chứng và tiêu chí nghiệm thu

- So sánh API call sites, payload, effects, selection handlers, validation/disabled và redirect với baseline; không khác về nghiệp vụ.
- Typecheck Web bằng `npx.cmd --no-install tsc --noEmit --incremental false`, build, targeted lint và tests phù hợp có sẵn. Không thêm dependency.
- Kiểm tra browser ở desktop 1440x900, laptop 1366x768, màn nhỏ 390x844 và zoom 200%; không tràn ngang, không mất nút, không cuộn lồng danh sách.
- Dùng fixture trong bộ nhớ/mock API cho kiểm thử UI nếu cần; không ghi DB, seed hoặc gọi API mutation thật. Trường hợp không kiểm được an toàn ghi NOT_VERIFIED, không tuyên bố đã E2E.
- Kiểm tra 0/nhiều xe và học sinh; thiếu chỗ; danh sách không khả dụng; các input/overrides; tối ưu lỗi/thành công; kết quả đi/về rỗng; học sinh thiếu chiều; hủy tuyến về; chỉnh lại; lưu lỗi/thành công. Không làm mất nội dung lỗi do bố cục mới.
- Chuyển tab không phát sinh request mới hoặc đổi selection. Tối ưu không đổi URL. Chỉnh thiết lập giữ cấu hình theo handler cũ. Lưu vẫn tạo DRAFT và redirect như trước.
- Không thay code ngoài phạm vi hoặc ghi đè thay đổi có sẵn.

## 8. Phê duyệt

Đây là kế hoạch, chưa sửa code. PO duyệt kế hoạch và wireframe này trước khi triển khai. Mục 1.2 WORKING_RULES yêu cầu: “Dừng và chờ người dùng phê duyệt kế hoạch.”
