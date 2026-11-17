'use client';

import { useEffect, useState, useId } from 'react';
import type { Role } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { lifecycleError, lifecycleReason, type ServiceCalendarEntry } from '@/lib/school-lifecycle';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { ContextLink } from '@/components/admin/common/context-navigation';
import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { ServiceCalendarForm } from './service-calendar-form';
import { toast } from '@/stores/toast-store';
import { calendarMatches, calendarOccurrence } from '@/lib/service-calendar';
import { vietnamDate } from '@/lib/school-lifecycle';
import { RefreshCw } from 'lucide-react';

const statuses: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy', BLOCKED: 'Bị chặn' };
type ServiceCalendarFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'BLOCKED';

export function ServiceCalendarPanel({
  schoolId,
  role,
  onUpdated,
  operatorOnly = false,
  contractStartDate,
  contractEndDate,
  isSchoolActive,
}: {
  schoolId?: string;
  role: Role | null;
  onUpdated?: () => void;
  operatorOnly?: boolean;
  contractStartDate?: string;
  contractEndDate?: string;
  isSchoolActive?: boolean;
}) {
  const [rows, setRows] = useState<ServiceCalendarEntry[]>([]);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [creating, setCreating] = useState(false);
  const [action, setAction] = useState<{ row: ServiceCalendarEntry; type: 'APPROVED' | 'REJECTED' | 'CANCEL' } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<ServiceCalendarFilter>('ALL');
  const statusFilterId = useId();

  const allowed = role === 'SYSTEM_ADMIN' || (role === 'SCHOOL_ADMIN' && Boolean(schoolId));

  useEffect(() => {
    if (!allowed) return;
    let current = true;
    apiClient.getServiceCalendar(schoolId).then(data => { if (current) { setRows(data); setError(''); } })
      .catch(value => { if (current) setError(lifecycleError(value)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [schoolId, allowed, revision]);

  const reload = () => { setRevision(value => value + 1); onUpdated?.(); };

  const run = async () => {
    if (!action || busy || !allowed) return;
    if (action.type === 'REJECTED' && !reason.trim()) { setActionError('Vui lòng nhập lý do từ chối.'); return; }
    setBusy(true); setActionError('');
    try {
      if (action.type === 'CANCEL') await apiClient.cancelServiceCalendar(action.row.id);
      else await apiClient.decideServiceCalendar(action.row.id, { status: action.type, ...(reason.trim() ? { reason: reason.trim() } : {}) });
      toast.success('Đã cập nhật lịch dịch vụ.'); setAction(null); reload();
    } catch (value) { setActionError(lifecycleError(value)); setRevision(value => value + 1); }
    finally { setBusy(false); }
  };

  if (!allowed) return null;

  const scopedRows = rows.filter(row => !operatorOnly || !row.schoolId);
  const pendingCount = scopedRows.filter(row => row.status === 'PENDING').length;
  const visible = scopedRows.filter(row => {
    if (operatorOnly) return filter === 'ALL' || row.status === 'PENDING';
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return row.status === 'PENDING';
    const effective = row.effectiveStatus ?? row.status;
    return effective === filter;
  });

  // Preserve original layout for Settings -> Lịch nghỉ nhà xe
  if (operatorOnly) {
    return (
      <section className="lifecycle-panel" aria-label="Lịch nghỉ nhà xe">
        <div className="lifecycle-panel-heading">
          <h2>Lịch nghỉ nhà xe</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setFilter(value => value === 'ALL' ? 'PENDING' : 'ALL')}>
              {filter === 'ALL' ? 'Chỉ chờ duyệt' : 'Tất cả lịch'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setRevision(value => value + 1)}>
              Làm mới
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => setCreating(true)}>
              Thêm ngày nghỉ nhà xe
            </Button>
          </div>
        </div>
        {error && <p className="lifecycle-error" role="alert">{error}</p>}
        {loading ? (
          <p role="status" className="text-sm text-slate-500">Đang tải lịch…</p>
        ) : !visible.length && !error ? (
          <p className="text-sm text-slate-500">{filter === 'PENDING' ? 'Không có yêu cầu chờ duyệt' : 'Chưa có lịch nghỉ nhà xe'}</p>
        ) : (
          <div className="lifecycle-records">
            {visible.map(row => {
              const status = row.effectiveStatus ?? row.status;
              const occurrence = row.year ? calendarOccurrence(row, row.year) : null;
              const canCancel = row.kind === 'HOLIDAY' && row.status === 'APPROVED' && (row.recurrence === 'ANNUAL' ? !calendarMatches(row, vietnamDate()) : Boolean(occurrence && occurrence > vietnamDate())) && (role === 'SYSTEM_ADMIN' || row.schoolId === schoolId);
              return (
                <article className="lifecycle-record" key={row.id}>
                  <div>
                    <strong>{row.title}</strong>
                    <small>{row.kind === 'MAKEUP' ? 'Học bù' : 'Ngày nghỉ'} · {row.schoolId ? 'Lịch trường' : 'Toàn bộ nhà xe'}</small>
                    <small>
                      {String(row.day).padStart(2, '0')}/{String(row.month).padStart(2, '0')}{row.year ? `/${row.year}` : ' · Hằng năm'}
                      {row.calendar === 'LUNAR' ? ` · Âm lịch${row.leapMonth ? ' · Tháng nhuận' : ''}` : ' · Dương lịch'}
                      {row.startTime && row.endTime ? ` · ${row.startTime}–${row.endTime}` : ''}
                    </small>
                    {row.effectiveStatusReason && <small>{lifecycleReason(row.effectiveStatusReason)}</small>}
                    {row.reason && <small>Lý do: {row.reason}</small>}
                  </div>
                  <div className="lifecycle-record-actions">
                    <span className="lifecycle-status" data-pending={status === 'PENDING' || status === 'BLOCKED'}>{statuses[status]}</span>
                    {canCancel && (
                      <Button type="button" variant="outline" size="sm" onClick={() => { setReason(''); setActionError(''); setAction({ row, type: 'CANCEL' }); }}>
                        Hủy ngày nghỉ
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {creating && (
          <ServiceCalendarForm
            canRequestMakeup={false}
            existingEntries={rows}
            contractStartDate={contractStartDate}
            contractEndDate={contractEndDate}
            isSchoolActive={isSchoolActive}
            onClose={() => setCreating(false)}
            onSaved={() => {
              setCreating(false);
              toast.success('Đã lưu ngày nghỉ.');
              reload();
            }}
          />
        )}
        <LifecycleDialog
          open={Boolean(action)}
          title="Hủy ngày nghỉ?"
          busy={busy}
          onClose={() => setAction(null)}
          footer={
            <>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setAction(null)}>Quay lại</Button>
              <Button type="button" variant="danger" disabled={busy} onClick={run}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</Button>
            </>
          }
        >
          <div className="lifecycle-fields">
            <strong>{action?.row.title}</strong>
            <p className="lifecycle-notice">Hệ thống kiểm tra ngày hiệu lực và xung đột khi xác nhận. Hủy ngày nghỉ không tự phục hồi chuyến đã hủy.</p>
            {actionError && <p className="lifecycle-error" role="alert">{actionError}</p>}
          </div>
        </LifecycleDialog>
      </section>
    );
  }

  // School context: Redesigned layout with table and mobile cards
  return (
    <section className="lifecycle-panel" aria-label="Lịch nghỉ và học bù">
      <div className="operating-calendar-toolbar">
        <div className="operating-calendar-status-filter">
          <label htmlFor={statusFilterId} className="operating-calendar-status-label">
            Trạng thái
          </label>
          <Select
            id={statusFilterId}
            aria-label="Trạng thái"
            value={filter}
            onChange={e => setFilter(e.target.value as ServiceCalendarFilter)}
            className="operating-calendar-status-select"
          >
            <option value="ALL">Tất cả</option>
            <option value="PENDING">{pendingCount > 0 ? `Chờ duyệt (${pendingCount})` : 'Chờ duyệt'}</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Đã từ chối</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="BLOCKED">Bị chặn</option>
          </Select>
        </div>
        <div className="operating-calendar-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reload}
            disabled={loading}
            aria-label="Làm mới"
            title="Làm mới"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={() => setCreating(true)}>
            {role === 'SCHOOL_ADMIN' ? 'Thêm ngày nghỉ / học bù' : 'Thêm ngày nghỉ'}
          </Button>
        </div>
      </div>

      {error && <p className="lifecycle-error" role="alert">{error}</p>}

      {loading ? (
        <p role="status" className="text-sm text-slate-500 py-4">Đang tải lịch…</p>
      ) : !visible.length && !error ? (
        <p className="text-sm text-slate-500 py-6 text-center">
          {filter === 'ALL'
            ? (schoolId ? 'Chưa có lịch nghỉ hoặc học bù.' : 'Chưa có lịch nghỉ nhà xe.')
            : filter === 'PENDING'
              ? 'Không có yêu cầu chờ duyệt.'
              : `Không có bản ghi ở trạng thái "${statuses[filter] || filter}".`}
        </p>
      ) : (
        <>
          {/* Desktop & Tablet Table */}
          <div className="operating-calendar-table-container">
            <table className="operating-calendar-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Ngày</th>
                  <th style={{ width: '35%' }}>Nội dung</th>
                  <th style={{ width: '12%' }}>Giờ bắt đầu</th>
                  <th style={{ width: '12%' }}>Giờ kết thúc</th>
                  <th style={{ width: '13%' }}>Trạng thái</th>
                  <th style={{ width: '13%', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(row => {
                  const status = row.effectiveStatus ?? row.status;
                  const occurrence = row.year ? calendarOccurrence(row, row.year) : null;
                  const canCancel = row.kind === 'HOLIDAY' && row.status === 'APPROVED' && (row.recurrence === 'ANNUAL' ? !calendarMatches(row, vietnamDate()) : Boolean(occurrence && occurrence > vietnamDate())) && (role === 'SYSTEM_ADMIN' || row.schoolId === schoolId);
                  const isMakeup = row.kind === 'MAKEUP';

                  return (
                    <tr key={row.id}>
                      <td>
                        <span className="font-medium text-slate-900">
                          {String(row.day).padStart(2, '0')}/{String(row.month).padStart(2, '0')}{row.year ? `/${row.year}` : ''}
                        </span>
                        {!row.year && <span className="text-xs text-slate-500 block">Hằng năm</span>}
                        {row.calendar === 'LUNAR' && (
                          <span className="text-xs text-amber-700 block">
                            Âm lịch{row.leapMonth ? ' (nhuận)' : ''}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="font-semibold text-slate-900">{row.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {isMakeup ? 'Học bù' : 'Ngày nghỉ'} · {row.schoolId ? 'Lịch trường' : 'Toàn bộ nhà xe'}
                        </div>
                        {row.effectiveStatusReason && (
                          <div className="text-xs text-amber-700 mt-0.5">{lifecycleReason(row.effectiveStatusReason)}</div>
                        )}
                        {row.reason && (
                          <div className="text-xs text-slate-500 mt-0.5">Lý do: {row.reason}</div>
                        )}
                        {role === 'SYSTEM_ADMIN' && row.schoolId && !schoolId && (
                          <ContextLink className="text-xs text-blue-700 mt-0.5 inline-block" href={`/admin/calendar?schoolId=${row.schoolId}`}>
                            Xem lịch trường
                          </ContextLink>
                        )}
                      </td>
                      {isMakeup ? (
                        <>
                          <td className="font-semibold text-slate-800">{row.startTime || '—'}</td>
                          <td className="font-semibold text-slate-800">{row.endTime || '—'}</td>
                        </>
                      ) : (
                        <td colSpan={2} className="operating-calendar-allday-cell text-slate-500 font-medium">
                          Cả ngày
                        </td>
                      )}
                      <td>
                        <span className="lifecycle-status" data-pending={status === 'PENDING' || status === 'BLOCKED'}>
                          {statuses[status] || status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {role === 'SYSTEM_ADMIN' && isMakeup && row.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() => { setReason(''); setActionError(''); setAction({ row, type: 'APPROVED' }); }}
                            >
                              Duyệt
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => { setReason(''); setActionError(''); setAction({ row, type: 'REJECTED' }); }}
                            >
                              Từ chối
                            </Button>
                          </div>
                        )}
                        {canCancel && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => { setReason(''); setActionError(''); setAction({ row, type: 'CANCEL' }); }}
                          >
                            Hủy ngày nghỉ
                          </Button>
                        )}
                        {!((role === 'SYSTEM_ADMIN' && isMakeup && row.status === 'PENDING') || canCancel) && (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="operating-calendar-cards">
            {visible.map(row => {
              const status = row.effectiveStatus ?? row.status;
              const occurrence = row.year ? calendarOccurrence(row, row.year) : null;
              const canCancel = row.kind === 'HOLIDAY' && row.status === 'APPROVED' && (row.recurrence === 'ANNUAL' ? !calendarMatches(row, vietnamDate()) : Boolean(occurrence && occurrence > vietnamDate())) && (role === 'SYSTEM_ADMIN' || row.schoolId === schoolId);
              const isMakeup = row.kind === 'MAKEUP';

              return (
                <article className="operating-calendar-card" key={row.id}>
                  <div className="operating-calendar-card-header">
                    <div>
                      <div className="font-semibold text-slate-900">{row.title}</div>
                      <div className="text-xs text-slate-500">
                        {isMakeup ? 'Học bù' : 'Ngày nghỉ'} · {row.schoolId ? 'Lịch trường' : 'Toàn bộ nhà xe'}
                      </div>
                    </div>
                    <span className="lifecycle-status" data-pending={status === 'PENDING' || status === 'BLOCKED'}>
                      {statuses[status] || status}
                    </span>
                  </div>
                  <div className="operating-calendar-card-body">
                    <div className="operating-calendar-card-row">
                      <span className="operating-calendar-card-label">Ngày:</span>
                      <span className="font-medium text-slate-900">
                        {String(row.day).padStart(2, '0')}/{String(row.month).padStart(2, '0')}{row.year ? `/${row.year}` : ' · Hằng năm'}
                        {row.calendar === 'LUNAR' ? ` (Âm lịch${row.leapMonth ? ' · Tháng nhuận' : ''})` : ''}
                      </span>
                    </div>
                    <div className="operating-calendar-card-row">
                      <span className="operating-calendar-card-label">Thời gian:</span>
                      {isMakeup ? (
                        <span>
                          Bắt đầu: <strong className="font-semibold text-slate-800">{row.startTime || '—'}</strong> · Kết thúc: <strong className="font-semibold text-slate-800">{row.endTime || '—'}</strong>
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium italic">Cả ngày</span>
                      )}
                    </div>
                    {row.effectiveStatusReason && (
                      <div className="text-xs text-amber-700">{lifecycleReason(row.effectiveStatusReason)}</div>
                    )}
                    {row.reason && (
                      <div className="text-xs text-slate-500">Lý do: {row.reason}</div>
                    )}
                    {role === 'SYSTEM_ADMIN' && row.schoolId && !schoolId && (
                      <div>
                        <ContextLink className="text-xs text-blue-700" href={`/admin/calendar?schoolId=${row.schoolId}`}>
                          Xem lịch trường
                        </ContextLink>
                      </div>
                    )}
                  </div>
                  {((role === 'SYSTEM_ADMIN' && isMakeup && row.status === 'PENDING') || canCancel) && (
                    <div className="operating-calendar-card-actions">
                      {role === 'SYSTEM_ADMIN' && isMakeup && row.status === 'PENDING' && (
                        <>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => { setReason(''); setActionError(''); setAction({ row, type: 'APPROVED' }); }}
                          >
                            Duyệt
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => { setReason(''); setActionError(''); setAction({ row, type: 'REJECTED' }); }}
                          >
                            Từ chối
                          </Button>
                        </>
                      )}
                      {canCancel && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => { setReason(''); setActionError(''); setAction({ row, type: 'CANCEL' }); }}
                        >
                          Hủy ngày nghỉ
                        </Button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      {creating && (
        <ServiceCalendarForm
          schoolId={schoolId}
          canRequestMakeup={role === 'SCHOOL_ADMIN'}
          existingEntries={rows}
          contractStartDate={contractStartDate}
          contractEndDate={contractEndDate}
          isSchoolActive={isSchoolActive}
          onClose={() => setCreating(false)}
          onSaved={(kind?: 'HOLIDAY' | 'MAKEUP') => {
            setCreating(false);
            toast.success(kind === 'MAKEUP' ? 'Đã gửi đề nghị học bù.' : 'Đã lưu ngày nghỉ.');
            reload();
          }}
        />
      )}

      <LifecycleDialog
        open={Boolean(action)}
        title={action?.type === 'CANCEL' ? 'Hủy ngày nghỉ?' : action?.type === 'REJECTED' ? 'Từ chối học bù?' : 'Duyệt học bù?'}
        busy={busy}
        onClose={() => setAction(null)}
        footer={
          <>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setAction(null)}>Quay lại</Button>
            <Button type="button" variant={action?.type === 'APPROVED' ? 'primary' : 'danger'} disabled={busy} onClick={run}>
              {busy ? 'Đang xử lý…' : 'Xác nhận'}
            </Button>
          </>
        }
      >
        <div className="lifecycle-fields">
          <strong>{action?.row.title}</strong>
          <p className="lifecycle-notice">Hệ thống kiểm tra ngày hiệu lực và xung đột khi xác nhận. Hủy ngày nghỉ không tự phục hồi chuyến đã hủy.</p>
          {action?.type !== 'CANCEL' && (
            <label>
              Lý do {action?.type === 'REJECTED' ? '*' : '(tùy chọn)'}
              <Textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={500} disabled={busy} />
            </label>
          )}
          {actionError && <p className="lifecycle-error" role="alert">{actionError}</p>}
        </div>
      </LifecycleDialog>
    </section>
  );
}
