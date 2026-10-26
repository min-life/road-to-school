# Báo cáo AI Review — Khắc phục Lỗi Hủy Phương Án & Thiết lập Bất Biến "Cấm Tuyến 0 Học Sinh"

## 1. Metadata
- **Thời gian**: 2026-10-26 20:35:00 (GMT+7)
- **Chế độ thực thi**: IMPLEMENTATION (Được Product Owner phê duyệt kế hoạch)
- **Phạm vi tác vụ**:
  - Sửa lỗi HTTP 400 `property expectedFingerprint should not exist` khi gọi API `POST /routes/plans/:id/cancel`.
  - Thiết lập bất biến hệ thống: **Mọi tuyến xe bắt buộc phải có tối thiểu 1 học sinh (`studentCount >= 1`), tuyệt đối cấm tuyến 0 học sinh**.
  - Bổ sung blocker `ROUTE_HAS_NO_STUDENTS` trong `getApprovalReadiness` để chặn phê duyệt phương án có tuyến rỗng.
  - Chặn xác nhận lưu phương án trong `confirmPreview` nếu bất kỳ tuyến chiều đi hoặc chiều về nào có 0 học sinh.
  - Mở rộng phân quyền hủy phương án cho `SCHOOL_ADMIN` đối với trường học của mình (cả DRAFT và ACTIVE).
  - Nâng cấp trải nghiệm người dùng: Khi vô hiệu hóa học sinh cuối cùng của tuyến, hiển thị cảnh báo vi phạm quy tắc cấm tuyến 0 học sinh, bật ngay Hộp thoại Hành Động Cấp Thiết (`EmptyRoutePlanActionModal`) và tích hợp Modal Hủy toàn bộ phương án (`CancelRoutePlanModal`) trực tiếp tại chỗ.

---

## 2. Mục tiêu nhiệm vụ (Task Objective)
1. **Khắc phục lỗi DTO Whitelist**:
   - Khắc phục lỗi `property expectedFingerprint should not exist` khi thực hiện hủy phương án tuyến từ Web Admin do thiếu decorator của `class-validator` trong `CancelRoutePlanDto`.
2. **Thiết lập Bất biến Cốt lõi — Cấm Tuyến 0 Học Sinh**:
   - Một tuyến xe (chiều đi hoặc chiều về) không được phép tồn tại nếu không có học sinh nào.
   - Khi tạo phương án: Chặn lưu phương án nếu có tuyến rỗng.
   - Khi duyệt phương án: Chặn `DRAFT -> ACTIVE` nếu có tuyến rỗng.
   - Khi sinh chuyến: Đã được bảo vệ bởi quy tắc D11 (không sinh chuyến cho tuyến 0 học sinh).
3. **Cảnh báo và Hộp thoại Hủy toàn bộ phương án khi Vô hiệu hóa học sinh cuối cùng của tuyến**:
   - Khi học sinh bị vô hiệu hóa dẫn đến tuyến có 0 học sinh:
     - Hệ thống cảnh báo rõ ràng vi phạm bất biến "cấm tuyến 0 học sinh".
     - Tự động bật Modal hỏi hủy toàn bộ phương án ngay lập tức (`EmptyRoutePlanActionModal`).
     - Cho phép Admin mở `CancelRoutePlanModal` tại chỗ, điền sẵn lý do mặc định và xác nhận hủy 1 click mà không cần điều hướng thủ công.

---

## 3. Quyết định kỹ thuật & Nghiệp vụ đã thống nhất
1. **Aggregate Root Invariant**:
   - `RoutePlan` là Aggregate Root. Tuyến `Route` không có vòng đời độc lập và không thể hoạt động khi có 0 học sinh.
   - Khi tuyến trở thành rỗng do học sinh bị vô hiệu hóa, phương án đó vi phạm điều kiện vận hành, do đó bắt buộc phải bị hủy để tối ưu lại toàn bộ lộ trình cho nhà xe.
