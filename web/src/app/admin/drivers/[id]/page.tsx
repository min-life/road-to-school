'use client';
import { BackLink } from '@/components/admin/common/context-navigation';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AdminSchoolsGuard } from '@/components/admin/schools/admin-schools-guard';
import { apiClient } from '@/lib/api-client';
import type { DriverItem } from '@/lib/types';
import {
  DriverIcon,
  MailIcon,
  PhoneIcon,
  SpinnerIcon,
  AlertIcon,
} from '@/components/icons';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import '@/components/admin/drivers/driver-detail.css';

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
        <BackLink fallback="/admin/drivers" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors" />
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
    <div className="driver-detail">
      <PageHeader className="driver-detail-heading">
        <BackLink fallback="/admin/drivers" className="driver-detail-back" />
        <h1>Chi tiết tài xế</h1>
      </PageHeader>

      <Card className="driver-detail-profile">
        <div className="driver-detail-identity">
          <div className="driver-detail-avatar" aria-hidden="true">
            {driver.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="driver-detail-name">
            <p>Tài xế</p>
            <h2>{driver.fullName}</h2>
          </div>
        </div>
        {isActive ? (
          <Badge className="driver-detail-status bg-emerald-50 text-emerald-700 border-emerald-200">Đang hoạt động</Badge>
        ) : (
          <Badge className="driver-detail-status bg-slate-100 text-slate-600 border-slate-300">Ngừng hoạt động</Badge>
        )}
      </Card>

      <div className="driver-detail-grid">
        <Card className="driver-detail-section">
          <h2><MailIcon aria-hidden="true" />Thông tin liên hệ</h2>
          <dl>
            <div>
              <dt>Email</dt>
              <dd className={!driver.email ? 'driver-detail-empty' : undefined}>{driver.email || 'Chưa cập nhật'}</dd>
            </div>
            <div>
              <dt>Số điện thoại</dt>
              <dd className={driver.phone ? 'driver-detail-phone' : 'driver-detail-empty'}>
                {driver.phone ? <><PhoneIcon className="w-4 h-4" aria-hidden="true" /><span>{driver.phone}</span></> : 'Chưa cập nhật'}
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="driver-detail-section">
          <h2><DriverIcon aria-hidden="true" />Thông tin tài khoản</h2>
          <dl>
            <div><dt>Vai trò</dt><dd>Tài xế</dd></div>
            <div><dt>Đơn vị quản lý</dt><dd>Nhà xe tập trung</dd></div>
          </dl>
        </Card>
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
