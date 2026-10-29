'use client';

import React, { type ReactNode } from 'react';
import { SearchIcon } from '@/components/icons';
import { StudentStatus } from '@/lib/types';
import { FilterToolbar, FilterField } from '@/components/ui/filter-toolbar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';


interface StudentFiltersProps {
  children?: ReactNode;
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
  children,
}: StudentFiltersProps) {
  return (
    <FilterToolbar onReset={onReset} hasActiveFilters={hasActiveFilters}>
        <FilterField label="Tìm kiếm" grow icon={<SearchIcon />}>
          <Input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm theo họ tên hoặc mã học sinh (STU)..."
            className="w-full"
          />
        </FilterField>

        <FilterField label="Trạng thái">
          <Select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as StudentStatus | '')}
            className="w-full"
            aria-label="Lọc theo trạng thái học sinh"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="AVAILABLE">Khả dụng</option>
            <option value="DISABLED">Đã vô hiệu hóa</option>
          </Select>
        </FilterField>

        <FilterField label="Địa chỉ">
          <Select
            value={hasAddress}
            onChange={(e) =>
              onHasAddressChange(e.target.value as 'true' | 'false' | '')
            }
            className="w-full"
            aria-label="Lọc theo tình trạng địa chỉ"
          >
            <option value="">Tất cả địa chỉ</option>
            <option value="true">Đã có địa chỉ</option>
            <option value="false">Chưa có địa chỉ</option>
          </Select>
        </FilterField>
        {children}
      </FilterToolbar>
  );
}