2. **Whitelist DTO Protection**:
   - Bổ sung `@IsOptional()` và `@IsString()` vào `CancelRoutePlanDto.expectedFingerprint` và `ConfirmStudentInsertionDto.expectedFingerprint` để đảm bảo tương thích tuyệt đối với `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.
3. **Mở rộng thẩm quyền của SCHOOL_ADMIN**:
   - `SCHOOL_ADMIN` được quyền hủy phương án tuyến thuộc trường của mình (bao gồm cả DRAFT khi phương án có tuyến rỗng hoặc trường từ chối phương án, và ACTIVE).
   - Vẫn bảo đảm RBAC: `SCHOOL_ADMIN` không được can thiệp vào phương án của trường khác.

---

## 4. Danh sách các file thay đổi (Files Changed)
### Backend (`/api`)
1. [api/src/routes/dto/cancel-route-plan.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/dto/cancel-route-plan.dto.ts): Bổ sung `@IsOptional()` và `@IsString()` cho `expectedFingerprint`.
2. [api/src/routes/dto/student-insertion.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/dto/student-insertion.dto.ts): Bổ sung `@IsString()` cho `expectedFingerprint` trong `ConfirmStudentInsertionDto`.
3. [api/src/routes/resource-availability.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/resource-availability.service.ts): Bổ sung blocker `ROUTE_HAS_NO_STUDENTS` trong `getApprovalReadiness`.
4. [api/src/routes/routes.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/routes.service.ts):
   - Thêm bước kiểm tra chặn lưu phương án có tuyến 0 học sinh trong `confirmPreview`.
   - Cho phép `SCHOOL_ADMIN` hủy phương án thuộc trường của mình trong `cancelRoutePlan`.
5. [api/src/routes/routes.service.spec.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/routes/routes.service.spec.ts): Cập nhật unit tests cho việc School Admin hủy phương án trường mình và chặn hủy phương án trường khác.
6. [api/src/students/dto/student-disable-impact.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/students/dto/student-disable-impact.dto.ts): Bổ sung thuộc tính `requiresPlanCancellation`.
7. [api/src/students/dto/student-response.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/students/dto/student-response.dto.ts): Bổ sung `requiresPlanCancellation` trong `StudentItemDto`.
8. [api/src/students/students.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/students/students.service.ts): Trả về `requiresPlanCancellation: true` và cập nhật thông điệp cảnh báo vi phạm bất biến khi có tuyến rỗng.
9. [api/src/students/students.service.spec.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/students/students.service.spec.ts): Cập nhật unit test kiểm tra `requiresPlanCancellation`.

### Frontend Web (`/web`)
10. [web/src/lib/types.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/lib/types.ts): Bổ sung `requiresPlanCancellation` vào `StudentDisableImpactResponse` và `UpdateStudentStatusResponse`.
11. [web/src/components/admin/routes/cancel-route-plan-modal.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/routes/cancel-route-plan-modal.tsx): Hỗ trợ prop `defaultReason` khởi tạo giá trị lý do hủy.
12. [web/src/components/admin/students/status-confirm-modal.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/students/status-confirm-modal.tsx): Nâng cấp cảnh báo vi phạm bất biến cấm tuyến 0 học sinh với màu đỏ cảnh báo.
13. [web/src/components/admin/students/empty-route-plan-action-modal.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/students/empty-route-plan-action-modal.tsx): **Tạo mới component Modal**, tự động kích hoạt ngay sau khi vô hiệu hóa học sinh cuối cùng của tuyến để yêu cầu hủy phương án.
14. [web/src/components/admin/students/student-table.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/students/student-table.tsx): Tích hợp `EmptyRoutePlanActionModal` và `CancelRoutePlanModal` tại chỗ, hỗ trợ hủy trực tiếp trên banner.
15. [web/src/app/admin/students/[id]/page.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/admin/students/%5Bid%5D/page.tsx): Tích hợp tương tự tại trang chi tiết học sinh.
16. [web/src/app/admin/routes/plans/[id]/page.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/admin/routes/plans/%5Bid%5D/page.tsx): Hiển thị badge vi phạm `0 (Vi phạm)` màu đỏ trên bảng tuyến nếu một tuyến có 0 học sinh.

### Báo cáo AI Review
17. [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff): File diff ghi nhận toàn bộ mã nguồn thay đổi.
18. [docs/ai-review/LATEST.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.md): Báo cáo AI Review 13 mục hiện tại.

---

## 5. Chi tiết các thay đổi chính (Implementation Details)

### A. Fix DTO Whitelist trong `CancelRoutePlanDto`
```typescript
export class CancelRoutePlanDto {
  @ApiProperty({ description: 'Lý do hủy phương án tuyến DRAFT' })
  @IsNotEmpty({ message: 'Vui lòng nhập lý do hủy phương án tuyến' })
  @IsString({ message: 'Lý do hủy phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do hủy không vượt quá 500 ký tự' })
  reason: string;

