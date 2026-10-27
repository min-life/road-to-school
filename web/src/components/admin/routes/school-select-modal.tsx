'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { SchoolListItem } from '@/lib/types';
import { CloseIcon, SearchIcon, SchoolIcon, SpinnerIcon } from '@/components/icons';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SchoolSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PAGE_LIMIT = 20;

export function SchoolSelectModal({ isOpen, onClose }: SchoolSelectModalProps) {
  const router = useRouter();
  const [schools, setSchools] = useState<SchoolListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  const searchRequestIdRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fetch page function
  const fetchSchools = useCallback(
    async (targetPage: number, keyword: string, isAppend: boolean) => {
      const currentRequestId = ++searchRequestIdRef.current;
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const res = await apiClient.getSchools({
          page: targetPage,
          limit: PAGE_LIMIT,
          search: keyword.trim() || undefined,
          status: 'ACTIVE',
        });

        // Ignore stale responses
        if (currentRequestId !== searchRequestIdRef.current) return;

        const activeSchools = res.items.filter((s: SchoolListItem) => s.isActive !== false);

        if (isAppend) {
          setSchools((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const newItems = activeSchools.filter((s) => !existingIds.has(s.id));
            return [...prev, ...newItems];
          });
        } else {
          setSchools(activeSchools);
        }

        setPage(targetPage);
        const totalPages = res.meta?.totalPages || 1;
        setHasMore(targetPage < totalPages && activeSchools.length > 0);
      } catch (err: any) {
        if (currentRequestId === searchRequestIdRef.current) {
          setError(err?.message || 'Không thể tải danh sách trường học. Vui lòng thử lại.');
        }
      } finally {
        if (currentRequestId === searchRequestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  // Initial load when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setSelectedSchoolId(null);
    setPage(1);
    setHasMore(true);
    fetchSchools(1, '', false);
  }, [isOpen, fetchSchools]);

  // Handle search with 350ms debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setPage(1);
      fetchSchools(1, val, false);
    }, 350);
  };

  // Lazy pagination on scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 60 && !loading && !loadingMore && hasMore) {
      fetchSchools(page + 1, search, true);
    }
  };

  if (!isOpen) return null;

  const handleStartPlanning = () => {
    if (!selectedSchoolId) return;
    onClose();
    router.push(`/admin/routes/create?schoolId=${selectedSchoolId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <FilterToolbar className="ui-dialog-panel ui-dialog-panel-body bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Chọn trường học</h3>
            <p className="text-xs text-slate-500 mt-0.5">Mỗi lần tối ưu tuyến áp dụng cho một trường học đối tác</p>
          </div>
          <Button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Tìm kiếm trường học theo tên, địa chỉ..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-slate-50/50"
            />
          </div>
        </div>

        {/* School List */}
        <div
          onScroll={handleScroll}
          className="ui-dialog-body flex-1 overflow-y-auto p-4 space-y-2 min-h-[240px] max-h-[420px]"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <SpinnerIcon className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-xs">Đang tải danh sách trường đối tác...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 px-4">
              <p className="text-sm text-rose-600 font-medium mb-3">{error}</p>
              <Button
                onClick={() => fetchSchools(1, search, false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Thử lại
              </Button>
            </div>
          ) : schools.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <SchoolIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">Không tìm thấy trường học phù hợp</p>
              {search && <p className="text-xs text-slate-400 mt-1">Thử tìm kiếm với từ khóa khác</p>}
            </div>
          ) : (
            <>
              {schools.map((school) => {
                const isSelected = selectedSchoolId === school.id;
                return (
                  <div
                    key={school.id}
                    onClick={() => setSelectedSchoolId(school.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-primary bg-background shadow-xs ring-1 ring-primary'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/60'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-primary text-foreground' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <SchoolIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{school.name}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{school.addressText}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Đang hoạt động
                        </span>
                        <span className="text-[10px] text-slate-400">
                          HĐ: {new Date(school.contractStartDate).toLocaleDateString('vi-VN')} -{' '}
                          {new Date(school.contractEndDate).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {loadingMore && (
                <div className="flex items-center justify-center py-3 text-slate-400 gap-2">
                  <SpinnerIcon className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs">Đang tải thêm...</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          <Button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Hủy
          </Button>
          <Button variant="primary" size="default"
            disabled={!selectedSchoolId}
            onClick={handleStartPlanning}
            className="px-5 py-2 text-sm font-bold text-foreground bg-primary hover:bg-[#e6b74d] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs"
          >
            Bắt đầu lập tuyến
          </Button>
        </div>
      </FilterToolbar>
    </div>
  );
}
