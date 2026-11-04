'use client';

import { useState } from 'react';
import type { TripAttendanceRoster, TripAttendanceStudent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { SpinnerIcon } from '@/components/icons';

function formatTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function TripAttendanceSummary({ data }: { data: TripAttendanceRoster | null }) {
  const metrics = [
    { label: 'Tổng học sinh', value: data?.totalStudents, tone: 'neutral' },
    { label: 'Chưa điểm danh', value: data?.unmarkedCount, tone: 'pending' },
    { label: 'Đã lên xe', value: data?.presentCount, tone: 'present' },
    { label: 'Đã xuống xe', value: data?.alightedCount, tone: 'alighted' },
    { label: 'Vắng', value: data?.absentCount, tone: 'absent' },
  ];
  return <section className="trip-detail-attendance-summary" aria-label="Thống kê điểm danh">{metrics.map(metric => <div key={metric.label} data-tone={metric.tone}>
    <span>{metric.label}</span><strong>{metric.value ?? '—'}</strong>
  </div>)}</section>;
}

type Filter = 'ALL' | 'UNMARKED' | 'PRESENT' | 'ALIGHTED' | 'ABSENT' | 'PENDING_ALIGHT';
export function TripAttendancePanel({ data, error, updatedAt, onRefresh, isRefreshing = false }: {
  data: TripAttendanceRoster | null; error: string | null; updatedAt: string | null; onRefresh: () => void; isRefreshing?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const query = search.trim().toLocaleLowerCase('vi-VN');
  const students = (data?.students ?? []).filter(student => {
    const matches = filter === 'ALL' || (filter === 'ALIGHTED' ? student.status === 'PRESENT' && student.isAlighted
      : filter === 'PENDING_ALIGHT' ? student.status === 'PRESENT' && !student.isAlighted : student.status === filter);
    return matches && (!query || `${student.fullName} ${student.studentCode}`.toLocaleLowerCase('vi-VN').includes(query));
  });
  const totalPages = Math.max(1, Math.ceil(students.length / limit));
  const currentPage = Math.min(page, totalPages);
  return <div className="trip-detail-attendance-panel">
    <div className="trip-detail-roster-toolbar"><span>{updatedAt ? `Cập nhật ${formatTime(updatedAt)}` : 'Điểm danh học sinh'}</span><Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} aria-busy={isRefreshing}>{isRefreshing && <SpinnerIcon className="w-4 h-4 animate-spin" aria-hidden="true" />}{isRefreshing ? 'Đang tải' : 'Làm mới'}</Button></div>
    {error && <div role="alert" className="trip-detail-error">{error}{data && <span>Đang hiển thị dữ liệu lần tải trước.</span>}<Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>Thử lại</Button></div>}
    <div className="trip-detail-roster-filters">
      <label><span className="sr-only">Tìm học sinh</span><Input type="search" placeholder="Tìm tên hoặc mã học sinh…" disabled={!data} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
      <label><span className="sr-only">Trạng thái điểm danh</span><Select value={filter} disabled={!data} onChange={event => { setFilter(event.target.value as Filter); setPage(1); }}>
        <option value="ALL">Tất cả trạng thái</option><option value="UNMARKED">Chưa điểm danh</option><option value="PRESENT">Đã lên xe</option><option value="ALIGHTED">Đã xuống xe</option><option value="ABSENT">Vắng</option><option value="PENDING_ALIGHT">Chưa xác nhận xuống</option>
      </Select></label>
    </div>
    {!data ? !error && <p role="status" className="trip-detail-empty">Đang tải điểm danh…</p>
      : !students.length ? <p className="trip-detail-empty">{data.totalStudents ? 'Không có học sinh khớp bộ lọc.' : 'Chuyến chưa có học sinh trong danh sách điểm danh.'}</p>
        : <><div className="trip-detail-roster-list">{students.slice((currentPage - 1) * limit, currentPage * limit).map(student => <AttendanceStudent key={student.studentId} student={student} />)}</div>
          <PaginationControl page={currentPage} totalPages={totalPages} total={students.length} limit={limit} onPageChange={setPage} onLimitChange={value => { setLimit(value); setPage(1); }} limitOptions={[10, 20, 50]} />
        </>}
  </div>;
}

function AttendanceStudent({ student }: { student: TripAttendanceStudent }) {
  const status = student.status === 'ABSENT' ? 'Vắng' : student.status === 'UNMARKED' ? 'Chưa điểm danh' : student.isAlighted ? 'Đã xuống xe' : 'Đã lên xe';
  const tone = student.status === 'ABSENT' ? 'absent' : student.status === 'UNMARKED' ? 'pending' : student.isAlighted ? 'alighted' : 'present';
  return <article className="trip-detail-student">
    <div className="trip-detail-student-heading"><div><strong>{student.fullName}</strong><small>{student.studentCode}</small></div><Badge data-tone={tone}>{status}</Badge></div>
    <p className="trip-detail-student-address">{student.addressText}{student.plannedArrivalTime && <span> · Dự kiến {student.plannedArrivalTime}</span>}</p>
    <dl className="trip-detail-student-times"><div><dt>{student.status === 'ABSENT' ? 'Ghi nhận vắng' : 'Điểm danh'}</dt><dd>{formatTime(student.markedAt)}</dd></div><div><dt>Xuống xe</dt><dd>{student.status === 'PRESENT' ? formatTime(student.alightedAt) : '—'}</dd></div></dl>
    {student.status === 'PRESENT' && !student.isAlighted && <small className="trip-detail-waiting">Chưa xác nhận xuống xe</small>}
    {student.status === 'ABSENT' && student.absenceReason && <p className="trip-detail-absence-reason">{student.absenceReason}</p>}
    {student.markedByName && <small className="trip-detail-marked-by">Ghi nhận: {student.markedByName}</small>}
  </article>;
}