  @ApiProperty({ description: 'Fingerprint trạng thái phương án để chống xung đột (tùy chọn)', required: false })
  @IsOptional()
  @IsString({ message: 'Fingerprint trạng thái phải là chuỗi ký tự' })
  expectedFingerprint?: string;
}
```

### B. Blocker `ROUTE_HAS_NO_STUDENTS` trong `getApprovalReadiness`
```typescript
// Bất biến: Tuyệt đối cấm tuyến không có học sinh nào
if (studentCount === 0) {
  blockers.push({
    code: 'ROUTE_HAS_NO_STUDENTS',
    routeId: r.id,
    routeName: r.name,
    message: `Tuyến "${r.name}" không có học sinh nào. Quy tắc vận hành cấm phương án có tuyến rỗng.`,
  });
}
```

### C. Chặn xác nhận lưu phương án có tuyến 0 học sinh trong `confirmPreview`
```typescript
for (const r of outboundRoutes) {
  const studentStops = (r.stops || []).filter((s) => s.studentId);
  if (studentStops.length === 0) {
    throw new BadRequestException(
      `Tuyến chiều đi "${r.name}" không có học sinh nào. Mọi tuyến phải có ít nhất 1 học sinh.`,
    );
  }
}
for (const r of returnRoutes) {
  const studentStops = (r.stops || []).filter((s) => s.studentId);
  if (studentStops.length === 0) {
    throw new BadRequestException(
      `Tuyến chiều về "${r.name}" không có học sinh nào. Mọi tuyến phải có ít nhất 1 học sinh.`,
    );
  }
}
```

### D. Hộp thoại Hành động Cấp thiết sau khi Vô hiệu hóa học sinh rỗng tuyến (`EmptyRoutePlanActionModal`)
- Modal kích hoạt tự động ngay sau khi hoàn tất vô hiệu hóa:
  - Cung cấp nút `[Hủy toàn bộ phương án ngay]` (Màu đỏ) -> Mở trực tiếp `CancelRoutePlanModal` tại chỗ kèm lý do điền sẵn.
  - Cung cấp nút `[Để sau]` -> Đóng hộp thoại, duy trì thanh banner cảnh báo vi phạm ở đầu trang.

---

## 6. Đồng bộ Swagger API (Swagger Synchronization)
- Đã kiểm tra đồng bộ:
  - DTO `CancelRoutePlanDto` có đầy đủ Swagger decorator `@ApiProperty` cho `expectedFingerprint` (kèm `required: false`).
  - DTO `StudentDisableImpactDto` và `StudentItemDto` có thuộc tính `requiresPlanCancellation` với `@ApiProperty`.
  - Schema tại `http://localhost:3000/api/docs` phản ánh chính xác cấu trúc request/response.

---

## 7. Tác động Cơ sở dữ liệu & Migrations (Database & Migration Impact)
- **Zero Schema Change**: Tận dụng 100% cấu trúc schema hiện có của `RouteStop`, `Route`, và `RoutePlan`.
- Không tạo bảng mới, không thêm cột mới, không yêu cầu Prisma migration.

