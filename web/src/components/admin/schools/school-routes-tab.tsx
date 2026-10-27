'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { RoutePlanItem } from '@/lib/types';
import { RouteIcon, SpinnerIcon, PlusIcon } from '@/components/icons';
import { PaginationControl } from '@/components/admin/common/pagination-control';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';

interface SchoolRoutesTabProps {
  schoolId: string;
  schoolName: string;
  isSchoolActive: boolean;
}

export function SchoolRoutesTab({
  schoolId,
  schoolName,
  isSchoolActive,
}: SchoolRoutesTabProps) {
  const [plans, setPlans] = useState<RoutePlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRoutePlans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.listRoutePlans({
        schoolId,
        page,
        limit,
      });
      setPlans(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Lỗi tải phương án tuyến của trường:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, limit]);

  useEffect(() => {
    fetchRoutePlans();
  }, [fetchRoutePlans]);

  const formatDateTime = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Phương án tuyến của trường</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách các phương án đưa đón học sinh đã thiết lập cho {schoolName}
          </p>
        </div>

        {isSchoolActive && (
          <Link data-variant="primary" data-size="sm"
            href={`/admin/routes/create?schoolId=${schoolId}`}
            className="ui-button flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-[#e6b74d] text-foreground font-bold text-xs shadow-xs transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Lập phương án tuyến mới</span>
          </Link>
        )}
      </div>

      <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Tên phương án</th>
                <th className="py-3 px-4 text-center">Tuyến đi</th>
                <th className="py-3 px-4 text-center">Tuyến về</th>
                <th className="py-3 px-4 text-center">Học sinh</th>
                <th className="py-3 px-4">Ngày tạo</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <SpinnerIcon className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <span>Đang tải phương án tuyến...</span>
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <RouteIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">Trường chưa có phương án tuyến nào</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Bấm &ldquo;Lập phương án tuyến mới&rdquo; để chạy tối ưu hóa VietMap VRP
                    </p>
                  </td>
                </tr>
              ) : (
                plans.map((plan) => {
                  const isDraft = plan.status === 'DRAFT';

                  return (
                    <tr key={plan.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <Link
                          href={`/admin/routes/plans/${plan.id}`}
                          className="hover:text-blue-600 hover:underline flex items-center gap-2"
                        >
                          <RouteIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{plan.name}</span>
                        </Link>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {plan.totalOutboundRoutes} tuyến
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
                          {plan.totalReturnRoutes} tuyến
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        <span className="text-xs text-slate-900">{plan.totalStudents}</span>
                        <span className="block text-[10px] font-normal text-slate-400">
                          {isDraft ? 'HS dự kiến' : 'Học sinh'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {formatDateTime(plan.createdAt)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            plan.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isDraft
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {plan.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link  data-size="default"
                          href={`/admin/routes/plans/${plan.id}`}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-primary hover:text-slate-900 rounded-lg transition-colors inline-block"
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>

        {/* Phân trang */}
        <PaginationControl
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          loading={loading}
          onPageChange={(newPage) => setPage(newPage)}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      </Card>
    </div>
  );
}
