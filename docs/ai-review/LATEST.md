# AI Review — RoadToSchool v2.0
**Phiên làm việc**: 19/11/2026  
**Chế độ**: IMPLEMENTATION & UI/UX REFINEMENT  
**Nhánh Git**: `anhntt/web/systemadminUI`  
**Nhiệm vụ**:
1. Tối ưu hóa UI màn hình Chi tiết Học sinh (`/admin/students/[id]`): Mở rộng không gian hiển thị, chống co ép text/badge, hiển thị thẻ RFID và QR code đẹp mắt.
2. Bổ sung lịch trình chuyến xe vào màn hình Chi tiết Giáo viên (`/admin/teachers/[id]`): Lấp khoảng trống 70%, đồng bộ trải nghiệm với Chi tiết Tài xế.
3. Đồng bộ trải nghiệm Xem chi tiết Phương án tuyến giữa School Admin và System Admin (`/admin/routes/plans/[id]`): Tự động chuyển tab phân công, hiển thị thanh cảnh báo tiến độ phân công, nút "Phân công →" và bộ điều khiển hiển thị đa tuyến trên bản đồ.
4. Bảo toàn nguyên vẹn Backend API (`api/` 100% giữ nguyên, không sửa code hay migration).
5. Đồng bộ asset hình ảnh Mobile authentication và onboarding (.png).

---

### 1. Tóm tắt Thực hiện
- **Chi tiết Học sinh** ([students/[id]/page.tsx](file:///d:/road-to-school/road-to-school/web/src/app/admin/students/[id]/page.tsx)):
  - Nâng `max-w-4xl` lên `max-w-6xl`, khắc phục tình trạng dồn ép không gian.
  - Thêm `whitespace-nowrap shrink-0` cho badge trạng thái `Khả dụng` và nút `Vô hiệu hóa học sinh`.
  - Nâng cấp thẻ RFID ([student-rfid-card.tsx](file:///d:/road-to-school/road-to-school/web/src/components/admin/students/student-rfid-card.tsx)) và hiển thị QR code điểm danh ([qr-code.tsx](file:///d:/road-to-school/road-to-school/web/src/components/common/qr-code.tsx)).
  - Cải tiến phần hiển thị tuyến chưa xếp ([student-routing-section.tsx](file:///d:/road-to-school/road-to-school/web/src/components/admin/students/student-routing-section.tsx)).
- **Chi tiết Giáo viên** ([teachers/[id]/page.tsx](file:///d:/road-to-school/road-to-school/web/src/app/admin/teachers/[id]/page.tsx)):
  - Tạo mới component Lịch trình chuyến xe giáo viên ([teacher-schedule.tsx](file:///d:/road-to-school/road-to-school/web/src/app/admin/teachers/[id]/_components/teacher-schedule.tsx)) tương đồng tài xế.
  - Lọc danh sách chuyến theo `busAttendantId === teacherId` với bộ lọc ngày, bảng chuyến, trạng thái và phân trang.
- **Đồng bộ Workspace Phương án tuyến** ([saved-route-plan-workspace.tsx](file:///d:/road-to-school/road-to-school/web/src/app/admin/routes/plans/[id]/_components/saved-route-plan-workspace.tsx)):
  - Hợp nhất cấu trúc giữa `SCHOOL_ADMIN` và `SYSTEM_ADMIN`.
  - Tự động nhảy sang tab `Phân công` khi phương án còn thiếu phân công (`pendingCount > 0`).
  - Hiển thị badge cảnh báo tiến độ phân công trên header (`Còn X nhóm xe chưa đủ`, `Còn Y nhóm chưa có giáo viên`).
  - Tích hợp nút `Phân công →` hỗ trợ cuộn và focus mượt vào nhóm xe.
  - Tích hợp bộ điều khiển đa tuyến trên bản đồ `RouteMapVisibilityControl` cho cả School Admin.
- **API Clean Reversion**:
  - Toàn bộ thay đổi ở `api/` đã được hoàn nguyên sạch sẽ (0 thay đổi tracked).
- **Mobile Assets**:
  - Chuyển đổi định dạng ảnh onboarding và auth từ `.jpg` sang `.png`, cập nhật imports tương ứng.

---

### 2. Files Thay đổi
- `web/`:
  - `web/src/app/admin/students/[id]/page.tsx`
  - `web/src/components/admin/students/student-rfid-card.tsx`
  - `web/src/components/admin/students/student-routing-section.tsx`
  - `web/src/components/common/qr-code.tsx`
  - `web/src/app/admin/teachers/[id]/page.tsx`
  - `web/src/app/admin/teachers/[id]/_components/teacher-schedule.tsx` (new)
  - `web/src/app/admin/routes/plans/[id]/_components/saved-route-plan-workspace.tsx`
  - `web/src/app/admin/routes/create/page.tsx`
  - `web/src/app/admin/_components/overview-trips.tsx`
  - `web/src/app/admin/page.tsx`
  - `web/src/app/page.tsx`
  - `web/src/lib/types.ts`
- `mobile/`:
  - `mobile/app/(auth)/login.tsx`, `forgot-password.tsx`, `register.tsx`
  - `mobile/components/auth/otp-hero.tsx`, `mobile/components/onboarding/OnboardingCarousel.tsx`
  - `mobile/constants/onboarding.ts`, `mobile/package-lock.json`
  - Image assets in `mobile/assets/images/auth/` và `mobile/assets/images/onboarding/`
- `docs/`:
  - `docs/BUSINESS_POLICIES.md`
  - `docs/ai-review/LATEST.md`
  - `docs/ai-review/LATEST.diff`

---

### 3. Kết quả Verification (Test Data Policy Compliant)
- **Web Typecheck**: `cd web && npx tsc --noEmit` $\rightarrow$ **PASS** (0 lỗi).
- **Mobile Typecheck**: `cd mobile && npx tsc --noEmit` $\rightarrow$ **PASS** (0 lỗi).
- **API Typecheck**: `cd api && npx tsc --noEmit` $\rightarrow$ **PASS** (0 lỗi).
- **API State Verification**: `git status api/` $\rightarrow$ **PASS** (0 tracked changes, API nguyên vẹn).
- **UI Parity**: Trải nghiệm giao diện giữa School Admin và System Admin đã đồng bộ hoàn toàn.
