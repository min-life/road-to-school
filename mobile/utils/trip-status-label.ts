/** Virtual schedules have no persisted TripStatus yet. */
export function getScheduleStatusLabel(status: string, isVirtual = false): string {
  if (isVirtual) return 'Dự kiến';
  switch (status) {
    case 'SCHEDULED': return 'Lập lịch';
    case 'IN_PROGRESS': return 'Đang chạy';
    case 'COMPLETED': return 'Đã hoàn thành';
    case 'CANCELLED': return 'Đã hủy';
    default: return 'Không xác định';
  }
}