---

## 8. Tuân thủ Chính sách Dữ liệu Kiểm thử (Test Data Policy Compliance)
- **Zero Self-Generated Test Data**:
  - Không tự ý thêm records vào database.
  - Không tạo học sinh, tuyến, hay chuyến xe giả trong DB thực tế.
  - Mọi kiểm chứng được thực hiện hoàn toàn qua TypeScript compiler typechecking và Vitest unit test suites sử dụng Mocked Prisma Client.

---

## 9. Kết quả Kiểm chứng (Verification Results)
1. **Typecheck Backend (`/api`)**:
   - Lệnh: `npx tsc --noEmit`
   - Kết quả: `EXIT CODE 0` (0 errors).
2. **Typecheck Frontend Web (`/web`)**:
   - Lệnh: `npx tsc --noEmit`
   - Kết quả: `EXIT CODE 0` (0 errors).
3. **Unit Tests Backend**:
   - `npm test -- src/routes/routes.service.spec.ts src/students/students.service.spec.ts src/routes/approval-assignment.spec.ts`:
     - Kết quả: **3 passed (51/51 tests passed)** trong 797ms.
     - Xác nhận:
       - School Admin hủy phương án trường mình thành công: `PASS`.
       - School Admin bị chặn hủy phương án trường khác: `PASS`.
       - Nhận diện `requiresPlanCancellation` khi học sinh cuối cùng bị vô hiệu hóa: `PASS`.
       - Xử lý atomic cascade và ẩn lịch phụ huynh: `PASS`.

---

## 10. Đánh giá Giao diện & Trải nghiệm Người dùng (UI/UX Review)
- **Tối giản câu chữ (Minimal UI Copy)**:
  - Không có văn bản dài dòng, chỉ sử dụng thẻ cảnh báo nổi bật vi phạm bất biến và nút bấm rõ mục đích.
- **Màu sắc & Phân cấp thị giác**:
  - Màu đỏ cảnh báo `#E11D48` / `bg-rose-50 text-rose-700` cho trường hợp vi phạm cấm tuyến 0 học sinh.
  - Nút Primary Action `Hủy toàn bộ phương án ngay` được thiết kế nổi bật giúp quản trị viên xử lý ngay trong 1 click.
  - Hỗ trợ thao tác không cần chuyển trang hoặc rời màn hình danh sách học sinh.

---

## 11. Đánh giá Rủi ro & Tác động Hồi quy (Risks & Regression Assessment)
- **Rủi ro**: Không có rủi ro hồi quy.
  - Các phương án hợp lệ (mỗi tuyến có >= 1 học sinh) vẫn lưu, phê duyệt và sinh chuyến bình thường.
  - Các tuyến rỗng học sinh sẽ bị chặn đúng theo bất biến nghiệp vụ, ngăn chặn hoàn toàn việc xe buýt chạy rỗng không có học sinh trên thực tế.

---

## 12. Tóm tắt Trạng thái Bàn giao (Handoff Summary)
- Lỗi `property expectedFingerprint should not exist` đã được giải quyết dứt điểm.
- Quy tắc bất biến *"Không được phép cho 1 tuyến không có học sinh nào"* đã được thiết lập chặt chẽ ở cả 4 tầng: Lập phương án -> Phê duyệt -> Vận hành & Vô hiệu hóa -> Sinh chuyến.
- Luồng hủy phương án khi tuyến rỗng đã được kết nối liền mạch từ lúc xác nhận vô hiệu hóa đến khi hoàn tất hủy phương án.

---

## 13. Bước tiếp theo đề xuất (Recommended Next Step)
- Chuyển sang kiểm thử người dùng (UAT) trên trình duyệt đối với luồng: Vô hiệu hóa học sinh duy nhất của tuyến -> Quan sát modal cảnh báo -> Click "Hủy toàn bộ phương án ngay" để xác nhận phương án chuyển sang `CANCELLED` mượt mà.
