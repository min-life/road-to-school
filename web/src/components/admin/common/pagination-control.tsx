'use client';

import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';

interface PaginationControlProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  loading?: boolean;
  limitOptions?: number[];
}

export function PaginationControl({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  loading = false,
  limitOptions = [10, 20, 50, 100],
}: PaginationControlProps) {
  if (total === 0) {
    return null;
  }

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);
  const effectiveTotalPages = Math.max(1, totalPages);

  return (
    <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white">
      {/* Record info & Limit selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Hiển thị <strong className="text-slate-800 font-semibold">{startRecord}</strong> -{' '}
          <strong className="text-slate-800 font-semibold">{endRecord}</strong> trên{' '}
          <strong className="text-slate-800 font-semibold">{total}</strong> bản ghi
        </span>

        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
          <label htmlFor="limit-select" className="text-slate-500">
            Số dòng:
          </label>
          <select
            id="limit-select"
            value={limit}
            onChange={(e) => {
              const newLimit = parseInt(e.target.value, 10);
              onLimitChange(newLimit);
            }}
            disabled={loading}
            className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-700 font-medium focus:outline-none focus:border-[#FFCB56] cursor-pointer"
          >
            {limitOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Trang trước"
          aria-label="Trang trước"
        >
          <ChevronLeftIcon className="w-4 h-4 text-slate-600" />
        </button>

        <span className="px-2 py-1 rounded-lg bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-100">
          {page} / {effectiveTotalPages}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= effectiveTotalPages || loading}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Trang sau"
          aria-label="Trang sau"
        >
          <ChevronRightIcon className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
}
