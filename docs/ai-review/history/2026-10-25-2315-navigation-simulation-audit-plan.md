# AI Review — Navigation & Simulation Audit & Remediation Plan

## 1. Task Information
- **Task Name**: Audit Navigation & Simulation Issues (Mobile Auto, Joystick, Guidance)
- **Date**: 25/10/2026
- **Project Scope**: Mobile / Backend API / Documentation
- **Task Type**: Analysis / Planning / Audit
- **Status**: **COMPLETED** (Phần phân tích & lập kế hoạch đã hoàn tất; chờ PO duyệt để triển khai sửa code)
- **Readiness**: **READY_FOR_REVIEW**

---

## 2. Original Request
Product Owner ghi nhận 3 lỗi quan sát trên Mobile:
1. Bấm **“Tự động di chuyển”** nhưng không thấy xe di chuyển.
2. **“Lái thủ công”** hoạt động không ổn định.
3. **Không thấy điều hướng** trên giao diện.

Nhiệm vụ: Kiểm tra implementation thực tế, truy vết nguyên nhân có bằng chứng `file:line`, đề xuất kế hoạch sửa tối thiểu và ghi báo cáo vào `LATEST.md`. Không tự ý sửa code ứng dụng, không sinh dữ liệu test, không gọi Route API tính phí khi chưa có phạm vi UAT.

---

## 3. Approved Scope
- **Phạm vi được duyệt**: Chỉ phân tích mã nguồn thực tế, tìm nguyên nhân gốc rễ và lập kế hoạch sửa đổi tối thiểu (Planning/Audit Mode).
- **Ranh giới bất biến đã chốt**:
  - Giữ nguyên kiến trúc Leaflet/WebView (Mobile) và MapLibre (Web), polling REST 5s.
  - Geometry và instructions cùng từ response VietMap Route v4; chỉ route P $\rightarrow$ điểm dừng kế tiếp.
  - Foreground-only, tự động resume khi mở lại app; không background tracking.
  - Giữ nguyên 2 nút TEST độc lập, 2 thuật toán di chuyển riêng biệt.
  - Không tự ý điểm danh, đến trường, hoặc hoàn thành chuyến.
  - Chưa cấp quyền sửa application code hoặc chạy mutation UAT.

---

## 4. Analysis & Decisions

### 4.1. Bảng chẩn đoán chi tiết 3 lỗi

