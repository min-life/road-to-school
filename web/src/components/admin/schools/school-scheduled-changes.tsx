'use client';

import { useEffect, useState, useId, Fragment } from 'react';
import { apiClient } from '@/lib/api-client';
import { displayDate, lifecycleError, vietnamDate, type SchoolScheduledChange } from '@/lib/school-lifecycle';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { toast } from '@/stores/toast-store';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { DAYS_OF_WEEK } from './weekly-schedule.helper';

const statusLabels: Record<string, string> = {
  PENDING: 'Đã hẹn',
  APPLIED: 'Đã áp dụng',
  CANCELLED: 'Đã hủy',
  FAILED: 'Áp dụng thất bại',
};

const typeLabels: Record<string, string> = {
  INACTIVE: 'Ngừng hoạt động',
  LOCATION: 'Đổi vị trí',
  SCHEDULE: 'Đổi lịch học',
};

const shortDayMap: Record<string, string> = {
  monday: 'T2',
  tuesday: 'T3',
  wednesday: 'T4',
  thursday: 'T5',
  friday: 'T6',
  saturday: 'T7',
  sunday: 'CN',
};

type ScheduledChangeFilter = 'ALL' | 'PENDING' | 'APPLIED' | 'CANCELLED' | 'FAILED';

export function SchoolScheduledChanges({
  schoolId,
  canManage,
  onUpdated,
  onPendingCountChange,
}: {
  schoolId: string;
  canManage: boolean;
  onUpdated?: () => void;
  onPendingCountChange?: (count: number | null) => void;
}) {
  const [rows, setRows] = useState<SchoolScheduledChange[]>([]);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<SchoolScheduledChange | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<ScheduledChangeFilter>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const statusFilterId = useId();

  useEffect(() => {
    let current = true;
    apiClient.getSchoolScheduledChanges(schoolId).then(data => {
      if (current) {
        setRows(data);
        setError('');
        onPendingCountChange?.(data.filter(row => row.status === 'PENDING').length);
      }
    })
      .catch(reason => {
        if (current) {
          setError(lifecycleError(reason));
          onPendingCountChange?.(null);
        }
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [schoolId, revision, onPendingCountChange]);

  const reload = () => {
    setRevision(value => value + 1);
    onUpdated?.();
  };

  const cancel = async () => {
    if (!selected || busy || !canManage) return;
    setBusy(true); setActionError('');
    try {
      await apiClient.cancelSchoolScheduledChange(schoolId, selected.id);
      toast.success('Đã hủy lịch hẹn.');
      setSelected(null);
      setError('');
      onUpdated?.();
    } catch (reason) {
      setActionError(lifecycleError(reason));
    } finally {
      setBusy(false);
      setRevision(value => value + 1);
    }
  };

  const pendingCount = rows.filter(row => row.status === 'PENDING').length;
  const visible = rows.filter(row => {
    if (filter === 'ALL') return true;
    return row.status === filter;
  });

  // Collapse detail if filtered out or removed on reload
  useEffect(() => {
    if (expandedId && !visible.some(r => r.id === expandedId)) {
      setExpandedId(null);
    }
  }, [visible, expandedId]);

  return (
    <section className="lifecycle-panel" aria-label="Thay đổi đã hẹn">
      <div className="operating-calendar-toolbar">
        <div className="operating-calendar-status-filter">
          <label htmlFor={statusFilterId} className="operating-calendar-status-label">
            Trạng thái
          </label>
          <Select
            id={statusFilterId}
            aria-label="Trạng thái"
            value={filter}
            onChange={e => setFilter(e.target.value as ScheduledChangeFilter)}
            className="operating-calendar-status-select"
          >
            <option value="ALL">Tất cả</option>
            <option value="PENDING">{pendingCount > 0 ? `Chờ áp dụng (${pendingCount})` : 'Chờ áp dụng'}</option>
            <option value="APPLIED">Đã áp dụng</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="FAILED">Áp dụng thất bại</option>
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
        </div>
      </div>

      {error && <p className="lifecycle-error" role="alert">{error}</p>}

      {loading ? (
        <p role="status" className="text-sm text-slate-500 py-4">Đang tải lịch hẹn…</p>
      ) : !visible.length && !error ? (
        <p className="text-sm text-slate-500 py-6 text-center">
          {filter === 'ALL'
            ? 'Chưa có thay đổi được hẹn.'
            : filter === 'PENDING'
              ? 'Không có thay đổi chờ áp dụng.'
              : `Không có thay đổi ở trạng thái "${statusLabels[filter] || filter}".`}
        </p>
      ) : (
        <>
          {/* Desktop & Tablet Table (4 columns) */}
          <div className="operating-calendar-table-container">
            <table className="operating-calendar-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Ngày dự kiến</th>
                  <th style={{ width: '38%' }}>Loại thay đổi</th>
                  <th style={{ width: '20%' }}>Trạng thái</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(row => {
                  const isPending = row.status === 'PENDING';
                  const canCancel = canManage && isPending && row.effectiveDate.slice(0, 10) > vietnamDate();
                  const isExpanded = expandedId === row.id;
                  const hasSchedule = row.type === 'SCHEDULE' && Boolean(row.payload.weeklySchedule);
                  const isApplied = row.status === 'APPLIED';
                  const scheduleTitle = isApplied ? 'Lịch học đã áp dụng' : 'Lịch học theo đề xuất';
                  const desktopDetailId = `desktop-scheduled-change-${row.id}-detail`;

                  return (
                    <Fragment key={row.id}>
                      <tr className={isExpanded ? 'operating-calendar-row-expanded' : undefined}>
                        <td>
                          <span className="font-medium text-slate-900">{displayDate(row.effectiveDate)}</span>
                        </td>
                        <td>
                          {hasSchedule ? (
                            <button
                              type="button"
                              className="operating-calendar-expand-trigger"
                              aria-expanded={isExpanded}
                              aria-controls={desktopDetailId}
                              aria-label={
                                isExpanded
                                  ? `Thu gọn lịch học ngày ${displayDate(row.effectiveDate)}`
                                  : `Xem chi tiết lịch học ngày ${displayDate(row.effectiveDate)}`
                              }
                              onClick={() => setExpandedId(curr => (curr === row.id ? null : row.id))}
                            >
                              <span>Đổi lịch học</span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-600" />
                              )}
                            </button>
                          ) : (
                            <span className="font-semibold text-slate-800">{typeLabels[row.type] || row.type}</span>
                          )}
                          {row.type === 'LOCATION' && row.payload.addressText && (
                            <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs" title={row.payload.addressText}>
                              {row.payload.addressText}
                            </div>
                          )}
                          {row.status === 'FAILED' && (
                            <div className="text-xs text-red-600 mt-0.5">
                              {row.lastError || 'Không thể áp dụng. Liên hệ quản trị viên.'}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="lifecycle-status" data-pending={isPending}>
                            {statusLabels[row.status] || row.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {canCancel ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => { setActionError(''); setSelected(row); }}
                            >
                              Hủy lịch hẹn
                            </Button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Inline Expanded Row immediately under parent row */}
                      {hasSchedule && isExpanded && (
                        <tr id={desktopDetailId} className="operating-calendar-expanded-row">
                          <td colSpan={4}>
                            <div className="operating-calendar-schedule-detail">
                              <div className="text-xs font-semibold text-slate-700 mb-2.5">
                                {scheduleTitle} (từ {displayDate(row.effectiveDate)})
                              </div>
                              <table className="operating-calendar-weekly-table">
                                <thead>
                                  <tr>
                                    <th className="row-header">Buổi</th>
                                    {DAYS_OF_WEEK.map(d => (
                                      <th key={d.key}>{shortDayMap[d.key] || d.label}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="row-header">Bắt đầu</td>
                                    {DAYS_OF_WEEK.map(d => {
                                      const s = row.payload.weeklySchedule?.[d.key];
                                      return (
                                        <td key={d.key} className={s ? 'font-semibold text-slate-800' : 'is-off'}>
                                          {s ? s.start : 'Nghỉ'}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                  <tr>
                                    <td className="row-header">Kết thúc</td>
                                    {DAYS_OF_WEEK.map(d => {
                                      const s = row.payload.weeklySchedule?.[d.key];
                                      return (
                                        <td key={d.key} className={s ? 'font-semibold text-slate-800' : 'is-off'}>
                                          {s ? s.end : '—'}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </tbody>
                              </table>
                              {row.status === 'FAILED' && (
                                <p className="mt-2 text-xs text-red-600">
                                  {row.lastError || 'Không thể áp dụng. Liên hệ quản trị viên.'}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="operating-calendar-cards">
            {visible.map(row => {
              const isPending = row.status === 'PENDING';
              const canCancel = canManage && isPending && row.effectiveDate.slice(0, 10) > vietnamDate();
              const isExpanded = expandedId === row.id;
              const hasSchedule = row.type === 'SCHEDULE' && Boolean(row.payload.weeklySchedule);
              const mobileDetailId = `mobile-scheduled-change-${row.id}-detail`;

              return (
                <article className="operating-calendar-card" key={row.id}>
                  <div className="operating-calendar-card-header">
                    <div>
                      {hasSchedule ? (
                        <button
                          type="button"
                          className="operating-calendar-expand-trigger"
                          aria-expanded={isExpanded}
                          aria-controls={mobileDetailId}
                          aria-label={
                            isExpanded
                              ? `Thu gọn lịch học ngày ${displayDate(row.effectiveDate)}`
                              : `Xem chi tiết lịch học ngày ${displayDate(row.effectiveDate)}`
                          }
                          onClick={() => setExpandedId(curr => (curr === row.id ? null : row.id))}
                        >
                          <span>Đổi lịch học</span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      ) : (
                        <div className="font-semibold text-slate-900">{typeLabels[row.type] || row.type}</div>
                      )}
                      <div className="text-xs text-slate-500 mt-0.5">Áp dụng từ {displayDate(row.effectiveDate)}</div>
                    </div>
                    <span className="lifecycle-status" data-pending={isPending}>
                      {statusLabels[row.status] || row.status}
                    </span>
                  </div>

                  <div className="operating-calendar-card-body">
                    {row.type === 'LOCATION' && row.payload.addressText && (
                      <div className="operating-calendar-card-row">
                        <span className="operating-calendar-card-label">Địa chỉ mới:</span>
                        <span className="text-slate-700">{row.payload.addressText}</span>
                      </div>
                    )}

                    {hasSchedule && isExpanded && (
                      <div id={mobileDetailId} className="mt-2 pt-2 border-t border-amber-100">
                        <div className="text-xs font-semibold text-slate-700 mb-2">
                          {row.status === 'APPLIED' ? 'Lịch học đã áp dụng' : 'Lịch học theo đề xuất'}
                        </div>
                        <div className="space-y-1.5">
                          {DAYS_OF_WEEK.map(d => {
                            const s = row.payload.weeklySchedule?.[d.key];
                            return (
                              <div key={d.key} className="flex items-center justify-between text-xs py-1 border-b border-amber-50 last:border-none">
                                <span className="font-medium text-slate-700">{d.label}:</span>
                                {s ? (
                                  <span className="text-slate-800">
                                    Bắt đầu: <strong className="font-semibold">{s.start}</strong> · Kết thúc: <strong className="font-semibold">{s.end}</strong>
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Nghỉ</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {row.status === 'FAILED' && (
                      <div className="text-xs text-red-600 mt-1">
                        {row.lastError || 'Không thể áp dụng. Liên hệ quản trị viên.'}
                      </div>
                    )}
                  </div>

                  {canCancel && (
                    <div className="operating-calendar-card-actions">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setActionError(''); setSelected(row); }}
                      >
                        Hủy lịch hẹn
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      <LifecycleDialog
        open={Boolean(selected)}
        title="Hủy lịch thay đổi?"
        busy={busy}
        onClose={() => setSelected(null)}
        footer={
          <>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setSelected(null)}>Quay lại</Button>
            <Button type="button" variant="danger" disabled={busy} onClick={cancel}>
              {busy ? 'Đang hủy…' : 'Hủy lịch hẹn'}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Hủy lịch {selected ? typeLabels[selected.type].toLowerCase() : ''} ngày {selected ? displayDate(selected.effectiveDate) : ''}. Thao tác này không khôi phục chuyến đã hủy.
        </p>
        {actionError && <p className="lifecycle-error" role="alert">{actionError}</p>}
      </LifecycleDialog>
    </section>
  );
}
