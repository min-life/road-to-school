# BÁO CÁO AI REVIEW — AUDIT & KẾ HOẠCH KHẮC PHỤC NAVIGATION & ROUTING

## 1. Thông tin phiên làm việc
- **Nhiệm vụ**: Ghi nhận trải nghiệm thực tế P1–P5, điều tra 6 điểm kiểm chứng trong source code, và lập kế hoạch sửa triệt để Mobile Navigation & Routing.
- **Thời gian**: 2026-10-26 00:55 (GMT+7).
- **Thực hiện**: Codex / Antigravity AI Agent.
- **Chế độ**: **PLANNING / AUDIT ONLY — CHƯA ĐƯỢC SỬA CODE.**
- **Trạng thái**: COMPLETED PLANNING (Hoàn thành phân tích & lập kế hoạch; dừng chờ phê duyệt từ Product Owner).

---

## 2. Bối cảnh & Yêu cầu của PO (P1 — P5)
Product Owner quan sát thực tế trên Mobile trong môi trường TEST và chỉ ra 5 vấn đề cốt lõi:
1. **P1 — Vẫn hiển thị tuyến mặc định**: Sau khi bấm Bắt đầu chuyến, vẫn thấy planned polyline; không thấy đường điều hướng mới từ VietMap.
   - *Mong muốn*: Trong chế độ điều hướng sau Start Trip, ẩn planned polyline khỏi bản đồ chính. Chỉ hiển thị geometry điều hướng hợp lệ từ VietMap. Khi chưa có route thì hiện trạng thái chờ, không dùng planned line thế mạng.
2. **P2 — Không thấy phân biệt đường đã đi và chưa đi**:
   - *Mong muốn*: Đoạn đã đi màu xám (`#94A3B8`), đoạn còn lại màu xanh dương (`#2563EB`). Tiếp giáp liền mạch tại projected progress. Không tô xám đường chưa đi.
3. **P3 — Auto vẫn không hoạt động**: Thử trong TEST nhưng xe không tự di chuyển.
   - *Mong muốn*: Auto di chuyển theo geometry VietMap thật, cập nhật marker, progress, guidance và vết chia màu. Đến điểm dừng chuyển chặng đúng thứ tự. Chưa có route thì dừng chờ, không chạy đường thẳng.
4. **P4 — Manual chạy, lưu được hành trình nhưng không thấy reroute**:
   - *Mong muốn*: Giữ nguyên Manual đang hoạt động ổn định. Khi lệch current route $> 40\text{m}$ duy trì $\ge 3\text{s}$, gọi VietMap từ vị trí xe đến target hiện tại, nạp geometry và instructions mới đồng bộ. Không đổi thứ tự stops.
5. **P5 — Guidance gần như không hoạt động**: PO nghi ngờ thiếu GPS điện thoại vì đang TEST.
   - *Mong muốn*: Trong TEST, dùng tọa độ mô phỏng làm vị trí đầu vào cho navigation. Không cần GPS vật lý để chạy Auto/Manual TEST. LIVE tiếp tục dùng GPS thật.

---

## 3. Source of Truth & Baseline Validation
- **Tài liệu đã đọc theo thứ tự bắt buộc**:
  1. [AGENTS.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/AGENTS.md)
  2. [docs/WORKING_RULES.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/WORKING_RULES.md)
  3. [docs/BUSINESS_CONTEXT.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/BUSINESS_CONTEXT.md)
  4. [docs/ai-handoff/CODEX_HANDOFF.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-handoff/CODEX_HANDOFF.md)
  5. [docs/ai-handoff/CURRENT_STATE.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-handoff/CURRENT_STATE.md)
  6. [docs/ai-review/LATEST.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.md) và [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)
  7. [docs/ai-review/vehicle-navigation-simulation-architecture-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/vehicle-navigation-simulation-architecture-plan.md)
- **Lưu trữ báo cáo phiên trước**:
  - Đã lưu trữ toàn văn báo cáo trước vào [docs/ai-review/history/2026-10-26-0030-fix-routing-auto-navigation-ux.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/history/2026-10-26-0030-fix-routing-auto-navigation-ux.md) và diff vào [docs/ai-review/history/2026-10-26-0030-fix-routing-auto-navigation-ux.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/history/2026-10-26-0030-fix-routing-auto-navigation-ux.diff).
- **Bảo vệ uncommitted work**: Kiểm tra `git status`, không commit, không push, không reset, không sửa đổi application code.

---

## 4. Phân tích Nguyên nhân Gốc rễ (RCA) đối chiếu 6 Điểm Source Code

