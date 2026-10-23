'use client';

import React, { useEffect, useState } from 'react';
import { Role } from '@/lib/types';
import { ShieldIcon, SchoolIcon } from '../icons';

interface RoleSplashProps {
  role: Role;
  onFinish: () => void;
  durationMs?: number;
}

export function RoleSplash({
  role,
  onFinish,
  durationMs = 1200,
}: RoleSplashProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    const frame = () => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);

      if (elapsed < durationMs) {
        requestAnimationFrame(frame);
      } else {
        onFinish();
      }
    };

    const animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [durationMs, onFinish]);

  const isSystemAdmin = role === 'SYSTEM_ADMIN';
  const roleTitle = isSystemAdmin ? 'Quản trị Hệ thống' : 'Quản trị Trường học';

  return (
    <div
      role="status"
      aria-label={`Đang chuyển hướng vào không gian ${roleTitle}`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FFFDF6] transition-opacity duration-300"
    >
      <div className="flex flex-col items-center text-center px-6 py-8 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-6 p-4 rounded-full bg-[#FFCB56]/20 border border-[#FFCB56]/40 shadow-sm">
          {isSystemAdmin ? (
            <ShieldIcon className="w-16 h-16 text-[#1E293B]" />
          ) : (
            <SchoolIcon className="w-16 h-16 text-[#1E293B]" />
          )}
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] mb-2">
          {roleTitle}
        </h1>
        <p className="text-sm text-slate-600 mb-8">
          Đang khởi tạo không gian làm việc...
        </p>

        {/* Progress Loader Bar */}
        <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FFCB56] transition-all ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
