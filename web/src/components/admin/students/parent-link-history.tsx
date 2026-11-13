import { operationAuditItems } from '@/lib/web-api-integration';
export function ParentLinkHistory({ audit }: { audit: unknown }) {
  const entries = operationAuditItems(audit).filter(item => item.action === 'REVOKED');
  if (!entries.length) return null;
  return <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-semibold">Lịch sử liên kết phụ huynh ({entries.length})</summary>
    <ul className="mt-3 max-h-64 overflow-y-auto space-y-3">{entries.slice().reverse().map((item, index) => <li key={index} className="border-t pt-2 text-sm">
      <strong>Thu hồi liên kết</strong>{item.occurredAt && Number.isFinite(Date.parse(item.occurredAt)) && <time className="ml-2 text-xs text-slate-500">{new Date(item.occurredAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time>}
      {item.reason && <p>{item.reason}</p>}
    </li>)}</ul></details>;
}
