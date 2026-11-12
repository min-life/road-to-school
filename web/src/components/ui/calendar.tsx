'use client';

import { DayPicker, DayButton as DayPickerButton, type DayButtonProps } from 'react-day-picker';
import { vi } from 'react-day-picker/locale/vi';
import { computeDateToLunarDate } from 'amlich.js';
import type { ComponentProps } from 'react';
import 'react-day-picker/style.css';

function LunarDayButton({ day, modifiers, ...props }: DayButtonProps) {
  const lunar = computeDateToLunarDate(
    day.date.getDate(),
    day.date.getMonth() + 1,
    day.date.getFullYear(),
    7,
  );

  return (
    <DayPickerButton day={day} modifiers={modifiers} {...props}>
      <span>{day.date.getDate()}</span>
      <small>{lunar.lunarDay}/{lunar.lunarMonth}</small>
    </DayPickerButton>
  );
}

export function Calendar({
  className = '',
  ...props
}: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={vi}
      weekStartsOn={1}
      formatters={{
        formatCaption: date => `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
        formatWeekdayName: date => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()],
      }}
      {...props}
      showOutsideDays
      fixedWeeks
      className={`shadcn-calendar ${className}`}
      components={{ DayButton: LunarDayButton }}
    />
  );
}