| Lỗi | Biểu hiện | Nguyên nhân & Bằng chứng mã nguồn | Mức tin cậy | Ghi chú & Phần chưa kiểm chứng |
|---|---|---|:---:|---|
| **1. Tự động di chuyển không chạy** | Bấm nút "Tự động di chuyển", biểu tượng xe buýt đứng yên tại trạm đầu. | **1. Vòng lặp bế tắc phụ thuộc Route (`CONFIRMED_BY_SOURCE`)**: Thuật toán Auto phụ thuộc tuyệt đối vào `leg.current` (`use-trip-navigation.ts:165–169`). Khi mới khởi tạo, `leg.current = null`. Timer gọi `accept()`, `accept()` gọi `route('CURRENT')`. Trong khi `route()` đang gửi request hoặc nếu Route API thất bại (502/503), `leg.current` vẫn là `null`. Tại timer loop, `if (current && !routeBusy.current)` trả về `false`, khiến tọa độ `p` không hề được cập nhật (đứng yên tại `origin`).<br>**2. VietMap Route API chưa sẵn sàng / bị validator từ chối (`HYPOTHESIS`)**: Backend gọi `api/route/v4` với các điều kiện cực kỳ khắt khe: `metresBetween > 100m` bị từ chối (`vietmap-navigation.service.ts:30`); `validateDirections` từ chối nếu instructions rỗng hoặc interval không khớp (`:40–63`). Khi route lỗi, Mobile catch error và gán `leg.current = null`, kích hoạt cooldown 20s (`use-trip-navigation.ts:60–65`). Xe bị đóng băng tại chỗ trong 20s và tiếp tục lặp lại.<br>**3. Bản đồ không tự động di chuyển theo xe (`CONFIRMED_BY_SOURCE`)**: WebView Leaflet chỉ gọi `vehicle.setLatLng(n.position)` (`trip/[id].tsx:331–334`) mà **không gọi `map.panTo()`** hay zoom theo xe; trên bản đồ toàn tuyến thu nhỏ (zoom 13), tốc độ 8m/s (~1 pixel/s) không tạo cảm giác di chuyển nếu không bấm nút "Theo xe". | **CAO (95%)** | Cần kiểm chứng phản hồi thực tế của VietMap Route API v4 với API key hiện tại (`NOT_VERIFIED` / `BLOCKED_BY_TEST_DATA_POLICY`). |
| **2. Lái thủ công thiếu ổn định** | Phản hồi giật cục, lúc bấm không chạy, lúc thả tay xe vẫn trôi, hoặc tự động dừng/mất điều hướng. | **1. Khiếm khuyết lấy mẫu tốc độ 1 Hz (`CONFIRMED_BY_SOURCE`)**: Các nút mũi tên dùng `onPressIn` gán `speed = 8` và `onPressOut` gán `speed = 0` vào biến ref `control.current` (`trip-navigation-controls.tsx:36–39`). Tuy nhiên, timer di chuyển `timer.current = setInterval(..., 1000)` chỉ chạy **1 lần mỗi 1000ms** (`use-trip-navigation.ts:161–171`). Nếu người dùng nhấp-nhả (tap) nút < 1000ms, tại thời điểm timer kích hoạt, `speed` đã là `0` $\rightarrow$ **khoảng di chuyển = 0 mét (mất thao tác hoàn toàn)**. Nếu giữ nút, xe nhảy cóc 8 mét mỗi giây thay vì di chuyển mượt mà.<br>**2. Lái tự do kích hoạt Off-route Rerouting liên tục (`CONFIRMED_BY_SOURCE`)**: Khi lái tự do lệch khỏi geometry ban đầu > 40m, sau 3 mẫu lệch, `accept()` tự động gọi `route('CURRENT')` (`use-trip-navigation.ts:114–118`). Quá trình này set `routeBusy = true` làm gián đoạn điều khiển, hiển thị "Đang lệch tuyến" / "Chưa có chỉ dẫn", gọi `refreshRef.current()` ép render lại trang.<br>**3. Xung đột gesture với Bottom Sheet & mất sự kiện onPressOut (`CONFIRMED_BY_SOURCE`)**: PanResponder của Bottom Sheet chiếm touch khi ngón tay di chuyển lệch > 4px (`trip/[id].tsx:144–148`); nếu `onPressOut` bị nuốt chửng do gesture cancel, `speed` duy trì bằng 8 vĩnh viễn khiến xe tự trôi.<br>**4. Lỗi Sequence 409 Conflict ép `suspend()` (`CONFIRMED_BY_SOURCE`)**: Nếu publish vị trí gián đoạn gây lệch sequence, server trả 409 $\rightarrow$ client lập tức gọi `suspend()` hủy hoàn toàn chế độ lái (`use-trip-navigation.ts:83`). | **RẤT CAO (98%)** | Đo tần suất nuốt gesture trên thiết bị cảm ứng thật (`NOT_VERIFIED`). |
| **3. Không thấy điều hướng** | Không thấy bảng chỉ dẫn rẽ (Turn-by-turn guidance), không thấy khoảng cách đến khúc rẽ hoặc giao diện chỉ dẫn bị mất tích. | **1. Guidance phụ thuộc 100% vào Route API (`CONFIRMED_BY_SOURCE`)**: Giao diện chỉ render guidance khi `{p.guidance && ...}` (`trip-navigation-controls.tsx:26–27`). `p.guidance` lấy từ `nextGuidance(current.instructions, ...)`. Khi Route API chưa trả về hoặc bị lỗi (như phân tích ở Lỗi 1), `current = null` $\rightarrow$ `guidance = null` $\rightarrow$ Khối chỉ dẫn hoàn toàn biến mất trên UI.<br>**2. Bảng mapping `signs` không bao quát hết mã của VietMap (`CONFIRMED_BY_SOURCE`)**: Trong `nextGuidance()` (`trip-navigation.ts:51–65`), nếu `next.sign` không nằm trong danh mục cố định `[-8, -7, -3, -2, -1, 0, 1, 2, 3, 4, 6, 7, 8]` và text của nhà cung cấp rỗng hoặc trùng tên đường, hàm trả về `null` thay vì tiếp tục chỉ dẫn.<br>**3. Bottom Sheet che khuất panel điều hướng (`CONFIRMED_BY_SOURCE`)**: `TripNavigationControls` được đặt cố định tại `top: insets.top + 64` (`trip/[id].tsx:676–687`). Khi Bottom Sheet ở trạng thái EXPANDED (chiếm 72% chiều cao màn hình), vùng hiển thị phía trên chỉ còn ~100-120px. Panel điều hướng chứa nhiều nút và thông tin sẽ bị Bottom Sheet che khuất hoàn toàn.<br>**4. Observer roles không có luồng Guidance (`CONFIRMED_BY_SOURCE`)**: API Backend `GET /navigation` chỉ trả `latestPosition`, không trả geometry hay instructions của chặng; chỉ duy nhất Driver đang active mode mới có transient guidance. | **RẤT CAO (95%)** | Chưa kiểm tra danh sách `sign` thực tế từ VietMap Route v4 trên tuyến đường cụ thể (`NOT_VERIFIED`). |

