# Thao tác bảng Web Admin

`web/src/components/admin/common/table-actions.tsx` trình bày thao tác của một dòng bảng.

## Quy ước

- Có 1–2 hành động tổng cộng (`actions` + `more`): hiện trực tiếp, không tạo menu một mục.
- Từ 3 hành động trở lên: giữ các hành động thường dùng trong `actions` ở ngoài (tối đa hai), các hành động phụ trong `more` mở bằng nút `⋯`.
- Hành động xem dùng viền nhẹ; việc cần xử lý dùng màu primary. Ngừng hoạt động trường dùng `warning`; vô hiệu hóa/xóa/hủy dùng `danger` khi phù hợp. Component giữ màu này cả khi hành động phụ được đưa ra trực tiếp.
- Trạng thái và lời giải thích đặt ở cột dữ liệu tương ứng. `title` bổ sung ngữ cảnh cho nút xem.
- Giữ nguyên điều kiện role/capability ở nơi gọi; component không tự quyết quyền, thay đổi dữ liệu hoặc xác nhận nghiệp vụ.
- `href` dùng ContextLink để giữ đường quay lại. `onClick` gọi callback sẵn có; modal xác nhận hiện tại vẫn chịu trách nhiệm xác nhận.
- Menu dùng portal tránh bị cắt bởi overflow của bảng. Hỗ trợ phím mũi tên, Home/End, Escape, Tab; đóng khi bấm ngoài hoặc cuộn trang.

## Ví dụ

```tsx
<TableActions
  actions={[
    ...(canResolve ? [{ label: 'Xử lý', primary: true, onClick: openResolve }] : []),
    { label: 'Chi tiết', href: detailHref },
  ]}
  more={canChangeStatus ? [{ label: 'Ngừng hoạt động', danger: true, onClick: openStatusDialog }] : []}
  label={`Thao tác với ${name}`}
/>
```

Đã áp dụng cho các bảng System Admin: trường, tài xế, học sinh, phương án, tuyến trong phương án, chuyến, lịch tài xế, yêu cầu, sự cố, báo nghỉ và bảng chuyến tổng quan. Các component bảng dùng chung cũng có cùng hình thức tại các nơi sử dụng khác, nhưng giữ nguyên phân quyền và callback. Bảng phương tiện/nhân viên trường hiện không có cột thao tác, không tự thêm hành động mới. Trang riêng giáo viên và các luồng School Admin chưa chuyển đổi trong task này.
