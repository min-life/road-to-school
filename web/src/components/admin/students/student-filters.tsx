'use client';

import React from 'react';
import { SearchIcon, CloseIcon } from '@/components/icons';
import { StudentStatus } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface StudentFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: StudentStatus | '';
  onStatusChange: (value: StudentStatus | '') => void;
  hasAddress: 'true' | 'false' | '';
  onHasAddressChange: (value: 'true' | 'false' | '') => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export function StudentFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  hasAddress,
  onHasAddressChange,
  onReset,
  hasActiveFilters,
}: StudentFiltersProps) {
  return (
    <Card className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
      <div className="ui-filter-fields">
        {/* Search Input */}
        <div className="ui-filter-search relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <SearchIcon className="w-4 h-4" />
          </div>
          <Input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm theo họ tên hoặc mã học sinh (STU)..."
            className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-slate-400"
          />
        </div>

        {/* Filter 1: Trạng thái học sinh (AVAILABLE / DISABLED) */}
        <div className="ui-filter-option">
          <Select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as StudentStatus | '')}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary text-foreground cursor-pointer"
            aria-label="Lọc theo trạng thái học sinh"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="AVAILABLE">Khả dụng</option>
            <option value="DISABLED">Đã vô hiệu hóa</option>
          </Select>
        </div>

        {/* Filter 2: Tình trạng địa chỉ (hasAddress: true / false) */}
        <div className="ui-filter-option">
          <Select
            value={hasAddress}
            onChange={(e) =>
              onHasAddressChange(e.target.value as 'true' | 'false' | '')
            }
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary text-foreground cursor-pointer"
            aria-label="Lọc theo tình trạng địa chỉ"
          >
            <option value="">Tất cả địa chỉ</option>
            <option value="true">Đã có địa chỉ</option>
            <option value="false">Chưa có địa chỉ</option>
          </Select>
        </div>

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <Button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Đặt lại bộ lọc"
          >
            <CloseIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Đặt lại</span>
          </Button>
        )}
      </div>
    </Card>
  );
}
