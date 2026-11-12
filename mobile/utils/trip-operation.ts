import type { OperationalStateResponse, TripAttendanceStudentItem } from "../services/api-client";

export function canCorrectAttendance(
  direction: OperationalStateResponse["direction"],
  state: OperationalStateResponse | null,
  student: TripAttendanceStudentItem,
) {
  return direction === "TO_SCHOOL" && state?.status === "IN_PROGRESS" &&
    state.isSchoolArrived === true && !student.isAlighted && !student.alightedAt;
}

export function canCancelAllAbsent(
  direction: OperationalStateResponse["direction"],
  state: OperationalStateResponse | null,
  roster: TripAttendanceStudentItem[],
) {
  return direction === "TO_PARKING" && state?.status === "SCHEDULED" &&
    state.isAttendantReady === true && !state.actualStartTime && roster.length > 0 &&
    roster.every((student) => student.status === "ABSENT" && student.absenceReason?.trim() &&
      !student.isAlighted && !student.alightedAt);
}

const blockLabels: Readonly<Record<string, string>> = {
  WAITING_ASSIGNMENT: "Đang chờ phân công lại",
  ABSENT_REASON_REQUIRED: "Có học sinh vắng chưa có lý do",
  ALL_STUDENTS_ABSENT: "Tất cả học sinh vắng",
  ATTENDANT_ON_LEAVE: "Có báo nghỉ đang chờ xử lý",
  ATTENDANT_REPORTED_MISSING: "Đang xử lý báo thiếu phụ xe",
  MISSING_SCHEDULE_TIMES: "Chuyến chưa có giờ chạy",
  SCHEDULED_END_TIME_EXCEEDED: "Đã quá giờ kết thúc dự kiến",
  PARKING_REOPTIMIZATION_REQUIRED: "Chờ cập nhật tuyến theo bãi xe mới",
  ADMIN_FINALIZATION_PENDING: "Chờ quản trị chốt chuyến",
  CONTRACT_EXPIRED: "Hợp đồng đưa đón đã hết hạn",
  SCHOOL_INACTIVE: "Trường đã ngừng dịch vụ",
  LOCATION_CHANGED: "Trường đã đổi địa điểm",
  HOLIDAY: "Ngày nghỉ đưa đón",
};

export function tripBlockLabel(reason?: string | null) {
  return reason ? blockLabels[reason] : undefined;
}
