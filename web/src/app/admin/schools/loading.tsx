import React from 'react';
import { SpinnerIcon } from '@/components/icons';

export default function AdminSchoolsLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="py-16 flex flex-col items-center justify-center text-slate-500"
    >
      <div className="flex items-center gap-2 text-sm">
        <SpinnerIcon className="w-5 h-5 text-amber-500 animate-spin" />
        <span>Đang tải thông tin trường học...</span>
      </div>
    </div>
  );
}