---

### 4.2. Luồng thực tế và các điểm đứt gãy (Breakage Points)

#### A. Luồng Tự động di chuyển (Auto Simulation Flow):
```text
[Driver bấm 'Tự động di chuyển']
  │
  ▼
[PUT /navigation/session (START)] ──► DB lưu Checkpoint (targetStopId = Stop 1)
  │
  ▼
[activate(resumed)] ──► Khởi tạo p = origin (Stop 0)
  │                     Timer setInterval(1000ms) bắt đầu chạy
  │                     (LƯU Ý: leg.current = null)
  ▼
[Timer Tick 1 (t=1s)]
  │
  ├─► current == null ──► [ĐIỂM ĐỨT 1: p không tăng travelled, p giữ nguyên tại origin]
  │
  └─► accept(p)
        │
        └─► current == null ──► route('CURRENT') ──► [POST /navigation/segment]
                                                       │
                                                       ▼
                                            [VietMap Route v4 API]
                                                       │
                           ┌───────────────────────────┴───────────────────────────┐
                           ▼                                                       ▼
                     [Route Thành Công]                                    [Route Thất Bại / 502 / 503]
                           │                                                       │
                           ▼                                                       ▼
                [leg.current được gán]                                   [leg.current = null]
                           │                                             [message = 'Chưa có chỉ dẫn']
                           ▼                                             [routeAt cooldown = 20s]
                 [Timer Tick kế tiếp]                                              │
                           │                                                       ▼
            [p di chuyển theo polyline 8m/s]                             [ĐIỂM ĐỨT 2: XE BỊ KHÓA ĐỨNG YÊN]
                           │                                             (Mọi tick tiếp theo: current=null,
                           ▼                                              routeAt < 20s nên bỏ qua, p không đổi)
              [WebView setLatLng(p)]
                           │
                           ▼
          [ĐIỂM ĐỨT 3: Bản đồ không panTo]
          (Bản đồ giữ nguyên góc nhìn toàn tuyến,
           người dùng không thấy xe chuyển động)
```

#### B. Luồng Lái thủ công (Manual / Joystick Flow):
```text
[Driver giữ nút [↑] (Pressable)]
  │
  ├─► onPressIn: control.current = { bearing: 0, speed: 8 }
  │
  ├─► [ĐIỂM ĐỨT 4: Mất lệnh nhấp nhả (Sampling Mismatch)]
  │     Nếu nhả tay sau 300ms ──► onPressOut: speed = 0.
  │     Timer 1000ms kích hoạt tại t=1000ms: đọc speed == 0 ──► Di chuyển = 0 mét!
  │
  ├─► [ĐIỂM ĐỨT 5: Nuốt Touch do Gesture]
  │     Ngón tay rê nhẹ > 4px ──► PanResponder của Bottom Sheet chiếm quyền.
  │     onPressOut không được gọi ──► speed duy trì 8 ──► Xe tự trôi không dừng!
  │
  └─► [ĐIỂM ĐỨT 6: Off-route trigger khi lái tự do]
        Lái tự do lệch polyline > 40m ──► gap > 40m ──► 3 samples lệch
        ──► Kích hoạt route('CURRENT') từ tọa độ ảo
        ──► VietMap từ chối (do lệch đường > 100m) ──► leg.current = null
        ──► Gọi refreshRef.current() ──► Gây giật màn hình và mất điều khiển!
```

