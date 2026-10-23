'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminSchoolsGuard } from '@/components/admin/schools/admin-schools-guard';
import { apiClient } from '@/lib/api-client';
import type { DriverItem } from '@/lib/types';
import {
  ArrowLeftIcon,
  DriverIcon,
  PhoneIcon,
  SpinnerIcon,
  AlertIcon,
} from '@/components/icons';

function DriverDetailPageContent() {
  const params = useParams();
  const driverId = params?.id as string;

  const [driver, setDriver] = useState<DriverItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDriver = useCallback(async () => {
    if (!driverId) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await apiClient.getDriver(driverId);
      setDriver(data);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Không thể tải thông tin chi tiết tài xế.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchDriver();
  }, [fetchDriver]);

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-500">
        <SpinnerIcon className="w-6 h-6 animate-spin text-amber-500 mb-2" />
        <span className="text-sm">Đang tải thông tin chi tiết tài xế...</span>
      </div>
    );
  }

  if (errorMessage || !driver) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <Link
          href="/admin/drivers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Quay lại danh sách tài xế</span>
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800 text-center">
          <AlertIcon className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <h2 className="text-base font-bold">Không thể tải thông tin tài xế</h2>
          <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
        </div>
      </div>
    );
  }

  const isActive = driver.isActive;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/admin/drivers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Quay lại danh sách tài xế</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 font-bold text-xl flex items-center justify-center border-2 border-amber-300">
            {driver.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{driver.fullName}</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Tài xế
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Đội xe hệ thống RoadToSchool
            </p>
          </div>
        </div>

        <div>
          {isActive ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Đang hoạt động
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
              Ngừng hoạt động
            </span>
          )}
        </div>
      </div>

      {/* Information Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <DriverIcon className="w-4 h-4 text-amber-500" />
          Thông tin chi tiết tài xế
        </h2>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <dt className="text-slate-400 font-medium">Họ và tên</dt>
            <dd className="text-slate-800 font-semibold mt-0.5">{driver.fullName}</dd>
          </div>

          <div>
            <dt className="text-slate-400 font-medium">Vai trò hiển thị</dt>
            <dd className="text-amber-800 font-semibold mt-0.5">Tài xế</dd>
          </div>

          <div>
            <dt className="text-slate-400 font-medium">Địa chỉ Email</dt>
            <dd className="text-slate-800 font-semibold mt-0.5">
              {driver.email || '—'}
            </dd>
          </div>

          <div>
            <dt className="text-slate-400 font-medium">Số điện thoại liên hệ</dt>
            <dd className="text-slate-800 font-semibold mt-0.5 flex items-center gap-1.5">
              {driver.phone ? (
                <>
                  <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{driver.phone}</span>
                </>
              ) : (
                '—'
              )}
            </dd>
          </div>

          <div>
            <dt className="text-slate-400 font-medium">Đơn vị quản lý</dt>
            <dd className="text-slate-800 font-semibold mt-0.5">
              Hệ thống Nhà xe tập trung (System-wide)
            </dd>
          </div>

          <div>
            <dt className="text-slate-400 font-medium">Trạng thái tài khoản</dt>
            <dd className="mt-1">
              {isActive ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                  Đang hoạt động
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                  Ngừng hoạt động
                </span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function AdminDriverDetailPage() {
  return (
    <AdminSchoolsGuard>
      <DriverDetailPageContent />
    </AdminSchoolsGuard>
  );
}