### 4.1. Start Trip $\rightarrow$ prepare có Race Condition
- **Bằng chứng**: [mobile/app/trip/[id].tsx:411–428](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/app/trip/[id].tsx#L411-L428) và [mobile/hooks/use-trip-navigation.ts:297–298](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L297-L298).
- **Phân tích**: `mutate(() => mobileApiClient.startTrip(tripId))` kích hoạt refresh vòng lặp ngầm bất đồng bộ. Ngay sau đó `engine.prepare()` được gọi. Dòng đầu tiên của `prepare()` kiểm tra:
  `if (busy.current || !remote.current?.canPublish || !foreground.current) return;`
  Tại thời điểm này, `remote.current` vẫn mang giá trị trước Start (`SCHEDULED`, `canPublish === false`). Do đó, `prepare()` **thoát thầm lặng ngay lập tức**, không nạp route VietMap, không cập nhật `leg.current`.
- **Nhãn**: `CONFIRMED_BY_SOURCE`.

### 4.2. Session / CAS & Target Preservation
- **Bằng chứng**: [api/src/trips/trip-navigation.service.ts:104–108](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/trip-navigation.service.ts#L104-L108).
- **Phân tích**:
  `const preserve = dto.action === 'SWITCH' && previous?.routeVersion === version && !!previous?.targetStopId;`
  `const targetStopId = preserve ? previous.targetStopId : initial?.id ?? null;`
  Khi client gọi `action === 'RESUME'`, `preserve` là `false` $\rightarrow$ `targetStopId` bị đưa về `initial?.id` (điểm dừng đầu tiên), làm sai lệch hành trình đang chạy dở dang.
- **Nhãn**: `CONFIRMED_BY_SOURCE`.

### 4.3. Request Routing bị Kẹt khi Đổi Mode (Rò rỉ `routeBusy`)
- **Bằng chứng**: [mobile/hooks/use-trip-navigation.ts:109](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L109) và [mobile/hooks/use-trip-navigation.ts:353](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L353).
- **Phân tích**: Khối `finally` của hàm `route()` chỉ đặt `routeBusy.current = false` nếu `token === generation.current`. Khi người dùng đổi mode trong lúc request đang gửi, `generation.current++` khiến dòng reset bị bỏ qua. `routeBusy.current` bị kẹt ở `true` vĩnh viễn, ngăn mọi request định tuyến và khóa đứng Auto (`if (current && !routeBusy.current)`).
- **Nhãn**: `CONFIRMED_BY_SOURCE`.

### 4.4. Giữ Geometry và Tiến độ khi Manual $\rightarrow$ Auto
- **Bằng chứng**: [mobile/hooks/use-trip-navigation.ts:172](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L172), [mobile/hooks/use-trip-navigation.ts:232–238](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L232-L238), [mobile/hooks/use-trip-navigation.ts:250](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L250).
- **Phân tích**:
  - Khi xe lái bằng Joystick, `current.progress` tăng nhưng `current.travelled` (dùng cho Auto) không được cập nhật.
  - Khi bấm chuyển sang Auto, `activate` đọc `state.latestPosition` từ server (vị trí cũ 5s trước) để gán lại `position: p`, làm xe giật lùi về điểm cũ trên DB.
  - Sau đó Auto chạy từ `current.travelled = 0`, làm xe nhảy giật về đầu tuyến.
- **Nhãn**: `CONFIRMED_BY_SOURCE`.

### 4.5. Routing và Retry (Client vs Server Cooldown & Phân loại Lỗi)
- **Bằng chứng**: [mobile/hooks/use-trip-navigation.ts:63](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L63) và [mobile/hooks/use-trip-navigation.ts:106–107](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L106-L107).
- **Phân tích**:
  - Client hardcode cooldown 3000ms trong khi server LIVE là 10000ms.
  - Khi gặp lỗi 409, 502, 503, timeout, code Mobile gom toàn bộ thành `message: 'Chưa có chỉ dẫn'`, che giấu nguyên nhân thực tế và không cung cấp retry thích hợp.
- **Nhãn**: `CONFIRMED_BY_SOURCE`.

### 4.6. Điều kiện Bản đồ `hidePlanned` & Reroute Initial
- **Bằng chứng**: [mobile/app/trip/[id].tsx:372](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/app/trip/[id].tsx#L372).
- **Phân tích**: `hidePlanned = hasActiveRoute && !showPlanned`. Khi `hasActiveRoute === false` (lúc route đang tải hoặc prepare thất bại), `hidePlanned` là `false`, khiến map tự động hiển thị planned polyline cũ. Người dùng lầm tưởng đó là tuyến điều hướng.
- **Nhãn**: `CONFIRMED_BY_SOURCE`.

---

## 5. Ma trận Yêu cầu (P1 — P5)
Chi tiết ma trận đối chiếu giữa Quan sát thực tế $\rightarrow$ Hành vi mong muốn $\rightarrow$ Hiện trạng Source $\rightarrow$ Khoảng cách cần sửa $\rightarrow$ Tiêu chí nghiệm thu đã được trình bày đầy đủ tại [Mục 2 của docs/ai-review/navigation-routing-remediation-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/navigation-routing-remediation-plan.md#2-ma-tr%E1%BA%ADn-y%C3%AAu-c%E1%BA%A7u-p1--p5).

---

## 6. Kế hoạch Khắc phục Kỹ thuật Tối thiểu
Chi tiết kế hoạch sửa đổi 4 giai đoạn, trách nhiệm từng file, cơ chế giải phóng concurrency và bảo toàn bất biến nghiệp vụ được lưu tại [Mục 4 của docs/ai-review/navigation-routing-remediation-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/navigation-routing-remediation-plan.md#4-k%E1%BA%BF-ho%E1%BA%A1ch-kh%E1%BA%AFc-ph%E1%BB%A5c-t%E1%BB%91i-thi%E1%BB%83u-remediation-plan):
- **Giai đoạn 1**: Sửa Backend Session: Bổ sung `action === 'RESUME'` vào điều kiện `preserve` để bảo toàn `targetStopId`.
- **Giai đoạn 2**: Sửa Mobile Navigation Engine: Tháo gỡ race condition trong `prepare()`, giải phóng `routeBusy` an toàn trong `finally`, đồng bộ `travelled = progress` khi chuyển mode.
- **Giai đoạn 3**: Sửa UX Bản đồ & Leaflet: Ẩn planned polyline ngay khi chuyến `IN_PROGRESS`, hiển thị trạng thái đang tải, chia hai màu xám/xanh liền mạch.
- **Giai đoạn 4**: Phân loại và hiển thị lỗi routing có kiểm soát.

---

## 7. Wireframes Trải nghiệm Người dùng (Dạng Chữ)
Đã thiết kế 3 wireframe dạng chữ chuẩn mực tại [Mục 5 của docs/ai-review/navigation-routing-remediation-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/navigation-routing-remediation-plan.md#5-wireframes-tr%E1%BA%A3i-nghi%E1%BB%87m-ng%C6%B0%E1%BB%9Di-d%C3%B9ng-d%E1%BA%A1ng-ch%E1%BB%AF):
- **Wireframe 1**: Khi Chuyến Xe Vừa Bắt đầu — Đang Tải Tuyến VietMap (Chờ Route).
- **Wireframe 2**: Navigation Hoạt động Bình thường — Hai Màu Tuyến & Chỉ dẫn Rẽ (TBT).
- **Wireframe 3**: Xe Lệch Tuyến trong Manual — Reroute Thời gian Thực.

---

## 8. Kế hoạch Kiểm chứng Kỹ thuật & Test Data Policy
- **Test Data Policy**: Tuân thủ tuyệt đối không tạo dữ liệu test giả, không chạy seed, không sửa bản ghi thật.
- **Kế hoạch Unit Tests**:
  1. Test Session `RESUME` giữ nguyên `targetStopId` dở dang.
  2. Test `prepare()` không bị silent exit khi `canPublish` chưa kịp cập nhật.
  3. Test `routeBusy` được reset khi generation thay đổi giữa request.
  4. Test chuyển đổi Manual sang Auto giữ nguyên tọa độ và tiến độ `travelled`.
  5. Test `hidePlanned` kích hoạt ngay khi trip `IN_PROGRESS`.
- **Static Checks**: `npx tsc --noEmit` trên cả 3 project (`api`, `web`, `mobile`) và 118 unit tests hiện có.

---

## 9. Phân định Rõ Trạng thái Xác minh
- **Phân tích nguyên nhân trong Source**: **CONFIRMED_BY_SOURCE** (Đã chỉ rõ từng dòng code, biến trạng thái và chuỗi sự kiện gây lỗi).
- **Runtime Testing trên thiết bị**: **NOT_VERIFIED** / **BLOCKED_BY_TEST_DATA_POLICY** (Chưa triển khai code sửa lỗi trong phiên này; chờ PO duyệt kế hoạch).

---

## 10. Đánh giá Rủi ro & Biện pháp Phòng ngừa
- **Rủi ro hồi quy Manual (Joystick)**: Đã được PO xác nhận hoạt động ổn định; toàn bộ thuật toán xung chạm ngắn, bearing và delta-time được giữ nguyên 100%.
- **Rủi ro giật lùi vị trí xe**: Đã xác định rõ nguyên nhân do `latestPosition` cũ từ server và biến `travelled = 0`; biện pháp khắc phục giữ nguyên tọa độ xe hiện tại sẽ loại bỏ hoàn toàn hiện tượng này.

---

## 11. Bàn giao & File Artifacts
- **Kế hoạch chi tiết đầy đủ**: [docs/ai-review/navigation-routing-remediation-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/navigation-routing-remediation-plan.md)
- **Báo cáo AI Review**: [docs/ai-review/LATEST.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.md)
- **Diff task**: [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff) (Xác nhận 0 dòng thay đổi application code).
- **Báo cáo phiên trước**: [docs/ai-review/history/2026-10-26-0030-fix-routing-auto-navigation-ux.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/history/2026-10-26-0030-fix-routing-auto-navigation-ux.md)

---

## 12. Đề xuất Bước tiếp theo Duy nhất
Product Owner xem xét và phê duyệt kế hoạch khắc phục tại [docs/ai-review/navigation-routing-remediation-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/navigation-routing-remediation-plan.md) để Agent bắt đầu triển khai code theo 4 giai đoạn đã đề ra.

---

## 13. Cam kết Dừng lại (STOP-AFTER-TASK Commitment)
Agent tuân thủ nghiêm ngặt nguyên tắc **PLANNING ONLY / STOP-AFTER-TASK**: Không tự ý sửa code khi chưa có sự phê duyệt chính thức từ Product Owner.