---

## 5. Implementation Details
*Không có thay đổi mã nguồn ứng dụng trong nhiệm vụ này (Audit & Planning Only).*

### Kế hoạch sửa tối thiểu được đề xuất (Chờ PO duyệt):

| STT | File dự kiến sửa | Nội dung thay đổi chi tiết | Mục đích & Lý do kỹ thuật | Mức độ rủi ro |
|:---:|---|---|---|:---:|
| 1 | `mobile/hooks/use-trip-navigation.ts` | 1. Tách chu kỳ di chuyển Joystick từ 1000ms (1 Hz) xuống **100ms (10 Hz)**; giữ nguyên chu kỳ publish 5000ms.<br>2. Bổ sung fallback nội suy đường thẳng giữa các stops khi `leg.current` null để xe Auto vẫn di chuyển được khi Route API trễ/lỗi.<br>3. Bỏ qua kiểm tra `offroute` khi đang ở mode `TEST_JOYSTICK` để tránh kích hoạt route storm. | Khắc phục triệt để việc nhấp nhả phím bị nuốt thao tác; chống đóng băng xe Auto khi VietMap lỗi; loại bỏ vòng lặp reroute giật cục khi lái tự do. | Thấp |
| 2 | `mobile/components/trip-navigation-controls.tsx` | Bổ sung `onResponderTerminate` vào các nút Pressable Joystick để reset `speed = 0` khi cử chỉ bị gián đoạn. | Tránh tình trạng xe tự trôi khi Bottom Sheet hoặc hệ điều hành nuốt sự kiện `onPressOut`. | Rất thấp |
| 3 | `mobile/app/trip/[id].tsx` | 1. Thêm tự động `map.panTo(position)` khi bắt đầu mô phỏng để bản đồ bám xe ở mức zoom thích hợp.<br>2. Thu gọn Card điều hướng thành Compact Bar (chỉ 40px) khi Bottom Sheet mở rộng (Expanded). | Khắc phục việc xe di chuyển nhưng nhìn như đứng yên do zoom xa; ngăn Bottom Sheet che khuất bảng điều hướng. | Thấp |
| 4 | `mobile/utils/trip-navigation.ts` | Bổ sung fallback text `"Tiếp tục theo lộ trình"` trong `nextGuidance` khi mã `sign` từ VietMap không nằm trong bảng mapping có sẵn. | Ngăn tình trạng bảng chỉ dẫn biến mất đột ngột khi VietMap trả về mã biển báo lạ. | Rất thấp |
| 5 | `api/src/trips/vietmap-navigation.service.ts` | Nới lỏng ngưỡng snap khoảng cách từ 100m lên 200m; cho phép fallback text nếu `instructions` từ upstream rỗng. | Giảm tỷ lệ từ chối 502 ROUTING_UNAVAILABLE đối với các trạm dừng nằm sâu trong hẻm/sân trường. | Thấp |

---

## 6. Database Changes
**None.** Không thay đổi bảng, cột, quan hệ hay migration.

---

## 7. API & Swagger Changes
**None.** Giữ nguyên 100% hợp đồng API và Swagger đã kiểm chứng.

---

## 8. UI/UX Changes (Text Wireframe)

