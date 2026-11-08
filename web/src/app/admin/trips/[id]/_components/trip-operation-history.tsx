import { operationAuditItems } from '@/lib/web-api-integration';
import type { TripDetail } from '@/lib/types';
export function TripOperationHistory({ trip }: { trip: TripDetail }) {
  const items = operationAuditItems(trip.operationAudit);
  if (!items.length) return null;
  const names: Record<string, string> = { REOPENED: 'Mở lại chuyến', CANCEL_ALL_ABSENT: 'Hủy do học sinh vắng', ATTENDANCE_CORRECTION: 'Đính chính điểm danh' };
  return <section aria-label="Lịch sử xử lý" className="mt-3 text-sm">
    <h3 className="font-semibold">Lịch sử xử lý</h3>
    <ul className="mt-2 max-h-48 overflow-y-auto space-y-2">{items.slice().reverse().map((item, index) => <li key={index} className="border-t border-slate-100 py-2">
      <strong>{names[item.action] || 'Cập nhật vận hành'}</strong>
      {item.occurredAt && Number.isFinite(Date.parse(item.occurredAt)) && <span className="text-xs text-slate-500"> · {new Date(item.occurredAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>}
      {item.reason && <p>{item.reason}</p>}
      {item.actorId && <p className="text-xs text-slate-500" title={item.actorId}>Người thực hiện: {item.actorId === trip.driverId ? trip.driverName : item.actorId === trip.busAttendantId ? trip.busAttendantName : 'Mã ' + item.actorId.slice(0, 8)}</p>}
    </li>)}</ul>
  </section>;
}
