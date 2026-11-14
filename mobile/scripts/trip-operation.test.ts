import assert from "node:assert/strict";
import { test } from "node:test";
import { canCancelAllAbsent, canCorrectAttendance, tripBlockLabel } from "../utils/trip-operation.ts";
import { incidentStatusLabel } from "../utils/trip-incident-label.ts";
import type { OperationalStateResponse, TripAttendanceStudentItem } from "../services/api-client";

const ready: OperationalStateResponse = { tripId: "trip", status: "SCHEDULED", isAttendantReady: true };
const absent: TripAttendanceStudentItem = {
  studentId: "student", studentCode: "", fullName: "", stopOrder: 1, addressText: "",
  status: "ABSENT", absenceReason: "Đã báo nghỉ",
};

test("hủy toàn vắng chỉ khả dụng cho chiều về đã Ready với danh sách hợp lệ", () => {
  assert.equal(canCancelAllAbsent("TO_PARKING", ready, [absent]), true);
  assert.equal(canCancelAllAbsent("TO_SCHOOL", ready, [absent]), false);
  assert.equal(canCancelAllAbsent("TO_PARKING", { ...ready, isAttendantReady: false }, [absent]), false);
  assert.equal(canCancelAllAbsent("TO_PARKING", { ...ready, status: "IN_PROGRESS" }, [absent]), false);
  assert.equal(canCancelAllAbsent("TO_PARKING", { ...ready, actualStartTime: "2026-11-12T00:00:00Z" }, [absent]), false);
  assert.equal(canCancelAllAbsent("TO_PARKING", ready, []), false);
  assert.equal(canCancelAllAbsent("TO_PARKING", ready, [absent, { ...absent, status: "PRESENT" }]), false);
  assert.equal(canCancelAllAbsent("TO_PARKING", ready, [{ ...absent, absenceReason: " " }]), false);
  assert.equal(canCancelAllAbsent("TO_PARKING", ready, [{ ...absent, isAlighted: true }]), false);
});

test("đính chính chỉ mở sau khi đến trường và trước khi học sinh xuống xe", () => {
  const arrived: OperationalStateResponse = { ...ready, status: "IN_PROGRESS", isSchoolArrived: true };
  assert.equal(canCorrectAttendance("TO_SCHOOL", arrived, absent), true);
  assert.equal(canCorrectAttendance("TO_PARKING", arrived, absent), false);
  assert.equal(canCorrectAttendance("TO_SCHOOL", { ...arrived, isSchoolArrived: false }, absent), false);
  assert.equal(canCorrectAttendance("TO_SCHOOL", { ...arrived, status: "COMPLETED" }, absent), false);
  assert.equal(canCorrectAttendance("TO_SCHOOL", arrived, { ...absent, isAlighted: true }), false);
});

test("lý do khóa và trạng thái sự cố phản ánh nghiệp vụ hiện tại", () => {
  assert.equal(tripBlockLabel("ATTENDANT_REPORTED_MISSING"), "Đang xử lý báo thiếu phụ xe");
  assert.equal(tripBlockLabel("ALL_STUDENTS_ABSENT"), "Tất cả học sinh vắng");
  assert.equal(incidentStatusLabel({ type: "TRAFFIC_DELAY", status: "WAITING_ASSIGNMENT" }), "Chờ xử lý");
  assert.equal(incidentStatusLabel({ type: "DRIVER_MISSING", status: "WAITING_ASSIGNMENT" }), "Chờ phân công");
  assert.equal(incidentStatusLabel({ type: "GPS_SIGNAL_LOST", status: "CLOSED", resolution: { action: "CLOSED_BY_ADMIN" } }), "Đã đóng");
  assert.equal(incidentStatusLabel({ type: "LATE_STOP", status: "CLOSED", resolution: { action: "CLOSED_WITHOUT_CONFIRMATION" } }), "Đóng tự động");
});
