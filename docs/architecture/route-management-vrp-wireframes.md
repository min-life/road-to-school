# RoadToSchool — Wireframe Design Specification
# Scope: Route Management & VietMap VRP Optimization
# Target: Web Admin (System Admin, School Admin) & Mobile App (Parent)

> **Tài liệu Wireframes Thiết kế UI/UX Chi Tiết**  
> **Nguyên tắc cốt lõi**: Wireframe First, Minimal UI Copy, Map-Centric Layout, RoadToSchool Design Tokens (#FFCB56, #FFFDF6, #1E293B, #FFFFFF).

---

## 1. DESIGN TOKENS & SYSTEM STYLES

- **Bảng màu chủ đạo**:
  - `Primary`: `#FFCB56` (Vàng ấm thương hiệu RoadToSchool)
  - `Background`: `#FFFDF6` (Trắng kem dịu mắt)
  - `Foreground`: `#1E293B` (Xanh đen than đá đậm đà, tương phản cao)
  - `Surface`: `#FFFFFF` (Trắng tinh khiết cho Card, Modal, Table)
  - `Border`: `#E2E8F0` (Viền xám mảnh tinh tế)
  - `Success`: `#10B981` (Xanh lá - Tuyến đi, Điểm đón)
  - `Info`: `#3B82F6` (Xanh dương - Tuyến về, Điểm trả)
  - `Danger`: `#EF4444` (Đỏ - Hủy phương án, Lỗi)
- **Quy tắc câu chữ (Minimal UI Copy)**:
  - Hiển thị trực quan dữ liệu và hành động cần làm.
  - Không chèn đoạn văn giải thích dài dòng về giao diện.

---

## 2. WIREFRAME CHI TIẾT CÁC MÀN HÌNH

### 2.1. Screen 1: Danh sách Tuyến đường — System Admin (`/admin/routes`)
```
+--------------------------------------------------------------------------------------------------------------------+
|  [Logo] RoadToSchool        [Tìm kiếm...]                                        (Thông báo)  [Admin Avatar] (V)   |
+--------------------------------------------------------------------------------------------------------------------+
|  SIDEBAR               |  DANH SÁCH TUYẾN ĐƯỜNG                                         [ + Thêm tuyến đường ]    |
|  - Tổng quan           |                                                                                           |
|  - Trường học          |  +------------------------------------------------------------------------------------+  |
|  - Học sinh            |  | [ Tìm theo tên tuyến, trường, biển số... ]  [ Tất cả trường (V) ]  [ Chiều: Tất cả (V) ] |  |
|  - Phương tiện         |  | [ Trạng thái: DRAFT (V) ]                                           [ Lọc ] [ Đặt lại ]  |  |
|  - Tuyến đường (*)     |  +------------------------------------------------------------------------------------+  |
|  - Yêu cầu cập nhật    |                                                                                           |
|  - Cài đặt             |  +------------------------------------------------------------------------------------+  |
|                        |  | Tên tuyến       | Trường              | Chiều     | Xe đề xuất | Học sinh | Trạng thái |  |
|                        |  |-----------------+---------------------+-----------+------------+----------+------------|  |
|                        |  | Tuyến Đi 01     | THCS Chu Văn An     | Đi học    | 51B-123.45 | 14 em    | [ DRAFT ]  |  |
|                        |  | Tuyến Về 01     | THCS Chu Văn An     | Về nhà    | 51B-123.45 | 14 em    | [ DRAFT ]  |  |
|                        |  | Tuyến Đi 02     | THPT Marie Curie    | Đi học    | 51B-678.90 | 12 em    | [ DRAFT ]  |  |
|                        |  +------------------------------------------------------------------------------------+  |
|                        |  [ Hiển thị 1 - 10 / 24 tuyến ]                             [ < Trước ] [ 1 ] [ 2 ] [ Sau > ] |
+--------------------------------------------------------------------------------------------------------------------+
```

### 2.2. Screen 2: Modal Chọn Trường học khi Bấm "Thêm tuyến"
```
+-------------------------------------------------------------------------+
|  Chọn trường học lập phương án tuyến                                [X] |
+-------------------------------------------------------------------------+
|  [ Tìm kiếm trường học đối tác...                                     ] |
|                                                                         |
|  (o) Trường THCS Chu Văn An                                             |
|      Địa chỉ: 123 Thụy Khuê, Tây Hồ, Hà Nội                             |
|      Học sinh khả dụng: 28 em • Lịch học: Thứ 2 - Thứ 6 (07:15 - 16:30) |
|                                                                         |
|  ( ) Trường THPT Marie Curie                                            |
|      Địa chỉ: 159 Trần Quốc Thảo, Quận 3, TP.HCM                        |
|      Học sinh khả dụng: 16 em • Lịch học: Thứ 2 - Thứ 7 (07:00 - 16:45) |
|                                                                         |
+-------------------------------------------------------------------------+
|                                             [ Hủy ]  [ Tiếp tục tạo > ] |
+-------------------------------------------------------------------------+
```

### 2.3. Screen 3: Trang Tạo Phương Án Tuyến — Bản đồ & Cấu hình (`/admin/routes/create?schoolId=...`)
```
+--------------------------------------------------------------------------------------------------------------------+
|  [ < Trở lại ]  TẠO PHƯƠNG ÁN TUYẾN: TRƯỜNG THCS CHU VĂN AN                            [ Tối ưu hóa tuyến (VRP) ]  |
+--------------------------------------------------------------------------------------------------------------------+
|  BẢN ĐỒ VIETMAP TƯƠNG TÁC (70% WIDTH)             |  CẤU HÌNH & TẬP DỮ LIỆU (30% WIDTH)                            |
|                                                   |                                                                |
|   [+] Zoom In                                     |  1. RÀNG BUỘC THỜI GIAN                                        |
|   [-] Zoom Out                                    |  - Giờ đến trường muộn nhất: [ 07:15 ]                         |
|   (o) Fit Bounds                                  |  - Giờ tan trường đón về:    [ 16:30 ]                         |
|                                                   |  - Thời gian tối đa 1 tuyến: [ 60 ] phút (tùy chọn)            |
|   [Icon: Bãi xe trung tâm (P)]                   |                                                                |
|   [Icon: Trường THCS Chu Văn An (S)]              |  2. CHỌN HỌC SINH (28/28 đã chọn)                             |
|   [Markers: 28 học sinh (H)]                      |  [X] Chọn tất cả             [ Tìm kiếm học sinh...          ] |
|                                                   |  [X] STU001 - Nguyễn Văn An (2.5 km)                           |
|   Chú giải:                                       |  [X] STU002 - Trần Bảo Châu (4.1 km)                           |
|   (P) Bãi xe   (S) Trường học   (H) Điểm đón HS   |  [X] STU003 - Lê Quốc Dũng  (3.8 km)                           |
|                                                   |                                                                |
|                                                   |  3. CHỌN XE THỦ CÔNG (Sắp xếp: Chỗ ngồi DESC)                  |
|                                                   |  [X] 51B-123.45 (Hyundai Solati - 16 chỗ) • Khả dụng           |
|                                                   |  [X] 51B-678.90 (Ford Transit  - 16 chỗ) • Khả dụng           |
|                                                   |  [ ] 51B-999.11 (Thaco Bus     - 29 chỗ) • Khả dụng           |
|                                                   |  Tổng ghế chọn: 32 chỗ / 28 học sinh [ Đủ sức chứa (OK) ]     |
+--------------------------------------------------------------------------------------------------------------------+
```

### 2.4. Screen 4: Trang Xem Trước Phương Án Tuyến (Route Preview)
```
+--------------------------------------------------------------------------------------------------------------------+
|  [ < Hủy toàn bộ & Lập lại ]  XEM TRƯỚC PHƯƠNG ÁN TUYẾN (PREVIEW)                [ Xác nhận lưu toàn bộ phương án ] |
+--------------------------------------------------------------------------------------------------------------------+
|  BẢN ĐỒ LỘ TRÌNH VIETMAP                         |  THÔNG TIN & DANH SÁCH TUYẾN TỐI ƯU                            |
|                                                   |  Tổng phân bổ: 28/28 học sinh (100% 2 chiều) • 2 xe sử dụng   |
|  [ Polyline Tuyến Đi 01 - Vàng ]                 |                                                                |
|  [ Polyline Tuyến Đi 02 - Xanh ]                  |  CHIỀU ĐI (TO_SCHOOL)                                          |
|                                                   |  > Tuyến Đi 01 • Xe: 51B-123.45 • 14 em • 18.2 km • 38 phút   |
|  [ Polyline Tuyến Về 01 - Nét đứt ]               |    06:20: Bãi xe ➔ 06:32: HS1 ➔ 06:40: HS2 ➔ 07:05: Trường     |
|  [ Polyline Tuyến Về 02 - Nét đứt ]               |  > Tuyến Đi 02 • Xe: 51B-678.90 • 14 em • 19.5 km • 41 phút   |
|                                                   |                                                                |
|                                                   |  CHIỀU VỀ (TO_PARKING)                                         |
|                                                   |  > Tuyến Về 01 • Xe: 51B-123.45 • 14 em • 17.9 km • 36 phút   |
|                                                   |    [ Hủy tuyến về này ] (Tính lại tuyến đi liên quan)          |
|                                                   |  > Tuyến Về 02 • Xe: 51B-678.90 • 14 em • 19.1 km • 40 phút   |
|                                                   |    [ Hủy tuyến về này ]                                        |
+--------------------------------------------------------------------------------------------------------------------+
```

### 2.5. Screen 5: Trang Chi Tiết Tuyến Đường (`/admin/routes/[id]`)
```
+--------------------------------------------------------------------------------------------------------------------+
|  [ < Danh sách tuyến ]  CHI TIẾT TUYẾN ĐI 01 — TRƯỜNG THCS CHU VĂN AN                  [ Hủy phương án tuyến (Plan) ] |
+--------------------------------------------------------------------------------------------------------------------+
|  BẢN ĐỒ TUYẾN (VIETMAP)                          |  THÔNG TIN CHI TIẾT TUYẾN                                      |
|                                                   |  Phương án: [ PA-2026-001 (DRAFT) ]                            |
|  - Điểm xuất phát: Bãi xe trung tâm               |  Trường:    Trường THCS Chu Văn An                             |
|  - Điểm kết thúc:   Trường THCS Chu Văn An        |  Chiều:     Đi học (TO_SCHOOL)                                 |
|  - Lộ trình:        Đường nét liền màu xanh       |  Xe đề xuất: 51B-123.45 (Hyundai Solati - 16 chỗ)              |
|  - Markers:         14 điểm dừng theo thứ tự      |  Độ dài:    18.2 km • Thời gian dự kiến: 38 phút               |
|                                                   |  Khởi hành: 06:20   • Đến trường: 07:05                        |
|                                                   |                                                                |
|                                                   |  DANH SÁCH ĐIỂM DỪNG & HỌC SINH (14 em)                        |
|                                                   |  #  | Điểm dừng       | Học sinh          | ETA   | Địa chỉ    |
|                                                   |  1  | Bãi xe          | -                 | 06:20 | Suối Tiên  |
|                                                   |  2  | Điểm đón số 1   | Nguyễn Văn An     | 06:32 | 12 Nguyễn Trãi
|                                                   |  3  | Điểm đón số 2   | Trần Bảo Châu     | 06:40 | 45 Lê Lợi  |
|                                                   |  ...| ...             | ...               | ...   | ...        |
|                                                   |  15 | Trường học      | -                 | 07:05 | Thụy Khuê  |
+--------------------------------------------------------------------------------------------------------------------+
```

### 2.6. Screen 6: Modal Xác Nhận Hủy Toàn Bộ RoutePlan
```
+-------------------------------------------------------------------------+
|  Xác nhận hủy phương án tuyến                                       [X] |
+-------------------------------------------------------------------------+
|  Bạn có chắc chắn muốn hủy phương án tuyến này không?                   |
|                                                                         |
|  Phương án: PA-2026-001 (Trường THCS Chu Văn An)                        |
|  Bao gồm:   2 tuyến đi, 2 tuyến về, 28 học sinh, 2 xe đề xuất.          |
|                                                                         |
|  Hành động này sẽ giải phóng toàn bộ học sinh và xe đề xuất để lập     |
|  phương án mới. Dữ liệu lịch sử sẽ được bảo lưu.                       |
|                                                                         |
|  Lý do hủy: [ Thay đổi danh sách học sinh đăng ký dịch vụ             ] |
+-------------------------------------------------------------------------+
|                                           [ Không hủy ]  [ Hủy phương án ]|
+-------------------------------------------------------------------------+
```

### 2.7. Screen 7: Chi Tiết Học Sinh — Section Tuyến Đưa Đón (`/admin/students/[id]`)
```
+--------------------------------------------------------------------------------------------------------------------+
|  HỒ SƠ HỌC SINH: NGUYỄN VĂN AN (STU001)                                                                            |
|  Trường: THCS Chu Văn An • Phụ huynh: Nguyễn Văn Ba (0901234567) • Trạng thái: AVAILABLE                           |
+--------------------------------------------------------------------------------------------------------------------+
|  TUYẾN ĐƯỜNG ĐƯA ĐÓN HỌC SINH                                                                                      |
|  Phương án: PA-2026-001 • Trạng thái: [ DỰ KIẾN (DRAFT) ]                                                         |
|                                                                                                                    |
|  +---------------------------------------------+  +-------------------------------------------------------------+  |
|  | CHIỀU ĐI HỌC (TO_SCHOOL)                    |  | BẢN ĐỒ TUYẾN CÁ NHÂN (BẢO VỆ RIÊNG TƯ)                      |  |
|  | - Tuyến:       Tuyến Đi 01                  |  |                                                             |  |
|  | - Xe đề xuất:  51B-123.45 (16 chỗ)          |  | [ Polyline tuyến đường đưa đón ]                            |  |
|  | - Đón tại nhà: 06:32 (Dự kiến)              |  | (P) Bãi xe ➔ (H) Nhà em An ➔ (S) Trường Chu Văn An         |  |
|  | - Đến trường:  07:05 (Dự kiến)              |  | *(Chỉ hiển thị vị trí của em An, không hiện HS khác)*       |  |
|  |                                             |  +-------------------------------------------------------------+  |
|  | CHIỀU VỀ NHÀ (TO_PARKING)                   |                                                                   |
|  | - Tuyến:       Tuyến Về 01                  |                                                                   |
|  | - Xe đề xuất:  51B-123.45 (16 chỗ)          |                                                                   |
|  | - Đón tại trường: 16:30 (Dự kiến)           |                                                                   |
|  | - Về đến nhà:     17:02 (Dự kiến)           |                                                                   |
+--------------------------------------------------------------------------------------------------------------------+
```

### 2.8. Screen 8: Mobile Parent — Màn hình Tuyến đường (`mobile/app/parent/route-detail.tsx`)
```
+---------------------------------------+
|  < Trở lại      Tuyến xe của con      |
+---------------------------------------+
|  [ Thẻ thông báo DRAFT ]              |
|  Tuyến dự kiến — Chưa kích hoạt ca chạy|
+---------------------------------------+
|  [ TAB: Chiều đi ]   [ TAB: Chiều về ]|
+---------------------------------------+
|  THÔNG TIN CHUYẾN ĐI (SÁNG)           |
|  Tuyến: Tuyến Đi 01                   |
|  Xe đề xuất: 51B-123.45 (16 chỗ)      |
|  Giờ đón dự kiến: 06:32               |
|  Giờ đến trường:  07:05               |
|  Địa chỉ đón: 12 Nguyễn Trãi, Q.5     |
+---------------------------------------+
|  BẢN ĐỒ LỘ TRÌNH (VIETMAP)            |
|  +---------------------------------+  |
|  | [ Polyline đường đi màu vàng ]   |  |
|  | (H) Điểm đón của con             |  |
|  | (S) Trường THCS Chu Văn An       |  |
|  | *(Bảo mật: Không hiện con khác)* |  |
|  +---------------------------------+  |
+---------------------------------------+
```
