'use client';

import React from 'react';
import type { DaySchedule, WeeklySchedule } from '@/lib/types';
import { ClockIcon } from '@/components/icons';
import {
  DAYS_OF_WEEK,
  validateWeeklySchedule,
  type DayConfig,
} from './weekly-schedule.helper';

export { DAYS_OF_WEEK, validateWeeklySchedule, type DayConfig };

export interface WeeklyScheduleBuilderProps {
  value: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
  disabled?: boolean;
}

export function WeeklyScheduleBuilder({
  value,
  onChange,
  disabled = false,
}: WeeklyScheduleBuilderProps) {
  const handleToggleDay = (dayKey: string, checked: boolean) => {
    const next = { ...value };
    if (checked) {
      next[dayKey] = {
        start: '07:00',
        end: '17:00',
      };
    } else {
      delete next[dayKey];
    }
    onChange(next);
  };

  const handleTimeChange = (
    dayKey: string,
    field: 'start' | 'end',
    val: string,
  ) => {
    const current = value[dayKey];
    if (!current) return;
    onChange({
      ...value,
      [dayKey]: {
        ...current,
        [field]: val,
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-800">
          Lịch học theo tuần <span className="text-red-500">*</span>
        </label>
        <span className="text-xs text-slate-500">
          Chọn ít nhất 1 ngày học trong tuần
        </span>
      </div>

      <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
        {DAYS_OF_WEEK.map((day) => {
          const isEnabled = Boolean(value[day.key]);
          const dayData = value[day.key];

          return (
            <div
              key={day.key}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border transition-colors ${
                isEnabled
                  ? 'bg-white border-amber-200 shadow-2xs'
                  : 'bg-transparent border-transparent opacity-75'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-[120px]">
                <input
                  type="checkbox"
                  id={`day-${day.key}`}
                  checked={isEnabled}
                  disabled={disabled}
                  onChange={(e) => handleToggleDay(day.key, e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 cursor-pointer"
                />
                <label
                  htmlFor={`day-${day.key}`}
                  className="text-sm font-medium text-slate-800 cursor-pointer select-none"
                >
                  {day.label}
                </label>
              </div>

              {isEnabled ? (
                <div className="flex items-center gap-3 pl-6 sm:pl-0">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor={`${day.key}-start`}
                      className="text-xs text-slate-600 whitespace-nowrap"
                    >
                      Giờ bắt đầu học:
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        id={`${day.key}-start`}
                        value={dayData?.start || '07:00'}
                        disabled={disabled}
                        onChange={(e) =>
                          handleTimeChange(day.key, 'start', e.target.value)
                        }
                        className="px-2 py-1 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  <span className="text-slate-400 text-xs">—</span>

                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor={`${day.key}-end`}
                      className="text-xs text-slate-600 whitespace-nowrap"
                    >
                      Giờ kết thúc học:
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        id={`${day.key}-end`}
                        value={dayData?.end || '17:00'}
                        disabled={disabled}
                        onChange={(e) =>
                          handleTimeChange(day.key, 'end', e.target.value)
                        }
                        className="px-2 py-1 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic pl-6 sm:pl-0">
                  Nghỉ
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
