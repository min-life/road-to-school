'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DAYS_OF_WEEK } from '@/components/admin/schools/weekly-schedule.helper';
import type { WeeklySchedule } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { resolveSchoolDay, type ResolvedSchoolDay, type SchoolDayType } from '@/lib/service-calendar';
import { lifecycleError, vietnamDate, type ServiceCalendarEntry, type SchoolScheduledChange } from '@/lib/school-lifecycle';
import './school-schedule.css';

const DAY_TYPE_CLASS_MAP: Record<SchoolDayType, string> = {
  REGULAR: 'regular',
  MAKEUP: 'makeup',
  WEEKLY_OFF: 'weekly-off',
  HOLIDAY: 'holiday',
  OUT_OF_CONTRACT: 'out-of-contract',
  INACTIVE: 'inactive',
};

export function SchoolSchedule({ schedule, schoolName, schoolId, contractStartDate, contractEndDate, isActive, refreshKey = 0 }: { schedule: WeeklySchedule; schoolName: string; schoolId: string; contractStartDate: string; contractEndDate: string; isActive: boolean; refreshKey?: number }) {
  const [calendar, setCalendar] = useState<ServiceCalendarEntry[]>([]);
  const [changes, setChanges] = useState<SchoolScheduledChange[]>([]);
  const [calendarError, setCalendarError] = useState('Đang tải lịch ngoại lệ…');
  useEffect(() => {
    let current = true;
    Promise.all([apiClient.getServiceCalendar(schoolId), apiClient.getSchoolScheduledChanges(schoolId)])
      .then(([entries, pending]) => { if (current) { setCalendar(entries); setChanges(pending); setCalendarError(''); } })
      .catch(error => { if (current) setCalendarError(lifecycleError(error)); });
    return () => { current = false; };
  }, [schoolId, refreshKey]);
  const resolve = (date: Date): ResolvedSchoolDay => {
    const key = date.toISOString().slice(0, 10);
    if (key < contractStartDate.slice(0, 10) || key > contractEndDate.slice(0, 10)) {
      return { dayType: 'OUT_OF_CONTRACT', kind: 'HOLIDAY', label: 'Ngoài hợp đồng' };
    }
    if (!isActive && key >= vietnamDate()) {
      return { dayType: 'INACTIVE', kind: 'HOLIDAY', label: 'Ngừng hoạt động' };
    }
    return resolveSchoolDay(key, schedule, calendar, schoolId, changes);
  };
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [today] = useState(() => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    return { year: value('year'), month: value('month') - 1, day: value('day') };
  });
  const [month, setMonth] = useState(() => new Date(Date.UTC(today.year, today.month, 1)));
  const [weekOffset, setWeekOffset] = useState(0);
  const todayDate = new Date(Date.UTC(today.year, today.month, today.day));
  const monday = new Date(Date.UTC(today.year, today.month, today.day - (todayDate.getUTCDay() + 6) % 7 + weekOffset * 7));
  const weekDates = DAYS_OF_WEEK.map((_, index) => new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + index)));
  const formatDM = (date: Date) => `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  const formatDMY = (date: Date) => `${formatDM(date)}/${date.getUTCFullYear()}`;
  const weekMonday = weekDates[0];
  const weekSunday = weekDates[6];
  const weekRangeLabel = weekMonday.getUTCFullYear() === weekSunday.getUTCFullYear()
    ? `${formatDM(weekMonday)} – ${formatDMY(weekSunday)}`
    : `${formatDMY(weekMonday)} – ${formatDMY(weekSunday)}`;
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const leadingDays = (month.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const weeks = Math.ceil((leadingDays + daysInMonth) / 7);
  const changeMonth = (offset: number) => setMonth(new Date(Date.UTC(year, monthIndex + offset, 1)));
  const monthLabel = `Tháng ${monthIndex + 1}/${year}`;

  return (
    <section className="school-detail-info-card school-detail-schedule" aria-label="Lịch học theo tuần">
      <div className="school-detail-section-heading">
        <h3><Clock3 size={18} aria-hidden="true" />Lịch học tuần</h3>
        <div className="school-week-toolbar">
        {weekOffset !== 0 && <Button type="button" variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>Tuần hiện tại</Button>}
        <div className="school-week-navigation">
          <Button type="button" variant="ghost" size="icon" aria-label="Tuần trước" onClick={() => setWeekOffset((offset) => offset - 1)}><ChevronLeft size={16} aria-hidden="true" /></Button>
          <span aria-live="polite" aria-atomic="true">{weekRangeLabel}</span>
          <Button type="button" variant="ghost" size="icon" aria-label="Tuần sau" onClick={() => setWeekOffset((offset) => offset + 1)}><ChevronRight size={16} aria-hidden="true" /></Button>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => dialogRef.current?.showModal()}>
          <CalendarDays size={16} aria-hidden="true" />Xem lịch tháng
        </Button>
        </div>
      </div>
      <div className="school-week-table-wrap">
        <table className="school-week-grid">
          <caption className="sr-only">Lịch tuần từ {weekDates[0].toISOString().slice(0, 10)} đến {weekDates[6].toISOString().slice(0, 10)} của {schoolName}</caption>
          <thead><tr>{DAYS_OF_WEEK.map((day, index) => <th scope="col" key={day.key} aria-label={day.label}>{index === 6 ? 'CN' : `T${index + 2}`}</th>)}</tr></thead>
          <tbody><tr>{DAYS_OF_WEEK.map((day, index) => {
            const date = weekDates[index];
            const resolved = resolve(date);
            const isToday = date.getTime() === todayDate.getTime();
            return (
              <td
                key={day.key}
                className={`school-week-day-cell school-day-${DAY_TYPE_CLASS_MAP[resolved.dayType]} ${isToday ? 'is-today' : ''}`}
                aria-current={isToday ? 'date' : undefined}
              >
                <div className="school-week-cell-header">
                  <time dateTime={date.toISOString().slice(0, 10)} className="school-week-date-num">{date.getUTCDate()}</time>
                  {isToday && <span className="school-schedule-today-pill">Hôm nay</span>}
                </div>
                <div className="school-week-cell-body">
                  {resolved.dayType === 'REGULAR' && (
                    <div className="school-week-day-content">
                      <span className="school-day-badge school-tag-regular">Ngày học</span>
                      {resolved.start && resolved.end && (
                        <div className="school-week-hours" title={`${resolved.start} – ${resolved.end}`}>
                          <span>{resolved.start}</span>
                          <span aria-hidden="true">–</span>
                          <span>{resolved.end}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {resolved.dayType === 'MAKEUP' && (
                    <div className="school-week-day-content">
                      <span className="school-day-badge school-tag-makeup">Học bù</span>
                      {resolved.start && resolved.end && (
                        <div className="school-week-hours" title={`${resolved.start} – ${resolved.end}`}>
                          <span>{resolved.start}</span>
                          <span aria-hidden="true">–</span>
                          <span>{resolved.end}</span>
                        </div>
                      )}
                      {resolved.label && <span className="school-week-event-title" title={resolved.label}>{resolved.label}</span>}
                    </div>
                  )}
                  {resolved.dayType === 'HOLIDAY' && (
                    <div className="school-week-day-content">
                      <span className="school-day-badge school-tag-holiday">Ngày nghỉ</span>
                      {resolved.label && resolved.label !== 'Ngày nghỉ' && resolved.label !== 'Nghỉ' && (
                        <span className="school-week-holiday-title" title={resolved.label}>{resolved.label}</span>
                      )}
                    </div>
                  )}
                  {resolved.dayType === 'WEEKLY_OFF' && (
                    <div className="school-week-day-content">
                      <span className="school-day-badge school-tag-weekly-off">Nghỉ theo lịch tuần</span>
                    </div>
                  )}
                  {resolved.dayType === 'OUT_OF_CONTRACT' && (
                    <div className="school-week-day-content">
                      <span className="school-day-badge school-tag-out-of-contract">Ngoài hợp đồng</span>
                    </div>
                  )}
                  {resolved.dayType === 'INACTIVE' && (
                    <div className="school-week-day-content">
                      <span className="school-day-badge school-tag-inactive">Ngừng hoạt động</span>
                    </div>
                  )}
                </div>
              </td>
            );
          })}</tr></tbody>
        </table>
      </div>
      {calendarError && <p className="school-calendar-note" role="status">Chỉ hiển thị lịch tuần cơ bản. {calendarError}</p>}

      <dialog ref={dialogRef} className="school-calendar-dialog" aria-labelledby={titleId}
        onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
        <div className="school-calendar-panel">
          <header className="school-calendar-header">
            <div><h2 id={titleId}>Lịch học theo tháng</h2><p>{schoolName}</p></div>
            <Button type="button" variant="ghost" size="icon" aria-label="Đóng lịch tháng" onClick={() => dialogRef.current?.close()} autoFocus><X size={20} aria-hidden="true" /></Button>
          </header>
          <div className="school-calendar-body">
            <div className="school-calendar-toolbar">
              <div className="school-calendar-month-navigation">
                <Button type="button" variant="outline" size="icon" aria-label="Tháng trước" onClick={() => changeMonth(-1)}><ChevronLeft size={18} aria-hidden="true" /></Button>
                <h3 aria-live="polite" aria-atomic="true">{monthLabel}</h3>
                <Button type="button" variant="outline" size="icon" aria-label="Tháng sau" onClick={() => changeMonth(1)}><ChevronRight size={18} aria-hidden="true" /></Button>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setMonth(new Date(Date.UTC(today.year, today.month, 1)))}>Tháng hiện tại</Button>
            </div>
            <p className="school-calendar-note">Lịch dự kiến theo cấu hình hiện tại, ngày nghỉ và học bù đã duyệt. Không thay thế lịch sử chuyến thực tế.{calendarError && ` Chưa tải được lịch ngoại lệ: ${calendarError}`}</p>
            <table className="school-calendar-grid">
              <caption className="sr-only">Lịch học {monthLabel} của {schoolName}</caption>
              <thead><tr>{DAYS_OF_WEEK.map((day, index) => <th scope="col" key={day.key} aria-label={day.label}>{index === 6 ? 'CN' : `T${index + 2}`}</th>)}</tr></thead>
              <tbody>{Array.from({ length: weeks }, (_, week) => <tr key={week}>
                {DAYS_OF_WEEK.map((weekday, index) => {
                  const day = week * 7 + index - leadingDays + 1;
                  if (day < 1 || day > daysInMonth) return <td key={weekday.key} className="school-calendar-empty" />;
                  const resolved = resolve(new Date(Date.UTC(year, monthIndex, day)));
                  const isToday = year === today.year && monthIndex === today.month && day === today.day;
                  return (
                    <td
                      key={weekday.key}
                      className={`school-calendar-day-cell school-day-${DAY_TYPE_CLASS_MAP[resolved.dayType]} ${isToday ? 'is-today' : ''}`}
                      aria-current={isToday ? 'date' : undefined}
                    >
                      <div className="school-calendar-date">
                        <time dateTime={`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`}>{day}</time>
                        {isToday && <span className="school-schedule-today-pill">Hôm nay</span>}
                      </div>
                      <div className="school-calendar-cell-body">
                        {resolved.dayType === 'REGULAR' && (
                          <div className="school-calendar-day-content">
                            <span className="school-day-badge school-tag-regular">Ngày học</span>
                            {resolved.start && resolved.end && (
                              <div className="school-calendar-hours" title={`${resolved.start} – ${resolved.end}`}>
                                <span>{resolved.start}</span>
                                <span aria-hidden="true">–</span>
                                <span>{resolved.end}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {resolved.dayType === 'MAKEUP' && (
                          <div className="school-calendar-day-content">
                            <span className="school-day-badge school-tag-makeup">Học bù</span>
                            {resolved.start && resolved.end && (
                              <div className="school-calendar-hours" title={`${resolved.start} – ${resolved.end}`}>
                                <span>{resolved.start}</span>
                                <span aria-hidden="true">–</span>
                                <span>{resolved.end}</span>
                              </div>
                            )}
                            {resolved.label && <span className="school-calendar-event-title" title={resolved.label}>{resolved.label}</span>}
                          </div>
                        )}
                        {resolved.dayType === 'HOLIDAY' && (
                          <div className="school-calendar-day-content">
                            <span className="school-day-badge school-tag-holiday">Ngày nghỉ</span>
                            {resolved.label && resolved.label !== 'Ngày nghỉ' && resolved.label !== 'Nghỉ' && (
                              <span className="school-calendar-holiday-title" title={resolved.label}>{resolved.label}</span>
                            )}
                          </div>
                        )}
                        {resolved.dayType === 'WEEKLY_OFF' && (
                          <div className="school-calendar-day-content">
                            <span className="school-day-badge school-tag-weekly-off">Nghỉ tuần</span>
                          </div>
                        )}
                        {resolved.dayType === 'OUT_OF_CONTRACT' && (
                          <div className="school-calendar-day-content">
                            <span className="school-day-badge school-tag-out-of-contract">Ngoài HĐ</span>
                          </div>
                        )}
                        {resolved.dayType === 'INACTIVE' && (
                          <div className="school-calendar-day-content">
                            <span className="school-day-badge school-tag-inactive">Ngừng HĐ</span>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>)}</tbody>
            </table>
          </div>
          <footer className="school-calendar-footer"><Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>Đóng</Button></footer>
        </div>
      </dialog>
    </section>
  );
}
