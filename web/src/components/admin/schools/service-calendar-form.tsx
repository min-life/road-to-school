'use client';

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  displayDate,
  lifecycleError,
  vietnamDate,
  type CalendarEntryInput,
  type ServiceCalendarEntry,
} from '@/lib/school-lifecycle';
import { LifecycleDialog } from '@/components/admin/common/lifecycle-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from '@/components/icons';
import { calendarMatches, calendarOccurrence } from '@/lib/service-calendar';
import './service-calendar-form.css';

interface ServiceCalendarFormProps {
  schoolId?: string;
  canRequestMakeup: boolean;
  existingEntries?: ServiceCalendarEntry[];
  contractStartDate?: string;
  contractEndDate?: string;
  isSchoolActive?: boolean;
  onClose: () => void;
  onSaved: (kind?: 'HOLIDAY' | 'MAKEUP') => void;
}

/** Parses "dd/MM/yyyy" text into year, month, day, and ISO string YYYY-MM-DD */
function parseDateText(text: string): { year: number; month: number; day: number; iso: string } | null {
  const trimmed = text.trim();
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (year < 1900 || year > 2199) return null;
  const maxDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > maxDays) return null;
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { year, month, day, iso };
}

function formatDateToText(year: number, month: number, day: number): string {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function localDateFromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function ServiceCalendarForm({
  schoolId,
  canRequestMakeup,
  existingEntries = [],
  contractStartDate,
  contractEndDate,
  isSchoolActive = true,
  onClose,
  onSaved,
}: ServiceCalendarFormProps) {
  const isSchoolAdmin = canRequestMakeup && Boolean(schoolId);
  const [mode, setMode] = useState<'HOLIDAY' | 'MAKEUP'>('HOLIDAY');
  const [loadedContract, setLoadedContract] = useState<{ start?: string; end?: string } | null>(null);

  useEffect(() => {
    if (schoolId && (!contractStartDate || !contractEndDate)) {
      apiClient.getSchoolOperatingSettings(schoolId)
        .then((data) => {
          setLoadedContract({
            start: data.contractStartDate,
            end: data.contractEndDate,
          });
        })
        .catch(() => undefined);
    }
  }, [schoolId, contractStartDate, contractEndDate]);

  const effectiveContractStart = contractStartDate || loadedContract?.start;
  const effectiveContractEnd = contractEndDate || loadedContract?.end;

  // Holiday Draft State
  const [holidayTitle, setHolidayTitle] = useState('');
  const [holidayCalendar, setHolidayCalendar] = useState<'SOLAR' | 'LUNAR'>('SOLAR');
  const [holidayRecurrence, setHolidayRecurrence] = useState<'ONCE' | 'ANNUAL'>('ONCE');
  const [holidaySolarDateText, setHolidaySolarDateText] = useState('');
  const [holidayDay, setHolidayDay] = useState('');
  const [holidayMonth, setHolidayMonth] = useState('');
  const [holidayYear, setHolidayYear] = useState(vietnamDate().slice(0, 4));
  const [holidayLeapMonth, setHolidayLeapMonth] = useState(false);

  // Makeup Draft State
  const [makeupTitle, setMakeupTitle] = useState('');
  const [makeupCalendar, setMakeupCalendar] = useState<'SOLAR' | 'LUNAR'>('SOLAR');
  const [makeupSolarDateText, setMakeupSolarDateText] = useState('');
  const [makeupDay, setMakeupDay] = useState('');
  const [makeupMonth, setMakeupMonth] = useState('');
  const [makeupYear, setMakeupYear] = useState(vietnamDate().slice(0, 4));
  const [makeupLeapMonth, setMakeupLeapMonth] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const isSchoolOneOffHoliday = mode === 'HOLIDAY' && holidayRecurrence === 'ONCE' && Boolean(schoolId);
  const tomorrowVn = vietnamDate(1);
  const contractStartStr = effectiveContractStart ? effectiveContractStart.slice(0, 10) : '';
  const contractEndStr = effectiveContractEnd ? effectiveContractEnd.slice(0, 10) : '';

  const validMinIso = contractStartStr && contractStartStr > tomorrowVn ? contractStartStr : tomorrowVn;
  const validMaxIso = contractEndStr || '';
  const isRangeEmpty = Boolean(isSchoolOneOffHoliday && validMaxIso && validMinIso > validMaxIso);

  // UI state
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    date?: string;
    time?: string;
    general?: string;
  }>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isSolarCalendarOpen, setIsSolarCalendarOpen] = useState(false);

  // Refs for focus management and date popover positioning
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const modeHolidayRef = useRef<HTMLButtonElement>(null);
  const modeMakeupRef = useRef<HTMLButtonElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const startTimeInputRef = useRef<HTMLInputElement>(null);
  const calendarFieldRef = useRef<HTMLDivElement>(null);
  const calendarTriggerRef = useRef<HTMLButtonElement>(null);
  const calendarPopoverRef = useRef<HTMLDivElement>(null);
  const dateId = useId();

  // Store element that opened modal and manage initial focus
  useEffect(() => {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      if (isSchoolAdmin) {
        modeHolidayRef.current?.focus();
      } else {
        titleInputRef.current?.focus();
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [isSchoolAdmin]);

  const handleCloseModal = useCallback(() => {
    onClose();
    setTimeout(() => {
      lastFocusedRef.current?.focus();
    }, 40);
  }, [onClose]);

  const isDirty = useCallback(() => {
    if (mode === 'HOLIDAY') {
      return Boolean(
        holidayTitle.trim() ||
        holidaySolarDateText ||
        holidayDay ||
        holidayMonth ||
        holidayCalendar !== 'SOLAR' ||
        holidayRecurrence !== 'ONCE'
      );
    }
    return Boolean(
      makeupTitle.trim() ||
      makeupSolarDateText ||
      makeupDay ||
      makeupMonth ||
      makeupCalendar !== 'SOLAR' ||
      startTime ||
      endTime
    );
  }, [
    mode,
    holidayTitle,
    holidaySolarDateText,
    holidayDay,
    holidayMonth,
    holidayCalendar,
    holidayRecurrence,
    makeupTitle,
    makeupSolarDateText,
    makeupDay,
    makeupMonth,
    makeupCalendar,
    startTime,
    endTime,
  ]);

  const handleRequestClose = useCallback(() => {
    if (busy) return;
    if (isDirty()) {
      setShowDiscardConfirm(true);
    } else {
      handleCloseModal();
    }
  }, [busy, isDirty, handleCloseModal]);

  // Position date calendar popover
  const positionCalendar = useCallback(() => {
    const popup = calendarPopoverRef.current;
    const field = calendarFieldRef.current;
    if (!popup || !field) return;
    const rect = field.getBoundingClientRect();
    if (rect.bottom < 16 || rect.top > window.innerHeight - 16) {
      popup.style.display = 'none';
      return;
    }
    popup.style.display = 'block';
    popup.style.width = `${Math.min(340, window.innerWidth - 32)}px`;
    const below = window.innerHeight - rect.bottom - 20;
    const above = rect.top - 20;
    const useAbove = below < popup.scrollHeight && above > below;
    const available = Math.max(80, useAbove ? above : below);
    popup.style.maxHeight = `${available}px`;
    popup.style.left = `${Math.max(16, Math.min(rect.left, window.innerWidth - popup.offsetWidth - 16))}px`;
    popup.style.top = `${useAbove ? Math.max(16, rect.top - Math.min(popup.scrollHeight, available) - 8) : rect.bottom + 8}px`;
  }, []);

  useEffect(() => {
    if (!isSolarCalendarOpen) return;
    const reposition = (event: Event) => {
      if (event.target instanceof Node && calendarPopoverRef.current?.contains(event.target)) return;
      positionCalendar();
    };
    positionCalendar();
    const observer = new ResizeObserver(positionCalendar);
    if (calendarPopoverRef.current) observer.observe(calendarPopoverRef.current);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [isSolarCalendarOpen, positionCalendar]);

  const clearFieldError = (field: 'title' | 'date' | 'time' | 'general') => {
    setFieldErrors((prev) => {
      if (!prev[field] && !prev.general) return prev;
      const next = { ...prev };
      delete next[field];
      delete next.general;
      return next;
    });
  };

  // Keyboard navigation for mode radio group
  const handleModeKeyDown = (event: KeyboardEvent<HTMLButtonElement>, targetMode: 'HOLIDAY' | 'MAKEUP') => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      setMode('MAKEUP');
      modeMakeupRef.current?.focus();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      setMode('HOLIDAY');
      modeHolidayRef.current?.focus();
    }
  };

  // Lunar previews
  const holidayPreviewYear = holidayRecurrence === 'ONCE' ? Number(holidayYear) : Number(vietnamDate().slice(0, 4));
  const holidayLunarOccurrence = holidayCalendar === 'LUNAR' && holidayDay && holidayMonth && holidayPreviewYear >= 1900 && holidayPreviewYear <= 2199
    ? calendarOccurrence({ calendar: 'LUNAR', recurrence: holidayRecurrence, year: holidayRecurrence === 'ONCE' ? holidayPreviewYear : null, month: Number(holidayMonth), day: Number(holidayDay), leapMonth: holidayLeapMonth }, holidayPreviewYear)
    : null;

  const makeupPreviewYear = Number(makeupYear);
  const makeupLunarOccurrence = makeupCalendar === 'LUNAR' && makeupDay && makeupMonth && makeupPreviewYear >= 1900 && makeupPreviewYear <= 2199
    ? calendarOccurrence({ calendar: 'LUNAR', recurrence: 'ONCE', year: makeupPreviewYear, month: Number(makeupMonth), day: Number(makeupDay), leapMonth: makeupLeapMonth }, makeupPreviewYear)
    : null;

  // Active date resolution for conflict & warning checks
  const currentActiveSolarDate = mode === 'HOLIDAY'
    ? (holidayCalendar === 'SOLAR'
        ? parseDateText(holidaySolarDateText)?.iso ?? ''
        : holidayLunarOccurrence ?? '')
    : (makeupCalendar === 'SOLAR'
        ? parseDateText(makeupSolarDateText)?.iso ?? ''
        : makeupLunarOccurrence ?? '');

  // Detect matching existing holidays
  const matchingHolidays = currentActiveSolarDate
    ? existingEntries.filter((entry) => {
        const status = entry.effectiveStatus ?? entry.status;
        return status === 'APPROVED' && entry.kind === 'HOLIDAY' && calendarMatches(entry, currentActiveSolarDate);
      })
    : [];

  const operatorHoliday = matchingHolidays.find((h) => !h.schoolId);
  const schoolHoliday = matchingHolidays.find((h) => h.schoolId);

  // Form submit handler
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;

    const errors: { title?: string; date?: string; time?: string } = {};

    if (mode === 'HOLIDAY') {
      if (!holidayTitle.trim()) {
        errors.title = 'Vui lòng nhập tên ngày nghỉ.';
      }

      if (holidayCalendar === 'SOLAR') {
        if (holidayRecurrence === 'ONCE') {
          const parsed = parseDateText(holidaySolarDateText);
          if (!parsed) {
            errors.date = 'Vui lòng nhập ngày áp dụng hợp lệ định dạng dd/mm/yyyy.';
          } else if (parsed.iso <= vietnamDate()) {
            errors.date = 'Ngày áp dụng phải sau ngày hôm nay.';
          } else if (isSchoolOneOffHoliday) {
            if (isRangeEmpty) {
              errors.date = 'Hợp đồng không còn ngày hợp lệ để thêm ngày nghỉ một lần.';
            } else if (parsed.iso < validMinIso || (validMaxIso && parsed.iso > validMaxIso)) {
              errors.date = 'Ngày nghỉ một lần của trường phải nằm trong thời hạn hợp đồng.';
            }
          }
        } else {
          // ANNUAL
          if (!holidayDay || !holidayMonth) {
            errors.date = 'Vui lòng chọn ngày và tháng lặp lại.';
          } else {
            const thisYear = Number(vietnamDate().slice(0, 4));
            const occurrenceThisYear = calendarOccurrence(
              { calendar: 'SOLAR', recurrence: 'ANNUAL', year: null, month: Number(holidayMonth), day: Number(holidayDay), leapMonth: false },
              thisYear
            );
            if (occurrenceThisYear && occurrenceThisYear === vietnamDate()) {
              errors.date = 'Lịch lặp hằng năm không được áp dụng bắt đầu ngay hôm nay.';
            }
          }
        }
      } else {
        // LUNAR
        if (!holidayDay || !holidayMonth) {
          errors.date = 'Vui lòng chọn ngày và tháng âm lịch.';
        } else if (holidayRecurrence === 'ONCE') {
          if (!holidayYear || Number(holidayYear) < 1900 || Number(holidayYear) > 2199) {
            errors.date = 'Năm âm lịch phải từ 1900 đến 2199.';
          } else if (!holidayLunarOccurrence) {
            errors.date = 'Ngày âm lịch này không tồn tại trong năm đã chọn.';
          } else if (holidayLunarOccurrence <= vietnamDate()) {
            errors.date = 'Ngày dương lịch tương ứng phải sau ngày hôm nay.';
          } else if (isSchoolOneOffHoliday) {
            if (isRangeEmpty) {
              errors.date = 'Hợp đồng không còn ngày hợp lệ để thêm ngày nghỉ một lần.';
            } else if (holidayLunarOccurrence < validMinIso || (validMaxIso && holidayLunarOccurrence > validMaxIso)) {
              errors.date = 'Ngày nghỉ một lần của trường phải nằm trong thời hạn hợp đồng.';
            }
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        if (errors.title) titleInputRef.current?.focus();
        else if (errors.date) dateInputRef.current?.focus();
        return;
      }

      setBusy(true);
      setFieldErrors({});

      try {
        let entryYear: number | undefined;
        let entryMonth: number;
        let entryDay: number;

        if (holidayCalendar === 'SOLAR') {
          if (holidayRecurrence === 'ONCE') {
            const parsed = parseDateText(holidaySolarDateText)!;
            entryYear = parsed.year;
            entryMonth = parsed.month;
            entryDay = parsed.day;
          } else {
            entryMonth = Number(holidayMonth);
            entryDay = Number(holidayDay);
          }
        } else {
          entryDay = Number(holidayDay);
          entryMonth = Number(holidayMonth);
          if (holidayRecurrence === 'ONCE') {
            entryYear = Number(holidayYear);
          }
        }

        const payload: CalendarEntryInput = {
          title: holidayTitle.trim(),
          schoolId: schoolId || undefined,
          kind: 'HOLIDAY',
          calendar: holidayCalendar,
          recurrence: holidayRecurrence,
          year: entryYear,
          month: entryMonth,
          day: entryDay,
          leapMonth: holidayCalendar === 'LUNAR' ? holidayLeapMonth : undefined,
        };

        await apiClient.createServiceCalendar(payload);
        onSaved('HOLIDAY');
      } catch (reason) {
        const message = lifecycleError(reason);
        if (message.includes('thời hạn hợp đồng')) {
          setFieldErrors({ date: message });
          if (schoolId) {
            apiClient.getSchoolOperatingSettings(schoolId)
              .then((data) => {
                setLoadedContract({
                  start: data.contractStartDate,
                  end: data.contractEndDate,
                });
              })
              .catch(() => undefined);
          }
        } else {
          setFieldErrors({ general: message });
        }
      } finally {
        setBusy(false);
      }
    } else {
      // MAKEUP mode
      if (!makeupTitle.trim()) {
        errors.title = 'Vui lòng nhập tên buổi học bù.';
      }

      let targetIso = '';
      let entryYear = Number(makeupYear);
      let entryMonth = Number(makeupMonth);
      let entryDay = Number(makeupDay);

      if (makeupCalendar === 'SOLAR') {
        const parsed = parseDateText(makeupSolarDateText);
        if (!parsed) {
          errors.date = 'Vui lòng nhập ngày học bù hợp lệ định dạng dd/mm/yyyy.';
        } else if (parsed.iso <= vietnamDate()) {
          errors.date = 'Ngày học bù phải sau ngày hôm nay.';
        } else {
          targetIso = parsed.iso;
          entryYear = parsed.year;
          entryMonth = parsed.month;
          entryDay = parsed.day;
        }
      } else {
        if (!makeupDay || !makeupMonth || !makeupYear) {
          errors.date = 'Vui lòng nhập đầy đủ ngày, tháng và năm âm lịch.';
        } else if (!makeupLunarOccurrence) {
          errors.date = 'Ngày âm lịch này không tồn tại trong năm đã chọn.';
        } else if (makeupLunarOccurrence <= vietnamDate()) {
          errors.date = 'Ngày học bù quy đổi ra dương lịch phải sau ngày hôm nay.';
        } else {
          targetIso = makeupLunarOccurrence;
        }
      }

      if (targetIso) {
        if (contractStartDate && targetIso < contractStartDate.slice(0, 10)) {
          errors.date = `Ngày học bù phải nằm trong thời hạn hợp đồng (bắt đầu từ ${displayDate(contractStartDate)}).`;
        } else if (contractEndDate && targetIso > contractEndDate.slice(0, 10)) {
          errors.date = `Ngày học bù vượt quá ngày kết thúc hợp đồng (${displayDate(contractEndDate)}).`;
        } else if (isSchoolActive === false) {
          errors.date = 'Trường học đang ngừng hoạt động nên không thể đề nghị học bù.';
        } else if (operatorHoliday) {
          errors.date = `Không thể học bù vào ngày nghỉ toàn nhà xe: ${operatorHoliday.title}.`;
        }
      }

      if (!startTime) {
        errors.time = 'Vui lòng nhập giờ bắt đầu học bù.';
      } else if (!endTime) {
        errors.time = 'Vui lòng nhập giờ kết thúc học bù.';
      } else if (startTime >= endTime) {
        errors.time = 'Giờ kết thúc phải sau giờ bắt đầu.';
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        if (errors.title) titleInputRef.current?.focus();
        else if (errors.date) dateInputRef.current?.focus();
        else if (errors.time) startTimeInputRef.current?.focus();
        return;
      }

      setBusy(true);
      setFieldErrors({});

      try {
        const payload: CalendarEntryInput = {
          title: makeupTitle.trim(),
          schoolId: schoolId!,
          kind: 'MAKEUP',
          calendar: makeupCalendar,
          recurrence: 'ONCE',
          year: entryYear,
          month: entryMonth,
          day: entryDay,
          leapMonth: makeupCalendar === 'LUNAR' ? makeupLeapMonth : undefined,
          startTime,
          endTime,
        };

        await apiClient.createServiceCalendar(payload);
        onSaved('MAKEUP');
      } catch (reason) {
        setFieldErrors({ general: lifecycleError(reason) });
      } finally {
        setBusy(false);
      }
    }
  };

  // Determine modal title
  const modalTitle = mode === 'MAKEUP'
    ? 'Đề nghị học bù của trường'
    : (schoolId ? 'Thêm ngày nghỉ của trường' : 'Thêm ngày nghỉ nhà xe');

  // Resolved date object for DayPicker
  const activeSolarParsed = mode === 'HOLIDAY'
    ? parseDateText(holidaySolarDateText)
    : parseDateText(makeupSolarDateText);

  const selectedCalendarDate = activeSolarParsed
    ? new Date(Date.UTC(activeSolarParsed.year, activeSolarParsed.month - 1, activeSolarParsed.day))
    : undefined;

  const minCalendarDate = new Date(`${vietnamDate(1)}T00:00:00Z`);

  const isSelectedWithinRange = Boolean(
    activeSolarParsed &&
      (!isSchoolOneOffHoliday ||
        (activeSolarParsed.iso >= validMinIso && (!validMaxIso || activeSolarParsed.iso <= validMaxIso)))
  );

  const calendarDefaultMonth = isSelectedWithinRange && selectedCalendarDate
    ? selectedCalendarDate
    : (isSchoolOneOffHoliday ? localDateFromIso(validMinIso) : localDateFromIso(tomorrowVn));

  const isDateDisabled = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${day}`;
    if (isSchoolOneOffHoliday) {
      if (iso < validMinIso) return true;
      if (validMaxIso && iso > validMaxIso) return true;
      return false;
    }
    return iso < tomorrowVn;
  };

  return (
    <>
      <LifecycleDialog
        open
        title={modalTitle}
        busy={busy}
        onClose={handleRequestClose}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={handleRequestClose}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="service-calendar-form"
              variant="primary"
              disabled={busy || (isSchoolOneOffHoliday && isRangeEmpty)}
            >
              {busy
                ? 'Đang lưu…'
                : mode === 'MAKEUP'
                ? 'Gửi đề nghị học bù'
                : 'Lưu ngày nghỉ'}
            </Button>
          </>
        }
      >
        <form id="service-calendar-form" onSubmit={save} className="lifecycle-fields">
          {/* Mode Selector for SCHOOL_ADMIN */}
          {isSchoolAdmin && (
            <div className="service-calendar-mode-wrap">
              <div className="service-calendar-mode-group" role="radiogroup" aria-label="Loại lịch dịch vụ">
                <button
                  ref={modeHolidayRef}
                  type="button"
                  role="radio"
                  id="mode-holiday"
                  aria-checked={mode === 'HOLIDAY'}
                  className={`service-calendar-mode-btn ${mode === 'HOLIDAY' ? 'is-active' : ''}`}
                  onClick={() => {
                    setMode('HOLIDAY');
                    clearFieldError('title');
                    clearFieldError('date');
                    clearFieldError('time');
                  }}
                  onKeyDown={(e) => handleModeKeyDown(e, 'HOLIDAY')}
                >
                  Ngày nghỉ
                </button>
                <button
                  ref={modeMakeupRef}
                  type="button"
                  role="radio"
                  id="mode-makeup"
                  aria-checked={mode === 'MAKEUP'}
                  className={`service-calendar-mode-btn ${mode === 'MAKEUP' ? 'is-active' : ''}`}
                  onClick={() => {
                    setMode('MAKEUP');
                    clearFieldError('title');
                    clearFieldError('date');
                    clearFieldError('time');
                  }}
                  onKeyDown={(e) => handleModeKeyDown(e, 'MAKEUP')}
                >
                  Đề nghị học bù
                </button>
              </div>
            </div>
          )}

          {/* ==================== HOLIDAY MODE ==================== */}
          {mode === 'HOLIDAY' && (
            <>
              <label>
                Tên ngày nghỉ *
                <Input
                  ref={titleInputRef}
                  value={holidayTitle}
                  onChange={(e) => {
                    setHolidayTitle(e.target.value);
                    clearFieldError('title');
                  }}
                  maxLength={200}
                  placeholder="Ví dụ: Nghỉ Tết Dương lịch"
                  required
                  disabled={busy}
                  className={fieldErrors.title ? 'border-rose-400' : ''}
                  aria-invalid={Boolean(fieldErrors.title)}
                />
                {fieldErrors.title && (
                  <p className="service-calendar-field-error" role="alert">
                    {fieldErrors.title}
                  </p>
                )}
              </label>

              <div className="lifecycle-field-row">
                <label>
                  Hệ lịch
                  <Select
                    value={holidayCalendar}
                    onChange={(e) => {
                      const next = e.target.value as 'SOLAR' | 'LUNAR';
                      setHolidayCalendar(next);
                      setHolidaySolarDateText('');
                      setHolidayDay('');
                      setHolidayMonth('');
                      setHolidayLeapMonth(false);
                      clearFieldError('date');
                    }}
                    disabled={busy}
                  >
                    <option value="SOLAR">Dương lịch</option>
                    <option value="LUNAR">Âm lịch Việt Nam</option>
                  </Select>
                </label>

                <label>
                  Tần suất
                  <Select
                    value={holidayRecurrence}
                    onChange={(e) => {
                      setHolidayRecurrence(e.target.value as 'ONCE' | 'ANNUAL');
                      clearFieldError('date');
                    }}
                    disabled={busy}
                  >
                    <option value="ONCE">Một lần</option>
                    <option value="ANNUAL">Hằng năm</option>
                  </Select>
                </label>
              </div>

              {/* Solar Date for ONCE */}
              {holidayCalendar === 'SOLAR' && holidayRecurrence === 'ONCE' && (
                <div className="lifecycle-calendar-field">
                  <label className="lifecycle-label" htmlFor={dateId}>
                    Ngày áp dụng *
                  </label>
                  <div ref={calendarFieldRef} className="lifecycle-calendar-input">
                    <Input
                      ref={dateInputRef}
                      id={dateId}
                      type="text"
                      inputMode="numeric"
                      placeholder="dd/mm/yyyy"
                      value={holidaySolarDateText}
                      disabled={busy}
                      className={fieldErrors.date ? 'border-rose-400' : ''}
                      aria-invalid={Boolean(fieldErrors.date)}
                      onChange={(e) => {
                        setHolidaySolarDateText(e.target.value);
                        clearFieldError('date');
                      }}
                      onBlur={() => {
                        if (holidaySolarDateText.trim()) {
                          const parsed = parseDateText(holidaySolarDateText);
                          if (!parsed) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              date: 'Vui lòng nhập ngày theo định dạng dd/mm/yyyy.',
                            }));
                          } else if (parsed.iso <= vietnamDate()) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              date: 'Ngày áp dụng phải sau ngày hôm nay.',
                            }));
                          } else if (isSchoolOneOffHoliday) {
                            if (parsed.iso < validMinIso || (validMaxIso && parsed.iso > validMaxIso)) {
                              setFieldErrors((prev) => ({
                                ...prev,
                                date: 'Ngày nghỉ một lần của trường phải nằm trong thời hạn hợp đồng.',
                              }));
                            }
                          }
                        }
                      }}
                    />
                    <Button
                      ref={calendarTriggerRef}
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Mở lịch chọn ngày áp dụng"
                      aria-expanded={isSolarCalendarOpen}
                      aria-haspopup="dialog"
                      disabled={busy}
                      onClick={() => {
                        setIsSolarCalendarOpen((open) => !open);
                        positionCalendar();
                      }}
                    >
                      <CalendarIcon className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>

                  {isSchoolOneOffHoliday && (
                    <p
                      className={`service-calendar-contract-range ${isRangeEmpty ? 'is-empty' : ''}`}
                      role={isRangeEmpty ? 'alert' : 'status'}
                    >
                      {isRangeEmpty
                        ? 'Hợp đồng không còn ngày hợp lệ để thêm ngày nghỉ một lần'
                        : `Chọn ngày từ ${displayDate(validMinIso)} đến ${displayDate(validMaxIso)}`}
                    </p>
                  )}

                  {isSolarCalendarOpen && (
                    <div
                      ref={calendarPopoverRef}
                      role="dialog"
                      aria-label="Chọn ngày áp dụng"
                      className="lifecycle-calendar-popover"
                      onKeyDownCapture={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsSolarCalendarOpen(false);
                          calendarTriggerRef.current?.focus({ preventScroll: true });
                        }
                      }}
                    >
                      <Calendar
                        mode="single"
                        autoFocus
                        defaultMonth={calendarDefaultMonth}
                        selected={selectedCalendarDate}
                        onSelect={(date) => {
                          if (!date) return;
                          setHolidaySolarDateText(
                            formatDateToText(date.getFullYear(), date.getMonth() + 1, date.getDate())
                          );
                          clearFieldError('date');
                          setIsSolarCalendarOpen(false);
                          calendarTriggerRef.current?.focus({ preventScroll: true });
                        }}
                        disabled={isDateDisabled}
                      />
                    </div>
                  )}

                  {fieldErrors.date && (
                    <p className="service-calendar-field-error" role="alert">
                      {fieldErrors.date}
                    </p>
                  )}

                  {/* Informational Holiday Conflict Warning */}
                  {matchingHolidays.length > 0 && (
                    <div className="service-calendar-warning mt-2" role="note">
                      <span className="font-semibold">Lưu ý:</span> Ngày này đã có lịch nghỉ:{' '}
                      {matchingHolidays.map((h, i) => (
                        <span key={h.id || i}>
                          {i > 0 && ', '}
                          <strong>{h.title}</strong> ({h.schoolId ? 'Lịch trường' : 'Toàn bộ nhà xe'})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Other Calendar combinations */}
              {!(holidayCalendar === 'SOLAR' && holidayRecurrence === 'ONCE') && (
                <>
                  <div className="lifecycle-field-row">
                    <label>
                      {holidayCalendar === 'LUNAR' ? 'Ngày âm lịch *' : 'Ngày *'}
                      <Select
                        value={holidayDay}
                        onChange={(e) => {
                          setHolidayDay(e.target.value);
                          clearFieldError('date');
                        }}
                        disabled={busy}
                      >
                        <option value="">Chọn ngày</option>
                        {Array.from(
                          { length: holidayCalendar === 'LUNAR' ? 30 : holidayMonth ? new Date(Date.UTC(2028, Number(holidayMonth), 0)).getUTCDate() : 31 },
                          (_, index) => (
                            <option key={index + 1} value={index + 1}>
                              {index + 1}
                            </option>
                          )
                        )}
                      </Select>
                    </label>

                    <label>
                      {holidayCalendar === 'LUNAR' ? 'Tháng âm lịch *' : 'Tháng *'}
                      <Select
                        value={holidayMonth}
                        onChange={(e) => {
                          const next = e.target.value;
                          setHolidayMonth(next);
                          if (holidayCalendar === 'SOLAR' && next && Number(holidayDay) > new Date(Date.UTC(2028, Number(next), 0)).getUTCDate()) {
                            setHolidayDay('');
                          }
                          clearFieldError('date');
                        }}
                        disabled={busy}
                      >
                        <option value="">Chọn tháng</option>
                        {Array.from({ length: 12 }, (_, index) => (
                          <option key={index + 1} value={index + 1}>
                            Tháng {index + 1}
                          </option>
                        ))}
                      </Select>
                    </label>
                  </div>

                  {holidayRecurrence === 'ONCE' && holidayCalendar === 'LUNAR' && (
                    <label>
                      Năm âm lịch *
                      <Input
                        type="number"
                        min={1900}
                        max={2199}
                        value={holidayYear}
                        onChange={(e) => {
                          setHolidayYear(e.target.value);
                          clearFieldError('date');
                        }}
                        disabled={busy}
                      />
                    </label>
                  )}

                  {holidayCalendar === 'LUNAR' && (
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={holidayLeapMonth}
                        onChange={(e) => {
                          setHolidayLeapMonth(e.target.checked);
                          clearFieldError('date');
                        }}
                        disabled={busy}
                      />
                      <span>Tháng nhuận</span>
                    </label>
                  )}

                  {holidayCalendar === 'LUNAR' && holidayDay && holidayMonth && holidayPreviewYear >= 1900 && holidayPreviewYear <= 2199 && (
                    <p className="lifecycle-notice" role="status" aria-live="polite">
                      {holidayLunarOccurrence
                        ? `Dương lịch tương ứng${holidayRecurrence === 'ANNUAL' ? ` trong năm ${holidayPreviewYear}` : ''}: ${displayDate(holidayLunarOccurrence)}`
                        : `Không có ngày âm lịch này trong năm ${holidayPreviewYear}.`}
                    </p>
                  )}

                  {holidayCalendar === 'LUNAR' && isSchoolOneOffHoliday && (
                    <p
                      className={`service-calendar-contract-range ${isRangeEmpty ? 'is-empty' : ''}`}
                      role={isRangeEmpty ? 'alert' : 'status'}
                    >
                      {isRangeEmpty
                        ? 'Hợp đồng không còn ngày hợp lệ để thêm ngày nghỉ một lần'
                        : `Chọn ngày từ ${displayDate(validMinIso)} đến ${displayDate(validMaxIso)}`}
                    </p>
                  )}

                  {holidayCalendar === 'SOLAR' && holidayRecurrence === 'ANNUAL' && holidayDay === '29' && holidayMonth === '2' && (
                    <p className="lifecycle-notice" role="status">
                      Lịch lặp ngày 29/02 sẽ chỉ áp dụng vào các năm nhuận; các năm thường sẽ tự động bỏ qua.
                    </p>
                  )}

                  {fieldErrors.date && (
                    <p className="service-calendar-field-error" role="alert">
                      {fieldErrors.date}
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {/* ==================== MAKEUP MODE ==================== */}
          {mode === 'MAKEUP' && (
            <>
              <div className="service-calendar-info-box" role="note">
                Đề nghị học bù chỉ áp dụng một lần và cần nhà xe phê duyệt trước khi có hiệu lực vận hành.
              </div>

              <label>
                Tên buổi học bù *
                <Input
                  ref={titleInputRef}
                  value={makeupTitle}
                  onChange={(e) => {
                    setMakeupTitle(e.target.value);
                    clearFieldError('title');
                  }}
                  maxLength={200}
                  placeholder="Ví dụ: Học bù thứ Bảy ngày 21/11"
                  required
                  disabled={busy}
                  className={fieldErrors.title ? 'border-rose-400' : ''}
                  aria-invalid={Boolean(fieldErrors.title)}
                />
                {fieldErrors.title && (
                  <p className="service-calendar-field-error" role="alert">
                    {fieldErrors.title}
                  </p>
                )}
              </label>

              <label>
                Hệ lịch
                <Select
                  value={makeupCalendar}
                  onChange={(e) => {
                    const next = e.target.value as 'SOLAR' | 'LUNAR';
                    setMakeupCalendar(next);
                    setMakeupSolarDateText('');
                    setMakeupDay('');
                    setMakeupMonth('');
                    setMakeupLeapMonth(false);
                    clearFieldError('date');
                  }}
                  disabled={busy}
                >
                  <option value="SOLAR">Dương lịch</option>
                  <option value="LUNAR">Âm lịch Việt Nam</option>
                </Select>
              </label>

              {/* Solar Date for Makeup */}
              {makeupCalendar === 'SOLAR' ? (
                <div className="lifecycle-calendar-field">
                  <label className="lifecycle-label" htmlFor={dateId}>
                    Ngày học bù *
                  </label>
                  <div ref={calendarFieldRef} className="lifecycle-calendar-input">
                    <Input
                      ref={dateInputRef}
                      id={dateId}
                      type="text"
                      inputMode="numeric"
                      placeholder="dd/mm/yyyy"
                      value={makeupSolarDateText}
                      disabled={busy}
                      className={fieldErrors.date ? 'border-rose-400' : ''}
                      aria-invalid={Boolean(fieldErrors.date)}
                      onChange={(e) => {
                        setMakeupSolarDateText(e.target.value);
                        clearFieldError('date');
                      }}
                      onBlur={() => {
                        if (makeupSolarDateText.trim()) {
                          const parsed = parseDateText(makeupSolarDateText);
                          if (!parsed) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              date: 'Vui lòng nhập ngày theo định dạng dd/mm/yyyy.',
                            }));
                          } else if (parsed.iso <= vietnamDate()) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              date: 'Ngày học bù phải sau ngày hôm nay.',
                            }));
                          }
                        }
                      }}
                    />
                    <Button
                      ref={calendarTriggerRef}
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Mở lịch chọn ngày học bù"
                      aria-expanded={isSolarCalendarOpen}
                      aria-haspopup="dialog"
                      disabled={busy}
                      onClick={() => {
                        setIsSolarCalendarOpen((open) => !open);
                        positionCalendar();
                      }}
                    >
                      <CalendarIcon className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>

                  {isSolarCalendarOpen && (
                    <div
                      ref={calendarPopoverRef}
                      role="dialog"
                      aria-label="Chọn ngày học bù"
                      className="lifecycle-calendar-popover"
                      onKeyDownCapture={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsSolarCalendarOpen(false);
                          calendarTriggerRef.current?.focus({ preventScroll: true });
                        }
                      }}
                    >
                      <Calendar
                        mode="single"
                        autoFocus
                        defaultMonth={selectedCalendarDate || minCalendarDate}
                        selected={selectedCalendarDate}
                        onSelect={(date) => {
                          if (!date) return;
                          setMakeupSolarDateText(
                            formatDateToText(date.getFullYear(), date.getMonth() + 1, date.getDate())
                          );
                          clearFieldError('date');
                          setIsSolarCalendarOpen(false);
                          calendarTriggerRef.current?.focus({ preventScroll: true });
                        }}
                        disabled={[
                          { before: minCalendarDate },
                          { after: new Date('2199-12-31T00:00:00Z') },
                          ...(contractStartDate ? [{ before: new Date(`${contractStartDate.slice(0, 10)}T00:00:00Z`) }] : []),
                          ...(contractEndDate ? [{ after: new Date(`${contractEndDate.slice(0, 10)}T00:00:00Z`) }] : []),
                        ]}
                      />
                    </div>
                  )}

                  {fieldErrors.date && (
                    <p className="service-calendar-field-error" role="alert">
                      {fieldErrors.date}
                    </p>
                  )}

                  {schoolHoliday && !operatorHoliday && (
                    <p className="lifecycle-notice mt-2" role="note">
                      Ngày này là ngày nghỉ của trường ({schoolHoliday.title}). Bạn vẫn có thể đề nghị học bù vào ngày này nếu đáp ứng các điều kiện khác.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="lifecycle-field-row">
                    <label>
                      Ngày âm lịch *
                      <Select
                        value={makeupDay}
                        onChange={(e) => {
                          setMakeupDay(e.target.value);
                          clearFieldError('date');
                        }}
                        disabled={busy}
                      >
                        <option value="">Chọn ngày</option>
                        {Array.from({ length: 30 }, (_, index) => (
                          <option key={index + 1} value={index + 1}>
                            {index + 1}
                          </option>
                        ))}
                      </Select>
                    </label>

                    <label>
                      Tháng âm lịch *
                      <Select
                        value={makeupMonth}
                        onChange={(e) => {
                          setMakeupMonth(e.target.value);
                          clearFieldError('date');
                        }}
                        disabled={busy}
                      >
                        <option value="">Chọn tháng</option>
                        {Array.from({ length: 12 }, (_, index) => (
                          <option key={index + 1} value={index + 1}>
                            Tháng {index + 1}
                          </option>
                        ))}
                      </Select>
                    </label>
                  </div>

                  <div className="lifecycle-field-row">
                    <label>
                      Năm âm lịch *
                      <Input
                        type="number"
                        min={1900}
                        max={2199}
                        value={makeupYear}
                        onChange={(e) => {
                          setMakeupYear(e.target.value);
                          clearFieldError('date');
                        }}
                        disabled={busy}
                      />
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer mt-6">
                      <input
                        type="checkbox"
                        checked={makeupLeapMonth}
                        onChange={(e) => {
                          setMakeupLeapMonth(e.target.checked);
                          clearFieldError('date');
                        }}
                        disabled={busy}
                      />
                      <span>Tháng nhuận</span>
                    </label>
                  </div>

                  {makeupDay && makeupMonth && makeupPreviewYear >= 1900 && makeupPreviewYear <= 2199 && (
                    <p className="lifecycle-notice" role="status" aria-live="polite">
                      {makeupLunarOccurrence
                        ? `Dương lịch tương ứng: ${displayDate(makeupLunarOccurrence)}`
                        : `Không có ngày âm lịch này trong năm ${makeupPreviewYear}.`}
                    </p>
                  )}

                  {fieldErrors.date && (
                    <p className="service-calendar-field-error" role="alert">
                      {fieldErrors.date}
                    </p>
                  )}
                </>
              )}

              {/* Time Fields for Makeup */}
              <div className="lifecycle-field-row">
                <label>
                  Giờ bắt đầu *
                  <Input
                    ref={startTimeInputRef}
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      clearFieldError('time');
                    }}
                    required
                    disabled={busy}
                    className={fieldErrors.time ? 'border-rose-400' : ''}
                  />
                </label>
                <label>
                  Giờ kết thúc *
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      clearFieldError('time');
                    }}
                    required
                    disabled={busy}
                    className={fieldErrors.time ? 'border-rose-400' : ''}
                  />
                </label>
              </div>

              {fieldErrors.time && (
                <p className="service-calendar-field-error" role="alert">
                  {fieldErrors.time}
                </p>
              )}
            </>
          )}

          {/* General API error */}
          {fieldErrors.general && (
            <p className="lifecycle-error" role="alert">
              {fieldErrors.general}
            </p>
          )}
        </form>
      </LifecycleDialog>

      {/* Discard Draft Confirmation Dialog */}
      {showDiscardConfirm && (
        <LifecycleDialog
          open
          title="Bỏ thay đổi?"
          onClose={() => setShowDiscardConfirm(false)}
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDiscardConfirm(false)}
              >
                Tiếp tục chỉnh sửa
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  handleCloseModal();
                }}
              >
                Bỏ thay đổi
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Bạn có các thông tin chưa lưu trong biểu mẫu. Bạn có chắc chắn muốn thoát và bỏ các thay đổi này?
          </p>
        </LifecycleDialog>
      )}
    </>
  );
}
