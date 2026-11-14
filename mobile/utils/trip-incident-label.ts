import type { TripIncident, TripIncidentType } from "../services/api-client";

export const incidentTypeLabels: Record<TripIncidentType, string> = {
  ATTENDANT_MISSING: "Vắng phụ xe",
  DRIVER_MISSING: "Vắng tài xế",
  OFF_ROUTE: "Lệch tuyến",
  LATE_STOP: "Trễ đón/trả",
  TRAFFIC_DELAY: "Tắc đường",
  GPS_SIGNAL_LOST: "Mất GPS",
  NO_GUARDIAN_AT_STOP: "Không có người đón",
};

export function incidentStatusLabel(incident: Pick<TripIncident, "type" | "status" | "resolutionType" | "resolution">) {
  switch (incident.status) {
    case "WAITING_ASSIGNMENT":
      return incident.type === "ATTENDANT_MISSING" || incident.type === "DRIVER_MISSING"
        ? "Chờ phân công" : "Chờ xử lý";
    case "WAITING_CONFIRMATION":
    case "PENDING_CONFIRMATION":
      return "Chờ xác nhận";
    case "RESOLVED":
      return "Đã giải quyết";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "CLOSED":
      return incident.resolutionType === "CLOSED_WITHOUT_CONFIRMATION" ||
        incident.resolution?.action === "CLOSED_WITHOUT_CONFIRMATION" ? "Đóng tự động" : "Đã đóng";
    case "CLOSED_WITHOUT_CONFIRMATION":
      return "Đóng tự động";
    default:
      return incident.status;
  }
}
