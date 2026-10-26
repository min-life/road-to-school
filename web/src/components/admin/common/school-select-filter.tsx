'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { SchoolListItem } from '@/lib/types';
import { SpinnerIcon, ChevronLeftIcon } from '@/components/icons';

interface SchoolSelectFilterProps {
  value: string;
  onChange: (schoolId: string, selectedSchool?: SchoolListItem) => void;
  allowAll?: boolean;
  allLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function SchoolSelectFilter({
  value,
  onChange,
  allowAll = true,
  allLabel = 'Tất cả trường học',
  disabled = false,
  placeholder = 'Chọn trường học...',
  className = '',
  required = false,
}: SchoolSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [schools, setSchools] = useState<SchoolListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolListItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load selected school info if not in memory
  useEffect(() => {
    if (!value) {
      setSelectedSchool(null);
      return;
    }

    const found = schools.find((s) => s.id === value);
    if (found) {
      setSelectedSchool(found);
    } else {
      // Fetch school detail for selected ID
      apiClient
        .getSchoolDetail(value)
        .then((s: any) => {
          if (s) {
            setSelectedSchool(s);
          }
        })
        .catch(() => {});
    }
  }, [value, schools]);

  // Fetch schools lazily on open or search change
  const fetchSchools = useCallback(async (keyword: string) => {
    try {
      setLoading(true);
      const res = await apiClient.getSchools({
        search: keyword.trim() || undefined,
        limit: 20,
        page: 1,
      });
      setSchools(res.items || []);
    } catch (err) {
      console.error('Failed to search schools', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSchools(debouncedSearch);
    }
  }, [isOpen, debouncedSearch, fetchSchools]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (schoolId: string, item?: SchoolListItem) => {
    onChange(schoolId, item);
    setSelectedSchool(item || null);
    setIsOpen(false);
    setSearch('');
  };

  const displayText = value
    ? selectedSchool?.name || 'Đang tải thông tin trường...'
    : allowAll
    ? allLabel
    : placeholder;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#FFCB56] text-slate-700 flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <span className="truncate font-medium">{displayText}</span>
        <span className="text-slate-400 text-[10px]">▼</span>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 max-w-[90vw] z-50 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden text-xs animate-in fade-in zoom-in-95">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên trường..."
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#FFCB56]"
            />
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
            {allowAll && (
              <button
                type="button"
                onClick={() => handleSelect('', undefined)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer ${
                  !value ? 'bg-amber-50/60 font-bold text-amber-900' : 'text-slate-700'
                }`}
              >
                <span>{allLabel}</span>
                {!value && <span className="text-amber-600">✓</span>}
              </button>
            )}

            {loading ? (
              <div className="p-4 text-center text-slate-400 flex items-center justify-center gap-2">
                <SpinnerIcon className="w-4 h-4 animate-spin text-[#FFCB56]" />
                <span>Đang tìm trường...</span>
              </div>
            ) : schools.length === 0 ? (
              <div className="p-4 text-center text-slate-400">Không tìm thấy trường nào</div>
            ) : (
              schools.map((item) => {
                const isSelected = item.id === value;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id, item)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected ? 'bg-amber-50/60 font-bold text-amber-900' : 'text-slate-700'
                    }`}
                  >
                    <div className="truncate">
                      <p className="truncate font-semibold">{item.name}</p>
                      {item.addressText && (
                        <p className="text-[10px] text-slate-400 truncate">{item.addressText}</p>
                      )}
                    </div>
                    {isSelected && <span className="text-amber-600 shrink-0">✓</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
