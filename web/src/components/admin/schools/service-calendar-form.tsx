'use client';

import { useState, type FormEvent } from 'react';
import { apiClient } from '@/lib/api-client';
import { displayDate, lifecycleError, vietnamDate, type CalendarEntryInput } from '@/lib/school-lifecycle';
import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { calendarOccurrence } from '@/lib/service-calendar';

export function ServiceCalendarForm({ schoolId, canRequestMakeup, onClose, onSaved }: {
  schoolId?: string; canRequestMakeup: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<CalendarEntryInput['kind']>('HOLIDAY');
  const [calendar, setCalendar] = useState<CalendarEntryInput['calendar']>('SOLAR');
  const [recurrence, setRecurrence] = useState<CalendarEntryInput['recurrence']>('ONCE');
  const [year, setYear] = useState(vietnamDate().slice(0, 4));
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [leapMonth, setLeapMonth] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const solarOnce = calendar === 'SOLAR' && recurrence === 'ONCE';
  const maxDay = calendar === 'LUNAR' ? 30 : month ? new Date(Date.UTC(2028, Number(month), 0)).getUTCDate() : 31;
  const solarDate = day && month && year ? calendarOccurrence({ calendar: 'SOLAR', recurrence: 'ONCE', year: Number(year), month: Number(month), day: Number(day), leapMonth: false }, Number(year)) ?? '' : '';
  const previewYear = recurrence === 'ONCE' ? Number(year) : Number(vietnamDate().slice(0, 4));
  const lunarPreview = calendar === 'LUNAR' && day && month && previewYear >= 1900 && previewYear <= 2199
    ? calendarOccurrence({ calendar, recurrence, year: recurrence === 'ONCE' ? previewYear : null, month: Number(month), day: Number(day), leapMonth }, previewYear) : null;
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    if (!title.trim()) { setError('Vui lòng nhập tên ngày nghỉ hoặc học bù.'); return; }
    if (recurrence === 'ONCE') {
      const occurrence = calendarOccurrence({ calendar, recurrence, year: Number(year), month: Number(month), day: Number(day), leapMonth: calendar === 'LUNAR' && leapMonth }, Number(year));
      if (!occurrence || occurrence <= vietnamDate()) { setError('Chọn ngày có thật, sau ngày hôm nay; kiểm tra cả tháng nhuận nếu dùng âm lịch.'); return; }
    }
    if (kind === 'MAKEUP' && (!schoolId || !canRequestMakeup || !startTime || !endTime || startTime >= endTime)) { setError('Học bù cần giờ bắt đầu nhỏ hơn giờ kết thúc.'); return; }
    setBusy(true); setError('');
    try {
      await apiClient.createServiceCalendar({ title: title.trim(), ...(schoolId ? { schoolId } : {}), kind, calendar, recurrence: kind === 'MAKEUP' ? 'ONCE' : recurrence,
        ...((recurrence === 'ONCE' || kind === 'MAKEUP') ? { year: Number(year) } : {}), month: Number(month), day: Number(day), leapMonth: calendar === 'LUNAR' && leapMonth,
        ...(kind === 'MAKEUP' ? { startTime, endTime } : {}) });
      onSaved();
    } catch (reason) { setError(lifecycleError(reason)); } finally { setBusy(false); }
  };
  return <LifecycleDialog open title={schoolId ? canRequestMakeup ? 'Thêm ngày nghỉ / học bù của trường' : 'Thêm ngày nghỉ của trường' : 'Thêm ngày nghỉ nhà xe'} busy={busy} onClose={onClose} footer={<><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Hủy</Button><Button type="submit" form="service-calendar-form" variant="primary" disabled={busy}>{busy ? 'Đang lưu…' : kind === 'MAKEUP' ? 'Gửi đề nghị' : 'Lưu ngày nghỉ'}</Button></>}>
    <form id="service-calendar-form" onSubmit={save} className="lifecycle-fields">
      <label>Tên ngày nghỉ / học bù *<Input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} required disabled={busy} /></label>
      <div className="lifecycle-field-row">
        <label>Loại<Select value={kind} onChange={e => { setKind(e.target.value as typeof kind); if (e.target.value === 'MAKEUP') setRecurrence('ONCE'); }} disabled={busy}><option value="HOLIDAY">Ngày nghỉ</option>{canRequestMakeup && schoolId && <option value="MAKEUP">Đề nghị học bù</option>}</Select></label>
        <label>Hệ lịch<Select value={calendar} onChange={e => { setCalendar(e.target.value as typeof calendar); if (e.target.value === 'LUNAR' && Number(day) > 30) setDay(''); }} disabled={busy}><option value="SOLAR">Dương lịch</option><option value="LUNAR">Âm lịch Việt Nam</option></Select></label>
      </div>
      <label>Lặp lại<Select value={recurrence} onChange={e => setRecurrence(e.target.value as typeof recurrence)} disabled={busy || kind === 'MAKEUP'}><option value="ONCE">Một lần</option><option value="ANNUAL">Hằng năm</option></Select></label>
      {solarOnce ? <label>Ngày áp dụng *<Input type="date" value={solarDate} min={vietnamDate(1)} max="2199-12-31" required disabled={busy}
        onChange={event => {
          const [nextYear, nextMonth, nextDay] = event.target.value.split('-');
          setYear(nextYear || vietnamDate().slice(0, 4)); setMonth(nextMonth ? String(Number(nextMonth)) : ''); setDay(nextDay ? String(Number(nextDay)) : '');
        }} /></label> : <>
        <div className="lifecycle-field-row">
          <label>{calendar === 'LUNAR' ? 'Ngày âm lịch *' : 'Ngày *'}<Select value={day} onChange={event => setDay(event.target.value)} required disabled={busy}><option value="">Chọn ngày</option>{Array.from({ length: maxDay }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</Select></label>
          <label>{calendar === 'LUNAR' ? 'Tháng âm lịch *' : 'Tháng *'}<Select value={month} onChange={event => { const next = event.target.value; setMonth(next); if (calendar === 'SOLAR' && next && Number(day) > new Date(Date.UTC(2028, Number(next), 0)).getUTCDate()) setDay(''); }} required disabled={busy}><option value="">Chọn tháng</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>Tháng {index + 1}</option>)}</Select></label>
        </div>
        {recurrence === 'ONCE' && <label>Năm âm lịch *<Input type="number" min={1900} max={2199} value={year} onChange={e => setYear(e.target.value)} required disabled={busy} /></label>}
      </>}
      {calendar === 'LUNAR' && <label><span><input type="checkbox" checked={leapMonth} onChange={e => setLeapMonth(e.target.checked)} disabled={busy} /> Tháng nhuận</span></label>}
      {calendar === 'LUNAR' && day && month && previewYear >= 1900 && previewYear <= 2199 && <p className="lifecycle-notice" role="status" aria-live="polite">{lunarPreview ? `Dương lịch tương ứng${recurrence === 'ANNUAL' ? ` trong năm âm lịch ${previewYear}` : ''}: ${displayDate(lunarPreview)}` : `Không có ngày âm lịch này trong năm ${previewYear}.`}</p>}
      {kind === 'MAKEUP' && <div className="lifecycle-field-row"><label>Bắt đầu *<Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required disabled={busy} /></label><label>Kết thúc *<Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required disabled={busy} /></label></div>}
      <p className="lifecycle-notice">Phải báo trước ngày áp dụng. Học bù chờ nhà xe duyệt và không được trùng ngày nghỉ nhà xe.</p>
      {error && <p className="lifecycle-error" role="alert">{error}</p>}
    </form>
  </LifecycleDialog>;
}