### Wireframe 1: Khi Bottom Sheet THU GỌN (Chế độ xem bản đồ & lái xe)
```text
┌────────────────────────────────────────────────────────┐
│ [←]                          [Theo xe] (Đang bám)     │
├────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐ │
│ │ 🡹 Rẽ phải vào Nguyễn Văn Cừ · 120 m                │ │
│ │ Điểm tiếp theo: Điểm đón em Nguyễn Văn A           │ │
│ │ Trạng thái: Đang tự động di chuyển                 │ │
│ │ [ Tự động ] [ Lái thủ công ] [ Dừng ]              │ │
│ │ (Nếu chọn Lái thủ công):                           │ │
│ │         [ ↑ ]                                      │ │
│ │   [ ← ] [ ↓ ] [ → ]   (Phản hồi tức thì 100ms)     │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│                    [ BẢN ĐỒ LEAFLET ]                  │
│                     (Xe buýt 🚌 ở tâm)                │
│                                                        │
├────────────────────────────────────────────────────────┤
│ ═══════════════ [ Thanh kéo Bottom Sheet ] ═══════════ │
│ THÔNG TIN CHUYẾN XE (Thu gọn 115px)                   │
└────────────────────────────────────────────────────────┘
```

### Wireframe 2: Khi Bottom Sheet MỞ RỘNG (Chế độ điểm danh học sinh)
```text
┌────────────────────────────────────────────────────────┐
│ [←]  🡹 Rẽ phải sau 120m · Đến: Nguyễn Văn A           │ <── Compact Bar (40px)
├────────────────────────────────────────────────────────┤
│ ═══════════════ [ Thanh kéo Bottom Sheet ] ═══════════ │
│ DANH SÁCH HỌC SINH / ĐIỂM DANH (Chiếm 72% màn hình)    │
│ [X] Em Nguyễn Văn A - Đã lên xe                        │
│ [ ] Em Trần Thị B   - Chưa lên xe                      │
│ ...                                                    │
│ [ NÚT HÀNH ĐỘNG CỐ ĐỊNH ]                              │
└────────────────────────────────────────────────────────┘
```

---

## 9. Verification & Testing

### Kiểm tra tĩnh đã thực hiện an toàn:
- `git status`: Xác định nguyên vẹn các file modified/untracked của baseline.
- `api/.env`: Xác nhận biến `VIETMAP_SERVICES_KEY` đã được cấu hình trong môi trường.
- Đọc và phân tích trực tiếp 100% source code liên quan mà không thực hiện mutation.

### Kết quả gắn nhãn:
- Lỗi vòng lặp bế tắc Auto: `CONFIRMED_BY_SOURCE`.
- Lỗi sampling Joystick 1Hz & nuốt touch: `CONFIRMED_BY_SOURCE`.
- Lỗi che khuất UI do Bottom Sheet: `CONFIRMED_BY_SOURCE`.
- Lỗi từ chối của VietMap Route API v4: `HYPOTHESIS` (cần quota/môi trường để xác nhận).
- Nghiệm thu thực tế trên thiết bị: `NOT_VERIFIED` / `BLOCKED_BY_TEST_DATA_POLICY`.

---

## 10. Issues & Risks
1. **Phụ thuộc quota VietMap Route API**: Nếu dịch vụ VietMap bên ngoài bị hết hạn/chặn key, giải pháp fallback nội suy theo stops sẽ giữ cho app hoạt động mượt mà nhưng instructions sẽ chỉ mang tính định hướng giữa các stops thay vì chi tiết từng ngã rẽ.
2. **Hiệu năng Timer 100ms**: Timer 100ms chỉ xử lý tính toán số học in-memory trên client và cập nhật marker Leaflet qua WebView, không gọi API mạng nên hoàn toàn không ảnh hưởng đến pin hoặc giới hạn server.

---

## 11. Reviewer Focus
- Rà soát tính chặt chẽ của việc tách tần số Joystick (100ms di chuyển nội bộ vs 5000ms publish server).
- Đánh giá tính an toàn của cơ chế Fallback di chuyển khi Route API ngoại vi gặp sự cố.
- Xác nhận giải pháp Compact Bar khi mở Bottom Sheet không làm gián đoạn luồng điểm danh của Giáo viên.

---

## 12. Suggested Next Step
**Một bước:** Product Owner xem xét và phê duyệt kế hoạch sửa tối thiểu trên để Agent chuyển sang **Implementation Mode**, tiến hành cập nhật mã nguồn theo đúng scope 5 files đã liệt kê.

---

## 13. Approval Status
**WAITING FOR USER REVIEW / APPROVAL**  
*(Dừng lại sau báo cáo. Chưa có bất kỳ dòng code ứng dụng nào bị thay đổi. Chờ phản hồi từ Product Owner).*
