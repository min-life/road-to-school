'use client';

import React, { useState } from 'react';
import { TripsTable } from '@/components/admin/trips/trips-table';
import { ManualGenerateTripsModal } from '@/components/admin/trips/manual-generate-trips-modal';
import { useAuth } from '@/components/auth/auth-provider';
import { BusIcon } from '@/components/icons';
import { PageHeader } from '@/components/ui/page-header';

export default function AdminTripsPage() {
  const { user } = useAuth();
  const currentUserRole = user?.role || null;
  const currentUserSchoolId = user?.role === 'SCHOOL_ADMIN' ? user.schoolId || undefined : undefined;
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BusIcon className="w-6 h-6 text-slate-700" />
            <span>Quản lý chuyến xe</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Lịch trình điều phối xe đưa đón theo ngày, bao gồm các chuyến đã lập lịch và lịch trình dự kiến
          </p>
        </div>
      </PageHeader>

      {/* Trips Table */}
      <TripsTable
        refreshKey={refreshKey}
        fixedSchoolId={currentUserSchoolId}
        currentUserRole={currentUserRole}
        onOpenManualGenerate={() => setIsManualModalOpen(true)}
      />

      {/* Manual Generation Modal (System Admin only) */}
      <ManualGenerateTripsModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={() => {
          setRefreshKey((k) => k + 1);
        }}
        initialSchoolId={currentUserSchoolId}
      />
    </div>
  );
}
