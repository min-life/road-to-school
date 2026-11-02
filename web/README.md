# RoadToSchool Web

Web Admin Next.js cho SYSTEM_ADMIN và SCHOOL_ADMIN. Source nằm trong `src/`;
hai vai trò dùng khung `/admin`, với guard và dữ liệu theo quyền hiện có.

## Tài liệu làm việc

- [AGENTS.md](AGENTS.md): hướng dẫn agent ngắn.
- [Chỉ mục Web](docs/README.md): chọn tài liệu theo nhiệm vụ, tránh đọc lặp.
- [Design](docs/design.md): token, UI chuẩn, bảng/form/modal/map.
- [Kiến trúc](docs/web-architecture.md): route → component → CSS/state.
- [Đặt tên component](docs/component-conventions.md): tên file, exports và vị trí code.
- [Quy tắc dự án](../docs/WORKING_RULES.md): phê duyệt và Test Data Policy.

## Chạy và kiểm tra

Dùng npm theo package.json/lockfile hiện có; không đổi package manager.

```powershell
npm run dev
# http://localhost:5173

npx.cmd --no-install tsc --noEmit --pretty false
npx.cmd --no-install eslint src/app/admin/schools/_components/add-school-modal.tsx
```

`npm run build` build Next.js; `npm run test` chạy Node test suite. Trước khi chạy test,
kiểm tra phạm vi và bảo đảm không có mutation DB/API trái chính sách.

Các biến frontend được source sử dụng gồm `NEXT_PUBLIC_API_URL` và
`NEXT_PUBLIC_VIETMAP_TILEMAP_KEY`; dùng cấu hình local của dự án, không chép giá trị
thật vào tài liệu/log. Root layout tải Be Vietnam Pro từ `public/fonts/`.

Bộ tài liệu là chỉ dẫn theo source hiện tại, không phải báo cáo đã kiểm chứng mọi luồng.
